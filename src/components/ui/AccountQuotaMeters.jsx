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
  /** Sidebar: Storage bar only — detail rows live on Studio identity. */
  storageOnly = false,
}) {
  const [expanded, setExpanded] = useState(() => {
    if (storageOnly || !collapsible) return true;
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
    const over = cap > 0 && u > cap;
    const atLimit = cap > 0 && u >= cap && !over;
    const base = formatCountMeter(used, limit);
    return {
      key,
      label,
      meta: over ? `${base} · over` : atLimit ? `${base} · at limit` : base,
      pct: quotaPercent(used, limit),
      over,
      atLimit,
    };
  };

  const detailRows = hasSplit
    ? [
        toRow('normal-images', compact ? 'Find People' : 'Find People (images)', normalImageUsed ?? imageUsed, normalImageLimit ?? imageLimit),
        toRow('guest-images', compact ? 'Face matching' : 'Face matching (images)', guestImageUsed ?? imageUsed, guestImageLimit ?? imageLimit),
        toRow('normal-face', compact ? 'Normal delivery' : 'Normal delivery', normalFaceUsed ?? faceUsed, normalFaceLimit ?? faceLimit),
        toRow('guest-face', compact ? 'Guest delivery' : 'Guest delivery', guestFaceUsed ?? faceUsed, guestFaceLimit ?? faceLimit),
      ]
    : [
        toRow('images', compact ? 'Face AI' : 'Face recognition', imageUsed, imageLimit),
        toRow('face', compact ? 'Deliveries' : 'Face match deliveries', faceUsed, faceLimit),
      ];

  const showDetails = !storageOnly && (!collapsible || expanded);
  const showToggle = !storageOnly && collapsible;

  return (
    <div className={className}>
      <div className="aqm-row">
        <div className="aqm-row__head">
          <span className="aqm-row__label">Storage</span>
          <span className="aqm-row__meta">{storageLabel}</span>
          {showToggle && (
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

      {showDetails &&
        detailRows.map((row) => (
          <div
            key={row.key}
            role={row.over || row.atLimit ? 'button' : undefined}
            tabIndex={row.over || row.atLimit ? 0 : undefined}
            className={`aqm-row${row.over ? ' aqm-row--over' : ''}${row.atLimit ? ' aqm-row--at-limit' : ''}`}
            onClick={() => {
              if (row.over) {
                alert(
                  `${row.label} is over its limit (${row.meta}).\n\n`
                  + `Ask an admin to raise this limit in Quotas & Limits, or free usage before continuing.`,
                );
              } else if (row.atLimit) {
                alert(
                  `${row.label} is at its limit (${row.meta}).\n\n`
                  + `Ask an admin to raise this limit in Quotas & Limits to use more.`,
                );
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && (row.over || row.atLimit)) {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
          >
            <div className="aqm-row__head">
              <span className="aqm-row__label">{row.label}</span>
              <span
                className={`aqm-row__meta${row.over ? ' aqm-row__meta--over' : ''}${row.atLimit ? ' aqm-row__meta--at-limit' : ''}`}
                title={
                  row.over
                    ? 'Over limit — click for details'
                    : row.atLimit
                      ? 'At limit — click for details'
                      : undefined
                }
              >
                {row.meta}
              </span>
            </div>
            <div className="aqm-row__bar">
              <div
                className={`aqm-row__fill${row.over ? ' aqm-row__fill--over' : ''}${row.atLimit ? ' aqm-row__fill--at-limit' : ''}`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
