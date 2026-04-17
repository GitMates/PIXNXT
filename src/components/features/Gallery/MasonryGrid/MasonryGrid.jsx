import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';

export function MasonryGrid({ images, onImageClick }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="columns-1 gap-1 sm:columns-2 md:columns-3 lg:gap-2 xl:gap-4"
    >
      {images.map((src, index) => (
        <motion.div
           key={`${src}-${index}`}
           variants={item}
           className="mb-1 lg:mb-2 xl:mb-4 break-inside-avoid"
        >
          <div 
            className="group relative cursor-pointer overflow-hidden bg-zinc-100"
            onClick={() => onImageClick(index)}
          >
            <img 
              src={src} 
              alt={`Gallery image ${index + 1}`}
              className="w-full transition-transform duration-1000 group-hover:scale-105"
              loading="lazy"
            />
            {/* Minimal hover overlay */}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
