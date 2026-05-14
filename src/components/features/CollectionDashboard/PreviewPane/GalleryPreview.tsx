import React, { useState, useMemo, useEffect } from 'react';
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
  onSetActiveSet
}) => {
  const { coverStyle, fontFamily, colorPalette, grid } = settings;

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

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
    const description = dashboardState?.activeSetId
      ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.description
      : (collectionDescription || dashboardState?.collection?.description || dashboardState?.sets?.[0]?.description);

    const props = {
      title: collectionTitle,
      date: collectionDate,
      description: description,
      photoUrl: coverPhotoUrl,
      focalX: dashboardState?.focalX,
      focalY: dashboardState?.focalY,
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
        <div className="sticky top-0 z-[40] flex items-center justify-between w-full px-10 py-4 border-b border-black/5 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 20%)' }}>
          {/* Left: Collection Title */}
          <div className="flex-1 flex items-center">
            <span className="text-[8px] gallery-heading" style={{ color: 'var(--gallery-text)' }}>
              {collectionTitle}
            </span>
          </div>

          {/* Center: Sets Navigation */}
          <div className="flex-1 flex items-center justify-center gap-8">
            <span 
              className={cn(
                "text-[8px] gallery-heading cursor-pointer transition-opacity", 
                !dashboardState?.activeSetId ? "opacity-100 border-b border-current pb-1" : "opacity-50 hover:opacity-100"
              )} 
              style={{ color: 'var(--gallery-text)' }}
              onClick={() => onSetActiveSet?.(null)}
            >
              Highlights
            </span>
            {dashboardState?.sets && dashboardState.sets.length > 0 && 
              dashboardState.sets
                .filter((s: any) => s.name?.toLowerCase() !== 'highlights')
                .slice(0, 5)
                .map((set: any) => (
                  <span 
                    key={set.id} 
                  className={cn(
                    "text-[8px] gallery-heading cursor-pointer hover:opacity-100 transition-opacity", 
                    dashboardState?.activeSetId === set.id ? "border-b border-current pb-1" : "opacity-50"
                  )} 
                  style={{ color: 'var(--gallery-text)' }}
                  onClick={() => onSetActiveSet?.(set.id)}
                >
                  {set.name}
                </span>
              ))
            }
          </div>

          {/* Right: Action Icons */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <div
              className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: 'var(--gallery-text)' }}
              onClick={handleStartSlideshow}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStartSlideshow();
                }
              }}
            >
              <Play size={14} fill="currentColor" />
              {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Slideshow</span>}
            </div>
            {favFeatureOn && (
              <div
                className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleFavoriteHeaderClick}
                style={{ color: 'var(--gallery-text)' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFavoriteHeaderClick();
                  }
                }}
              >
                <div className="relative">
                  <Heart size={14} fill={favoritedPhotos.length > 0 ? 'currentColor' : 'none'} />
                  {favoritedPhotos.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[7px] font-bold text-white">
                      {favoritedPhotos.length}
                    </span>
                  )}
                </div>
                {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Favorite</span>}
              </div>
            )}
            {dashboardState?.photoDownload !== false && dashboardState?.galleryDownload !== false && (
              <div
                className={cn(
                  "flex items-center gap-2 transition-opacity cursor-pointer",
                  isDownloadingAll ? "opacity-100" : "opacity-60 hover:opacity-100"
                )}
                onClick={() => !isDownloadingAll && handleDownloadClick()}
                style={{ color: 'var(--gallery-text)' }}
              >
                <Download size={14} className={isDownloadingAll ? 'animate-bounce' : ''} />
                {grid.navigation !== 'icon' && (
                  <span className="text-[8px] gallery-heading hidden lg:inline">
                    {isDownloadingAll
                      ? `${downloadProgress.done} / ${downloadProgress.total}`
                      : 'Download'}
                  </span>
                )}
              </div>
            )}
            {dashboardState?.socialSharing !== false && (
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setShowShareModal(true)} style={{ color: 'var(--gallery-text)' }}>
                <Share2 size={14} />
                {grid.navigation !== 'icon' && <span className="text-[8px] gallery-heading hidden lg:inline">Share</span>}
              </div>
            )}
          </div>
        </div>

        {/* Set Description */}
        {(() => {
          const description = dashboardState?.activeSetId
            ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.description
            : (collectionDescription || dashboardState?.collection?.description || dashboardState?.sets?.[0]?.description);

          if (!description) return null;

          return (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center" style={{ backgroundColor: 'var(--gallery-bg)' }}>
              <p className="text-[14px] md:text-[15px] leading-[1.8] tracking-[0.02em] opacity-70 max-w-2xl mx-auto whitespace-pre-wrap" style={{ color: 'var(--gallery-text)', fontWeight: 300 }}>
                {description}
              </p>
              <div className="w-12 h-px mt-12 opacity-20" style={{ backgroundColor: 'var(--gallery-text)' }}></div>
            </div>
          );
        })()}

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

        <div className="p-4" style={{ backgroundColor: 'var(--gallery-bg)' }}>
          <MasonryGrid
            key={`${grid.style}-${grid.size}-${grid.spacing}`}
            photos={filteredPhotos}
            gridSettings={grid}
            isHorizontal={grid.style?.toLowerCase() === 'horizontal'}
            onImageClick={(index) => setLightboxIndex(index)}
            onFavorite={(photo: any) => handleFavoritePhotoToggle(photo.id)}
            onDownload={handleDownloadClick}
            onShare={() => {}}
            showDownload={dashboardState?.photoDownload !== false && dashboardState?.singlePhotoDownload !== false}
            showFavorite={favFeatureOn}
            showShare={dashboardState?.socialSharing !== false}
            favoritedPhotoIds={favoritedPhotos}
            customRowHeight={grid.size === 'large' ? 155 : grid.size === 'regular' ? 111 : grid.size === 'small' ? 74 : 52}
            customColumnCount={grid.size === 'large' ? 2 : grid.size === 'regular' ? 3 : 4}
            showFilename={dashboardState?.showFilenameInGrid === true}
          />
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
        onShare={() => {}}
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

              <div className="flex justify-center gap-6 mb-8">
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">X</span>
                </button>
                <button className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                    <Mail size={20} />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email</span>
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
