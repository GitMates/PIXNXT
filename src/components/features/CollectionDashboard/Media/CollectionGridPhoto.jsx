import React, { memo, useMemo } from 'react';
import { SmoothMediaImage } from '@/components/ui/SmoothMediaImage';
import {
  getPhotoDisplayFallbacks,
  getPhotoGridDisplayUrl,
  getPhotoVideoPoster,
  getPhotoVideoSrc,
  isRawMedia,
  isVideoMedia,
} from '@/lib/photoDisplayUrl';
import { isBrowserDisplayableImageUrl } from '@/lib/rawImagePreview';
import { RawPhotoPlaceholder } from './RawPhotoPlaceholder';

const containWrapStyle = {
  width: '100%',
  height: '100%',
};

/** Square manage grid — fit entire image in the cell (contain / letterbox). */
function ContainGridMedia({ photo, index, isVideo }) {
  const gridSrc = useMemo(() => {
    const url = getPhotoGridDisplayUrl(photo, true);
    return url && isBrowserDisplayableImageUrl(url) ? url : '';
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.watermarked_url, photo.media_type, photo.filename]);

  const fallbacks = useMemo(() => {
    return getPhotoDisplayFallbacks(photo, true).filter((url) => url !== gridSrc);
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.watermarked_url, photo.media_type, photo.filename, gridSrc]);

  if (isVideo) {
    return <ContainGridVideo photo={photo} />;
  }

  if (!gridSrc && (isRawMedia(photo) || photo._uploadPending)) {
    return <RawPhotoPlaceholder variant="grid" />;
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

function paintVideoCover(video) {
  if (!video) return;
  const duration = video.duration;
  const target = Number.isFinite(duration) && duration > 0 ? Math.min(0.4, duration / 2) : 0.1;
  if (Math.abs((video.currentTime || 0) - target) > 0.05) {
    try {
      video.currentTime = target;
    } catch {
      /* metadata not ready to seek yet */
    }
  }
}

/** Still frame from the file when no JPEG cover was saved. */
function VideoCover({ photo, alt = '' }) {
  const poster = getPhotoVideoPoster(photo);
  const src = getPhotoVideoSrc(photo);
  if (poster) {
    return (
      <img
        src={poster}
        alt={alt}
        className="cd-photo-img cd-photo-video-thumb cd-photo-grid-contain-media smooth-media-img smooth-media-img--visible"
        style={{ objectFit: 'contain', imageOrientation: 'from-image' }}
      />
    );
  }
  if (!src) {
    return <span className="cd-video-fallback">Film</span>;
  }
  return (
    <video
      src={src}
      className="cd-photo-img cd-photo-video-thumb cd-photo-grid-contain-media cd-video-cover"
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => paintVideoCover(e.currentTarget)}
      onLoadedData={(e) => paintVideoCover(e.currentTarget)}
    />
  );
}

function ContainGridVideo({ photo }) {
  return (
    <span className="smooth-media-wrap" style={containWrapStyle}>
      <VideoCover photo={photo} />
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

  const gridSrc = useMemo(() => {
    const url = getPhotoGridDisplayUrl(photo, true);
    return url && isBrowserDisplayableImageUrl(url) ? url : '';
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.watermarked_url, photo.media_type, photo.filename]);

  const fallbacks = useMemo(() => {
    return getPhotoDisplayFallbacks(photo, true).filter((url) => url !== gridSrc);
  }, [photo.id, photo.thumbnail_url, photo.web_url, photo.full_url, photo.watermarked_url, photo.media_type, photo.filename, gridSrc]);

  if (!gridSrc && (isRawMedia(photo) || photo._uploadPending)) {
    return <RawPhotoPlaceholder variant="grid" />;
  }

  if (isVideoMedia(photo)) {
    return <VideoCover photo={photo} alt={photo.filename || 'Video'} />;
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
