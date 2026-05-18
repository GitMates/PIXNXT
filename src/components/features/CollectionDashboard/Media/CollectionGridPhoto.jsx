import React, { memo, useMemo } from 'react';
import { SmoothMediaImage } from '@/components/ui/SmoothMediaImage';
import {
  getPhotoDisplayFallbacks,
  getPhotoGridDisplayUrl,
  getPhotoVideoPoster,
  getPhotoVideoSrc,
  isVideoMedia,
} from '@/lib/photoDisplayUrl';

/**
 * Memoized grid cell media — avoids re-render churn when parent scrolls or updates.
 */
export const CollectionGridPhoto = memo(function CollectionGridPhoto({
  photo,
  index,
}) {
  const gridSrc = useMemo(
    () => getPhotoGridDisplayUrl(photo),
    [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.media_type, photo.filename]
  );

  const fallbacks = useMemo(() => {
    return getPhotoDisplayFallbacks(photo).filter((url) => url !== gridSrc);
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
