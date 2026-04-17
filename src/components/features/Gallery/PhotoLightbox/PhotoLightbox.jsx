import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Download, Heart } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export function PhotoLightbox({ isOpen, onClose, images, currentIndex, onNext, onPrev }) {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-white"
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
            <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-50 transition-all">
              <Download size={14} /> Download
            </button>
            <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-50 transition-all">
              <Heart size={14} /> Favorite
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 md:px-20">
          {/* Previous Button */}
          <button 
            onClick={onPrev}
            className="absolute left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/5 hover:bg-black/5 transition-all md:h-16 md:w-16"
          >
            <ChevronLeft size={24} strokeWidth={1} />
          </button>

          {/* Image Container */}
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="relative h-full w-full max-w-6xl py-4"
          >
            <div className="flex h-full w-full items-center justify-center">
              <img 
                src={images[currentIndex]} 
                alt="Fullscreen photo"
                className="max-h-full max-w-full object-contain shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Next Button */}
          <button 
            onClick={onNext}
            className="absolute right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/5 hover:bg-black/5 transition-all md:h-16 md:w-16"
          >
            <ChevronRight size={24} strokeWidth={1} />
          </button>
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
