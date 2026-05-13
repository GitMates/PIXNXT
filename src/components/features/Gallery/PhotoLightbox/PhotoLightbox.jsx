import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Download, Heart, Play, Pause } from 'lucide-react';
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
  showDownload = true,
  showFavorite = true,
  isFavorited = false
}) {
  // Prevent scrolling when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Keyboard navigation
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
      >
        {/* Top Controls */}
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:opacity-50 transition-all"
            >
              <X size={18} strokeWidth={1} /> Close
            </button>
          </div>
          
          <div className="flex items-center gap-8">
            <button 
              onClick={onToggleSlideshow}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-50 transition-all"
            >
              {isSlideshowActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {isSlideshowActive ? 'Pause' : 'Slideshow'}
            </button>
            {showDownload && (
              <button 
                onClick={onDownload}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-50 transition-all"
              >
                <Download size={14} /> Download
              </button>
            )}
            {showFavorite && (
              <button 
                onClick={onFavorite}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                  isFavorited ? "text-red-500 hover:opacity-80" : "hover:opacity-50"
                )}
              >
                <Heart size={14} fill={isFavorited ? "currentColor" : "none"} /> 
                {isFavorited ? 'Favorited' : 'Favorite'}
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 md:px-20">
          {/* Previous Button */}
          {!isSlideshowActive && (
            <button 
              onClick={onPrev}
              className="absolute left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-all md:h-16 md:w-16"
              style={{ borderColor: 'var(--gallery-border)', backgroundColor: 'rgba(var(--gallery-text-rgb, 0,0,0), 0.02)' }}
            >
              <ChevronLeft size={24} strokeWidth={1} />
            </button>
          )}

          {/* Image Container */}
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="relative h-full w-full max-w-6xl py-4"
          >
            <div className="flex h-full w-full items-center justify-center">
              {images[currentIndex] ? (
                <img 
                  src={images[currentIndex]} 
                  alt="Fullscreen photo"
                  className="max-h-full max-w-full object-contain shadow-2xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-20">
                  <div className="h-12 w-12 rounded-full border border-current border-t-transparent animate-spin" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Loading Photo...</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Next Button */}
          {!isSlideshowActive && (
            <button 
              onClick={onNext}
              className="absolute right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-all md:h-16 md:w-16"
              style={{ borderColor: 'var(--gallery-border)', backgroundColor: 'rgba(var(--gallery-text-rgb, 0,0,0), 0.02)' }}
            >
              <ChevronRight size={24} strokeWidth={1} />
            </button>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex h-20 items-center justify-center px-6">
           <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
             {currentIndex + 1} / {images.length}
           </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
