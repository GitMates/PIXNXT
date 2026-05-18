import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Download, Heart, Share2, Play } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { isGalleryVideo } from '../../../../lib/galleryMediaType';
import { PhotoPrivateControls, PhotoPrivateBadge } from '../../ClientExclusiveAccess';

export function MasonryGrid({
  photos,
  gridSettings,
  onImageClick,
  onFavorite,
  onDownload,
  onShare,
  onTogglePrivate,
  customRowHeight,
  customColumnCount,
  isHorizontal: isHorizontalProp,
  showDownload = true,
  showFavorite = true,
  showShare = false,
  favoritedPhotoIds = [],
  showFilename = false,
  isPreviewMobile = false,
  forceShow = false,
  className,
  isClientViewer = false,
  allowMarkPrivate = false,
  showPrivateBadge = false,
}) {
  const [dynamicAspectRatios, setDynamicAspectRatios] = useState({});

  useEffect(() => {
    photos.forEach(photo => {
      if (!photo.width || !photo.height) {
        const src = photo.full_url || photo.web_url || photo.thumbnail_url;
        // Skip dimension probing for video files — use 16:9 fallback
        if (isGalleryVideo(photo)) {
          setDynamicAspectRatios(prev => ({ ...prev, [photo.id]: 16 / 9 }));
          return;
        }
        const img = new Image();
        img.onload = () => {
          setDynamicAspectRatios(prev => ({ ...prev, [photo.id]: img.width / img.height }));
        };
        img.src = src;
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

  /** Remount animation when the visible photo set changes (e.g. Highlights ↔ WED tab). */
  const photoListKey = useMemo(
    () => photos.map((p) => p.id).join('|') || 'empty',
    [photos]
  );

  // Public gallery: fluid columns (column-width) fill the viewport. Dashboard preview keeps fixed column-count.
  const verticalColumnStyle = (() => {
    if (isHorizontal) return {};
    if (customColumnCount != null) {
      return {
        '--desktop-columns': customColumnCount,
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
      key={photoListKey}
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        'w-full max-w-full min-w-0 masonry-grid-container',
        isHorizontal ? 'flex flex-wrap masonry-grid-horizontal items-start' : 'block masonry-grid-vertical',
        isPreviewMobile && 'preview-mobile',
        className
      )}
      style={isHorizontal ? {
        gap: `${gap}px`,
      } : verticalColumnStyle}
    >
      {photos.map((photo, index) => {
        const src = photo.full_url || photo.web_url || photo.thumbnail_url;
        const aspectRatio = (photo.width && photo.height)
          ? (photo.width / photo.height)
          : (dynamicAspectRatios[photo.id] || 1.5);

        const isFav = favoritedPhotoIds?.some((fid) => String(fid) === String(photo.id));
        const isPrivate = Boolean(photo.is_private);
        const useClientActionBar = Boolean(isClientViewer && allowMarkPrivate);

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
            <div className="relative h-full w-full min-w-0" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
              {isGalleryVideo(photo) ? (
                <>
                <video
                  src={src}
                  poster={photo.thumbnail_url || undefined}
                  className="block w-full max-w-full transition-transform duration-1000 group-hover:scale-105"
                  style={{
                    objectFit: 'cover',
                    aspectRatio: String(aspectRatio),
                  }}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => { })}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
                </>
              ) : (
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
              )}
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
              <div className="absolute inset-0 z-[10] bg-black/0 transition-all duration-500 group-hover:bg-black/10">
                {showPrivateBadge && isPrivate ? <PhotoPrivateBadge visible /> : null}
                {useClientActionBar ? (
                  <PhotoPrivateControls
                    isPrivate={isPrivate}
                    showBadge={false}
                    showPrivateToggle
                    showFavorite={showFavorite}
                    showDownload={showDownload}
                    showShare={showShare}
                    isFavorited={isFav}
                    onTogglePrivate={() => onTogglePrivate?.(photo)}
                    onFavorite={(e) => {
                      e.stopPropagation();
                      onFavorite?.(photo);
                    }}
                    onDownload={(e) => {
                      e.stopPropagation();
                      onDownload?.(photo);
                    }}
                    onShare={(e) => {
                      e.stopPropagation();
                      onShare?.(photo);
                    }}
                  />
                ) : (
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
                  {showShare && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare?.(photo);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                      aria-label="Share"
                    >
                      <Share2 size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                )}
              </div>
              {isGalleryVideo(photo) ? (
                <span
                  className="gallery-video-play pointer-events-none absolute inset-0 z-[25] flex items-center justify-center"
                  aria-hidden
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-2 ring-white/80 transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16">
                    <Play size={22} fill="currentColor" className="ml-1 text-neutral-900" strokeWidth={1.5} />
                  </span>
                </span>
              ) : null}
            </div>
          </Motion.div>
        );
      })}
    </Motion.div>
  );
}
