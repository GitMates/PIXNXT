import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Download, Heart, Share2, Play, ShoppingBag, ArrowDownToLine } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SmoothMediaImage } from '../../../ui/SmoothMediaImage';
import { isGalleryVideo } from '../../../../lib/galleryMediaType';
import { getPhotoVideoPoster, getPhotoVideoSrc } from '../../../../lib/photoDisplayUrl';
import { PhotoPrivateControls, PhotoPrivateBadge } from '../../ClientExclusiveAccess';
import './MasonryGrid.css';
 
export function MasonryGrid({
  photos,
  gridSettings,
  onImageClick,
  onFavorite,
  onDownload,
  onShare,
  onShop,
  onTogglePrivate,
  customRowHeight,
  customColumnCount,
  isHorizontal: isHorizontalProp,
  showDownload = true,
  showFavorite = true,
  showShare = false,
  showShop = true,
  isPaidDownload = false,
  favoritedPhotoIds = [],
  showFilename = false,
  isPreviewMobile = false,
  isMobileViewport = false,
  forceShow = false,
  videosOnly = false,
  className,
  isClientViewer = false,
  allowMarkPrivate = false,
  showPrivateBadge = false,
  activeCampaign = null,
  activeProducts = [],
  onVisitShop = null,
}) {
  const [dynamicAspectRatios, setDynamicAspectRatios] = useState({});

  const displayPhotos = useMemo(() => {
    const hasInlineBanner = !!(activeCampaign?.banners?.photo_banner?.enabled || activeCampaign?.banners?.store_rotator?.enabled);
    if (!hasInlineBanner || photos.length === 0) return photos.map((p, idx) => ({ ...p, _originalIndex: idx }));

    const result = photos.map((p, idx) => ({ ...p, _originalIndex: idx }));
    // Insert special promo banner item at index 1
    result.splice(1, 0, {
      isPromoBanner: true,
      id: 'campaign-promo-tile',
      type: activeCampaign.banners.photo_banner?.enabled ? 'photo_banner' : 'store_rotator'
    });
    return result;
  }, [photos, activeCampaign]);

  useEffect(() => {
    displayPhotos.forEach(photo => {
      if (photo.isPromoBanner) return;
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
  }, [displayPhotos]);
  const isHorizontal = isHorizontalProp !== undefined ? isHorizontalProp : (gridSettings?.style?.toLowerCase() === 'horizontal');
  const size = gridSettings?.size || 'regular';
  const spacing = gridSettings?.spacing || 'regular';

  const gapBase = spacing === 'none' ? 0 : spacing === 'small' ? 4 : spacing === 'regular' ? 12 : 24;
  const gap = customRowHeight ? (gapBase * (customRowHeight / (size === 'large' ? 420 : size === 'regular' ? 300 : size === 'small' ? 200 : 140))) : gapBase;

  // Standardized row heights to ensure parity between dashboard and public view
  // If customRowHeight is provided (e.g. from GalleryPreview), we use it.
  // Otherwise we use consistent defaults for the public view.
  const baseRowHeight = customRowHeight || (size === 'large' ? 420 : size === 'regular' ? 300 : size === 'small' ? 200 : 140);

  const centerVideosLayout =
    videosOnly && photos.length > 0 && photos.every((p) => isGalleryVideo(p));

  /** Videos tab — one size for every tile (not grid size / per-file dimensions). */
  const VIDEO_TILE_MAX_WIDTH_PX = 1080;
  const VIDEO_TILE_ASPECT = 16 / 9;

  // Avoid opacity:0 on the multicol container — it can break column layout / paint in some browsers.
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
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
        centerVideosLayout && 'masonry-grid-videos-only',
        (isPreviewMobile || isMobileViewport) && 'preview-mobile',
        className
      )}
      style={
        centerVideosLayout
          ? {
              gap: `${gap}px`,
              '--video-tile-max-width': `${VIDEO_TILE_MAX_WIDTH_PX}px`,
              '--video-tile-aspect': String(VIDEO_TILE_ASPECT),
            }
          : isHorizontal
            ? { gap: `${gap}px` }
            : verticalColumnStyle
      }
    >
      {displayPhotos.map((photo, index) => {
        if (photo.isPromoBanner) {
          return (
            <Motion.div
              key={photo.id}
              variants={item}
              className={cn(
                'relative overflow-hidden group cursor-pointer min-w-0 mb-[var(--grid-gap)] w-full max-w-full break-inside-avoid shadow-sm border border-black/5'
              )}
              style={isHorizontal ? {
                flex: `0 0 340px`,
                aspectRatio: '1 / 1',
                maxWidth: '100%',
                margin: 0
              } : {
                '--grid-gap': `${gap}px`,
                marginBottom: `${gap}px`,
                width: '100%',
                aspectRatio: '1 / 1'
              }}
              onClick={() => onVisitShop?.()}
            >
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: photo.type === 'photo_banner' 
                  ? (activeCampaign?.banners?.photo_banner?.bg_color || '#d4c9b5')
                  : (activeCampaign?.banners?.store_rotator?.bg_color || '#eae5d8'),
                padding: '16px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif"
              }}>
                {photo.type === 'photo_banner' ? (
                  <>
                    <h3 style={{
                      fontSize: '14px', fontWeight: 700,
                      fontFamily: "'Playfair Display', serif",
                      color: '#1a1a1a', marginBottom: '4px',
                      textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      {activeCampaign?.banners?.photo_banner?.title || 'Special Promotion'}
                    </h3>
                    <p style={{ fontSize: '10px', color: '#444444', marginBottom: '10px', lineHeight: 1.3 }}>
                      {activeCampaign?.banners?.photo_banner?.subtitle || 'Custom prints and gifts at exclusive discounted pricing'}
                    </p>
                    
                    {/* Active Products thumbnails fetched from printstore_products */}
                    {activeProducts && activeProducts.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', width: '100%', marginBottom: '12px' }}>
                        {activeProducts.slice(0, 3).map((prod, idx) => {
                          const imgUrl = prod.image_url || prod.image;
                          return (
                            <div key={prod.id || idx} style={{
                              flex: 1, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.04)',
                              padding: '6px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0
                            }}>
                              <img 
                                src={imgUrl} 
                                alt={prod.name} 
                                style={{ width: '100%', height: '32px', objectFit: 'cover', marginBottom: '2px' }} 
                              />
                              <span style={{
                                fontSize: '7px', fontWeight: 600, color: '#1a1a1a',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                width: '100%', textAlign: 'center'
                              }}>{prod.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); onVisitShop?.(); }}
                      style={{
                        padding: '6px 16px', fontSize: '8px', fontWeight: 700,
                        backgroundColor: '#1a1a1a', color: '#ffffff', border: 'none',
                        textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer'
                      }}
                    >
                      SHOP NOW
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', color: '#bfa38a', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {activeCampaign?.banners?.store_rotator?.code ? activeCampaign.banners.store_rotator.code.replace(/{code}/g, activeCampaign.discountCode || 'HAPPYANI') : 'EXCLUSIVE OFFER'}
                    </span>
                    <h3 style={{
                      fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0',
                      fontFamily: activeCampaign?.banners?.store_rotator?.font === 'Playfair Display' ? "'Playfair Display', serif" : "'Inter', sans-serif",
                      color: activeCampaign?.banners?.store_rotator?.title_color || '#2c3e2d', textTransform: 'uppercase'
                    }}>
                      {(() => {
                        let text = activeCampaign?.banners?.store_rotator?.title || '';
                        const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                        return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal);
                      })()}
                    </h3>
                    <p style={{ fontSize: '10px', lineHeight: 1.3, color: activeCampaign?.banners?.store_rotator?.subtitle_color || '#4a5a4b', marginBottom: '10px' }}>
                      {(() => {
                        let text = activeCampaign?.banners?.store_rotator?.subtitle || '';
                        const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                        const expDate = new Date(); expDate.setDate(expDate.getDate() + 14);
                        const expFormatted = expDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal).replace(/{exp-date}/g, expFormatted).replace(/{exp_date}/g, expFormatted);
                      })()}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onVisitShop?.(); }}
                      style={{
                        padding: '6px 16px', fontSize: '8px', fontWeight: 700,
                        backgroundColor: activeCampaign?.banners?.store_rotator?.cta_bg || '#3a4a38',
                        color: activeCampaign?.banners?.store_rotator?.cta_color || '#ffffff',
                        border: 'none', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer'
                      }}
                    >
                      {activeCampaign?.banners?.store_rotator?.cta || 'CLAIM OFFER'}
                    </button>
                  </>
                )}
              </div>
            </Motion.div>
          );
        }

        const src = isGalleryVideo(photo)
          ? getPhotoVideoSrc(photo)
          : photo.full_url || photo.web_url || photo.thumbnail_url;
        const aspectRatio = (photo.width && photo.height)
          ? (photo.width / photo.height)
          : (dynamicAspectRatios[photo.id] || 1.5);
        const useFixedVideoTile = centerVideosLayout && isGalleryVideo(photo);
        const tileAspectRatio = useFixedVideoTile ? VIDEO_TILE_ASPECT : aspectRatio;

        const isFav = favoritedPhotoIds?.some((fid) => String(fid) === String(photo.id));
        const isPrivate = Boolean(photo.is_private);
        const useClientActionBar = Boolean(isClientViewer && allowMarkPrivate);
        const privateBadgeBlocksTopLeft = Boolean(showPrivateBadge && isPrivate);

        return (
          <Motion.div
            key={`${photo.id}-${index}`}
            variants={item}
            className={cn(
              'relative overflow-hidden group cursor-pointer min-w-0',
              centerVideosLayout && 'masonry-grid-video-item',
              !isHorizontal && !centerVideosLayout && 'mb-[var(--grid-gap)] w-full max-w-full break-inside-avoid'
            )}
            style={isHorizontal ? {
              flex: useFixedVideoTile
                ? `0 1 ${VIDEO_TILE_MAX_WIDTH_PX}px`
                : `${tileAspectRatio} 1 ${baseRowHeight * tileAspectRatio}px`,
              aspectRatio: useFixedVideoTile ? String(VIDEO_TILE_ASPECT) : String(tileAspectRatio),
              maxWidth: useFixedVideoTile ? undefined : '100%',
              margin: 0
            } : centerVideosLayout ? {
              marginBottom: `${gap}px`,
            } : {
              '--grid-gap': `${gap}px`,
              marginBottom: `${gap}px`,
              width: '100%',
            }}
            onClick={() => onImageClick(photo._originalIndex)}
          >
            <div
              className={cn(
                'relative h-full w-full min-w-0',
                useFixedVideoTile && 'masonry-grid-video-frame'
              )}
              style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}
            >
              {isGalleryVideo(photo) ? (
                <>
                <video
                  src={src}
                  poster={getPhotoVideoPoster(photo)}
                  className={cn(
                    'gallery-masonry-media',
                    useFixedVideoTile && 'gallery-masonry-media--video-fixed'
                  )}
                  style={
                    useFixedVideoTile
                      ? { objectFit: 'cover', width: '100%', height: '100%' }
                      : { objectFit: 'cover', aspectRatio: String(tileAspectRatio) }
                  }
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => { })}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
                </>
              ) : (
                <SmoothMediaImage
                  src={src}
                  thumbSrc={photo.thumbnail_url}
                  alt={photo.filename || `Gallery image ${index + 1}`}
                  wrapClassName="gallery-masonry-media"
                  className="block w-full max-w-full"
                  objectFit="cover"
                  style={{
                    aspectRatio: String(aspectRatio),
                  }}
                  loading="lazy"
                />
              )}

              {showFilename && (
                <div
                  className="gallery-body-text pointer-events-none absolute bottom-2 left-2 right-2 z-[12] truncate rounded px-1.5 py-0.5 text-left text-[13px] font-medium backdrop-blur-sm"
                  style={{
                    color: 'var(--gallery-meta-text, #666)',
                    backgroundColor: 'rgba(255,255,255,0.82)',
                    maxWidth: '100%',
                  }}
                >
                  {photo.filename || `photo-${index + 1}.jpg`}
                </div>
              )}
              {/* Favorited: persistent top-left heart (Pixieset-style) so state stays visible off-hover */}
              {showFavorite && isFav && !useClientActionBar ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavorite?.(photo);
                  }}
                  className={cn(
                    'absolute z-[14] flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-rose-400 shadow-sm backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-rose-300',
                    privateBadgeBlocksTopLeft ? 'left-3 top-12' : 'left-3 top-3'
                  )}
                  aria-label="Remove from favorites"
                >
                  <Heart size={18} strokeWidth={1.75} fill="currentColor" className="drop-shadow-sm" />
                </button>
              ) : null}
              {/* Hover overlay: download + favorite */}
              <div className="gallery-masonry-tile-overlay absolute inset-0 z-[10] bg-black/0">
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
                <div className="gallery-masonry-actions absolute bottom-4 right-4 z-[12] flex gap-2">
                  {showShop && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShop?.(photo);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                      aria-label="Shop"
                    >
                      <ShoppingBag size={16} strokeWidth={1.5} />
                    </button>
                  )}
                  {showDownload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.(photo);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all"
                    >
                      {isPaidDownload ? (
                        <span className="relative">
                          <ArrowDownToLine size={16} strokeWidth={1.5} />
                          <span style={{ position: 'absolute', top: '-4px', right: '-6px', fontSize: '6px', fontWeight: 800, lineHeight: 1, background: 'currentColor', color: 'var(--gallery-bg, #fff)', borderRadius: '3px', padding: '1px 2px' }}>₹</span>
                        </span>
                      ) : (
                        <Download size={16} strokeWidth={1.5} />
                      )}
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
                  <span className="gallery-masonry-play-btn flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-2 ring-white/80 md:h-16 md:w-16">
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
