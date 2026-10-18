
import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";
import db from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Get saved links for the management dashboard
app.get("/api/links", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, original_url, short_code, clicks, created_at
       FROM urls
       ORDER BY created_at DESC`
    );

    const links = rows.map((row) => ({
      id: row.id,
      originalUrl: row.original_url,
      shortCode: row.short_code,
      shortUrl: `${APP_BASE_URL}/${row.short_code}`,
      clicks: row.clicks,
      createdAt: row.created_at
    }));

    return res.json({
      success: true,
      links: links
    });
  } catch (error) {
    console.error("Error fetching links:", error.message);

    return res.status(500).json({
      error: "Unable to fetch links."
    });
  }
});

// Create a short URL and save it in MySQL
app.post("/api/shorten", async (req, res) => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl || typeof originalUrl !== "string") {
      return res.status(400).json({
        error: "Please enter a URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(originalUrl);
    } catch {
      return res.status(400).json({
        error: "Please enter a valid URL"
      });
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname.includes(".")
    ) {
      return res.status(400).json({
        error: "Please enter a valid HTTP or HTTPS URL"
      });
    }

    const cleanUrl = parsedUrl.href;
    const code = randomBytes(4).toString("hex");

    await db.execute(
      "INSERT INTO urls (original_url, short_code) VALUES (?, ?)",
      [cleanUrl, code]
    );

    return res.json({
      success: true,
      originalUrl: cleanUrl,
      shortUrl: `${APP_BASE_URL}/${code}`
    });
  } catch (error) {
    console.error("Error creating short URL:", error.message);

    return res.status(500).json({
      error: "Unable to create short URL. Please try again."
    });
  }
});

// Redirect to the original URL and count the click
app.get("/:code", async (req, res) => {
  try {
    const code = req.params.code;

    const [rows] = await db.execute(
      "SELECT original_url FROM urls WHERE short_code = ?",
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).send("Short link not found");
    }

    const originalUrl = rows[0].original_url;

    await db.execute(
      "UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?",
      [code]
    );

    return res.redirect(originalUrl);
  } catch (error) {
    console.error("Error redirecting short URL:", error.message);

    return res.status(500).send(
      "Something went wrong. Please try again."
    );
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});

