import React, { useEffect, useState } from 'react';
import { getCollectionCardCoverCandidates } from '../../../lib/photoDisplayUrl';

/**
 * Delivery list cover — tries /thumb/ first, then /web/, then the stored URL.
 * Avoids broken <img> when a rewritten thumb path is missing on R2.
 */
export function CollectionCardCover({ collection, alt = '', className, style }) {
  const candidates = getCollectionCardCoverCandidates(collection);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [collection?.id, collection?.cover_url, collection?.cover, collection?.list_cover_url]);

  const src = !failed ? candidates[index] || '' : '';
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (index + 1 < candidates.length) {
          setIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
