import React, { useEffect, useRef } from 'react';

/** Time between slides when slideshow autoplay is active. */
export const GALLERY_SLIDESHOW_INTERVAL_MS = 4000;
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Download, Heart, Play, Pause, Share2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { isGalleryVideo } from '../../../../lib/galleryMediaType';

export function PhotoLightbox({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNext,
  onPrev,
  isSlideshowActive,
  onToggleSlideshow,
  onFavorite,
  onDownload,
  onShare,
  showDownload = true,
  showFavorite = true,
  showShare = true,
  isFavorited = false,
  /** Applied on the portal root so theme CSS variables match the gallery page */
  themeClassName = 'theme-light font-sans',
  /** Full label for bottom-left badge, e.g. "retouching (2/3)". When set, overrides favoriteCount + "My Favorites". */
  favoriteOverlayLabel,
  /** When set (and no favoriteOverlayLabel), shows Pixieset-style "My Favorites (n)" on the bottom-left of the image stage. */
  favoriteCount,
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        const url = images[currentIndex];
        const onVideo = url && isGalleryVideo({ full_url: url, web_url: url });
        if (onVideo) return;
        e.preventDefault();
        onToggleSlideshow?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images, onNext, onPrev, onClose, onToggleSlideshow]);

  const canShare = showShare && typeof onShare === 'function';
  const showBottomLabel = showFavorite && (favoriteOverlayLabel || typeof favoriteCount === 'number');

  const currentMediaUrl = images[currentIndex];
  const isCurrentVideo = currentMediaUrl
    ? isGalleryVideo({ full_url: currentMediaUrl, web_url: currentMediaUrl })
    : false;

  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    if (!isOpen || !isSlideshowActive || isCurrentVideo) return;
    const id = setInterval(() => {
      onNextRef.current?.();
    }, GALLERY_SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isOpen, isSlideshowActive, isCurrentVideo]);

  const handleBottomHeart = () => {
    onFavorite?.();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
      <Motion.div
        key="photo-lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'photo-lightbox-root fixed inset-0 z-[9999] flex flex-col',
          themeClassName
        )}
        style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
      >
        <div className="relative z-[50] flex h-16 shrink-0 items-center justify-between px-4 md:h-20 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
          >
            <X size={18} strokeWidth={1} /> Close
          </button>

          {!isCurrentVideo ? (
            <button
              type="button"
              onClick={onToggleSlideshow}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
            >
              {isSlideshowActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {isSlideshowActive ? 'Pause' : 'Play'}
            </button>
          ) : (
            <span className="w-[72px]" aria-hidden />
          )}
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pb-3 md:px-12 md:pb-6">
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 z-[40] flex h-11 w-11 items-center justify-center rounded-full border transition-all md:left-6 md:h-14 md:w-14"
              style={{
                borderColor: 'var(--gallery-border)',
                backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 35%)',
              }}
            >
              <ChevronLeft size={22} strokeWidth={1} />
            </button>

          <Motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
            className="relative flex h-full max-h-full w-full max-w-6xl items-center justify-center"
          >
            <div className="group/media relative inline-flex max-h-[calc(100dvh-8rem)] max-w-full items-center justify-center">
              {currentMediaUrl ? (
                isCurrentVideo ? (
                  <video
                    key={currentMediaUrl}
                    src={currentMediaUrl}
                    className="photo-lightbox-video block max-h-[calc(100dvh-8rem)] w-full max-w-full object-contain shadow-2xl"
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                  />
                ) : (
                  <img
                    src={currentMediaUrl}
                    alt="Fullscreen photo"
                    className="block max-h-[calc(100dvh-8rem)] max-w-full object-contain shadow-2xl"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-20">
                  <div className="h-12 w-12 animate-spin rounded-full border border-current border-t-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading photo…</span>
                </div>
              )}

              {currentMediaUrl && !isCurrentVideo && (
                <>
              <div
                className="pointer-events-none absolute inset-0 z-[20] opacity-0 transition-opacity duration-200 group-hover/media:opacity-100"
                aria-hidden
              >
                <div className="absolute inset-x-0 bottom-0 h-[38%] max-h-[220px] bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
              </div>

              <div
                className={cn(
                  'pointer-events-none absolute inset-0 z-[30] flex items-end gap-4 p-3 opacity-0 transition-opacity duration-200 md:p-5',
                  'group-hover/media:opacity-100 group-hover/media:pointer-events-auto',
                  showBottomLabel ? 'justify-between' : 'justify-end'
                )}
              >
                {showBottomLabel && (
                  <div className="rounded-md bg-white/95 px-3 py-2 text-[13px] font-medium text-neutral-900 shadow-md ring-1 ring-black/5">
                    {favoriteOverlayLabel ||
                      `My Favorites (${favoriteCount})`}
                  </div>
                )}

                <div className="flex shrink-0 items-center gap-5 md:gap-7">
                  {showFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBottomHeart();
                      }}
                      className="pointer-events-auto text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)] transition-opacity hover:opacity-80"
                      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={24} strokeWidth={1.75} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  {showDownload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.();
                      }}
                      className="pointer-events-auto text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)] transition-opacity hover:opacity-80"
                      aria-label="Download"
                    >
                      <Download size={24} strokeWidth={1.75} />
                    </button>
                  )}
                  {canShare && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare();
                      }}
                      className="pointer-events-auto text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)] transition-opacity hover:opacity-80"
                      aria-label="Share"
                    >
                      <Share2 size={24} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
                </>
              )}
            </div>
          </Motion.div>

            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 z-[40] flex h-11 w-11 items-center justify-center rounded-full border transition-all md:right-6 md:h-14 md:w-14"
              style={{
                borderColor: 'var(--gallery-border)',
                backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 35%)',
              }}
              aria-label="Next photo"
            >
              <ChevronRight size={22} strokeWidth={1} />
            </button>
        </div>

        <div className="relative z-[50] flex h-14 shrink-0 items-center justify-center px-6 md:h-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </Motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
