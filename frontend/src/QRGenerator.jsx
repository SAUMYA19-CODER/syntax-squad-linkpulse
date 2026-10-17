import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download } from "lucide-react";

export default function QRGenerator() {
  const [url, setUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");

  function handleGenerate(event) {
    event.preventDefault();
    setError("");
    setGeneratedUrl("");

    let value = url.trim();

    if (!value) {
      setError("Please enter a URL first.");
      return;
    }

    if (!/^https?:\/\//i.test(value)) {
      value = `https://${value}`;
    }

    try {
      const parsedUrl = new URL(value);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".")
      ) {
        throw new Error("Invalid URL");
      }

      setGeneratedUrl(parsedUrl.href);
    } catch {
      setError("Please enter a valid website URL.");
    }
  }

  function handleDownload() {
    const svg = document.querySelector("#linkpulse-qr svg");

    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "LinkPulse-QR.svg";
    link.click();

    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <section className="qr-card">
      <div className="qr-heading">
        <span className="qr-icon">
          <QrCode size={22} />
        </span>
        <div>
          <h2>QR Code Generator</h2>
          <p>Turn any website link into a scannable QR code.</p>
        </div>
      </div>

      <form onSubmit={handleGenerate}>
        <label htmlFor="qr-url">Enter your destination URL</label>

        <input
          id="qr-url"
          className="qr-input"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
        />

        {error && <p className="error-message">{error}</p>}

        <button className="shorten-button" type="submit">
          <QrCode size={18} />
          Generate QR Code
        </button>
      </form>

      {generatedUrl && (
        <div className="qr-result">
          <div id="linkpulse-qr">
            <QRCodeSVG
              value={generatedUrl}
              size={220}
              level="H"
              includeMargin
            />
          </div>

          <p className="qr-url">{generatedUrl}</p>

          <button
            className="copy-button qr-download"
            type="button"
            onClick={handleDownload}
          >
            <Download size={17} />
            Download QR Code
          </button>
        </div>
      )}
    </section>
  );
}