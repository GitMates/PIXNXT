import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { ClientGallerySelect } from '../components/features/ClientGallery/ClientGallerySelect';
import { CollectionCardCover } from '../components/features/ClientGallery/CollectionCardCover';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { getCollectionCardCoverSrc } from '../lib/photoDisplayUrl';
import { buildShowcaseUrl } from '../lib/showcaseUrl';
import { categoryTagsFromCollection } from '../lib/categoryTags';
import { buildGmailComposeUrl } from '../lib/gmailComposeUrl';
import {
  daysSince,
  showcaseContactName,
  showcaseDisplayName,
  showcaseFeaturedPhotoIds,
  showcasePermission,
  showcasePhotoCount,
} from '../lib/showcaseFeature';
import { ChangeCoverModal } from '../components/features/CollectionDashboard/CoverSettings/ChangeCoverModal';
import { AppLoader } from '../components/ui/AppLoading';
import ShowcaseSortableGrid from '../components/features/Showcase/ShowcaseSortableGrid';
import { getPhotoGridDisplayUrl } from '../lib/photoDisplayUrl';
import { getDefaultCoverFocals, parseFocalPoint } from '../lib/focalPoint';
import './Showcase.css';

const MAX_FEATURED = 6;

const DELIVERY_SORT_SELECT_OPTIONS = [
  { value: 'created-new', label: 'Date created: New to Old' },
  { value: 'created-old', label: 'Date created: Old to New' },
  { value: 'event-new', label: 'Event date: New to Old' },
  { value: 'event-old', label: 'Event date: Old to New' },
  { value: 'name-az', label: 'Name: A → Z' },
  { value: 'name-za', label: 'Name: Z → A' },
];
const ORDER_KEY_PREFIX = 'pixnxt_showcase_order:';

const formatEventShort = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

