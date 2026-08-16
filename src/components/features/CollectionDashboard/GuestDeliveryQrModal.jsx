import React, { useMemo, useState } from 'react';
import { getGuestRegistrationUrl } from '../../../lib/guestDeliveryLinks';
import { getQrCodeImageUrl } from '../../../lib/shareCollection';
import { guestDeliveryService } from '../../../services/guestDelivery.service';

const FORM_LANGUAGES = [
  { id: 'en', label: 'English', locked: true },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'ta', label: 'தமிழ்' },
];

const SMALL_COUNTS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function displayGuestPath(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/register\/?$/i, '').replace(/\/+$/, '');
    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function downloadBlob(blob, filename) {
  if (!blob) return;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

async function downloadRemoteFile(src, filename) {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Download failed');
    await downloadBlob(await res.blob(), filename);
  } catch {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
}

async function downloadQrPoster({ qrSrc, title, subtitle, width, height, filename }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1d1916';
  ctx.font = `500 ${Math.round(width * 0.045)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, Math.round(height * 0.12));

  ctx.fillStyle = '#857f7b';
  ctx.font = `400 ${Math.round(width * 0.022)}px system-ui, sans-serif`;
  ctx.fillText(subtitle, width / 2, Math.round(height * 0.17));

  const qrSize = Math.round(Math.min(width, height) * 0.42);
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = Math.round(height * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

  try {
    const qr = await loadImage(qrSrc);
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } catch {
    ctx.strokeStyle = '#e5e2dc';
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  }

  ctx.fillStyle = '#1d1916';
  ctx.font = `500 ${Math.round(width * 0.028)}px Georgia, serif`;
  ctx.fillText('Guest registration', width / 2, qrY + qrSize + 48);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  await downloadBlob(blob, filename);
}

function StandeeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="2.5" width="10" height="15" rx="1.2" />
      <circle cx="10" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TableCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <path d="M3 12h18" />
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="1.5" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1.5" strokeDasharray="2.2 2.4" />
    </svg>
  );
}

function withoutSelfieCopy(count) {
  const rest = 'can still be sent the whole gallery — they just will not get a personal set. You can chase them from ';
  if (count <= 0) return `Guests without a selfie ${rest}`;
  const n = count <= 10 ? SMALL_COUNTS[count] : String(count);
  const who = count === 1 ? `The ${n} guest without a selfie` : `The ${n} guests without a selfie`;
  return `${who} ${rest}`;
}

export function GuestDeliveryQrModal({
  slug,
  event,
  guests = [],
  photographerId,
  onClose,
  onOpenGuestList,
  onEventUpdated,
}) {
  const [copied, setCopied] = useState(false);
  const [savingReg, setSavingReg] = useState(false);
  const [downloading, setDownloading] = useState('');
  const registrationUrl = getGuestRegistrationUrl(slug);
  const qrUrl = getQrCodeImageUrl(registrationUrl, 280);
  const shortPath = displayGuestPath(registrationUrl);
  const accepting = event?.registration_enabled !== false;
  const languages = Array.isArray(event?.settings?.languages) && event.settings.languages.length
    ? event.settings.languages
    : ['en'];

  const stats = useMemo(() => {
    const registered = guests.length || Number(event?.guest_count) || 0;
    const selfie = guests.filter((g) => Boolean(g.selfie_url)).length;
    const matched = guests.filter((g) => Number(g.matched_photo_count) > 0).length;
    return { registered, selfie, matched };
  }, [guests, event?.guest_count]);

  const withoutSelfie = Math.max(0, stats.registered - stats.selfie);
  const helpLead = withoutSelfieCopy(withoutSelfie);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this registration link:', registrationUrl);
    }
  };

  const persistSettings = async (updates, settingsPatch) => {
    if (!event?.id || !photographerId) return;
    const nextSettings = { ...(event.settings || {}), ...settingsPatch };
    const updated = await guestDeliveryService.updateEvent(photographerId, event.id, {
      ...updates,
      settings: nextSettings,
    });
    onEventUpdated?.(updated);
  };

  const toggleAccepting = async () => {
    if (savingReg) return;
    setSavingReg(true);
    try {
      await persistSettings({ registration_enabled: !accepting }, {});
    } catch (err) {
      console.error(err);
      alert('Could not update registration. Please try again.');
    } finally {
      setSavingReg(false);
    }
  };

  const toggleLanguage = async (id) => {
    if (id === 'en') return;
    const next = languages.includes(id)
      ? languages.filter((lang) => lang !== id)
      : [...languages, id];
    if (!next.includes('en')) next.unshift('en');
    try {
      await persistSettings({}, { languages: next });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (kind) => {
    const specs = {
      standee: { width: 1404, height: 1984, filename: `${slug || 'event'}-standee.png` },
      table: { width: 874, height: 1240, filename: `${slug || 'event'}-table-card.png` },
      screen: { width: 1920, height: 1080, filename: `${slug || 'event'}-digital-display.png` },
    };
    setDownloading(kind);
    try {
      if (kind === 'code') {
        const base = slug || 'event';
        await downloadRemoteFile(getQrCodeImageUrl(registrationUrl, 1024), `${base}-qr.png`);
        await downloadRemoteFile(getQrCodeImageUrl(registrationUrl, 1024, 'svg'), `${base}-qr.svg`);
        return;
      }
      const spec = specs[kind];
      if (!spec) return;
      await downloadQrPoster({
        qrSrc: getQrCodeImageUrl(registrationUrl, 400),
        title: event?.name || 'PIXNXT',
        subtitle: shortPath,
        ...spec,
      });
    } catch (err) {
      console.error(err);
      alert('Could not prepare that download. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  const venueItems = [
    { id: 'standee', title: 'Standee', hint: 'A2 print-ready, your logo on it', icon: <StandeeIcon /> },
    { id: 'table', title: 'Table card', hint: 'A5, four to a sheet', icon: <TableCardIcon /> },
    { id: 'screen', title: 'Digital display', hint: '16:9 for a screen at the entrance', icon: <ScreenIcon /> },
    { id: 'code', title: 'Just the code', hint: 'PNG and SVG', icon: <CodeIcon /> },
  ];

  return (
    <div className="gd-qr-overlay" onClick={onClose}>
      <div className="gd-qr-modal gd-qr-modal--studio" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gd-qr-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <header className="gd-qr-head">
          <h2 className="gd-qr-title">Guest registration</h2>
          <p className="gd-qr-sub">
            Guests scan this at the event, leave a name and a selfie, and PIXNXT matches them to
            their own photographs afterwards.
          </p>
        </header>

        <div className="gd-qr-body">
          <div className="gd-qr-grid">
            <div className="gd-qr-col">
              <div className="gd-qr-panel">
                <div className="gd-qr-code">
                  <img src={qrUrl} alt="Guest registration QR" width="208" height="208" />
                </div>
                <div className="gd-qr-link-row">
                  <input type="text" readOnly value={shortPath} className="gd-qr-link-input" />
                  <button type="button" className="gd-qr-copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="gd-qr-venue">
                <p className="gd-qr-kicker">Take it to the venue</p>
                <div className="gd-qr-venue-list">
                  {venueItems.map((item) => (
                    <div key={item.id} className="gd-qr-venue-card">
                      <span className="gd-qr-venue-icon">{item.icon}</span>
                      <div className="gd-qr-venue-copy">
                        <strong>{item.title}</strong>
                        <span>{item.hint}</span>
                      </div>
                      <button
                        type="button"
                        className="gd-qr-dl"
                        onClick={() => handleDownload(item.id)}
                        disabled={Boolean(downloading)}
                      >
                        {downloading === item.id ? 'Preparing…' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="gd-qr-col gd-qr-col--side">
              <p className="gd-qr-kicker">Registration</p>
              <div className="gd-qr-accept">
                <div>
                  <p className="gd-qr-accept-label">Accepting registrations</p>
                  <p className="gd-qr-accept-hint">
                    Off closes the QR. Anyone scanning it sees a note telling them the event has finished.
                  </p>
                </div>
                <button
                  type="button"
                  className={`gd-qr-toggle${accepting ? ' is-on' : ''}`}
                  aria-pressed={accepting}
                  disabled={savingReg}
                  onClick={toggleAccepting}
                >
                  <span />
                </button>
              </div>

              <div className="gd-qr-stats">
                <div>
                  <strong>{stats.registered.toLocaleString()}</strong>
                  <span>registered</span>
                </div>
                <div>
                  <strong>{stats.selfie.toLocaleString()}</strong>
                  <span>gave a selfie</span>
                </div>
                <div>
                  <strong>{stats.matched.toLocaleString()}</strong>
                  <span>matched to photos</span>
                </div>
              </div>

              <div className="gd-qr-langs">
                <p className="gd-qr-kicker">Languages on the form</p>
                <div className="gd-qr-lang-row">
                  {FORM_LANGUAGES.map((lang) => {
                    const active = languages.includes(lang.id);
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        className={`gd-qr-lang${active ? ' is-on' : ''}`}
                        onClick={() => toggleLanguage(lang.id)}
                      >
                        {lang.locked || active ? lang.label : `+ ${lang.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="gd-qr-help">
                {helpLead}
                <strong>Guests</strong>.
              </p>
            </div>
          </div>
        </div>

        <footer className="gd-qr-footer">
          <p className="gd-qr-foot-note">Registrations close automatically when the delivery expires.</p>
          <div className="gd-qr-foot-actions">
            <button type="button" className="gd-qr-btn-ghost" onClick={onClose}>
              Done
            </button>
            <button
              type="button"
              className="gd-qr-btn-solid"
              onClick={() => {
                onClose?.();
                onOpenGuestList?.();
              }}
            >
              Open the guest list
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
