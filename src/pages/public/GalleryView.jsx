import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useScroll, useTransform, AnimatePresence, motion } from 'framer-motion';
import * as Covers from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles';

import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../components/features/Gallery/PhotoLightbox/PhotoLightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { Container } from '../../components/ui/Container';
import { Typography } from '../../components/ui/Typography';
import { X, Mail, Lock, Share2, Link as LinkIcon, Download, Heart, Play } from 'lucide-react';
import { DownloadModal } from '../../components/features/Gallery/DownloadModal/DownloadModal';
import { downloadPhotoFromR2, downloadAllPhotosAsZip } from '../../lib/downloadPhoto';

const GalleryView = () => {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [email, setEmail] = useState('');
  const [downloadSize, setDownloadSize] = useState('high');
  const [activeSetId, setActiveSetId] = useState(null);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  // Favorites state
  const [sessionId, setSessionId] = useState(null);
  const [favoritedPhotos, setFavoritedPhotos] = useState([]);
  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [favoriteListPhotos, setFavoriteListPhotos] = useState([]);
  const [isFavoriteListMode, setIsFavoriteListMode] = useState(false);

  const handleFavoriteEmailSubmit = async () => {
    if (!email || !collection) return;
    try {
      setIsSubmittingEmail(true);
      const session = await galleryService.createOrGetSession(collection.id, email);
      setSessionId(session.id);
      localStorage.setItem(`pixnxt_fav_email_${collection.id}`, email);

      const favs = await galleryService.getFavorites(session.id);
      let newFavs = [...favs];

      if (pendingFavoritePhotoId) {
        if (!newFavs.includes(pendingFavoritePhotoId)) {
          await galleryService.toggleFavorite(session.id, pendingFavoritePhotoId, true);
          newFavs.push(pendingFavoritePhotoId);
        }
        setPendingFavoritePhotoId(null);
      }

      setFavoritedPhotos(newFavs);
      setShowFavoriteModal(false);
    } catch (e) {
      console.error("Failed to setup session/favorites:", e);
      alert("Failed to save email. Please try again.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  /** Toolbar "Favorite" — toggles My Favorites view only (never pass through lightbox/grid bugs). */
  const handleFavoriteHeaderClick = () => {
    if (!collection) return;

    if (sessionId) {
      if (favoritedPhotos.length === 0 && !showOnlyFavorites) {
        alert("You haven't favorited any photos yet. Click the heart icon on any photo to save it.");
      } else {
        setShowOnlyFavorites(!showOnlyFavorites);
      }
    } else {
      setPendingFavoritePhotoId(null);
      setShowFavoriteModal(true);
    }
  };

  /** Heart on a photo (grid overlay or lightbox) — toggles that photo only. */
  const handleFavoritePhotoToggle = async (photoId) => {
    if (!collection || !photoId) return;

    if (sessionId) {
      const isCurrentlyFavorited = favoritedPhotos.includes(photoId);
      try {
        await galleryService.toggleFavorite(sessionId, photoId, !isCurrentlyFavorited);
        setFavoritedPhotos((prev) =>
          isCurrentlyFavorited
            ? prev.filter((id) => id !== photoId)
            : [...prev, photoId]
        );
      } catch (e) {
        console.error('Failed to toggle favorite:', e);
      }
    } else {
      setPendingFavoritePhotoId(photoId);
      setShowFavoriteModal(true);
    }
  };

  const handleDownloadClick = async (photoOrEvent = null) => {
    // Distinguish between a photo object and a browser event
    const photo = (photoOrEvent && photoOrEvent.id) ? photoOrEvent : null;

    if (photo) {
      const needsEmail = !!collection?.email_capture_enabled || !!collection?.restrict_to_emails;

      // Check if PIN is required for single photo downloads
      const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
      const hasPin = !!(collection?.download_pin || collection?.pin_value || collection?.pinValue || collection?.download_pin_hash);
      const needsPin = hasPin && (!photo || pinRequiredForSingle);

      const hasDownloadLimit = !!collection?.download_limit_gallery;

      if (!needsEmail && !needsPin && !hasDownloadLimit) {
        // Single photo: download immediately from Cloudflare R2 if no auth required
        await downloadPhotoFromR2(photo.full_url, photo.filename || 'photo.jpg');
      } else {
        // Auth required: Open modal for single photo
        setSelectedDownloadPhoto(photo);
        setShowDownloadModal(true);
      }
    } else {
      // Gallery-wide download: Always show modal (matching GalleryPreview)
      setSelectedDownloadPhoto(null);
      setShowDownloadModal(true);
    }
  };

  const galleryRef = useRef(null);
  const { scrollY } = useScroll();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');
  const previewCoverStyle = searchParams.get('coverStyle');
  const previewFont = searchParams.get('font');
  const previewColor = searchParams.get('color');
  const previewGrid = searchParams.get('grid');

  const getEffectiveSettings = () => {
    if (!collection) return {
      cover_style: 'novel',
      font_family: 'sans',
      color_palette: 'light',
      grid_style: 'vertical',
      nav_style: 'icons'
    };
    return {
      cover_style: previewCoverStyle || collection.cover_style || 'novel',
      font_family: previewFont || collection.font_family || 'sans',
      color_palette: previewColor || collection.color_palette || 'light',
      grid_style: previewGrid || collection.grid_style || 'vertical',
      nav_style: collection.nav_style || 'icons'
    };
  };

  const effectiveSettings = getEffectiveSettings();
  const headerOpacity = useTransform(scrollY, [600, 800], [0, 1]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const data = await galleryService.getCollectionBySlug(slug);

        if (!data) {
          setError('Collection not found');
          return;
        }

        setCollection(data);

        if (data.photographer_id) {
          const p = await galleryService.getPhotographerProfile(data.photographer_id);
          setPhotographer(p);
        }

        // Check for existing session email
        const savedEmail = localStorage.getItem(`pixnxt_fav_email_${data.id}`);
        if (savedEmail) {
          try {
            const session = await galleryService.createOrGetSession(data.id, savedEmail);
            setSessionId(session.id);
            const favs = await galleryService.getFavorites(session.id);
            setFavoritedPhotos(favs);
            setEmail(savedEmail);
          } catch (e) {
            console.error("Failed to restore session:", e);
          }
        }
      } catch (err) {
        console.error('Gallery Fetch Error:', err);
        setError(err.message || 'An error occurred while loading the gallery');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchGallery();
  }, [slug]);

  useEffect(() => {
    const fetchFavoriteList = async () => {
      if (!listId) {
        setIsFavoriteListMode(false);
        setFavoriteListPhotos([]);
        return;
      }

      try {
        const photos = await galleryService.getFavoriteListPhotos(listId);
        setFavoriteListPhotos(photos);
        setIsFavoriteListMode(true);
        // Also ensure we scroll to gallery content if in this mode
        setTimeout(scrollToGallery, 500);
      } catch (err) {
        console.error('Failed to fetch favorite list photos:', err);
      }
    };

    fetchFavoriteList();
  }, [listId]);

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartSlideshow = () => {
    setLightboxIndex(0);
    setIsSlideshowActive(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';

      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();

      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return `${month} ${getOrdinal(day)}, ${year}`.toUpperCase();
    } catch (e) {
      return '';
    }
  };

  const filteredPhotos = useMemo(() => {
    if (!collection) return [];

    if (isFavoriteListMode) {
      return favoriteListPhotos || [];
    }

    let photos = activeSetId
      ? (collection.photos || []).filter(p => p.set_id === activeSetId)
      : (collection.photos || []).filter(p => !p.set_id);

    if (showOnlyFavorites) {
      photos = photos.filter(p => favoritedPhotos.includes(p.id));
    }
    return photos;
  }, [collection, activeSetId, showOnlyFavorites, favoritedPhotos, isFavoriteListMode, favoriteListPhotos]);

  const photoUrls = useMemo(() => filteredPhotos.map(p => p.full_url || p.web_url || p.thumbnail_url), [filteredPhotos]);

  // Slideshow: advance using the same list as the lightbox (filtered), not full collection length
  useEffect(() => {
    let interval;
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

  // Keep lightbox index valid when the visible grid shrinks (e.g. unfavorite in "My Favorites" mode)
  useEffect(() => {
    const n = filteredPhotos.length;
    setLightboxIndex((idx) => {
      if (idx < 0) return idx;
      if (n === 0) return -1;
      if (idx >= n) return n - 1;
      return idx;
    });
  }, [filteredPhotos]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-sm font-bold tracking-[0.6em] uppercase text-zinc-200 animate-pulse">
        PIXNXT
      </div>
    </div>
  );

  if (error || !collection) return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-white">
      <Typography variant="h2" className="mb-4">Gallery Not Found</Typography>
      <Typography variant="muted" className="mb-8">The collection you are looking for does not exist or is private.</Typography>
      <a href="/" className="text-[10px] font-bold underline uppercase tracking-[0.4em]">Back to Home</a>
    </div>
  );

  return (
    <div className={cn("min-h-screen transition-colors duration-500", `theme-${effectiveSettings.color_palette}`, `font-${effectiveSettings.font_family}`)} style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}>
      {/* Hero Section */}
      <div className="w-full h-[100dvh] [&>div]:!h-full">
        {(() => {
          const activePhotoUrl = collection.cover_url || (collection.photos?.[0]?.web_url);
          let extractedFocalX = 50;
          let extractedFocalY = 50;
          if (activePhotoUrl && activePhotoUrl.includes('#focal=')) {
            const match = activePhotoUrl.match(/#focal=([\d.]+),([\d.]+)/);
            if (match) {
              extractedFocalX = parseFloat(match[1]);
              extractedFocalY = parseFloat(match[2]);
            }
          }

          const props = {
            title: collection.name,
            date: formatDate(collection.event_date || collection.created_at),
            photoUrl: activePhotoUrl,
            focalX: collection.focal_x ?? extractedFocalX,
            focalY: collection.focal_y ?? extractedFocalY,
            onViewGallery: scrollToGallery
          };

          const activeCoverStyle = effectiveSettings.cover_style;
          switch (activeCoverStyle) {
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
            default: return <Covers.NovelCover {...props} />;
          }
        })()}
      </div>

      {/* Sticky Header */}


      {/* Main Gallery Content */}
      <main ref={galleryRef} className="pb-24 pt-0" style={{ backgroundColor: 'var(--gallery-bg)' }}>
        <Container className="max-w-none px-4 md:px-8 lg:px-12">
          {/* Sets Navigation - Replicated Pixieset Style */}
          <div className="sticky top-0 z-[40] -mx-4 md:-mx-8 lg:-mx-12 mb-8 px-4 md:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 py-4 transition-all duration-300 border-b border-black/5 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 20%)' }}>
            {/* Left: Collection Name */}
            <div className="flex-1 hidden md:flex items-center">
              <Typography variant="h4" className="text-[10px] font-bold tracking-[0.2em] uppercase gallery-heading" style={{ color: 'var(--gallery-text)' }}>
                {collection.name}
              </Typography>
            </div>

            {/* Center: Sets Navigation */}
            <div className="flex-1 flex items-center justify-center gap-8 md:gap-12">
              <button
                className="group relative py-2"
                onClick={() => setActiveSetId(null)}
              >
                <Typography variant="label" className={cn("transition-opacity gallery-heading text-[10px] tracking-[0.2em] font-bold uppercase", !activeSetId ? "opacity-100" : "opacity-50 hover:opacity-100")} style={{ color: 'var(--gallery-text)' }}>
                  Highlights
                </Typography>
                {!activeSetId && <div className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100 transition-transform origin-left" style={{ backgroundColor: 'var(--gallery-text)' }} />}
              </button>
              {(collection.sets || [])
                .filter(s => s.name?.toLowerCase() !== 'highlights')
                .map((set) => (
                  <button
                    key={set.id}
                    className="group relative py-2"
                    onClick={() => setActiveSetId(set.id)}
                  >
                    <Typography variant="label" className={cn("transition-opacity gallery-heading text-[10px] tracking-[0.2em] font-bold uppercase", activeSetId === set.id ? "opacity-100" : "opacity-50 hover:opacity-100")} style={{ color: 'var(--gallery-text)' }}>
                      {set.name}
                    </Typography>
                    {activeSetId === set.id && <div className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-100 transition-transform origin-left" style={{ backgroundColor: 'var(--gallery-text)' }} />}
                  </button>
                ))}
            </div>

            {/* Right: Action Icons */}
            <div className="flex-1 flex items-center justify-end gap-6">
              <button onClick={handleStartSlideshow} className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-40 transition-all" style={{ color: 'var(--gallery-text)' }}>
                <Play size={14} fill="currentColor" />
                {effectiveSettings.nav_style !== 'icon' && <span className="hidden xl:inline">Slideshow</span>}
              </button>
              {collection?.favorites_enabled !== false && (
                <button onClick={() => handleFavoriteHeaderClick()} className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-40 transition-all relative" style={{ color: 'var(--gallery-text)' }}>
                  <div className="relative">
                    <Heart size={14} fill={favoritedPhotos.length > 0 ? "currentColor" : "none"} />
                    {favoritedPhotos.length > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                        {favoritedPhotos.length}
                      </span>
                    )}
                  </div>
                  {effectiveSettings.nav_style !== 'icon' && <span className="hidden xl:inline">Favorite</span>}
                </button>
              )}
              {collection?.downloads_enabled !== false && collection?.gallery_download_enabled !== false && (
                <button
                  onClick={() => handleDownloadClick()}
                  disabled={isDownloadingAll}
                  className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--gallery-text)' }}
                >
                  <Download size={14} className={isDownloadingAll ? 'animate-bounce' : ''} />
                  {effectiveSettings.nav_style !== 'icon' && (
                    <span className="hidden xl:inline">
                      {isDownloadingAll
                        ? `${downloadProgress.done} / ${downloadProgress.total}`
                        : 'Download'}
                    </span>
                  )}
                </button>
              )}
              {collection?.social_sharing_enabled !== false && (
                <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-40 transition-all" style={{ color: 'var(--gallery-text)' }}>
                  <Share2 size={14} />
                  {effectiveSettings.nav_style !== 'icon' && <span className="hidden xl:inline">Share</span>}
                </button>
              )}
            </div>
          </div>

          {/* Favorites Filter Indicator */}
          {(showOnlyFavorites || isFavoriteListMode) && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-b border-black/5 mb-8">
              <Typography variant="h3" className="text-xl font-serif mb-2" style={{ color: 'var(--gallery-text)' }}>
                {isFavoriteListMode ? 'Client Selections' : 'My Favorites'}
              </Typography>
              <p className="text-sm opacity-60 mb-4" style={{ color: 'var(--gallery-text)' }}>
                Showing {filteredPhotos.length} favorited photos
              </p>
              <button
                onClick={() => {
                  if (isFavoriteListMode) {
                    // Remove list param from URL
                    window.history.replaceState({}, '', window.location.pathname);
                    setIsFavoriteListMode(false);
                  } else {
                    setShowOnlyFavorites(false);
                  }
                }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] underline hover:opacity-50 transition-all"
                style={{ color: 'var(--gallery-text)' }}
              >
                Show All Photos
              </button>
            </div>
          )}

          {/* Set Description */}
          {(() => {
            const description = activeSetId
              ? collection.sets?.find(s => s.id === activeSetId)?.description
              : (collection.description || collection.sets?.[0]?.description);

            if (!description) return null;

            return (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <p className="text-[13px] md:text-[15px] leading-relaxed tracking-[0.02em] font-light opacity-70 max-w-3xl mx-auto whitespace-pre-wrap" style={{ color: 'var(--gallery-text)' }}>
                  {description}
                </p>
              </div>
            );
          })()}

          {/* Flexible Gallery Grid */}
          <MasonryGrid
            key={`${effectiveSettings.grid_style}-${collection.thumbnail_size}-${collection.grid_spacing}`}
            photos={filteredPhotos}
            isHorizontal={effectiveSettings.grid_style?.toLowerCase() === 'horizontal'}
            gridSettings={{
              style: effectiveSettings.grid_style || 'vertical',
              size: collection.thumbnail_size || 'regular',
              spacing: collection.grid_spacing || 'regular',
              aspectRatio: collection.aspect_ratio || 'original'
            }}
            onImageClick={(index) => setLightboxIndex(index)}
            onFavorite={(photo) => handleFavoritePhotoToggle(photo.id)}
            onDownload={handleDownloadClick}
            onShare={() => setShowShareModal(true)}
            showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
            showFavorite={collection?.favorites_enabled !== false}
            favoritedPhotoIds={favoritedPhotos}
            customRowHeight={collection.thumbnail_size === 'large' ? 420 : collection.thumbnail_size === 'regular' ? 300 : collection.thumbnail_size === 'small' ? 200 : 140}
            customColumnCount={collection.thumbnail_size === 'large' ? 2 : collection.thumbnail_size === 'regular' ? 3 : 4}
          />
        </Container>
      </main>

      {/* Global Footer Branding */}
      <footer className="mt-12 border-t py-8" style={{ borderTopColor: 'rgba(0,0,0,0.05)', backgroundColor: 'var(--gallery-bg)' }}>
        <Container className="max-w-none px-4 md:px-8 lg:px-12">
          <div className="text-center">
            <Typography variant="label" style={{ color: 'var(--gallery-meta-text)', opacity: 0.5 }}>© {new Date().getFullYear()} PIXNXT. All Rights Reserved.</Typography>
          </div>
        </Container>
      </footer>

      {/* Lightbox */}
      <PhotoLightbox
        isOpen={lightboxIndex !== -1}
        onClose={() => {
          setLightboxIndex(-1);
          setIsSlideshowActive(false);
        }}
        images={photoUrls}
        currentIndex={lightboxIndex}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % photoUrls.length)}
        onPrev={() => setLightboxIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
        isSlideshowActive={isSlideshowActive}
        onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
        onFavorite={() => {
          const photo = filteredPhotos[lightboxIndex];
          if (photo) handleFavoritePhotoToggle(photo.id);
        }}
        onDownload={() => handleDownloadClick(filteredPhotos[lightboxIndex])}
        showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
        showFavorite={collection?.favorites_enabled !== false}
        isFavorited={favoritedPhotos.includes(filteredPhotos[lightboxIndex]?.id)}
      />

      {/* Favorite Modal */}
      <AnimatePresence>
        {showFavoriteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-white p-10 shadow-2xl"
            >
              <button
                onClick={() => setShowFavoriteModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Mail className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900">Favorites</h3>
                <p className="text-sm text-zinc-500">Save your favorite photos and revisit them at any time using your email address.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-zinc-200 py-3 text-sm outline-none focus:border-zinc-950 transition-colors"
                />
                <button
                  className="w-full bg-zinc-950 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  onClick={handleFavoriteEmailSubmit}
                  disabled={isSubmittingEmail}
                >
                  {isSubmittingEmail ? 'Setting up...' : 'Go to Favorites'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => {
          setShowDownloadModal(false);
          setSelectedDownloadPhoto(null);
        }}
        collection={collection}
        photos={collection?.photos || []}
        sets={collection?.sets || []}
        initialPhoto={selectedDownloadPhoto}
        initialSetId={activeSetId}
      />

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                  <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-xl font-serif text-zinc-900">Share Collection</h3>
                <p className="text-sm text-zinc-500">Share these memories with family and friends.</p>
              </div>

              <div className="flex justify-center gap-6 mb-8">
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">X</span>
                </button>
                <button className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
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
                  value={window.location.origin + "/gallery/" + (collection?.slug || '')}
                  className="flex-1 px-3 text-sm text-zinc-500 outline-none bg-zinc-50"
                />
                <button className="bg-zinc-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors rounded-sm flex items-center gap-2">
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

function FooterLink({ href, children }) {
  return (
    <a
      href={href}
      className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors"
    >
      {children}
    </a>
  );
}

export default GalleryView;
