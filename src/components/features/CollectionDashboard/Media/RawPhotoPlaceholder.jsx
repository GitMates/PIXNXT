import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shown while a RAW file is uploading, or for files the browser cannot paint
 * (PSD whose jpg derivatives are still the original Photoshop file).
 */
export function RawPhotoPlaceholder({
  variant = 'grid',
  label = 'Loading...',
  spinning = true,
  className,
}) {
  return (
    <span
      className={cn(
        'smooth-media-wrap cd-raw-loading',
        variant === 'grid' && 'smooth-media-wrap--contain-cell',
        variant === 'lightbox' && 'cd-raw-loading--lightbox',
        className
      )}
      role="status"
      aria-label={label}
    >
      {spinning ? (
        <span className="smooth-media-spinner-container" aria-hidden="true">
          <span className="smooth-media-spinner" />
        </span>
      ) : (
        <span className="cd-raw-loading-label">{label}</span>
      )}
    </span>
  );
}
