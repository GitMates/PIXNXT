import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCountMeter, quotaPercent } from '../../services/photographerQuota.service';
import './AccountQuotaMeters.css';

const EXPANDED_KEY = 'pixnxt-quota-expanded';

function readExpanded() {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function AccountQuotaMeters({
  className = '',
  storageLabel,
  storagePct,
  imageUsed,
  imageLimit,
  faceUsed,
  faceLimit,
  // Split quotas (normal vs guest). When provided, they take precedence.
  normalImageUsed,
  normalImageLimit,
  guestImageUsed,
  guestImageLimit,
  normalFaceUsed,
  normalFaceLimit,
  guestFaceUsed,
  guestFaceLimit,
  compact = false,
  collapsible = true,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(() => {
    if (!collapsible) return true;
    const stored = readExpanded();
    // Respect an explicit stored preference, otherwise use the default (minimized).
    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(EXPANDED_KEY) != null) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return defaultExpanded;
  });

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(EXPANDED_KEY, next ? '1' : '0');
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const hasSplit =
    normalImageUsed !== undefined ||
    guestImageUsed !== undefined ||
    normalFaceUsed !== undefined ||
    guestFaceUsed !== undefined;

  const detailRows = hasSplit
    ? [
        {
          key: 'normal-images',
          label: compact ? 'Face AI Normal' : 'Face recognition (Normal)',
          meta: formatCountMeter(normalImageUsed ?? imageUsed, normalImageLimit ?? imageLimit),
          pct: quotaPercent(normalImageUsed ?? imageUsed, normalImageLimit ?? imageLimit),
        },
        {
          key: 'guest-images',
          label: compact ? 'Face AI Guest' : 'Face recognition (Guest)',
          meta: formatCountMeter(guestImageUsed ?? imageUsed, guestImageLimit ?? imageLimit),
          pct: quotaPercent(guestImageUsed ?? imageUsed, guestImageLimit ?? imageLimit),
        },
        {
          key: 'normal-face',
          label: compact ? 'Deliveries Normal' : 'Face match deliveries (Normal)',
          meta: formatCountMeter(normalFaceUsed ?? faceUsed, normalFaceLimit ?? faceLimit),
          pct: quotaPercent(normalFaceUsed ?? faceUsed, normalFaceLimit ?? faceLimit),
        },
        {
          key: 'guest-face',
          label: compact ? 'Deliveries Guest' : 'Face match deliveries (Guest)',
          meta: formatCountMeter(guestFaceUsed ?? faceUsed, guestFaceLimit ?? faceLimit),
          pct: quotaPercent(guestFaceUsed ?? faceUsed, guestFaceLimit ?? faceLimit),
        },
      ]
    : [
        {
          key: 'images',
          label: compact ? 'Face AI' : 'Face recognition',
          meta: formatCountMeter(imageUsed, imageLimit),
          pct: quotaPercent(imageUsed, imageLimit),
        },
        {
          key: 'face',
          label: compact ? 'Deliveries' : 'Face match deliveries',
          meta: formatCountMeter(faceUsed, faceLimit),
          pct: quotaPercent(faceUsed, faceLimit),
        },
      ];

  return (
    <div className={className}>
      <div className="aqm-row">
        <div className="aqm-row__head">
          <span className="aqm-row__label">Storage</span>
          <span className="aqm-row__meta">{storageLabel}</span>
          {collapsible && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide quota details' : 'Show all quotas'}
              title={expanded ? 'Hide quota details' : 'Show all quotas'}
              className="aqm-toggle"
            >
              <ChevronDown size={14} className={expanded ? 'aqm-toggle__icon aqm-toggle__icon--open' : 'aqm-toggle__icon'} />
            </button>
          )}
        </div>
        <div className="aqm-row__bar">
          <div className="aqm-row__fill" style={{ width: `${storagePct}%` }} />
        </div>
      </div>

      {(!collapsible || expanded) &&
        detailRows.map((row) => (
          <div key={row.key} className="aqm-row">
            <div className="aqm-row__head">
              <span className="aqm-row__label">{row.label}</span>
              <span className="aqm-row__meta">{row.meta}</span>
            </div>
            <div className="aqm-row__bar">
              <div className="aqm-row__fill" style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}
