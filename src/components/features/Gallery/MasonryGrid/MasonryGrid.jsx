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

  const [colsCount, setColsCount] = useState(3);

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
      const w = window.innerWidth;
      if (w <= 480) {
        setColsCount(1);
      } else if (w <= 768) {
        setColsCount(2);
      } else if (w <= 1024) {
        setColsCount(3);
      } else {
        setColsCount(3);
      }
    };
    
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, [customColumnCount]);

  const columns = useMemo(() => {
    if (isHorizontal) return [displayPhotos];
    
    const cols = Array.from({ length: colsCount }, () => []);
    displayPhotos.forEach((photo, idx) => {
      cols[idx % colsCount].push(photo);
    });
    return cols;
  }, [displayPhotos, colsCount, isHorizontal]);

  const renderPromoCard = (photo) => {
    const isPhotoBanner = photo.type === 'photo_banner';
    const bannerConfig = isPhotoBanner 
      ? activeCampaign?.banners?.photo_banner 
      : activeCampaign?.banners?.store_rotator;

    const isMobileView = isMobileViewport || isPreviewMobile;
    const desktopImg = bannerConfig?.desktop_image || '';
    const mobileImg = bannerConfig?.mobile_image || '';
    const bgImage = isMobileView
      ? (mobileImg ? `url(${mobileImg})` : (desktopImg ? `url(${desktopImg})` : 'none'))
      : (desktopImg ? `url(${desktopImg})` : 'none');

    const bannerStyle = {
      bg: bannerConfig?.bg_color || (isPhotoBanner ? '#d4c9b5' : '#eae5d8'),
      backgroundImage: bgImage,
      titleColor: bannerConfig?.title_color || (isPhotoBanner ? '#1a1a1a' : '#2c3e2d'),
      subtitleColor: bannerConfig?.subtitle_color || (isPhotoBanner ? '#444444' : '#4a5a4b'),
      ctaBg: bannerConfig?.cta_bg || (isPhotoBanner ? '#1a1a1a' : '#3a4a38'),
      ctaColor: bannerConfig?.cta_color || '#ffffff',
      font: bannerConfig?.font || 'Playfair Display'
    };

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
          margin: 0
        } : {
          width: '100%',
          aspectRatio: '1 / 1'
        }}
        onClick={() => onVisitShop?.()}
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
          fontFamily: bannerStyle.font === 'Playfair Display' ? "'Playfair Display', serif" : "'Inter', sans-serif"
        }}>
          {/* Text contrast overlay if custom background image is present */}
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
                flexDirection: isMobileView ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                padding: isMobileView ? '8px' : '10px 16px',
                textAlign: isMobileView ? 'center' : 'left',
                gap: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMobileView ? 'center' : 'flex-start',
                  gap: '4px',
                  flex: 1
                }}>
                  <h3 style={{
                    fontSize: isMobileView ? '13px' : '16px',
                    fontWeight: 700,
                    color: bannerStyle.titleColor,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontFamily: bannerStyle.font
                  }}>
                    {(() => {
                      let text = bannerConfig?.title || '';
                      const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                      return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal).replace(/{code}/g, activeCampaign?.discountCode || 'HAPPYANI');
                    })()}
                  </h3>
                  <p style={{
                    fontSize: isMobileView ? '9px' : '10px',
                    color: bannerStyle.subtitleColor,
                    margin: '0 0 2px 0',
                    lineHeight: 1.3,
                    maxWidth: isMobileView ? '220px' : '190px'
                  }}>
                    {(() => {
                      let text = bannerConfig?.subtitle || '';
                      const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                      const expDate = new Date(); expDate.setDate(expDate.getDate() + 14);
                      const expFormatted = expDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal).replace(/{exp-date}/g, expFormatted).replace(/{exp_date}/g, expFormatted).replace(/{code}/g, activeCampaign?.discountCode || 'HAPPYANI');
                    })()}
                  </p>
                  <div style={{
                    fontSize: isMobileView ? '8.5px' : '9.5px',
                    color: bannerStyle.subtitleColor,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {bannerConfig?.code ? bannerConfig.code.replace(/{code}/g, activeCampaign?.discountCode || 'HAPPYANI') : `Code: ${activeCampaign?.discountCode || 'HAPPYANI'}`}
                  </div>

                  {/* Countdown Timer */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{
                      display: 'flex',
                      gap: '5px',
                      alignItems: 'center',
                      justifyContent: isMobileView ? 'center' : 'flex-start',
                      color: bannerStyle.timerColor
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobileView ? '12px' : '15px', fontWeight: 700, lineHeight: 1 }}>
                          {String(timeLeft.days).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '5px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>day</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, alignSelf: 'flex-start', marginTop: '-2px' }}>:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobileView ? '12px' : '15px', fontWeight: 700, lineHeight: 1 }}>
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '5px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>hrs</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, alignSelf: 'flex-start', marginTop: '-2px' }}>:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobileView ? '12px' : '15px', fontWeight: 700, lineHeight: 1 }}>
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '5px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>min</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, alignSelf: 'flex-start', marginTop: '-2px' }}>:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobileView ? '12px' : '15px', fontWeight: 700, lineHeight: 1 }}>
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '5px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>sec</span>
                      </div>
                    </div>
                  </div>

                  <button
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
                    {bannerConfig?.cta || 'CLAIM OFFER'}
                  </button>
                </div>

                {/* Bouquet Illustration SVG on the right */}
                <svg viewBox="0 0 100 100" style={{
                  width: isMobileView ? '54px' : '82px',
                  height: isMobileView ? '54px' : '82px',
                  marginTop: isMobileView ? '4px' : 0,
                  marginRight: isMobileView ? 0 : '-8px',
                  zIndex: 1,
                  flexShrink: 0
                }}>
                  <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M48 66 L50 44" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M54 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M44 58 Q48 60 52 58" fill="none" stroke="#8c8d82" strokeWidth="1.5" />
                  <path d="M45 59 L40 70" stroke="#8c8d82" strokeWidth="1.2" />
                  <path d="M51 59 L56 70" stroke="#8c8d82" strokeWidth="1.2" />
                  <path d="M35 44 Q42 42 43 36 Q38 39 35 44" fill="#7a806c" />
                  <path d="M61 44 Q54 42 53 36 Q58 39 61 44" fill="#7a806c" />
                  <circle cx="48" cy="32" r="6" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                  <circle cx="48" cy="32" r="2" fill="#e5ded3" />
                  <circle cx="40" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                  <circle cx="40" cy="39" r="1.5" fill="#e5ded3" />
                  <circle cx="56" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                  <circle cx="56" cy="39" r="1.5" fill="#e5ded3" />
                  <circle cx="48" cy="42" r="4.5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                  <circle cx="48" cy="42" r="1.2" fill="#e5ded3" />
                  <circle cx="28" cy="35" r="1.5" fill="#ffffff" />
                  <rect x="66" y="32" width="2" height="2" fill="#ffffff" transform="rotate(30)" />
                  <rect x="34" y="24" width="1.5" height="1.5" fill="#ffffff" />
                  <circle cx="58" cy="24" r="1.5" fill="#ffffff" />
                </svg>
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
                <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', color: '#bfa38a', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {bannerConfig?.code ? bannerConfig.code.replace(/{code}/g, activeCampaign?.discountCode || 'HAPPYANI') : 'EXCLUSIVE OFFER'}
                </span>
                <h3 style={{
                  fontSize: isMobileView ? '13px' : '15px',
                  fontWeight: 700,
                  margin: 0,
                  color: bannerStyle.titleColor,
                  textTransform: 'uppercase',
                  fontFamily: bannerStyle.font
                }}>
                  {(() => {
                    let text = bannerConfig?.title || '';
                    const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                    return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal);
                  })()}
                </h3>
                <p style={{
                  fontSize: isMobileView ? '9px' : '10px',
                  lineHeight: 1.3,
                  color: bannerStyle.subtitleColor,
                  margin: '0 0 4px 0',
                  maxWidth: '240px'
                }}>
                  {(() => {
                    let text = bannerConfig?.subtitle || '';
                    const discountVal = activeCampaign?.discount ? `${activeCampaign.discount}%` : '30%';
                    const expDate = new Date(); expDate.setDate(expDate.getDate() + 14);
                    const expFormatted = expDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    return text.replace(/{discount-value}/g, discountVal).replace(/{discount_value}/g, discountVal).replace(/{exp-date}/g, expFormatted).replace(/{exp_date}/g, expFormatted);
                  })()}
                </p>

                {/* Double small bouquets below text */}
                <div style={{ display: 'flex', gap: '4px', margin: '3px 0' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '18px', height: '18px' }}>
                    <circle cx="48" cy="32" r="7" fill="#ffffff" stroke="#dcdcdc" strokeWidth="1" />
                    <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="4" />
                  </svg>
                  <svg viewBox="0 0 100 100" style={{ width: '18px', height: '18px' }}>
                    <circle cx="48" cy="32" r="7" fill="#ffffff" stroke="#dcdcdc" strokeWidth="1" />
                    <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="4" />
                  </svg>
                </div>

                <button
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
                  {bannerConfig?.cta || 'CLAIM OFFER'}
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
          'relative overflow-hidden group cursor-pointer min-w-0 w-full max-w-full',
          centerVideosLayout && 'masonry-grid-video-item'
        )}
        style={isHorizontal ? {
          flex: useFixedVideoTile
            ? `0 1 ${VIDEO_TILE_MAX_WIDTH_PX}px`
            : `${tileAspectRatio} 1 ${baseRowHeight * tileAspectRatio}px`,
          aspectRatio: useFixedVideoTile ? String(VIDEO_TILE_ASPECT) : String(tileAspectRatio),
          maxWidth: useFixedVideoTile ? undefined : '100%',
          margin: 0
        } : {
          width: '100%'
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
                  aria-label="Download"
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
  };

  if (!isHorizontal) {
    return (
      <Motion.div
        key={photoListKey}
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          'w-full max-w-full min-w-0 masonry-grid-container flex items-start',
          (isPreviewMobile || isMobileViewport) && 'preview-mobile',
          className
        )}
        style={{
          gap: `${gap}px`
        }}
      >
        {columns.map((columnItems, colIdx) => (
          <div 
            key={colIdx} 
            className="flex-1 flex flex-col min-w-0"
            style={{ gap: `${gap}px` }}
          >
            {columnItems.map((photo, idx) => {
              if (photo.isPromoBanner) {
                return renderPromoCard(photo);
              }
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
        if (photo.isPromoBanner) {
          return renderPromoCard(photo);
        }
        return renderPhotoItem(photo, index);
      })}
    </Motion.div>
  );
}
