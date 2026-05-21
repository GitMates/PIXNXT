import React from 'react';
import { cn } from '../../../../lib/utils';
import './GalleryEmptyGrid.css';

/**
 * Empty set state — open whitespace below the set heading (no placeholder tiles).
 */
export function GalleryEmptyGrid({ isPreview = false, isPreviewMobile = false, className }) {
  return (
    <div
      className={cn(
        'gallery-empty-space',
        isPreview && 'gallery-empty-space--preview',
        isPreviewMobile && 'gallery-empty-space--preview-mobile',
        className
      )}
      aria-hidden
    />
  );
}
