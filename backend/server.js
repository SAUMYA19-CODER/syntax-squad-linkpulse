import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";
import db from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;
const APP_BASE_URL =
  process.env.APP_BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Rate limiting for URL creation.
// Allows up to 20 requests per IP within 15 minutes.
const rateLimitStore = new Map();

function limitShorteningRequests(req, res, next) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 20;
  const key = req.ip;

  let record = rateLimitStore.get(key);

  if (!record || now - record.start >= windowMs) {
    record = { start: now, count: 0 };
  }

  record.count += 1;
  rateLimitStore.set(key, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again in 15 minutes."
    });
  }

  next();
}

// Validate destination URLs.
function validateUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname.includes(".") ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

// Get saved links for Link Management.
app.get("/api/links", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         id, original_url, short_code, clicks, created_at,
         expires_at, click_limit, is_active
       FROM urls
       ORDER BY created_at DESC`
    );

    const links = rows.map((row) => ({
      id: row.id,
      originalUrl: row.original_url,
      shortCode: row.short_code,
      shortUrl: `${APP_BASE_URL}/${row.short_code}`,
      clicks: Number(row.clicks),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      clickLimit:
        row.click_limit === null ? null : Number(row.click_limit),
      isActive: Boolean(row.is_active)
    }));

    return res.json({ success: true, links });
  } catch (error) {
    console.error("Error fetching links:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch saved links."
    });
  }
});

// Create a short URL with optional expiration and click limit.
app.post(
  "/api/shorten",
  limitShorteningRequests,
  async (req, res) => {
    try {
      const { originalUrl, expiresAt, clickLimit } = req.body;

      const cleanUrl = validateUrl(originalUrl);

      if (!cleanUrl) {
        return res.status(400).json({
          success: false,
          error: "Please enter a valid HTTP or HTTPS URL."
        });
      }

      let expiryDate = null;

      if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
        expiryDate = new Date(expiresAt);

        if (
          Number.isNaN(expiryDate.getTime()) ||
          expiryDate.getTime() <= Date.now()
        ) {
          return res.status(400).json({
            success: false,
            error: "The expiration date must be in the future."
          });
        }
      }

      let validatedClickLimit = null;

      if (
        clickLimit !== undefined &&
        clickLimit !== null &&
        clickLimit !== ""
      ) {
        validatedClickLimit = Number(clickLimit);

        if (
          !Number.isSafeInteger(validatedClickLimit) ||
          validatedClickLimit < 1 ||
          validatedClickLimit > 1000000000
        ) {
          return res.status(400).json({
            success: false,
            error: "Click limit must be a positive whole number."
          });
        }
      }

      // Retry if a randomly generated code already exists.
      let code;
      let created = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        code = randomBytes(4).toString("hex");

        try {
          await db.execute(
            `INSERT INTO urls
               (original_url, short_code, expires_at, click_limit, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [cleanUrl, code, expiryDate, validatedClickLimit]
          );

          created = true;
          break;
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY") {
            throw error;
          }
        }
      }

      if (!created) {
        return res.status(503).json({
          success: false,
          error: "Unable to generate a unique short link. Please try again."
        });
      }

      return res.status(201).json({
        success: true,
        originalUrl: cleanUrl,
        shortCode: code,
        shortUrl: `${APP_BASE_URL}/${code}`,
        expiresAt: expiryDate,
        clickLimit: validatedClickLimit,
        isActive: true
      });
    } catch (error) {
      console.error("Error creating short URL:", error.message);

      return res.status(500).json({
        success: false,
        error: "Unable to create short URL. Please try again."
      });
    }
  }
);

// Enable or disable a saved link.
app.patch("/api/links/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid link ID."
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isActive must be true or false."
      });
    }

    const [result] = await db.execute(
      "UPDATE urls SET is_active = ? WHERE id = ?",
      [isActive, id]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute(
        "SELECT id FROM urls WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Link not found."
        });
      }
    }

    return res.json({
      success: true,
      isActive,
      message: isActive ? "Link enabled." : "Link disabled."
    });
  } catch (error) {
    console.error("Error updating link status:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to update link status."
    });
  }
});

// Delete a saved short link.
app.delete("/api/links/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid link ID."
      });
    }

    const [result] = await db.execute(
      "DELETE FROM urls WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Link not found."
      });
    }

    return res.json({
      success: true,
      message: "Link deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting short URL:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to delete the link. Please try again."
    });
  }
});

// Analytics Dashboard API.
app.get("/api/analytics", async (req, res) => {
  try {
    const [summaryRows] = await db.execute(
      `SELECT
         COUNT(*) AS totalLinks,
         COALESCE(SUM(clicks), 0) AS totalClicks
       FROM urls`
    );

    const [popularRows] = await db.execute(
      `SELECT original_url, short_code, clicks
       FROM urls
       ORDER BY clicks DESC, created_at DESC
       LIMIT 1`
    );

    const [topLinksRows] = await db.execute(
      `SELECT id, original_url, short_code, clicks, created_at
       FROM urls
       ORDER BY clicks DESC, created_at DESC
       LIMIT 5`
    );

    const summary = summaryRows[0];

    return res.json({
      success: true,
      analytics: {
        totalLinks: Number(summary.totalLinks),
        totalClicks: Number(summary.totalClicks),

        popularLink: popularRows.length
          ? {
              originalUrl: popularRows[0].original_url,
              shortCode: popularRows[0].short_code,
              clicks: Number(popularRows[0].clicks)
            }
          : null,

        topLinks: topLinksRows.map((row) => ({
          id: row.id,
          originalUrl: row.original_url,
          shortCode: row.short_code,
          shortUrl: `${APP_BASE_URL}/${row.short_code}`,
          clicks: Number(row.clicks),
          createdAt: row.created_at
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch analytics."
    });
  }
});

// Redirect only when the link is enabled, unexpired,
// and has not reached its click limit.
app.get("/:code", async (req, res) => {
  try {
    const code = req.params.code;

    const [rows] = await db.execute(
      `SELECT
         id, original_url, clicks, click_limit, expires_at, is_active
       FROM urls
       WHERE short_code = ?`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).send("Short link not found.");
    }

    const link = rows[0];

    if (!link.is_active) {
      return res.status(410).send("This short link has been disabled.");
    }

    if (
      link.expires_at &&
      new Date(link.expires_at).getTime() <= Date.now()
    ) {
      return res.status(410).send("This short link has expired.");
    }

    if (
      link.click_limit !== null &&
      Number(link.clicks) >= Number(link.click_limit)
    ) {
      return res.status(410).send("This short link has reached its click limit.");
    }

    // Atomically count the click only if the link remains valid.
    const [result] = await db.execute(
      `UPDATE urls
       SET clicks = clicks + 1
       WHERE id = ?
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (click_limit IS NULL OR clicks < click_limit)`,
      [link.id]
    );

    if (result.affectedRows === 0) {
      return res.status(410).send(
        "This short link is disabled, expired, or has reached its click limit."
      );
    }

    return res.redirect(link.original_url);
  } catch (error) {
    console.error("Error redirecting short URL:", error);

    return res.status(500).send(
      "Something went wrong. Please try again."
    );
  }
});

// Start the server.
app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});