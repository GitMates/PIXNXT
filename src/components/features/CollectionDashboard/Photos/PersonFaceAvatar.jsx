import React, { useEffect, useMemo, useState } from 'react';
import { buildFaceAvatarCrop } from '../../../../lib/faceAvatar';
import { toThumbDerivativeUrl } from '../../../../lib/photoDisplayUrl';

/**
 * Circular face avatar cropped from a photo using Rekognition bounding box (0–1).
 * Uses an <img> crop (not CSS background) so the browser downscales the same
 * sharpened web JPEG the delivery cards use.
 */
export function PersonFaceAvatar({
  imageUrl,
  boundingBox,
  size = 72,
  className = '',
  variant = 'default',
  avatarSource = '',
}) {
  const variantClass = variant === 'strip' ? ' cd-person-face-avatar--strip' : '';
  const selfieClass = avatarSource === 'guest_selfie' || (!boundingBox?.Width && imageUrl)
    ? ' cd-person-face-avatar--selfie'
    : '';
  const [src, setSrc] = useState(imageUrl || '');
  useEffect(() => {
    setSrc(imageUrl || '');
  }, [imageUrl]);
  const crop = useMemo(
    () => buildFaceAvatarCrop(src, boundingBox, size),
    [src, boundingBox, size]
  );

  if (!imageUrl) {
    return (
      <span
        className={`cd-person-face-avatar cd-person-face-avatar--empty${variantClass} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const handleError = () => {
    const thumb = toThumbDerivativeUrl(imageUrl);
    if (thumb && thumb !== src) setSrc(thumb);
  };

  if (!boundingBox?.Width || !boundingBox?.Height) {
    return (
      <span
        className={`cd-person-face-avatar${selfieClass}${variantClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={handleError} />
      </span>
    );
  }

  return (
    <span
      className={`cd-person-face-avatar cd-person-face-avatar--crop${variantClass} ${className}`}
      style={crop.wrap}
      role="img"
      aria-hidden
    >
      <img
        className="cd-person-face-avatar__crop-img"
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        style={crop.img || undefined}
        onError={handleError}
      />
    </span>
  );
}
