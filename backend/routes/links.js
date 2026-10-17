const express = require("express");
const { randomBytes, randomUUID } = require("crypto");
const pool = require("../db");

const router = express.Router();

const MAX_URL_LENGTH = 2048;
const BLOCKED_HOSTS = new Set(["malware.test", "phishing.test"]);
const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access your links.",
    });
  }
  next();
}

function validateDestinationUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, message: "Please provide a URL." };
  }

  let input = value.trim();
  if (input.length > MAX_URL_LENGTH) {
    return { valid: false, message: "URL must be 2048 characters or fewer." };
  }

  if (!/^https?:\/\//i.test(input)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
      return { valid: false, message: "Only HTTP and HTTPS URLs are allowed." };
    }
    input = `https://${input}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(input);
  } catch {
    return { valid: false, message: "Please provide a valid URL." };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { valid: false, message: "Only HTTP and HTTPS URLs are allowed." };
  }

  if (!parsedUrl.hostname || !parsedUrl.hostname.includes(".") || /\s/.test(parsedUrl.hostname)) {
    return { valid: false, message: "Please provide a valid domain name." };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, message: "URLs containing embedded credentials are not allowed." };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, message: "This destination is blocked by LinkPulse security rules." };
  }

  return { valid: true, url: parsedUrl };
}

function getExpiryDate(expiry) {
  if (expiry === "never") return null;
  if (expiry === "1" || expiry === 1) return new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (expiry === "7" || expiry === 7) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return undefined;
}

function sendExpiredPage(res) {
  return res.status(410).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#f8fafc" />
  <title>Link Expired | LinkPulse</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    .card { width: 100%; max-width: 480px; padding: 40px 28px; text-align: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 16px 45px rgba(15,23,42,.08); }
    .icon { width: 76px; height: 76px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border-radius: 50%; background: #dbeafe; color: #2563eb; font-size: 36px; }
    h1 { margin: 0 0 14px; font-size: 28px; letter-spacing: -.7px; }
    p { margin: 0; color: #64748b; font-size: 15px; line-height: 1.7; }
    .button { display: inline-block; margin-top: 28px; padding: 14px 22px; border-radius: 12px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; }
    .footer { margin-top: 28px; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <main class="card">
    <div class="icon" aria-hidden="true">&#9716;</div>
    <h1>This link has expired</h1>
    <p>Sorry, this short link is no longer active. Its expiry date has passed.</p>
    <a class="button" href="${APP_BASE_URL}/">Go to LinkPulse Home</a>
    <div class="footer">LinkPulse &middot; Link intelligence made simple</div>
  </main>
</body>
</html>`);
}

function mapLink(link) {
  const isExpired = link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
  return {
    shortCode: link.short_code,
    originalUrl: link.original_url,
    shortUrl: `${PUBLIC_BASE_URL}/${link.short_code}`,
    clicks: Number(link.clicks || 0),
    createdAt: link.created_at,
    expiresAt: link.expires_at,
    isExpired,
  };
}

router.get("/test", (req, res) => {
  res.json({ success: true, message: "LinkPulse links router is working!" });
});

// Create links only for the signed-in user.
router.post("/shorten", requireLogin, async (req, res) => {
  const { originalUrl, expiry = "never" } = req.body || {};
  const validation = validateDestinationUrl(originalUrl);

  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  const expiresAt = getExpiryDate(expiry);
  if (expiresAt === undefined) {
    return res.status(400).json({ success: false, message: "Choose 1 day, 7 days, or never expire." });
  }

  const shortCode = randomBytes(4).toString("hex");
  try {
    await pool.execute(
      `INSERT INTO links (user_id, original_url, short_code, clicks, expires_at)
       VALUES (?, ?, ?, 0, ?)`,
      [req.session.userId, validation.url.href, shortCode, expiresAt]
    );

    return res.status(201).json({
      success: true,
      originalUrl: validation.url.href,
      shortCode,
      shortUrl: `${PUBLIC_BASE_URL}/${shortCode}`,
      expiresAt,
      expiry: expiry === "1" || expiry === 1 ? "1" : expiry === "7" || expiry === 7 ? "7" : "never",
    });
  } catch (error) {
    console.error("Failed to save link:", error.message);
    return res.status(500).json({ success: false, message: "Failed to save the short link." });
  }
});

// Dashboard analytics for the signed-in user's links only.
router.get("/dashboard/analytics", requireLogin, async (req, res) => {
  try {
    const [linkStats] = await pool.execute(
      `SELECT COUNT(*) AS totalLinks,
              COALESCE(SUM(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 ELSE 0 END), 0) AS activeLinks,
              COALESCE(SUM(clicks), 0) AS totalClicks,
              COALESCE(ROUND(AVG(clicks), 2), 0) AS averageClicksPerLink
       FROM links
       WHERE user_id = ?`,
      [req.session.userId]
    );

    const [visitorStats] = await pool.execute(
      `SELECT COUNT(DISTINCT lv.visitor_id) AS uniqueVisitors
       FROM link_visitors lv
       INNER JOIN links l ON l.id = lv.link_id
       WHERE l.user_id = ?`,
      [req.session.userId]
    );

    return res.json({
      success: true,
      totalLinks: Number(linkStats[0].totalLinks),
      activeLinks: Number(linkStats[0].activeLinks),
      totalClicks: Number(linkStats[0].totalClicks),
      uniqueVisitors: Number(visitorStats[0].uniqueVisitors),
      averageClicksPerLink: Number(linkStats[0].averageClicksPerLink),
    });
  } catch (error) {
    console.error("Dashboard analytics failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard analytics." });
  }
});

