import React, { useState } from 'react';
import { getFolderPreviewSlots } from '@/lib/folderPreviewUrls';
import { toThumbDerivativeUrl } from '@/lib/photoDisplayUrl';

function FolderThumbImg({ url }) {
  const thumb = toThumbDerivativeUrl(url) || url;
  const web = url.includes('/thumb/')
    ? url.replace('/thumb/', '/web/')
    : url.includes('/original/')
      ? url.replace('/original/', '/web/')
      : url.includes('/web/')
        ? url
        : url;
  const candidates = [thumb, web, url].filter((u, i, arr) => u && arr.indexOf(u) === i);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = !failed ? candidates[index] : '';
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        if (index + 1 < candidates.length) setIndex((i) => i + 1);
        else setFailed(true);
      }}
    />
  );
}

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
          {url ? <FolderThumbImg key={url} url={url} /> : null}
        </div>
      ))}
    </div>
  );
}
