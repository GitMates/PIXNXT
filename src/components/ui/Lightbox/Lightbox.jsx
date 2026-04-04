import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Heart, Share2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function Lightbox({ isOpen, onClose, images, currentIndex, onNext, onPrev }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') onNext();
        if (e.key === 'ArrowLeft') onPrev();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-white"
        onClick={onClose}
      >
        {/* Header Bar */}
        <div 
          className="flex h-16 items-center justify-between px-6 bg-white/80 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium tracking-widest text-gray-400 uppercase">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="text-gray-600 hover:text-black transition-colors" title="Favorite">
              <Heart size={20} strokeWidth={1.5} />
            </button>
            <button className="text-gray-600 hover:text-black transition-colors" title="Download">
              <Download size={20} strokeWidth={1.5} />
            </button>
            <button className="text-gray-600 hover:text-black transition-colors" title="Share">
              <Share2 size={20} strokeWidth={1.5} />
            </button>
            <div className="w-[1px] h-6 bg-gray-200 mx-2" />
            <button 
              onClick={onClose}
              className="text-gray-900 hover:rotate-90 transition-transform duration-300"
              title="Close"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="max-h-full max-w-full select-none object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-gray-400 hover:text-black transition-colors disabled:opacity-30"
            disabled={images.length <= 1}
          >
            <ChevronLeft size={48} strokeWidth={1} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-gray-400 hover:text-black transition-colors disabled:opacity-30"
            disabled={images.length <= 1}
          >
            <ChevronRight size={48} strokeWidth={1} />
          </button>
        </div>

        {/* Footer Info */}
        <div 
          className="h-16 flex items-center justify-center px-6 bg-white/50"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs tracking-widest text-gray-400 uppercase font-light">
            Press ESC to exit
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
