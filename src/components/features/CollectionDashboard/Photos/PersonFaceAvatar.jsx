import React from 'react';
import { buildFaceAvatarStyle } from '../../../../lib/faceAvatar';

/**
 * Circular face avatar cropped from a photo using Rekognition bounding box (0–1 normalized).
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

  if (!imageUrl) {
    return (
      <span
        className={`cd-person-face-avatar cd-person-face-avatar--empty${variantClass} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  if (!boundingBox?.Width || !boundingBox?.Height) {
    return (
      <span
        className={`cd-person-face-avatar${selfieClass}${variantClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={imageUrl} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }

  return (
    <span
      className={`cd-person-face-avatar cd-person-face-avatar--crop${variantClass} ${className}`}
      style={buildFaceAvatarStyle(imageUrl, boundingBox, size)}
      role="img"
      aria-hidden
    />
  );
}
