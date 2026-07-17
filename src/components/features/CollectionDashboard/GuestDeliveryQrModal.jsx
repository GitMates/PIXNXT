import React, { useState } from 'react';
import { getGuestRegistrationUrl } from '../../../lib/guestDeliveryLinks';
import { getQrCodeImageUrl } from '../../../lib/shareCollection';

export function GuestDeliveryQrModal({ slug, onClose }) {
  const [copied, setCopied] = useState(false);
  const registrationUrl = getGuestRegistrationUrl(slug);
  const qrUrl = getQrCodeImageUrl(registrationUrl, 280);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this registration link:', registrationUrl);
    }
  };

  return (
    <div className="gd-qr-overlay" onClick={onClose}>
      <div className="gd-qr-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gd-qr-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2 className="gd-qr-title">Guest Registration QR</h2>
        <p className="gd-qr-sub">Print or display this QR at the event. Guests scan it to register with name, email, and selfie.</p>
        <div className="gd-qr-img-wrap">
          <img src={qrUrl} alt="Guest Registration QR" width={280} height={280} />
        </div>
        <div className="gd-qr-link-row">
          <input type="text" readOnly value={registrationUrl} className="gd-qr-link-input" />
          <button type="button" className="gd-qr-copy-btn" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
