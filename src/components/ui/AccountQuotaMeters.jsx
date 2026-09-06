import React from 'react';
import { formatCountMeter, quotaPercent } from '../../services/photographerQuota.service';
import './AccountQuotaMeters.css';

export function AccountQuotaMeters({
  className = '',
  storageLabel,
  storagePct,
  imageUsed,
  imageLimit,
  faceUsed,
  faceLimit,
  compact = false,
}) {
  const rows = [
    {
      key: 'storage',
      label: 'Storage',
      meta: storageLabel,
      pct: storagePct,
    },
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
      {rows.map((row) => (
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