// Click timeline for this user's links only.
router.get("/analytics/timeline", requireLogin, async (req, res) => {
  const parsedDays = Number.parseInt(req.query.days, 10);
  const days = parsedDays === 30 ? 30 : 7;

  try {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(ce.clicked_at, '%Y-%m-%d') AS click_date, COUNT(*) AS clicks
       FROM click_events ce
       INNER JOIN links l ON l.id = ce.link_id
       WHERE l.user_id = ?
         AND ce.clicked_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(ce.clicked_at, '%Y-%m-%d')
       ORDER BY click_date ASC`,
      [req.session.userId, days - 1]
    );

    const clicksByDate = new Map(rows.map((row) => [row.click_date, Number(row.clicks)]));
    const dailyClicks = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      dailyClicks.push({ date: key, clicks: clicksByDate.get(key) || 0 });
    }

    return res.json({ success: true, days, dailyClicks });
  } catch (error) {
    console.error("Click timeline failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch click history." });
  }
});

// Public redirect: must remain public so shared short links work for everyone.
router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  try {
    const [rows] = await pool.execute(
      "SELECT id, original_url, expires_at FROM links WHERE short_code = ?",
      [shortCode]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Short URL not found." });
    }

    const link = rows[0];
    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
      return sendExpiredPage(res);
    }

    let visitorId = req.cookies?.linkpulse_visitor;
    if (!visitorId) {
      visitorId = randomUUID();
      res.cookie("linkpulse_visitor", visitorId, {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    await pool.execute("UPDATE links SET clicks = clicks + 1 WHERE id = ?", [link.id]);
    await pool.execute(
      "INSERT INTO click_events (link_id, visitor_id) VALUES (?, ?)",
      [link.id, visitorId]
    );
    await pool.execute(
      "INSERT IGNORE INTO link_visitors (link_id, visitor_id) VALUES (?, ?)",
      [link.id, visitorId]
    );

    return res.redirect(link.original_url);
  } catch (error) {
    console.error("Redirect tracking failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to redirect." });
  }
});

// Private analytics: a user can only inspect links they own.
router.get("/:shortCode/stats", requireLogin, async (req, res) => {
  const { shortCode } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT id, original_url, short_code, clicks, created_at, expires_at
       FROM links
       WHERE short_code = ? AND user_id = ?`,
      [shortCode, req.session.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Short URL not found." });
    }

    const link = rows[0];
    const [visitorRows] = await pool.execute(
      "SELECT COUNT(DISTINCT visitor_id) AS uniqueVisitors FROM link_visitors WHERE link_id = ?",
      [link.id]
    );

    const isExpired = link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
    return res.json({
      success: true,
      shortCode: link.short_code,
      originalUrl: link.original_url,
      shortUrl: `${PUBLIC_BASE_URL}/${link.short_code}`,
      clicks: Number(link.clicks),
      uniqueVisitors: Number(visitorRows[0].uniqueVisitors),
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      isExpired,
    });
  } catch (error) {
    console.error("Analytics failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics." });
  }
});


/* Delete a link owned by the signed-in user */
router.delete("/:shortCode", requireLogin, async (req, res) => {
  const { shortCode } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify ownership before deleting anything.
    const [rows] = await connection.execute(
      "SELECT id FROM links WHERE short_code = ? AND user_id = ? FOR UPDATE",
      [shortCode, req.session.userId]
    );

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Link not found or you do not have permission to delete it.",
      });
    }

    const linkId = rows[0].id;

    // Remove associated analytics records first.
    await connection.execute(
      "DELETE FROM click_events WHERE link_id = ?",
      [linkId]
    );

    await connection.execute(
      "DELETE FROM link_visitors WHERE link_id = ?",
      [linkId]
    );

    // Delete only the link belonging to this user.
    await connection.execute(
      "DELETE FROM links WHERE id = ? AND user_id = ?",
      [linkId, req.session.userId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Link deleted successfully.",
      shortCode,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Failed to delete link:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete the link.",
    });
  } finally {
    if (connection) connection.release();
  }
});


// List only the signed-in user's links.
router.get("/", requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, original_url, short_code, clicks, created_at, expires_at
       FROM links
       WHERE user_id = ?
       ORDER BY id DESC`,
      [req.session.userId]
    );

    const links = rows.map(mapLink);
    return res.json({ success: true, totalLinks: links.length, links });
  } catch (error) {
    console.error("Failed to fetch links:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch links." });
  }
});

module.exports = router;
