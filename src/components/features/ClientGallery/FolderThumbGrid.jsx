import React from 'react';
import { getFolderPreviewSlots } from '@/lib/folderPreviewUrls';

/**
 * 2×2 mosaic of collection covers inside a folder card.
 */
export function FolderThumbGrid({ folder, size = 'md' }) {
  const slots = getFolderPreviewSlots(folder);

  return (
    <div
      className={`cg-folder-thumb-grid${size === 'sm' ? ' cg-folder-thumb-grid--sm' : ''}`}
      aria-hidden
    >
      {slots.map((url, index) => (
        <div
          key={index}
          className={`cg-folder-thumb-cell${url ? ' cg-folder-thumb-cell--cover' : ''}`}
        >
          {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : null}
        </div>
      ))}
    </div>
  );
}
