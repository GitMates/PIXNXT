import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { ShareCollectionModal } from '../../Gallery/ShareCollectionModal/ShareCollectionModal';
import { MasonryGrid } from '../../Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../Gallery/PhotoLightbox/PhotoLightbox';
import { downloadPhotoFromR2 } from '../../../../lib/downloadPhoto';
import { DownloadModal } from '../../Gallery/DownloadModal/DownloadModal';
import { galleryService } from '../../../../services/gallery.service';
import { sortPhotosForGallery, normalizeGalleryPhotoSort } from '../../../../lib/galleryPhotoSort';
import {
  GalleryStickyNav,
  GallerySetHeading,
  GallerySetDescription,
} from '../../Gallery/GalleryChrome';
import {
  isCollectionFeatureEnabled,
  isSlideshowEnabledForCollection,
} from '../../../../lib/collectionFeatureFlags';
import {
  countGalleryMedia,
  filterGalleryMediaByType,
  shouldShowGalleryMediaFilter,
  type GalleryMediaFilterValue,
} from '../../../../lib/galleryMediaType';
import { normalizeNavigationStyle } from '../../../../lib/navStyle';
import './GalleryPreview.css';

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
  photographerName = 'PHOTOGRAPHER',
  isPreviewMobile = false,
}) => {
  const { coverStyle, fontFamily, colorPalette, grid } = settings;
  const navigationStyle = normalizeNavigationStyle(grid.navigation);

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  const collectionSlug = dashboardState?.collection?.slug as string | undefined;
  const shareUrl = typeof window !== 'undefined'
    ? window.location.origin + '/gallery/' + (collectionSlug || 'preview')
    : '';
  const shareTitle = collectionTitle || dashboardState?.collection?.name || 'Collection';
  const isPreviewDark = colorPalette === 'dark';

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
    selected_download_sets: dashboardState?.selectedDownloadSets,
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
  const [mediaFilter, setMediaFilter] = useState<GalleryMediaFilterValue>('photos');

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

  const mediaCounts = useMemo(() => countGalleryMedia(photosSortedForGrid), [photosSortedForGrid]);

  useEffect(() => {
    if (mediaCounts.photos > 0) setMediaFilter('photos');
    else if (mediaCounts.videos > 0) setMediaFilter('videos');
  }, [dashboardState?.activeSetId, mediaCounts.photos, mediaCounts.videos]);

  const showMediaFilter = shouldShowGalleryMediaFilter(mediaCounts);

  const filteredPhotos = useMemo(() => {
    let list = photosSortedForGrid;
    if (showOnlyFavorites) {
      const favSet = new Set(favoritedPhotos);
      list = list.filter(
        (p: any) => p.id != null && favSet.has(normalizeFavoritePhotoId(p.id) as string)
      );
    }
    if (showMediaFilter) {
      list = filterGalleryMediaByType(list, mediaFilter);
    }
    return list;
  }, [photosSortedForGrid, showOnlyFavorites, favoritedPhotos, showMediaFilter, mediaFilter]);

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

  const activeSetLabel = useMemo(() => {
    const raw = dashboardState?.activeSetId
      ? dashboardState.sets?.find((s: any) => s.id === dashboardState.activeSetId)?.name
      : 'Highlights';
    return String(raw || 'Highlights').toLowerCase();
  }, [dashboardState?.activeSetId, dashboardState?.sets]);

  const photoUrls = useMemo(
    () => filteredPhotos.map((p: any) => p.full_url || p.web_url || p.thumbnail_url),
    [filteredPhotos]
  );

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

      // Broadcast update to dashboard
      const channel = new BroadcastChannel('pixnxt-gallery-update');
      channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collectionId });
      channel.close();
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

        // Broadcast update to dashboard
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collectionId });
        channel.close();
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

        // Log activity for direct download
        if (collectionId) {
          const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collectionId}`) || 'Visitor';
          await galleryService.logActivity(collectionId, 'download', {
            email: savedEmail,
            photographerId: dashboardState?.collection?.user_id,
            photoId: photo.id,
            metadata: {
              type: photo.media_type === 'video' ? 'video' : 'photo',
              resolution: 'High Res',
              source: 'Preview Direct'
            }
          });

          // Broadcast update to dashboard
          const channel = new BroadcastChannel('pixnxt-gallery-update');
          channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collectionId });
          channel.close();
        }
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
      subtitle: photographerName,
      date: collectionDate,
      photoUrl: coverPhotoUrl,
      focalX: dashboardState?.focalX,
      focalY: dashboardState?.focalY,
      isPreview: true, // dashboard pane layout only
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
    <div
      className={cn(
        'cd-preview-gallery-card',
        `style-${coverStyle}`,
        `font-${fontFamily}`,
        `theme-${colorPalette}`
      )}
      data-cover-text-scale="compact"
    >
      <div className="cd-preview-gallery-header">
        {renderCover()}
      </div>

      <div
        className={cn(
          'cd-preview-gallery-body',
          `grid-style-${grid.style}`,
          `grid-size-${grid.size}`,
          `grid-spacing-${grid.spacing}`,
          `nav-style-${navigationStyle}`,
          isPreviewMobile && 'cd-preview-gallery-body--mobile-frame',
          `aspect-${grid.aspectRatio}`
        )}
      >
        <GalleryStickyNav
          isPreview
          isPreviewMobile={isPreviewMobile}
          navigationStyle={navigationStyle}
          collectionTitle={collectionTitle}
          photographerName={photographerName}
          sets={(dashboardState?.sets || []).map((s: any) => ({ id: s.id, name: s.name }))}
          activeSetId={dashboardState?.activeSetId ?? null}
          onSetChange={onSetActiveSet}
          showHighlightsTab={dashboardState?.collection?.highlights_enabled !== false}
          maxVisibleSets={isPreviewMobile ? 4 : 3}
          showFavorites={favFeatureOn}
          showDownload={
            isCollectionFeatureEnabled(dashboardState?.photoDownload) &&
            isCollectionFeatureEnabled(dashboardState?.galleryDownload)
          }
          showShare={isCollectionFeatureEnabled(dashboardState?.socialSharing)}
          showSlideshow={isSlideshowEnabledForCollection({
            id: dashboardState?.collection?.id,
            slideshow_enabled:
              dashboardState?.collection?.slideshow_enabled ?? dashboardState?.slideshow,
            slideshow: dashboardState?.collection?.slideshow,
          })}
          favoritedCount={favoritedPhotos.length}
          isDownloadingAll={isDownloadingAll}
          onFavoriteClick={handleFavoriteHeaderClick}
          onDownloadClick={handleDownloadClick}
          onShareClick={() => setShowShareModal(true)}
          onSlideshowClick={handleStartSlideshow}
          mediaFilter={mediaFilter}
          onMediaFilterChange={setMediaFilter}
          mediaPhotoCount={mediaCounts.photos}
          mediaVideoCount={mediaCounts.videos}
        />

        {setDescriptionText ? (
          <GallerySetDescription variant="preview" text={setDescriptionText} isDark={isPreviewDark} />
        ) : (
          <GallerySetHeading variant="preview" label={activeSetLabel} />
        )}

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
            {filteredPhotos.length === 0 && showMediaFilter ? (
              <p
                className="gallery-body-text py-10 text-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 md:text-[11px]"
                style={{ color: 'var(--gallery-text)' }}
              >
                No {mediaFilter} in this set
              </p>
            ) : null}
            <MasonryGrid
              key={`${grid.style}-${grid.size}-${grid.spacing}-${mediaFilter}`}
              photos={filteredPhotos}
              gridSettings={grid}
              isHorizontal={grid.style?.toLowerCase() === 'horizontal'}
              onImageClick={(index) => {
                setLightboxIndex(index);
                setIsSlideshowActive(false);
              }}
              onFavorite={(photo: any) => handleFavoritePhotoToggle(photo.id)}
              onDownload={handleDownloadClick}
              onShare={() => setShowShareModal(true)}
              showPrivateBadge={Boolean(dashboardState?.collection?.client_exclusive_enabled)}
              showDownload={
                isCollectionFeatureEnabled(dashboardState?.photoDownload) &&
                isCollectionFeatureEnabled(dashboardState?.singlePhotoDownload)
              }
              showFavorite={favFeatureOn}
              showShare={isCollectionFeatureEnabled(dashboardState?.socialSharing)}
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
        showShare={isCollectionFeatureEnabled(dashboardState?.socialSharing)}
        favoriteCount={favFeatureOn ? favoritedPhotos.length : undefined}
        isFavorited={(() => {
          const id = normalizeFavoritePhotoId(filteredPhotos[lightboxIndex]?.id);
          return !!id && favoritedPhotos.includes(id);
        })()}
        themeClassName={cn(
          `theme-${colorPalette}`,
          `font-${fontFamily}`
        )}
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
              className={cn('relative z-[1] w-full max-w-md bg-white p-10 shadow-2xl', `font-${fontFamily}`)}
              style={{ color: '#111' }}
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
                <h3 className="gallery-heading mb-2 text-xl font-bold text-zinc-900">Favorites</h3>
                <p className="gallery-body-text text-sm text-zinc-500">Save your favorite photos and revisit them at any time using your email address.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmittingEmail}
                  className="gallery-body-text w-full border-b border-zinc-200 py-3 text-sm outline-none focus:border-zinc-950 transition-colors bg-transparent disabled:opacity-50"
                  style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                />
                <button
                  type="button"
                  className="gallery-body-text w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-4 disabled:cursor-not-allowed disabled:opacity-50"
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

      <ShareCollectionModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        shareTitle={shareTitle}
        collectionId={collectionId}
        isDark={isPreviewDark}
        initialSenderEmail={email}
        themeClassName={`font-${fontFamily} theme-${colorPalette}`}
      />
    </div>
  );
};
