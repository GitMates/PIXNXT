import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shown while a RAW file is uploading or its JPEG preview is not ready yet.
 */
export function RawPhotoPlaceholder({ variant = 'grid', label = 'Loading...' }) {
  return (
    <span
      className={cn(
        'smooth-media-wrap cd-raw-loading',
        variant === 'grid' && 'smooth-media-wrap--contain-cell',
        variant === 'lightbox' && 'cd-raw-loading--lightbox'
      )}
      role="status"
      aria-label={label}
    >
      <span className="smooth-media-spinner-container" aria-hidden="true">
        <span className="smooth-media-spinner" />
      </span>
    </span>
  );
}
