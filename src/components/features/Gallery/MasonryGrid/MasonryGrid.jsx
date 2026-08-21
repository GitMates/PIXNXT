import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { motion as Motion } from 'framer-motion';
import { Download, Heart, Share2, Play, ShoppingBag, ArrowDownToLine } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SmoothMediaImage } from '../../../ui/SmoothMediaImage';
import { isGalleryVideo } from '../../../../lib/galleryMediaType';
import { getPhotoVideoPoster, getPhotoVideoSrc, resolveMediaUrl, getWebResolutionUrl } from '../../../../lib/photoDisplayUrl';
import { PhotoPrivateControls, PhotoPrivateBadge } from '../../ClientExclusiveAccess';
import {
  BannerBouquetSvg,
  formatBannerPlaceholders,
  getBannerFontFamily,
  padTimerPart,
  resolveBannerBackgroundImage,
} from '../../../../lib/salesCampaignBanner';
import {
  distributePhotosToShortestColumns,
  getGalleryMasonryColumnCount,
  getThumbnailSizeColumnCount,
} from '../../../../lib/masonryColumnDistribution';
import { isRowMasonryGridStyle } from '../../../../lib/galleryGridStyle';
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
  packagePickerActive = false,
  packageSelectedPhotoIds = [],
  packagePickLimit = 0,
}) {
  const [dynamicAspectRatios, setDynamicAspectRatios] = useState({});
  const [showTooltip, setShowTooltip] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('pixnxt_gallery_visited');
  });

  const dismissTooltip = useCallback(() => {
    setShowTooltip(false);
    localStorage.setItem('pixnxt_gallery_visited', 'true');
  }, []);

  const [colsCount, setColsCount] = useState(() => {
    if (customColumnCount != null) return customColumnCount;
    const mobile = Boolean(isPreviewMobile || isMobileViewport);
    if (typeof window !== 'undefined') {
      return getGalleryMasonryColumnCount(window.innerWidth, gridSettings?.size);
    }
    return getThumbnailSizeColumnCount(gridSettings?.size, mobile);
  });

  const displayPhotos = useMemo(() => {
    const hasInlineBanner = !!(activeCampaign?.banners?.photo_banner?.enabled || activeCampaign?.banners?.store_rotator?.enabled);
    if (!hasInlineBanner || photos.length === 0 || videosOnly) {
      return photos.map((p, idx) => ({ ...p, _originalIndex: idx }));
    }

    const result = photos.map((p, idx) => ({ ...p, _originalIndex: idx }));
    const columns = Math.max(1, colsCount || 3);
    const centerCol = Math.floor(columns / 2);

    // Square promo sits in the masonry flow so neighboring images fill left/right gaps.
    // Prefer center column of the second visual row when there are enough photos.
    let insertAt = Math.min(1, result.length);
    if (result.length >= columns + centerCol) {
      insertAt = columns + centerCol;
    } else if (columns === 2 && result.length >= columns) {
      insertAt = columns;
    } else if (result.length >= 2) {
      insertAt = Math.min(centerCol, result.length);
    } else {
      insertAt = result.length;
    }

    result.splice(insertAt, 0, {
      isPromoBanner: true,
      id: 'campaign-promo-tile',
      type: activeCampaign.banners.photo_banner?.enabled ? 'photo_banner' : 'store_rotator',
    });
    return result;
  }, [photos, activeCampaign, colsCount]);

  useEffect(() => {
    displayPhotos.forEach(photo => {
      if (photo.isPromoBanner) return;
      if (!photo.width || !photo.height) {
        const src = getWebResolutionUrl(photo);
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
  const isHorizontal = isHorizontalProp !== undefined
    ? isHorizontalProp
    : isRowMasonryGridStyle(gridSettings?.style);
  const size = gridSettings?.size || 'regular';
  const spacing = gridSettings?.spacing || 'regular';

  const gapBase = spacing === 'none' ? 0 : spacing === 'small' ? 4 : spacing === 'regular' ? 6 : 24;
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

  const getPhotoAspectRatio = useCallback((photo) => {
    if (photo.isPromoBanner) return 1;
    if (photo.width && photo.height) return photo.width / photo.height;
    return dynamicAspectRatios[photo.id] || 1.5;
  }, [dynamicAspectRatios]);

  const containerRef = useRef(null);
  const [gridContainerWidth, setGridContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (isHorizontal || centerVideosLayout) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const updateWidth = (width) => {
      if (width > 0) setGridContainerWidth(width);
    };

    updateWidth(el.offsetWidth);

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? el.offsetWidth;
      updateWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHorizontal, centerVideosLayout, photoListKey, colsCount, gap]);

  const estimatedColWidth = useMemo(() => {
    if (gridContainerWidth > 0) {
      return (gridContainerWidth - (colsCount - 1) * gap) / colsCount;
    }
    const viewport = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return (viewport - (colsCount - 1) * gap) / colsCount;
  }, [gridContainerWidth, colsCount, gap]);

  const samplePhotoUrl = useMemo(() => {
    if (!photos || photos.length === 0) return '';
    const firstPhoto = photos[0];
    return firstPhoto?.web_url || firstPhoto?.full_url || firstPhoto?.thumbnail_url || '';
  }, [photos]);

  const renderProductPreviewStyle = (productId, photoUrl) => {
    const bgImage = photoUrl ? `url(${photoUrl})` : 'none';

    if (productId === 'prints' || productId === 'print_pack' || productId === 'deckled_prints') {
      return (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          marginBottom: '5px'
        }}>
          <div style={{
            width: '32px',
            height: '38px',
            backgroundImage: bgImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transform: 'rotate(-7deg) translateX(-6px)',
            border: '2px solid #ffffff',
            borderRadius: '1px'
          }} />
          <div style={{
            width: '32px',
            height: '38px',
            backgroundImage: bgImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transform: 'rotate(5deg) translateX(6px)',
            border: '2px solid #ffffff',
            borderRadius: '1px',
            position: 'absolute'
          }} />
        </div>
      );
    }

    if (productId === 'matted_frame' || productId === 'matted_collages' || productId === 'frames' || productId === 'float_frames') {
      return (
        <div style={{
          width: '100%',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '5px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            border: '3.5px solid #1a1a1a',
            padding: '3px',
            backgroundColor: '#ffffff',
            boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: bgImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />
          </div>
        </div>
      );
    }

    if (productId === 'canvas') {
      return (
        <div style={{
          width: '100%',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '5px'
        }}>
          <div style={{
            width: '44px',
            height: '34px',
            backgroundImage: bgImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '2px 4px 8px rgba(0,0,0,0.22), -1px 2px 4px rgba(0,0,0,0.1)',
            border: '0.5px solid rgba(0,0,0,0.08)'
          }} />
        </div>
      );
    }

    return (
      <div style={{
        width: '100%',
        height: '46px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '5px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          backgroundImage: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
          border: '1.5px solid #eaeaea'
        }} />
      </div>
    );
  };

  // Public gallery: fluid columns (column-width) fill the viewport. Dashboard preview keeps fixed column-count.
  const verticalColumnStyle = (() => {
    if (isHorizontal) return {};
    if (customColumnCount != null) {
      return {
        '--desktop-columns': customColumnCount,
        '--mobile-columns': customColumnCount,
        columnGap: `${gap}px`,
      };
    }
    const w =
      size === 'large' ? 380
        : size === 'regular' ? 300
          : size === 'small' ? 240
            : 200;
    return {
      '--desktop-columns': getThumbnailSizeColumnCount(size, false),
      '--mobile-columns': getThumbnailSizeColumnCount(size, true),
      columnWidth: `${w}px`,
      columnGap: `${gap}px`,
    };
  })();

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    if (!activeCampaign) return;
    const storageKey = `pixnxt_campaign_timer_${activeCampaign.id || 'default'}`;
    let targetTime = localStorage.getItem(storageKey);
    if (!targetTime) {
      const now = new Date();
      now.setDate(now.getDate() + Number(activeCampaign.durationDays || 14));
      targetTime = now.getTime().toString();
      localStorage.setItem(storageKey, targetTime);
    }

    const updateTimer = () => {
      const difference = Number(targetTime) - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeCampaign]);

  useEffect(() => {
    if (customColumnCount != null) {
      setColsCount(customColumnCount);
      return;
    }
    const updateCols = () => {
      const mobile = Boolean(isPreviewMobile || isMobileViewport);
      setColsCount(
        mobile
          ? getThumbnailSizeColumnCount(gridSettings?.size, true)
          : getGalleryMasonryColumnCount(window.innerWidth, gridSettings?.size)
      );
    };

    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, [customColumnCount, gridSettings?.size, isPreviewMobile, isMobileViewport]);

  // columns built below for masonry distribution

  const renderPromoCard = (photo) => {
    const isPhotoBanner = photo.type === 'photo_banner';
    const bannerConfig = isPhotoBanner
      ? activeCampaign?.banners?.photo_banner
      : activeCampaign?.banners?.store_rotator;

    const isMobileView = isMobileViewport || isPreviewMobile;
    const bgImage = resolveBannerBackgroundImage(bannerConfig, isMobileView);
    const fontFamily = getBannerFontFamily(bannerConfig?.font || 'Playfair Display');

    const bannerStyle = {
      bg: bannerConfig?.bg_color || (isPhotoBanner ? '#d4c9b5' : '#eae5d8'),
      backgroundImage: bgImage,
      titleColor: bannerConfig?.title_color || (isPhotoBanner ? '#1a1a1a' : '#2c3e2d'),
      subtitleColor: bannerConfig?.subtitle_color || (isPhotoBanner ? '#444444' : '#4a5a4b'),
      ctaBg: bannerConfig?.cta_bg || (isPhotoBanner ? '#1a1a1a' : '#3a4a38'),
      ctaColor: bannerConfig?.cta_color || bannerConfig?.bg_color || '#ffffff',
      timerColor: bannerConfig?.timer_color || bannerConfig?.title_color || (isPhotoBanner ? '#1a1a1a' : '#2c3e2d'),
    };

    const title = formatBannerPlaceholders(
      bannerConfig?.title || (isPhotoBanner ? 'Anniversary Sale' : 'Your Wedding in Print'),
      activeCampaign
    );
    const subtitle = formatBannerPlaceholders(
      bannerConfig?.subtitle || (isPhotoBanner
        ? 'Celebrate with {discount-value} OFF prints.'
        : 'Anniversary Gift! Celebrate those special moments with {discount-value} off all prints until {exp-date}.'),
      activeCampaign
    );
    const codeLine = formatBannerPlaceholders(
      bannerConfig?.code || `Code: {code}`,
      activeCampaign
    );
    const ctaLabel = bannerConfig?.cta || (isPhotoBanner ? 'CLAIM OFFER' : 'CLAIM OFFER');

    return (
      <Motion.div
        key={photo.id}
        variants={item}
        className={cn(
          'relative overflow-hidden group cursor-pointer min-w-0 w-full max-w-full shadow-sm border border-black/5'
        )}
        style={isHorizontal ? {
          flex: `0 0 340px`,
          aspectRatio: '1 / 1',
          maxWidth: '100%',
          margin: 0,
        } : {
          width: '100%',
          aspectRatio: '1 / 1',
        }}
        onClick={() => {
          dismissTooltip();
          onVisitShop?.();
        }}
        data-sales-banner={isPhotoBanner ? 'photo' : 'store_rotator'}
      >
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: bannerStyle.bg,
          backgroundImage: bannerStyle.backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          padding: '20px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily,
        }}>
          {bannerStyle.backgroundImage && bannerStyle.backgroundImage !== 'none' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              zIndex: 1,
              pointerEvents: 'none'
            }} />
          )}

          <div style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {isPhotoBanner ? (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: '12px 16px',
                textAlign: 'center',
                gap: '6px'
              }}>
                <h3 style={{
                  fontSize: isMobileView ? '13px' : '16px',
                  fontWeight: 700,
                  color: bannerStyle.titleColor,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily,
                }}>
                  {title}
                </h3>
                <p style={{
                  fontSize: isMobileView ? '9px' : '10px',
                  color: bannerStyle.subtitleColor,
                  margin: '0 0 2px 0',
                  lineHeight: 1.3,
                  maxWidth: '240px',
                  fontFamily: "var(--font-sans)",
                }}>
                  {subtitle}
                </p>
                <div style={{
                  fontSize: isMobileView ? '8.5px' : '9.5px',
                  color: bannerStyle.subtitleColor,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: "var(--font-sans)",
                }}>
                  {codeLine}
                </div>

                <div style={{ marginTop: '4px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '5px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: bannerStyle.timerColor
                  }}>
                    {[
                      { value: timeLeft.days, label: 'day' },
                      { value: timeLeft.hours, label: 'hrs' },
                      { value: timeLeft.minutes, label: 'min' },
                      { value: timeLeft.seconds, label: 'sec' },
                    ].map((part, idx) => (
                      <React.Fragment key={part.label}>
                        {idx > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 700, alignSelf: 'flex-start', marginTop: '-2px' }}>:</span>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: isMobileView ? '12px' : '15px', fontWeight: 700, lineHeight: 1 }}>
                            {padTimerPart(part.value)}
                          </span>
                          <span style={{ fontSize: '5px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>
                            {part.label}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onVisitShop?.(); }}
                  style={{
                    marginTop: '6px',
                    padding: '5px 14px',
                    fontSize: '8px',
                    fontWeight: 700,
                    backgroundColor: bannerStyle.ctaBg,
                    color: bannerStyle.ctaColor,
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    borderRadius: '1px'
                  }}
                >
                  {ctaLabel}
                </button>
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: '12px 10px',
                gap: '4px',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#bfa38a',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                  fontFamily: "var(--font-sans)",
                }}>
                  {codeLine}
                </span>
                <h3 style={{
                  fontSize: isMobileView ? '13px' : '15px',
                  fontWeight: 700,
                  margin: 0,
                  color: bannerStyle.titleColor,
                  textTransform: 'uppercase',
                  fontFamily,
                }}>
                  {title}
                </h3>
                <p style={{
                  fontSize: isMobileView ? '9px' : '10px',
                  lineHeight: 1.3,
                  color: bannerStyle.subtitleColor,
                  margin: '0 0 4px 0',
                  maxWidth: '240px',
                  fontFamily: "var(--font-sans)",
                }}>
                  {subtitle}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  <BannerBouquetSvg size={28} />
                  <BannerBouquetSvg size={40} />
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onVisitShop?.(); }}
                  style={{
                    padding: '6px 16px',
                    fontSize: '8px',
                    fontWeight: 700,
                    backgroundColor: bannerStyle.ctaBg,
                    color: bannerStyle.ctaColor,
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    borderRadius: '1px',
                    marginTop: '4px'
                  }}
                >
                  {ctaLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </Motion.div>
    );
  };

  const renderPhotoItem = (photo, index) => {
    const src = isGalleryVideo(photo)
      ? getPhotoVideoSrc(photo)
      : getWebResolutionUrl(photo);
    const aspectRatio = getPhotoAspectRatio(photo);
    const useFixedVideoTile = centerVideosLayout && isGalleryVideo(photo);
    const tileAspectRatio = useFixedVideoTile ? VIDEO_TILE_ASPECT : aspectRatio;
    const useVerticalTileFrame = !isHorizontal && !centerVideosLayout;

    const isFav = favoritedPhotoIds?.some((fid) => String(fid) === String(photo.id));
    const isPrivate = Boolean(photo.is_private);
    const useClientActionBar = Boolean(isClientViewer && allowMarkPrivate);
    const privateBadgeBlocksTopLeft = Boolean(showPrivateBadge && isPrivate);
    const packageSelectedIndex = packagePickerActive
      ? packageSelectedPhotoIds.findIndex((id) => String(id) === String(photo.id))
      : -1;
    const isPackageSelected = packageSelectedIndex >= 0;

    return (
      <Motion.div
        key={`${photo.id}-${index}`}
        variants={item}
        className={cn(
          'relative overflow-hidden group cursor-pointer min-w-0 w-full max-w-full',
          useVerticalTileFrame && 'masonry-grid-tile',
          centerVideosLayout && 'masonry-grid-video-item',
          isPackageSelected && 'ring-2 ring-black ring-offset-2'
        )}
        style={isHorizontal ? {
          flex: useFixedVideoTile
            ? `0 1 ${VIDEO_TILE_MAX_WIDTH_PX}px`
            : `${tileAspectRatio} 1 ${baseRowHeight * tileAspectRatio}px`,
          aspectRatio: useFixedVideoTile ? String(VIDEO_TILE_ASPECT) : String(tileAspectRatio),
          maxWidth: useFixedVideoTile ? undefined : '100%',
          margin: 0
        } : (centerVideosLayout ? {} : {
          width: '100%',
          '--ar': String(tileAspectRatio),
        })}
        onClick={() => {
          dismissTooltip();
          onImageClick(photo._originalIndex);
        }}
      >
        {/* First-visit tooltip — above the first tile only */}
        {index === 0 && showTooltip && (
          <div className="gallery-tile-tooltip">
            Hover any photo — favourite it, or print it
          </div>
        )}
        <div
          className={cn(
            'min-w-0',
            useVerticalTileFrame ? 'masonry-grid-tile-frame absolute inset-0' : 'relative h-full w-full',
            useFixedVideoTile && 'masonry-grid-video-frame'
          )}
          style={useVerticalTileFrame ? undefined : { backgroundColor: 'var(--gallery-secondary-bg)' }}
        >
          {useVerticalTileFrame ? (
            <span
              className="absolute inset-0 block"
              style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}
              aria-hidden
            />
          ) : null}
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
                useFixedVideoTile || useVerticalTileFrame
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
              thumbSrc={
                photo.thumbnail_url
                  ? resolveMediaUrl(photo.thumbnail_url)
                  : undefined
              }
              alt={photo.filename || `Gallery image ${index + 1}`}
              wrapClassName="gallery-masonry-media"
              objectFit="cover"
              loading="lazy"
            />
          )}

          {packagePickerActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                border: isPackageSelected ? '3px solid #111' : '3px solid transparent',
                boxSizing: 'border-box',
                background: isPackageSelected ? 'rgba(0,0,0,0.18)' : 'transparent',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  minWidth: 28,
                  height: 28,
                  borderRadius: '9999px',
                  background: isPackageSelected ? '#111' : 'rgba(255,255,255,0.92)',
                  color: isPackageSelected ? '#fff' : '#111',
                  border: '1px solid rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  padding: '0 6px',
                }}
              >
                {isPackageSelected
                  ? `${packageSelectedIndex + 1}/${packagePickLimit || packageSelectedPhotoIds.length || '?'}`
                  : '+'}
              </div>
            </div>
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

          {/* Favourited heart — stays visible at rest (not inside the hover-only overlay) */}
          {showFavorite && isFav && !useClientActionBar && (
            <div className="gallery-masonry-actions gallery-masonry-fav-always absolute top-2.5 left-2.5 z-[14] flex gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissTooltip();
                  onFavorite?.(photo);
                }}
                className="gallery-masonry-action-btn flex items-center justify-center rounded-full transition-all"
                aria-label="Remove from favorites"
              >
                <Heart size={13} strokeWidth={1.75} fill="currentColor" />
              </button>
            </div>
          )}

          {/* Overlay — gradient fades in on hover via CSS */}
          <div className="gallery-masonry-tile-overlay absolute inset-0 z-[10]">
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
                  dismissTooltip();
                  onFavorite?.(photo);
                }}
                onDownload={(e) => {
                  e.stopPropagation();
                  dismissTooltip();
                  onDownload?.(photo);
                }}
                onShare={(e) => {
                  e.stopPropagation();
                  dismissTooltip();
                  onShare?.(photo);
                }}
              />
            ) : (
            <div className="gallery-masonry-actions absolute bottom-2.5 right-2.5 z-[12] flex gap-1.5">
              {showFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTooltip();
                    onFavorite?.(photo);
                  }}
                  className="gallery-masonry-action-btn flex items-center justify-center rounded-full transition-all"
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={13} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} style={isFav ? { color: '#C4703A' } : undefined} />
                </button>
              )}
              {showDownload && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTooltip();
                    onDownload?.(photo);
                  }}
                  className="gallery-masonry-action-btn flex items-center justify-center rounded-full transition-all"
                  aria-label="Download"
                >
                  {isPaidDownload ? (
                    <span className="relative">
                      <ArrowDownToLine size={13} strokeWidth={1.75} />
                      <span style={{ position: 'absolute', top: '-3px', right: '-5px', fontSize: '5px', fontWeight: 800, lineHeight: 1, background: 'currentColor', color: 'var(--gallery-bg, #fff)', borderRadius: '2px', padding: '1px 2px' }}>₹</span>
                    </span>
                  ) : (
                    <Download size={13} strokeWidth={1.75} />
                  )}
                </button>
              )}
              {showShop && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTooltip();
                    onShop?.(photo);
                  }}
                  className="gallery-masonry-action-btn flex items-center justify-center rounded-full transition-all"
                  aria-label="Shop"
                >
                  <ShoppingBag size={13} strokeWidth={1.75} />
                </button>
              )}
              {showShare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTooltip();
                    onShare?.(photo);
                  }}
                  className="gallery-masonry-action-btn flex items-center justify-center rounded-full transition-all"
                  aria-label="Share"
                >
                  <Share2 size={13} strokeWidth={1.75} />
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
  };

  const columns = useMemo(() => {
    if (isHorizontal || centerVideosLayout) return [displayPhotos];

    return distributePhotosToShortestColumns(
      displayPhotos,
      colsCount,
      estimatedColWidth,
      gap,
      getPhotoAspectRatio,
    );
  }, [
    displayPhotos,
    colsCount,
    isHorizontal,
    centerVideosLayout,
    getPhotoAspectRatio,
    estimatedColWidth,
    gap,
  ]);

  if (!isHorizontal) {
    return (
      <Motion.div
        key={photoListKey}
        ref={containerRef}
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          'w-full max-w-full min-w-0 masonry-grid-container flex items-start',
          centerVideosLayout && 'masonry-grid-videos-only',
          (isPreviewMobile || isMobileViewport) && 'preview-mobile',
          className
        )}
        style={{ gap: `${gap}px` }}
      >
        {columns.map((columnItems, colIdx) => (
          <div
            key={colIdx}
            className={cn('flex-1 flex flex-col min-w-0', centerVideosLayout && 'w-full')}
            style={{ gap: `${gap}px` }}
          >
            {columnItems.map((photo, idx) => {
              if (photo.isPromoBanner) return renderPromoCard(photo);
              return renderPhotoItem(photo, idx);
            })}
          </div>
        ))}
      </Motion.div>
    );
  }

  return (
    <Motion.div
      key={photoListKey}
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        'w-full max-w-full min-w-0 masonry-grid-container',
        'flex flex-wrap masonry-grid-horizontal items-start',
        centerVideosLayout && 'masonry-grid-videos-only',
        (isPreviewMobile || isMobileViewport) && 'preview-mobile',
        className
      )}
      style={{ gap: `${gap}px` }}
    >
      {displayPhotos.map((photo, index) => {
        if (photo.isPromoBanner) return renderPromoCard(photo);
        return renderPhotoItem(photo, index);
      })}
    </Motion.div>
  );
}
