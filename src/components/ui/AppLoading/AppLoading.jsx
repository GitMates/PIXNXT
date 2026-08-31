import React from 'react';
import { AppSpinner } from './AppSpinner';

export function AppLoader({
  label,
  variant = 'page',
  size = 'md',
  className = '',
  showEllipsis = true,
}) {
  const isInline = variant === 'inline';
  const labelClass = isInline ? 'app-loader__label--sans' : 'app-loader__label';

  return (
    <div
      className={`app-loader app-loader--${variant}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <AppSpinner size={size} />
      {label ? (
        <p className={labelClass}>
          {label}
          {showEllipsis && !String(label).endsWith('…') ? (
            <span className="app-loader__ellipsis" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export { AppSpinner };
