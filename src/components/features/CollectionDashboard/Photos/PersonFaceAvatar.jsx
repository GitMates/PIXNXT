import React from 'react';

/**
 * Circular face avatar cropped from a photo using Rekognition bounding box (0–1 normalized).
 */
export function PersonFaceAvatar({ imageUrl, boundingBox, size = 72, className = '', variant = 'default' }) {
  const variantClass = variant === 'strip' ? ' cd-person-face-avatar--strip' : '';

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
        className={`cd-person-face-avatar${variantClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={imageUrl} alt="" />
      </span>
    );
  }

  const cx = (boundingBox.Left + boundingBox.Width / 2) * 100;
  const cy = (boundingBox.Top + boundingBox.Height / 2) * 100;
  const faceSize = Math.max(boundingBox.Width, boundingBox.Height, 0.08);
  const bgSize = `${Math.min(600, (100 / faceSize) * 0.85)}%`;

  return (
    <span
      className={`cd-person-face-avatar cd-person-face-avatar--crop${variantClass} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: bgSize,
        backgroundPosition: `${cx}% ${cy}%`,
        backgroundRepeat: 'no-repeat',
      }}
      role="img"
      aria-hidden
    />
  );
}
