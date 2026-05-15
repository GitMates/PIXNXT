import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Share2, Link as LinkIcon, Download, Heart, Play } from 'lucide-react';
import { MasonryGrid } from '../../Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../Gallery/PhotoLightbox/PhotoLightbox';
import { downloadPhotoFromR2 } from '../../../../lib/downloadPhoto';
import { DownloadModal } from '../../Gallery/DownloadModal/DownloadModal';
import { galleryService } from '../../../../services/gallery.service';
import { sortPhotosForGallery, normalizeGalleryPhotoSort } from '../../../../lib/galleryPhotoSort';

function normalizeFavoritePhotoId(id: string | number | null | undefined): string | null {
  if (id == null || id === '') return null;
  return String(id);
}

export const GalleryPreview: React.FC<GalleryPreviewProps> = ({
  settings,
  collectionTitle,
  collectionDate,
  collectionDescription,
  coverPhotoUrl,
  gridPhotos,
  dashboardState,
  onSetActiveSet,
  photographerName = 'PHOTOGRAPHER'
}) => {
  const { coverStyle, fontFamily, colorPalette, grid } = settings;

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + "/gallery/" + (dashboardState?.collection?.slug || '') : '';
  const shareTitle = collectionTitle || dashboardState?.collection?.name || 'Collection';
  const shareText = `Check out this collection: ${shareTitle}`;

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  // Build a collection-shaped object the shared DownloadModal understands
  // Note: dashboardState.downloadPin is the boolean toggle, pinValue is the actual PIN string
  const downloadCollection = {
    ...dashboardState?.collection,
    name: collectionTitle || dashboardState?.collection?.name,
    download_pin: (dashboardState?.downloadPin && dashboardState?.pinValue) ? dashboardState.pinValue : null,
    email_capture_enabled: dashboardState?.emailTracking ?? false,
    require_pin_for_single_photo: dashboardState?.requirePinForSinglePhoto ?? true,
    downloads_enabled: dashboardState?.photoDownload !== false,
    gallery_download_enabled: dashboardState?.galleryDownload !== false,
    single_photo_download_enabled: dashboardState?.singlePhotoDownload !== false,
  };

  const collectionId = dashboardState?.collection?.id as string | undefined;
  const favFeatureOn = dashboardState?.favoritePhotos !== false;
  const storageKey = collectionId ? `pixnxt_fav_email_${collectionId}` : null;

  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [favoritedPhotos, setFavoritedPhotos] = useState<string[]>([]);
  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState<string | null>(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Scale preview grid to match public gallery layout.
  // Strategy: render MasonryGrid in a 1280px-wide div (matching the live gallery viewport),
  // then apply transform:scale so it visually fits the preview pane.
  // We track the inner div's LAYOUT height (unaffected by transform) via ResizeObserver
  // and set the outer container's height to innerHeight*scale so the canvas doesn't collapse.
  // Scale preview grid to match public gallery layout dynamically based on current viewport.
  const [galleryRefWidth, setGalleryRefWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const innerGridRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(0.45);
  const [innerGridH, setInnerGridH] = useState(0);

  const getPadding = (w: number) => {
    if (w >= 1024) return '0 48px'; // lg:px-12
    if (w >= 768) return '0 32px'; // md:px-8
    return '0 16px'; // px-4
  };

  useEffect(() => {
    let outerObs: ResizeObserver | null = null;
    let innerObs: ResizeObserver | null = null;

    const setup = () => {
      const outer = gridWrapperRef.current;
      const inner = innerGridRef.current;
      if (!outer || !inner) return;

      outerObs = new ResizeObserver(() => {
        const w = outer.offsetWidth;
        if (w > 0) setGridScale(w / window.innerWidth);
      });
      innerObs = new ResizeObserver(() => {
        const h = inner.offsetHeight;
        if (h > 0) setInnerGridH(h);
      });
      outerObs.observe(outer);
      innerObs.observe(inner);
    };

    const handleResize = () => {
      setGalleryRefWidth(window.innerWidth);
      const outer = gridWrapperRef.current;
      if (outer && outer.offsetWidth > 0) {
        setGridScale(outer.offsetWidth / window.innerWidth);
      }
    };
    window.addEventListener('resize', handleResize);

    const raf = requestAnimationFrame(setup);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      outerObs?.disconnect();
      innerObs?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!favFeatureOn) setShowOnlyFavorites(false);
  }, [favFeatureOn]);

  useEffect(() => {
    if (!storageKey || !collectionId) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await galleryService.createOrGetSession(collectionId, saved);
        if (cancelled) return;
        setSessionId(session.id);
        const favs = await galleryService.getFavorites(session.id);
        setFavoritedPhotos((favs || []).map(normalizeFavoritePhotoId).filter(Boolean) as string[]);
        setEmail(saved);
      } catch (e) {
        console.error('Preview: failed to restore favorite session', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId, storageKey]);

  const photosForActiveSet = useMemo(() => {
    const activeId = dashboardState?.activeSetId;
    return activeId
      ? gridPhotos.filter((p: any) => p.set_id === activeId)
      : gridPhotos.filter((p: any) => !p.set_id || p.set_id == null);
  }, [gridPhotos, dashboardState?.activeSetId]);

  const gallerySortKey = normalizeGalleryPhotoSort(dashboardState?.galleryPhotoSort);

  const photosSortedForGrid = useMemo(
    () => sortPhotosForGallery(photosForActiveSet, gallerySortKey),
    [photosForActiveSet, gallerySortKey]
  );

  const filteredPhotos = useMemo(() => {
    if (!showOnlyFavorites) return photosSortedForGrid;
    const favSet = new Set(favoritedPhotos);
    return photosSortedForGrid.filter(
      (p: any) => p.id != null && favSet.has(normalizeFavoritePhotoId(p.id) as string)
    );
  }, [photosSortedForGrid, showOnlyFavorites, favoritedPhotos]);

  const setDescriptionText = useMemo(() => {
    const raw = dashboardState?.activeSetId
      ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.description
      : (collectionDescription || dashboardState?.collection?.description || dashboardState?.sets?.[0]?.description);
    return typeof raw === 'string' ? raw.trim() : '';
  }, [
    dashboardState?.activeSetId,
    dashboardState?.sets,
    dashboardState?.collection?.description,
    collectionDescription,
  ]);

  const photoUrls = useMemo(
    () => filteredPhotos.map((p: any) => p.full_url || p.web_url || p.thumbnail_url),
    [filteredPhotos]
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSlideshowActive && lightboxIndex !== -1) {
      interval = setInterval(() => {
        setLightboxIndex((prev) => {
          const n = filteredPhotos.length;
          if (n < 1) return -1;
          return (prev + 1) % n;
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isSlideshowActive, lightboxIndex, filteredPhotos]);

  useEffect(() => {
    const n = filteredPhotos.length;
    setLightboxIndex((idx) => {
      if (idx < 0) return idx;
      if (n === 0) return -1;
      if (idx >= n) return n - 1;
      return idx;
    });
  }, [filteredPhotos]);

  const handleFavoriteEmailSubmit = async () => {
    if (!email?.trim()) {
      alert('Enter a valid email.');
      return;
    }
    if (!collectionId) {
      alert('Save your collection before using favorites in preview.');
      return;
    }
    if (!favFeatureOn) return;
    try {
      setIsSubmittingEmail(true);
      const session = await galleryService.createOrGetSession(collectionId, email.trim());
      setSessionId(session.id);
      if (storageKey) localStorage.setItem(storageKey, email.trim());

      const favs = await galleryService.getFavorites(session.id);
      const newFavs = (favs || []).map(normalizeFavoritePhotoId).filter(Boolean) as string[];

      const pending = normalizeFavoritePhotoId(pendingFavoritePhotoId);
      if (pending) {
        if (!newFavs.includes(pending)) {
          await galleryService.toggleFavorite(session.id, pending, true);
          newFavs.push(pending);
        }
        setPendingFavoritePhotoId(null);
      }

      setFavoritedPhotos(newFavs);
      setShowFavoriteModal(false);
    } catch (e) {
      console.error('Preview favorites setup failed:', e);
      alert('Failed to save email. Please try again.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleFavoriteHeaderClick = () => {
    if (!favFeatureOn) return;
    if (sessionId) {
      if (favoritedPhotos.length === 0 && !showOnlyFavorites) {
        alert("You haven't favorited any photos yet. Use the heart on a photo or in the slideshow viewer.");
      } else {
        setShowOnlyFavorites(!showOnlyFavorites);
      }
    } else {
      setPendingFavoritePhotoId(null);
      setShowFavoriteModal(true);
    }
  };

  const handleFavoritePhotoToggle = async (photoId: string | number | null | undefined) => {
    if (!favFeatureOn) return;
    const pid = normalizeFavoritePhotoId(photoId);
    if (!pid) return;

    if (sessionId) {
      const isCurrentlyFavorited = favoritedPhotos.includes(pid);
      try {
        await galleryService.toggleFavorite(sessionId, pid, !isCurrentlyFavorited);
        setFavoritedPhotos((prev) =>
          isCurrentlyFavorited ? prev.filter((id) => id !== pid) : [...prev, pid]
        );
      } catch (e) {
        console.error('Preview: toggle favorite failed', e);
      }
    } else {
      if (!collectionId) {
        alert('Save your collection before favoriting in preview.');
        return;
      }
      setPendingFavoritePhotoId(pid);
      setShowFavoriteModal(true);
    }
  };

  const handleStartSlideshow = () => {
    if (filteredPhotos.length < 1) return;
    setLightboxIndex(0);
    setIsSlideshowActive(true);
  };

  const handleDownloadClick = async (photo?: any) => {
    const needsEmail = !!dashboardState?.emailTracking;

    // downloadPin is a boolean toggle; only consider PIN required if toggle is ON and a PIN value exists
    const hasPin = !!((dashboardState?.downloadPin && dashboardState?.pinValue) || dashboardState?.collection?.download_pin || dashboardState?.collection?.download_pin_hash);

    // Check if PIN is required for single photo downloads
    const pinRequiredForSingle = dashboardState?.requirePinForSinglePhoto !== false;

    const needsPin = hasPin && (!photo || pinRequiredForSingle);

    if (photo) {
      if (!needsPin && !needsEmail) {
        // Only download directly if auth is NOT required
        await downloadPhotoFromR2(photo.full_url, photo.filename || 'photo.jpg');
      } else {
        setSelectedDownloadPhoto(photo);
        setShowDownloadModal(true);
      }
    } else {
      // Gallery/bulk download: always show modal
      setSelectedDownloadPhoto(null);
      setShowDownloadModal(true);
    }
  };

  const renderCover = () => {
    const props = {
      title: collectionTitle,
      date: collectionDate,
      photoUrl: coverPhotoUrl,
      focalX: dashboardState?.focalX,
      focalY: dashboardState?.focalY,
      isPreview: true,
    };

    switch (coverStyle) {
      case 'center': return <Covers.CenterCover {...props} />;
      case 'left': return <Covers.LeftCover {...props} />;
      case 'novel': return <Covers.NovelCover {...props} />;
      case 'vintage': return <Covers.VintageCover {...props} />;
      case 'frame': return <Covers.FrameCover {...props} />;
      case 'stripe': return <Covers.StripeCover {...props} />;
      case 'divider': return <Covers.DividerCover {...props} />;
      case 'journal': return <Covers.JournalCover {...props} />;
      case 'stamp': return <Covers.StampCover {...props} />;
      case 'outline': return <Covers.OutlineCover {...props} />;
      case 'classic': return <Covers.ClassicCover {...props} />;
      case 'none': return null;
      default: return <Covers.NovelCover {...props} />;
    }
  };

  return (
    <div className={cn(
      'cd-preview-gallery-card',
      `style-${coverStyle}`,
      `font-${fontFamily}`,
      `theme-${colorPalette}`
    )}>
      <div className="cd-preview-gallery-header">
        {renderCover()}
      </div>

      <div className={cn(
        'cd-preview-gallery-body',
        `grid-style-${grid.style}`,
        `grid-size-${grid.size}`,
        `grid-spacing-${grid.spacing}`,
        `nav-style-${grid.navigation}`,
        `aspect-${grid.aspectRatio}`
      )}>
        <div className="sticky top-0 z-[40] flex items-center justify-between w-full px-3 md:px-6 py-3 md:py-4 border-b border-black/5 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 15%)' }}>
          {/* Left: Brand section (Matches Pixieset) */}
          <div className="flex-[0.8] flex flex-col items-start min-w-[80px] md:min-w-[120px]">
            <span className="text-[10px] md:text-[14px] font-serif font-bold uppercase leading-none tracking-tight truncate w-full" style={{ color: 'var(--gallery-text)' }}>
              {collectionTitle}
            </span>
            {photographerName && (
              <span className="mt-0.5 text-[6px] md:text-[7px] font-bold uppercase tracking-[0.15em] opacity-60 truncate w-full" style={{ color: 'var(--gallery-text)' }}>
                {photographerName}
              </span>
            )}
          </div>

          {/* Center: Sets Navigation */}
          <div className="flex-1 flex items-center justify-center gap-3 md:gap-8">
            <button
              type="button"
              className="group relative py-1"
              onClick={() => onSetActiveSet?.(null)}
            >
              <span
                className={cn(
                  "text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] md:tracking-[0.15em] transition-opacity",
                  !dashboardState?.activeSetId ? "opacity-100" : "opacity-45 hover:opacity-100"
                )}
                style={{ color: 'var(--gallery-text)' }}
              >
                Highlights
              </span>
              {!dashboardState?.activeSetId && (
                <div
                  className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100"
                  style={{ backgroundColor: 'var(--gallery-text)' }}
                />
              )}
            </button>
            {dashboardState?.sets && dashboardState.sets.length > 0 &&
              dashboardState.sets
                .filter((s: any) => s.name?.toLowerCase() !== 'highlights')
                .slice(0, isPreviewMobile ? 1 : 3)
                .map((set: any) => (
                  <button
                    key={set.id}
                    type="button"
                    className="group relative py-1"
                    onClick={() => onSetActiveSet?.(set.id)}
                  >
                    <span
                      className={cn(
                        "text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] md:tracking-[0.15em] transition-opacity",
                        dashboardState?.activeSetId === set.id ? "opacity-100" : "opacity-45 hover:opacity-100"
                      )}
                      style={{ color: 'var(--gallery-text)' }}
                    >
                      {set.name}
                    </span>
                    {dashboardState?.activeSetId === set.id && (
                      <div
                        className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100"
                        style={{ backgroundColor: 'var(--gallery-text)' }}
                      />
                    )}
                  </button>
                ))
            }
          </div>

          {/* Right: Action Icons (Order & Labels match Pixieset) */}
          <div className="flex-[0.8] flex items-center justify-end gap-2 md:gap-5">
            {favFeatureOn && (
              <button
                type="button"
                className="flex items-center gap-1 md:gap-2 opacity-60 hover:opacity-100 transition-opacity"
                onClick={handleFavoriteHeaderClick}
                style={{ color: 'var(--gallery-text)' }}
              >
                <Heart size={12} md:size={13} fill={favoritedPhotos.length > 0 ? 'currentColor' : 'none'} />
                <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-[0.1em] hidden xl:inline">Favorites</span>
              </button>
            )}
            {dashboardState?.photoDownload !== false && dashboardState?.galleryDownload !== false && (
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 md:gap-2 transition-opacity",
                  isDownloadingAll ? "opacity-100" : "opacity-60 hover:opacity-100"
                )}
                onClick={() => !isDownloadingAll && handleDownloadClick()}
                style={{ color: 'var(--gallery-text)' }}
              >
                <Download size={12} md:size={13} className={isDownloadingAll ? 'animate-bounce' : ''} />
                <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-[0.1em] hidden xl:inline">Download</span>
              </button>
            )}
            {dashboardState?.socialSharing !== false && (
              <button
                type="button"
                className="flex items-center gap-1 md:gap-2 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => setShowShareModal(true)}
                style={{ color: 'var(--gallery-text)' }}
              >
                <Share2 size={12} md:size={13} />
                <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-[0.1em] hidden xl:inline">Share</span>
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-1 md:gap-2 opacity-60 hover:opacity-100 transition-opacity"
              onClick={handleStartSlideshow}
              style={{ color: 'var(--gallery-text)' }}
            >
              <Play size={12} md:size={13} fill="currentColor" />
              <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-[0.1em] hidden xl:inline">Slideshow</span>
            </button>
          </div>
        </div>

        {setDescriptionText ? (
          <div
            className={cn(
              '-mx-10 border-b px-6 py-5 text-center md:px-10 md:py-6',
              colorPalette === 'dark' ? 'border-white/10' : 'border-black/5'
            )}
            style={{ backgroundColor: 'var(--gallery-bg)' }}
          >
            <p
              className="mx-auto max-w-2xl whitespace-pre-wrap text-[13px] font-light leading-relaxed tracking-wide md:text-[15px]"
              style={{ color: 'var(--gallery-text)' }}
            >
              {setDescriptionText}
            </p>
          </div>
        ) : null}

        {showOnlyFavorites && favFeatureOn && (
          <div
            className="flex flex-wrap items-center justify-center gap-2 border-b border-black/5 px-4 py-2 text-center"
            style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">
              My favorites ({filteredPhotos.length})
            </span>
            <button
              type="button"
              className="text-[8px] font-bold uppercase tracking-widest underline opacity-90 hover:opacity-60"
              style={{ color: 'var(--gallery-text)' }}
              onClick={() => setShowOnlyFavorites(false)}
            >
              Show all
            </button>
          </div>
        )}

        {/* transform:scale grid:
            - inner div is position:absolute → taken out of flow → parent stays at pane width
            - MasonryGrid sees a true 1280px container → same column widths as public gallery
            - scale(gridScale) shrinks the visual rendering to fit the pane
            - outer overflow:hidden clips at its own boundary (not the 1280px layout box)
            - explicit outer height = innerGridH * gridScale keeps the canvas the right size */}
        <div
          ref={gridWrapperRef}
          style={{
            backgroundColor: 'var(--gallery-bg)',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            /* Fallback height while ResizeObserver fires on the first frame */
            height: innerGridH > 0 ? `${innerGridH * gridScale}px` : `${200 * gridScale}px`,
          }}
        >
          <div
            ref={innerGridRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${galleryRefWidth}px`,
              transform: `scale(${gridScale})`,
              transformOrigin: 'top left',
              padding: getPadding(galleryRefWidth),
            }}
          >
            <MasonryGrid
              key={`${grid.style}-${grid.size}-${grid.spacing}`}
              photos={filteredPhotos}
              gridSettings={grid}
              isHorizontal={grid.style?.toLowerCase() === 'horizontal'}
              onImageClick={(index) => setLightboxIndex(index)}
              onFavorite={(photo: any) => handleFavoritePhotoToggle(photo.id)}
              onDownload={handleDownloadClick}
              onShare={() => { }}
              showDownload={dashboardState?.photoDownload !== false && dashboardState?.singlePhotoDownload !== false}
              showFavorite={favFeatureOn}
              showShare={dashboardState?.socialSharing !== false}
              favoritedPhotoIds={favoritedPhotos}
              customRowHeight={grid.size === 'large' ? 420 : grid.size === 'regular' ? 300 : grid.size === 'small' ? 200 : 140}
              customColumnCount={grid.size === 'large' ? 2 : grid.size === 'regular' ? 3 : 4}
              showFilename={dashboardState?.showFilenameInGrid === true}
              forceShow={true}
            />
          </div>
        </div>
      </div>

      <PhotoLightbox
        isOpen={lightboxIndex !== -1}
        onClose={() => {
          setLightboxIndex(-1);
          setIsSlideshowActive(false);
        }}
        images={photoUrls}
        currentIndex={lightboxIndex}
        onNext={() =>
          setLightboxIndex((prev) => {
            const n = photoUrls.length;
            if (n < 1) return -1;
            return (prev + 1) % n;
          })
        }
        onPrev={() =>
          setLightboxIndex((prev) => {
            const n = photoUrls.length;
            if (n < 1) return -1;
            return (prev - 1 + n) % n;
          })
        }
        isSlideshowActive={isSlideshowActive}
        onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
        onFavorite={() => {
          const photo = filteredPhotos[lightboxIndex];
          if (photo) void handleFavoritePhotoToggle(photo.id);
        }}
        onDownload={() => handleDownloadClick(filteredPhotos[lightboxIndex])}
        onShare={() => { }}
        showDownload={dashboardState?.photoDownload !== false && dashboardState?.singlePhotoDownload !== false}
        showFavorite={favFeatureOn}
        showShare={dashboardState?.socialSharing !== false}
        favoriteCount={favFeatureOn ? favoritedPhotos.length : undefined}
        isFavorited={(() => {
          const id = normalizeFavoritePhotoId(filteredPhotos[lightboxIndex]?.id);
          return !!id && favoritedPhotos.includes(id);
        })()}
      />

      <AnimatePresence>
        {showFavoriteModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFavoriteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative z-[1] w-full max-w-md bg-white p-10 shadow-2xl"
              style={{ fontFamily: 'var(--font-sans)', color: '#111' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowFavoriteModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Mail className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Favorites</h3>
                <p className="text-sm text-zinc-500">Save your favorite photos and revisit them at any time using your email address.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmittingEmail}
                  className="w-full border-b border-zinc-200 py-3 text-sm outline-none focus:border-zinc-950 transition-colors bg-transparent disabled:opacity-50"
                  style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                />
                <button
                  type="button"
                  className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-4 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleFavoriteEmailSubmit()}
                  disabled={isSubmittingEmail || !email?.trim()}
                >
                  {isSubmittingEmail ? 'Setting up…' : 'Go to Favorites'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => {
          setShowDownloadModal(false);
          setSelectedDownloadPhoto(null);
        }}
        collection={downloadCollection}
        photos={gridPhotos}
        sets={dashboardState?.sets || []}
        initialPhoto={selectedDownloadPhoto}
        initialSetId={dashboardState?.activeSetId || 'all'}
      />

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white p-10 shadow-2xl"
              style={{ fontFamily: 'var(--font-sans)', color: '#111' }}
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900" style={{ fontFamily: 'var(--font-serif)' }}>Share Collection</h3>
                <p className="text-sm text-zinc-500">Share these memories with family and friends.</p>
              </div>

              <div className="flex justify-center gap-10 mb-10">
                <button 
                  onClick={handleEmailShare}
                  className="flex flex-col items-center gap-3 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity group"
                >
                  <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-zinc-200 transition-colors">
                    <Mail size={24} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Email</span>
                </button>
                <button 
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center gap-3 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity group"
                >
                  <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">WhatsApp</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                  <span className="bg-white px-4">Or copy link</span>
                </div>
              </div>

              <div className="mt-6 flex border border-zinc-200 rounded overflow-hidden p-1">
                <input
                  type="text"
                  readOnly
                  value={window.location.origin + "/gallery/" + (dashboardState?.collection?.slug || 'preview')}
                  className="flex-1 px-3 text-sm text-zinc-500 outline-none bg-zinc-50 border-none"
                />
                <button className="bg-zinc-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors border-none cursor-pointer rounded-sm flex items-center gap-2">
                  <LinkIcon size={14} />
                  Copy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
