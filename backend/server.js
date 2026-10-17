
import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Temporary storage: links server restart hone tak rahenge
const links = new Map();

// Short URL create karna
app.post("/api/shorten", (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({
      error: "Please enter a URL",
    });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    return res.status(400).json({
      error: "Please enter a valid URL",
    });
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname.includes(".")
  ) {
    return res.status(400).json({
      error: "Please enter a valid HTTP or HTTPS URL",
    });
  }

  const code = randomBytes(4).toString("hex");

  links.set(code, parsedUrl.href);

  return res.json({
    success: true,
    originalUrl: parsedUrl.href,
    shortUrl: `http://localhost:${PORT}/${code}`,
  });
});

// Short URL ko original URL par redirect karna
app.get("/:code", (req, res) => {
  const originalUrl = links.get(req.params.code);

  if (!originalUrl) {
    return res.status(404).send("Short link not found");
  }

  return res.redirect(originalUrl);
});

// Server start
app.listen(PORT, () => {
  console.log(`URL Shortener running at http://localhost:${PORT}`);
});
