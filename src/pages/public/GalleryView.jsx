import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import * as Covers from '../../components/features/CollectionDashboard/PreviewPane/CoverStyles';
import { supabase } from '../../lib/supabase/client';

import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../components/features/Gallery/PhotoLightbox/PhotoLightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { Container } from '../../components/ui/Container';
import { Typography } from '../../components/ui/Typography';
import { X, Mail, Share2, Download, Heart, Play, ShoppingBag, ShoppingCart, CreditCard, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { DownloadModal } from '../../components/features/Gallery/DownloadModal/DownloadModal';
import { ShareCollectionModal } from '../../components/features/Gallery/ShareCollectionModal/ShareCollectionModal';
import { downloadSinglePhotoFile } from '../../lib/downloadPhoto';
import { formatCoverDate } from '../../lib/formatCoverDate.js';
import { getCollectionFocal } from '../../lib/focalPoint';
import {
  GalleryStickyNav,
  GallerySetHeading,
  GallerySetDescription,
} from '../../components/features/Gallery/GalleryChrome';
import { renderMiniFrame } from '../../printstore/components/StoreHeader';
import { GalleryBackToTop } from '../../components/features/Gallery/GalleryBackToTop/GalleryBackToTop';
import { GalleryEmptyGrid } from '../../components/features/Gallery/GalleryEmptyGrid/GalleryEmptyGrid';
import { smoothScrollToElement, smoothScrollToTop } from '../../lib/smoothGalleryScroll';
import { getPhotoFullDisplayUrl, getWebResolutionUrl, resolveMediaUrl } from '../../lib/photoDisplayUrl';
import {
  buildDigitalPackageCartItem,
  fetchStorePackages,
  PACKAGE_THRESHOLD,
  resolveDigitalCategoryPricing,
} from '../../lib/storePackages';
import {
  countGalleryMedia,
  filterGalleryMediaByType,
  shouldShowGalleryMediaFilter,
  isGalleryVideo,
} from '../../lib/galleryMediaType';
import './GalleryView.css';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { normalizeGalleryPhotoSort, sortPhotosForGallery } from '../../lib/galleryPhotoSort';
import { normalizeNavigationStyle } from '../../lib/navStyle';
import {
  normalizePaletteId,
  normalizeFontId,
  normalizeCoverStyleId,
  resolveCoverLayoutId,
} from '../../lib/normalizeDesignTokens';
import {
  isClientSessionActive,
  setClientSessionActive,
  isClientExclusiveEnabled,
  filterPhotosForViewer,
  filterPhotosForDownload,
  filterSetsForViewer,
  canViewHighlights,
} from '../../lib/clientExclusiveAccess';
import {
  ClientExclusiveLoginModal,
  ClientExclusiveToast,
  ClientExclusiveClientBar,
} from '../../components/features/ClientExclusiveAccess';
import { clientExclusiveAccessService } from '../../services/clientExclusiveAccess.service';
import {
  cacheSlideshowEnabled,
  getSlideshowStorageKey,
  isCollectionFeatureEnabled,
  isSlideshowEnabledForCollection,
  parseSlideshowQueryParam,
  SLIDESHOW_CHANGED_EVENT,
  withResolvedSlideshowEnabled,
} from '../../lib/collectionFeatureFlags';
import {
  BannerBouquetSvg,
  formatBannerPlaceholders,
  getBannerFontFamily,
  padTimerPart,
  resolveBannerBackgroundImage,
  SALES_CAMPAIGNS_STORAGE_KEY,
  SALES_CAMPAIGNS_UPDATED_EVENT,
} from '../../lib/salesCampaignBanner';
import { filterPhotosByIds } from '../../lib/photoAiSearch';
import { useGalleryPeople } from '../../hooks/useGalleryPeople';
import { GalleryPeopleStrip } from '../../components/features/Gallery/GalleryPeopleStrip/GalleryPeopleStrip';

/** Stable string ids so Supabase UUIDs match `photo.id` from the collection payload. */
function normalizeFavoritePhotoId(id) {
  if (id == null || id === '') return null;
  return String(id);
}

const GalleryView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isMobileViewport = useIsMobileViewport();
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [watermarks, setWatermarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showNoImageShopModal, setShowNoImageShopModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [email, setEmail] = useState('');

  // Sales campaigns loaded from StoreDashboard localStorage for client site banner rendering
  const [campaigns, setCampaigns] = useState(() => {
    const stored = localStorage.getItem(SALES_CAMPAIGNS_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Keep banner in sync when StoreDashboard APPLY writes from another tab or same session
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SALES_CAMPAIGNS_STORAGE_KEY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setCampaigns(parsed);
      } catch (_) { /* ignore */ }
    };
    const onCampaignsUpdated = (e) => {
      if (Array.isArray(e.detail)) setCampaigns(e.detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SALES_CAMPAIGNS_UPDATED_EVENT, onCampaignsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SALES_CAMPAIGNS_UPDATED_EVENT, onCampaignsUpdated);
    };
  }, []);

  useEffect(() => {
    if (collection?.store_banner_text) {
      const txt = collection.store_banner_text;
      if (txt.startsWith('[') || txt.startsWith('{')) {
        try {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) {
            setCampaigns((prev) => {
              const isLive = (list) => list?.some(c =>
                c.enabled || Object.values(c.banners || {}).some(b => b?.enabled)
              );
              // Prefer DB when it has a live campaign; otherwise keep a fresher APPLY from localStorage
              if (isLive(parsed) || !isLive(prev)) return parsed;
              return prev;
            });
          }
        } catch (e) {
          console.error("Error parsing campaign from database store_banner_text:", e);
        }
      }
    }
  }, [collection]);

  const activeCampaign = useMemo(() => {
    if (!campaigns?.length) return null;
    // Prefer an explicitly enabled campaign, then any with an active banner
    const explicitlyEnabled = campaigns.find(c => c.enabled);
    if (explicitlyEnabled) return explicitlyEnabled;
    return campaigns.find(c =>
      Object.values(c.banners || {}).some(b => b?.enabled)
    ) || null;
  }, [campaigns]);

  const [campaignTimeLeft, setCampaignTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!activeCampaign?.banners?.large_banner?.enabled) return undefined;
    const storageKey = `pixnxt_campaign_timer_${activeCampaign.id || 'default'}`;
    let targetTime = localStorage.getItem(storageKey);
    if (!targetTime) {
      const now = new Date();
      now.setDate(now.getDate() + Number(activeCampaign.durationDays || 14));
      targetTime = String(now.getTime());
      localStorage.setItem(storageKey, targetTime);
    }

    const updateTimer = () => {
      const difference = Number(targetTime) - Date.now();
      if (difference <= 0) {
        setCampaignTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCampaignTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCampaign]);

  const [showShopModal, setShowShopModal] = useState(false);
  const [showPrintLabModal, setShowPrintLabModal] = useState(false);
  const [shopEmail, setShopEmail] = useState('');
  const [pendingShopPhoto, setPendingShopPhoto] = useState(null);
  const [isSubmittingShopEmail, setIsSubmittingShopEmail] = useState(false);
  const [activeProducts, setActiveProducts] = useState([]);

  // Paid Digital Download States
  const [showDigitalDownloadModal, setShowDigitalDownloadModal] = useState(false);
  const [digitalDownloadPhoto, setDigitalDownloadPhoto] = useState(null);
  const [showDigitalPurchaseDetail, setShowDigitalPurchaseDetail] = useState(false);
  const [isPurchaseAllDefault, setIsPurchaseAllDefault] = useState(false);
  const [pendingDownloadPhoto, setPendingDownloadPhoto] = useState(null);
  const [isPendingDownloadAll, setIsPendingDownloadAll] = useState(false);
  const [selectedDownloadType, setSelectedDownloadType] = useState('single'); // 'single' | 'all' | 'package'
  const [selectedStorePackage, setSelectedStorePackage] = useState(null);
  const [storePackages, setStorePackages] = useState([]);
  /** Sticky-bar mode: user picks package photos from the live gallery */
  const [packagePickerActive, setPackagePickerActive] = useState(false);
  const [packageSelectedPhotos, setPackageSelectedPhotos] = useState([]);

  // Permanent Vault States
  const [showVaultPaymentModal, setShowVaultPaymentModal] = useState(false);
  const [selectedVaultPlan, setSelectedVaultPlan] = useState(null);
  const [vaultCardName, setVaultCardName] = useState('');
  const [vaultCardNumber, setVaultCardNumber] = useState('');
  const [vaultCardExpiry, setVaultCardExpiry] = useState('');
  const [vaultCardCvc, setVaultCardCvc] = useState('');
  const [isVaultPaying, setIsVaultPaying] = useState(false);
  const [vaultEmail, setVaultEmail] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultPurchasedState, setVaultPurchasedState] = useState(false);
  const [vaultPlan, setVaultPlan] = useState(null); // from vault_extension_plans table
  const [vaultPaymentMethod, setVaultPaymentMethod] = useState('Credit Card');

  const openVaultModal = () => {
    setVaultError('');
    setSelectedVaultPlan(null);
    setVaultPaymentMethod('Credit Card'); // reset to default
    setShowVaultPaymentModal(true);
  };

  const getExtensionExpiryDate = (plan) => {
    if (!collection?.auto_expiry) {
      const now = new Date();
      if (plan === '1month') now.setDate(now.getDate() + 30);
      else if (plan === '1year') now.setDate(now.getDate() + 365);
      return now.toLocaleDateString('en-IN', { dateStyle: 'long' });
    }
    const baseDate = new Date(collection.auto_expiry);
    if (plan === '1month') {
      baseDate.setDate(baseDate.getDate() + 30);
      return baseDate.toLocaleDateString('en-IN', { dateStyle: 'long' });
    } else if (plan === '1year') {
      baseDate.setDate(baseDate.getDate() + 365);
      return baseDate.toLocaleDateString('en-IN', { dateStyle: 'long' });
    }
    return 'Permanent';
  };

  useEffect(() => {
    if (collection?.id) {
      // 1. Fetch vault settings (enabled, price, desc, etc.)
      galleryService.fetchVaultPlan(collection.id).then(plan => {
        if (plan) setVaultPlan(plan);
      });
      // 2. Fetch from database if they already purchased the permanent vault for this gallery!
      supabase
        .from('buylink_plans')
        .select('id')
        .eq('collection_id', collection.id)
        .eq('status', 'completed')
        .limit(1)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setVaultPurchasedState(true);
          } else {
            // fallback to local storage
            setVaultPurchasedState(localStorage.getItem(`pixnxt_vault_purchased_${collection.id}`) === 'true');
          }
        });
    }
  }, [collection?.id]);

  useEffect(() => {
    if (email && !vaultEmail) {
      setVaultEmail(email);
    }
  }, [email]);

  const handleVaultPaymentSubmit = async (e) => {
    e.preventDefault();
    setVaultError('');

    const targetEmail = vaultEmail || email;
    if (!targetEmail) {
      setVaultError('Please enter your email address for delivery confirmation.');
      return;
    }

    if (vaultPaymentMethod === 'Credit Card') {
      if (!vaultCardName.trim()) {
        setVaultError('Cardholder Name is required');
        return;
      }
      if (!vaultCardNumber.trim() || vaultCardNumber.replace(/\s/g, '').length < 16) {
        setVaultError('Please enter a valid 16-digit card number');
        return;
      }
      if (!vaultCardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(vaultCardExpiry)) {
        setVaultError('Please enter a valid expiry date (MM/YY)');
        return;
      }
      if (!vaultCardCvc.trim() || vaultCardCvc.length < 3) {
        setVaultError('Please enter a valid 3-digit CVC');
        return;
      }
    }

    setIsVaultPaying(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let price = 499;
      let planName = 'Permanent Vault Storage Access';

      if (selectedVaultPlan === '1month') {
        price = parseFloat(vaultPlan?.price_1month || 99);
        planName = 'Gallery Access Extension (1 Month)';
      } else if (selectedVaultPlan === '1year') {
        price = parseFloat(vaultPlan?.price_1year || 299);
        planName = 'Gallery Access Extension (1 Year)';
      } else {
        price = parseFloat(vaultPlan?.price_lifetime || 499);
        planName = 'Permanent Vault Storage Access';
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from('buylink_plans')
        .insert({
          collection_id: collection.id,
          customer_name: vaultCardName || 'Client Visitor',
          customer_email: targetEmail,
          amount_paid: price,
          plan_type: selectedVaultPlan || 'lifetime',
          status: 'completed',
          payment_method: vaultPaymentMethod || 'Credit Card',
          payment_intent_id: 'mock_pi_vault_' + Math.random().toString(36).substr(2, 9)
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      localStorage.setItem(`pixnxt_vault_purchased_${collection.id}`, 'true');
      localStorage.setItem(`pixnxt_vault_purchased_plan_${collection.id}`, selectedVaultPlan);
      setVaultPurchasedState(true);

      try {
        await fetch(`${supabase.supabaseUrl}/functions/v1/send-order-placed-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({
            orderId: purchase.id,
            recipientEmail: targetEmail,
            siteOrigin: window.location.origin
          })
        });
      } catch (emailErr) {
        console.warn('Could not trigger vault order placing email:', emailErr);
      }

      setIsVaultPaying(false);
      setShowVaultPaymentModal(false);
    } catch (err) {
      console.error('Vault payment error:', err);
      setIsVaultPaying(false);
      setVaultError(err.message || 'Payment failed. Please check your card details.');
    }
  };

  useEffect(() => {
    async function loadActiveProducts() {
      try {
        const { data, error } = await supabase
          .from('printstore_products')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: true });
        if (!error && data) {
          setActiveProducts(data);
        }
      } catch (err) {
        console.error("Error loading active products for Print Lab:", err);
      }
    }
    loadActiveProducts();
  }, []);

  useEffect(() => {
    if (email) {
      setShopEmail(email);
    }
  }, [email]);

  const isPaidDigitalDownloadOn = !!(
    collection?.digital_download_enabled === true
    || collection?.digital_download_enabled === 'true'
    || collection?.digital_download_enabled === 1
  );

  useEffect(() => {
    if (!isPaidDigitalDownloadOn) return undefined;

    /* Capture deterrent only for real screenshot chords / print.
       Never arm on tab switch / blur; clear any stuck shield when returning. */
    const SHIELD = 'pixnxt-capture-shield';
    let shieldUntil = 0;
    let releaseTimer = null;
    const isMac = typeof navigator !== 'undefined'
      && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

    const clearShield = () => {
      shieldUntil = 0;
      clearTimeout(releaseTimer);
      releaseTimer = null;
      document.documentElement.classList.remove(SHIELD);
      document.body.classList.remove(SHIELD);
      document.body.classList.remove('pixnxt-screenshot-guard');
    };

    const armShield = (ms = 1200) => {
      document.documentElement.classList.add(SHIELD);
      document.body.classList.add(SHIELD);
      shieldUntil = Math.max(shieldUntil, Date.now() + ms);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        if (Date.now() >= shieldUntil) clearShield();
      }, ms + 40);
    };

    const handleContextMenu = (e) => {
      if (
        e.target.tagName === 'IMG'
        || e.target.closest('.masonry-grid-container')
        || e.target.closest('.photo-lightbox-root')
      ) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e) => {
      if (e.target.tagName === 'IMG') e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const code = e.code || '';

      if (metaOrCtrl && ['c', 'C', 's', 'S', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
      }

      // Windows PrintScreen
      if (code === 'PrintScreen' || e.key === 'PrintScreen' || e.key === 'PrtScn') {
        e.preventDefault();
        armShield(1600);
        try { navigator.clipboard.writeText(''); } catch (_) { /* ignore */ }
        return;
      }

      // macOS screenshot: Cmd+Shift+3/4/5 only (digit may be swallowed by OS — still arm on digit when we see it)
      if (e.metaKey && shift && ['Digit3', 'Digit4', 'Digit5'].includes(code)) {
        e.preventDefault();
        armShield(1800);
        return;
      }

      // Windows Snipping: Win+Shift+S (not Cmd+Shift+S on Mac — that is Save As)
      if (!isMac && e.metaKey && shift && code === 'KeyS') {
        e.preventDefault();
        armShield(1800);
      }
    };

    // Coming back to this tab/screen — never show the shield; only clear leftovers
    const handleReturnToPage = () => {
      if (!document.hidden) clearShield();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleReturnToPage);
    window.addEventListener('focus', handleReturnToPage);
    window.addEventListener('pageshow', handleReturnToPage);

    const style = document.createElement('style');
    style.id = 'pixnxt-security-styles';
    style.innerHTML = `
      @media print {
        html, body { display: none !important; }
      }
      .masonry-grid-container img,
      .photo-lightbox-root img,
      .gallery-view img {
        -webkit-user-drag: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      html.${SHIELD},
      body.${SHIELD} {
        background: #0f0f0f !important;
      }
      html.${SHIELD} img,
      html.${SHIELD} video,
      html.${SHIELD} canvas,
      body.${SHIELD} img,
      body.${SHIELD} video,
      body.${SHIELD} canvas {
        visibility: hidden !important;
        opacity: 0 !important;
      }
      body.${SHIELD}::after {
        content: "Screenshots & screen recording are disabled while digital downloads are available for purchase.";
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        text-align: center;
        background: #0f0f0f;
        color: #f5f5f5;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0.02em;
        line-height: 1.45;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    // Ensure a fresh visit never starts with a leftover shield
    clearShield();

    return () => {
      clearShield();
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleReturnToPage);
      window.removeEventListener('focus', handleReturnToPage);
      window.removeEventListener('pageshow', handleReturnToPage);
      style.remove();
    };
  }, [isPaidDigitalDownloadOn]);

  const goToPrintstore = useCallback((queryExtra = '') => {
    if (!collection?.slug) return;
    const returnPath = `/gallery/${collection.slug}?socialSharing=1`;
    try {
      sessionStorage.setItem('pixnxt_printstore_return', JSON.stringify({ path: returnPath }));
    } catch (_) { /* ignore */ }
    const q = queryExtra.startsWith('&') || queryExtra.startsWith('?')
      ? queryExtra.replace(/^[?&]/, '&')
      : (queryExtra ? `&${queryExtra}` : '');
    window.location.assign(`/printstore?slug=${collection.slug}${q}`);
  }, [collection?.slug]);

  const handleShopClick = useCallback(async (photo) => {
    if (!photo || !collection) return;
    const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
    if (savedEmail) {
      goToPrintstore(`photo=${photo.id}`);
    } else {
      setPendingShopPhoto(photo);
      setShopEmail(email || '');
      setShowShopModal(true);
    }
  }, [collection, email, goToPrintstore]);

  const handleShopEmailSubmit = async () => {
    if (!shopEmail || !collection) return;
    try {
      setIsSubmittingShopEmail(true);
      const session = await galleryService.createOrGetSession(collection.id, shopEmail);
      localStorage.setItem(`pixnxt_fav_email_${collection.id}`, shopEmail);
      localStorage.setItem('pixnxt_printstore_email', shopEmail);

      setShowShopModal(false);
      setIsSubmittingShopEmail(false);

      if (pendingDownloadPhoto || isPendingDownloadAll) {
        const photoToPass = isPendingDownloadAll ? null : pendingDownloadPhoto;
        setPendingDownloadPhoto(null);
        setIsPendingDownloadAll(false);
        handleDigitalDownloadClick(photoToPass);
      } else if (pendingShopPhoto) {
        goToPrintstore(`photo=${pendingShopPhoto.id}`);
      }
    } catch (e) {
      console.error("Failed to register shop email session:", e);
      alert("Failed to submit email. Please try again.");
      setIsSubmittingShopEmail(false);
    }
  };
  const [activeSetId, setActiveSetId] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('photos');
  const [selectedDownloadPhoto, setSelectedDownloadPhoto] = useState(null);
  const isDownloadingAll = false;
  const downloadProgress = { done: 0, total: 0 };

  // Favorites state
  const [sessionId, setSessionId] = useState(null);
  const [favoritedPhotos, setFavoritedPhotos] = useState([]);
  const galleryPeople = useGalleryPeople(collection?.id, {
    enabled: Boolean(collection?.id),
    isPublic: true,
  });

  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [favoriteListPhotos, setFavoriteListPhotos] = useState([]);
  const [isFavoriteListMode, setIsFavoriteListMode] = useState(false);
  const [activeFavoriteList, setActiveFavoriteList] = useState(null);
  const [isClientViewer, setIsClientViewer] = useState(false);
  const [showClientLogin, setShowClientLogin] = useState(false);
  const [privateToast, setPrivateToast] = useState(null);
  const [privateToastThumb, setPrivateToastThumb] = useState(null);

  // Preference Settings from localStorage
  const [showTosModal, setShowTosModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const tosText = localStorage.getItem('tos_text') || '';
  const privacyText = localStorage.getItem('privacy_policy_text') || '';
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    return localStorage.getItem('cookie_banner_enabled') === 'true' && !sessionStorage.getItem('cookie_banner_acknowledged');
  });

  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');
  const photosParam = searchParams.get('photos');

  const sharedPhotoIds = useMemo(() => {
    if (!photosParam) return null;
    return new Set(photosParam.split(',').map(id => id.trim()).filter(Boolean));
  }, [photosParam]);

  const getPickListId = useCallback(() => {
    if (!collection?.id) return null;
    return sessionStorage.getItem(`pixnxt_fav_pick_list_${collection.id}`);
  }, [collection?.id]);

  const refreshSelectionList = useCallback(
    async (sid, explicitListId = null) => {
      if (!sid) {
        setActiveFavoriteList(null);
        setFavoritedPhotos([]);
        return;
      }
      try {
        const pickListId = getPickListId();
        const targetListId =
          explicitListId ||
          pickListId ||
          listId ||
          (await galleryService.getSessionDefaultFavoriteList(sid))?.id;
        if (!targetListId) {
          setActiveFavoriteList(null);
          setFavoritedPhotos([]);
          return;
        }
        const row = await galleryService.getFavoriteListById(targetListId, sid);
        setActiveFavoriteList(row);
        if (row) {
          const favs = await galleryService.getFavorites(sid, row.id);
          setFavoritedPhotos((favs || []).map(normalizeFavoritePhotoId).filter(Boolean));
        } else {
          setFavoritedPhotos([]);
        }
      } catch (e) {
        console.warn('Active favorite list:', e);
        setActiveFavoriteList(null);
        setFavoritedPhotos([]);
      }
    },
    [listId, getPickListId]
  );

  useEffect(() => {
    const faviconUrl = photographer?.favicon_url || localStorage.getItem('custom_favicon_url');
    if (!faviconUrl) return;

    const link = document.querySelector("link[rel*='icon']");
    const originalHref = link ? link.getAttribute('href') : '/logo.png';
    const originalType = link ? link.getAttribute('type') : 'image/png';

    if (link) {
      link.href = faviconUrl;
      if (faviconUrl.endsWith('.png')) {
        link.type = 'image/png';
      } else if (faviconUrl.endsWith('.gif')) {
        link.type = 'image/gif';
      } else if (faviconUrl.endsWith('.ico')) {
        link.type = 'image/x-icon';
      }
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = faviconUrl;
      if (faviconUrl.endsWith('.png')) {
        newLink.type = 'image/png';
      } else if (faviconUrl.endsWith('.gif')) {
        newLink.type = 'image/gif';
      } else if (faviconUrl.endsWith('.ico')) {
        newLink.type = 'image/x-icon';
      }
      document.head.appendChild(newLink);
    }

    return () => {
      const activeLink = document.querySelector("link[rel*='icon']");
      if (activeLink) {
        activeLink.href = originalHref;
        if (originalType) {
          activeLink.type = originalType;
        } else {
          activeLink.removeAttribute('type');
        }
      }
    };
  }, [photographer]);

  useEffect(() => {
    refreshSelectionList(sessionId, null);
  }, [sessionId, listId, collection?.id, refreshSelectionList]);

  const selectionListId = activeFavoriteList?.id || listId || null;
  const favoritesLocked = Boolean(activeFavoriteList?.submitted_at);
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

      const targetList =
        getPickListId() ||
        listId ||
        (await galleryService.getSessionDefaultFavoriteList(session.id))?.id;
      await refreshSelectionList(session.id, targetList || null);
      let newFavs = (await galleryService.getFavorites(session.id, targetList))
        .map(normalizeFavoritePhotoId)
        .filter(Boolean);

      const pending = normalizeFavoritePhotoId(pendingFavoritePhotoId);
      if (pending && targetList) {
        if (!newFavs.includes(pending)) {
          await galleryService.toggleFavorite(session.id, pending, true, targetList);
          newFavs = [...newFavs, pending];
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
        await refreshSelectionList(session.id, listId || null);
        const listMeta = await galleryService.getFavoriteListById(
          listId || (await galleryService.getSessionDefaultFavoriteList(session.id))?.id,
          session.id
        );
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

    if (favoritesLocked) {
      alert('Your favorites have been submitted and can no longer be changed.');
      return;
    }

    if (sessionId) {
      const isCurrentlyFavorited = favoritedPhotos.includes(pid);
      try {
        await galleryService.toggleFavorite(
          sessionId,
          pid,
          !isCurrentlyFavorited,
          selectionListId
        );
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
        if (e?.code === 'LIST_SUBMITTED') {
          alert(e.message || 'This list has been submitted and cannot be changed.');
          await refreshSelectionList(sessionId, listId || null);
          return;
        }
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

  const getWatermarkOptions = () => {
    if (!collection || !photographer) return null;

    if (!photographer.watermark_web_downloads) return null;

    const hasWatermark = collection.default_watermark && collection.default_watermark !== 'No watermark';
    if (!hasWatermark) return null;

    let wm = watermarks.find(w => w.id === collection.default_watermark);
    if (!wm) {
      wm = watermarks.find(w => w.name === collection.default_watermark);
    }

    if (!wm && (photographer.watermark_url || photographer.watermark_text)) {
      wm = {
        type: photographer.watermark_type,
        url: photographer.watermark_url,
        text: photographer.watermark_text,
        font: photographer.watermark_font,
        color: photographer.watermark_color,
        scale: photographer.watermark_scale,
        opacity: photographer.watermark_opacity,
        position: photographer.watermark_position || 'center',
      };
    }

    if (!wm) return null;

    return {
      watermark_type: wm.type,
      watermark_url: wm.url,
      watermark_text: wm.text,
      watermark_font: wm.font,
      watermark_color: wm.color,
      watermark_scale: wm.scale,
      watermark_opacity: wm.opacity,
      watermark_position: wm.position || 'center',
    };
  };

  const handleDigitalDownloadClick = async (photoOrEvent = null) => {
    const photo = (photoOrEvent && photoOrEvent.id) ? photoOrEvent : null;
    const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
    if (!savedEmail) {
      if (photo) {
        setPendingDownloadPhoto(photo);
        setIsPendingDownloadAll(false);
      } else {
        setPendingDownloadPhoto(filteredPhotos[0] || null);
        setIsPendingDownloadAll(true);
      }
      setShopEmail(email || '');
      setShowShopModal(true);
      return;
    }

    // Always open buy popup when paid digital is on — do not short-circuit
    // with “already purchased / check your email” (every download stays paid).
    setDigitalDownloadPhoto(photo || filteredPhotos[0] || null);
    setIsPurchaseAllDefault(!photo);
    setShowDigitalDownloadModal(true);
  };

  const handleDownloadClick = async (photoOrEvent = null) => {
    if (isPaidDigitalDownloadOn) {
      handleDigitalDownloadClick(photoOrEvent);
      return;
    }
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
        const watermarkOptions = getWatermarkOptions();
        await downloadSinglePhotoFile(photo, watermarkOptions);

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

  const handleDownloadButtonAction = useCallback((photo) => {
    if (isPaidDigitalDownloadOn) {
      handleDigitalDownloadClick(photo);
    } else {
      handleDownloadClick(photo);
    }
  }, [isPaidDigitalDownloadOn, handleDigitalDownloadClick, handleDownloadClick]);

  const galleryRef = useRef(null);

  const scrollToGallery = useCallback(() => {
    smoothScrollToElement(galleryRef.current);
  }, []);

  const scrollToTop = useCallback(() => {
    smoothScrollToTop();
  }, []);

  const previewCoverStyle = searchParams.get('coverStyle');
  const previewFont = searchParams.get('font');
  const previewColor = searchParams.get('color');
  const previewGrid = searchParams.get('grid');
  const previewSlideshow = searchParams.get('slideshow');

  const getEffectiveSettings = () => {
    if (!collection) return {
      cover_style: 'novel',
      font_family: 'sans',
      color_palette: 'light',
      grid_style: 'vertical',
      nav_style: 'icons'
    };
    return {
      cover_style: previewCoverStyle
        ? normalizeCoverStyleId(previewCoverStyle)
        : resolveCoverLayoutId(collection),
      font_family: normalizeFontId(previewFont || collection.font_family || 'sans'),
      color_palette: normalizePaletteId(previewColor || collection.color_palette || 'light'),
      grid_style: previewGrid || collection.grid_style || 'vertical',
      nav_style: collection.nav_style || 'icons'
    };
  };

  const effectiveSettings = getEffectiveSettings();
  const navigationStyle = normalizeNavigationStyle(effectiveSettings.nav_style);
  const isGalleryDark = effectiveSettings.color_palette === 'dark';

  const showGalleryDownload =
    (isCollectionFeatureEnabled(collection?.downloads_enabled) &&
      isCollectionFeatureEnabled(collection?.gallery_download_enabled)) ||
    isPaidDigitalDownloadOn;
  const showGalleryShare = isCollectionFeatureEnabled(collection?.social_sharing_enabled);
  const showGallerySlideshow = isSlideshowEnabledForCollection(collection);
  const showSinglePhotoDownload =
    (isCollectionFeatureEnabled(collection?.downloads_enabled) &&
      isCollectionFeatureEnabled(collection?.single_photo_download_enabled)) ||
    isPaidDigitalDownloadOn;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + "/gallery/" + (slug || '') : '';
  const shareTitle = collection?.name || 'Collection';

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const data = await galleryService.getCollectionBySlug(slug);

        if (!data) {
          setError(
            'This gallery is not available. Publish the collection, confirm the URL slug in Settings, and scan again.'
          );
          return;
        }

        let resolved = withResolvedSlideshowEnabled(data);
        const urlSlideshow = parseSlideshowQueryParam(previewSlideshow);
        if (urlSlideshow !== undefined) {
          resolved = { ...resolved, slideshow_enabled: urlSlideshow };
          cacheSlideshowEnabled(resolved.id, urlSlideshow);
        }
        setCollection(resolved);
        if (
          resolved.id &&
          Object.prototype.hasOwnProperty.call(resolved, 'slideshow_enabled')
        ) {
          cacheSlideshowEnabled(resolved.id, resolved.slideshow_enabled !== false);
        }
        if (isClientExclusiveEnabled(data)) {
          setIsClientViewer(isClientSessionActive(data.id));
        } else {
          setIsClientViewer(false);
        }

        if (data.photographer_id) {
          const p = await galleryService.getPhotographerProfile(data.photographer_id);
          setPhotographer(p);
          try {
            const wms = await galleryService.getWatermarks(data.photographer_id);
            setWatermarks(wms || []);
          } catch (e) {
            console.error('Failed to fetch watermarks', e);
          }
          try {
            const pkgs = await fetchStorePackages(data.photographer_id, { activeOnly: true });
            setStorePackages(pkgs || []);
          } catch (pkgErr) {
            console.warn('Could not load store packages:', pkgErr);
            setStorePackages([]);
          }
        }

        // Check for existing session email
        const savedEmail = localStorage.getItem(`pixnxt_fav_email_${data.id}`);
        if (savedEmail) {
          try {
            const session = await galleryService.createOrGetSession(data.id, savedEmail);
            setSessionId(session.id);
            setEmail(savedEmail);
            await refreshSelectionList(session.id, listId || null);
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

  const applySlideshowSetting = useCallback((collectionId, enabled, skipCache = false) => {
    if (!collectionId) return;
    if (!skipCache) cacheSlideshowEnabled(collectionId, enabled);
    setCollection((prev) => {
      if (!prev || prev.id !== collectionId) return prev;
      if (prev.slideshow_enabled === enabled) return prev;
      return { ...prev, slideshow_enabled: enabled };
    });
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel('pixnxt-gallery-update');
    const onMessage = (event) => {
      if (event.data.type !== 'SETTINGS_UPDATED') return;
      if (event.data.slug !== slug && event.data.collectionId !== collection?.id) return;

      if (event.data.settings?.slideshow_enabled !== undefined) {
        const id = event.data.collectionId ?? collection?.id;
        applySlideshowSetting(id, event.data.settings.slideshow_enabled !== false);
      }

      if (event.data.settings?.social_sharing_enabled !== undefined) {
        setCollection((prev) =>
          prev
            ? { ...prev, social_sharing_enabled: event.data.settings.social_sharing_enabled }
            : prev
        );
      }
    };
    channel.onmessage = onMessage;
    return () => channel.close();
  }, [slug, collection?.id, applySlideshowSetting]);

  useEffect(() => {
    const onSlideshowChanged = (event) => {
      const { collectionId, enabled } = event.detail ?? {};
      if (!collectionId) return;
      if (collection?.id && collectionId !== collection.id) return;
      applySlideshowSetting(collectionId, enabled, true);
    };
    const onStorage = (event) => {
      if (!collection?.id || event.key !== getSlideshowStorageKey(collection.id)) return;
      if (event.newValue === '0') applySlideshowSetting(collection.id, false);
      else if (event.newValue === '1') applySlideshowSetting(collection.id, true);
    };
    window.addEventListener(SLIDESHOW_CHANGED_EVENT, onSlideshowChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SLIDESHOW_CHANGED_EVENT, onSlideshowChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [collection?.id, applySlideshowSetting]);

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
  }, [listId, scrollToGallery]);

  const openLightbox = useCallback((index, { autoplay = false } = {}) => {
    setLightboxIndex(index);
    setIsSlideshowActive(autoplay);
  }, []);

  const startPackageGalleryPicker = useCallback((pack) => {
    if (!pack) return;
    setSelectedDownloadType('package');
    setSelectedStorePackage(pack);
    setPackageSelectedPhotos([]);
    setPackagePickerActive(true);
    setShowDigitalDownloadModal(false);
    setShowDigitalPurchaseDetail(false);
    // Bring the live gallery into view for selection
    window.setTimeout(() => {
      try {
        window.scrollTo({ top: Math.max(0, window.innerHeight * 0.55), behavior: 'smooth' });
      } catch (_) { /* ignore */ }
    }, 50);
  }, []);

  const exitPackageGalleryPicker = useCallback(() => {
    setPackagePickerActive(false);
    setPackageSelectedPhotos([]);
    setSelectedStorePackage(null);
    setSelectedDownloadType('single');
  }, []);

  const togglePackagePhotoSelection = useCallback((photo) => {
    if (!photo?.id || !selectedStorePackage) return;
    const max = Math.max(1, Number(selectedStorePackage.photo_count) || 1);
    setPackageSelectedPhotos((prev) => {
      const exists = prev.some((p) => String(p.id) === String(photo.id));
      if (exists) return prev.filter((p) => String(p.id) !== String(photo.id));
      if (prev.length >= max) return prev;
      return [...prev, photo];
    });
  }, [selectedStorePackage]);

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

  const downloadablePhotos = useMemo(() => {
    if (!collection) return [];
    return filterPhotosForDownload(
      collection.photos || [],
      collection,
      isClientViewer,
      collection.sets || []
    );
  }, [collection, isClientViewer]);

  const downloadableSets = useMemo(() => {
    if (!collection?.sets) return [];
    return filterSetsForViewer(collection.sets, collection, isClientViewer);
  }, [collection, isClientViewer]);

  const filteredPhotosBase = useMemo(() => {
    let base = photosForActiveSet;
    if (sharedPhotoIds) {
      base = base.filter((p) => sharedPhotoIds.has(String(p.id)));
    }
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
  }, [collection, photosForActiveSet, isClientViewer, activeSetId, sharedPhotoIds]);

  const mediaCounts = useMemo(() => countGalleryMedia(filteredPhotosBase), [filteredPhotosBase]);

  const digitalPricing = useMemo(() => {
    if (!collection) return null;
    const collectionMedia = countGalleryMedia(collection.photos || []);
    const photoCount = collectionMedia.photos > 0
      ? collectionMedia.photos
      : (collection.photos || []).length;
    return resolveDigitalCategoryPricing(storePackages, collection, { photoCount });
  }, [collection, storePackages]);

  useEffect(() => {
    if (mediaCounts.photos > 0) setMediaFilter('photos');
    else if (mediaCounts.videos > 0) setMediaFilter('videos');
  }, [activeSetId, mediaCounts.photos, mediaCounts.videos]);

  const showMediaFilter = shouldShowGalleryMediaFilter(mediaCounts);

  const photosAfterPeopleFilter = useMemo(() => {
    if (galleryPeople.selfieMatchPhotoIds.length) {
      return filterPhotosByIds(filteredPhotosBase, galleryPeople.selfieMatchPhotoIds);
    }
    if (galleryPeople.activePerson?.photoIds?.length) {
      return filterPhotosByIds(filteredPhotosBase, galleryPeople.activePerson.photoIds);
    }
    return filteredPhotosBase;
  }, [filteredPhotosBase, galleryPeople.selfieMatchPhotoIds, galleryPeople.activePerson]);

  const filteredPhotos = useMemo(() => {
    if (!showMediaFilter) return photosAfterPeopleFilter;
    return filterGalleryMediaByType(photosAfterPeopleFilter, mediaFilter);
  }, [photosAfterPeopleFilter, showMediaFilter, mediaFilter]);

  const handleGridImageClick = useCallback((index) => {
    const photo = filteredPhotos?.[index];
    if (packagePickerActive && photo) {
      togglePackagePhotoSelection(photo);
      return;
    }
    openLightbox(index);
  }, [packagePickerActive, filteredPhotos, togglePackagePhotoSelection, openLightbox]);

  const packagePickLimit = Math.max(1, Number(selectedStorePackage?.photo_count) || 1);
  const packagePickCount = packageSelectedPhotos.length;
  const packagePickComplete = packagePickerActive && packagePickCount === packagePickLimit;

  const addPackageSelectionToCart = useCallback(() => {
    if (!packagePickComplete || !selectedStorePackage || !collection?.slug) return;
    const cartKey = 'pixnxt_printstore_cart';
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      if (!Array.isArray(cart)) cart = [];
    } catch {
      cart = [];
    }

    const cartItem = buildDigitalPackageCartItem(selectedStorePackage, packageSelectedPhotos);
    const existingPkgIdx = cart.findIndex((item) => {
      const pid = item.productId || item.product_id;
      const pkgId = item.options?.packageId;
      return pid === 'digital_package' && pkgId === selectedStorePackage.id;
    });
    if (existingPkgIdx >= 0) cart[existingPkgIdx] = cartItem;
    else cart.push(cartItem);
    localStorage.setItem(cartKey, JSON.stringify(cart));

    const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
    if (savedEmail) {
      galleryService.createOrGetSession(collection.id, savedEmail).then(async (session) => {
        if (!session?.id) return;
        let productDbId = null;
        const { data: dbProducts } = await supabase
          .from('printstore_products')
          .select('id')
          .eq('product_type', 'digital_package')
          .limit(1);
        productDbId = dbProducts?.[0]?.id || null;
        if (!productDbId) {
          const { data: inserted } = await supabase
            .from('printstore_products')
            .insert({
              product_type: 'digital_package',
              name: selectedStorePackage.name,
              base_price: Number(selectedStorePackage.price) || 0,
              image_url: null,
              is_active: true,
              options: { selling_price: Number(selectedStorePackage.price) || 0 },
            })
            .select('id')
            .maybeSingle();
          productDbId = inserted?.id || null;
        }
        await supabase.from('printstore_cart_items').insert({
          session_id: session.id,
          product_id: productDbId,
          quantity: 1,
          options: cartItem.options,
        });
      }).catch((e) => {
        console.error('Error syncing package to Supabase cart:', e);
      });
    }

    exitPackageGalleryPicker();
    goToPrintstore('cart=open');
  }, [
    packagePickComplete,
    selectedStorePackage,
    collection,
    packageSelectedPhotos,
    exitPackageGalleryPicker,
    goToPrintstore,
  ]);

  const handleShopHeaderClick = useCallback(() => {
    if (lightboxIndex !== -1 && filteredPhotos[lightboxIndex]) {
      handleShopClick(filteredPhotos[lightboxIndex]);
    } else {
      setShowNoImageShopModal(true);
    }
  }, [lightboxIndex, filteredPhotos, handleShopClick]);

  const showEmptyPlaceholderGrid =
    !isFavoriteListMode &&
    photosForActiveSet.length === 0 &&
    filteredPhotos.length === 0;

  const galleryGridSettings = useMemo(
    () => ({
      style: effectiveSettings.grid_style || 'vertical',
      size: collection?.thumbnail_size || 'regular',
      spacing: collection?.grid_spacing || 'regular',
      aspectRatio: collection?.aspect_ratio || 'original',
    }),
    [
      effectiveSettings.grid_style,
      collection?.thumbnail_size,
      collection?.grid_spacing,
      collection?.aspect_ratio,
    ]
  );

  const galleryCustomRowHeight =
    collection?.thumbnail_size === 'large'
      ? 420
      : collection?.thumbnail_size === 'regular'
        ? 300
        : collection?.thumbnail_size === 'small'
          ? 200
          : 140;

  const galleryCustomColumnCount =
    collection?.thumbnail_size === 'large'
      ? 2
      : collection?.thumbnail_size === 'regular'
        ? 3
        : 4;

  const handleStartSlideshow = useCallback(() => {
    if (filteredPhotos.length < 1) return;
    setLightboxIndex(0);
    setIsSlideshowActive(true);
  }, [filteredPhotos.length]);

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

  const photoUrls = useMemo(
    () => filteredPhotos.map((p) => getPhotoFullDisplayUrl(p)),
    [filteredPhotos]
  );

  useEffect(() => {
    if (lightboxIndex < 0) return;
    const photo = filteredPhotos[lightboxIndex];
    if (photo && isGalleryVideo(photo)) {
      setIsSlideshowActive(false);
    }
  }, [lightboxIndex, filteredPhotos]);

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

  /* ── Large Banner — matches Sales Automation desktop expanded / scene layout ── */
  const largeBannerMarkup = useMemo(() => {
    if (!activeCampaign?.banners?.large_banner?.enabled) return null;
    const lb = activeCampaign.banners.large_banner;
    const bgImage = resolveBannerBackgroundImage(lb, isMobileViewport);
    const fontFamily = getBannerFontFamily(lb.font);
    const timerColor = lb.timer_color || lb.title_color || '#3a4a38';
    const title = formatBannerPlaceholders(lb.title || 'Relive It in Print', activeCampaign);
    const subtitle = formatBannerPlaceholders(
      lb.subtitle || 'Get these moments off the screen and into your hands with {discount-value} off, this {exp-date}.',
      activeCampaign
    );
    const codeLine = formatBannerPlaceholders(lb.code || 'Code: {code}', activeCampaign);
    const ctaLabel = lb.cta || 'Visit Shop';
    // Sales Style tab: "Background + Button text" — prefer explicit cta_color, else bg_color
    const ctaTextColor = lb.cta_color || lb.bg_color || '#ffffff';

    return (
      <div
        data-sales-banner="large"
        style={{
          width: '100%',
          backgroundColor: lb.bg_color || '#eae5d8',
          backgroundImage: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: isMobileViewport ? '24px 20px' : '28px 36px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: isMobileViewport ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobileViewport ? 'center' : 'space-between',
          textAlign: isMobileViewport ? 'center' : 'left',
          marginBottom: '12px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          position: 'relative',
          gap: isMobileViewport ? '16px' : '24px',
          minHeight: isMobileViewport ? 'auto' : '160px',
        }}
      >
        {bgImage !== 'none' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobileViewport ? 'center' : 'flex-start',
            gap: '6px',
            flex: 1,
            maxWidth: isMobileViewport ? '100%' : '640px',
          }}
        >
          <h3
            style={{
              fontSize: isMobileViewport ? '16px' : '22px',
              fontWeight: 700,
              margin: 0,
              fontFamily,
              color: lb.title_color || '#2c3e2d',
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: isMobileViewport ? '11px' : '13px',
              color: lb.subtitle_color || '#4a5a4b',
              maxWidth: '520px',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {subtitle}
          </p>
          <div
            style={{
              fontSize: isMobileViewport ? '10px' : '11px',
              color: lb.subtitle_color || '#4a5a4b',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {codeLine}
          </div>

          <div style={{ marginTop: '4px' }}>
            <div
              style={{
                fontSize: isMobileViewport ? '18px' : '22px',
                fontWeight: 700,
                color: timerColor,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.06em',
              }}
            >
              {`${padTimerPart(campaignTimeLeft.days)} : ${padTimerPart(campaignTimeLeft.hours)} : ${padTimerPart(campaignTimeLeft.minutes)} : ${padTimerPart(campaignTimeLeft.seconds)}`}
            </div>
            <div
              style={{
                display: 'flex',
                gap: isMobileViewport ? '10px' : '14px',
                justifyContent: isMobileViewport ? 'center' : 'flex-start',
                fontSize: '8px',
                color: '#888',
                marginTop: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <span>day</span>
              <span>hrs</span>
              <span>min</span>
              <span>sec</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPrintLabModal(true)}
            style={{
              marginTop: '10px',
              padding: isMobileViewport ? '9px 22px' : '10px 28px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: lb.cta_bg || '#3a4a38',
              color: ctaTextColor,
              border: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              borderRadius: '1px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {ctaLabel}
          </button>
        </div>

        {!isMobileViewport && (
          <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
            <BannerBouquetSvg size={88} />
          </div>
        )}
        {isMobileViewport && <BannerBouquetSvg size={40} style={{ position: 'relative', zIndex: 2 }} />}
      </div>
    );
  }, [activeCampaign, campaignTimeLeft, isMobileViewport]);

  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!collection || hasAutoOpenedRef.current) return;
    const photoId = searchParams.get('photo');
    if (!photoId) return;

    const targetPhoto = (collection.photos || []).find((p) => String(p.id) === String(photoId));
    if (!targetPhoto) return;

    // 1. If target photo is in a set, switch to that set first
    const targetSetId = targetPhoto.set_id || null;
    if (activeSetId !== targetSetId) {
      setActiveSetId(targetSetId);
      return;
    }

    // 2. Find photo index in the current filtered photos
    const idx = filteredPhotos.findIndex((p) => String(p.id) === String(photoId));
    if (idx >= 0) {
      setLightboxIndex(idx);
      hasAutoOpenedRef.current = true;
    }
  }, [collection, searchParams, activeSetId, filteredPhotos]);

  useEffect(() => {
    if (lightboxIndex >= 0 && filteredPhotos[lightboxIndex]) {
      const currentPhotoId = filteredPhotos[lightboxIndex].id;
      if (searchParams.get('photo') !== String(currentPhotoId)) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('photo', String(currentPhotoId));
        navigate(`${window.location.pathname}?${nextParams.toString()}`, { replace: true });
      }
    }
  }, [lightboxIndex, filteredPhotos, searchParams, navigate]);

  const hasAutoSelectedSetRef = useRef(false);
  useEffect(() => {
    if (!collection || !sharedPhotoIds || hasAutoSelectedSetRef.current) return;
    const hasSharedInActive = (collection.photos || []).some(
      (p) => sharedPhotoIds.has(String(p.id)) && (p.set_id === activeSetId || (!p.set_id && !activeSetId))
    );
    if (!hasSharedInActive) {
      const firstSetWithShared = (collection.photos || []).find((p) => sharedPhotoIds.has(String(p.id)));
      if (firstSetWithShared) {
        setActiveSetId(firstSetWithShared.set_id || null);
      }
    }
    hasAutoSelectedSetRef.current = true;
  }, [collection, sharedPhotoIds, activeSetId]);

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
      <a href="/" className="text-[6px] font-bold underline uppercase tracking-[0.4em]">Back to Home</a>
    </div>
  );

  return (
    <div
      className={cn('gallery-view-page min-h-screen transition-colors duration-500', `theme-${effectiveSettings.color_palette}`, `font-${effectiveSettings.font_family}`, `nav-style-${navigationStyle}`, `style-${effectiveSettings.cover_style}`)}
      style={{
        backgroundColor: 'var(--gallery-secondary-bg)',
        color: 'var(--gallery-text)',
        ...(activeCampaign?.banners?.text_banner?.enabled
          ? { '--pixnxt-text-banner-h': '40px' }
          : {}),
      }}
      data-gallery-chrome="large"
      data-gallery-viewport={isMobileViewport ? 'mobile' : 'desktop'}
      data-has-text-banner={activeCampaign?.banners?.text_banner?.enabled ? 'true' : undefined}
    >
      {/* Sales Automation Text Banner — sticks above collection bar, never covers title */}
      {activeCampaign?.banners?.text_banner?.enabled && (
        <div
          ref={(el) => {
            if (!el) return;
            const h = Math.ceil(el.getBoundingClientRect().height) || 40;
            document.documentElement.style.setProperty('--pixnxt-text-banner-h', `${h}px`);
          }}
          style={{
            backgroundColor: activeCampaign.banners.text_banner.bg_color || '#4a5338',
            color: activeCampaign.banners.text_banner.text_color || '#ffffff',
            padding: '10px 20px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.02em',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.4,
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
          data-sales-banner="text"
        >
          <span>
            {(() => {
              let text = activeCampaign.banners.text_banner.text || '';
              const discountVal = activeCampaign.discount ? `${activeCampaign.discount}%` : '30%';
              const code = activeCampaign.discountCode || 'HAPPYANI';
              const expDate = new Date();
              expDate.setDate(expDate.getDate() + (Number(activeCampaign.durationDays) || 14));
              const expFormatted = expDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

              return text
                .replace(/{discount-value}/g, discountVal)
                .replace(/{discount_value}/g, discountVal)
                .replace(/{code}/g, code)
                .replace(/{exp-date}/g, expFormatted)
                .replace(/{exp_date}/g, expFormatted);
            })()}
          </span>
        </div>
      )}

      {vaultPurchasedState && (
        <div style={{
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          position: 'relative',
          zIndex: 1000,
          fontFamily: "'europa', sans-serif"
        }}>
          <span>💚 Lifetime Vault Storage Active — This gallery is permanently online</span>
        </div>
      )}

      {/* Hero Section */}
      <div
        className="gallery-view-hero w-full h-[100dvh] [&>div]:!h-full"
        data-cover-text-scale={isMobileViewport ? 'compact' : 'large'}
      >
        {(() => {
          let activePhotoUrl = collection.cover_url || '';
          if (activePhotoUrl) {
            activePhotoUrl = resolveMediaUrl(activePhotoUrl);
            if (activePhotoUrl.includes('/original/')) {
              activePhotoUrl = activePhotoUrl.replace('/original/', '/web/');
            }
          } else {
            activePhotoUrl = collection.photos?.[0] ? getWebResolutionUrl(collection.photos[0]) : '';
          }
          const { x: focalX, y: focalY } = getCollectionFocal(collection);

          const props = {
            title: collection.name,
            subtitle: photographer?.display_name || '',
            date: formatCoverDate(collection.event_date || collection.created_at),
            photoUrl: activePhotoUrl,
            focalX,
            focalY,
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
      <main
        ref={galleryRef}
        className="pb-24 pt-0"
        style={{ backgroundColor: 'var(--gallery-secondary-bg)' }}
      >
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
          {favoritesLocked && sessionId && !isFavoriteListMode ? (
            <div
              className="gallery-body-text mb-6 border px-4 py-3 text-center text-[7px] font-bold uppercase tracking-[0.2em]"
              style={{ borderColor: 'var(--gallery-border)', color: 'var(--gallery-meta-text)' }}
            >
              Your favorites for {activeFavoriteList?.name || 'this list'} have been submitted
            </div>
          ) : null}
          {sessionId &&
            !isFavoriteListMode &&
            !favoritesLocked &&
            activeFavoriteList?.description?.trim() ? (
            <div
              className="mb-6 mx-auto max-w-2xl whitespace-pre-wrap px-4 text-center text-sm leading-relaxed"
              style={{ color: 'var(--gallery-meta-text)' }}
            >
              {activeFavoriteList.description.trim()}
            </div>
          ) : null}

          {/* Permanent Vault Storage Alert/Banner */}
          {collection?.auto_expiry && vaultPlan?.vault_enabled === true && (
            <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', padding: '0 8px' }}>
              {!vaultPurchasedState ? (
                <div style={{
                  background: 'linear-gradient(90deg, #18181b 0%, #27272a 100%)',
                  color: '#ffffff',
                  padding: '16px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Permanent Vault Storage
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                        This gallery will expire on <strong>{new Date(collection.auto_expiry).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong>. Buy Permanent Vault to keep these memories online forever.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openVaultModal}
                    style={{
                      background: '#ffffff',
                      color: '#111111',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    Unlock Lifetime Access (₹{vaultPlan?.price_lifetime || '499'})
                  </button>
                </div>
              ) : (
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #bbf7d0',
                  color: '#065f46',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)'
                }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#047857' }}>
                      {localStorage.getItem(`pixnxt_vault_purchased_plan_${collection.id}`) === '1month' ? '1 Month Extension Unlocked' : localStorage.getItem(`pixnxt_vault_purchased_plan_${collection.id}`) === '1year' ? '1 Year Extension Unlocked' : 'Permanent Vault Unlocked'}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#047857' }}>
                      {localStorage.getItem(`pixnxt_vault_purchased_plan_${collection.id}`) === '1month' ? (
                        <>Thank you! 1 Month gallery access extension has been purchased. Your gallery is active until <strong>{getExtensionExpiryDate('1month')}</strong>.</>
                      ) : localStorage.getItem(`pixnxt_vault_purchased_plan_${collection.id}`) === '1year' ? (
                        <>Thank you! 1 Year gallery access extension has been purchased. Your gallery is active until <strong>{getExtensionExpiryDate('1year')}</strong>.</>
                      ) : (
                        <>Thank you! Lifetime storage has been purchased. This gallery will remain online permanently.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <GalleryStickyNav
            isGalleryView
            isGalleryViewMobile={isMobileViewport}
            navigationStyle={navigationStyle}
            collectionTitle={collection.name}
            photographerName={photographer?.display_name}
            sets={visibleSets.map((set) => ({ id: set.id, name: set.name }))}
            showHighlightsTab={canViewHighlights(collection, isClientViewer)}
            activeSetId={activeSetId}
            onSetChange={setActiveSetId}
            showFavorites={collection?.favorites_enabled !== false}
            showDownload={showGalleryDownload}
            showShare={showGalleryShare}
            showSlideshow={showGallerySlideshow}
            showShop={collection?.store_enabled !== false}
            favoritedCount={favoritedPhotos.length}
            isDownloadingAll={isDownloadingAll}
            downloadLabel={isDownloadingAll ? `${downloadProgress.done} / ${downloadProgress.total}` : 'Download'}
            onFavoriteClick={handleFavoriteHeaderClick}
            onDownloadClick={handleDownloadClick}
            onShareClick={() => setShowShareModal(true)}
            onSlideshowClick={handleStartSlideshow}
            onShopClick={handleShopHeaderClick}
            showPrintLab={collection?.store_enabled !== false}
            onPrintLabClick={() => setShowPrintLabModal(true)}
            showBuyGallery={vaultPlan?.vault_enabled === true && !vaultPurchasedState}
            buyGalleryLabel="Buy Link"
            onBuyGalleryClick={openVaultModal}
            isPaidDownload={isPaidDigitalDownloadOn}
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
                className="gallery-body-text text-[6px] font-bold uppercase tracking-[0.2em] underline transition-opacity hover:opacity-50"
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

          {!isFavoriteListMode ? (
            <GalleryPeopleStrip
              variant="gallery"
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
          ) : null}

          {filteredPhotos.length === 0 &&
            showMediaFilter &&
            !isFavoriteListMode &&
            photosForActiveSet.length > 0 ? (
            <p
              className="gallery-body-text py-16 text-center text-[7px] font-bold uppercase tracking-[0.35em] opacity-40"
              style={{ color: 'var(--gallery-text)' }}
            >
              No {mediaFilter} in this set
            </p>
          ) : null}

          {showEmptyPlaceholderGrid ? (
            <GalleryEmptyGrid className="mt-2" />
          ) : (() => {
            const gridProps = {
              isMobileViewport,
              videosOnly: mediaFilter === 'videos',
              isHorizontal: effectiveSettings.grid_style?.toLowerCase() === 'horizontal',
              gridSettings: galleryGridSettings,
              onFavorite: (photo) => handleFavoritePhotoToggle(photo),
              onDownload: handleDownloadButtonAction,
              onShare: () => setShowShareModal(true),
              onTogglePrivate: handleTogglePhotoPrivate,
              isClientViewer,
              allowMarkPrivate: Boolean(collection?.allow_clients_mark_private),
              showPrivateBadge: isClientViewer,
              showDownload: showSinglePhotoDownload,
              isPaidDownload: isPaidDigitalDownloadOn,
              showFavorite: collection?.favorites_enabled !== false,
              showShare: showGalleryShare,
              showShop: collection?.store_enabled !== false,
              onShop: handleShopClick,
              favoritedPhotoIds: favoritedPhotos,
              customRowHeight: galleryCustomRowHeight,
              customColumnCount: galleryCustomColumnCount,
              showFilename: false,
              className: 'mt-2',
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Large Banner — rectangle bar ABOVE grid */}
                {largeBannerMarkup}

                <MasonryGrid
                  key={`grid-single-${activeSetId ?? 'highlights'}-${mediaFilter}-${effectiveSettings.grid_style}`}
                  photos={filteredPhotos}
                  onImageClick={handleGridImageClick}
                  activeCampaign={activeCampaign}
                  activeProducts={activeProducts}
                  onVisitShop={() => setShowPrintLabModal(true)}
                  packagePickerActive={packagePickerActive}
                  packageSelectedPhotoIds={packageSelectedPhotos.map((p) => p.id)}
                  packagePickLimit={packagePickLimit}
                  {...gridProps}
                />
              </div>
            );
          })()}

          {filteredPhotos.length > 0 ? (
            <GalleryBackToTop onClick={scrollToTop} />
          ) : null}
        </Container>
      </main>

      {/* Global Footer Branding & Policies */}
      {!(photographer?.hide_branding === true || localStorage.getItem('hide_branding') === 'true') && (
        <footer
          className={cn('mt-12 border-t py-8', isGalleryDark ? 'border-white/10' : '')}
          style={{ borderTopColor: isGalleryDark ? undefined : 'rgba(0,0,0,0.05)', backgroundColor: 'var(--gallery-bg)' }}
        >
          <Container className="max-w-none px-4 md:px-8 lg:px-12">
            <div className="text-center flex flex-col items-center gap-2">
              <Typography variant="label" style={{ color: 'var(--gallery-meta-text)', opacity: 0.5 }}>© {new Date().getFullYear()} PIXNXT. All Rights Reserved.</Typography>
              {(tosText || privacyText) && (
                <div className="flex gap-4 text-xs mt-2" style={{ color: 'var(--gallery-meta-text)', opacity: 0.6 }}>
                  {tosText && (
                    <button type="button" onClick={() => setShowTosModal(true)} className="hover:underline">Terms of Service</button>
                  )}
                  {privacyText && (
                    <button type="button" onClick={() => setShowPrivacyModal(true)} className="hover:underline">Privacy Policy</button>
                  )}
                </div>
              )}
            </div>
          </Container>
        </footer>
      )}

      {/* Policies Modals */}
      {showTosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTosModal(false)}>
          <div className="bg-white text-black p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-medium mb-4">Terms of Service</h2>
            <div className="whitespace-pre-wrap text-sm text-gray-700">{tosText}</div>
            <button className="mt-6 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setShowTosModal(false)}>Close</button>
          </div>
        </div>
      )}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}>
          <div className="bg-white text-black p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-medium mb-4">Privacy Policy</h2>
            <div className="whitespace-pre-wrap text-sm text-gray-700">{privacyText}</div>
            <button className="mt-6 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setShowPrivacyModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: 'var(--gallery-bg)' }}>
          <p className="text-sm m-0" style={{ color: 'var(--gallery-text)' }}>
            This website uses cookies to ensure you get the best experience on our website.
          </p>
          <button 
            className="px-6 py-2 bg-black text-white rounded whitespace-nowrap text-sm font-medium hover:bg-gray-800 transition-colors"
            style={{ backgroundColor: 'var(--gallery-text)', color: 'var(--gallery-bg)' }}
            onClick={() => {
              sessionStorage.setItem('cookie_banner_acknowledged', 'true');
              setShowCookieBanner(false);
            }}
          >
            Got it!
          </button>
        </div>
      )}

      {/* Lightbox */}
      <PhotoLightbox
        isOpen={lightboxIndex !== -1}
        onClose={() => {
          setLightboxIndex(-1);
          setIsSlideshowActive(false);
          if (searchParams.has('photo')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('photo');
            navigate(`${window.location.pathname}?${nextParams.toString()}`, { replace: true });
          }
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
          if (photo) handleFavoritePhotoToggle(photo);
        }}
        onDownload={() => handleDownloadButtonAction(filteredPhotos[lightboxIndex])}
        onShare={() => setShowShareModal(true)}
        onShop={() => handleShopClick(filteredPhotos[lightboxIndex])}
        showDownload={showSinglePhotoDownload}
        isPaidDownload={isPaidDigitalDownloadOn}
        showFavorite={collection?.favorites_enabled !== false}
        showShare={showGalleryShare}
        showShop={collection?.store_enabled !== false}
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
                      'gallery-body-text px-8 py-3 text-[6px] font-bold uppercase tracking-[0.25em] transition-opacity disabled:opacity-50',
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

      {/* Shop Modal */}
      <AnimatePresence>
        {showShopModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShopModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <Motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={cn(
                'relative w-full max-w-lg p-8 shadow-2xl md:p-10 rounded-none',
                isGalleryDark ? 'bg-[#1a1a1a] text-white ring-1 ring-white/10' : 'bg-white text-zinc-900'
              )}
            >
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
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
                  Shop
                </h3>
                <p className={cn('gallery-body-text text-sm leading-relaxed', isGalleryDark ? 'text-white/60' : 'text-zinc-500')}>
                  Enter your email address to access the print shop and customize prints, frames, and canvases with this photo.
                </p>
              </div>

              <div className="space-y-5">
                <input
                  type="email"
                  placeholder="Email address"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
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
                      'gallery-body-text px-8 py-3 text-[6px] font-bold uppercase tracking-[0.25em] transition-opacity disabled:opacity-50',
                      isGalleryDark
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'w-full bg-zinc-950 py-4 text-white hover:bg-zinc-800 md:w-auto'
                    )}
                    onClick={handleShopEmailSubmit}
                    disabled={isSubmittingShopEmail}
                  >
                    {isSubmittingShopEmail ? 'Please wait…' : 'Sign in'}
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
            <p className="text-left text-[9px] font-medium leading-snug">
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
        photos={downloadablePhotos}
        sets={downloadableSets}
        initialPhoto={selectedDownloadPhoto}
        watermarkOptions={getWatermarkOptions()}
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

      {/* No Image Selected Shop Modal */}
      {showNoImageShopModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full rounded-none p-6 text-center shadow-2xl border border-white/20 theme-mono" style={{ backgroundColor: 'var(--cg-card, #ffffff)', borderRadius: '0px' }}>
            <ShoppingBag size={48} className="mx-auto mb-4 text-[#1A1A1A]" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2 uppercase tracking-wide">
              no image is selected to shop
            </h3>
            <p className="text-sm text-[#71717A] mb-6 leading-relaxed">
              Please click on a photo from the gallery and click the shop icon on it to start customizing products.
            </p>
            <button
              onClick={() => setShowNoImageShopModal(false)}
              className="w-full py-3 px-4 rounded-none text-white bg-[#1A1A1A] hover:bg-[#333333] transition-all font-medium uppercase tracking-widest text-xs"
              style={{ borderRadius: '0px' }}
            >
              {collection?.name || 'SAM WEDDING'}
            </button>
          </div>
        </div>
      )}

      {/* Print Lab Explore Modal */}
      {showPrintLabModal && (() => {
        const PRINTLAB_PRODUCTS = [
          { id: 'dibond', name: 'Dibond Prints', desc: 'Sturdy & lightweight wall display' },
          { id: 'matted_frame', name: 'Matted Frames', desc: 'Iconic matted wooden frame' },
          { id: 'gallery_board', name: 'Gallery Boards', desc: 'Prints mounted onto firm backboard' },
          { id: 'frames', name: 'Frames', desc: 'Classic wood frames' },
          { id: 'canvas', name: 'Canvas', desc: 'Texture you can see and feel' },
          { id: 'acrylic_prints', name: 'Acrylic Prints', desc: 'Striking clarity, minimalistic style' },
          { id: 'circular_frames', name: 'Circular Frames', desc: 'Handtorn circular print in a frame' },
          { id: 'float_frames', name: 'Float Frames', desc: 'Floating print in a deep frame' },
          { id: 'matted_collages', name: 'Matted Collages', desc: 'Multiple photos in one frame' },
          { id: 'prints', name: 'Prints', desc: 'Quality photographic prints' },
          { id: 'deckled_prints', name: 'Deckled Prints', desc: 'Hand-torn feathered edges' },
          { id: 'panoramic_prints', name: 'Panoramic Prints', desc: 'Wide format prints' },
        ].filter(p => {
          if (activeProducts && activeProducts.length > 0) {
            const dbProd = activeProducts.find(dp => dp.id === p.id || dp.product_type === p.id);
            return dbProd ? dbProd.is_visible : false;
          }
          return true;
        });
        const collectionPhotos = filteredPhotos.filter(p => p && (p.url || p.display_url || p.thumbnail_url || p.web_url));
        const selectedShopPhoto =
          (lightboxIndex >= 0 && filteredPhotos[lightboxIndex])
          || collectionPhotos[0]
          || null;
        const selectedShopUrl = selectedShopPhoto
          ? (getPhotoFullDisplayUrl(selectedShopPhoto) || selectedShopPhoto.url || selectedShopPhoto.web_url || selectedShopPhoto.display_url || '')
          : '';
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(6px)' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0px', width: '100%', maxWidth: '820px', maxHeight: '85vh', overflow: 'auto', padding: '32px', boxSizing: 'border-box', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <button onClick={() => setShowPrintLabModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={22} color="#666" />
              </button>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '26px', fontWeight: 700, color: '#111', margin: '0 0 6px 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Print Lab</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Explore our premium collection of print products</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '24px', marginBottom: '28px' }}>
                {PRINTLAB_PRODUCTS.map((prod, idx) => (
                  <div key={prod.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px 8px', borderRadius: '12px', transition: 'background-color 0.2s', cursor: 'default' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '130px' }}>
                      {renderMiniFrame(prod.id, selectedShopUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400')}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', letterSpacing: '0.02em' }}>{prod.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{prod.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setShowPrintLabModal(false)}
                  style={{ padding: '12px 32px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: '9999px', backgroundColor: '#111', color: '#fff', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#111'}
                >
                  Click Shop on Images to Buy Products
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Package picker sticky top bar — gallery stays interactive underneath */}
      {packagePickerActive && selectedStorePackage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2100,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '16px',
            boxSizing: 'border-box',
            fontFamily: "'europa', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <button
              type="button"
              onClick={exitPackageGalleryPicker}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#111', fontSize: '18px', padding: 0, lineHeight: 1 }}
              aria-label="Back"
            >
              &larr;
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedStorePackage.name || `${packagePickLimit}-Photo Package`}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                Selected {packagePickCount}/{packagePickLimit}
                {packagePickCount < packagePickLimit
                  ? ` · tap photos below to choose ${packagePickLimit - packagePickCount} more`
                  : ' · ready to add'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              Total: ₹{(Number(selectedStorePackage.price) || 0).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={addPackageSelectionToCart}
              disabled={!packagePickComplete}
              style={{
                padding: '10px 22px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: packagePickComplete ? '#111' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                cursor: packagePickComplete ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* 6) Paid Digital Download Modals */}
      {showDigitalDownloadModal && digitalDownloadPhoto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(6px)' }}>
          {!showDigitalPurchaseDetail ? (
            /* Modal 1: Choice screen */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0px', width: '100%', maxWidth: '820px', display: 'flex', height: '520px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', color: '#1a1a1a', fontFamily: "'europa', sans-serif" }}>
              {/* Left Photo / Collage View */}
              <div style={{
                width: '40%',
                height: '100%',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                overflow: 'hidden',
                borderRight: '1px solid #e2e8f0',
              }}>
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: (isPurchaseAllDefault || !digitalPricing?.packageEligible) ? 'auto' : 'hidden',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: (isPurchaseAllDefault || !digitalPricing?.packageEligible) ? 'flex-start' : 'center',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}>
                  {(isPurchaseAllDefault || (!digitalPricing?.packageEligible && filteredPhotos.length > 0)) ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a1a1a', marginBottom: '12px', textAlign: 'center' }}>
                        {!digitalPricing?.packageEligible
                          ? `Select a photo (${filteredPhotos.length})`
                          : `All Photos (${filteredPhotos.length})`}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                        {(filteredPhotos || []).map((p) => {
                          const selected = digitalDownloadPhoto?.id === p.id;
                          const canPickSingle = !digitalPricing?.packageEligible || isPurchaseAllDefault;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (!canPickSingle) return;
                                setDigitalDownloadPhoto(p);
                                setIsPurchaseAllDefault(false);
                              }}
                              style={{
                                aspectRatio: '1',
                                overflow: 'hidden',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                padding: 0,
                                border: selected ? '2px solid #111' : '2px solid transparent',
                                cursor: canPickSingle ? 'pointer' : 'default',
                                position: 'relative',
                                boxSizing: 'border-box',
                              }}
                            >
                              <img
                                src={p.web_url || p.thumbnail_url || p.full_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                              {selected && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: '6px',
                                  left: '6px',
                                  right: '6px',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  color: '#fff',
                                  background: 'rgba(17,17,17,0.75)',
                                  padding: '3px 4px',
                                  borderRadius: '2px',
                                  textAlign: 'center',
                                }}>
                                  Selected
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <img
                      src={digitalDownloadPhoto.web_url || digitalDownloadPhoto.thumbnail_url || digitalDownloadPhoto.full_url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  )}
                </div>
                <div style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '10px',
                  color: '#64748b',
                  lineHeight: 1.35,
                }}>
                  ⓘ Watermarks do not appear on final products.
                </div>
              </div>
              {/* Right Options Details */}
              <div style={{ width: '60%', height: '100%', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <button onClick={() => setShowDigitalDownloadModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={22} color="#111" />
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#111' }}>
                    {isPurchaseAllDefault ? 'Buy Digital Downloads' : 'Buy This Photo'}
                  </h3>
                  <button onClick={() => { setShowDigitalDownloadModal(false); handleShopClick(digitalDownloadPhoto); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }} className="hover:text-black">
                    Visit Store &gt;
                  </button>
                </div>

                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#111', marginBottom: '16px', borderBottom: '2px solid #111', width: 'fit-content', paddingBottom: '4px' }}>
                  Digital Options
                  {digitalPricing?.category ? (
                    <span style={{ marginLeft: '8px', fontWeight: 600, color: '#64748b', textTransform: 'none', letterSpacing: 0 }}>
                      · {digitalPricing.category}
                    </span>
                  ) : null}
                </div>

                {/* Single download — category-specific price from store_packages */}
                {digitalPricing?.single && (isPurchaseAllDefault ? !digitalPricing?.packageEligible : true) && (
                  <button
                    onClick={() => {
                      if (isPurchaseAllDefault && !digitalPricing?.packageEligible) {
                        // Need a photo selected first when opened from “buy all” / <10 mode
                        if (!digitalDownloadPhoto?.id) return;
                        setIsPurchaseAllDefault(false);
                      }
                      setSelectedDownloadType('single');
                      setSelectedStorePackage(null);
                      setShowDigitalPurchaseDetail(true);
                    }}
                    disabled={isPurchaseAllDefault && !digitalPricing?.packageEligible && !digitalDownloadPhoto?.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '16px 0',
                      border: 'none',
                      borderBottom: '1px solid #e2e8f0',
                      background: 'none',
                      color: '#1a1a1a',
                      textAlign: 'left',
                      cursor: (isPurchaseAllDefault && !digitalPricing?.packageEligible && !digitalDownloadPhoto?.id) ? 'not-allowed' : 'pointer',
                      opacity: (isPurchaseAllDefault && !digitalPricing?.packageEligible && !digitalDownloadPhoto?.id) ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {digitalPricing.single.label}
                      {isPurchaseAllDefault && !digitalPricing?.packageEligible && (
                        <span style={{ display: 'block', marginTop: '3px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                          {digitalDownloadPhoto?.id
                            ? 'Selected photo from the grid on the left'
                            : 'Tap a photo on the left to buy this single download'}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                      ₹{Number(digitalPricing.single.price).toFixed(2)} &gt;
                    </span>
                  </button>
                )}

                {/* Packs for this gallery category only — only tiers that fit photo count */}
                {(digitalPricing?.packs || []).map((packOffer) => (
                  <button
                    key={packOffer.package?.id || packOffer.photo_count}
                    onClick={() => {
                      startPackageGalleryPicker(packOffer.package);
                    }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 0', border: 'none', borderBottom: '1px solid #e2e8f0', background: 'none', color: '#1a1a1a', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {packOffer.label}
                      <span style={{ display: 'block', marginTop: '3px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                        {packOffer.photo_count} high-resolution photos for social sharing
                      </span>
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', flexShrink: 0, marginLeft: '12px' }}>
                      ₹{Number(packOffer.price || 0).toFixed(2)} &gt;
                    </span>
                  </button>
                ))}

                {!digitalPricing?.single && !isPurchaseAllDefault && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    ⓘ Digital download prices are not configured for this gallery’s category yet.
                  </div>
                )}

                {!digitalPricing?.packageEligible && digitalPricing?.single && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    ⓘ This gallery has fewer than {PACKAGE_THRESHOLD} photos. Select any photo on the left, then buy the single download.
                  </div>
                )}

                {isPurchaseAllDefault && digitalPricing?.packageEligible ? (
                  <div style={{ marginTop: '24px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    {digitalPricing?.packs?.length
                      ? 'ⓘ Choose a photo package above, or select a photo on the left to buy a single download.'
                      : 'ⓘ No packages are priced for this category yet. Select a photo on the left to buy a single download.'}
                  </div>
                ) : (digitalPricing?.packs?.length > 0 && !isPurchaseAllDefault) ? (
                  <>
                    <div style={{ marginTop: '24px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#111' }}>Shop Package</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {digitalPricing.packs.map((packOffer) => (
                        <div
                          key={`card-${packOffer.package?.id || packOffer.photo_count}`}
                          onClick={() => {
                            startPackageGalleryPicker(packOffer.package);
                          }}
                          style={{ border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', width: '148px', boxSizing: 'border-box', cursor: 'pointer', background: '#f8fafc', borderRadius: '8px' }}
                          className="hover:border-black/30"
                        >
                          <div style={{ width: '100%', height: '80px', backgroundColor: '#e2e8f0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '100%', height: '100%' }}>
                              {(filteredPhotos.slice(0, 4) || []).map((p, idx) => (
                                <img key={idx} src={p.web_url || p.thumbnail_url || p.full_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ))}
                            </div>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Download size={20} color="#fff" />
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, marginTop: '8px', color: '#111', lineHeight: 1.2 }}>
                            {packOffer.photo_count}-Photo Package
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            ₹{Number(packOffer.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            /* Modal 2: Product purchasing detail screen */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0px', width: '100%', maxWidth: '820px', display: 'flex', flexDirection: 'column', height: '520px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', color: '#1a1a1a', fontFamily: "'europa', sans-serif" }}>
              {/* Top Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => setShowDigitalPurchaseDetail(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                    &larr;
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>
                    {selectedDownloadType === 'package' && selectedStorePackage
                      ? (selectedStorePackage.name || `${selectedStorePackage.photo_count}-Photo Package`)
                      : selectedDownloadType === 'all'
                        ? 'Entire Collection Download (All Photos)'
                        : (digitalPricing?.single?.label || 'Single Photo Download')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                    Total: ₹{(
                      selectedDownloadType === 'package' && selectedStorePackage
                        ? Number(selectedStorePackage.price) || 0
                        : selectedDownloadType === 'all'
                          ? Number(collection.digital_download_price_all) || 0
                          : Number(digitalPricing?.single?.price) || 0
                    ).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      const cartKey = 'pixnxt_printstore_cart';
                      let cart = [];
                      try {
                        cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
                        if (!Array.isArray(cart)) cart = [];
                      } catch {
                        cart = [];
                      }

                      const isPackage = selectedDownloadType === 'package' && selectedStorePackage;
                      const isAll = selectedDownloadType === 'all';

                      if (isPackage) {
                        const existingPkgIdx = cart.findIndex((item) => {
                          const pid = item.productId || item.product_id;
                          const pkgId = item.options?.packageId;
                          return pid === 'digital_package' && pkgId === selectedStorePackage.id;
                        });
                        if (existingPkgIdx === -1) {
                          cart.push(buildDigitalPackageCartItem(selectedStorePackage));
                        }
                        localStorage.setItem(cartKey, JSON.stringify(cart));

                        const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
                        if (savedEmail) {
                          galleryService.createOrGetSession(collection.id, savedEmail).then(async (session) => {
                            if (!session?.id) return;
                            let productDbId = null;
                            const { data: dbProducts } = await supabase
                              .from('printstore_products')
                              .select('id')
                              .eq('product_type', 'digital_package')
                              .limit(1);
                            productDbId = dbProducts?.[0]?.id || null;
                            if (!productDbId) {
                              const { data: inserted } = await supabase
                                .from('printstore_products')
                                .insert({
                                  product_type: 'digital_package',
                                  name: selectedStorePackage.name,
                                  base_price: Number(selectedStorePackage.price) || 0,
                                  image_url: null,
                                  is_active: true,
                                  options: { selling_price: Number(selectedStorePackage.price) || 0 },
                                })
                                .select('id')
                                .maybeSingle();
                              productDbId = inserted?.id || null;
                            }
                            const cartItem = buildDigitalPackageCartItem(selectedStorePackage);
                            await supabase.from('printstore_cart_items').insert({
                              session_id: session.id,
                              product_id: productDbId,
                              quantity: 1,
                              options: cartItem.options,
                            });
                          }).catch((e) => {
                            console.error('Error syncing package to Supabase cart:', e);
                          });
                        }

                        setShowDigitalDownloadModal(false);
                        setShowDigitalPurchaseDetail(false);
                        setSelectedStorePackage(null);
                        goToPrintstore('cart=open');
                        return;
                      }

                      const itemProductId = isAll ? 'digital_download_all' : 'digital_download';
                      const itemProductName = isAll
                        ? 'Entire Collection Download (All Photos)'
                        : (digitalPricing?.single?.label || 'Single Photo Download');
                      const itemUnitPrice = Number(
                        isAll
                          ? (collection.digital_download_price_all || 0)
                          : (digitalPricing?.single?.price || 0)
                      );
                      const photo = isAll ? null : digitalDownloadPhoto;
                      const photoForCart = photo
                        ? {
                          id: photo.id,
                          filename: photo.filename || photo.name || '',
                          url: photo.url || photo.web_url || photo.thumbnail_url || photo.full_url || photo.display_url || '',
                          web_url: photo.web_url || photo.url || photo.display_url || '',
                          thumbnail_url: photo.thumbnail_url || photo.web_url || photo.url || '',
                          full_url: photo.full_url || photo.web_url || photo.url || '',
                          display_url: photo.display_url || photo.web_url || photo.url || '',
                        }
                        : null;
                      const size = { id: isAll ? 'all_photos' : 'hi_res', label: isAll ? 'All Photos' : 'High Resolution' };

                      const existingIdx = cart.findIndex((item) => {
                        const pid = item.productId || item.product_id;
                        const itemPhotoId = item.photo?.id || item.options?.photo?.id;
                        return pid === itemProductId && (isAll || itemPhotoId === photo?.id);
                      });

                      if (existingIdx === -1) {
                        cart.push({
                          id: `dig-${Date.now()}`,
                          productId: itemProductId,
                          productName: itemProductName,
                          unitPrice: itemUnitPrice,
                          totalPrice: itemUnitPrice,
                          quantity: 1,
                          photo: photoForCart,
                          size,
                          frame: null,
                          paper: null,
                          border: 'none',
                          options: {
                            productId: itemProductId,
                            productName: itemProductName,
                            photo: photoForCart,
                            size,
                            unitPrice: itemUnitPrice,
                          },
                        });
                      }

                      localStorage.setItem(cartKey, JSON.stringify(cart));

                      // Sync to Supabase in background (non-blocking)
                      const savedEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
                      if (savedEmail) {
                        galleryService.createOrGetSession(collection.id, savedEmail).then(async (session) => {
                          if (!session?.id) return;

                          let productDbId = null;
                          const { data: dbProducts } = await supabase
                            .from('printstore_products')
                            .select('id')
                            .eq('product_type', itemProductId)
                            .limit(1);
                          productDbId = dbProducts?.[0]?.id || null;

                          if (!productDbId) {
                            const { data: inserted } = await supabase
                              .from('printstore_products')
                              .insert({
                                product_type: itemProductId,
                                name: itemProductName,
                                base_price: itemUnitPrice,
                                image_url: null,
                                is_active: true,
                                options: { selling_price: itemUnitPrice },
                              })
                              .select('id')
                              .maybeSingle();
                            productDbId = inserted?.id || null;
                          }

                          const { data: existingDbItems } = await supabase
                            .from('printstore_cart_items')
                            .select('id, options')
                            .eq('session_id', session.id);

                          const alreadyInDb = (existingDbItems || []).some((row) => {
                            const opts = row.options || {};
                            return opts.productId === itemProductId
                              && (isAll || opts.photo?.id === photo?.id);
                          });

                          if (!alreadyInDb) {
                            await supabase.from('printstore_cart_items').insert({
                              session_id: session.id,
                              product_id: productDbId,
                              quantity: 1,
                              options: {
                                productId: itemProductId,
                                productName: itemProductName,
                                photo: photoForCart,
                                size,
                                unitPrice: itemUnitPrice,
                              },
                            });
                          }
                        }).catch((e) => {
                          console.error('Error syncing digital item to Supabase cart:', e);
                        });
                      }

                      setShowDigitalDownloadModal(false);
                      setShowDigitalPurchaseDetail(false);
                      goToPrintstore('cart=open');
                    }}
                    style={{
                      padding: '10px 24px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#111',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#111'}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>

              {/* Detail Content View (Scrollable left column if all) */}
              <div style={{ display: 'flex', flex: 1, height: 'calc(100% - 60px)' }}>
                {/* Left side Image / Grid */}
                <div style={{ width: '50%', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box', position: 'relative', overflowY: (selectedDownloadType === 'all' || selectedDownloadType === 'package') ? 'auto' : 'hidden', justifyContent: (selectedDownloadType === 'all' || selectedDownloadType === 'package') ? 'flex-start' : 'center', alignItems: 'center' }}>
                  {(selectedDownloadType === 'all' || selectedDownloadType === 'package') ? (
                    <div style={{ width: '100%' }}>
                      {selectedDownloadType === 'package' && selectedStorePackage && (
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>
                          {selectedStorePackage.category_tag} · up to {selectedStorePackage.photo_count} photos
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', backgroundColor: '#f8fafc' }}>
                        {(filteredPhotos || []).slice(0, selectedDownloadType === 'package' && selectedStorePackage ? selectedStorePackage.photo_count : undefined).map((p, idx) => (
                          <div key={idx} style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                            <img src={p.web_url || p.thumbnail_url || p.full_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <img src={digitalDownloadPhoto.web_url || digitalDownloadPhoto.thumbnail_url || digitalDownloadPhoto.full_url} alt="" style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  )}
                </div>
                {/* Right side details info */}
                <div style={{ width: '50%', height: '100%', padding: '40px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Download size={20} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#111' }}>Digital files are delivered via email upon checkout</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        A download link will be sent to the email address entered during purchase checkout once payment is completed.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '12px' }}>
                    <span style={{ fontSize: '16px', color: '#64748b', flexShrink: 0 }}>🛈</span>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Note: The original high-resolution images with no watermark will be used.
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* 7) Permanent Vault Payment Modal */}
      <AnimatePresence>
        {showVaultPaymentModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVaultPaymentModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <Motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{ fontFamily: "'europa', sans-serif" }}
              className={cn(
                'relative w-full shadow-2xl rounded-none text-left p-8 max-w-md',
                isGalleryDark ? 'bg-[#1a1a1a] text-white ring-1 ring-white/10' : 'bg-white text-zinc-900'
              )}
            >
              <button
                type="button"
                onClick={() => setShowVaultPaymentModal(false)}
                className={cn(
                  'absolute right-4 top-4 transition-colors',
                  isGalleryDark ? 'text-white/50 hover:text-white' : 'text-zinc-400 hover:text-zinc-950'
                )}
              >
                <X size={20} />
              </button>

              {selectedVaultPlan === null ? (
                <div>
                  <h2 className="text-center text-[15px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: isGalleryDark ? '#fff' : '#111' }}>
                    Extend Gallery Access
                  </h2>
                  <p className="text-center text-[13px] text-zinc-500 mb-8">
                    Choose a plan to extend this gallery's active duration or store it permanently.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    {/* Centered single Lifetime card */}
                    <div style={{
                      border: isGalleryDark ? '2px solid var(--gallery-text, #111)' : '2px solid #111',
                      backgroundColor: isGalleryDark ? '#1a1a1a' : '#fff',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      borderRadius: '8px',
                      position: 'relative',
                      width: '100%',
                      maxWidth: '300px'
                    }}>
                      <span style={{ position: 'absolute', top: '-10px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'var(--gallery-text, #111)', color: 'var(--gallery-bg, #fff)', padding: '2px 6px', borderRadius: '4px' }}>Best Value</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', marginTop: '4px' }}>Lifetime</span>
                      <strong style={{ fontSize: '24px', fontWeight: 800, color: isGalleryDark ? '#fff' : '#111', marginBottom: '8px' }}>
                        ₹{vaultPlan?.price_lifetime || '499'}
                      </strong>
                      <span style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '8px', lineHeight: 1.4, minHeight: '34px' }}>
                        {vaultPlan?.desc_lifetime || 'Permanent lifetime storage access.'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginBottom: '16px' }}>
                        Active Online: Unlimited
                      </span>
                      <button
                        onClick={() => setSelectedVaultPlan('lifetime')}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: 'var(--gallery-text, #111)',
                          color: 'var(--gallery-bg, #fff)'
                        }}
                      >
                        Choose Plan
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedVaultPlan(null)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: 'none',
                      background: 'none',
                      color: isGalleryDark ? '#fff' : '#111',
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    &larr; Back to plans
                  </button>

                  <h2 className="text-[15px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: isGalleryDark ? '#fff' : '#111' }}>
                    Checkout
                  </h2>
                  <p className="text-[13px] text-zinc-500 mb-4">
                    Unlock permanent gallery vault access via secure card payment.
                  </p>

                  {/* Plan Description Card */}
                  <div style={{
                    padding: '14px 18px',
                    backgroundColor: isGalleryDark ? '#262626' : '#fcfbfa',
                    borderLeft: '4px solid var(--gallery-accent, #059669)',
                    borderTop: isGalleryDark ? '1px solid #3f3f46' : '1px solid #f2ede4',
                    borderRight: isGalleryDark ? '1px solid #3f3f46' : '1px solid #f2ede4',
                    borderBottom: isGalleryDark ? '1px solid #3f3f46' : '1px solid #f2ede4',
                    borderRadius: '0 8px 8px 0',
                    marginBottom: '20px',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    color: isGalleryDark ? '#d4d4d8' : '#4b5563'
                  }}>
                    {vaultPlan?.desc_lifetime || 'Permanent lifetime storage access.'}
                  </div>

                  {/* Price Details */}
                  <div style={{
                    background: isGalleryDark ? '#262626' : '#fcfbfa',
                    border: isGalleryDark ? '1px solid #3f3f46' : '1px solid #f2ede4',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Plan Type</span>
                        <strong style={{ color: isGalleryDark ? '#fff' : '#111', fontSize: '14px' }}>
                          Lifetime Permanent Vault
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Amount Due</span>
                        <strong style={{ color: isGalleryDark ? '#fff' : '#111', fontSize: '18px', fontWeight: 700 }}>
                          ₹{vaultPlan?.price_lifetime || '499'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setVaultPaymentMethod('Credit Card')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: vaultPaymentMethod === 'Credit Card' ? '2px solid var(--gallery-accent, #059669)' : (isGalleryDark ? '1px solid #3f3f46' : '1px solid #e2e8f0'),
                        backgroundColor: vaultPaymentMethod === 'Credit Card' ? (isGalleryDark ? '#1f2937' : '#f0fdf4') : 'transparent',
                        color: vaultPaymentMethod === 'Credit Card' ? (isGalleryDark ? '#34d399' : '#059669') : (isGalleryDark ? '#9ca3af' : '#4b5563'),
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      💳 Credit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaultPaymentMethod('UPI')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: vaultPaymentMethod === 'UPI' ? '2px solid var(--gallery-accent, #059669)' : (isGalleryDark ? '1px solid #3f3f46' : '1px solid #e2e8f0'),
                        backgroundColor: vaultPaymentMethod === 'UPI' ? (isGalleryDark ? '#1f2937' : '#f0fdf4') : 'transparent',
                        color: vaultPaymentMethod === 'UPI' ? (isGalleryDark ? '#34d399' : '#059669') : (isGalleryDark ? '#9ca3af' : '#4b5563'),
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      📱 UPI
                    </button>
                  </div>

                  {/* Card / UPI Form */}
                  <form onSubmit={handleVaultPaymentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Delivery Email</label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={vaultEmail}
                        onChange={(e) => setVaultEmail(e.target.value)}
                        className={cn(
                          'w-full border rounded px-3 py-2 text-[14px] outline-none transition-colors',
                          isGalleryDark ? 'border-zinc-700 bg-zinc-800 text-white focus:border-white' : 'border-zinc-200 bg-white focus:border-black'
                        )}
                      />
                    </div>

                    {vaultPaymentMethod === 'Credit Card' ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Cardholder Name</label>
                          <input
                            type="text"
                            required={vaultPaymentMethod === 'Credit Card'}
                            placeholder="John Doe"
                            value={vaultCardName}
                            onChange={(e) => setVaultCardName(e.target.value)}
                            className={cn(
                              'w-full border rounded px-3 py-2 text-[14px] outline-none transition-colors',
                              isGalleryDark ? 'border-zinc-700 bg-zinc-800 text-white focus:border-white' : 'border-zinc-200 bg-white focus:border-black'
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Card Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              required={vaultPaymentMethod === 'Credit Card'}
                              placeholder="4242 4242 4242 4242"
                              value={vaultCardNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                                setVaultCardNumber(formatted);
                              }}
                              className={cn(
                                'w-full border rounded pl-10 pr-3 py-2 text-[14px] outline-none transition-colors',
                                isGalleryDark ? 'border-zinc-700 bg-zinc-800 text-white focus:border-white' : 'border-zinc-200 bg-white focus:border-black'
                              )}
                            />
                            <CreditCard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Expiry Date</label>
                            <input
                              type="text"
                              required={vaultPaymentMethod === 'Credit Card'}
                              placeholder="MM/YY"
                              value={vaultCardExpiry}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                                setVaultCardExpiry(formatted);
                              }}
                              className={cn(
                                'w-full border rounded px-3 py-2 text-[14px] outline-none transition-colors',
                                isGalleryDark ? 'border-zinc-700 bg-zinc-800 text-white focus:border-white' : 'border-zinc-200 bg-white focus:border-black'
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Security Code (CVC)</label>
                            <input
                              type="text"
                              required={vaultPaymentMethod === 'Credit Card'}
                              placeholder="123"
                              value={vaultCardCvc}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                setVaultCardCvc(val);
                              }}
                              className={cn(
                                'w-full border rounded px-3 py-2 text-[14px] outline-none transition-colors',
                                isGalleryDark ? 'border-zinc-700 bg-zinc-800 text-white focus:border-white' : 'border-zinc-200 bg-white focus:border-black'
                              )}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        border: isGalleryDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: isGalleryDark ? '#262626' : '#fafafa'
                      }}>
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#fff',
                          border: '1px solid #eaeaea',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          {/* Visual mockup of a QR code using pure CSS */}
                          <div style={{
                            width: '120px',
                            height: '120px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gridTemplateRows: 'repeat(3, 1fr)',
                            gap: '6px',
                            padding: '6px',
                            background: '#fff'
                          }}>
                            <div style={{ border: '5px solid #111', background: 'transparent' }} />
                            <div style={{ background: '#111', opacity: 0.15 }} />
                            <div style={{ border: '5px solid #111', background: 'transparent' }} />
                            <div style={{ background: '#111', opacity: 0.2 }} />
                            <div style={{ background: '#111' }} />
                            <div style={{ background: '#111', opacity: 0.3 }} />
                            <div style={{ border: '5px solid #111', background: 'transparent' }} />
                            <div style={{ background: '#111', opacity: 0.25 }} />
                            <div style={{ background: '#111' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scan with any UPI App</span>
                        </div>
                        <p className="text-[12px] text-center text-zinc-500 max-w-[240px]">
                          Scan the code to complete secure UPI transfer.
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', background: isGalleryDark ? '#262626' : '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: isGalleryDark ? '1px dashed #3f3f46' : '1px dashed #e2e8f0', marginTop: '16px' }}>
                      <ShieldCheck size={16} className="text-[#10b981] flex-shrink-0" />
                      <span>This is a secure simulated Stripe test payment. Any inputs will succeed.</span>
                    </div>

                    {vaultError && (
                      <div className="flex items-center gap-2 text-rose-500 text-[13px] justify-center mt-2">
                        <AlertCircle size={14} />
                        <span>{vaultError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isVaultPaying}
                      className="w-full bg-[#111] text-white py-4 text-[13px] font-bold uppercase tracking-[0.25em] hover:bg-zinc-800 transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
                      style={{
                        backgroundColor: isGalleryDark ? '#fff' : '#111',
                        color: isGalleryDark ? '#111' : '#fff'
                      }}
                    >
                      {isVaultPaying ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Processing payment...
                        </>
                      ) : (
                        vaultPaymentMethod === 'UPI' ? 'Confirm UPI Payment' : 'Pay & Unlock Access'
                      )}
                    </button>
                  </form>
                </div>
              )}
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
      className="text-[6px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors"
    >
      {children}
    </a>
  );
}

export default GalleryView;
