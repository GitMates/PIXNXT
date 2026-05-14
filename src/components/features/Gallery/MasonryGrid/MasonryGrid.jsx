import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { Download, Heart } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export function MasonryGrid({ photos, gridSettings, onImageClick, onFavorite, onDownload, customRowHeight, customColumnCount, isHorizontal: isHorizontalProp, showDownload = true, showFavorite = true, favoritedPhotoIds = [], showFilename = false }) {
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

  // Avoid opacity:0 on the multicol container — it can break column layout / paint in some browsers.
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.19, 1, 0.22, 1] } }
  };

  // Public gallery: fluid columns (column-width) fill the viewport. Dashboard preview keeps fixed column-count.
  const verticalColumnStyle = (() => {
    if (isHorizontal) return {};
    if (customColumnCount != null) {
      return {
        columnCount: customColumnCount,
        columnGap: `${gap}px`,
      };
    }
    const w =
      size === 'large' ? 380
        : size === 'regular' ? 300
          : size === 'small' ? 240
            : 200;
    return {
      columnWidth: `${w}px`,
      columnGap: `${gap}px`,
    };
  })();

  return (
    <Motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      className={cn(
        'w-full max-w-full min-w-0',
        isHorizontal ? 'flex flex-wrap masonry-grid-horizontal items-start' : 'block'
      )}
      style={isHorizontal ? {
        gap: `${gap}px`,
      } : verticalColumnStyle}
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

        const isFav = favoritedPhotoIds?.some((fid) => String(fid) === String(photo.id));

        return (
          <Motion.div
            key={`${photo.id}-${index}`}
            variants={item}
            className={cn(
              'relative overflow-hidden group cursor-pointer min-w-0',
              !isHorizontal && 'mb-[var(--grid-gap)] w-full max-w-full break-inside-avoid'
            )}
            style={isHorizontal ? {
              flex: `${aspectRatio} 1 ${baseRowHeight * aspectRatio}px`,
              aspectRatio: `${aspectRatio}`,
              maxWidth: '100%',
              margin: 0
            } : {
              '--grid-gap': `${gap}px`,
              marginBottom: `${gap}px`,
              width: '100%',
            }}
            onClick={() => onImageClick(index)}
          >
            <div className="h-full w-full min-w-0" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
              <img
                src={src}
                alt={photo.filename || `Gallery image ${index + 1}`}
                className="block w-full max-w-full transition-transform duration-1000 group-hover:scale-105"
                style={{
                  objectFit: 'cover',
                  aspectRatio: String(aspectRatio),
                }}
                loading="lazy"
              />
              {showFilename && (
                <div
                  className="pointer-events-none absolute bottom-2 left-2 right-2 z-[12] truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium backdrop-blur-sm"
                  style={{
                    color: 'var(--gallery-meta-text, #666)',
                    backgroundColor: 'rgba(255,255,255,0.82)',
                    maxWidth: '100%',
                  }}
                >
                  {photo.filename || `photo-${index + 1}.jpg`}
                </div>
              )}
              {/* Hover overlay: download + favorite */}
              <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/10">
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 transform translate-y-[10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  {showDownload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.(photo);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                    >
                      <Download size={16} strokeWidth={1.5} />
                    </button>
                  )}
                  {showFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFavorite?.(photo);
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all',
                        isFav
                          ? 'bg-white text-black'
                          : 'bg-white/20 text-white hover:bg-white hover:text-black'
                      )}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={16} strokeWidth={1.5} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>
        );
      })}
    </Motion.div>
  );
}
