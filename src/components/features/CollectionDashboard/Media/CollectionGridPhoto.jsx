import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { SmoothMediaImage } from '@/components/ui/SmoothMediaImage';
import {
  getPhotoDisplayFallbacks,
  getPhotoFullDisplayUrl,
  getPhotoGridDisplayUrl,
  getPhotoVideoPoster,
  getPhotoVideoSrc,
  isVideoMedia,
} from '@/lib/photoDisplayUrl';

/** Square manage grid cell — fit entire image without cropping. */
const containCellStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center',
  display: 'block',
  backgroundColor: '#ffffff',
};

/**
 * Plain img/video for the manage grid — avoids SmoothMediaImage blur (cover) layer.
 */
function ContainGridMedia({ photo, index, isVideo }) {
  const candidates = useMemo(() => {
    const list = getPhotoDisplayFallbacks(photo, true);
    const primary = getPhotoFullDisplayUrl(photo);
    if (primary && !list.includes(primary)) {
      return [primary, ...list];
    }
    return list.length > 0 ? list : primary ? [primary] : [];
  }, [photo]);

  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    setSrcIndex(0);
  }, [photo.id, candidates.join('\0')]);

  const activeSrc = candidates[srcIndex] || '';

  const onError = useCallback(() => {
    setSrcIndex((i) => (i < candidates.length - 1 ? i + 1 : i));
  }, [candidates.length]);

  if (isVideo) {
    return (
      <video
        src={getPhotoVideoSrc(photo)}
        poster={getPhotoVideoPoster(photo)}
        className="cd-photo-img cd-photo-video-thumb cd-photo-grid-contain-media"
        style={containCellStyle}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => {
          e.currentTarget.pause();
          e.currentTarget.currentTime = 0;
        }}
      />
    );
  }

  return (
    <img
      src={activeSrc}
      alt={photo.filename || `Photo ${index + 1}`}
      className="cd-photo-img cd-photo-grid-contain-media"
      style={containCellStyle}
      loading={index < 24 ? 'eager' : 'lazy'}
      decoding="async"
      onError={onError}
    />
  );
}

/**
 * Memoized grid cell media — avoids re-render churn when parent scrolls or updates.
 */
export const CollectionGridPhoto = memo(function CollectionGridPhoto({
  photo,
  index,
  /** Square dashboard grid: fit entire image/GIF in the cell without cropping. */
  containInCell = false,
}) {
  if (containInCell) {
    return <ContainGridMedia photo={photo} index={index} isVideo={isVideoMedia(photo)} />;
  }

  const gridSrc = useMemo(
    () => getPhotoGridDisplayUrl(photo, false),
    [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.media_type, photo.filename]
  );

  const fallbacks = useMemo(() => {
    return getPhotoDisplayFallbacks(photo, false).filter((url) => url !== gridSrc);
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.media_type, photo.filename, gridSrc]);

  if (isVideoMedia(photo)) {
    return (
      <video
        src={getPhotoVideoSrc(photo)}
        poster={getPhotoVideoPoster(photo)}
        className="cd-photo-img cd-photo-video-thumb"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          backgroundColor: '#fff',
        }}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => {
          e.currentTarget.pause();
          e.currentTarget.currentTime = 0;
        }}
      />
    );
  }

  return (
    <SmoothMediaImage
      src={gridSrc}
      fallbacks={fallbacks}
      alt={photo.filename || `Photo ${index + 1}`}
      className="cd-photo-img"
      objectFit="contain"
      loading={index < 24 ? 'eager' : 'lazy'}
      deferUntilVisible={index >= 24}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
});
