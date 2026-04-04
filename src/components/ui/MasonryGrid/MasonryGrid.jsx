import React, { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

/**
 * A premium Masonry Grid component that distributes images into columns
 * while maintaining their original aspect ratios.
 */
export function MasonryGrid({ images, columns = { default: 4, sm: 1, md: 2, lg: 3, xl: 4 }, gap = 16, onImageClick, className }) {
  // Simple heuristic: distribute images into columns
  const columnData = useMemo(() => {
    // This is a simplified distribution. In a real justified grid, we'd use aspect ratios.
    // For a vertical masonry grid, we can just split the array into N sub-arrays.
    const cols = columns.xl || columns.default || 4;
    const result = Array.from({ length: cols }, () => []);
    
    images.forEach((img, idx) => {
      result[idx % cols].push({ url: img, originalIndex: idx });
    });
    
    return result;
  }, [images, columns]);

  return (
    <div 
      className={cn("flex w-full", className)}
      style={{ gap: `${gap}px` }}
    >
      {columnData.map((column, colIdx) => (
        <div 
          key={colIdx} 
          className="flex flex-col flex-1"
          style={{ gap: `${gap}px` }}
        >
          {column.map((item, imgIdx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6, 
                delay: (colIdx * 0.1) + (imgIdx * 0.05),
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
              key={item.url}
              className="group relative cursor-zoom-in overflow-hidden rounded-sm transition-all duration-500 hover:shadow-2xl"
              onClick={() => onImageClick?.(item.originalIndex)}
            >
              <img 
                src={item.url} 
                alt={`Gallery photo ${item.originalIndex + 1}`}
                className="w-full transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}
