import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GalleryPreviewProps } from './PreviewPane.types';
import * as Covers from './CoverStyles';
import { CoverScrollHint, coverUsesEmbeddedScroll } from './CoverStyles/CoverScrollHint';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { ShareCollectionModal } from '../../Gallery/ShareCollectionModal/ShareCollectionModal';
import { MasonryGrid } from '../../Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../Gallery/PhotoLightbox/PhotoLightbox';
import { downloadSinglePhotoFile } from '../../../../lib/downloadPhoto';
import { DownloadModal } from '../../Gallery/DownloadModal/DownloadModal';
import { galleryService } from '../../../../services/gallery.service';
import { sortPhotosForGallery, normalizeGalleryPhotoSort } from '../../../../lib/galleryPhotoSort';
import {
  isCollectionFeatureEnabled,
  isSlideshowEnabledForCollection,
} from '../../../../lib/collectionFeatureFlags';
import { partitionGalleryMedia } from '../../../../lib/galleryMediaType';
import {
  GalleryStickyNav,
  GallerySetDescription,
} from '../../Gallery/GalleryChrome';
import { normalizeNavigationStyle } from '../../../../lib/navStyle';
import { GalleryBackToTop } from '../../Gallery/GalleryBackToTop/GalleryBackToTop';
import { GalleryEmptyGrid } from '../../Gallery/GalleryEmptyGrid/GalleryEmptyGrid';
import { GalleryPeopleStrip } from '../../Gallery/GalleryPeopleStrip/GalleryPeopleStrip';
import { smoothScrollToElement, smoothScrollToTop } from '../../../../lib/smoothGalleryScroll';
import { getPhotoFullDisplayUrl } from '../../../../lib/photoDisplayUrl';
import { getThumbnailSizeColumnCount } from '../../../../lib/masonryColumnDistribution';
import { normalizeFontId, normalizePaletteId } from '../../../../lib/normalizeDesignTokens';
import { filterPhotosByIds } from '../../../../lib/photoAiSearch';
import { useGalleryPeople } from '../../../../hooks/useGalleryPeople';
import {
  SALES_CAMPAIGNS_STORAGE_KEY,
  SALES_CAMPAIGNS_UPDATED_EVENT,
  readSalesCampaignsFromStorage,
  parseGalleryCampaignsFromStoreBanner,
  resolveGalleryCampaigns,
  pickActiveSalesCampaign,
} from '../../../../lib/salesCampaignBanner';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import './GalleryPreview.css';

const PREVIEW_MOBILE_REF_WIDTH = 375;
/** Typical laptop gallery width so the desktop frame matches the public web view. */
const PREVIEW_DESKTOP_REF_WIDTH = 1280;

function normalizeFavoritePhotoId(id: string | number | null | undefined): string | null {
  if (id == null || id === '') return null;
  return String(id);
}

function resolveDownloadSetAllowlist(selectedDownloadSets: string[] | undefined, namedSets: any[] = []) {
  if (!selectedDownloadSets?.length) return null;
  const hasNamedSets = namedSets.some((s) => s.name?.toLowerCase() !== 'highlights');
  const isLegacyHighlightsOnly =
    selectedDownloadSets.length === 1 &&
    String(selectedDownloadSets[0]).toLowerCase() === 'highlights' &&
    hasNamedSets;
  return isLegacyHighlightsOnly ? null : selectedDownloadSets;
}

