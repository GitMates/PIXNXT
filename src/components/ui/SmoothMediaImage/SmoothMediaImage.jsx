import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { isMediaUrlCached, markMediaUrlCached } from '../../../lib/imageLoadCache';
import './SmoothMediaImage.css';

/**
 * Fade-in image load. Remembers loaded URLs so scroll/re-renders do not flash placeholders again.
 */
export function SmoothMediaImage({
  src,
  thumbSrc,
  fallbacks = [],
  alt = '',
  className,
  wrapClassName,
  style,
  objectFit = 'contain',
  loading = 'lazy',
  deferUntilVisible = false,
  onLoad,
}) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [inView, setInView] = useState(!deferUntilVisible);
  const [srcIndex, setSrcIndex] = useState(0);

  const fallbackKey = fallbacks.join('\0');

  const candidates = useMemo(() => {
    const list = [];
    const push = (url) => {
      if (url && !list.includes(url)) list.push(url);
    };
    if (thumbSrc && thumbSrc !== src) push(thumbSrc);
    push(src);
    fallbacks.forEach(push);
    return list;
  }, [src, thumbSrc, fallbackKey]);

  const activeSrc = candidates[srcIndex] || '';
  const shouldLoad = !deferUntilVisible || inView;
  const cached = isMediaUrlCached(activeSrc);

  const [loaded, setLoaded] = useState(() => cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSrcIndex(0);
    setError(false);
    setLoaded(isMediaUrlCached(src));
  }, [src, thumbSrc, fallbackKey]);

  useEffect(() => {
    if (!deferUntilVisible) return undefined;
    const node = wrapRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: '400px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [deferUntilVisible, activeSrc]);

  useLayoutEffect(() => {
    if (!shouldLoad) return;
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
      setError(false);
      markMediaUrlCached(activeSrc);
    }
  }, [activeSrc, shouldLoad]);

  const handleLoad = () => {
    markMediaUrlCached(activeSrc);
    setLoaded(true);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    if (srcIndex < candidates.length - 1) {
      const nextIndex = srcIndex + 1;
      setSrcIndex(nextIndex);
      setLoaded(isMediaUrlCached(candidates[nextIndex]));
      setError(false);
      return;
    }
    setError(true);
    setLoaded(false);
  };

  const blurSrc =
    thumbSrc && thumbSrc !== activeSrc && !error && shouldLoad ? thumbSrc : null;

  const showShimmer = shouldLoad && !loaded && !cached;

  if (!activeSrc) {
    return (
      <span className={cn('smooth-media-wrap', wrapClassName)} style={style} ref={wrapRef}>
        <span className="smooth-media-shimmer" aria-hidden />
        <span className="smooth-media-error">Loading...</span>
      </span>
    );
  }

  return (
    <span className={cn('smooth-media-wrap', wrapClassName)} style={style} ref={wrapRef}>
      {showShimmer && <span className="smooth-media-shimmer" aria-hidden />}

      {!shouldLoad && <span className="smooth-media-placeholder" aria-hidden />}

      {shouldLoad && blurSrc && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className={cn('smooth-media-blur', loaded && 'smooth-media-blur--hide')}
          style={{ objectFit }}
          decoding="async"
          loading="lazy"
        />
      )}

      {shouldLoad && (
        <img
          ref={imgRef}
          key={activeSrc}
          src={activeSrc}
          alt={alt}
          className={cn(
            'smooth-media-img',
            (loaded || cached) && 'smooth-media-img--visible',
            error && 'smooth-media-img--error',
            className
          )}
          style={{ objectFit, imageOrientation: 'from-image' }}
          decoding="async"
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {error && (
        <>
          <span className="smooth-media-shimmer" aria-hidden />
          <span className="smooth-media-error">Loading...</span>
        </>
      )}
    </span>
  );
}