function readStoredOrder(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${ORDER_KEY_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeStoredOrder(userId, ids) {
  if (!userId) return;
  try {
    localStorage.setItem(`${ORDER_KEY_PREFIX}${userId}`, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function sortByPreference(list, collectionSort, orderIds) {
  if (orderIds?.length) {
    const rank = new Map(orderIds.map((id, i) => [String(id), i]));
    return [...list].sort((a, b) => {
      const ra = rank.has(String(a.id)) ? rank.get(String(a.id)) : 9999;
      const rb = rank.has(String(b.id)) ? rank.get(String(b.id)) : 9999;
      if (ra !== rb) return ra - rb;
      return 0;
    });
  }
  return [...list].sort((a, b) => {
    if (collectionSort === 'created-new') return new Date(b.created_at) - new Date(a.created_at);
    if (collectionSort === 'created-old') return new Date(a.created_at) - new Date(b.created_at);
    if (collectionSort === 'event-new') return new Date(b.event_date || 0) - new Date(a.event_date || 0);
    if (collectionSort === 'event-old') return new Date(a.event_date || 0) - new Date(b.event_date || 0);
    if (collectionSort === 'name-az') return (a.name || '').localeCompare(b.name || '');
    if (collectionSort === 'name-za') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });
}

function collectionMetaLine(col) {
  const tags = categoryTagsFromCollection(col);
  const place = tags[0] || '';
  const date = formatEventShort(col.event_date) || formatEventShort(col.created_at);
  const parts = [place, date].filter(Boolean);
  return parts.join(' · ');
}

function photoCountLabel(col) {
  const n = showcasePhotoCount(col);
  if (n === 1) return '1 photograph';
  return `${n} photographs`;
}

function permissionStatus(col) {
  const contact = showcaseContactName(col);
  const status = showcasePermission(col);
  const askedDays = daysSince(col.showcase_permission_at);

  if (status === 'approved') {
    return { tone: 'ok', text: `${contact} said yes`, action: null };
  }
  if (status === 'asked') {
    const when =
      askedDays == null
        ? 'recently'
        : askedDays === 0
          ? 'today'
          : askedDays === 1
            ? '1 day ago'
            : `${askedDays} days ago`;
    return { tone: 'warn', text: `Asked ${contact}, ${when}`, action: 'remind' };
  }
  return { tone: 'idle', text: 'Permission not asked', action: 'ask' };
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MoreDotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function placeMenu(anchorRect) {
  const width = 252;
  const pad = 10;
  const estHeight = 420;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - anchorRect.bottom - pad;
  const spaceAbove = anchorRect.top - pad;
  const openUp = spaceBelow < Math.min(estHeight, 320) && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.min(estHeight, Math.max(160, available));

  let left = anchorRect.right - width;
  left = Math.min(Math.max(pad, left), vw - width - pad);

  if (openUp) {
    return {
      left,
      bottom: vh - anchorRect.top + 6,
      maxHeight,
      openUp: true,
    };
  }
  return {
    left,
    top: anchorRect.bottom + 6,
    maxHeight,
    openUp: false,
  };
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const Showcase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [pwCopyDone, setPwCopyDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [featureOpen, setFeatureOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [photosTarget, setPhotosTarget] = useState(null);
  const [photosList, setPhotosList] = useState([]);
  const [photosSelected, setPhotosSelected] = useState(() => new Set());
  const [photosLoading, setPhotosLoading] = useState(false);
  const [coverTarget, setCoverTarget] = useState(null);
  const [coverPhotos, setCoverPhotos] = useState([]);
  const [coverSets, setCoverSets] = useState([]);
  const [coverSaving, setCoverSaving] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState([]);

  const [statusOn, setStatusOn] = useState(true);
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [collectionSort, setCollectionSort] = useState('created-new');
  const [showBio, setShowBio] = useState(true);
  const [showSocial, setShowSocial] = useState(true);
  const [showWebsite, setShowWebsite] = useState(false);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);

  const menuRef = useRef(null);
  const stateRef = useRef({});
  const saveTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    galleryService
      .getPhotographerProfile(user.id)
      .then((data) => {
        setProfile(data);
        setStatusOn(data?.showcase_enabled ?? true);
        setBio(data?.biography || data?.bio || '');
        setPassword(data?.showcase_password || '');
        setCollectionSort(data?.showcase_sort || 'created-new');
        setShowBio(data?.show_bio ?? true);
        setShowSocial(data?.show_social ?? true);
        setShowWebsite(data?.show_website ?? false);
        setShowEmail(data?.show_email ?? true);
        setShowPhone(data?.show_phone ?? true);
        setShowAddress(data?.show_address ?? true);
      })
      .catch((err) => {
        console.error('Failed to load photographer profile:', err);
        setError('Could not load your profile. Please refresh.');
      })
      .finally(() => setProfileLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setCollectionsLoading(true);
    setFeaturedOrder(readStoredOrder(user.id));
    galleryService
      .getCollections(user.id)
      .then((data) => setCollections(data || []))
      .catch((err) => console.error('Failed to load deliveries:', err))
      .finally(() => setCollectionsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    const handleUsernameChanged = (e) => {
      const newSlug = e.detail?.slug;
      if (newSlug) setProfile((prev) => ({ ...(prev || {}), showcase_slug: newSlug }));
    };
    window.addEventListener('pixnxt:username-changed', handleUsernameChanged);
    return () => window.removeEventListener('pixnxt:username-changed', handleUsernameChanged);
  }, []);

  const closeCardMenu = useCallback(() => {
    setMenuId(null);
    setMenuPos(null);
  }, []);

  useEffect(() => {
    if (!menuId) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        if (e.target.closest?.('.sc-tile__more')) return;
        closeCardMenu();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeCardMenu();
    };
    const onResize = () => closeCardMenu();
    const onScroll = (e) => {
      // Keep the menu open when scrolling inside it; close only when the page moves.
      if (menuRef.current && (e.target === menuRef.current || menuRef.current.contains(e.target))) {
        return;
      }
      closeCardMenu();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menuId, closeCardMenu]);

  const featuredSlots = useMemo(() => {
    const list = collections.filter(
      (c) => c.show_on_showcase !== false && c.status !== 'archived'
    );
    return sortByPreference(list, collectionSort, featuredOrder).slice(0, MAX_FEATURED);
  }, [collections, collectionSort, featuredOrder]);

  const onPage = useMemo(
    () => featuredSlots.filter((c) => c.status === 'published'),
    [featuredSlots]
  );

  const heldBack = useMemo(
    () => featuredSlots.filter((c) => c.status !== 'published'),
    [featuredSlots]
  );

  const featureCandidates = useMemo(() => {
    const featuredIds = new Set(featuredSlots.map((c) => String(c.id)));
    return collections.filter(
      (c) => c.status !== 'archived' && !featuredIds.has(String(c.id))
    );
  }, [collections, featuredSlots]);

  stateRef.current = {
    statusOn,
    bio,
    password,
    collectionSort,
    showBio,
    showSocial,
    showWebsite,
    showEmail,
    showPhone,
    showAddress,
  };

  const performSave = async (overrides = {}) => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const current = stateRef.current;
      const updates = {
        showcase_enabled: Object.prototype.hasOwnProperty.call(overrides, 'showcase_enabled')
          ? overrides.showcase_enabled
          : current.statusOn,
        bio: Object.prototype.hasOwnProperty.call(overrides, 'bio') ? overrides.bio : current.bio,
        biography: Object.prototype.hasOwnProperty.call(overrides, 'bio') ? overrides.bio : current.bio,
        showcase_password: Object.prototype.hasOwnProperty.call(overrides, 'showcase_password')
          ? overrides.showcase_password
          : current.password,
        showcase_sort: Object.prototype.hasOwnProperty.call(overrides, 'showcase_sort')
          ? overrides.showcase_sort
          : current.collectionSort,
        show_bio: Object.prototype.hasOwnProperty.call(overrides, 'show_bio')
          ? overrides.show_bio
          : current.showBio,
        show_social: Object.prototype.hasOwnProperty.call(overrides, 'show_social')
          ? overrides.show_social
          : current.showSocial,
        show_website: Object.prototype.hasOwnProperty.call(overrides, 'show_website')
          ? overrides.show_website
          : current.showWebsite,
        show_email: Object.prototype.hasOwnProperty.call(overrides, 'show_email')
          ? overrides.show_email
          : current.showEmail,
        show_phone: Object.prototype.hasOwnProperty.call(overrides, 'show_phone')
          ? overrides.show_phone
          : current.showPhone,
        show_address: Object.prototype.hasOwnProperty.call(overrides, 'show_address')
          ? overrides.show_address
          : current.showAddress,
      };

      if (typeof updates.bio === 'string') updates.bio = updates.bio.trim() || null;
      if (typeof updates.biography === 'string') updates.biography = updates.biography.trim() || null;
      if (typeof updates.showcase_password === 'string') {
        updates.showcase_password = updates.showcase_password.trim() || null;
      }

      const updated = await galleryService.updatePhotographerProfile(user.id, updates);
      setProfile((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Failed to auto-save:', err);
      setError('Failed to auto-save changes.');
    } finally {
      setSaving(false);
    }
  };

  const autoSave = (overrides = {}, immediate = false) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (immediate) {
      showToast('Changes saved');
      void performSave(overrides);
    } else {
      saveTimeoutRef.current = setTimeout(() => {
        showToast('Changes saved');
        void performSave(overrides);
      }, 500);
    }
  };

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  const persistOrder = useCallback(
    (ids) => {
      setFeaturedOrder(ids);
      writeStoredOrder(user?.id, ids);
    },
    [user?.id]
  );

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setShowPassword(true);
    autoSave({ showcase_password: pwd }, true);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      setPwCopyDone(true);
      setTimeout(() => setPwCopyDone(false), 2000);
    });
  };

  const handleClearPassword = () => {
    setPassword('');
    setShowPassword(false);
    autoSave({ showcase_password: '' }, true);
  };

  const handleCopyUrl = useCallback(() => {
    const url = buildShowcaseUrl(profile, user);
    navigator.clipboard.writeText(url).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }, [profile, user]);

  const handleViewSite = () => {
    window.open(buildShowcaseUrl(profile, user), '_blank');
  };

  const setShowOnShowcase = async (collectionId, enabled, collection = null) => {
    const col =
      collection || collections.find((c) => String(c.id) === String(collectionId));
    try {
      await galleryService.updateCollection(collectionId, { show_on_showcase: enabled });
      setCollections((prev) =>
        prev.map((c) =>
          String(c.id) === String(collectionId) ? { ...c, show_on_showcase: enabled } : c
        )
      );
      if (enabled) {
        if (col?.status === 'published') {
          showToast('Added to Showcase');
        } else {
          showToast('Queued for Showcase — publish the delivery to go live');
        }
      } else {
        showToast('Removed from Showcase');
      }
    } catch (err) {
      console.error('Failed to update showcase visibility:', err);
      setError('Could not update that delivery. Try again.');
    }
  };

  const addToFeatureWork = async (col) => {
    await setShowOnShowcase(col.id, true, col);
    const nextIds = [...featuredSlots.map((c) => String(c.id)), String(col.id)].slice(0, MAX_FEATURED);
    persistOrder(nextIds);
    setFeatureOpen(false);
  };

  const patchCollection = async (collectionId, patch) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, ...patch } : c))
    );
    try {
      const updated = await galleryService.updateCollection(collectionId, patch);
      if (updated) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, ...updated } : c))
        );
      }
      showToast('Changes saved');
      return updated;
    } catch (err) {
      console.error('Failed to update showcase card:', err);
      setError('Could not save that change. Apply the latest Supabase migration if columns are missing.');
      throw err;
    }
  };

  const loadDeliveryMedia = async (collectionId) => {
    const data = await galleryService.getCollectionDashboardData(collectionId);
    return {
      photos: data?.photos || [],
      sets: data?.sets || [],
      collection: data,
    };
  };

  const openChangePhotos = async (col) => {
    closeCardMenu();
    setPhotosTarget(col);
    setPhotosLoading(true);
    try {
      const { photos } = await loadDeliveryMedia(col.id);
      setPhotosList(photos);
      const featured = showcaseFeaturedPhotoIds(col);
      setPhotosSelected(new Set(featured || photos.map((p) => String(p.id))));
    } catch (err) {
      console.error(err);
      setError('Could not load photographs for this delivery.');
      setPhotosTarget(null);
    } finally {
      setPhotosLoading(false);
    }
  };

  const openChooseCover = async (col) => {
    closeCardMenu();
    setCoverTarget(col);
    try {
      const { photos, sets, collection } = await loadDeliveryMedia(col.id);
      setCoverPhotos(photos);
      setCoverSets(sets);
      setCoverTarget({ ...col, ...collection });
    } catch (err) {
      console.error(err);
      setError('Could not load covers for this delivery.');
      setCoverTarget(null);
    }
  };

  const askPermission = async (col, { remind = false } = {}) => {
    closeCardMenu();
    const contact = showcaseContactName(col);
    const title = showcaseDisplayName(col);
    const url = buildShowcaseUrl(profile, user);
    const studio =
      profile?.studio_name ||
      profile?.business_name ||
      profile?.full_name ||
      profile?.display_name ||
      profile?.name ||
      user?.email?.split('@')[0] ||
      'Your studio';
    const body = remind
      ? `Hi ${contact},\n\nJust a gentle reminder — may we feature “${title}” on our public Showcase?\n\n${url}\n\nThank you,\n${studio}`
      : `Hi ${contact},\n\nWe’d love to feature “${title}” on our public Showcase page. May we have your permission?\n\n${url}\n\nThank you,\n${studio}`;

    window.open(
      buildGmailComposeUrl(body, {
        subject: remind ? `Reminder: Showcase permission for ${title}` : `Permission to feature ${title}`,
      }),
      '_blank',
      'noopener,noreferrer'
    );

    await patchCollection(col.id, {
      showcase_permission: 'asked',
      showcase_permission_at: new Date().toISOString(),
      showcase_permission_contact: contact,
    });
  };

  const moveItem = (id, direction) => {
    const ids = featuredSlots.map((c) => String(c.id));
    const index = ids.indexOf(String(id));
    if (index < 0) return;
    const next = direction === 'earlier' ? index - 1 : index + 1;
    if (next < 0 || next >= ids.length) return;
    const swapped = [...ids];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    persistOrder(swapped);
    closeCardMenu();
  };

  const handleShowcaseReorder = useCallback(
    (_from, _to, nextIds) => {
      persistOrder(nextIds.map(String));
    },
    [persistOrder]
  );

  const photographerName =
    profile?.studio_name ||
    profile?.business_name ||
    profile?.full_name ||
    profile?.display_name ||
    profile?.name ||
    user?.email?.split('@')[0] ||
    'Your studio';
  const displayEmail = profile?.contact_email || profile?.email || user?.email || '';
  const displayPhone = profile?.phone || '';
  const displayAddress =
    [profile?.address_line_1, profile?.city, profile?.state_province].filter(Boolean).join(', ') ||
    '';
  const displayWebsite = profile?.website || '';
  const displaySocial = [profile?.social_instagram, profile?.social_facebook, profile?.social_x_twitter].some(
    Boolean
  )
    ? 'From your account'
    : 'Not set';
  const showcaseUrl = buildShowcaseUrl(profile, user);
  const showcaseHost = showcaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const initial = String(photographerName).trim().charAt(0).toUpperCase() || 'S';
  const bioPreview =
    bio?.trim() ||
    [profile?.city, profile?.specialization].filter(Boolean).join('. ') ||
    'Add a short line about your studio in Profile.';

  const onPageCount = onPage.length;
  const heldCount = heldBack.length;
  const featuredCount = featuredSlots.length;
  const statusLine =
    onPageCount === 0 && heldCount === 0
      ? 'Nothing on the page yet. Feature a delivery to begin.'
      : heldCount > 0
        ? `${onPageCount} ${onPageCount === 1 ? 'set is' : 'sets are'} on the page, and ${heldCount} ${
            heldCount === 1 ? 'is' : 'are'
          } held back until permission arrives.`
        : `${onPageCount} ${onPageCount === 1 ? 'set is' : 'sets are'} on the page.`;

  // One dashed “Feature work here” slot to add the next delivery (under the cap).
  const showFeatureHereCard = featuredCount < MAX_FEATURED;
  const menuCol = menuId ? featuredSlots.find((c) => String(c.id) === String(menuId)) : null;
  const menuIndex = menuCol ? featuredSlots.findIndex((c) => String(c.id) === String(menuId)) : -1;
  const menuFeaturedIds = menuCol ? showcaseFeaturedPhotoIds(menuCol) : null;
  const menuTitle = menuCol ? showcaseDisplayName(menuCol) : '';

  return (
    <SidebarLayout>
      <main className="sc-page">
        <header className="sc-hero">
          <div className="sc-hero__copy">
            <h1 className="sc-hero__title">Showcase</h1>
            <p className="sc-hero__lead">{statusLine}</p>
          </div>
          <div className="sc-hero__actions">
            {saving ? <span className="sc-save-pill">Saving…</span> : null}
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={handleViewSite}
              disabled={profileLoading}
            >
              <EyeIcon />
              View the page
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--solid"
              onClick={() => setFeatureOpen(true)}
              disabled={collectionsLoading}
            >
              + Feature work
            </button>
          </div>
        </header>

        {error ? <div className="sc-error-banner">{error}</div> : null}

        {!user ? (
          <p className="sc-muted">Please log in to view and edit your showcase settings.</p>
        ) : null}

        {profileLoading && user ? (
          <AppLoader label="Loading your profile" variant="page-short" className="sc-loading" />
        ) : null}

        {user && !profileLoading ? (
          <>
            <div className="sc-top-cards">
              <div className="sc-card sc-card--url">
                <div className="sc-card__icon" aria-hidden>
                  <GlobeIcon />
                </div>
                <div className="sc-card__body">
                  <p className="sc-card__title">{showcaseHost}</p>
                  <p className="sc-card__desc">
                    {statusOn
                      ? onPageCount > 0
                        ? `Anyone with the address can see ${onPageCount} ${
                            onPageCount === 1 ? 'set' : 'sets'
                          }. No link needed.`
                        : 'Live address. Feature work below so visitors have something to see.'
                      : 'Showcase is off. The address returns nothing until you turn it on.'}
                  </p>
                </div>
                <div className="sc-card__actions">
                  <button type="button" className="sc-btn sc-btn--outline" onClick={handleCopyUrl}>
                    {copyDone ? 'Copied' : 'Copy address'}
                  </button>
                  <button
                    type="button"
                    className={`sc-switch${statusOn ? ' is-on' : ''}`}
                    aria-pressed={statusOn}
                    aria-label="Publish Showcase"
                    onClick={() => {
                      const nextVal = !statusOn;
                      setStatusOn(nextVal);
                      autoSave({ showcase_enabled: nextVal }, true);
                    }}
                  >
                    <span className="sc-switch__thumb" />
                  </button>
                </div>
              </div>

              <div className="sc-card sc-card--profile">
                <div className="sc-card__avatar" aria-hidden>
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt="" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="sc-card__body">
                  <p className="sc-card__title">{photographerName}</p>
                  <p className="sc-card__desc">{bioPreview}</p>
                </div>
                <div className="sc-card__actions">
                  <Link to="/account/account" className="sc-btn sc-btn--outline">
                    Change in Profile
                  </Link>
                </div>
                <div className="sc-card__note">
                  <InfoIcon />
                  <span>
                    The name, mark and contact details on the page come from{' '}
                    <Link to="/account/account">Your account</Link> and are read-only here. They are the
                    same fields the galleries, albums and invoices use — editing them in two places
                    is how one studio ends up with two names.
                  </span>
                </div>
              </div>
            </div>

            <section className={`sc-settings${settingsOpen ? '' : ' sc-settings--collapsed'}`}>
              <header className="sc-settings__head">
                <span className="sc-card__icon" aria-hidden>
                  <SettingsIcon />
                </span>
                <div className="sc-card__body">
                  <h2 className="sc-card__title">Page settings</h2>
                  <p className="sc-card__desc">Password, what visitors see, and how deliveries sort.</p>
                </div>
                <button
                  type="button"
                  className="sc-settings__collapse"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  {settingsOpen ? 'Collapse' : 'Expand'}
                </button>
              </header>

              {settingsOpen ? (
                <div className="sc-settings__body">
                  <div className="sc-settings__blocks">
                    <div className="sc-setting-block">
                      <div className="sc-setting-block__head">
                        <span className="sc-setting-block__icon" aria-hidden>
                          <LockIcon />
                        </span>
                        <div className="sc-setting-block__meta">
                          <h3 className="sc-setting-block__title">Privacy</h3>
                          <p className="sc-setting-block__hint">Require a password before visitors can browse.</p>
                        </div>
                        {password ? (
                          <span className="sc-status-pill sc-status-pill--ok">Protected</span>
                        ) : (
                          <span className="sc-status-pill">Open</span>
                        )}
                      </div>
                      <div className="sc-input-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="sc-input"
                          placeholder="Add a password"
                          value={password}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassword(val);
                            autoSave({ showcase_password: val }, false);
                          }}
                        />
                        {password ? (
                          <div className="sc-pw-actions">
                            <button
                              type="button"
                              className="sc-pw-icon-btn"
                              onClick={() => setShowPassword((v) => !v)}
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              <EyeIcon />
                            </button>
                            <button
                              type="button"
                              className={`sc-pw-icon-btn${pwCopyDone ? ' is-done' : ''}`}
                              onClick={handleCopyPassword}
                              title="Copy password"
                            >
                              {pwCopyDone ? '✓' : 'Copy'}
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="sc-pw-generate-btn" onClick={generatePassword}>
                            Generate
                          </button>
                        )}
                      </div>
                      {password ? (
                        <p className="sc-help-text">
                          Visitors need this password to open your Showcase.
                          <button type="button" className="sc-pw-clear-btn" onClick={handleClearPassword}>
                            Remove password
                          </button>
                        </p>
                      ) : null}
                    </div>

                    <div className="sc-setting-block">
                      <div className="sc-setting-block__head sc-setting-block__head--compact">
                        <div className="sc-setting-block__meta">
                          <h3 className="sc-setting-block__title">Delivery sort order</h3>
                          <p className="sc-setting-block__hint">
                            Default order when you have not dragged cards.
                          </p>
                        </div>
                      </div>
                      <ClientGallerySelect
                        value={collectionSort}
                        onChange={(val) => {
                          setCollectionSort(val);
                          autoSave({ showcase_sort: val }, true);
                          persistOrder([]);
                        }}
                        aria-label="Delivery sort order"
                        options={DELIVERY_SORT_SELECT_OPTIONS}
                      />
                      <p className="sc-help-text">Dragging on this page overrides the default.</p>
                    </div>

                    <div className="sc-setting-block sc-setting-block--full">
                      <div className="sc-setting-block__head sc-setting-block__head--compact">
                        <div className="sc-setting-block__meta">
                          <h3 className="sc-setting-block__title">Biography</h3>
                          <p className="sc-setting-block__hint">Shown on your public Showcase page.</p>
                        </div>
                        <span className="sc-char-count sc-char-count--inline">{bio.length} / 500</span>
                      </div>
                      <div className="sc-textarea-wrap sc-textarea-wrap--plain">
                        <textarea
                          className="sc-textarea"
                          maxLength={500}
                          placeholder="Tell your clients about yourself and your photography style…"
                          value={bio}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBio(val);
                            autoSave({ bio: val, biography: val }, false);
                          }}
                        />
                      </div>
                    </div>

                    <div className="sc-setting-block sc-setting-block--full">
                      <div className="sc-setting-block__head sc-setting-block__head--compact">
                        <div className="sc-setting-block__meta">
                          <h3 className="sc-setting-block__title">What visitors see</h3>
                          <p className="sc-setting-block__hint">
                            Contact details come from{' '}
                            <Link to="/account/account">Your account</Link>.
                          </p>
                        </div>
                      </div>
                      <div className="sc-info-tiles">
                        <InfoTile
                          checked={showBio}
                          onChange={(v) => {
                            setShowBio(v);
                            autoSave({ show_bio: v }, true);
                          }}
                          label="Biography"
                          sublabel={bio ? `"${bio.slice(0, 40)}${bio.length > 40 ? '…' : ''}"` : 'No bio yet'}
                        />
                        <InfoTile
                          checked={showSocial}
                          onChange={(v) => {
                            setShowSocial(v);
                            autoSave({ show_social: v }, true);
                          }}
                          label="Social links"
                          sublabel={displaySocial}
                        />
                        <InfoTile
                          checked={showWebsite}
                          onChange={(v) => {
                            setShowWebsite(v);
                            autoSave({ show_website: v }, true);
                          }}
                          label="Website"
                          sublabel={displayWebsite || 'Not set'}
                        />
                        <InfoTile
                          checked={showEmail}
                          onChange={(v) => {
                            setShowEmail(v);
                            autoSave({ show_email: v }, true);
                          }}
                          label="Contact email"
                          sublabel={displayEmail || 'Not set'}
                        />
                        <InfoTile
                          checked={showPhone}
                          onChange={(v) => {
                            setShowPhone(v);
                            autoSave({ show_phone: v }, true);
                          }}
                          label="Phone number"
                          sublabel={displayPhone || 'Not set'}
                        />
                        <InfoTile
                          checked={showAddress}
                          onChange={(v) => {
                            setShowAddress(v);
                            autoSave({ show_address: v }, true);
                          }}
                          label="Business address"
                          sublabel={displayAddress || 'Not set'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="sc-onpage">
              <div className="sc-onpage__head">
                <div className="sc-onpage__label">
                  <span>On the page</span>
                  <span className="sc-onpage__count">{featuredCount}</span>
                </div>
                <p className="sc-onpage__hint">Drag to reorder</p>
              </div>

              {collectionsLoading ? (
                <AppLoader label="Loading deliveries" variant="page-short" className="sc-loading" />
              ) : (
                <div className="sc-grid">
                  <ShowcaseSortableGrid
                    className="sc-sortable-root"
                    items={featuredSlots}
                    disabled={Boolean(menuId)}
                    onReorder={handleShowcaseReorder}
                    renderItem={(col, index, { isDragging }) => {
                      const meta = collectionMetaLine(col);
                      const title = showcaseDisplayName(col);
                      const perm = permissionStatus(col);
                      const isMenu = menuId === col.id;
                      const isHeld = col.status !== 'published';
                      return (
                        <article
                          className={`sc-tile${isHeld ? ' sc-tile--held' : ''}${isDragging ? ' is-dragging' : ''}${isMenu ? ' is-menu-open' : ''}`}
                        >
                          <div className="sc-tile__media">
                            <span className="sc-tile__pos">{index + 1}</span>
                            {isHeld ? <span className="sc-tile__held-badge">Draft</span> : null}
                            {getCollectionCardCoverSrc(col) ? (
                              <CollectionCardCover
                                collection={col}
                                alt={title}
                                className="sc-tile__img"
                              />
                            ) : (
                              <div className="sc-tile__placeholder" />
                            )}
                            <span className="sc-tile__count">{photoCountLabel(col)}</span>
                            <button
                              type="button"
                              className={`sc-tile__more${isMenu ? ' is-open' : ''}`}
                              aria-label={`Actions for ${title}`}
                              aria-expanded={isMenu}
                              aria-haspopup="menu"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isMenu) {
                                  closeCardMenu();
                                  return;
                                }
                                setMenuId(col.id);
                                setMenuPos(placeMenu(e.currentTarget.getBoundingClientRect()));
                              }}
                            >
                              <MoreDotsIcon />
                            </button>
                          </div>

                          <div className="sc-tile__meta">
                            <h3 className="sc-tile__title">{title}</h3>
                            {meta ? <p className="sc-tile__sub">{meta}</p> : null}
                            {isHeld ? (
                              <p className="sc-tile__status is-warn">
                                <span className="sc-dot" />
                                <span>Publish to go live</span>
                                <button
                                  type="button"
                                  className="sc-tile__link"
                                  onClick={() => navigate(`/deliveries/manage?id=${col.id}`)}
                                >
                                  Open delivery
                                </button>
                              </p>
                            ) : perm.action !== 'ask' ? (
                              <p className={`sc-tile__status is-${perm.tone}`}>
                                <span className="sc-dot" />
                                <span>{perm.text}</span>
                                {perm.action === 'remind' ? (
                                  <button
                                    type="button"
                                    className="sc-tile__link"
                                    onClick={() => void askPermission(col, { remind: true })}
                                  >
                                    Remind
                                  </button>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      );
                    }}
                  />

                  {showFeatureHereCard ? (
                    <div className="sc-empty-wrap">
                      <button
                        type="button"
                        className="sc-tile sc-tile--empty"
                        onClick={() => setFeatureOpen(true)}
                      >
                        <div className="sc-tile__media sc-tile__media--empty">
                          <span className="sc-tile__plus">+</span>
                          <span className="sc-tile__empty-title">Feature work here</span>
                          <span className="sc-tile__empty-sub">
                            Position {featuredCount + 1} of {MAX_FEATURED}
                          </span>
                        </div>
                        <div className="sc-tile__meta sc-tile__meta--empty" aria-hidden="true">
                          <span className="sc-tile__title">&nbsp;</span>
                          <span className="sc-tile__sub">&nbsp;</span>
                          <span className="sc-tile__status">&nbsp;</span>
                        </div>
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {(() => {
              const asked = onPage.filter((c) => showcasePermission(c) === 'asked').length;
              if (asked > 0) {
                return (
                  <div className="sc-hatch-note">
                    <p>
                      <strong>
                        {asked} {asked === 1 ? 'set is' : 'sets are'} waiting on permission.
                      </strong>{' '}
                      Hatched work stays arranged on this page. It is safe — there is no second button
                      to press, and nothing publishes by accident when you only asked.
                    </p>
                  </div>
                );
              }
              if (heldCount > 0) {
                return (
                  <div className="sc-hatch-note">
                    <p>
                      <strong>
                        {heldCount} {heldCount === 1 ? 'set is' : 'sets are'} held back.
                      </strong>{' '}
                      Work marked for Showcase but not published yet stays off the public page until
                      you publish the delivery.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </>
        ) : null}
      </main>

      {menuCol && menuPos
        ? createPortal(
            <div
              className="sc-menu sc-menu--fixed"
              ref={menuRef}
              role="menu"
              style={{
                left: menuPos.left,
                maxHeight: menuPos.maxHeight,
                ...(menuPos.openUp
                  ? { bottom: menuPos.bottom, top: 'auto' }
                  : { top: menuPos.top, bottom: 'auto' }),
              }}
            >
              <p className="sc-menu__head">{menuTitle.toUpperCase()}</p>

              <button
                type="button"
                className="sc-menu__item"
                onClick={() => void openChangePhotos(menuCol)}
              >
                <span className="sc-menu__title">Change the photographs</span>
                <span className="sc-menu__sub">
                  {menuFeaturedIds
                    ? `${menuFeaturedIds.length} picked from ${menuCol.name || menuTitle}`
                    : `${Number(menuCol.photo_count) || 0} in ${menuCol.name || menuTitle}`}
                </span>
              </button>
              <button
                type="button"
                className="sc-menu__item"
                onClick={() => {
                  closeCardMenu();
                  setRenameTarget(menuCol);
                  setRenameValue(showcaseDisplayName(menuCol));
                }}
              >
                <span className="sc-menu__title">Rename</span>
                <span className="sc-menu__sub">The title on the public page, not the delivery</span>
              </button>
              <button
                type="button"
                className="sc-menu__item"
                onClick={() => void openChooseCover(menuCol)}
              >
                <span className="sc-menu__title">Choose the cover</span>
              </button>

              <div className="sc-menu__rule" />

              <button
                type="button"
                className="sc-menu__item sc-menu__item--row"
                disabled={menuIndex <= 0}
                onClick={() => moveItem(menuCol.id, 'earlier')}
              >
                <span className="sc-menu__title">Move earlier</span>
                <span className="sc-menu__badge">→ {Math.max(1, menuIndex)}</span>
              </button>
              <button
                type="button"
                className="sc-menu__item sc-menu__item--row"
                disabled={menuIndex < 0 || menuIndex >= featuredSlots.length - 1}
                onClick={() => moveItem(menuCol.id, 'later')}
              >
                <span className="sc-menu__title">Move later</span>
                <span className="sc-menu__badge">
                  → {Math.min(featuredSlots.length, menuIndex + 2)}
                </span>
              </button>

              <button
                type="button"
                className="sc-menu__item"
                onClick={() => {
                  closeCardMenu();
                  navigate(`/deliveries/manage?id=${menuCol.id}`);
                }}
              >
                <span className="sc-menu__title">Open the delivery</span>
                <span className="sc-menu__sub">{menuCol.name}</span>
              </button>

              <div className="sc-menu__rule" />

              <button
                type="button"
                className="sc-menu__item sc-menu__item--danger"
                onClick={() => {
                  closeCardMenu();
                  setRemoveTarget(menuCol);
                }}
              >
                <span className="sc-menu__title">Remove from the Showcase</span>
                <span className="sc-menu__sub">The delivery is untouched</span>
              </button>
            </div>,
            document.body
          )
        : null}

      {renameTarget ? (
        <div className="sc-modal-backdrop" role="presentation" onClick={() => setRenameTarget(null)}>
          <div
            className="sc-modal"
            role="dialog"
            aria-labelledby="sc-rename-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sc-rename-title" className="sc-modal__title">
              Rename on Showcase
            </h2>
            <p className="sc-modal__desc">
              This title appears on the public page only. The delivery name stays “{renameTarget.name}”.
            </p>
            <input
              className="sc-modal__input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <div className="sc-modal__footer">
              <button type="button" className="sc-btn sc-btn--outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="sc-btn sc-btn--solid"
                onClick={async () => {
                  const next = renameValue.trim();
                  await patchCollection(renameTarget.id, {
                    showcase_display_name: next && next !== renameTarget.name ? next : null,
                  });
                  setRenameTarget(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {photosTarget ? (
        <div className="sc-modal-backdrop" role="presentation" onClick={() => setPhotosTarget(null)}>
          <div
            className="sc-modal sc-modal--wide"
            role="dialog"
            aria-labelledby="sc-photos-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sc-photos-title" className="sc-modal__title">
              Change the photographs
            </h2>
            <p className="sc-modal__desc">
              Pick which photographs represent {showcaseDisplayName(photosTarget)} on your Showcase.
              The delivery gallery is unchanged.
            </p>
            {photosLoading ? (
              <AppLoader label="Loading photographs" variant="compact" className="sc-loading" />
            ) : (
              <>
                <div className="sc-photo-toolbar">
                  <span>{photosSelected.size} selected</span>
                  <div className="sc-photo-toolbar__actions">
                    <button
                      type="button"
                      className="sc-tile__link"
                      onClick={() => setPhotosSelected(new Set(photosList.map((p) => String(p.id))))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="sc-tile__link"
                      onClick={() => setPhotosSelected(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="sc-photo-grid">
                  {photosList.map((photo) => {
                    const id = String(photo.id);
                    const on = photosSelected.has(id);
                    const src = getPhotoGridDisplayUrl(photo) || photo.thumbnail_url || photo.web_url;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`sc-photo-cell${on ? ' is-on' : ''}`}
                        onClick={() => {
                          setPhotosSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                      >
                        {src ? <img src={src} alt="" /> : <div className="sc-tile__placeholder" />}
                        <span className="sc-photo-check">{on ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div className="sc-modal__footer">
              <button type="button" className="sc-btn sc-btn--outline" onClick={() => setPhotosTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="sc-btn sc-btn--solid"
                disabled={photosLoading || photosSelected.size === 0}
                onClick={async () => {
                  const allIds = photosList.map((p) => String(p.id));
                  const selected = [...photosSelected];
                  const same =
                    selected.length === allIds.length &&
                    allIds.every((id) => photosSelected.has(id));
                  await patchCollection(photosTarget.id, {
                    showcase_featured_photo_ids: same ? null : selected,
                  });
                  setPhotosTarget(null);
                }}
              >
                Save selection
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coverTarget ? (
        <ChangeCoverModal
          isOpen
          onClose={() => setCoverTarget(null)}
          photos={coverPhotos}
          coverUrl={coverTarget.cover_url}
          coverPhoto={
            coverPhotos.find((p) => String(p.id) === String(coverTarget.cover_photo_id)) || null
          }
          initialFocals={getDefaultCoverFocals(
            parseFocalPoint(coverTarget.cover_focals?.desktop) ||
              parseFocalPoint({
                x: coverTarget.cover_focal_x,
                y: coverTarget.cover_focal_y,
              }) || { x: 50, y: 50 }
          )}
          initialView="pick"
          sets={coverSets}
          highlightsName={coverTarget.highlights_name || 'Highlights'}
          saving={coverSaving}
          onConfirm={async ({ photo, focals }) => {
            if (!photo) return;
            setCoverSaving(true);
            try {
              const url = photo.full_url || photo.web_url || photo.thumbnail_url;
              await patchCollection(coverTarget.id, {
                cover_photo_id: photo.id,
                cover_url: url,
                cover_focals: focals,
                cover_focal_x: focals?.desktop?.x ?? 50,
                cover_focal_y: focals?.desktop?.y ?? 50,
              });
              setCoverTarget(null);
            } finally {
              setCoverSaving(false);
            }
          }}
        />
      ) : null}

      {featureOpen ? (
        <div className="sc-modal-backdrop" role="presentation" onClick={() => setFeatureOpen(false)}>
          <div
            className="sc-modal sc-modal--feature"
            role="dialog"
            aria-labelledby="sc-feature-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sc-feature-title" className="sc-modal__title">
              Feature work
            </h2>
            <p className="sc-modal__desc">
              Choose a delivery to put on your public Showcase. Published deliveries appear at once;
              drafts are queued until you publish them.
            </p>
            <div className="sc-modal__list">
              {featureCandidates.length === 0 ? (
                <p className="sc-muted">Every delivery is already featured, or you have none yet.</p>
              ) : (
                featureCandidates.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    className="sc-pick"
                    onClick={() => void addToFeatureWork(col)}
                  >
                    <div className="sc-pick__thumb">
                      {getCollectionCardCoverSrc(col) ? (
                        <CollectionCardCover collection={col} alt="" />
                      ) : (
                        <div className="sc-tile__placeholder" />
                      )}
                    </div>
                    <div className="sc-pick__copy">
                      <strong>{col.name || 'Untitled'}</strong>
                      <span>
                        {col.status === 'published' ? 'Published' : 'Draft'} · {photoCountLabel(col)}
                      </span>
                    </div>
                    <span
                      className={`sc-pick__badge${col.status === 'published' ? ' is-live' : ''}`}
                    >
                      {col.status === 'published' ? 'Live now' : 'Queued until published'}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="sc-modal__footer">
              <button type="button" className="sc-btn sc-btn--outline" onClick={() => setFeatureOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeTarget ? (
        <div className="sc-modal-backdrop" role="presentation" onClick={() => setRemoveTarget(null)}>
          <div
            className="sc-modal sc-modal--confirm"
            role="dialog"
            aria-labelledby="sc-remove-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sc-remove-title" className="sc-modal__title">
              Remove this from the Showcase?
            </h2>
            <p className="sc-modal__desc">
              <strong>{showcaseDisplayName(removeTarget)}</strong> comes off the public page. The
              delivery itself — {photoCountLabel(removeTarget)} — is not touched, and neither is the
              client&apos;s gallery link.
            </p>
            <div className="sc-modal__footer">
              <button type="button" className="sc-btn sc-btn--outline" onClick={() => setRemoveTarget(null)}>
                Keep it
              </button>
              <button
                type="button"
                className="sc-btn sc-btn--danger"
                onClick={async () => {
                  const id = removeTarget.id;
                  setRemoveTarget(null);
                  await setShowOnShowcase(id, false);
                  persistOrder(onPage.filter((c) => c.id !== id).map((c) => String(c.id)));
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="sc-toast">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      ) : null}
    </SidebarLayout>
  );
};

const InfoTile = ({ checked, onChange, label, sublabel }) => (
  <button
    type="button"
    className={`sc-info-tile${checked ? ' is-on' : ''}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="sc-info-tile__top">
      <span className="sc-info-tile__label">{label}</span>
      <span className={`sc-mini-switch${checked ? ' is-on' : ''}`} aria-hidden>
        <span className="sc-mini-switch__thumb" />
      </span>
    </span>
    {sublabel ? <span className="sc-info-tile__sub">{sublabel}</span> : null}
  </button>
);

export default Showcase;
