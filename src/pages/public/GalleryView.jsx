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
import { X, Mail, Share2, Download, Heart, Play } from 'lucide-react';
import { DownloadModal } from '../../components/features/Gallery/DownloadModal/DownloadModal';
import { ShareCollectionModal } from '../../components/features/Gallery/ShareCollectionModal/ShareCollectionModal';
import { downloadPhotoFromR2 } from '../../lib/downloadPhoto';
import { formatCoverDate } from '../../lib/formatCoverDate.js';
import {
  GalleryStickyNav,
  GallerySetHeading,
  GallerySetDescription,
} from '../../components/features/Gallery/GalleryChrome';
import {
  countGalleryMedia,
  filterGalleryMediaByType,
  shouldShowGalleryMediaFilter,
  isGalleryVideo,
} from '../../lib/galleryMediaType';
import './GalleryView.css';
import { normalizeGalleryPhotoSort, sortPhotosForGallery } from '../../lib/galleryPhotoSort';
import { normalizeNavigationStyle } from '../../lib/navStyle';
import {
  normalizePaletteId,
  normalizeFontId,
  normalizeCoverStyleId,
} from '../../lib/normalizeDesignTokens';
import {
  isClientSessionActive,
  setClientSessionActive,
  isClientExclusiveEnabled,
  filterPhotosForViewer,
  filterSetsForViewer,
  canViewHighlights,
} from '../../lib/clientExclusiveAccess';
import {
  ClientExclusiveLoginModal,
  ClientExclusiveToast,
  ClientExclusiveClientBar,
} from '../../components/features/ClientExclusiveAccess';
import { clientExclusiveAccessService } from '../../services/clientExclusiveAccess.service';

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
  const [mediaFilter, setMediaFilter] = useState('photos');
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
  const [isClientViewer, setIsClientViewer] = useState(false);
  const [showClientLogin, setShowClientLogin] = useState(false);
  const [privateToast, setPrivateToast] = useState(null);
  const [privateToastThumb, setPrivateToastThumb] = useState(null);

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
      }
      setPendingFavoritePhotoId(null);
      setFavoritedPhotos(newFavs);

      // Broadcast update to dashboard
      const channel = new BroadcastChannel('pixnxt-gallery-update');
      channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
      channel.close();

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

        // Broadcast update to dashboard
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
        channel.close();
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

        // Log activity for direct download
        const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`) || 'Visitor';
        await galleryService.logActivity(collection.id, 'download', {
          email: savedEmail,
          photographerId: collection.user_id,
          photoId: photo.id,
          metadata: {
            type: photo.media_type === 'video' ? 'video' : 'photo',
            resolution: 'High Res',
            source: 'Gallery Direct'
          }
        });

        // Broadcast update to dashboard
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
        channel.close();
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
      cover_style: normalizeCoverStyleId(previewCoverStyle || collection.cover_style || 'novel'),
      font_family: normalizeFontId(previewFont || collection.font_family || 'sans'),
      color_palette: normalizePaletteId(previewColor || collection.color_palette || 'light'),
      grid_style: previewGrid || collection.grid_style || 'vertical',
      nav_style: collection.nav_style || 'icons'
    };
  };

  const effectiveSettings = getEffectiveSettings();
  const navigationStyle = normalizeNavigationStyle(effectiveSettings.nav_style);
  const isGalleryDark = effectiveSettings.color_palette === 'dark';

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + "/gallery/" + (slug || '') : '';
  const shareTitle = collection?.name || 'Collection';

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
        if (isClientExclusiveEnabled(data)) {
          setIsClientViewer(isClientSessionActive(data.id));
        } else {
          setIsClientViewer(false);
        }

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
    const channel = new BroadcastChannel('pixnxt-gallery-update');
    channel.onmessage = (event) => {
      if (event.data.type === 'SETTINGS_UPDATED' && (event.data.collectionId === collection?.id || event.data.slug === slug)) {
        setCollection(prev => prev ? { ...prev, ...event.data.settings } : prev);
      }
    };
    return () => channel.close();
  }, [collection?.id, slug]);

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

  const openLightbox = useCallback((index) => {
    setLightboxIndex(index);
    setIsSlideshowActive(true);
  }, []);

  const handleStartSlideshow = () => {
    openLightbox(0);
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

  const visibleSets = useMemo(() => {
    if (!collection?.sets) return [];
    return filterSetsForViewer(collection.sets, collection, isClientViewer);
  }, [collection, isClientViewer]);

  const filteredPhotosBase = useMemo(() => {
    let base = photosForActiveSet;
    if (!collection) return base;
    if (isClientExclusiveEnabled(collection)) {
      base = filterPhotosForViewer(
        base,
        collection,
        isClientViewer,
        activeSetId,
        collection.sets || []
      );
    }
    const sortKey = normalizeGalleryPhotoSort(collection.gallery_photo_sort);
    return sortPhotosForGallery(base, sortKey);
  }, [collection, photosForActiveSet, isClientViewer, activeSetId]);

  const mediaCounts = useMemo(() => countGalleryMedia(filteredPhotosBase), [filteredPhotosBase]);

  useEffect(() => {
    if (mediaCounts.photos > 0) setMediaFilter('photos');
    else if (mediaCounts.videos > 0) setMediaFilter('videos');
  }, [activeSetId, mediaCounts.photos, mediaCounts.videos]);

  const showMediaFilter = shouldShowGalleryMediaFilter(mediaCounts);

  const filteredPhotos = useMemo(() => {
    if (!showMediaFilter) return filteredPhotosBase;
    return filterGalleryMediaByType(filteredPhotosBase, mediaFilter);
  }, [filteredPhotosBase, showMediaFilter, mediaFilter]);

  const handleTogglePhotoPrivate = useCallback(
    async (photo) => {
      if (!collection?.id) return;
      if (!isClientViewer) {
        setShowClientLogin(true);
        return;
      }
      if (!collection.allow_clients_mark_private) return;

      const nextPrivate = !photo.is_private;
      try {
        await clientExclusiveAccessService.setPhotoPrivate(photo.id, nextPrivate, collection.id);
        setCollection((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: (prev.photos || []).map((p) =>
              p.id === photo.id ? { ...p, is_private: nextPrivate } : p
            ),
          };
        });
        setPrivateToastThumb(photo.thumbnail_url || photo.web_url || photo.full_url);
        setPrivateToast(
          nextPrivate ? 'This photo is now private.' : 'This photo is now visible to guests.'
        );
        window.setTimeout(() => setPrivateToast(null), 4000);
      } catch (err) {
        console.error('Failed to update photo privacy:', err);
      }
    },
    [collection, isClientViewer]
  );

  const handleClientLoginSuccess = useCallback(() => {
    if (!collection?.id) return;
    setClientSessionActive(collection.id, true);
    setIsClientViewer(true);
    setShowClientLogin(false);
  }, [collection?.id]);

  const handleClientSignOut = useCallback(() => {
    if (!collection?.id) return;
    setClientSessionActive(collection.id, false);
    setIsClientViewer(false);
    if (!canViewHighlights(collection, false) && !activeSetId) {
      const firstPublic = filterSetsForViewer(collection.sets || [], collection, false)[0];
      if (firstPublic) setActiveSetId(firstPublic.id);
    }
  }, [collection, activeSetId]);

  useEffect(() => {
    if (!collection || !isClientExclusiveEnabled(collection)) return;
    if (!canViewHighlights(collection, isClientViewer) && !activeSetId && visibleSets.length > 0) {
      setActiveSetId(visibleSets[0].id);
    }
  }, [collection, isClientViewer, activeSetId, visibleSets]);

  /** Storytelling copy for the active tab (Highlights → collection.description; other sets → set.description). */
  const setDescriptionText = useMemo(() => {
    if (!collection) return '';
    const raw = activeSetId
      ? collection.sets?.find((s) => s.id === activeSetId)?.description
      : (collection.description || collection.sets?.[0]?.description);
    return typeof raw === 'string' ? raw.trim() : '';
  }, [collection, activeSetId]);

  const photoUrls = useMemo(() => filteredPhotos.map(p => p.full_url || p.web_url || p.thumbnail_url), [filteredPhotos]);

  useEffect(() => {
    if (lightboxIndex < 0) return;
    const photo = filteredPhotos[lightboxIndex];
    if (photo && isGalleryVideo(photo)) {
      setIsSlideshowActive(false);
    }
  }, [lightboxIndex, filteredPhotos]);

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
    <div
      className={cn('gallery-view-page min-h-screen transition-colors duration-500', `theme-${effectiveSettings.color_palette}`, `font-${effectiveSettings.font_family}`, `nav-style-${navigationStyle}`, `style-${effectiveSettings.cover_style}`)}
      style={{ backgroundColor: 'var(--gallery-secondary-bg)', color: 'var(--gallery-text)' }}
      data-gallery-chrome="large"
    >
      {/* Hero Section */}
      <div className="gallery-view-hero w-full h-[100dvh] [&>div]:!h-full" data-cover-text-scale="large">
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
            subtitle: photographer?.display_name || '',
            date: formatCoverDate(collection.event_date || collection.created_at),
            photoUrl: activePhotoUrl,
            focalX: collection.focal_x ?? extractedFocalX,
            focalY: collection.focal_y ?? extractedFocalY,
            onViewGallery: scrollToGallery,
            isGalleryView: true,
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
      <main ref={galleryRef} className="pb-24 pt-0" style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}>
        <Container className="max-w-none px-2 md:px-4 lg:px-4">
          {isClientExclusiveEnabled(collection) && isClientViewer ? (
            <ClientExclusiveClientBar onSignOut={handleClientSignOut} />
          ) : null}
          {isClientExclusiveEnabled(collection) && !isClientViewer ? (
            <div className="cea-client-bar" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowClientLogin(true)}>
                Client login
              </button>
            </div>
          ) : null}
          <GalleryStickyNav
            isGalleryView
            navigationStyle={navigationStyle}
            collectionTitle={collection.name}
            photographerName={photographer?.display_name}
            sets={visibleSets.map((set) => ({ id: set.id, name: set.name }))}
            showHighlightsTab={canViewHighlights(collection, isClientViewer)}
            activeSetId={activeSetId}
            onSetChange={setActiveSetId}
            showFavorites={collection?.favorites_enabled !== false}
            showDownload={collection?.downloads_enabled !== false && collection?.gallery_download_enabled !== false}
            showShare={collection?.social_sharing_enabled !== false}
            favoritedCount={favoritedPhotos.length}
            isDownloadingAll={isDownloadingAll}
            downloadLabel={isDownloadingAll ? `${downloadProgress.done} / ${downloadProgress.total}` : 'Download'}
            onFavoriteClick={handleFavoriteHeaderClick}
            onDownloadClick={handleDownloadClick}
            onShareClick={() => setShowShareModal(true)}
            onSlideshowClick={handleStartSlideshow}
            isDark={isGalleryDark}
            mediaFilter={!isFavoriteListMode ? mediaFilter : undefined}
            onMediaFilterChange={!isFavoriteListMode ? setMediaFilter : undefined}
            mediaPhotoCount={mediaCounts.photos}
            mediaVideoCount={mediaCounts.videos}
          />

          {setDescriptionText ? (
            <GallerySetDescription variant="galleryView" text={setDescriptionText} isDark={isGalleryDark} />
          ) : null}

          {/* Shared list view (link from favorites hub) */}
          {isFavoriteListMode && (
            <div
              className={cn(
                'mb-10 flex flex-col items-center justify-center border-b py-10 text-center',
                isGalleryDark ? 'border-white/10' : 'border-black/5'
              )}
            >
              <Typography variant="h3" className="gallery-heading mb-2 text-xl font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--gallery-text)' }}>
                Client selections
              </Typography>
              <p className="gallery-body-text mb-4 text-sm opacity-60" style={{ color: 'var(--gallery-text)' }}>
                Showing {filteredPhotos.length} photos from this list
              </p>
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, '', window.location.pathname);
                  setIsFavoriteListMode(false);
                }}
                className="gallery-body-text text-[10px] font-bold uppercase tracking-[0.2em] underline transition-opacity hover:opacity-50"
                style={{ color: 'var(--gallery-text)' }}
              >
                Show all photos
              </button>
            </div>
          )}

          {!setDescriptionText &&
            !isFavoriteListMode &&
            (() => {
              const raw = (activeSetId ? collection.sets?.find((s) => s.id === activeSetId)?.name : 'Highlights') || 'Highlights';
              return <GallerySetHeading variant="galleryView" label={String(raw).toLowerCase()} />;
            })()}

          {filteredPhotos.length === 0 && showMediaFilter && !isFavoriteListMode ? (
            <p
              className="gallery-body-text py-16 text-center text-[11px] font-bold uppercase tracking-[0.35em] opacity-40"
              style={{ color: 'var(--gallery-text)' }}
            >
              No {mediaFilter} in this set
            </p>
          ) : null}

          {/* Flexible Gallery Grid */}
          <MasonryGrid
            key={`${activeSetId ?? 'highlights'}-${mediaFilter}-${effectiveSettings.grid_style}-${collection.thumbnail_size}-${collection.grid_spacing}-${collection.gallery_photo_sort}-${collection.show_filenames ? 'fn1' : 'fn0'}-${isClientViewer ? 'client' : 'guest'}`}
            photos={filteredPhotos}
            isHorizontal={effectiveSettings.grid_style?.toLowerCase() === 'horizontal'}
            gridSettings={{
              style: effectiveSettings.grid_style || 'vertical',
              size: collection.thumbnail_size || 'regular',
              spacing: collection.grid_spacing || 'regular',
              aspectRatio: collection.aspect_ratio || 'original'
            }}
            onImageClick={openLightbox}
            onFavorite={(photo) => handleFavoritePhotoToggle(photo)}
            onDownload={handleDownloadClick}
            onShare={() => setShowShareModal(true)}
            onTogglePrivate={handleTogglePhotoPrivate}
            isClientViewer={isClientViewer}
            allowMarkPrivate={Boolean(collection?.allow_clients_mark_private)}
            showPrivateBadge={isClientViewer}
            showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
            showFavorite={collection?.favorites_enabled !== false}
            showShare={collection?.social_sharing_enabled !== false}
            favoritedPhotoIds={favoritedPhotos}
            customRowHeight={collection.thumbnail_size === 'large' ? 420 : collection.thumbnail_size === 'regular' ? 300 : collection.thumbnail_size === 'small' ? 200 : 140}
            customColumnCount={collection.thumbnail_size === 'large' ? 2 : collection.thumbnail_size === 'regular' ? 3 : 4}
            showFilename={collection?.show_filenames === true}
            className="mt-2"
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
        onShare={() => setShowShareModal(true)}
        showDownload={collection?.downloads_enabled !== false && collection?.single_photo_download_enabled !== false}
        showFavorite={collection?.favorites_enabled !== false}
        showShare={collection?.social_sharing_enabled !== false}
        isFavorited={(() => {
          const id = normalizeFavoritePhotoId(filteredPhotos[lightboxIndex]?.id);
          return !!id && favoritedPhotos.includes(id);
        })()}
        favoriteOverlayLabel={favoriteLightboxLabel || undefined}
        themeClassName={cn(
          `theme-${effectiveSettings.color_palette}`,
          `font-${effectiveSettings.font_family}`
        )}
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
                <h3 className="gallery-heading mb-3 text-lg font-bold uppercase tracking-[0.2em] md:text-xl">
                  Favorites
                </h3>
                <p className={cn('gallery-body-text text-sm leading-relaxed', isGalleryDark ? 'text-white/60' : 'text-zinc-500')}>
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
                    'gallery-body-text w-full rounded-none border px-3 py-3 text-sm outline-none transition-colors',
                    isGalleryDark
                      ? 'border-white/20 bg-black/40 text-white placeholder:text-white/35 focus:border-white/50'
                      : 'border-zinc-200 bg-white py-3 focus:border-zinc-950'
                  )}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={cn(
                      'gallery-body-text px-8 py-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-opacity disabled:opacity-50',
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

      <ShareCollectionModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        shareTitle={shareTitle}
        collectionId={collection?.id}
        isDark={isGalleryDark}
        initialSenderEmail={email}
        themeClassName={cn(`theme-${effectiveSettings.color_palette}`, `font-${effectiveSettings.font_family}`)}
      />

      <ClientExclusiveLoginModal
        open={showClientLogin}
        storedPassword={collection?.client_password_hash}
        onSuccess={handleClientLoginSuccess}
        onClose={() => setShowClientLogin(false)}
      />

      <ClientExclusiveToast message={privateToast} thumbnailUrl={privateToastThumb} />
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
