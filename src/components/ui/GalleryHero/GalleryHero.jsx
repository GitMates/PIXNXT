import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function GalleryHero({ title, date, coverImage, onEnter }) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const textY = useTransform(scrollY, [0, 500], [0, 100]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background Image with Parallax */}
      <motion.div 
        style={{ scale, opacity }}
        className="absolute inset-0"
      >
        <img 
          src={coverImage} 
          alt={title} 
          className="h-full w-full object-cover opacity-60"
        />
      </motion.div>

      {/* Overlay Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <motion.div
           style={{ y: textY }}
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <span className="mb-4 block text-sm font-medium tracking-[0.4em] uppercase opacity-70">
            {date}
          </span>
          <h1 className="mb-12 text-5xl md:text-7xl font-bold tracking-tight uppercase">
            {title}
          </h1>
          <button
            onClick={onEnter}
            className="group relative px-10 py-4 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:tracking-[0.3em] overflow-hidden rounded-sm"
          >
            <span className="relative z-10">View Gallery</span>
            <div className="absolute inset-0 border border-white/40 group-hover:bg-white group-hover:text-black transition-all" />
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 flex flex-col items-center gap-2 opacity-50"
        >
          <span className="text-[12px] tracking-[0.2em] uppercase">Scroll</span>
          <ChevronDown size={20} strokeWidth={1} />
        </motion.div>
      </div>
    </div>
  );
}
