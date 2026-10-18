
import { useState, useEffect } from "react";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import "./App.css";
import QRGenerator from "./QRGenerator";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  // Fetch saved links from the backend
  async function fetchLinks() {
    try {
      setLinksError("");

      const response = await fetch(`${API_BASE_URL}/api/links`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Unable to load saved links.");
      }

      setLinks(data.links);
    } catch (err) {
      console.error("Error loading links:", err);
      setLinksError("Unable to load saved links. Please try again.");
    } finally {
      setLinksLoading(false);
    }
  }

  // Load saved links when the page opens
  useEffect(() => {
    fetchLinks();
  }, []);

  // Create a new short URL
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

      const response = await fetch(`${API_BASE_URL}/api/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          originalUrl: parsedUrl.href
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to shorten this URL.");
      }

      setShortUrl(data.shortUrl);

      // Refresh the dashboard after creating a link
      await fetchLinks();
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

  // Copy the newly created short URL
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  }

  // Copy a saved short URL
  async function handleCopySaved(urlToCopy, shortCode) {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedCode(shortCode);

      setTimeout(() => {
        setCopiedCode("");
      }, 2000);
    } catch {
      setLinksError("Copy failed. Please copy the link manually.");
    }
  }

  // Format the creation date
  function formatDate(dateValue) {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString();
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
          <span>short &amp; powerful.</span>
        </h1>

        <p className="hero-description">
          Turn long URLs into short, shareable links in seconds.
          Paste your link below to get started.
        </p>

        {/* URL Shortener */}
        <section className="shortener-card">
          <form onSubmit={handleShorten}>
            <label htmlFor="original-url">
              Your destination URL
            </label>

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

            {error && (
              <p className="error-message">{error}</p>
            )}

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
                Test your short link
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </section>

        {/* QR Code Generator */}
        <QRGenerator />

        {/* Feature Highlights */}
        <div className="feature-row">
          <div className="feature-item">
            <span className="feature-icon">
              <Zap size={18} />
            </span>

            <div>
              <strong>Fast &amp; simple</strong>
              <p>Create short links in seconds</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">
              <ShieldCheck size={18} />
            </span>

            <div>
              <strong>HTTP &amp; HTTPS</strong>
              <p>Supports standard web URLs</p>
            </div>
          </div>
        </div>

        {/* Link Management Dashboard */}
        <section className="shortener-card link-management">
          <div className="dashboard-heading">
            <div>
              <h2>Link Management</h2>
              <p className="dashboard-description">
                View your saved links and their performance.
              </p>
            </div>

            <button
              type="button"
              className="copy-button refresh-button"
              onClick={fetchLinks}
              disabled={linksLoading}
              aria-label="Refresh saved links"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {linksError && (
            <p className="error-message">{linksError}</p>
          )}

          {linksLoading ? (
            <p className="dashboard-message">
              Loading saved links...
            </p>
          ) : links.length === 0 ? (
            <p className="dashboard-message">
              No saved links yet. Create your first short URL above.
            </p>
          ) : (
            <>
              <div className="dashboard-summary">
                <span>
                  Total links: <strong>{links.length}</strong>
                </span>

                <span>
                  Total clicks:{" "}
                  <strong>
                    {links.reduce(
                      (total, link) => total + Number(link.clicks || 0),
                      0
                    )}
                  </strong>
                </span>
              </div>

              <div className="links-list">
                {links.map((link) => (
                  <article
                    className="saved-link-card"
                    key={link.id}
                  >
                    <div className="saved-link-details">
                      <a
                        className="saved-short-url"
                        href={link.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.shortUrl}
                      </a>

                      <p
                        className="saved-original-url"
                        title={link.originalUrl}
                      >
                        Destination: {link.originalUrl}
                      </p>

                      <div className="saved-link-meta">
                        <span>
                          Clicks: <strong>{link.clicks}</strong>
                        </span>

                        <span>
                          Created: {formatDate(link.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="saved-link-actions">
                      <button
                        className="copy-button"
                        type="button"
                        onClick={() =>
                          handleCopySaved(
                            link.shortUrl,
                            link.shortCode
                          )
                        }
                        aria-label="Copy saved short URL"
                      >
                        {copiedCode === link.shortCode ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}

                        {copiedCode === link.shortCode
                          ? "Copied"
                          : "Copy"}
                      </button>

                      <a
                        className="open-link"
                        href={link.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open destination URL"
                      >
                        Open destination
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <p className="privacy-note">
          Your links are stored in the database for future access.
        </p>
      </main>

      <footer className="footer">
        <span>LinkPulse URL Shortener</span>
        <span>Simple links, less clutter.</span>
      </footer>
    </div>
  );
}

