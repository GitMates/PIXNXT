import React, { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import './SmoothMediaImage.css';

/**
 * Fade-in image load (hides progressive top-to-bottom decode).
 * Optional thumbSrc for blur-up while full image loads.
 */
export function SmoothMediaImage({
  src,
  thumbSrc,
  alt = '',
  className,
  style,
  objectFit = 'contain',
  loading = 'lazy',
  onLoad,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const showBlur = Boolean(thumbSrc && thumbSrc !== src && !error);

  return (
    <span className="smooth-media-wrap" style={style}>
      {!loaded && !error && <span className="smooth-media-shimmer" aria-hidden />}

      {showBlur && (
        <img
          src={thumbSrc}
          alt=""
          aria-hidden
          className={cn('smooth-media-blur', loaded && 'smooth-media-blur--hide')}
          style={{ objectFit }}
          decoding="async"
        />
      )}

      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            'smooth-media-img',
            loaded && 'smooth-media-img--visible',
            error && 'smooth-media-img--error',
            className
          )}
          style={{ objectFit }}
          decoding="async"
          loading={loading}
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
          onError={() => setError(true)}
        />
      ) : null}

      {error && <span className="smooth-media-error">Could not load</span>}
    </span>
  );
}
