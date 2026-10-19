import { useEffect, useState } from "react";
import {
BarChart3,
MousePointerClick,
Link2,
TrendingUp,
RefreshCw,
ExternalLink
} from "lucide-react";

const API_BASE_URL = (
import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function AnalyticsDashboard() {
const [analytics, setAnalytics] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function fetchAnalytics() {
try {
setError("");


  const response = await fetch(`${API_BASE_URL}/api/analytics`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error("Unable to load analytics.");
  }

  setAnalytics(data.analytics);
} catch (err) {
  console.error("Analytics error:", err);
  setError("Unable to load analytics. Please try again.");
} finally {
  setLoading(false);
}


}

useEffect(() => {
fetchAnalytics();
}, []);

if (loading) {
return ( <section className="shortener-card analytics-dashboard"> <h2>Analytics Dashboard</h2> <p>Loading your analytics...</p> </section>
);
}

if (error) {
return ( <section className="shortener-card analytics-dashboard"> <div className="dashboard-heading"> <h2>Analytics Dashboard</h2> <button
         type="button"
         className="copy-button refresh-button"
         onClick={fetchAnalytics}
       > <RefreshCw size={16} />
Retry </button> </div> <p role="alert">{error}</p> </section>
);
}

const popularLink = analytics.popularLink;

return ( <section className="shortener-card analytics-dashboard"> <div className="dashboard-heading"> <div> <h2> <BarChart3 size={22} />
Analytics Dashboard </h2> <p>Understand how your shortened links are performing.</p> </div>


    <button
      type="button"
      className="copy-button refresh-button"
      onClick={() => {
        setLoading(true);
        fetchAnalytics();
      }}
    >
      <RefreshCw size={16} />
      Refresh Analytics
    </button>
  </div>

  <div className="analytics-summary">
    <article className="analytics-stat">
      <div className="analytics-stat-icon">
        <Link2 size={22} />
      </div>
      <p>Total Links</p>
      <strong>{analytics.totalLinks}</strong>
    </article>

    <article className="analytics-stat">
      <div className="analytics-stat-icon">
        <MousePointerClick size={22} />
      </div>
      <p>Total Clicks</p>
      <strong>{analytics.totalClicks}</strong>
    </article>

    <article className="analytics-stat">
      <div className="analytics-stat-icon">
        <TrendingUp size={22} />
      </div>
      <p>Top Link Clicks</p>
      <strong>{popularLink ? popularLink.clicks : 0}</strong>
    </article>
  </div>

  <div className="analytics-popular">
    <h3>Most Popular Link</h3>

    {popularLink ? (
      <>
        <p className="analytics-original-url">
          {popularLink.originalUrl}
        </p>
        <a
          className="saved-short-url"
          href={`${API_BASE_URL}/${popularLink.shortCode}`}
          target="_blank"
          rel="noreferrer"
        >
          {API_BASE_URL}/{popularLink.shortCode}
          <ExternalLink size={14} />
        </a>
        <p>
          Total clicks: <strong>{popularLink.clicks}</strong>
        </p>
      </>
    ) : (
      <p>No links have been created yet. Shorten a URL to see analytics.</p>
    )}
  </div>

  <div className="analytics-top-links">
    <h3>Top 5 Links</h3>

    {!analytics.topLinks || analytics.topLinks.length === 0 ? (
      <p>Your top links will appear here after you shorten a URL.</p>
    ) : (
      <div className="analytics-table-wrapper">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Short Link</th>
              <th>Destination</th>
              <th>Clicks</th>
            </tr>
          </thead>

          <tbody>
            {analytics.topLinks.map((link, index) => (
              <tr key={link.id}>
                <td>#{index + 1}</td>
                <td>
                  <a
                    href={`${API_BASE_URL}/${link.shortCode}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.shortCode}
                  </a>
                </td>
                <td className="analytics-destination">
                  <a
                    href={link.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={link.originalUrl}
                  >
                    {link.originalUrl}
                  </a>
                </td>
                <td>
                  <strong>{link.clicks}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</section>


);
}
