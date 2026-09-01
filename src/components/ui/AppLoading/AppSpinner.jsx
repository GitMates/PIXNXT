import React from 'react';
import { PixnxtMarkIcon } from './PixnxtMarkIcon';

const SIZES = new Set(['xs', 'sm', 'md', 'lg']);

export function AppSpinner({ size = 'md', className = '', label }) {
  const resolvedSize = SIZES.has(size) ? size : 'md';
  return (
    <span
      className={`app-spinner app-spinner--${resolvedSize}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="app-spinner__ring app-spinner__ring--outer" aria-hidden />
      <span className="app-spinner__ring app-spinner__ring--inner" aria-hidden />
      <PixnxtMarkIcon className="app-spinner__mark" />
    </span>
  );
}
