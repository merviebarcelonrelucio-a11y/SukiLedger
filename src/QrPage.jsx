import { QRCodeSVG } from 'qrcode.react'
import './utang.css'
import './profile.css'
import './qr.css'

function QrPage({ customer, link, copied, onBack, onCopy, onDownload }) {
  return (
    <section className="ub">
      <button type="button" className="ub-refresh pf-back qr-hide" onClick={onBack}>
        ← Bumalik sa profile
      </button>

      <h2 className="ub-title qr-hide">QR code ni {customer.name}</h2>

      <div className="qr-card">
        <div className="qr-band">
          <span>SukiLedger</span>
          <span className="qr-band-note">Suki card</span>
        </div>
        <div className="qr-body">
          <p className="qr-name">{customer.name}</p>
          <div className="qr-code-container">
            <QRCodeSVG value={link} size={220} level="H" />
          </div>
          <p className="qr-help">I-scan para makita ang balanse at listahan mo.</p>
        </div>
      </div>

      <div className="qr-actions qr-hide">
        <button type="button" className="ub-save" onClick={onDownload}>
          Download QR Code
        </button>
        <button type="button" className="ub-refresh" onClick={onCopy}>
          {copied ? 'Na-copy!' : 'Copy link'}
        </button>
        <button type="button" className="ub-refresh" onClick={() => window.print()}>
          I-print
        </button>
      </div>
    </section>
  )
}

export default QrPage