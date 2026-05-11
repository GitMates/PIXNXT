import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Heart } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export function MasonryGrid({ photos, gridSettings, onImageClick, onFavorite, onDownload, customRowHeight, customColumnCount, isHorizontal: isHorizontalProp }) {
  const [dynamicAspectRatios, setDynamicAspectRatios] = useState({});

  useEffect(() => {
    photos.forEach(photo => {
      if (!photo.width || !photo.height) {
        const img = new Image();
        img.onload = () => {
          setDynamicAspectRatios(prev => ({ ...prev, [photo.id]: img.width / img.height }));
        };
        img.src = photo.full_url || photo.web_url || photo.thumbnail_url;
      }
    });
  }, [photos]);
  const isHorizontal = isHorizontalProp !== undefined ? isHorizontalProp : (gridSettings?.style?.toLowerCase() === 'horizontal');
  const size = gridSettings?.size || 'regular';
  const spacing = gridSettings?.spacing || 'regular';

  const gapBase = spacing === 'none' ? 0 : spacing === 'small' ? 4 : spacing === 'regular' ? 12 : 24;
  const gap = customRowHeight ? (gapBase * (customRowHeight / (size === 'large' ? 420 : size === 'regular' ? 300 : size === 'small' ? 200 : 140))) : gapBase;
  
  // Standardized row heights to ensure parity between dashboard and public view
  // If customRowHeight is provided (e.g. from GalleryPreview), we use it.
  // Otherwise we use consistent defaults for the public view.
  const baseRowHeight = customRowHeight || (size === 'large' ? 420 : size === 'regular' ? 300 : size === 'small' ? 200 : 140);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      className={cn(
        "w-full",
        isHorizontal ? "flex flex-wrap masonry-grid-horizontal items-start" : "block"
      )}
      style={isHorizontal ? {
        gap: `${gap}px`,
      } : {
        columnCount: customColumnCount || (size === 'large' ? 2 : size === 'regular' ? 3 : 4),
        columnGap: `${gap}px`,
      }}
    >
      <style>
        {`
          .masonry-grid-horizontal::after {
            content: '';
            flex-grow: 999999999;
            min-width: 50%;
            height: 0;
          }
        `}
      </style>
      {photos.map((photo, index) => {
        const src = photo.full_url || photo.web_url || photo.thumbnail_url;
        const aspectRatio = (photo.width && photo.height)
          ? (photo.width / photo.height)
          : (dynamicAspectRatios[photo.id] || 1.5);

        return (
          <motion.div
            key={`${photo.id}-${index}`}
            variants={item}
            className={cn(
              "relative overflow-hidden group cursor-pointer",
              !isHorizontal && "mb-[var(--grid-gap)] break-inside-avoid"
            )}
            style={isHorizontal ? {
              flex: `${aspectRatio} 1 ${baseRowHeight * aspectRatio}px`,
              aspectRatio: `${aspectRatio}`,
              maxWidth: '100%',
              margin: 0
            } : {
              '--grid-gap': `${gap}px`,
              marginBottom: `${gap}px`
            }}
            onClick={() => onImageClick(index)}
          >
            <div className="h-full w-full" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
              <img
                src={src}
                alt={photo.filename || `Gallery image ${index + 1}`}
                className="w-full h-full transition-transform duration-1000 group-hover:scale-105"
                style={{
                  objectFit: 'cover',
                  display: 'block'
                }}
                loading="lazy"
              />
              {/* Hover overlay with buttons */}
              <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/10">
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 transform translate-y-[10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload?.();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                  >
                    <Download size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavorite?.();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                  >
                    <Heart size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
