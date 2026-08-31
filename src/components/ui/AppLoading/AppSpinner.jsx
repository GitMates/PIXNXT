import React from 'react';

export function AppSpinner({ size = 'md', className = '', label }) {
  return (
    <span
      className={`app-spinner app-spinner--${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="app-spinner__ring app-spinner__ring--outer" aria-hidden />
      <span className="app-spinner__ring app-spinner__ring--inner" aria-hidden />
      <span className="app-spinner__dot" aria-hidden />
    </span>
  );
}