function isDownloadSetAllowed(allowlist: string[] | null, key: string | null | undefined) {
  if (!allowlist) return true;
  return allowlist.some((item) => String(item) === String(key));
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
  photographerProfile = null,
  isPreviewMobile = false,
  coverLogoUrl,
}) => {
  const fontFamily = normalizeFontId(settings.fontFamily);
  const colorPalette = normalizePaletteId(settings.colorPalette);
  const { coverStyle, grid } = settings;
  const navigationStyle = normalizeNavigationStyle(grid.navigation);

  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState<any>(null);
  const [downloadBlockedMessage, setDownloadBlockedMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  const collectionSlug = dashboardState?.collection?.slug as string | undefined;
  const shareUrl = getCollectionShareUrl(collectionSlug || 'preview', photographerProfile);
  const shareTitle = collectionTitle || dashboardState?.collection?.name || 'Delivery';
  const isPreviewDark = colorPalette === 'dark';

  // Build a collection-shaped object the shared DownloadModal understands
  // Note: dashboardState.downloadPin is the boolean toggle, pinValue is the actual PIN string
  const photoDownloadSizes = dashboardState?.photoDownloadSizes as string[] | undefined;
  const photoDownloadResolutions = Array.isArray(photoDownloadSizes)
    ? Array.from(new Set(photoDownloadSizes))
        .map((s) => (s === 'high' ? 'full' : s))
        .filter((s) => s === 'web' || s === 'full' || s === 'original')
    : undefined;

  const videoDownloadEnabled = Boolean(dashboardState?.videoDownloadEnabled);
  const downloadLimitGallery = dashboardState?.downloadLimit
    ? Number(dashboardState.downloadLimit)
    : null;
  const pinUsageLimit = dashboardState?.pinUsageLimit
    ? Number(dashboardState.pinUsageLimit)
    : null;

  const downloadCollection = {
    ...dashboardState?.collection,
    name: collectionTitle || dashboardState?.collection?.name,
    download_pin: (dashboardState?.downloadPin && dashboardState?.pinValue) ? dashboardState.pinValue : null,
    email_capture_enabled: dashboardState?.emailTracking ?? false,
    require_pin_for_single_photo: dashboardState?.requirePinForSinglePhoto !== false,
    downloads_enabled: dashboardState?.photoDownload !== false,
    gallery_download_enabled: dashboardState?.galleryDownload !== false,
    single_photo_download_enabled: dashboardState?.singlePhotoDownload !== false,
    restrict_to_emails: dashboardState?.restrictToEmails?.trim()
      ? dashboardState.restrictToEmails
      : null,
    download_limit_gallery: downloadLimitGallery && Number.isFinite(downloadLimitGallery) ? downloadLimitGallery : null,
    pin_usage_limit: pinUsageLimit && Number.isFinite(pinUsageLimit) ? pinUsageLimit : null,
    selected_download_sets: dashboardState?.selectedDownloadSets,
    download_resolutions: photoDownloadResolutions,
    video_downloads_enabled: videoDownloadEnabled,
    video_download_resolution: dashboardState?.videoDownloadResolution ?? '1080p',
  };

  const collectionId = dashboardState?.collection?.id as string | undefined;
  const favFeatureOn = dashboardState?.favoritePhotos !== false;
  const storageKey = collectionId ? `pixnxt_fav_email_${collectionId}` : null;

  const galleryPeople = useGalleryPeople(collectionId, {
    enabled: Boolean(collectionId),
    isPublic: true,
  });

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
  const previewLayoutWidth = isPreviewMobile ? PREVIEW_MOBILE_REF_WIDTH : PREVIEW_DESKTOP_REF_WIDTH;

  const [galleryRefWidth, setGalleryRefWidth] = useState(previewLayoutWidth);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const galleryBodyRef = useRef<HTMLDivElement>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const innerGridRef = useRef<HTMLDivElement>(null);

  const scrollToGallery = useCallback(() => {
    smoothScrollToElement(galleryBodyRef.current, {
      scrollContainer: scrollContainerRef.current,
    });
  }, []);

  const scrollToTop = useCallback(() => {
    smoothScrollToTop(scrollContainerRef.current);
  }, []);
  const [gridScale, setGridScale] = useState(0.45);
  const [innerGridH, setInnerGridH] = useState(0);

  const getPadding = (w: number) => {
    if (w >= 1024) return '0 48px'; // lg:px-12
    if (w >= 768) return '0 32px'; // md:px-8
    return '0 16px'; // px-4
  };

  useEffect(() => {
    setGalleryRefWidth(previewLayoutWidth);
  }, [previewLayoutWidth]);

  useEffect(() => {
    let outerObs: ResizeObserver | null = null;
    let innerObs: ResizeObserver | null = null;

    const setup = () => {
      const outer = gridWrapperRef.current;
      const inner = innerGridRef.current;
      if (!outer || !inner) return;

      const syncScale = () => {
        const w = outer.offsetWidth;
        if (w > 0) setGridScale(w / previewLayoutWidth);
      };

      syncScale();
      outerObs = new ResizeObserver(syncScale);
      innerObs = new ResizeObserver(() => {
        const h = inner.offsetHeight;
        if (h > 0) setInnerGridH(h);
      });
      outerObs.observe(outer);
      innerObs.observe(inner);
    };

    const raf = requestAnimationFrame(setup);
    return () => {
      cancelAnimationFrame(raf);
      outerObs?.disconnect();
      innerObs?.disconnect();
    };
  }, [isPreviewMobile, previewLayoutWidth]);

  /** Re-measure grid scale when preview frame size changes (desktop ↔ mobile). */
  useEffect(() => {
    const outer = gridWrapperRef.current;
    if (!outer?.offsetWidth) return;
    const raf = requestAnimationFrame(() => {
      const w = outer.offsetWidth;
      if (w > 0) setGridScale(w / galleryRefWidth);
    });
    return () => cancelAnimationFrame(raf);
  }, [isPreviewMobile, galleryRefWidth]);

  useEffect(() => {
    if (!favFeatureOn) setShowOnlyFavorites(false);
  }, [favFeatureOn]);

  const [vaultEnabled, setVaultEnabled] = useState(false);

  useEffect(() => {
    if (collectionId) {
      galleryService.fetchVaultPlan(collectionId).then(plan => {
        setVaultEnabled(plan?.vault_enabled === true);
      });
    }
  }, [collectionId]);

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
      ? gridPhotos.filter((p: any) => String(p.set_id) === String(activeId))
      : gridPhotos.filter((p: any) => !p.set_id);
  }, [gridPhotos, dashboardState?.activeSetId]);

  const gallerySortKey = normalizeGalleryPhotoSort(dashboardState?.galleryPhotoSort);

  const photosSortedForGrid = useMemo(
    () => sortPhotosForGallery(photosForActiveSet, gallerySortKey),
    [photosForActiveSet, gallerySortKey]
  );

  const photosAfterPeopleFilter = useMemo(() => {
    if (galleryPeople.selfieMatchPhotoIds.length) {
      return filterPhotosByIds(photosSortedForGrid, galleryPeople.selfieMatchPhotoIds);
    }
    if (galleryPeople.activePerson?.photoIds?.length) {
      return filterPhotosByIds(photosSortedForGrid, galleryPeople.activePerson.photoIds);
    }
    return photosSortedForGrid;
  }, [photosSortedForGrid, galleryPeople.selfieMatchPhotoIds, galleryPeople.activePerson]);

  const filteredPhotos = useMemo(() => {
    let list = photosAfterPeopleFilter;
    if (showOnlyFavorites) {
      const favSet = new Set(favoritedPhotos);
      list = list.filter(
        (p: any) => p.id != null && favSet.has(normalizeFavoritePhotoId(p.id) as string)
      );
    }
    const { videos, photos } = partitionGalleryMedia(list);
    return [...videos, ...photos];
  }, [photosAfterPeopleFilter, showOnlyFavorites, favoritedPhotos]);

  const previewVideoPhotos = useMemo(
    () => partitionGalleryMedia(filteredPhotos).videos,
    [filteredPhotos]
  );
  const previewStillPhotos = useMemo(
    () => partitionGalleryMedia(filteredPhotos).photos,
    [filteredPhotos]
  );

  const showEmptyPlaceholderGrid =
    !showOnlyFavorites &&
    photosForActiveSet.length === 0 &&
    filteredPhotos.length === 0;

  const previewCustomRowHeight =
    grid.size === 'large' ? 420 : grid.size === 'regular' ? 300 : grid.size === 'small' ? 200 : 140;

  const previewCustomColumnCount = getThumbnailSizeColumnCount(grid.size, isPreviewMobile);

  const [salesCampaigns, setSalesCampaigns] = useState(() => readSalesCampaignsFromStorage());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SALES_CAMPAIGNS_STORAGE_KEY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setSalesCampaigns(parsed);
      } catch {
        /* ignore */
      }
    };
    const onCampaignsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setSalesCampaigns(detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SALES_CAMPAIGNS_UPDATED_EVENT, onCampaignsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SALES_CAMPAIGNS_UPDATED_EVENT, onCampaignsUpdated);
    };
  }, []);

  useEffect(() => {
    const dbCampaigns = parseGalleryCampaignsFromStoreBanner(
      dashboardState?.collection?.store_banner_text
    );
    if (!dbCampaigns?.length) return;
    setSalesCampaigns((prev) => resolveGalleryCampaigns(prev, dbCampaigns));
  }, [dashboardState?.collection?.store_banner_text]);

  const activeCampaign = useMemo(
    () => pickActiveSalesCampaign(salesCampaigns),
    [salesCampaigns]
  );

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
    () => filteredPhotos.map((p: any) => getPhotoFullDisplayUrl(p)),
    [filteredPhotos]
  );
  const downloadSetAllowlist = useMemo(
    () => resolveDownloadSetAllowlist(dashboardState?.selectedDownloadSets, dashboardState?.sets || []),
    [dashboardState?.selectedDownloadSets, dashboardState?.sets]
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
      alert('Save your delivery before using favorites in preview.');
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
        alert('Save your delivery before favoriting in preview.');
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
    const hasPin = !!(dashboardState?.downloadPin && dashboardState?.pinValue);

    // When PIN is ON, require it for single photo downloads too
    const pinRequiredForSingle = dashboardState?.requirePinForSinglePhoto !== false;

    const needsPin = hasPin && (!photo || pinRequiredForSingle);

    if (photo) {
      const matchedSet = dashboardState?.sets?.find((set: any) => String(set.id) === String(photo?.set_id));
      const photoDownloadAllowed = !photo?.set_id
        ? isDownloadSetAllowed(downloadSetAllowlist, 'Highlights')
        : isDownloadSetAllowed(downloadSetAllowlist, photo?.set_id) ||
          isDownloadSetAllowed(downloadSetAllowlist, matchedSet?.name);
      if (!photoDownloadAllowed) {
        setDownloadBlockedMessage('This set is not available for download.');
        window.setTimeout(() => setDownloadBlockedMessage(null), 4000);
        return;
      }

      // Films can be configured as watch-only independently of photographs.
      if (photo?.media_type === 'video' && dashboardState?.videoDownloadEnabled === false) {
        alert('This film is watch-only for this delivery.');
        return;
      }

      if (!needsPin && !needsEmail) {
        // Only download directly if auth is NOT required
          const offered = Array.isArray(dashboardState?.photoDownloadSizes)
            ? dashboardState.photoDownloadSizes.map((s: string) => (s === 'high' ? 'full' : s))
            : [];
          const resolution = offered.includes('web')
            ? 'web'
            : offered.includes('full')
              ? 'full'
              : offered.includes('original')
                ? 'original'
                : 'full';

          // Use the same download engine as the live gallery so size choices are respected.
          await downloadSinglePhotoFile(photo, {
            resolution,
            videoResolution: dashboardState?.videoDownloadResolution ?? dashboardState?.collection?.video_download_resolution,
          });

        // Log activity for direct download
        if (collectionId) {
          const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collectionId}`) || 'Visitor';
          await galleryService.logActivity(collectionId, 'download', {
            email: savedEmail,
            photographerId: dashboardState?.collection?.user_id || dashboardState?.collection?.photographer_id,
            photoId: photo.id,
            resolution: 'original',
            metadata: {
              type: photo.media_type === 'video' ? 'video' : 'photo',
              resolution: 'Original',
              quality: 'Original',
              source: 'Social / Gallery',
              destination: 'local',
              photoCount: 1,
              filename: photo.filename || null,
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
    const focals = dashboardState?.coverFocals;
    const fallbackX = dashboardState?.focalX;
    const fallbackY = dashboardState?.focalY;
    const point = isPreviewMobile
      ? (focals?.phone || { x: fallbackX, y: fallbackY })
      : (focals?.desktop || focals?.website || { x: fallbackX, y: fallbackY });
    const props = {
      title: collectionTitle,
      subtitle: photographerName,
      coverLogoUrl: coverLogoUrl,
      date: collectionDate,
      photoUrl: coverPhotoUrl,
      focalX: point?.x,
      focalY: point?.y,
      isPreview: true, // dashboard pane layout only
      onViewGallery: coverStyle !== 'none' ? scrollToGallery : undefined,
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
      ref={scrollContainerRef}
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
        {coverStyle !== 'none' && coverStyle !== 'classic' && !coverUsesEmbeddedScroll(coverStyle) ? (
          <CoverScrollHint
            coverStyle={coverStyle}
            onClick={scrollToGallery}
            isPreview
          />
        ) : null}
      </div>

      <div
        ref={galleryBodyRef}
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
          highlightsName={dashboardState?.highlightsName || 'Highlights'}
          sidebarSetOrder={
            dashboardState?.sidebarSetOrder ||
            dashboardState?.collection?.sidebar_set_order ||
            null
          }
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
          showShop={dashboardState?.collection?.store_enabled !== false}
          favoritedCount={favoritedPhotos.length}
          isDownloadingAll={isDownloadingAll}
          onFavoriteClick={handleFavoriteHeaderClick}
          onDownloadClick={handleDownloadClick}
          onShareClick={() => setShowShareModal(true)}
          onSlideshowClick={handleStartSlideshow}
          onShopClick={() => alert("This is a preview of the Cart navigation. In the live gallery, it opens the store or prompts to select an image.")}
          showPrintLab={dashboardState?.collection?.store_enabled !== false}
          onPrintLabClick={() => alert("This is a preview of Print Lab. In the live gallery, it shows an explore popup of all frame products.")}
          showBuyGallery={vaultEnabled}
          buyGalleryLabel="Buy Link"
          onBuyGalleryClick={() => alert("This is a preview of the Buy Link button. In the live gallery, it pops open the extension subscriptions card popup.")}
        />

        {setDescriptionText ? (
          <GallerySetDescription variant="preview" text={setDescriptionText} isDark={isPreviewDark} />
        ) : null}

        <GalleryPeopleStrip
          variant="preview"
          people={galleryPeople.people}
          loading={galleryPeople.loading}
          activePersonId={galleryPeople.activePersonId}
          selfieSearching={galleryPeople.selfieSearching}
          selfieMessage={galleryPeople.selfieMessage}
          isFilterActive={galleryPeople.isFilterActive}
          onSelectPerson={galleryPeople.selectPerson}
          onSelfiePick={galleryPeople.searchBySelfie}
          onClearFilter={galleryPeople.clearFilter}
        />

        {showOnlyFavorites && favFeatureOn && (
          <div
            className="flex flex-wrap items-center justify-center gap-2 border-b border-black/5 px-4 py-2 text-center"
            style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
          >
            <span className="gallery-body-text text-[10px] font-bold uppercase tracking-widest opacity-70">
              My favorites ({filteredPhotos.length})
            </span>
            <button
              type="button"
              className="gallery-body-text text-[10px] font-bold uppercase tracking-widest underline opacity-90 hover:opacity-60"
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
          className="cd-preview-grid-scaler"
          style={{
            backgroundColor: 'var(--gallery-secondary-bg)',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            /* Fallback height while ResizeObserver fires on the first frame */
            height: innerGridH > 0 ? `${innerGridH * gridScale}px` : `${200 * gridScale}px`,
          }}
        >
          <div
            ref={innerGridRef}
            className="cd-preview-grid-inner"
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
            {showEmptyPlaceholderGrid ? (
              <GalleryEmptyGrid isPreview isPreviewMobile={isPreviewMobile} />
            ) : (
              <div className="gallery-media-stack">
                {previewVideoPhotos.length > 0 ? (
                  <div className="gallery-media-stack__block">
                    {previewStillPhotos.length > 0 ? (
                      <p className="gallery-media-stack__title" style={{ color: 'var(--gallery-text)' }}>Videos</p>
                    ) : null}
                    <MasonryGrid
                      key={`${grid.style}-${grid.size}-${grid.spacing}-videos`}
                      photos={previewVideoPhotos}
                      videosOnly
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
                      showShop={dashboardState?.collection?.store_enabled !== false}
                      favoritedPhotoIds={favoritedPhotos}
                      customRowHeight={previewCustomRowHeight}
                      customColumnCount={previewCustomColumnCount}
                      showFilename={false}
                      forceShow={true}
                      isPreviewMobile={isPreviewMobile}
                      activeCampaign={null}
                    />
                  </div>
                ) : null}
                {previewStillPhotos.length > 0 ? (
                  <div className="gallery-media-stack__block">
                    {previewVideoPhotos.length > 0 ? (
                      <p className="gallery-media-stack__title" style={{ color: 'var(--gallery-text)' }}>Photos</p>
                    ) : null}
                    <MasonryGrid
                      key={`${grid.style}-${grid.size}-${grid.spacing}-photos`}
                      photos={previewStillPhotos}
                      gridSettings={grid}
                      isHorizontal={grid.style?.toLowerCase() === 'horizontal'}
                      onImageClick={(index) => {
                        setLightboxIndex(previewVideoPhotos.length + index);
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
                      showShop={dashboardState?.collection?.store_enabled !== false}
                      favoritedPhotoIds={favoritedPhotos}
                      customRowHeight={previewCustomRowHeight}
                      customColumnCount={previewCustomColumnCount}
                      showFilename={false}
                      forceShow={true}
                      isPreviewMobile={isPreviewMobile}
                      activeCampaign={activeCampaign}
                      onVisitShop={() =>
                        alert('This is a preview of the store promo. In the live gallery, it opens the print store.')
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {filteredPhotos.length > 0 ? (
          <GalleryBackToTop onClick={scrollToTop} isPreview />
        ) : null}
      </div>

      <PhotoLightbox
        isOpen={lightboxIndex !== -1}
        onClose={() => {
          setLightboxIndex(-1);
          setIsSlideshowActive(false);
        }}
        images={photoUrls}
        photos={filteredPhotos}
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
        showShop={dashboardState?.collection?.store_enabled !== false}
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
        {downloadBlockedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none fixed bottom-6 right-6 z-[1100] max-w-[min(92vw,360px)] rounded-2xl border border-black/10 bg-white/95 px-4 py-3 text-left text-[14px] font-semibold leading-6 text-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur"
          >
            {downloadBlockedMessage}
          </motion.div>
        )}
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
                  className="gallery-body-text w-full bg-zinc-950 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer mt-4 disabled:cursor-not-allowed disabled:opacity-50"
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
        onOpenMedia={(photo) => {
          const idx = filteredPhotos.findIndex((item) => item.id === photo.id);
          setShowDownloadModal(false);
          setSelectedDownloadPhoto(null);
          if (idx >= 0) setLightboxIndex(idx);
        }}
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
        downloadRequiresPassword={Boolean(
          dashboardState?.downloadPin && dashboardState?.pinValue
        )}
        activePhotoId={
          lightboxIndex >= 0 && filteredPhotos[lightboxIndex]
            ? filteredPhotos[lightboxIndex].id
            : null
        }
        activePhotoIndex={lightboxIndex >= 0 ? lightboxIndex : null}
      />
    </div>
  );
};
