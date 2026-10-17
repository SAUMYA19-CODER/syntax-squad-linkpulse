import { useState } from "react";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import "./App.css";

import QRGenerator from "./QRGenerator";
export default function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleShorten(event) {
    event.preventDefault();

    setError("");
    setShortUrl("");
    setCopied(false);

    let formattedUrl = originalUrl.trim();

    if (!formattedUrl) {
      setError("Please enter a URL first.");
      return;
    }

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const parsedUrl = new URL(formattedUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".")
      ) {
        throw new Error("Invalid URL");
      }

      setLoading(true);

      const response = await fetch("http://localhost:5000/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: parsedUrl.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to shorten this URL.");
      }

      setShortUrl(data.shortUrl);
    } catch (err) {
      setError(
        err.message === "Invalid URL"
          ? "Please enter a valid website URL."
          : err.message || "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LinkPulse home">
          <span className="brand-icon">
            <Link2 size={23} />
          </span>
          <span>
            Link<span className="brand-accent">Pulse</span>
          </span>
        </a>

        <div className="header-label">
          <span className="status-dot" />
          Simple URL Shortener
        </div>
      </header>

      <main className="main-content">
        <div className="hero-badge">
          <Zap size={15} />
          Short links. Easy sharing.
        </div>

        <h1>
          Make your links
          <br />
          <span>short & powerful.</span>
        </h1>

        <p className="hero-description">
          Turn long URLs into short, shareable links in seconds.
          Paste your link below to get started.
        </p>

        <section className="shortener-card">
          <form onSubmit={handleShorten}>
            <label htmlFor="original-url">Your destination URL</label>

            <div className="url-input-wrap">
              <Link2 size={20} className="input-icon" />
              <input
                id="original-url"
                type="text"
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                placeholder="https://example.com/your-long-link"
                autoComplete="url"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button
              className="shorten-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating your link..." : "Shorten URL"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {shortUrl && (
            <div className="result-panel">
              <div className="result-heading">
                <span className="success-icon">
                  <Check size={16} />
                </span>
                Your short link is ready!
              </div>

              <div className="result-link-row">
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="result-link"
                >
                  {shortUrl}
                </a>

                <button
                  className="copy-button"
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy short URL"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                className="open-link"
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
              >
                Test your short link <ExternalLink size={14} />
              </a>
            </div>
          )}
        </section>


        <QRGenerator />

        <div className="feature-row">
          <div className="feature-item">
            <span className="feature-icon">
              <Zap size={18} />
            </span>
            <div>
              <strong>Fast & simple</strong>
              <p>Create short links in seconds</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong>HTTP & HTTPS</strong>
              <p>Supports standard web URLs</p>
            </div>
          </div>
        </div>

        <p className="privacy-note">
          Your links are stored temporarily while the server is running.
        </p>
      </main>

      <footer className="footer">
        <span>LinkPulse URL Shortener</span>
        <span>Simple links, less clutter.</span>
      </footer>
    </div>
  );
}