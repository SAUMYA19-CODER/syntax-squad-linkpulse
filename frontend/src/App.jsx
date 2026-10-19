
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
import AnalyticsDashboard from "./AnalyticsDashboard";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [clickLimit, setClickLimit] = useState("");

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
      setLinksError(
        "Unable to load saved links. Please try again."
      );
    } finally {
      setLinksLoading(false);
    }
  }

  // Load saved links when the page opens
  useEffect(() => {
    fetchLinks();
  }, []);

  // Create a short URL with optional expiration and click limit
  async function handleShorten(event) {
    event.preventDefault();

    setError("");
    setShortUrl("");
    setCopied(false);

    const formattedUrl = originalUrl.trim();

    if (!formattedUrl) {
      setError("Please enter a URL first.");
      return;
    }

    let finalUrl = formattedUrl;

    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(finalUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".") ||
        parsedUrl.username ||
        parsedUrl.password
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    if (clickLimit !== "") {
      const limit = Number(clickLimit);

      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 1000000000
      ) {
        setError("Maximum clicks must be a positive whole number.");
        return;
      }
    }

    if (expiresAt) {
      const expiry = new Date(expiresAt);

      if (
        Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now()
      ) {
        setError("Please select an expiration time in the future.");
        return;
      }
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          originalUrl: parsedUrl.href,
          expiresAt: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
          clickLimit: clickLimit === ""
            ? null
            : Number(clickLimit)
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to shorten this URL."
        );
      }

      setShortUrl(data.shortUrl);
      setExpiresAt("");
      setClickLimit("");

      await fetchLinks();
    } catch (err) {
      setError(
        err.message || "Could not connect to the server."
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
      setLinksError(
        "Copy failed. Please copy the link manually."
      );
    }
  }

  // Enable or disable a saved short link
  async function handleToggleLink(link) {
    try {
      setLinksError("");

      const response = await fetch(
        `${API_BASE_URL}/api/links/${link.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            isActive: !link.isActive
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to update link status."
        );
      }

      await fetchLinks();
    } catch (err) {
      setLinksError(
        err.message || "Could not update link status."
      );
    }
  }

  // Delete a saved short link
  async function handleDeleteLink(linkId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this link? Its short URL will stop working."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLinksError("");

      const response = await fetch(
        `${API_BASE_URL}/api/links/${linkId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to delete the link."
        );
      }

      await fetchLinks();
    } catch (err) {
      setLinksError(
        err.message || "Could not delete the link."
      );
    }
  }

  // Format dates for display
  function formatDate(dateValue) {
    if (!dateValue) {
      return "Not set";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  }

  // Determine whether a link has expired or reached its click limit
  function getLinkStatus(link) {
    if (!link.isActive) {
      return "Disabled";
    }

    if (
      link.expiresAt &&
      new Date(link.expiresAt).getTime() <= Date.now()
    ) {
      return "Expired";
    }

    if (
      link.clickLimit !== null &&
      link.clickLimit !== undefined &&
      Number(link.clicks) >= Number(link.clickLimit)
    ) {
      return "Limit reached";
    }

    return "Enabled";
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="LinkPulse home"
        >
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
                onChange={(event) =>
                  setOriginalUrl(event.target.value)
                }
                placeholder="https://example.com/your-long-link"
                autoComplete="url"
              />
            </div>

            {/* Optional link rules */}
            <div className="link-rules-inputs">
              <div className="rule-field">
                <label htmlFor="expires-at">
                  Expiration date (optional)
                </label>

                <input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  min={new Date(Date.now() + 60000)
                    .toISOString()
                    .slice(0, 16)}
                  onChange={(event) =>
                    setExpiresAt(event.target.value)
                  }
                />
              </div>

              <div className="rule-field">
                <label htmlFor="click-limit">
                  Maximum clicks (optional)
                </label>

                <input
                  id="click-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={clickLimit}
                  onChange={(event) =>
                    setClickLimit(event.target.value)
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <p className="rules-help">
              Leave both fields empty for a link without
              an expiration date or click limit.
            </p>

            {error && (
              <p className="error-message">{error}</p>
            )}

            <button
              className="shorten-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating your link..."
                : "Shorten URL"}

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
                  {copied
                    ? <Check size={17} />
                    : <Copy size={17} />}

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
                View and manage your saved links.
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
                      (total, link) =>
                        total + Number(link.clicks || 0),
                      0
                    )}
                  </strong>
                </span>
              </div>

              <div className="links-list">
                {links.map((link) => {
                  const status = getLinkStatus(link);

                  return (
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
                            Clicks:{" "}
                            <strong>{link.clicks}</strong>
                            {link.clickLimit !== null &&
                              link.clickLimit !== undefined &&
                              ` / ${link.clickLimit}`}
                          </span>

                          <span>
                            Created: {formatDate(link.createdAt)}
                          </span>

                          <span>
                            Expires: {formatDate(link.expiresAt)}
                          </span>

                          <span
                            className={
                              status === "Enabled"
                                ? "link-status-active"
                                : "link-status-disabled"
                            }
                          >
                            Status: {status}
                          </span>
                        </div>
                      </div>

                      {/* Saved Link Actions */}
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
                          {copiedCode === link.shortCode
                            ? <Check size={16} />
                            : <Copy size={16} />}

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

                        <button
                          className="copy-button"
                          type="button"
                          onClick={() => handleToggleLink(link)}
                          disabled={
                            status === "Expired" ||
                            status === "Limit reached"
                          }
                        >
                          {link.isActive ? "Disable" : "Enable"}
                        </button>

                        <button
                          className="copy-button"
                          type="button"
                          onClick={() =>
                            handleDeleteLink(link.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

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