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

  // Over-limit (used > limit) gets a warning state — otherwise e.g. "3/1"
  // renders as a plain full bar and looks identical to "at limit".
  const toRow = (key, label, used, limit) => {
    const u = Number(used) || 0;
    const cap = Number(limit);
    return {
      key,
      label,
      meta: formatCountMeter(used, limit),
      pct: quotaPercent(used, limit),
      over: cap > 0 && u > cap,
    };
  };

  const detailRows = hasSplit
    ? [
        toRow('normal-images', compact ? 'Face AI Normal' : 'Face recognition (Normal)', normalImageUsed ?? imageUsed, normalImageLimit ?? imageLimit),
        toRow('guest-images', compact ? 'Face AI Guest' : 'Face recognition (Guest)', guestImageUsed ?? imageUsed, guestImageLimit ?? imageLimit),
        toRow('normal-face', compact ? 'Deliveries Normal' : 'Face match deliveries (Normal)', normalFaceUsed ?? faceUsed, normalFaceLimit ?? faceLimit),
        toRow('guest-face', compact ? 'Deliveries Guest' : 'Face match deliveries (Guest)', guestFaceUsed ?? faceUsed, guestFaceLimit ?? faceLimit),
      ]
    : [
        toRow('images', compact ? 'Face AI' : 'Face recognition', imageUsed, imageLimit),
        toRow('face', compact ? 'Deliveries' : 'Face match deliveries', faceUsed, faceLimit),
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
          <div key={row.key} className={`aqm-row${row.over ? ' aqm-row--over' : ''}`}>
            <div className="aqm-row__head">
              <span className="aqm-row__label">{row.label}</span>
              <span
                className={`aqm-row__meta${row.over ? ' aqm-row__meta--over' : ''}`}
                title={row.over ? 'Over limit — usage exceeds the cap set by the admin' : undefined}
              >
                {row.meta}{row.over ? ' · over' : ''}
              </span>
            </div>
            <div className="aqm-row__bar">
              <div
                className={`aqm-row__fill${row.over ? ' aqm-row__fill--over' : ''}`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
