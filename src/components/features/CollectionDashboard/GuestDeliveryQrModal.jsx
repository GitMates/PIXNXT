import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getGuestRegistrationUrl } from '../../../lib/guestDeliveryLinks';
import { getQrCodeImageUrl } from '../../../lib/shareCollection';
import { guestDeliveryService } from '../../../services/guestDelivery.service';
import { persistGuestDeliveryEventSettings } from '../../../lib/deliverySettingsSync';
import { resolveDeliveryGuestSettings } from '../../../lib/studioDefaults';
import { STANDEE_DESIGNS, STANDEE_LANGUAGES, STANDEE_SIZES, StandeeSheet } from '../../guest-delivery/StandeeSheet';
import { DatePicker } from '../../ui/DatePicker';

const ARRIVAL_OPTIONS = [
  { value: 'same_evening', label: 'Same evening' },
  { value: 'next_day', label: 'Next day' },
  { value: 'within_3_days', label: 'Within 3 days' },
  { value: 'within_week', label: 'Within a week' },
  { value: 'custom', label: 'Custom' },
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

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
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

const PRINT_SIZES = {
  a3: { width: 1754, height: 2480, filename: 'a3-standee.png' },
  a5: { width: 874, height: 1240, filename: 'a5-table-card.png' },
  wide: { width: 1920, height: 1080, filename: 'venue-screen.png' },
  tall: { width: 1080, height: 1920, filename: 'phone-card.png' },
};

const VENUE_ICONS = {
  a3: <StandeeIcon />,
  a5: <TableCardIcon />,
  wide: <ScreenIcon />,
  tall: <PhoneIcon />,
  code: <CodeIcon />,
};

function parseCalendarDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDeliveryDate(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CAPTURE_PROPS = [
  'display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'background-color', 'color', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-transform', 'white-space',
  'gap', 'row-gap', 'column-gap', 'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items', 'justify-self',
  'overflow', 'object-fit', 'top', 'right', 'bottom', 'left', 'box-shadow',
];

function inlineCaptureStyles(source, target) {
  const computed = getComputedStyle(source);
  target.setAttribute('style', CAPTURE_PROPS.map((prop) => `${prop}:${computed.getPropertyValue(prop)}`).join(';'));
  const sourceKids = [...source.children];
  const targetKids = [...target.children];
  sourceKids.forEach((child, index) => {
    if (targetKids[index]) inlineCaptureStyles(child, targetKids[index]);
  });
}

async function inlineCaptureImages(source, target) {
  const sources = [...source.querySelectorAll('img')];
  const targets = [...target.querySelectorAll('img')];
  await Promise.all(sources.map(async (img, index) => {
    const dest = targets[index];
    if (!dest) return;
    const src = img.currentSrc || img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) {
      if (src) dest.setAttribute('src', src);
      return;
    }
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('image');
      dest.setAttribute('src', await blobToDataUrl(await res.blob()));
    } catch {
      dest.removeAttribute('src');
    }
  }));
}

