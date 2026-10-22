import React, { useMemo } from 'react';
import { SmoothMediaImage } from '../../ui/SmoothMediaImage';
import {
  getCollectionCardCoverCandidates,
  readCachedCollectionCover,
  rememberCollectionCover,
} from '../../../lib/photoDisplayUrl';
import { getCoverFocalForSurface } from '../../../lib/focalPoint';

/**
 * Delivery list cover — prefers /cover/thumb/ or photoset /thumb/, then stored, then /web/.
 * Deferred load + session cache so the deliveries grid stays light.
 */
export function CollectionCardCover({ collection, alt = '', className, style, deferUntilVisible = true }) {
  const cardFocal = useMemo(() => getCoverFocalForSurface(collection, 'card'), [collection]);

  const candidates = useMemo(() => {
    const list = getCollectionCardCoverCandidates(collection);
    const cached = collection?.id ? readCachedCollectionCover(collection.id) : '';
    if (cached && !list.includes(cached)) list.push(cached);
    return list;
  }, [collection?.id, collection?.cover_url, collection?.cover, collection?.list_cover_url]);

  const src = candidates[0] || '';
  const fallbacks = candidates.slice(1);
  if (!src) return null;

  return (
    <SmoothMediaImage
      src={src}
      fallbacks={fallbacks}
      alt={alt}
      className={className}
      wrapClassName={className}
      objectFit="cover"
      objectPosition={`${cardFocal.x}% ${cardFocal.y}%`}
      loading="lazy"
      deferUntilVisible={deferUntilVisible}
      style={style}
      onLoad={(loadedSrc) => {
        if (collection?.id && loadedSrc) rememberCollectionCover(collection.id, loadedSrc);
      }}
    />
  );
}
