import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Typography } from '../../../ui/Typography';

export function GalleryHero({ title, date, coverImage, onEnter }) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.1]);
  const blur = useTransform(scrollY, [0, 600], [0, 10]);
  const textY = useTransform(scrollY, [0, 600], [0, 100]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* Background Image with Parallax & Blur transition */}
      <motion.div 
        style={{ scale, opacity, filter: `blur(${blur}px)` }}
        className="absolute inset-0"
      >
        <img 
          src={coverImage} 
          alt={title} 
          className="h-full w-full object-cover transition-opacity duration-1000"
          onLoad={(e) => e.target.style.opacity = 1}
          style={{ opacity: 0 }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>

      {/* Overlay Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <motion.div
           style={{ y: textY }}
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
        >
          <Typography 
            variant="label" 
            className="mb-6 block text-white/80"
          >
            {date}
          </Typography>
          
          <Typography 
            variant="h1" 
            className="mb-12 max-w-4xl text-5xl md:text-7xl lg:text-8xl tracking-tightest leading-[0.9] uppercase"
          >
            {title}
          </Typography>

          <button
            onClick={onEnter}
            className="group relative overflow-hidden px-12 py-5 text-[12px] font-bold tracking-[0.4em] uppercase transition-all duration-500 hover:tracking-[0.6em]"
          >
            <span className="relative z-10 mix-difference">Enter Gallery</span>
            <div className="absolute inset-0 border border-white/30 transition-all duration-500 group-hover:bg-white" />
            <div className="absolute inset-0 translate-y-full bg-white transition-transform duration-500 group-hover:translate-y-0" />
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute bottom-12 flex flex-col items-center gap-4"
        >
          <span className="text-[12px] font-bold tracking-widest uppercase opacity-40">Scroll</span>
          <ChevronDown size={18} strokeWidth={1} />
        </motion.div>
      </div>
    </div>
  );
}
