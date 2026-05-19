import React, { memo, useMemo, useState } from 'react';
import { SmoothMediaImage } from '@/components/ui/SmoothMediaImage';
import {
  getPhotoDisplayFallbacks,
  getPhotoGridDisplayUrl,
  getPhotoVideoPoster,
  getPhotoVideoSrc,
  isVideoMedia,
} from '@/lib/photoDisplayUrl';

const containWrapStyle = {
  width: '100%',
  height: '100%',
  display: 'block',
};

/** Square manage grid — shimmer + fade-in via SmoothMediaImage (no blur thumb). */
function ContainGridMedia({ photo, index, isVideo }) {
  const gridSrc = useMemo(
    () => getPhotoGridDisplayUrl(photo, true),
    [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.media_type, photo.filename]
  );

  const fallbacks = useMemo(() => {
    return getPhotoDisplayFallbacks(photo, true).filter((url) => url !== gridSrc);
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.media_type, photo.filename, gridSrc]);

  if (isVideo) {
    return <ContainGridVideo photo={photo} />;
  }

  return (
    <SmoothMediaImage
      src={gridSrc}
      fallbacks={fallbacks}
      alt=""
      className="cd-photo-img cd-photo-grid-contain-media"
      objectFit="contain"
      loading={index < 24 ? 'eager' : 'lazy'}
      deferUntilVisible={index >= 24}
      style={containWrapStyle}
    />
  );
}

function ContainGridVideo({ photo }) {
  const [ready, setReady] = useState(false);
  const poster = getPhotoVideoPoster(photo);

  return (
    <span className="smooth-media-wrap" style={containWrapStyle}>
      {!ready && <span className="smooth-media-shimmer" aria-hidden />}
      {poster && !ready && (
        <img
          src={poster}
          alt=""
          aria-hidden
          className="smooth-media-blur"
          style={{ objectFit: 'contain' }}
        />
      )}
      <video
        src={getPhotoVideoSrc(photo)}
        poster={poster}
        className={`cd-photo-img cd-photo-video-thumb cd-photo-grid-contain-media smooth-media-img${ready ? ' smooth-media-img--visible' : ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#fff',
        }}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setReady(true)}
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => {
          e.currentTarget.pause();
          e.currentTarget.currentTime = 0;
        }}
      />
    </span>
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
