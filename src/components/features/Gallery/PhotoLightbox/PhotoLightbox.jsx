import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Download, Heart, Play, Pause, Share2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';

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
  /** Full label for bottom-left badge, e.g. "retouching (2/3)". When set, overrides favoriteCount + "My Favorites". */
  favoriteOverlayLabel,
  /** When set (and no favoriteOverlayLabel), shows Pixieset-style "My Favorites (n)" on the bottom-left of the image stage. */
  favoriteCount,
}) {
  /** Slides where Download/Share were revealed via the bottom heart (Pixieset-style). */
  const [bottomSecondaryUnlocked, setBottomSecondaryUnlocked] = useState({});

  useEffect(() => {
    if (isFavorited) return;
    const idx = currentIndex;
    queueMicrotask(() => {
      setBottomSecondaryUnlocked((prev) => {
        if (prev[idx] == null) return prev;
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    });
  }, [isFavorited, currentIndex]);

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
        e.preventDefault();
        onToggleSlideshow?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose, onToggleSlideshow]);

  if (!isOpen) return null;

  const canShare = showShare && typeof onShare === 'function';
  const showBottomLabel = showFavorite && (favoriteOverlayLabel || typeof favoriteCount === 'number');

  const secondaryActionsVisible =
    isFavorited && !!bottomSecondaryUnlocked[currentIndex];

  /** Bottom heart: first click when already favorited (e.g. from grid) only unlocks Download/Share; otherwise toggles favorite. */
  const handleBottomHeart = () => {
    const i = currentIndex;
    if (isFavorited) {
      if (!bottomSecondaryUnlocked[i]) {
        setBottomSecondaryUnlocked((prev) => ({ ...prev, [i]: true }));
        return;
      }
      onFavorite?.();
      setBottomSecondaryUnlocked((prev) => {
        const next = { ...prev };
        delete next[i];
        return next;
      });
      return;
    }
    onFavorite?.();
    setBottomSecondaryUnlocked((prev) => ({ ...prev, [i]: true }));
  };

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
      >
        <div className="relative z-[50] flex h-16 shrink-0 items-center justify-between px-4 md:h-20 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
          >
            <X size={18} strokeWidth={1} /> Close
          </button>

          <button
            type="button"
            onClick={onToggleSlideshow}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
          >
            {isSlideshowActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {isSlideshowActive ? 'Pause' : 'Slideshow'}
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pb-3 md:px-12 md:pb-6">
          {!isSlideshowActive && (
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
          )}

          <Motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
            className="group/img relative flex h-full max-h-full w-full max-w-6xl items-center justify-center"
          >
            <div className="relative flex max-h-full max-w-full items-center justify-center">
              {images[currentIndex] ? (
                <img
                  src={images[currentIndex]}
                  alt="Fullscreen photo"
                  className="max-h-[calc(100dvh-8rem)] max-w-full object-contain shadow-2xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-20">
                  <div className="h-12 w-12 animate-spin rounded-full border border-current border-t-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading photo…</span>
                </div>
              )}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[20] h-[38%] max-h-[220px] bg-gradient-to-t from-black/65 via-black/20 to-transparent"
                aria-hidden
              />

              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 z-[30] flex w-full items-end gap-4 p-3 md:p-5',
                  showBottomLabel ? 'justify-between' : 'justify-end'
                )}
              >
                {showBottomLabel && (
                  <div className="rounded-md bg-white/95 px-3 py-2 text-[13px] font-medium text-neutral-900 shadow-md ring-1 ring-black/5">
                    {favoriteOverlayLabel ||
                      `My Favorites (${favoriteCount})`}
                  </div>
                )}

                <div className="flex items-center gap-5 md:gap-7">
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
                  {secondaryActionsVisible && showDownload && (
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
                  {secondaryActionsVisible && canShare && (
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
            </div>
          </Motion.div>

          {!isSlideshowActive && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 z-[40] flex h-11 w-11 items-center justify-center rounded-full border transition-all md:right-6 md:h-14 md:w-14"
              style={{
                borderColor: 'var(--gallery-border)',
                backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 35%)',
              }}
            >
              <ChevronRight size={22} strokeWidth={1} />
            </button>
          )}
        </div>

        <div className="relative z-[50] flex h-14 shrink-0 items-center justify-center px-6 md:h-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </Motion.div>
    </AnimatePresence>
  );
}
