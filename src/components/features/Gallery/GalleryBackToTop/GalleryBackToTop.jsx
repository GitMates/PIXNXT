import React from 'react';
import { cn } from '../../../../lib/utils';
import './GalleryBackToTop.css';

export function GalleryBackToTop({ onClick, isPreview = false, className }) {
  return (
    <div
      className={cn(
        'gallery-back-to-top-wrap',
        isPreview && 'gallery-back-to-top-wrap--preview',
        className
      )}
    >
      <button
        type="button"
        className="gallery-back-to-top gallery-body-text"
        onClick={onClick}
      >
        Back to top
      </button>
    </div>
  );
}
