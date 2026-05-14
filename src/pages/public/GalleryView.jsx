import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import * as Covers from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles';

import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../components/features/Gallery/PhotoLightbox/PhotoLightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { Container } from '../../components/ui/Container';
import { Typography } from '../../components/ui/Typography';
import { X, Mail, Share2, Link as LinkIcon, Download, Heart, Play } from 'lucide-react';
import { DownloadModal } from '../../components/features/Gallery/DownloadModal/DownloadModal';
import { downloadPhotoFromR2 } from '../../lib/downloadPhoto';
import { normalizeGalleryPhotoSort, sortPhotosForGallery } from '../../lib/galleryPhotoSort';

/** Stable string ids so Supabase UUIDs match `photo.id` from the collection payload. */
function normalizeFavoritePhotoId(id) {
  if (id == null || id === '') return null;
  return String(id);
}

const GalleryView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
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
  const [activeSetId, setActiveSetId] = useState(null);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState(null);
  const isDownloadingAll = false;
  const downloadProgress = { done: 0, total: 0 };

  // Favorites state
  const [sessionId, setSessionId] = useState(null);
  const [favoritedPhotos, setFavoritedPhotos] = useState([]);
  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [favoriteListPhotos, setFavoriteListPhotos] = useState([]);
  const [isFavoriteListMode, setIsFavoriteListMode] = useState(false);
  const [activeFavoriteList, setActiveFavoriteList] = useState(null);

  const refreshActiveFavoriteList = useCallback(async (sid) => {
    if (!sid) {
      setActiveFavoriteList(null);
      return;
    }
    try {
      const row = await galleryService.getSessionDefaultFavoriteList(sid);
      setActiveFavoriteList(row);
    } catch (e) {
      console.warn('Active favorite list:', e);
      setActiveFavoriteList(null);
    }
  }, []);

  useEffect(() => {
    refreshActiveFavoriteList(sessionId);
  }, [sessionId, refreshActiveFavoriteList]);

  const favoriteLightboxLabel = useMemo(() => {
    if (!sessionId) return null;
    const name = activeFavoriteList?.name || 'My Favorites';
    const max =
      activeFavoriteList?.max_selection != null && Number(activeFavoriteList.max_selection) > 0
        ? Number(activeFavoriteList.max_selection)
        : null;
    if (max != null) return `${name} (${favoritedPhotos.length}/${max})`;
    return `${name} (${favoritedPhotos.length})`;
  }, [sessionId, activeFavoriteList, favoritedPhotos.length]);

  const handleFavoriteEmailSubmit = async () => {
    if (!email || !collection || collection.favorites_enabled === false) return;
    try {
      setIsSubmittingEmail(true);
      const session = await galleryService.createOrGetSession(collection.id, email);
      setSessionId(session.id);
      localStorage.setItem(`pixnxt_fav_email_${collection.id}`, email);

      const favs = await galleryService.getFavorites(session.id);
      const newFavs = (favs || []).map(normalizeFavoritePhotoId).filter(Boolean);

      const pending = normalizeFavoritePhotoId(pendingFavoritePhotoId);
      if (pending) {
        if (!newFavs.includes(pending)) {
          await galleryService.toggleFavorite(session.id, pending, true);
          newFavs.push(pending);
        }
        setPendingFavoritePhotoId(null);
      }

      setFavoritedPhotos(newFavs);

      if (pending && newFavs.includes(pending)) {
        const ph = (collection.photos || []).find((p) => normalizeFavoritePhotoId(p.id) === pending);
        const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
        const listMeta = await galleryService.getSessionDefaultFavoriteList(session.id);
        setActiveFavoriteList(listMeta);
        const max =
          listMeta?.max_selection != null && Number(listMeta.max_selection) > 0
            ? Number(listMeta.max_selection)
            : null;
        setFavoriteToast({
          thumb,
          listName: listMeta?.name || 'My Favorites',
          count: newFavs.length,
          max,
          limit: false,
        });
      }

      setShowFavoriteModal(false);
    } catch (e) {
      console.error("Failed to setup session/favorites:", e);
      alert("Failed to save email. Please try again.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const [favoriteToast, setFavoriteToast] = useState(null);

  useEffect(() => {
    if (!favoriteToast) return;
    const t = setTimeout(() => setFavoriteToast(null), 4200);
    return () => clearTimeout(t);
  }, [favoriteToast]);

  /** Toolbar "Favorites" — Pixieset-style hub at /gallery/:slug/f when signed in. */
  const handleFavoriteHeaderClick = () => {
    if (!collection || collection.favorites_enabled === false) return;
    if (!sessionId) {
      setPendingFavoritePhotoId(null);
      setShowFavoriteModal(true);
      return;
    }
    navigate(`/gallery/${slug}/f`);
  };

  /** Heart on a photo (grid overlay or lightbox) — toggles that photo only. */
  const handleFavoritePhotoToggle = async (photoOrId) => {
    if (!collection || collection.favorites_enabled === false) return;
    const pid = normalizeFavoritePhotoId(
      photoOrId && typeof photoOrId === 'object' ? photoOrId.id : photoOrId
    );
    if (!pid) return;

    const photo =
      photoOrId && typeof photoOrId === 'object'
        ? photoOrId
        : (collection.photos || []).find((p) => normalizeFavoritePhotoId(p.id) === pid);

    if (sessionId) {
      const isCurrentlyFavorited = favoritedPhotos.includes(pid);
      try {
        await galleryService.toggleFavorite(sessionId, pid, !isCurrentlyFavorited);
        const next = isCurrentlyFavorited
          ? favoritedPhotos.filter((id) => id !== pid)
          : [...favoritedPhotos, pid];
        setFavoritedPhotos(next);
        if (!isCurrentlyFavorited) {
          const thumb = photo?.thumbnail_url || photo?.web_url || photo?.full_url;
          const max =
            activeFavoriteList?.max_selection != null && Number(activeFavoriteList.max_selection) > 0
              ? Number(activeFavoriteList.max_selection)
              : null;
          setFavoriteToast({
            thumb,
            listName: activeFavoriteList?.name || 'My Favorites',
            count: next.length,
            max,
            limit: false,
          });
        }
      } catch (e) {
        if (e?.code === 'SELECTION_LIMIT') {
          const thumb = photo?.thumbnail_url || photo?.web_url || photo?.full_url;
          setFavoriteToast({
            thumb,
            listName: activeFavoriteList?.name || 'This list',
            count: favoritedPhotos.length,
            max:
              activeFavoriteList?.max_selection != null && Number(activeFavoriteList.max_selection) > 0
                ? Number(activeFavoriteList.max_selection)
                : null,
            limit: true,
          });
          return;
        }
        console.error('Failed to toggle favorite:', e);
      }
    } else {
      setPendingFavoritePhotoId(pid);
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
  const isGalleryDark = effectiveSettings.color_palette === 'dark';

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
            setFavoritedPhotos((favs || []).map(normalizeFavoritePhotoId).filter(Boolean));
            await refreshActiveFavoriteList(session.id);
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
    } catch {
      return '';
    }
  };

  /** Base list for the active tab — must NOT get a new array reference when only `favoritedPhotos` changes
   *  (otherwise MasonryGrid + framer-motion `whileInView` can re-run and leave tiles stuck at opacity 0). */
  const photosForActiveSet = useMemo(() => {
    if (!collection) return [];
    if (isFavoriteListMode) return favoriteListPhotos || [];
    return activeSetId
      ? (collection.photos || []).filter((p) => p.set_id === activeSetId)
      : (collection.photos || []).filter((p) => !p.set_id);
  }, [collection, activeSetId, isFavoriteListMode, favoriteListPhotos]);

  const filteredPhotos = useMemo(() => {
    const base = photosForActiveSet;
    if (!collection) return base;
    const sortKey = normalizeGalleryPhotoSort(collection.gallery_photo_sort);
    return sortPhotosForGallery(base, sortKey);
  }, [collection, photosForActiveSet]);

  /** Storytelling copy for the active tab (Highlights → collection.description; other sets → set.description). */
  const setDescriptionText = useMemo(() => {
    if (!collection) return '';
    const raw = activeSetId
      ? collection.sets?.find((s) => s.id === activeSetId)?.description
      : (collection.description || collection.sets?.[0]?.description);
    return typeof raw === 'string' ? raw.trim() : '';
  }, [collection, activeSetId]);

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
          {/* Sticky bar — Pixieset-style: brand + sets + actions (Favorites, Download, Share, Slideshow) */}
          <div
            className={cn(
              'sticky top-0 z-[40] -mx-4 md:-mx-8 lg:-mx-12 mb-6 px-4 md:px-8 lg:px-12 flex flex-col gap-5 py-4 md:py-5 transition-all duration-300 border-b backdrop-blur-md',
              isGalleryDark ? 'border-white/10' : 'border-black/5'
            )}
            style={{ backgroundColor: 'color-mix(in srgb, var(--gallery-bg), transparent 15%)' }}
          >
            <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Brand: event title + photographer */}
              <div className="flex shrink-0 flex-col lg:min-w-[140px]">
                <span
                  className="font-serif text-2xl font-bold uppercase leading-none tracking-tight md:text-3xl"
                  style={{ color: 'var(--gallery-text)' }}
                >
                  {collection.name}
                </span>
                {photographer?.display_name ? (
                  <span
                    className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] opacity-70"
                    style={{ color: 'var(--gallery-meta-text)' }}
                  >
                    {photographer.display_name}
                  </span>
                ) : null}
              </div>

              {/* Set tabs */}
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 lg:flex-1">
                <button type="button" className="group relative py-2" onClick={() => setActiveSetId(null)}>
                  <span
                    className={cn(
                      'gallery-heading text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity',
                      !activeSetId ? 'opacity-100' : 'opacity-45 hover:opacity-100'
                    )}
                    style={{ color: 'var(--gallery-text)' }}
                  >
                    Highlights
                  </span>
                  {!activeSetId && (
                    <div
                      className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
                      style={{ backgroundColor: 'var(--gallery-text)' }}
                    />
                  )}
                </button>
                {(collection.sets || [])
                  .filter((s) => s.name?.toLowerCase() !== 'highlights')
                  .map((set) => (
                    <button type="button" key={set.id} className="group relative py-2" onClick={() => setActiveSetId(set.id)}>
                      <span
                        className={cn(
                          'gallery-heading text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity',
                          activeSetId === set.id ? 'opacity-100' : 'opacity-45 hover:opacity-100'
                        )}
                        style={{ color: 'var(--gallery-text)' }}
                      >
                        {set.name}
                      </span>
                      {activeSetId === set.id && (
                        <div
                          className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-100"
                          style={{ backgroundColor: 'var(--gallery-text)' }}
                        />
                      )}
                    </button>
                  ))}
              </div>

              {/* Actions — order matches Pixieset */}
              <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end lg:min-w-[280px] xl:min-w-[340px]">
                {collection?.favorites_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => handleFavoriteHeaderClick()}
                    className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-50"
                    style={{ color: 'var(--gallery-text)' }}
                  >
                    <span className="relative inline-flex">
                      <Heart size={14} className={favoritedPhotos.length > 0 ? 'fill-current' : ''} />
                      {favoritedPhotos.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[var(--gallery-bg)]" aria-hidden />
                      )}
                    </span>
                    <span className="hidden md:inline">Favorites</span>
                  </button>
                )}
                {collection?.downloads_enabled !== false && collection?.gallery_download_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => handleDownloadClick()}
                    disabled={isDownloadingAll}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ color: 'var(--gallery-text)' }}
                  >
                    <Download size={14} className={isDownloadingAll ? 'animate-bounce' : ''} />
                    <span className="hidden md:inline">
                      {isDownloadingAll ? `${downloadProgress.done} / ${downloadProgress.total}` : 'Download'}
                    </span>
                  </button>
                )}
                {collection?.social_sharing_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-50"
                    style={{ color: 'var(--gallery-text)' }}
                  >
                    <Share2 size={14} />
                    <span className="hidden md:inline">Share</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStartSlideshow}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-50"
                  style={{ color: 'var(--gallery-text)' }}
                >
                  <Play size={14} fill="currentColor" />
                  <span className="hidden md:inline">Slideshow</span>
                </button>
              </div>
            </div>
          </div>

          {setDescriptionText ? (
            <div
              className={cn(
                '-mx-4 mb-6 border-b px-6 py-5 text-center md:-mx-8 md:px-12 md:py-6 lg:-mx-12 lg:px-12',
                isGalleryDark ? 'border-white/10' : 'border-black/5'
              )}
              style={{ backgroundColor: 'var(--gallery-bg)' }}
            >
              <p
                className="mx-auto max-w-3xl whitespace-pre-wrap text-base font-light leading-relaxed tracking-wide md:text-lg"
                style={{ color: 'var(--gallery-text)' }}
              >
                {setDescriptionText}
              </p>
            </div>
          ) : null}

          {/* Shared list view (link from favorites hub) */}
          {isFavoriteListMode && (
            <div
              className={cn(
                'mb-10 flex flex-col items-center justify-center border-b py-10 text-center',
                isGalleryDark ? 'border-white/10' : 'border-black/5'
              )}
            >
              <Typography variant="h3" className="mb-2 text-xl font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--gallery-text)' }}>
                Client selections
              </Typography>
              <p className="mb-4 text-sm opacity-60" style={{ color: 'var(--gallery-text)' }}>
                Showing {filteredPhotos.length} photos from this list
              </p>
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, '', window.location.pathname);
                  setIsFavoriteListMode(false);
                }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] underline transition-opacity hover:opacity-50"
                style={{ color: 'var(--gallery-text)' }}
              >
                Show all photos
              </button>
            </div>
          )}

          {!setDescriptionText &&
            (() => {
              const raw = (activeSetId ? collection.sets?.find((s) => s.id === activeSetId)?.name : 'Highlights') || 'Highlights';
              const label = String(raw).toLowerCase();
              return (
                <p
                  className="mb-8 text-center text-[11px] font-normal lowercase tracking-[0.35em] md:text-xs"
                  style={{ color: 'var(--gallery-meta-text)' }}
                >
                  {label}
                </p>
              );
            })()}

          {/* Flexible Gallery Grid */}
          <MasonryGrid
            key={`${effectiveSettings.grid_style}-${collection.thumbnail_size}-${collection.grid_spacing}-${collection.gallery_photo_sort}-${collection.show_filenames ? 'fn1' : 'fn0'}`}
            photos={filteredPhotos}
            isHorizontal={effectiveSettings.grid_style?.toLowerCase() === 'horizontal'}
            gridSettings={{
              style: effectiveSettings.grid_style || 'vertical',
              size: collection.thumbnail_size || 'regular',
              spacing: collection.grid_spacing || 'regular',
              aspectRatio: collection.aspect_ratio || 'original'
            }}
            onImageClick={(index) => setLightboxIndex(index)}
            onFavorite={(photo) => handleFavoritePhotoToggle(photo)}
            onDownload={handleDownloadClick}
            onShare={() => setShowShareModal(true)}
            showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
            showFavorite={collection?.favorites_enabled !== false}
            favoritedPhotoIds={favoritedPhotos}
            customRowHeight={collection.thumbnail_size === 'large' ? 420 : collection.thumbnail_size === 'regular' ? 300 : collection.thumbnail_size === 'small' ? 200 : 140}
            showFilename={collection?.show_filenames === true}
          />
        </Container>
      </main>

      {/* Global Footer Branding */}
      <footer
        className={cn('mt-12 border-t py-8', isGalleryDark ? 'border-white/10' : '')}
        style={{ borderTopColor: isGalleryDark ? undefined : 'rgba(0,0,0,0.05)', backgroundColor: 'var(--gallery-bg)' }}
      >
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
          if (photo) handleFavoritePhotoToggle(photo);
        }}
        onDownload={() => handleDownloadClick(filteredPhotos[lightboxIndex])}
        showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
        showFavorite={collection?.favorites_enabled !== false}
        isFavorited={(() => {
          const id = normalizeFavoritePhotoId(filteredPhotos[lightboxIndex]?.id);
          return !!id && favoritedPhotos.includes(id);
        })()}
        favoriteOverlayLabel={favoriteLightboxLabel || undefined}
      />

      {/* Favorite Modal */}
      <AnimatePresence>
        {showFavoriteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFavoriteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <Motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={cn(
                'relative w-full max-w-lg p-8 shadow-2xl md:p-10',
                isGalleryDark ? 'bg-[#1a1a1a] text-white ring-1 ring-white/10' : 'bg-white text-zinc-900'
              )}
            >
              <button
                type="button"
                onClick={() => setShowFavoriteModal(false)}
                className={cn(
                  'absolute right-4 top-4 transition-colors',
                  isGalleryDark ? 'text-white/50 hover:text-white' : 'text-zinc-400 hover:text-zinc-950'
                )}
              >
                <X size={20} />
              </button>

              <div className={cn('mb-8 pr-8', isGalleryDark ? 'text-left' : 'text-center')}>
                {!isGalleryDark && (
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                    <Mail className="text-zinc-400" size={24} strokeWidth={1.5} />
                  </div>
                )}
                <h3
                  className={cn(
                    'mb-3 text-lg font-bold uppercase tracking-[0.2em] md:text-xl',
                    isGalleryDark ? 'font-sans' : 'font-serif'
                  )}
                >
                  Favorites
                </h3>
                <p className={cn('text-sm leading-relaxed', isGalleryDark ? 'text-white/60' : 'text-zinc-500')}>
                  Save your favorite photos and revisit them at anytime using your email address. You can share this list
                  with your photographer, family and friends.
                </p>
              </div>

              <div className="space-y-5">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'w-full rounded-none border px-3 py-3 text-sm outline-none transition-colors',
                    isGalleryDark
                      ? 'border-white/20 bg-black/40 text-white placeholder:text-white/35 focus:border-white/50'
                      : 'border-zinc-200 bg-white py-3 focus:border-zinc-950'
                  )}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={cn(
                      'px-8 py-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-opacity disabled:opacity-50',
                      isGalleryDark
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'w-full bg-zinc-950 py-4 text-white hover:bg-zinc-800 md:w-auto'
                    )}
                    onClick={handleFavoriteEmailSubmit}
                    disabled={isSubmittingEmail}
                  >
                    {isSubmittingEmail ? 'Please wait…' : 'Sign in'}
                  </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Favorite confirmation toast (Pixieset-style) */}
      <AnimatePresence>
        {favoriteToast && (
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none fixed bottom-8 left-1/2 z-[190] flex max-w-[min(92vw,420px)] -translate-x-1/2 items-center gap-4 rounded-md bg-white px-4 py-3 text-zinc-900 shadow-lg ring-1 ring-black/10"
          >
            {favoriteToast.thumb && !favoriteToast.limit && (
              <img src={favoriteToast.thumb} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
            )}
            <p className="text-left text-[13px] font-medium leading-snug">
              {favoriteToast.limit ? (
                <>
                  Selection limit reached for <span className="font-semibold">{favoriteToast.listName}</span>
                  {favoriteToast.max ? (
                    <span className="text-zinc-600">
                      {' '}
                      ({favoriteToast.count}/{favoriteToast.max})
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  Added to <span className="font-semibold">{favoriteToast.listName}</span>{' '}
                  <span className="text-zinc-700">
                    (
                    {favoriteToast.max ? `${favoriteToast.count}/${favoriteToast.max}` : favoriteToast.count})
                  </span>
                </>
              )}
            </p>
          </Motion.div>
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
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <Motion.div
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
            </Motion.div>
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