async function captureNodePng(node) {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || node.offsetWidth));
  const height = Math.max(1, Math.round(rect.height || node.offsetHeight));
  if (width < 20 || height < 20) throw new Error('Template is not ready');
  const clone = node.cloneNode(true);
  inlineCaptureStyles(node, clone);
  await inlineCaptureImages(node, clone);
  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.setAttribute('style', `width:${width}px;height:${height}px;margin:0;overflow:hidden;background:#fff;`);
  wrapper.appendChild(clone);
  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="${width}" height="${height}">${serialized}</foreignObject></svg>`;
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not draw the template'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function waitFrames(count = 2) {
  return new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });
}

export function GuestDeliveryQrModal({
  slug,
  event,
  guests = [],
  photographerId,
  photographerProfile = null,
  deliveryName = '',
  deliveryDate = '',
  onClose,
  onOpenGuestList,
  onEventUpdated,
}) {
  const [copied, setCopied] = useState(false);
  const [savingReg, setSavingReg] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [formatId, setFormatId] = useState('a3');
  const [qrData, setQrData] = useState('');
  const [exportSpec, setExportSpec] = useState(null);
  const exportRef = useRef(null);
  const [acceptingOverride, setAcceptingOverride] = useState(null);
  const registrationUrl = getGuestRegistrationUrl(slug, photographerProfile);
  const qrUrl = qrData || getQrCodeImageUrl(registrationUrl, 640);

  useEffect(() => {
    let cancelled = false;
    setQrData('');
    (async () => {
      try {
        const res = await fetch(getQrCodeImageUrl(registrationUrl, 640));
        if (!res.ok) throw new Error('QR image failed');
        const data = await blobToDataUrl(await res.blob());
        if (!cancelled) setQrData(data);
      } catch {
        if (!cancelled) setQrData('');
      }
    })();
    return () => { cancelled = true; };
  }, [registrationUrl]);
  const shortPath = displayGuestPath(registrationUrl);
  const acceptingFromEvent = event?.registration_enabled !== false;
  const accepting = acceptingOverride ?? acceptingFromEvent;

  useEffect(() => {
    setAcceptingOverride(null);
  }, [event?.id, event?.registration_enabled]);

  const deliverySettings = resolveDeliveryGuestSettings(event, photographerProfile);
  const [languages, setLanguages] = useState(deliverySettings.languages);
  const [standee, setStandee] = useState(deliverySettings.standee);
  const [arrival, setArrival] = useState(deliverySettings.arrival);
  const [customDate, setCustomDate] = useState(deliverySettings.customArrivalDate || '');

  useEffect(() => {
    const next = resolveDeliveryGuestSettings(event, photographerProfile);
    setLanguages(next.languages);
    setStandee(next.standee);
    setArrival(next.arrival);
    setCustomDate(next.customArrivalDate || '');
  }, [event?.id, event?.settings, photographerProfile]);

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

  const resolvePhotographerId = () => photographerId || event?.photographer_id || null;

  const toggleAccepting = async () => {
    if (savingReg || !event?.id) return;
    const next = !accepting;
    const previous = event.registration_enabled;
    setAcceptingOverride(next);
    onEventUpdated?.((prev) => (prev ? { ...prev, registration_enabled: next } : prev));
    setSavingReg(true);
    try {
      const ownerId = resolvePhotographerId();
      if (!ownerId) throw new Error('You must be signed in to change registration settings.');
      const updated = await guestDeliveryService.setRegistrationEnabled(ownerId, event.id, next);
      onEventUpdated?.(updated);
      setAcceptingOverride(null);
    } catch (err) {
      console.error(err);
      setAcceptingOverride(null);
      onEventUpdated?.((prev) => (prev ? { ...prev, registration_enabled: previous } : prev));
      alert(err?.message || 'Could not update registration. Please try again.');
    } finally {
      setSavingReg(false);
    }
  };

  const saveDeliveryOptions = async (patch, rollback) => {
    if (!event?.id) return;
    const ownerId = resolvePhotographerId();
    if (!ownerId) return;
    const next = {
      ...resolveDeliveryGuestSettings(event, photographerProfile),
      languages,
      standee,
      arrival,
      ...patch,
    };
    if (patch.languages) setLanguages(patch.languages);
    if (patch.standee) setStandee(patch.standee);
    if (patch.arrival) setArrival(patch.arrival);
    try {
      await persistGuestDeliveryEventSettings(ownerId, event, next, onEventUpdated);
    } catch (err) {
      console.error(err);
      rollback?.();
      alert(err?.message || 'Could not save this delivery’s guest settings.');
    }
  };

  const toggleLanguage = (id) => {
    const previous = languages;
    const has = languages.includes(id);
    if (has && languages.length === 1) return;
    const next = has ? languages.filter((lang) => lang !== id) : [...languages, id];
    setLanguages(next);
    saveDeliveryOptions({ languages: next }, () => setLanguages(previous));
  };

  const chooseStandee = (value) => {
    const previous = standee;
    setStandee(value);
    saveDeliveryOptions({ standee: value }, () => setStandee(previous));
  };

  const chooseArrival = (value) => {
    const previous = arrival;
    setArrival(value);
    saveDeliveryOptions({ arrival: value }, () => setArrival(previous));
  };

  const chooseCustomDate = (value) => {
    const previous = customDate;
    const next = value || '';
    const picked = parseCalendarDate(next);
    const eventDay = parseCalendarDate(eventDateValue);
    if (picked && eventDay && picked < eventDay) return;
    setCustomDate(next);
    setArrival('custom');
    saveDeliveryOptions(
      { arrival: 'custom', customArrivalDate: next },
      () => {
        setCustomDate(previous);
        setArrival(arrival);
      },
    );
  };

  const studioName = photographerProfile?.business_name
    || photographerProfile?.studio_name
    || photographerProfile?.display_name
    || photographerProfile?.full_name
    || '';
  const eventTitle = deliveryName || event?.name || 'This delivery';
  const eventDateLabel = formatDeliveryDate(deliveryDate || event?.event_date);
  const eventDateValue = deliveryDate || event?.event_date || '';
  const eventDay = parseCalendarDate(eventDateValue);
  const customDay = parseCalendarDate(customDate);
  const validCustomDate = customDay && eventDay && customDay < eventDay ? '' : customDate;
  const selectedSize = STANDEE_SIZES.find((size) => size.id === formatId) || STANDEE_SIZES[0];

  const sheetProps = {
    design: standee,
    languages,
    arrival,
    studioName: studioName || 'Studio',
    eventName: eventTitle,
    eventDateLabel,
    eventDateValue,
    customDate: validCustomDate,
    codeLabel: shortPath,
    qrSrc: qrUrl,
  };

  const handleDownload = async (kind) => {
    setFormatId(kind);
    setDownloading(kind);
    try {
      if (kind === 'code') {
        const base = slug || 'event';
        if (qrData) {
          const blob = await (await fetch(qrData)).blob();
          await downloadBlob(blob, `${base}-qr.png`);
        } else {
          await downloadRemoteFile(getQrCodeImageUrl(registrationUrl, 1024), `${base}-qr.png`);
        }
        await downloadRemoteFile(getQrCodeImageUrl(registrationUrl, 1024, 'svg'), `${base}-qr.svg`);
        return;
      }
      const spec = PRINT_SIZES[kind];
      if (!spec) return;
      const ratio = STANDEE_SIZES.find((size) => size.id === kind)?.ratio || 'a';
      setExportSpec({ ...spec, ratio });
      if (document.fonts?.ready) await document.fonts.ready;
      let node = null;
      for (let attempt = 0; attempt < 20 && !node; attempt += 1) {
        await waitFrames(1);
        node = exportRef.current?.querySelector('.stand');
      }
      if (!node) throw new Error('Template is not ready');
      const blob = await captureNodePng(node);
      if (!blob) throw new Error('Could not draw the template');
      const base = slug || 'event';
      await downloadBlob(blob, `${base}-${spec.filename}`);
    } catch (err) {
      console.error(err);
      alert('Could not prepare that download. Please try again.');
    } finally {
      setExportSpec(null);
      setDownloading('');
    }
  };

  const venueItems = [
    ...STANDEE_SIZES.map((size) => ({
      id: size.id,
      title: size.title,
      hint: size.detail,
    })),
    { id: 'code', title: 'Just the code', hint: 'PNG and SVG' },
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
                {formatId === 'code' ? (
                  <div className="gd-qr-code">
                    <img src={qrUrl} alt="Guest registration QR" width="208" height="208" />
                  </div>
                ) : (
                  <div className={`gd-qr-sheet gd-qr-sheet--${selectedSize.id}`}>
                    <StandeeSheet ratio={selectedSize.ratio} {...sheetProps} />
                  </div>
                )}
                <div className="gd-qr-link-row">
                  <input type="text" readOnly value={shortPath} className="gd-qr-link-input" />
                  <button type="button" className="gd-qr-copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="gd-qr-venue">
                <p className="gd-qr-kicker">Take it to the venue</p>
                <div className="gd-qr-venue-list" role="listbox" aria-label="Take it to the venue">
                  {venueItems.map((item) => {
                    const selected = formatId === item.id;
                    return (
                      <div key={item.id} className={`gd-qr-venue-card${selected ? ' is-selected' : ''}`}>
                        <button
                          type="button"
                          className="gd-qr-venue-pick"
                          role="option"
                          aria-selected={selected}
                          onClick={() => setFormatId(item.id)}
                        >
                          <span className="gd-qr-venue-icon">{VENUE_ICONS[item.id]}</span>
                          <span className="gd-qr-venue-copy">
                            <strong>{item.title}</strong>
                            <span>{item.hint}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="gd-qr-dl"
                          onClick={() => handleDownload(item.id)}
                          disabled={Boolean(downloading)}
                        >
                          {downloading === item.id ? 'Preparing…' : 'Download'}
                        </button>
                      </div>
                    );
                  })}
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
                <p className="gd-qr-kicker">This delivery</p>
                <p className="gd-qr-defaults-note">
                  Starts from Settings → Guest delivery. A change here stays on this delivery.
                </p>
                <p className="gd-qr-field-label">Standee design</p>
                <div className="gd-qr-lang-row">
                  {STANDEE_DESIGNS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`gd-qr-lang${standee === opt.value ? ' is-on' : ''}`}
                      aria-pressed={standee === opt.value}
                      onClick={() => chooseStandee(opt.value)}
                    >
                      {opt.title}
                    </button>
                  ))}
                </div>
                <p className="gd-qr-field-label">Language</p>
                <div className="gd-qr-lang-row">
                  {STANDEE_LANGUAGES.map((lang) => {
                    const active = languages.includes(lang.value);
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        className={`gd-qr-lang${active ? ' is-on' : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleLanguage(lang.value)}
                      >
                        {active ? lang.label : `+ ${lang.label}`}
                      </button>
                    );
                  })}
                </div>
                <p className="gd-qr-field-label">Delivery date</p>
                <div className="gd-qr-lang-row">
                  {ARRIVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`gd-qr-lang${arrival === opt.value ? ' is-on' : ''}`}
                      aria-pressed={arrival === opt.value}
                      onClick={() => chooseArrival(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {arrival === 'custom' ? (
                  <div className="gd-qr-date">
                    <DatePicker
                      value={validCustomDate}
                      onChange={chooseCustomDate}
                      placeholder="Select delivery date"
                      displayFormat="long"
                      portalZIndex={12000}
                      minDate={eventDateValue || null}
                    />
                    {eventDateLabel ? (
                      <p className="gd-qr-date-note">On or after the event date, {eventDateLabel}.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <p className="gd-qr-help">
                {helpLead}
                <strong>Guests</strong>.
              </p>
            </div>
          </div>
        </div>

        {exportSpec ? (
          <div className="gd-qr-export" ref={exportRef} aria-hidden="true">
            <div style={{ width: exportSpec.width }}>
              <StandeeSheet ratio={exportSpec.ratio} {...sheetProps} />
            </div>
          </div>
        ) : null}

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
