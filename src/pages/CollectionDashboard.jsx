import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { DELIVERY_PRODUCT_HOME, deliveryStudioBackPath } from '../lib/deliveryIds';
import {
    DELIVERY_STATUS,
    deliveryStatusLabel,
    hasBeenPublished,
    uiDeliveryStatus,
} from '../lib/deliveryStatus';
import { Heart, Play } from 'lucide-react';
import { galleryService } from '../services/gallery.service';
import { photoAiService } from '../services/photoAi.service';
import {
    filterPhotosByPerson,
    filterPhotosByIds,
    peopleInPhoto,
} from '../lib/photoAiSearch';
import { CollectionPhotosWorkspaceHeader } from '../components/features/CollectionDashboard/Photos/CollectionPhotosWorkspaceHeader';
import '../components/features/CollectionDashboard/Photos/CollectionPhotosWorkspaceHeader.css';
import { PhotoOptionsMenu } from '../components/features/CollectionDashboard/Media/PhotoOptionsMenu';
import '../components/features/CollectionDashboard/Media/PhotoOptionsMenu.css';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { DesignTab } from '../components/features/CollectionDashboard/DesignTab';
import '../components/features/CollectionDashboard/DesignTab/DesignWorkspace.css';
import { PreviewPane } from '../components/features/CollectionDashboard/PreviewPane';
import { ChangeCoverModal } from '../components/features/CollectionDashboard/CoverSettings/ChangeCoverModal';
import { CollectionDashboardSidebar } from '../components/features/CollectionDashboard/Sidebar/CollectionDashboardSidebar';
import { SetOptionsMenu } from '../components/features/CollectionDashboard/Sidebar/SetOptionsMenu';
import { DeliveryFilmsView } from '../components/features/CollectionDashboard/Films/DeliveryFilmsView';
import { downloadPhotoFromR2 } from '../lib/downloadPhoto';
import {
  resolvePhotosForDownloadActivity,
  countPhotosForDownloadActivity,
  formatDownloadDestination,
} from '../lib/downloadActivityResolve';
import {
  exportDownloadActivityCsv,
  exportDownloadActivityExcel,
  exportDownloadActivityPdf,
} from '../lib/downloadActivityExport';
import { exportFavoriteListExcel } from '../lib/favoriteListExport';
import { openSpaPath } from '../lib/spaNavigation';
import {
    chromeFromDelivery,
    gridSettingsFromDelivery,
    toDeliveryDesignPatch,
} from '../lib/designSettingsPersist';
import { openShareByEmail, openWhatsAppShare, getCollectionShareUrl, getQrCodeImageUrl } from '../lib/shareCollection';
import { resolveUploadDefaults, syncUploadDefaultsToLocalStorage, isRawUploadEnabled } from '../lib/uploadDefaults';
import { CollectionQrModal, CollectionDuplicateModal } from '../components/features/ClientGallery/CollectionShareModals';
import { GuestDeliveryQrModal } from '../components/features/CollectionDashboard/GuestDeliveryQrModal';
import '../components/features/CollectionDashboard/GuestDeliveryQrModal.css';
import { guestDeliveryService } from '../services/guestDelivery.service';
import { guestDeliveryPublishService } from '../services/guestDeliveryPublish.service';
import EventGuestsPanel from '../components/guest-delivery/EventGuestsPanel';
import '../pages/guest-delivery/GuestDelivery.css';
import { sortDashboardPhotos } from '../utils/sortDashboardPhotos';
import {
  optionToSortUi,
  sortFieldToOption,
} from '../lib/dashboardPhotoSortUi';
import { normalizeGalleryPhotoSort } from '../lib/galleryPhotoSort';
import { clientGalleryEmailTemplatesService } from '../services/clientGalleryEmailTemplates.service';
import { COVER_IMAGE_ACCEPT, MEDIA_FILE_INPUT_ACCEPT, pickMediaFilesOrFallback } from '../lib/mediaFilePicker';
import { setCoverPhotoDragData, endCoverPhotoDrag, isGalleryImagePhoto } from '../lib/coverPhotoDrag';
import { DatePicker } from '../components/ui/DatePicker';
import './CollectionDashboard.css';
import '../styles/clientGalleryTheme.css';
import '../styles/collectionDashboardTheme.css';
import '../components/features/CollectionDashboard/Activity/DownloadActivity.css';
import '../components/features/CollectionDashboard/Activity/FavoriteActivity.css';
import '../components/features/CollectionDashboard/Activity/StoreOrdersActivity.css';
import '../components/features/CollectionDashboard/Activity/EmailRegistrationActivity.css';
import '../components/features/CollectionDashboard/Activity/ActivityFeed.css';
import '../components/features/CollectionDashboard/Settings/Settings.css';
import { ActivityView } from '../components/features/CollectionDashboard/Activity/ActivityView';
import { guestDeliveryGuestsService } from '../services/guestDeliveryGuests.service';
import { DownloadSettings } from '../components/features/CollectionDashboard/Settings/DownloadSettings';
import { FavoriteSettings } from '../components/features/CollectionDashboard/Settings/FavoriteSettings';
import { GeneralSettings } from '../components/features/CollectionDashboard/Settings/GeneralSettings';
import { PrivacySettings } from '../components/features/CollectionDashboard/Settings/PrivacySettings';
import { StoreSettings } from '../components/features/CollectionDashboard/Settings/StoreSettings';
import { useUploadQueue } from '../components/features/CollectionDashboard/Upload/useUploadQueue';
import { isIncompleteUploadPhoto } from '../components/features/CollectionDashboard/Upload/uploadUtils';
import { UPLOAD_VIEW_COLLECTION_EVENT } from '../components/features/CollectionDashboard/Upload/GlobalUploadShell';
import { getFileMime, isImageMime, getUploadMediaType, isUploadableMediaFile } from '../lib/fileMime';
import { isRawImageFile } from '../lib/rawImageFormats';
import { prepareUploadFile } from '../lib/prepareUploadFile';
import { clearMediaUrlCache } from '../lib/imageLoadCache';
import { categoryTagsFromCollection, categoryTagsToDb } from '../lib/categoryTags';
import { isMissingDbColumnError } from '../lib/focalPoint';
import {
    appendCoverFocalsToCoverUrl,
    getCollectionFocal,
    getCollectionFocals,
    getDefaultCoverFocals,
    stripMediaUrlHash,
} from '../lib/focalPoint';
import { CollectionGridPhoto } from '../components/features/CollectionDashboard/Media/CollectionGridPhoto';
import CollectionPhotoSortableGrid from '../components/features/CollectionDashboard/Media/CollectionPhotoSortableGrid';
import { RawPhotoPlaceholder } from '../components/features/CollectionDashboard/Media/RawPhotoPlaceholder';
import {
    getPhotoFullDisplayUrl,
    getPhotoOriginalFileUrl,
    hasRawDisplayPreview,
    isRawMedia,
} from '../lib/photoDisplayUrl';
import { formatCoverDate, formatSidebarDeliveryDate, formatLastSavedTime } from '../lib/formatCoverDate.js';
import {
    countGalleryMedia,
    filterGalleryMediaByType,
} from '../lib/galleryMediaType';
import {
    normalizeCoverStyleId,
    normalizeFontId,
    normalizePaletteId,
    resolveCoverLayoutId,
} from '../lib/normalizeDesignTokens.js';
import {
    cacheSlideshowEnabled,
    readCachedSlideshowEnabled,
} from '../lib/collectionFeatureFlags';
import { MoveCollectionModal } from '../components/features/Collections/MoveCollectionModal';

import { applyWatermarkToBlob } from '../lib/watermarkUtils';
import { storageService } from '../services/storage.service';
import { getProxiedMediaFetchUrl } from '../lib/r2MediaProxy';

const CollectionDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get('id');
    const activityTabParam = searchParams.get('tab');
    const activitySubParam = searchParams.get('activity');
    const { user } = useAuth();
    const photosGridRef = useRef(null);
    const pendingUploadScrollRef = useRef(false);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [collection, setCollection] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!user?.id) {
            setProfile(null);
            return;
        }
        supabase
            .from('photographers')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setProfile(data);
                    syncUploadDefaultsToLocalStorage(data);
                }
            })
            .catch((err) => console.error('Error loading photographer profile:', err));
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setPresets([]);
            return;
        }
        supabase
            .from('presets')
            .select('*')
            .eq('photographer_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error fetching presets:', error);
                } else if (data) {
                    setPresets(data);
                }
            });

        supabase
            .from('watermarks')
            .select('*')
            .eq('photographer_id', user.id)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error fetching watermarks:', error);
                } else if (data) {
                    setWatermarks(data);
                }
            });
    }, [user?.id]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState('upload');
    const [status, setStatus] = useState(DELIVERY_STATUS.draft);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);
    const [showShareDropdown, setShowShareDropdown] = useState(false);
    const [isDraggingModal, setIsDraggingModal] = useState(false);
    const [isDraggingDropzone, setIsDraggingDropzone] = useState(false);
    const [activePhotoMenu, setActivePhotoMenu] = useState(null);
    const [showGridSettings, setShowGridSettings] = useState(false);
    const [gridSize, setGridSize] = useState('small');
    const [showFilename, setShowFilename] = useState(() => resolveUploadDefaults(null).filenameDisplay === 'show');
    const [showCameraBadges, setShowCameraBadges] = useState(
        () => localStorage.getItem('cd_show_camera_badges') === '1'
    );
    const [showUnmatchedPeople, setShowUnmatchedPeople] = useState(false);
    const [showClientFavorited, setShowClientFavorited] = useState(
        () => localStorage.getItem('cd_show_client_favorited') === '1'
    );
    const [showInSelectionList, setShowInSelectionList] = useState(
        () => localStorage.getItem('cd_show_selection_list') === '1'
    );
    const [clientFavoritedPhotoIds, setClientFavoritedPhotoIds] = useState(() => new Set());
    const [selectionListPhotoIds, setSelectionListPhotoIds] = useState(() => new Set());
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);
    const [photoMenu, setPhotoMenu] = useState(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showQuickShareModal, setShowQuickShareModal] = useState(false);
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [showWatermarkModal, setShowWatermarkModal] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [lightboxOpenIndex, setLightboxOpenIndex] = useState(-1); // -1 = closed
    const [lightboxImgFailed, setLightboxImgFailed] = useState(false);
    const [newPhotoName, setNewPhotoName] = useState('');
    const [targetSetId, setTargetSetId] = useState(null);
    const [moveMode, setMoveMode] = useState('move'); // 'move' or 'copy'
    const [showSetMenu, setShowSetMenu] = useState(null); // set id or null
    const [setMenuAnchor, setSetMenuAnchor] = useState(null);
    const [mobileAppSets, setMobileAppSets] = useState({});
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState([]);

    const [showPeoplePanel, setShowPeoplePanel] = useState(false);
    const [photoSearchQuery, setPhotoSearchQuery] = useState('');
    const [activePersonId, setActivePersonId] = useState(null);
    const [photoAiRows, setPhotoAiRows] = useState([]);
    const [photoAiPeople, setPhotoAiPeople] = useState([]);
    const [photoAiLoadingPeople, setPhotoAiLoadingPeople] = useState(false);
    const [selfiePreview, setSelfiePreview] = useState('');
    const [selfieMatchPhotoIds, setSelfieMatchPhotoIds] = useState([]);
    const [selfieSearching, setSelfieSearching] = useState(false);
    const [selfieMessage, setSelfieMessage] = useState('');
  const [photoAiTableMissing, setPhotoAiTableMissing] = useState(false);
  const [photoAiIndexing, setPhotoAiIndexing] = useState(false);
    const [showGdQrModal, setShowGdQrModal] = useState(false);
    const [gdEvent, setGdEvent] = useState(null);
    const [gdGuestCount, setGdGuestCount] = useState(0);
    const [gdPublishing, setGdPublishing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [photosToDelete, setPhotosToDelete] = useState([]);
    const [showSelectionMore, setShowSelectionMore] = useState(false);
    const [showSelectAllMenu, setShowSelectAllMenu] = useState(false);
    const [showMoveToSetMenu, setShowMoveToSetMenu] = useState(false);
    const [moveMenuPosition, setMoveMenuPosition] = useState(null);
    const [selectionMoreMenuPosition, setSelectionMoreMenuPosition] = useState(null);
    const [photoMenuPosition, setPhotoMenuPosition] = useState(null);
    const [photoMenuAlignLeft, setPhotoMenuAlignLeft] = useState(false);

    // MORE DROPDOWN MODAL STATES
    const [showGetDirectLinkModal, setShowGetDirectLinkModal] = useState(false);
    const [showQrCodeModal, setShowQrCodeModal] = useState(false);
    const [quickShareShowQr, setQuickShareShowQr] = useState(false);
    const [showEmailHistoryModal, setShowEmailHistoryModal] = useState(false);
    const [emailHistory, setEmailHistory] = useState([]);
    const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
    const [emailHistoryError, setEmailHistoryError] = useState('');
    const [emailHistoryHelpOpen, setEmailHistoryHelpOpen] = useState(false);
    const [showPresetsSubmenu, setShowPresetsSubmenu] = useState(false);
    const [showApplyPresetModal, setShowApplyPresetModal] = useState(false);
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [presets, setPresets] = useState([]);
    const [selectedApplyPresetId, setSelectedApplyPresetId] = useState('');
    const [savePresetName, setSavePresetName] = useState('');
    const [watermarks, setWatermarks] = useState([]);
    const [selectedWatermarkId, setSelectedWatermarkId] = useState('');
    const [applyToAllPhotos, setApplyToAllPhotos] = useState(false);
    const [showMoveToModal, setShowMoveToModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
    const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState(false);
    // SET STATES
    const [sets, setSets] = useState([]);
    const [activeSetId, setActiveSetId] = useState(null); // null = Highlights (all photos)
    const [showAddSetModal, setShowAddSetModal] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const [newSetDescription, setNewSetDescription] = useState('');
    const [savingSet, setSavingSet] = useState(false);
    const [editingSet, setEditingSet] = useState(null); // set object for edit modal
    const [editSetName, setEditSetName] = useState('');
    const [editSetDescription, setEditSetDescription] = useState('');
    const [deleteSetId, setDeleteSetId] = useState(null);
    const [highlightsName, setHighlightsName] = useState('Highlights');
    const [highlightsEnabled, setHighlightsEnabled] = useState(true);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastVariant, setToastVariant] = useState('default');
    const toastTimerRef = useRef(null);

    const [draggedSetIndex, setDraggedSetIndex] = useState(null);
    const [dragOverSetIndex, setDragOverSetIndex] = useState(null);
    const [orderedSetIds, setOrderedSetIds] = useState(null);

    const sidebarOrderStorageKey = (id) => (id ? `pixnxt-sidebar-set-order:${id}` : null);

    const readCachedSidebarOrder = (id) => {
        const key = sidebarOrderStorageKey(id);
        if (!key) return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(String) : null;
        } catch {
            return null;
        }
    };

    const designGridStorageKey = (id) => (id ? `pixnxt-design-grid:${id}` : null);

    const readCachedDesignGrid = (id) => {
        const key = designGridStorageKey(id);
        if (!key) return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return {
                style: parsed.style === 'horizontal' ? 'horizontal' : 'vertical',
                size: parsed.size === 'large' || parsed.size === 'small' ? parsed.size : 'regular',
                spacing: parsed.spacing === 'large' ? 'large' : 'regular',
                navigation: parsed.navigation === 'text' ? 'text' : 'icon',
                fontFamily: parsed.fontFamily ? normalizeFontId(parsed.fontFamily) : null,
                colorPalette: parsed.colorPalette ? normalizePaletteId(parsed.colorPalette) : null,
            };
        } catch {
            return null;
        }
    };

    const writeCachedDesignGrid = (id, grid, chrome = {}) => {
        const key = designGridStorageKey(id);
        if (!key || !grid) return;
        try {
            localStorage.setItem(key, JSON.stringify({
                style: grid.style,
                size: grid.size,
                spacing: grid.spacing,
                navigation: grid.navigation,
                fontFamily: normalizeFontId(chrome.fontFamily),
                colorPalette: normalizePaletteId(chrome.colorPalette),
            }));
        } catch {
            /* ignore quota / private mode */
        }
    };

    useEffect(() => {
        if (!collectionId) {
            setMobileAppSets({});
            return;
        }
        try {
            const raw = localStorage.getItem(`pixnxt_mobile_app_sets_${collectionId}`);
            setMobileAppSets(raw ? JSON.parse(raw) : {});
        } catch {
            setMobileAppSets({});
        }
    }, [collectionId]);

    const persistSidebarOrder = async (id, orderIds) => {
        if (!id || !Array.isArray(orderIds)) return;
        const normalized = orderIds.map(String);
        setOrderedSetIds(normalized);
        const key = sidebarOrderStorageKey(id);
        if (key) {
            try {
                localStorage.setItem(key, JSON.stringify(normalized));
            } catch {
                /* ignore quota / private mode */
            }
        }
        try {
            await galleryService.updateCollection(id, { sidebar_set_order: normalized });
            setCollection((prev) => (prev ? { ...prev, sidebar_set_order: normalized } : prev));
        } catch (err) {
            // Column may not exist until migration is applied — localStorage still keeps order on refresh.
            console.warn('Failed to persist sidebar_set_order:', err?.message || err);
        }
    };

    const sortedSidebarSets = React.useMemo(() => {
        const setItems = sets.map((s) => ({
            ...s,
            isHighlights: false,
            isPrivate: s.is_private === true,
            photoCount: photos.filter((p) => p.set_id === s.id).length,
        }));
        const highlightsItem = highlightsEnabled
            ? {
                id: 'highlights',
                name: highlightsName,
                isHighlights: true,
                photoCount: photos.filter((p) => !p.set_id).length,
            }
            : null;

        // No saved custom order: default Highlights first (new collections only).
        if (!orderedSetIds || orderedSetIds.length === 0) {
            return highlightsItem ? [highlightsItem, ...setItems] : setItems;
        }

        const map = new Map();
        setItems.forEach((item) => map.set(item.id, item));
        if (highlightsItem) map.set('highlights', highlightsItem);

        const sorted = [];
        orderedSetIds.forEach((id) => {
            if (map.has(id)) {
                sorted.push(map.get(id));
                map.delete(id);
            }
        });
        // New sets not in saved order append at the end (do not force Highlights first).
        map.forEach((item) => sorted.push(item));
        return sorted;
    }, [highlightsEnabled, highlightsName, sets, photos, orderedSetIds]);

    const handleSetDragStart = (e, index) => {
        setDraggedSetIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSetDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverSetIndex !== index) {
            setDragOverSetIndex(index);
        }
    };

    const handleSetDragEnd = () => {
        setDraggedSetIndex(null);
        setDragOverSetIndex(null);
    };

    const handleSetDrop = async (e, toIndex) => {
        e.preventDefault();
        if (draggedSetIndex === null || draggedSetIndex === toIndex) {
            handleSetDragEnd();
            return;
        }

        const newItems = [...sortedSidebarSets];
        const [moved] = newItems.splice(draggedSetIndex, 1);
        newItems.splice(toIndex, 0, moved);

        const newOrderIds = newItems.map((item) => item.id);
        const dbSets = newItems
            .filter((item) => !item.isHighlights)
            .map((set, idx) => ({ ...set, position: idx }));
        setSets(dbSets);

        handleSetDragEnd();

        try {
            await Promise.all([
                persistSidebarOrder(collectionId, newOrderIds),
                ...dbSets.map((set) =>
                    supabase.from('sets').update({ position: set.position }).eq('id', set.id)
                ),
            ]);
        } catch (err) {
            console.error('Failed to update set positions:', err);
        }
    };

    // SORT STATE
    const [sortOption, setSortOption] = useState('custom');
    const [photoSortField, setPhotoSortField] = useState('capture-time');
    const [photoSortReverse, setPhotoSortReverse] = useState(false);

    // TAB STATES
    const [activeSidebarTab, setActiveSidebarTab] = useState('photos'); // photos, design, settings, activity
    const [activeActivitySubTab, setActiveActivitySubTab] = useState('download'); // download, favorite, store, email, share, private

    useEffect(() => {
        if (activityTabParam === 'activity') {
            setActiveSidebarTab('activity');
            const allowed = new Set(['download', 'favorite', 'store', 'email', 'share', 'private']);
            if (activitySubParam && allowed.has(activitySubParam)) {
                setActiveActivitySubTab(activitySubParam);
            }
        }
    }, [activityTabParam, activitySubParam, collectionId]);
    const [activeDesignTab, setActiveDesignTab] = useState('cover'); // cover, typography, color, grid
    const [selectedCoverStyle, setSelectedCoverStyle] = useState('novel');
    const [selectedFont, setSelectedFont] = useState('sans');
    const [selectedColorPalette, setSelectedColorPalette] = useState('light');
    const [gridSettings, setGridSettings] = useState({
        style: 'vertical',
        size: 'regular',
        spacing: 'regular',
        navigation: 'icon'
    });
    const [previewMode, setPreviewMode] = useState('desktop'); // desktop, mobile
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [coverModalInitialView, setCoverModalInitialView] = useState('edit');
    /** 'all' | 'highlights' | set uuid */
    const [coverModalScope, setCoverModalScope] = useState('all');
    const [coverModalPhotoOverride, setCoverModalPhotoOverride] = useState(null);
    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const coverModalFileInputRef = useRef(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('general'); // general, privacy, download, favorite

    // General Settings State
    const [collectionUrl, setCollectionUrl] = useState('');
    const [categoryTags, setCategoryTags] = useState([]);
    const [categoryTagsSaving, setCategoryTagsSaving] = useState(false);
    const [defaultWatermark, setDefaultWatermark] = useState('No watermark');
    const [autoExpiry, setAutoExpiry] = useState('');
    const [emailRegistration, setEmailRegistration] = useState(false);
    const [galleryAssist, setGalleryAssist] = useState(false);
    const [slideshow, setSlideshow] = useState(true);
    const [socialSharing, setSocialSharing] = useState(true);
    const [language, setLanguage] = useState('English');

    // Sub-tab state
    const [activeDownloadTab, setActiveDownloadTab] = useState('general');

    // Privacy State
    const [collectionPassword, setCollectionPassword] = useState('');
    const [showOnShowcase, setShowOnShowcase] = useState(true);
    const [clientExclusiveAccess, setClientExclusiveAccess] = useState(false);
    const [clientPrivatePassword, setClientPrivatePassword] = useState('');
    const [allowClientsMarkPrivate, setAllowClientsMarkPrivate] = useState(false);
    const [clientOnlyHighlights, setClientOnlyHighlights] = useState(false);

    // Download State
    const [photoDownload, setPhotoDownload] = useState(true);
    const [photoDownloadSizes, setPhotoDownloadSizes] = useState(['high', 'web']);
    const [highResChoice, setHighResChoice] = useState('3600px'); // original, 3600px
    const [webSizeChoice, setWebSizeChoice] = useState('1024px'); // 2048px, 1024px, 640px
    const [downloadPin, setDownloadPin] = useState(true);
    const [pinValue, setPinValue] = useState('1060');
    const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
    const [showGeneralAdditionalOptions, setShowGeneralAdditionalOptions] = useState(false);

    // Additional options states
    const [galleryDownload, setGalleryDownload] = useState(true);
    const [singlePhotoDownload, setSinglePhotoDownload] = useState(true);
    const [requirePinForSinglePhoto, setRequirePinForSinglePhoto] = useState(false);
    const [restrictSinglePhotoSizes, setRestrictSinglePhotoSizes] = useState(false);

    // Advanced settings states
    const [downloadLimit, setDownloadLimit] = useState('');
    const [restrictToEmails, setRestrictToEmails] = useState('');
    const [selectedDownloadSets, setSelectedDownloadSets] = useState([]);
    const [pinUsageLimit, setPinUsageLimit] = useState('');

    // Favorite State
    const [favoritePhotos, setFavoritePhotos] = useState(true);
    const [favoriteNotes, setFavoriteNotes] = useState(true);
    
    // Store/Shop State
    const [storeEnabled, setStoreEnabled] = useState(true);
    
    // Create Favorite List Modal State
    const [showCreateFavoriteListModal, setShowCreateFavoriteListModal] = useState(false);
    const [favoriteListEmail, setFavoriteListEmail] = useState('');
    const [favoriteListName, setFavoriteListName] = useState('');
    const [favoriteListMax, setFavoriteListMax] = useState('');
    const [favoriteListDesc, setFavoriteListDesc] = useState('');
    const [favoriteActivity, setFavoriteActivity] = useState([]);
    const [downloadActivity, setDownloadActivity] = useState([]);
    const [emailRegistrationActivity, setEmailRegistrationActivity] = useState([]);
    const [galleryOpenActivity, setGalleryOpenActivity] = useState([]);
    const [guestDeliveryGuests, setGuestDeliveryGuests] = useState([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    
    // Store Orders State
    const [storeOrders, setStoreOrders] = useState([]);
    const [storeOrderItems, setStoreOrderItems] = useState([]);
    const [storeOrdersLoading, setStoreOrdersLoading] = useState(false);
    const [editingFavoriteList, setEditingFavoriteList] = useState(null);
    const [selectedFavoriteListId, setSelectedFavoriteListId] = useState(null);
    const [favoriteDetailRows, setFavoriteDetailRows] = useState([]);
    const [favoriteDetailLoading, setFavoriteDetailLoading] = useState(false);
    const [favoriteDetailSort, setFavoriteDetailSort] = useState('name-az');
    /** Favorite Activity table: client-side sort (matches Pixieset-style header control). */
    const [favoriteActivitySortMode, setFavoriteActivitySortMode] = useState('created'); // email | created | updated
    const [favoriteActivitySortMenuOpen, setFavoriteActivitySortMenuOpen] = useState(false);

    // Expiry Reminder Modal State
    const [showExpiryReminderModal, setShowExpiryReminderModal] = useState(false);
    const [expiryEmailTiming, setExpiryEmailTiming] = useState('1 day before auto expiry date');
    const [expiryEmailTo, setExpiryEmailTo] = useState('');
    const [expiryEmailSubject, setExpiryEmailSubject] = useState('The gallery {delivery.name} is about to expire');
    const [expiryEmailBody, setExpiryEmailBody] = useState('Hi,\n\nThe gallery {delivery.name} will expire in {days.prior} on {expiry.date}. You will no longer be able to access this gallery after the expiry date.\n\nIf you have any questions, please don\'t hesitate to get in touch!');
    const [expiryEmailIncludePin, setExpiryEmailIncludePin] = useState(false);
    const [expiryEmailSendCopy, setExpiryEmailSendCopy] = useState(true);
    const [expiryEmailLists, setExpiryEmailLists] = useState([]); // ['downloaded', 'favorited', etc.]
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [whatsappBody, setWhatsappBody] = useState('Hi, the gallery {delivery.name} is expiring on {expiry.date}. View it here: {delivery.url}');
    const [toWhatsapp, setToWhatsapp] = useState('');
    const [showDynamicTextInfo, setShowDynamicTextInfo] = useState(false);
    const [backendActivityCounts, setBackendActivityCounts] = useState({
        contacts: 0,
        downloaded: 0,
        registered: 0,
        favorited: 0,
        purchased: 0
    });

    // Multiple Reminders State
    const [expiryReminders, setExpiryReminders] = useState([]);
    const [editingReminderId, setEditingReminderId] = useState(null);





    const parseFavoriteMaxSelection = () => {
        const raw = String(favoriteListMax ?? '').trim();
        if (!raw) return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) return null;
        return Math.floor(n);
    };

    const handleCreateFavoriteList = async () => {
        if (!favoriteListEmail || !favoriteListName) {
            alert("Email and List Name are required.");
            return;
        }
        const maxSel = parseFavoriteMaxSelection();
        const descTrim = favoriteListDesc.trim() || null;
        try {
            if (editingFavoriteList) {
                await galleryService.updateFavoriteList(editingFavoriteList, {
                    name: favoriteListName,
                    max_selection: maxSel,
                    description: descTrim,
                });
                alert("Favorite list updated successfully.");
            } else {
                const session = await galleryService.createOrGetSession(collectionId, favoriteListEmail, {
                    ensureDefaultFavoriteList: false,
                });
                await galleryService.createFavoriteList(collectionId, session.id, favoriteListName, {
                    maxSelection: maxSel,
                    description: descTrim || undefined,
                });
                alert("Favorite list created successfully.");
            }

            setShowCreateFavoriteListModal(false);
            setFavoriteListEmail('');
            setFavoriteListName('');
            setFavoriteListMax('');
            setFavoriteListDesc('');
            setEditingFavoriteList(null);

            fetchFavoriteActivity();
        } catch (e) {
            console.error("Failed to save favorite list. Details:", e);
            alert(`Failed to save list: ${e.message || 'Unknown error'}`);
        }
    };

    // Activity State
    const [activeDownloadActivityTab, setActiveDownloadActivityTab] = useState('gallery'); // gallery, photo, video
    const [activeActivityMenu, setActiveActivityMenu] = useState(null); // id of activity item
    const [selectedDownloadId, setSelectedDownloadId] = useState(null);
    const [downloadDetailLoading, setDownloadDetailLoading] = useState(false);
    const [downloadDetailToolbarMenuOpen, setDownloadDetailToolbarMenuOpen] = useState(false);
    const [favoriteDetailToolbarMenuOpen, setFavoriteDetailToolbarMenuOpen] = useState(false);
    const [favoriteDetailPhotoMenuPhotoId, setFavoriteDetailPhotoMenuPhotoId] = useState(null);

    const sortedFavoriteActivity = useMemo(() => {
        const arr = [...favoriteActivity];
        if (favoriteActivitySortMode === 'email') {
            return arr.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        }
        if (favoriteActivitySortMode === 'created') {
            return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return arr.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }, [favoriteActivity, favoriteActivitySortMode]);

    const favoriteActivitySortTriggerLabel =
        favoriteActivitySortMode === 'email'
            ? 'Sort by email'
            : favoriteActivitySortMode === 'created'
              ? 'Sort by created date'
              : 'Sort by updated date';

    const activityCounts = useMemo(() => {
        const downloadedEmails = new Set(downloadActivity.map(a => a.email));
        const favoritedEmails = new Set(favoriteActivity.map(a => a.email));
        return {
            contacts: backendActivityCounts.contacts,
            registered: backendActivityCounts.registered,
            purchased: backendActivityCounts.purchased,
            downloaded: downloadedEmails.size || backendActivityCounts.downloaded,
            favorited: favoritedEmails.size || backendActivityCounts.favorited
        };
    }, [downloadActivity, favoriteActivity, backendActivityCounts]);

    const downloadDetailPhotos = useMemo(() => {
        if (!selectedDownloadId) return [];
        const item = downloadActivity.find((a) => a.id === selectedDownloadId);
        return resolvePhotosForDownloadActivity(item, photos, sets);
    }, [selectedDownloadId, downloadActivity, photos, sets]);

    const filteredDownloadActivityForTab = useMemo(
        () =>
            downloadActivity.filter((a) => {
                if (activeDownloadActivityTab === 'photo') {
                    return a.type === 'photo' || a.type === 'single';
                }
                return a.type === activeDownloadActivityTab;
            }),
        [downloadActivity, activeDownloadActivityTab]
    );

    const downloadExportFilenameBase = `delivery-${collectionId}-download-activity-${activeDownloadActivityTab}`;

    const resolveDownloadActivityExportItems = useCallback(
        (explicitItems) => {
            if (explicitItems?.length) return explicitItems;
            return filteredDownloadActivityForTab;
        },
        [filteredDownloadActivityForTab]
    );

    const handleExportDownloadActivityExcel = useCallback(
        (explicitItems) => {
            const items = resolveDownloadActivityExportItems(explicitItems);
            if (!items.length) {
                alert('No download records to export.');
                return;
            }
            exportDownloadActivityExcel(items, photos, sets, downloadExportFilenameBase);
        },
        [resolveDownloadActivityExportItems, photos, sets, downloadExportFilenameBase]
    );

    const handleExportDownloadActivityPdf = useCallback(
        (explicitItems) => {
            const items = resolveDownloadActivityExportItems(explicitItems);
            if (!items.length) {
                alert('No download records to export.');
                return;
            }
            exportDownloadActivityPdf(items, photos, sets, downloadExportFilenameBase);
        },
        [resolveDownloadActivityExportItems, photos, sets, downloadExportFilenameBase]
    );

    const handleDeleteAllDownloadActivity = useCallback(async () => {
        const items = filteredDownloadActivityForTab;
        if (!items.length) {
            alert('No download records to delete.');
            return;
        }
        if (!window.confirm(`Delete all ${items.length} download record(s) on this tab? This cannot be undone.`)) return;

        try {
            await Promise.all(
                items
                    .filter((a) => !String(a.id).startsWith('store-'))
                    .map((a) => galleryService.deleteActivity(a.id))
            );
            const deletedIds = new Set(items.map((a) => a.id));
            setDownloadActivity((prev) => prev.filter((a) => !deletedIds.has(a.id)));
            if (selectedDownloadId && deletedIds.has(selectedDownloadId)) {
                setSelectedDownloadId(null);
            }
            setActiveActivityMenu(null);
        } catch (err) {
            console.error('Failed to delete download activity:', err);
            alert(err?.message || 'Failed to delete some records.');
        }
    }, [filteredDownloadActivityForTab, selectedDownloadId]);

    const handleExportFavoriteList = async (listId, listName) => {
        try {
            let itemRows =
                selectedFavoriteListId === listId && favoriteDetailRows.length > 0
                    ? favoriteDetailRows
                    : await galleryService.getFavoriteListItemRows(listId);

            if (!itemRows.length) {
                alert('This list has no photos.');
                return;
            }

            const filenameBase = `favorites-${(listName || 'list').replace(/\s+/g, '-').toLowerCase()}`;
            const ok = exportFavoriteListExcel(itemRows, sets, highlightsName, filenameBase);
            if (!ok) {
                alert('This list has no photos.');
            }
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export favorite list.');
        }
    };

    const handleLightroomCopyList = async (listId) => {
        try {
            const photos = await galleryService.getFavoriteListPhotos(listId);
            if (!photos.length) {
                alert("This list has no photos.");
                return;
            }

            const filenames = photos.map(p => p.filename).join(', ');
            await navigator.clipboard.writeText(filenames);
            alert('Filenames copied to clipboard for Lightroom!');
        } catch (err) {
            console.error('Copy failed:', err);
            alert('Failed to copy filenames.');
        }
    };

    const handleDeleteFavoriteActivity = async (id) => {
        if (!window.confirm('Are you sure you want to delete this favorite list and all its info?')) return;
        try {
            await galleryService.deleteFavoriteList(id);
            setFavoriteActivity(prev => prev.filter(a => a.id !== id));
            setActiveActivityMenu(null);
            setFavoriteDetailToolbarMenuOpen(false);
            setFavoriteDetailPhotoMenuPhotoId(null);
            if (selectedFavoriteListId === id) {
                setSelectedFavoriteListId(null);
                setFavoriteDetailRows([]);
            }
        } catch (err) {
            console.error('Failed to delete favorite list:', err);
            alert(err?.message || err?.error_description || 'Failed to delete favorite list.');
        }
    };

    const handleDownloadAllFavoriteList = async (listId) => {
        try {
            const photos = await galleryService.getFavoriteListPhotos(listId);
            if (!photos.length) {
                alert('This list has no photos.');
                return;
            }
            for (let i = 0; i < photos.length; i++) {
                const p = photos[i];
                if (p.full_url) {
                    await downloadPhotoFromR2(p.full_url, p.filename || 'photo.jpg');
                    if (i < photos.length - 1) {
                        await new Promise((r) => setTimeout(r, 350));
                    }
                }
            }
            setFavoriteDetailToolbarMenuOpen(false);
        } catch (err) {
            console.error('Download all failed:', err);
            alert('Failed to download some photos.');
        }
    };

    /** Single photo from favorite detail — owner dashboard; no visitor PIN prompt. */
    const handleFavoriteDetailRowDownload = async (photo) => {
        if (!photo?.full_url) {
            alert('Download is not available for this file yet.');
            return;
        }
        try {
            await downloadPhotoFromR2(photo.full_url, photo.filename || 'photo.jpg');
            setFavoriteDetailPhotoMenuPhotoId(null);
        } catch (err) {
            console.error('Favorite row download failed:', err);
            alert('Failed to download this photo.');
        }
    };

    const handleRemovePhotoFromFavoriteList = async (listId, photoId) => {
        if (!listId || !photoId) return;
        if (!window.confirm('Remove this photo from the favorite list?')) return;
        try {
            await galleryService.removePhotoFromFavoriteList(listId, photoId);
            setFavoriteDetailPhotoMenuPhotoId(null);
            setFavoriteDetailRows((prev) => prev.filter((r) => r.photo?.id !== photoId));
            setFavoriteActivity((prev) =>
                prev.map((a) =>
                    a.id === listId
                        ? { ...a, photoCount: Math.max(0, (a.photoCount || 0) - 1), updated_at: new Date().toISOString() }
                        : a
                )
            );
            fetchFavoriteActivity();
        } catch (err) {
            console.error('Remove favorite item failed:', err);
            alert(err?.message || 'Could not remove this photo from the list.');
        }
    };

    const handleReviewFavoriteList = (list) => {
        if (!list?.id) return;
        setActiveSidebarTab('activity');
        setActiveActivitySubTab('favorite');
        setSelectedFavoriteListId(list.id);
    };

    const openEditFavoriteListModal = (item) => {
        if (!item) return;
        /* Close Favorite List Details popup so Edit is not hidden behind it (detail overlay z-index 10050). */
        setSelectedFavoriteListId(null);
        setFavoriteDetailRows([]);
        setFavoriteDetailPhotoMenuPhotoId(null);
        setFavoriteDetailToolbarMenuOpen(false);
        setFavoriteListEmail(item.email);
        setFavoriteListName(item.name);
        setFavoriteListMax(item.max_selection != null && item.max_selection !== '' ? String(item.max_selection) : '');
        setFavoriteListDesc(item.description || '');
        setEditingFavoriteList(item.id);
        setShowCreateFavoriteListModal(true);
        setActiveActivityMenu(null);
    };

    const handleExportActivity = (explicitItems) => {
        const items = resolveDownloadActivityExportItems(explicitItems);
        if (!items.length) return;
        exportDownloadActivityCsv(items, photos, sets, downloadExportFilenameBase);
    };

    const handleDeleteActivity = async (id) => {
        try {
            // Store-derived rows are synthetic (id like "store-…") — remove locally only
            if (String(id).startsWith('store-')) {
                setDownloadActivity((prev) => prev.filter((a) => a.id !== id));
                setActiveActivityMenu(null);
                if (selectedDownloadId === id) setSelectedDownloadId(null);
                return;
            }
            await galleryService.deleteActivity(id);
            setDownloadActivity(prev => prev.filter(a => a.id !== id));
            setFavoriteActivity(prev => prev.filter(a => a.id !== id));
            setActiveActivityMenu(null);
        } catch (err) {
            console.error('Failed to delete activity:', err);
            alert(err?.message || err?.error_description || 'Failed to delete activity log.');
        }
    };
    const fileInputRef = useRef(null);
    const modalFileInputRef = useRef(null);
    const photoMenuRef = useRef(null);
    const gridSettingsRef = useRef(null);
    const moreRef = useRef(null);
    const statusRef = useRef(null);
    const sortRef = useRef(null);
    const shareRef = useRef(null);
    const selectionMoreRef = useRef(null);
    const selectionMorePortalRef = useRef(null);
    const selectAllMenuRef = useRef(null);
    const moveToSetRef = useRef(null);
    const moveMenuPortalRef = useRef(null);
    const favoriteActivityMenuRef = useRef(null);

    const updateMoveMenuPosition = useCallback(() => {
        const anchor = moveToSetRef.current?.querySelector('.cd-sel-action-btn');
        if (!anchor) return null;
        const rect = anchor.getBoundingClientRect();
        const menuWidth = 220;
        const left = Math.min(
            Math.max(8, rect.right - menuWidth),
            window.innerWidth - menuWidth - 8
        );
        return {
            position: 'fixed',
            left,
            bottom: window.innerHeight - rect.top + 12,
            minWidth: menuWidth,
            zIndex: 1500,
        };
    }, []);

    const SELECTION_TOOLBAR_RESERVE = 96;

    const computePhotoMenuPosition = useCallback((anchorEl, alignLeft, bottomReserve = 0, menuHeight = null) => {
        if (!anchorEl) return null;
        const rect = anchorEl.getBoundingClientRect();
        const menuWidth = 240;
        const gutter = 8;
        const estimatedHeight = menuHeight ?? 440;
        const availBelow = window.innerHeight - rect.bottom - gutter - bottomReserve - 6;
        const availAbove = rect.top - gutter - 6;
        const openDown = availBelow >= availAbove;
        const available = Math.max(160, openDown ? availBelow : availAbove);
        const left = alignLeft
            ? Math.min(Math.max(gutter, rect.left), window.innerWidth - menuWidth - gutter)
            : Math.min(Math.max(gutter, rect.right - menuWidth), window.innerWidth - menuWidth - gutter);

        let top;
        if (openDown) {
            top = rect.bottom + 6;
        } else if (menuHeight != null && menuHeight > available) {
            top = gutter;
        } else {
            const height = Math.min(estimatedHeight, available);
            top = Math.max(gutter, rect.top - 6 - height);
        }

        return {
            position: 'fixed',
            top,
            bottom: 'auto',
            left,
            minWidth: menuWidth,
            maxHeight: available,
            zIndex: 6000,
        };
    }, []);

    const updateSelectionMoreMenuPosition = useCallback(() => {
        const anchor = selectionMoreRef.current?.querySelector('.cd-sel-action-btn');
        if (!anchor) return null;
        const rect = anchor.getBoundingClientRect();
        const menuWidth = 280;
        const left = Math.min(
            Math.max(8, rect.right - menuWidth),
            window.innerWidth - menuWidth - 8
        );
        return {
            position: 'fixed',
            left,
            bottom: window.innerHeight - rect.top + 12,
            minWidth: menuWidth,
            zIndex: 6000,
        };
    }, []);

    const closePhotoMenu = useCallback(() => {
        setPhotoMenu(null);
        setPhotoMenuPosition(null);
    }, []);

    const openPhotoMenuFor = useCallback((photoId, anchorEl, alignLeft, bottomReserve = 0) => {
        if (photoMenu === photoId) {
            closePhotoMenu();
            return;
        }
        setPhotoMenuAlignLeft(Boolean(alignLeft));
        setPhotoMenuPosition(computePhotoMenuPosition(anchorEl, alignLeft, bottomReserve));
        setPhotoMenu(photoId);
    }, [closePhotoMenu, computePhotoMenuPosition, photoMenu]);

    useLayoutEffect(() => {
        if (!showMoveToSetMenu) {
            setMoveMenuPosition(null);
            return undefined;
        }
        const apply = () => setMoveMenuPosition(updateMoveMenuPosition());
        apply();
        window.addEventListener('resize', apply);
        window.addEventListener('scroll', apply, true);
        return () => {
            window.removeEventListener('resize', apply);
            window.removeEventListener('scroll', apply, true);
        };
    }, [showMoveToSetMenu, sets.length, highlightsName, updateMoveMenuPosition]);

    useLayoutEffect(() => {
        if (!showSelectionMore) {
            setSelectionMoreMenuPosition(null);
            return undefined;
        }
        const apply = () => setSelectionMoreMenuPosition(updateSelectionMoreMenuPosition());
        apply();
        window.addEventListener('resize', apply);
        window.addEventListener('scroll', apply, true);
        return () => {
            window.removeEventListener('resize', apply);
            window.removeEventListener('scroll', apply, true);
        };
    }, [showSelectionMore, updateSelectionMoreMenuPosition]);

    useLayoutEffect(() => {
        if (!photoMenu) {
            setPhotoMenuPosition(null);
            return undefined;
        }
        const bottomReserve = selectedPhotos.length > 0 ? SELECTION_TOOLBAR_RESERVE : 0;
        const apply = () => {
            const anchor = document.querySelector(
                `.cd-photo-card--menu-open .cd-photo-more-btn`
            );
            if (!anchor) return;
            const menuHeight = photoMenuRef.current?.scrollHeight ?? null;
            setPhotoMenuPosition(
                computePhotoMenuPosition(anchor, photoMenuAlignLeft, bottomReserve, menuHeight)
            );
        };
        apply();
        window.addEventListener('resize', apply);
        window.addEventListener('scroll', apply, true);
        return () => {
            window.removeEventListener('resize', apply);
            window.removeEventListener('scroll', apply, true);
        };
    }, [photoMenu, photoMenuAlignLeft, computePhotoMenuPosition, selectedPhotos.length]);
    const favoriteDetailToolbarMenuRef = useRef(null);
    const favoriteDetailPhotoMenuRef = useRef(null);
    const designHydratedRef = useRef(false);
    const settingsHydratedRef = useRef(false);
    const slideshowColumnReadyRef = useRef(false);
    const designPersistRef = useRef({
        collectionId: null,
        selectedCoverStyle: 'novel',
        selectedFont: 'sans',
        selectedColorPalette: 'light',
        gridSettings: {
            style: 'vertical',
            size: 'regular',
            spacing: 'regular',
            navigation: 'icon',
        },
    });
    const favoriteActivitySortMenuRef = useRef(null);


    const togglePhotoSelection = (photoId) => {
        setSelectedPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const clearSelection = () => {
        setSelectedPhotos([]);
        setShowSelectAllMenu(false);
        setShowSelectionMore(false);
        setShowMoveToSetMenu(false);
    };

    const handleToggleStar = async (photoId, currentStarred) => {
        try {
            const updatedPhoto = await galleryService.togglePhotoStar(photoId, !currentStarred);
            setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_starred: updatedPhoto.is_starred } : p));
        } catch (err) {
            console.error('Star toggle failed:', err);
            alert('Could not update starred. Please try again.');
        }
    };

    const handleTogglePhotoHidden = async (photo) => {
        if (!photo?.id) return;
        const nextHidden = !photo.is_private;
        try {
            const updated = await galleryService.updatePhoto(photo.id, { is_private: nextHidden });
            setPhotos((prev) =>
                prev.map((p) => (p.id === photo.id ? { ...p, is_private: updated.is_private } : p))
            );
        } catch (err) {
            console.error('Hide from client failed:', err);
            alert('Could not update visibility. Please try again.');
        }
    };

    const handleWhoIsInThis = (photo) => {
        const matches = peopleInPhoto(photo?.id, photoAiPeople, photoAiMetadataMap);
        closePhotoMenu();
        if (!matches.length) {
            alert('No people found in this photograph yet.');
            return;
        }
        setActivePersonId(matches[0].id);
        setActiveSidebarTab('photos');
    };

    const deleteSelectedPhotos = async (ids = selectedPhotos) => {
        if (ids.length === 0 || !collectionId) return;
        setPhotosToDelete(ids);
        setShowDeleteConfirm(true);
    };

    const confirmDeletePhotos = async () => {
        const ids = photosToDelete;
        try {
            setSaving(true);
            await galleryService.deletePhotos(ids);

            setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
            if (collection?.cover_photo_id && ids.includes(collection.cover_photo_id)) {
                setCollection((prev) => (prev ? { ...prev, cover_photo_id: null, cover_url: null } : prev));
            }
            setSelectedPhotos([]);
            setShowDeleteConfirm(false);
            setPhotosToDelete([]);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete photos. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const selectAll = () => {
        // Select all photos currently visible in the sorted/filtered view
        const visibleIds = sortedPhotos.map(p => p.id);
        setSelectedPhotos(visibleIds);
        setShowSelectAllMenu(false);
    };

    const fetchFavoriteActivity = async () => {
        if (!collectionId) return;
        try {
            setLoadingActivity(true);
            const activity = await galleryService.getFavoriteActivity(collectionId);
            setFavoriteActivity(activity);
            const overlays = await galleryService.getCollectionFavoriteOverlayPhotoIds(collectionId);
            setClientFavoritedPhotoIds(new Set(overlays.favoritedPhotoIds));
            setSelectionListPhotoIds(new Set(overlays.selectionListPhotoIds));
        } catch (err) {
            console.error('Failed to fetch favorite activity:', err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const fetchDownloadActivity = async () => {
        if (!collectionId) return;
        try {
            setLoadingActivity(true);
            const activity = await galleryService.getDownloadActivity(collectionId);
            setDownloadActivity(activity);
        } catch (err) {
            console.error('Failed to fetch download activity:', err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const fetchEmailRegistrationActivity = async () => {
        if (!collectionId) return;
        try {
            const activity = await galleryService.getEmailRegistrationActivity(collectionId);
            setEmailRegistrationActivity(activity);
        } catch (err) {
            console.error('Failed to fetch email registration activity:', err);
        }
    };

    const fetchGalleryOpenActivity = async () => {
        if (!collectionId) return;
        try {
            const activity = await galleryService.getGalleryOpenActivity(collectionId);
            setGalleryOpenActivity(activity);
        } catch (err) {
            console.error('Failed to fetch gallery open activity:', err);
            setGalleryOpenActivity([]);
        }
    };

    const fetchStoreOrders = async () => {
        if (!collectionId) return;
        try {
            setStoreOrdersLoading(true);
            const { data: colPhotos, error: photosErr } = await supabase
                .from('photos')
                .select('id')
                .eq('collection_id', collectionId);
            
            if (photosErr) throw photosErr;
            
            if (!colPhotos || colPhotos.length === 0) {
                setStoreOrders([]);
                setStoreOrderItems([]);
                return;
            }
            
            const colPhotoIds = new Set(colPhotos.map(p => p.id));
            
            const { data: ordersData, error: ordersErr } = await supabase
                .from('printstore_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersErr) throw ordersErr;

            const { data: itemsData, error: itemsErr } = await supabase
                .from('printstore_order_items')
                .select('*');

            if (itemsErr) throw itemsErr;

            if (!ordersData || !itemsData) {
                setStoreOrders([]);
                setStoreOrderItems([]);
                return;
            }

            const filteredItems = itemsData.filter(item => {
                const opt = item.options || {};
                const photoId = opt.photo?.id || (opt.photos && opt.photos[0]?.id);
                return photoId && colPhotoIds.has(photoId);
            });

            const filteredOrderIds = new Set(filteredItems.map(item => item.order_id));
            const filteredOrders = ordersData.filter(order => filteredOrderIds.has(order.id));

            setStoreOrders(filteredOrders);
            setStoreOrderItems(itemsData);
        } catch (err) {
            console.error('Failed to fetch store orders for collection:', err);
        } finally {
            setStoreOrdersLoading(false);
        }
    };

    const fetchReminders = async () => {
        if (!collectionId) return;
        try {
            const data = await galleryService.getCollectionReminders(collectionId);
            setExpiryReminders(data);
        } catch (err) {
            console.error('Failed to fetch reminders:', err);
        }
    };

    useEffect(() => {
        if (collectionId) {
            fetchFavoriteActivity();
            fetchDownloadActivity();
            fetchEmailRegistrationActivity();
            fetchGalleryOpenActivity();
            fetchStoreOrders();
            fetchReminders();
        }
    }, [collectionId]);

    useEffect(() => {
        if (!gdEvent?.id) {
            setGuestDeliveryGuests([]);
            return undefined;
        }
        let cancelled = false;
        const photographerId = gdEvent.photographer_id || collection?.photographer_id || user?.id;
        guestDeliveryGuestsService
            .getGuests(photographerId, gdEvent.id)
            .then((rows) => {
                if (!cancelled) setGuestDeliveryGuests(rows || []);
            })
            .catch(() => {
                if (!cancelled) setGuestDeliveryGuests([]);
            });
        return () => {
            cancelled = true;
        };
    }, [gdEvent?.id, gdEvent?.photographer_id, collection?.photographer_id, user?.id]);

    const applyUploadView = useCallback((detail) => {
        if (detail.collectionId && detail.collectionId !== collectionId) return;
        setActiveSidebarTab('photos');
        if ('activeSetId' in detail) {
            setActiveSetId(detail.activeSetId ?? null);
        }
        setSortOption('upload-new-old');
        pendingUploadScrollRef.current = true;
    }, [collectionId]);

    useEffect(() => {
        const uploadView = location.state?.uploadView;
        if (!uploadView || uploadView.collectionId !== collectionId) return;
        applyUploadView(uploadView);
        navigate(`${location.pathname}${location.search}`, {
            replace: true,
            state: location.state?.from ? { from: location.state.from } : null,
        });
    }, [location.state, location.pathname, location.search, collectionId, applyUploadView, navigate]);

    useEffect(() => {
        const onUploadView = (event) => {
            applyUploadView(event.detail || {});
        };
        window.addEventListener(UPLOAD_VIEW_COLLECTION_EVENT, onUploadView);
        return () => window.removeEventListener(UPLOAD_VIEW_COLLECTION_EVENT, onUploadView);
    }, [applyUploadView]);

    useEffect(() => {
        if (activeActivitySubTab === 'share' || activeActivitySubTab === 'private') {
            setActiveActivitySubTab('favorite');
        }
    }, [activeActivitySubTab]);

    useEffect(() => {
        if (!selectedFavoriteListId) {
            setFavoriteDetailRows([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setFavoriteDetailLoading(true);
            try {
                const rows = await galleryService.getFavoriteListItemRows(selectedFavoriteListId);
                if (!cancelled) setFavoriteDetailRows(rows);
            } catch (e) {
                console.error(e);
                if (!cancelled) setFavoriteDetailRows([]);
            } finally {
                if (!cancelled) setFavoriteDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedFavoriteListId]);

    useEffect(() => {
        setFavoriteDetailToolbarMenuOpen(false);
        setFavoriteDetailPhotoMenuPhotoId(null);
    }, [selectedFavoriteListId]);

    useEffect(() => {
        if (!selectedFavoriteListId) return;
        if (!favoriteActivity.some((a) => a.id === selectedFavoriteListId)) {
            setSelectedFavoriteListId(null);
            setFavoriteDetailRows([]);
        }
    }, [favoriteActivity, selectedFavoriteListId]);

    const collectionFocals = useMemo(
        () => getCollectionFocals(collection),
        [collection?.cover_focals, collection?.cover_focal_x, collection?.cover_focal_y, collection?.cover_url]
    );
    const collectionFocal = collectionFocals.website || getCollectionFocal(collection);

    const coverPhoto = useMemo(() => {
        if (!photos?.length) return null;
        const cover = stripMediaUrlHash(collection?.cover_url || '');
        const urlMatch = (p) => {
            if (!cover) return false;
            const urls = [p.full_url, p.web_url, p.thumbnail_url, getPhotoFullDisplayUrl(p)]
                .filter(Boolean)
                .map((u) => stripMediaUrlHash(String(u)));
            return urls.some((u) => u && (u === cover || cover.endsWith(u) || u.endsWith(cover)));
        };
        if (cover) {
            return photos.find(urlMatch) || null;
        }
        if (collection?.cover_photo_id) {
            return photos.find((p) => String(p.id) === String(collection.cover_photo_id)) || null;
        }
        return null;
    }, [photos, collection?.cover_photo_id, collection?.cover_url]);

    const handleCoverPhotoSelect = async (photo) => {
        const coverUrl = getPhotoFullDisplayUrl(photo) || getPhotoOriginalFileUrl(photo);
        if (!coverUrl || !collectionId) return;
        try {
            setIsCoverUploading(true);
            const defaultFocals = getDefaultCoverFocals();
            await galleryService.updateCollection(collectionId, {
                cover_photo_id: photo.id,
                cover_url: coverUrl,
                cover_focal_x: 50,
                cover_focal_y: 50,
                cover_focals: defaultFocals,
            });
            setCollection((prev) => ({
                ...prev,
                cover_url: coverUrl,
                cover_photo_id: photo.id,
                cover_focals: defaultFocals,
                cover_focal_x: 50,
                cover_focal_y: 50,
            }));
        } catch (err) {
            console.error('Failed to set cover:', err);
            alert('Failed to set cover photo.');
        } finally {
            setIsCoverUploading(false);
        }
    };

    const handleCoverModalConfirm = async ({ photo, focals }) => {
        const coverUrl = photo
            ? (getPhotoFullDisplayUrl(photo) || getPhotoOriginalFileUrl(photo))
            : (collection?.cover_url || '');
        if (!coverUrl || !collectionId) return;
        try {
            setIsCoverUploading(true);
            const extra = photo ? { cover_photo_id: photo.id } : {};
            const updated = await galleryService.saveCollectionCoverFocals(
                collectionId,
                coverUrl,
                focals,
                extra
            );
            const primary = focals?.desktop || focals?.website || { x: 50, y: 50 };
            const savedFocals = updated?.cover_focals;
            const hasSavedFocals =
                savedFocals && typeof savedFocals === 'object' && Object.keys(savedFocals).length > 0;
            const savedClean = stripMediaUrlHash(updated?.cover_url || coverUrl);
            const nextCoverUrl = hasSavedFocals
                ? savedClean
                : appendCoverFocalsToCoverUrl(savedClean, focals);
            setCollection((prev) => ({
                ...prev,
                ...updated,
                cover_url: nextCoverUrl,
                cover_photo_id: photo?.id ?? prev?.cover_photo_id,
                cover_focals: hasSavedFocals ? savedFocals : focals,
                cover_focal_x: updated?.cover_focal_x ?? primary.x,
                cover_focal_y: updated?.cover_focal_y ?? primary.y,
            }));
            setShowCoverModal(false);
            setCoverModalScope('all');
        } catch (err) {
            console.error('Failed to save delivery cover:', err);
            const detail = err?.message ? `\n\n${err.message}` : '';
            alert(`Failed to save delivery cover.${detail}`);
        } finally {
            setIsCoverUploading(false);
        }
    };

    const handleSetAsCover = (photo) => {
        void handleCoverPhotoSelect(photo);
    };

    const handleUseAsDeliveryCover = (photo) => {
        if (!photo) return;
        closePhotoMenu();
        setCoverModalPhotoOverride(photo);
        setCoverModalScope('all');
        setCoverModalInitialView('edit');
        setShowCoverModal(true);
    };

    const handleCoverPhotoDropById = (photoId) => {
        const photo = photos.find((p) => String(p.id) === String(photoId));
        if (!photo) return;
        if (!isGalleryImagePhoto(photo)) return;
        void handleCoverPhotoSelect(photo);
    };

    const handleCoverFileSelect = async (file) => {
        if (!file || !collectionId || !collection?.photographer_id) return;
        const mime = getFileMime(file);
        if (!isImageMime(mime) && !isRawImageFile(file)) {
            alert('Please choose an image file for the cover.');
            return;
        }

        const uploadSetId = highlightsEnabled ? activeSetId : (activeSetId ?? sets[0]?.id ?? null);

        try {
            setIsCoverUploading(true);
            const photoData = await galleryService.uploadPhoto(
                collectionId,
                collection.photographer_id,
                file,
                photos.length,
                uploadSetId
            );
            setPhotos((prev) => [...prev, photoData]);
            if (isRawMedia(photoData) && !hasRawDisplayPreview(photoData)) {
                void galleryService
                    .repairRawPhotoPreview(photoData)
                    .then((updated) => {
                        if (updated?.id) {
                            setPhotos((prev) =>
                                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                            );
                        }
                    })
                    .catch((err) =>
                        console.warn('RAW preview backfill failed:', photoData.filename, err)
                    );
            }

            const coverUrl = getPhotoFullDisplayUrl(photoData) || getPhotoOriginalFileUrl(photoData);
            if (!coverUrl) {
                alert('Cover image is still processing. Try again in a moment.');
                return;
            }
            await galleryService.updateCollection(collectionId, {
                cover_photo_id: photoData.id,
                cover_url: coverUrl,
                cover_focal_x: 50,
                cover_focal_y: 50,
                cover_focals: getDefaultCoverFocals(),
            });
            setCollection((prev) => ({
                ...prev,
                cover_url: coverUrl,
                cover_photo_id: photoData.id,
                cover_focals: getDefaultCoverFocals(),
                cover_focal_x: 50,
                cover_focal_y: 50,
            }));
        } catch (err) {
            console.error('Cover file upload failed:', err);
            alert(err?.message || 'Failed to upload cover photo.');
        } finally {
            setIsCoverUploading(false);
        }
    };

    const handleDownloadPhoto = async (photo) => {
        const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
        if (collection?.download_pin && pinRequiredForSingle) {
            const enteredPin = prompt("Please enter the download PIN to download this photo:");
            if (enteredPin !== collection.download_pin) {
                alert("Incorrect PIN.");
                return;
            }
        }
        const downloadUrl = getPhotoOriginalFileUrl(photo) || photo.full_url;
        await downloadPhotoFromR2(downloadUrl, photo.filename || 'photo.jpg');
    };

    const handleRenamePhoto = async () => {
        if (!editingPhoto || !newPhotoName.trim()) return;
        try {
            setSaving(true);
            const updated = await galleryService.updatePhoto(editingPhoto.id, {
                filename: newPhotoName.trim()
            });
            setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, filename: updated.filename } : p));
            setShowRenameModal(false);
            setEditingPhoto(null);
        } catch (err) {
            console.error('Error renaming photo:', err);
            alert('Failed to rename photo.');
        } finally {
            setSaving(false);
        }
    };

    const handleMovePhoto = async () => {
        if (!editingPhoto) return;
        try {
            setSaving(true);
            if (moveMode === 'move') {
                await galleryService.assignPhotosToSet([editingPhoto.id], targetSetId);
                setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, set_id: targetSetId } : p));
            } else {
                // Simplified copy logic
                const newPhoto = { ...editingPhoto, id: Math.random().toString(36).substr(2, 9), set_id: targetSetId };
                setPhotos(prev => [...prev, newPhoto]);
            }
            setShowMoveModal(false);
            setEditingPhoto(null);
        } catch (err) {
            console.error('Error moving/copying photo:', err);
            alert('Failed to move photo.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyFilename = (photo) => {
        navigator.clipboard.writeText(photo.filename);
        alert('Filename copied to clipboard!');
    };

    const handleQuickShare = (photo) => {
        setEditingPhoto(photo);
        setQuickShareShowQr(false);
        setShowQuickShareModal(true);
    };

    const handleReplacePhoto = async (e) => {
        const file = e.target.files[0];
        if (!file || !editingPhoto) return;

        const photographerId = collection?.photographer_id ?? user?.id;
        if (!collectionId || !photographerId) {
            alert('Delivery is still loading. Please try again.');
            return;
        }

        try {
            setSaving(true);
            const updated = await galleryService.replacePhoto(
                editingPhoto.id,
                photographerId,
                collectionId,
                file
            );

            clearMediaUrlCache();
            setPhotos((prev) => prev.map((p) => (p.id === editingPhoto.id ? updated : p)));
            setShowReplaceModal(false);
            setEditingPhoto(null);
            alert('Photo replaced successfully!');
        } catch (err) {
            console.error('Error replacing photo:', err);
            alert(err instanceof Error ? err.message : 'Failed to replace photo.');
        } finally {
            setSaving(false);
            e.target.value = '';
        }
    };

    const handlePublishGuestDelivery = async () => {
        if (!gdEvent) return;
        if (!window.confirm('This will run face matching on all delivery photos and match them to registered guests, then send delivery emails. Continue?')) return;
        try {
            setGdPublishing(true);
            const result = await guestDeliveryPublishService.publishEvent(gdEvent.id);
            setGdEvent((prev) => prev ? { ...prev, ...result.event, status: 'published' } : prev);

            const matchedGuests = (result.guests || []).filter((g) => g.ok && g.matched);
            const emailErrors = [];

            if (matchedGuests.length) {
                for (const entry of matchedGuests) {
                    try {
                        await guestDeliveryPublishService.sendDeliveryEmail({
                            eventId: gdEvent.id,
                            guestId: entry.guestId,
                        });
                    } catch (err) {
                        console.error(err);
                        emailErrors.push(err?.message || 'Email failed');
                    }
                }
            }

            const { summary } = result;
            let message = `Guest Delivery published!\n\n` +
                `Photos indexed: ${summary.photosIndexed}\n` +
                `Guests matched: ${summary.guestsMatched}\n` +
                `No matches: ${summary.guestsNoMatch}\n` +
                `Failed: ${summary.guestsFailed}`;

            if (matchedGuests.length) {
                message += emailErrors.length
                    ? `\n\nEmails sent with ${emailErrors.length} error(s).`
                    : '\n\nDelivery emails sent successfully.';
            } else {
                message += '\n\nNo delivery emails sent (no matches).';
            }

            if (emailErrors.length) {
                message += `\n\nEmail error: ${emailErrors[0]}`;
            }

            alert(message);
        } catch (err) {
            alert(`Publish failed: ${err.message}`);
        } finally {
            setGdPublishing(false);
        }
    };

    const handleSaveExpiryEmail = async () => {
        if (!collectionId) {
            alert('This delivery is still loading. Try Save again in a moment.');
            return;
        }
        try {
            setSaving(true);
            const reminderData = {
                collection_id: collectionId,
                timing: expiryEmailTiming || '7 days before auto expiry date',
                to_email: expiryEmailTo || '',
                subject: expiryEmailSubject || 'The gallery {delivery.name} is about to expire',
                body: expiryEmailBody || 'Hi,\n\nThe gallery {delivery.name} will expire in {days.prior} on {expiry.date}.',
                include_pin: !!expiryEmailIncludePin,
                send_copy: expiryEmailSendCopy !== false,
                activity_lists: Array.isArray(expiryEmailLists) ? expiryEmailLists : [],
                whatsapp_enabled: !!whatsappEnabled,
                whatsapp_body: whatsappBody || '',
                to_whatsapp: toWhatsapp || '',
            };

            if (editingReminderId) {
                await galleryService.updateCollectionReminder(editingReminderId, reminderData);
                setToastMessage('Expiry reminder email updated!');
            } else {
                await galleryService.createCollectionReminder(reminderData);
                setToastMessage('Expiry reminder email added!');
            }
            
            await fetchReminders();
            setShowExpiryReminderModal(false);
            setEditingReminderId(null);
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error('Failed to save expiry email:', err);
            const detail = err?.message || err?.error_description || 'Unknown error';
            alert(`Failed to save expiry email settings.\n\n${detail}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteReminder = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reminder?')) return;
        try {
            setSaving(true);
            await galleryService.deleteCollectionReminder(id);
            setExpiryReminders(prev => prev.filter(r => r.id !== id));
            setToastMessage('Reminder deleted!');
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error('Failed to delete reminder:', err);
            alert('Failed to delete reminder.');
        } finally {
            setSaving(false);
        }
    };

    const openEditReminder = (reminder) => {
        setEditingReminderId(reminder.id);
        setExpiryEmailTiming(reminder.timing);
        setExpiryEmailTo(reminder.to_email || '');
        setExpiryEmailSubject(reminder.subject);
        setExpiryEmailBody(reminder.body);
        setExpiryEmailIncludePin(reminder.include_pin);
        setExpiryEmailSendCopy(reminder.send_copy);
        setExpiryEmailLists(reminder.activity_lists || []);
        setWhatsappEnabled(reminder.whatsapp_enabled || false);
        setWhatsappBody(reminder.whatsapp_body || '');
        setToWhatsapp(reminder.to_whatsapp || '');
        setShowExpiryReminderModal(true);
    };

    const openAddReminder = async () => {
        setEditingReminderId(null);
        setExpiryEmailTiming('1 day before auto expiry date');
        setExpiryEmailTo('');
        
        let initialSubject = 'The gallery {delivery.name} is about to expire';
        let initialBody = 'Hi,\n\nThe gallery {delivery.name} will expire in {days.prior} on {expiry.date}. You will no longer be able to access this gallery after the expiry date.\n\nIf you have any questions, please don\'t hesitate to get in touch!';
        
        if (user?.id) {
            try {
                const tpl = await clientGalleryEmailTemplatesService.getTemplateById(user.id, 'default-auto-expiry');
                if (tpl) {
                    initialSubject = tpl.subject || initialSubject;
                    initialBody = tpl.body || initialBody;
                }
            } catch (err) {
                console.error('Error fetching default-auto-expiry template:', err);
            }
        }
        
        setExpiryEmailSubject(initialSubject);
        setExpiryEmailBody(initialBody);
        setExpiryEmailIncludePin(false);
        setExpiryEmailSendCopy(true);
        setExpiryEmailLists([]);
        setWhatsappEnabled(false);
        setWhatsappBody('Hi, the gallery {delivery.name} is expiring on {expiry.date}. View it here: {delivery.url}');
        setToWhatsapp('');
        setShowExpiryReminderModal(true);
    };

    const handleApplyPreset = async () => {
        if (!selectedApplyPresetId) {
            alert('Please select a preset to apply.');
            return;
        }
        const selectedPreset = presets.find(p => p.id === selectedApplyPresetId);
        if (!selectedPreset) return;

        const s = selectedPreset.settings;
        if (!s) return;

        const designPatch = toDeliveryDesignPatch({
            coverStyle: s.coverStyle || 'center',
            fontFamily: s.typography,
            colorPalette: s.colorTheme,
            grid: {
                style: s.gridStyle || 'vertical',
                size: s.thumbnailSize || 'regular',
                spacing: s.gridSpacing || 'regular',
                navigation: s.navigationStyle === 'text' ? 'text' : 'icon',
            },
        });
        const updatedSettings = {
            ...designPatch,
            password_enabled: !!s.collectionPassword,
            show_on_showcase: (s.showOnShowcase ?? s.showOnHomepage) !== false,
            
            downloads_enabled: !!s.photoDownload,
            gallery_download_enabled: !!s.photoDownload,
            single_photo_download_enabled: !!s.photoDownload,
            web_downloads_enabled: !!s.webSizeDownload,
            high_res_downloads_enabled: !!s.highResolutionDownload,
            video_downloads_enabled: !!s.videoDownload,
            require_pin_for_gallery_download: !!s.downloadPin,
            require_pin_for_single_photo: !!s.downloadPin,
            
            favorites_enabled: !!s.favoritePhotos,
            favorite_notes_enabled: !!s.favoriteNotes,
            
            store_status: s.storeStatus !== false,
            
            default_watermark: s.defaultWatermark || 'No watermark',
            slideshow_enabled: s.slideshow !== false,
            social_sharing_enabled: s.socialSharing !== false,
        };

        try {
            setSaving(true);
            
            // Turn off autosavers temporarily to prevent overwrite cycles
            designHydratedRef.current = false;
            settingsHydratedRef.current = false;

            await galleryService.updateCollection(collectionId, updatedSettings);
            
            // Also, if the collection has password or PIN, save those values in collection table
            if (s.collectionPassword && s.collectionPasswordValue) {
                await galleryService.updateCollection(collectionId, {
                    guest_password_hash: s.collectionPasswordValue
                });
                setCollectionPassword(s.collectionPasswordValue);
            }
            if (s.downloadPin && s.downloadPinValue) {
                await galleryService.updateCollection(collectionId, {
                    download_pin: s.downloadPinValue
                });
                setPinValue(s.downloadPinValue);
            }

            setCollection(prev => ({ ...prev, ...updatedSettings }));

            // Update local React UI states directly
            setSelectedCoverStyle(s.coverStyle || 'center');
            setSelectedFont(normalizeFontId(s.typography));
            setSelectedColorPalette(normalizePaletteId(s.colorTheme));
            setGridSettings({
                style: s.gridStyle || 'vertical',
                size: s.thumbnailSize || 'regular',
                spacing: s.gridSpacing || 'regular',
                navigation: s.navigationStyle === 'text' ? 'text' : 'icon'
            });

            setCollectionPassword(s.collectionPasswordValue || '');
            setShowOnShowcase((s.showOnShowcase ?? s.showOnHomepage) !== false);
            setPhotoDownload(!!s.photoDownload);
            setDownloadPin(!!s.downloadPin);
            setFavoritePhotos(!!s.favoritePhotos);
            setFavoriteNotes(!!s.favoriteNotes);
            setSlideshow(s.slideshow !== false);
            setSocialSharing(s.socialSharing !== false);
            setDefaultWatermark(s.defaultWatermark || 'No watermark');

            // Re-enable autosavers
            designHydratedRef.current = true;
            settingsHydratedRef.current = true;

            setShowApplyPresetModal(false);
            alert('Preset applied successfully!');
        } catch (err) {
            console.error('Failed to apply preset:', err);
            alert('Failed to apply preset: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreset = async () => {
        if (!savePresetName.trim()) {
            alert('Please enter a name for your preset.');
            return;
        }

        const newPresetSettings = {
            coverStyle: selectedCoverStyle,
            typography: selectedFont,
            colorTheme: selectedColorPalette,
            gridStyle: gridSettings.style,
            thumbnailSize: gridSettings.size,
            gridSpacing: gridSettings.spacing,
            navigationStyle: gridSettings.navigation,
            collectionPassword: !!collectionPassword,
            collectionPasswordValue: collectionPassword || '',
            showOnShowcase: showOnShowcase,
            photoDownload: photoDownload,
            highResolutionDownload: photoDownloadSizes.includes('high'),
            webSizeDownload: photoDownloadSizes.includes('web'),
            videoDownload: photoDownloadSizes.includes('video'),
            downloadPin: downloadPin,
            downloadPinValue: pinValue || '',
            favoritePhotos: favoritePhotos,
            favoriteNotes: favoriteNotes,
            slideshow: slideshow,
            socialSharing: socialSharing,
            defaultWatermark: defaultWatermark,
        };

        try {
            setSaving(true);
            const { data, error } = await supabase
                .from('presets')
                .insert({
                    photographer_id: user.id,
                    name: savePresetName.trim(),
                    settings: newPresetSettings,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setPresets(prev => [data, ...prev]);
            }
            setShowSavePresetModal(false);
            setSavePresetName('');
            alert('Preset saved successfully!');
        } catch (err) {
            console.error('Failed to save preset:', err);
            alert('Failed to save preset: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const applyWatermarkToPhoto = async (photo, wmOptions) => {
        // 1. Fetch the original image blob
        const targetUrl = getProxiedMediaFetchUrl(photo.full_url);
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`Failed to fetch photo file: ${photo.filename}`);
        const blob = await res.blob();
        if (!blob) throw new Error(`Failed to load photo blob: ${photo.filename}`);

        // 2. Apply watermark
        const watermarkedBlob = await applyWatermarkToBlob(blob, wmOptions);

        // 3. Upload to R2 Storage
        const photographerFolder = user.id;
        const collectionFolder = collectionId;
        const fileExt = photo.filename.split('.').pop() || 'jpg';
        const fileName = `${photo.id || Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const setFolder = photo.set_id ? `set__${photo.set_id}` : 'highlights';
        const watermarkedPath = `users/${photographerFolder}/deliveries/${collectionFolder}/photoset/${setFolder}/watermarked/${fileName}`;

        const uploadResult = await storageService.upload(watermarkedPath, watermarkedBlob);
        const watermarkedUrl = uploadResult.url;

        // 4. Update DB
        const { data: updatedPhoto, error: updateError } = await supabase
            .from('photos')
            .update({
                watermarked_url: watermarkedUrl,
                watermarked_storage_path: watermarkedPath
            })
            .eq('id', photo.id)
            .select()
            .single();

        if (updateError) throw updateError;

        return { watermarkedUrl, watermarkedPath };
    };

    const removeWatermarkFromPhoto = async (photo) => {
        // 1. Delete watermarked file from storage
        if (photo.watermarked_storage_path) {
            await storageService.delete([photo.watermarked_storage_path]).catch(err => {
                console.warn('Failed to delete watermarked storage object:', err);
            });
        }

        // 2. Clear columns in DB
        const { error: updateError } = await supabase
            .from('photos')
            .update({
                watermarked_url: null,
                watermarked_storage_path: null
            })
            .eq('id', photo.id);

        if (updateError) throw updateError;
    };

    /** Access settings: pick the watermark new photos are shown with, without reprocessing existing files. */
    const handleSelectDefaultWatermark = async (name) => {
        const next = name || 'No watermark';
        setDefaultWatermark(next);
        setSelectedWatermarkId(next === 'No watermark' ? '' : next);
        try {
            await galleryService.updateCollection(collectionId, { default_watermark: next });
            setCollection(prev => prev ? { ...prev, default_watermark: next } : prev);
        } catch (err) {
            console.error('Failed to save default watermark:', err);
        }
    };

    const handleSaveWatermarkSettings = async () => {
        if (!editingPhoto) return;
        try {
            setSaving(true);
            
            // 1. Resolve watermark options
            let wmOptions = null;
            if (selectedWatermarkId) {
                let wm = watermarks.find(w => w.id === selectedWatermarkId || w.name === selectedWatermarkId);
                if (wm) {
                    wmOptions = {
                        watermark_type: wm.type,
                        watermark_url: wm.url,
                        watermark_text: wm.text,
                        watermark_font: wm.font,
                        watermark_color: wm.color,
                        watermark_scale: wm.scale,
                        watermark_opacity: wm.opacity,
                        watermark_position: wm.position || 'center',
                    };
                }
            }
            // Update collection settings in the database for default_watermark
            const nextDefaultWatermarkValue = selectedWatermarkId || 'No watermark';
            await galleryService.updateCollection(collectionId, {
                default_watermark: nextDefaultWatermarkValue
            });
            setDefaultWatermark(nextDefaultWatermarkValue);
            setCollection(prev => prev ? { ...prev, default_watermark: nextDefaultWatermarkValue } : prev);

            if (applyToAllPhotos) {
                setToastMessage(`Processing photos...`);
                // Loop through all photos in collection
                const total = photos.length;
                let updatedPhotos = [...photos];

                for (let i = 0; i < total; i++) {
                    const photo = photos[i];
                    setToastMessage(`Processing photo ${i + 1} of ${total}...`);
                    try {
                        if (wmOptions) {
                            // Apply/Update watermark
                            // First remove old watermark file if it exists
                            if (photo.watermarked_storage_path) {
                                await storageService.delete([photo.watermarked_storage_path]).catch(() => {});
                            }
                            const { watermarkedUrl, watermarkedPath } = await applyWatermarkToPhoto(photo, wmOptions);
                            updatedPhotos = updatedPhotos.map(p => p.id === photo.id ? { ...p, watermarked_url: watermarkedUrl, watermarked_storage_path: watermarkedPath } : p);
                        } else {
                            // Remove watermark
                            await removeWatermarkFromPhoto(photo);
                            updatedPhotos = updatedPhotos.map(p => p.id === photo.id ? { ...p, watermarked_url: null, watermarked_storage_path: null } : p);
                        }
                    } catch (err) {
                        console.warn(`Failed to process watermark for photo ${photo.id}:`, err);
                    }
                }

                setPhotos(updatedPhotos);
                setToastMessage('Watermark changes applied to all photos!');
            } else {
                setToastMessage(wmOptions ? 'Applying watermark...' : 'Removing watermark...');
                if (wmOptions) {
                    // Apply/Update watermark to single editingPhoto
                    if (editingPhoto.watermarked_storage_path) {
                        await storageService.delete([editingPhoto.watermarked_storage_path]).catch(() => {});
                    }
                    const { watermarkedUrl, watermarkedPath } = await applyWatermarkToPhoto(editingPhoto, wmOptions);
                    setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, watermarked_url: watermarkedUrl, watermarked_storage_path: watermarkedPath } : p));
                    setToastMessage('Watermark applied successfully!');
                } else {
                    // Remove watermark from single editingPhoto
                    await removeWatermarkFromPhoto(editingPhoto);
                    setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, watermarked_url: null, watermarked_storage_path: null } : p));
                    setToastMessage('Watermark removed!');
                }
            }

            setTimeout(() => setToastMessage(null), 3000);
            setShowWatermarkModal(false);
        } catch (err) {
            console.error('Failed to save watermark settings:', err);
            alert('Failed to save watermark settings: ' + err.message);
        } finally {
            setSaving(false);
            setToastMessage(null);
        }
    };

    useEffect(() => {
        if (showWatermarkModal) {
            setSelectedWatermarkId(defaultWatermark === 'No watermark' ? '' : defaultWatermark);
            setApplyToAllPhotos(false);
        }
    }, [showWatermarkModal, defaultWatermark]);

    // Load real data from Supabase
    useEffect(() => {
        const fetchCollectionData = async () => {
            if (!collectionId) {
                navigate(DELIVERY_PRODUCT_HOME);
                return;
            }

            try {
                designHydratedRef.current = false;
                settingsHydratedRef.current = false;
                slideshowColumnReadyRef.current = false;
                setLoading(true);
                setError(null);
                const data = await galleryService.getCollectionDashboardData(collectionId);
                
                if (!data) {
                    setError('Delivery not found');
                    return;
                }
                
                setCollection(data);

                // Initialize state from collection data
                setStatus(uiDeliveryStatus(data));
                if (data.slug) setCollectionUrl(data.slug);
                setCategoryTags(categoryTagsFromCollection(data));
                if (data.guest_password_hash) setCollectionPassword(data.guest_password_hash);
                else if (data.client_password_hash && !data.guest_password_hash) {
                    setCollectionPassword(data.client_password_hash);
                }
                if (data.client_password_hash) setClientPrivatePassword(data.client_password_hash);
                if (data.client_exclusive_enabled !== undefined) setClientExclusiveAccess(data.client_exclusive_enabled);
                if (data.allow_clients_mark_private !== undefined) setAllowClientsMarkPrivate(data.allow_clients_mark_private);
                if (data.client_only_highlights !== undefined) setClientOnlyHighlights(data.client_only_highlights);
                if (data.highlights_enabled !== undefined) setHighlightsEnabled(data.highlights_enabled !== false);
                if (data.show_on_showcase !== undefined) setShowOnShowcase(data.show_on_showcase !== false);

                // Map individual columns to state
                setSelectedCoverStyle(resolveCoverLayoutId(data));

                const extras = data.design_options && typeof data.design_options === 'object'
                    ? data.design_options
                    : {};
                const chrome = chromeFromDelivery(data);
                const fromDb = gridSettingsFromDelivery(data);
                const cached = readCachedDesignGrid(collectionId);
                setSelectedFont(extras.font_family
                    ? chrome.fontFamily
                    : (cached?.fontFamily || chrome.fontFamily));
                setSelectedColorPalette(extras.color_palette
                    ? chrome.colorPalette
                    : (cached?.colorPalette || chrome.colorPalette));
                setGridSettings(extras.thumbnail_size || extras.grid_style
                    ? fromDb
                    : (cached
                        ? {
                            style: cached.style,
                            size: cached.size,
                            spacing: cached.spacing,
                            navigation: cached.navigation,
                        }
                        : fromDb));

                const normalizedSort = normalizeGalleryPhotoSort(data.gallery_photo_sort);
                setSortOption(normalizedSort);
                const sortUi = optionToSortUi(normalizedSort);
                if (sortUi) {
                    setPhotoSortField(sortUi.field);
                    setPhotoSortReverse(sortUi.reverse);
                }

                // Initialize download settings
                if (data.downloads_enabled !== undefined) setPhotoDownload(data.downloads_enabled);
                if (data.download_resolutions) {
                    const mapped = data.download_resolutions.map((s) => (s === 'full' ? 'high' : s));
                    const sizes = mapped.filter((s) => s === 'web' || s === 'high' || s === 'original' || s === 'video');
                    if (data.video_downloads_enabled && !sizes.includes('video')) sizes.push('video');
                    if (sizes.length) setPhotoDownloadSizes(sizes);
                } else if (data.video_downloads_enabled) {
                    setPhotoDownloadSizes((prev) => (prev.includes('video') ? prev : [...prev, 'video']));
                }
                const dbPin = data.download_pin || data.download_pin_hash;
                if (dbPin) {
                    setDownloadPin(true);
                    setPinValue(dbPin);
                } else if (data.download_pin === null || data.download_pin_hash === null) {
                    setDownloadPin(false);
                }
                
                if (data.require_pin_for_single_photo !== undefined) setRequirePinForSinglePhoto(data.require_pin_for_single_photo);
                if (data.email_capture_enabled !== undefined) setEmailRegistration(data.email_capture_enabled);
                if (data.gallery_download_enabled !== undefined) setGalleryDownload(data.gallery_download_enabled);
                if (data.single_photo_download_enabled !== undefined) setSinglePhotoDownload(data.single_photo_download_enabled);
                
                // Initialize advanced settings
                if (data.download_limit_gallery) setDownloadLimit(data.download_limit_gallery.toString());
                if (data.restrict_to_emails) setRestrictToEmails(data.restrict_to_emails);
                if (data.selected_download_sets) {
                    let nextDownloadSets = data.selected_download_sets;
                    const namedSets = (data.sets || []).filter((s) => s.name?.toLowerCase() !== 'highlights');
                    const isLegacyHighlightsOnly =
                        Array.isArray(nextDownloadSets) &&
                        nextDownloadSets.length === 1 &&
                        String(nextDownloadSets[0]).toLowerCase() === 'highlights' &&
                        namedSets.length > 0;
                    if (isLegacyHighlightsOnly) {
                        nextDownloadSets = ['Highlights', ...namedSets.map((s) => s.name)];
                    }
                    setSelectedDownloadSets(nextDownloadSets);
                }
                if (data.pin_usage_limit) setPinUsageLimit(data.pin_usage_limit.toString());
                
                // Initialize favorite settings
                if (data.favorites_enabled !== undefined) setFavoritePhotos(data.favorites_enabled);
                if (data.favorites_allow_comments !== undefined) setFavoriteNotes(data.favorites_allow_comments);

                // Initialize store/shop settings
                if (data.store_enabled !== undefined) setStoreEnabled(data.store_enabled);

                // Initialize expiry email settings
                if (data.expiry_email_timing) setExpiryEmailTiming(data.expiry_email_timing);
                if (data.expiry_email_to) setExpiryEmailTo(data.expiry_email_to);
                if (data.expiry_email_subject) setExpiryEmailSubject(data.expiry_email_subject);
                if (data.expiry_email_body) setExpiryEmailBody(data.expiry_email_body);
                if (data.expiry_email_include_pin !== undefined) setExpiryEmailIncludePin(data.expiry_email_include_pin);
                if (data.expiry_email_send_copy !== undefined) setExpiryEmailSendCopy(data.expiry_email_send_copy);
                if (data.expiry_email_lists) setExpiryEmailLists(data.expiry_email_lists);
                if (data.social_sharing_enabled !== undefined) setSocialSharing(data.social_sharing_enabled);
                if (data.gallery_assist !== undefined) setGalleryAssist(data.gallery_assist);
                if (Object.prototype.hasOwnProperty.call(data, 'slideshow_enabled')) {
                    setSlideshow(data.slideshow_enabled !== false);
                    slideshowColumnReadyRef.current = true;
                    cacheSlideshowEnabled(collectionId, data.slideshow_enabled !== false);
                } else if (data.slideshow !== undefined) {
                    setSlideshow(data.slideshow !== false);
                    cacheSlideshowEnabled(collectionId, data.slideshow !== false);
                } else {
                    const cachedSlideshow = readCachedSlideshowEnabled(collectionId);
                    if (cachedSlideshow !== null) setSlideshow(cachedSlideshow);
                }
                if (data.auto_expiry) setAutoExpiry(data.auto_expiry);
                if (data.default_watermark) setDefaultWatermark(data.default_watermark);
                if (data.language) {
                    const lang = String(data.language);
                    const pretty = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
                    setLanguage(pretty === 'Hindi' || pretty === 'Tamil' ? pretty : 'English');
                }

                designHydratedRef.current = true;
                settingsHydratedRef.current = true;

                const photoData = data.photos || [];
                setPhotos(photoData);
                const setsData = data.sets || [];
                setSets(setsData);

                const savedOrder =
                    (Array.isArray(data.sidebar_set_order) && data.sidebar_set_order.length > 0
                        ? data.sidebar_set_order.map(String)
                        : null) || readCachedSidebarOrder(collectionId);
                if (savedOrder) {
                    setOrderedSetIds(savedOrder);
                } else {
                    setOrderedSetIds(null);
                }

                // Activity counts load in background — do not block grid render
                galleryService
                    .getActivityCounts(collectionId)
                    .then((counts) => setBackendActivityCounts(counts))
                    .catch((activityErr) => console.warn('Activity counts unavailable:', activityErr));
            } catch (err) {
                console.error('Error fetching collection:', err);
                setError(err.message || 'Failed to load delivery');
            } finally {
                setLoading(false);
            }
        };

        fetchCollectionData();
    }, [collectionId, navigate]);

    useEffect(() => {
        clearMediaUrlCache();
    }, [collectionId]);

    useEffect(() => {
        if (!collectionId || !collection?.guest_delivery_enabled) {
            setGdEvent(null);
            return;
        }
        let cancelled = false;
        guestDeliveryService.getEventByCollectionId(collectionId).then((ev) => {
            if (!cancelled) setGdEvent(ev);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [collectionId, collection?.guest_delivery_enabled]);

    useEffect(() => {
        if (!collectionId) {
            setPhotoAiRows([]);
            setPhotoAiTableMissing(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { rows, tableMissing } = await photoAiService.getMetadataForCollection(collectionId);
                if (!cancelled) {
                    setPhotoAiRows(rows);
                    setPhotoAiTableMissing(tableMissing);
                }
            } catch (err) {
                console.warn('Photo AI metadata load failed:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [collectionId]);

    useEffect(() => {
        setLightboxImgFailed(false);
    }, [lightboxOpenIndex]);

    const rawPreviewRepairRef = useRef(new Set());

    /** Backfill / re-bake JPEG previews for RAW (missing preview or wrong orientation). */
    useEffect(() => {
        const orientFixKey = 'pixnxt-raw-orient-v1';
        let orientFixedIds = [];
        try {
            orientFixedIds = JSON.parse(sessionStorage.getItem(orientFixKey) || '[]');
        } catch {
            orientFixedIds = [];
        }
        const orientFixedSet = new Set(orientFixedIds);

        const needsRepair = photos.filter((p) => {
            if (!isRawMedia(p) || rawPreviewRepairRef.current.has(p.id)) return false;
            if (!hasRawDisplayPreview(p)) return true;
            return !orientFixedSet.has(p.id);
        });
        if (needsRepair.length === 0) return undefined;

        let cancelled = false;
        (async () => {
            const newlyFixed = [...orientFixedIds];
            for (const photo of needsRepair) {
                if (cancelled) break;
                rawPreviewRepairRef.current.add(photo.id);
                const rebake = hasRawDisplayPreview(photo);
                try {
                    const updated = await galleryService.repairRawPhotoPreview(photo, { rebake });
                    if (!cancelled && updated?.id) {
                        setPhotos((prev) =>
                            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                        );
                        if (rebake && !newlyFixed.includes(photo.id)) {
                            newlyFixed.push(photo.id);
                        }
                    }
                } catch (err) {
                    console.warn('RAW preview repair failed:', photo.filename, err);
                }
            }
            if (!cancelled && newlyFixed.length > orientFixedIds.length) {
                try {
                    sessionStorage.setItem(orientFixKey, JSON.stringify(newlyFixed));
                } catch {
                    /* ignore quota */
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [photos]);

    // Global click listener to close menus (ref-aware so toolbar toggles work)
    useEffect(() => {
        const handleClickOutside = (e) => {
            const target = e.target;
            if (
                activeActivityMenu
                && !target.closest?.('.activity-row-menu')
                && !target.closest?.('.row-action-btn')
            ) {
                setActiveActivityMenu(null);
            }
            if (
                favoriteDetailPhotoMenuPhotoId
                && favoriteDetailPhotoMenuRef.current
                && !favoriteDetailPhotoMenuRef.current.contains(target)
            ) {
                setFavoriteDetailPhotoMenuPhotoId(null);
            }
            if (
                showSelectionMore
                && selectionMoreRef.current
                && !selectionMoreRef.current.contains(e.target)
                && (!selectionMorePortalRef.current || !selectionMorePortalRef.current.contains(e.target))
            ) {
                setShowSelectionMore(false);
            }
            if (showSelectAllMenu && selectAllMenuRef.current && !selectAllMenuRef.current.contains(e.target)) {
                setShowSelectAllMenu(false);
            }
            if (
                showMoveToSetMenu
                && moveToSetRef.current
                && !moveToSetRef.current.contains(e.target)
                && (!moveMenuPortalRef.current || !moveMenuPortalRef.current.contains(e.target))
            ) {
                setShowMoveToSetMenu(false);
            }
            if (
                favoriteActivitySortMenuOpen
                && favoriteActivitySortMenuRef.current
                && !favoriteActivitySortMenuRef.current.contains(target)
            ) {
                setFavoriteActivitySortMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeActivityMenu, favoriteDetailPhotoMenuPhotoId, favoriteActivitySortMenuOpen, showSelectionMore, showSelectAllMenu, showMoveToSetMenu]);

    // ─── SORT LOGIC ──────────────────────────────────────────
    const isFilmsView = activeSidebarTab === 'films';

    const sortedPhotos = useMemo(() => {
        let filtered = photos;
        if (isFilmsView) {
            filtered = photos;
        } else if (activeSetId) {
            filtered = photos.filter(p => p.set_id === activeSetId);
        } else {
            filtered = photos.filter(p => !p.set_id);
        }

        return sortDashboardPhotos(filtered, sortOption);
    }, [photos, activeSetId, sortOption, isFilmsView]);

    const photoAiMetadataMap = useMemo(
        () => photoAiService.metadataToMap(photoAiRows),
        [photoAiRows]
    );

    const activePerson = useMemo(
        () => photoAiPeople.find((p) => p.id === activePersonId) || null,
        [photoAiPeople, activePersonId]
    );

    const aiFilteredPhotos = useMemo(() => {
        let result = sortedPhotos;
        if (selfieMatchPhotoIds.length) {
            result = filterPhotosByIds(result, selfieMatchPhotoIds);
        } else if (activePerson) {
            result = filterPhotosByPerson(result, photoAiMetadataMap, activePerson);
        }
        if (showUnmatchedPeople && photoAiRows.length > 0) {
            result = result.filter((photo) => {
                const meta = photoAiMetadataMap[photo.id];
                return !meta?.faces?.length;
            });
        }
        return result;
    }, [sortedPhotos, photoAiMetadataMap, activePerson, selfieMatchPhotoIds, showUnmatchedPeople, photoAiRows.length]);

    const totalMediaCounts = useMemo(() => countGalleryMedia(photos), [photos]);

    const sidebarActivityCount = useMemo(
        () =>
            (activityCounts.contacts || 0) +
            (activityCounts.downloaded || 0) +
            (activityCounts.favorited || 0) +
            (activityCounts.registered || 0) +
            (activityCounts.purchased || 0),
        [activityCounts]
    );

    const activeSetMediaCounts = useMemo(
        () => countGalleryMedia(sortedPhotos),
        [sortedPhotos]
    );

    const mediaFilteredPhotos = useMemo(() => {
        if (isFilmsView) {
            return filterGalleryMediaByType(aiFilteredPhotos, 'videos');
        }
        return filterGalleryMediaByType(aiFilteredPhotos, 'photos');
    }, [aiFilteredPhotos, isFilmsView]);

    const isPhotoAiFilterActive = Boolean(
        activePersonId || selfieMatchPhotoIds.length
    );

    const handleSelfieSearch = useCallback(async (imageBase64) => {
        if (!collectionId || !imageBase64) return;
        setSelfieSearching(true);
        setSelfieMessage('');
        setSelfiePreview(imageBase64);
        setActivePersonId(null);
        setSelfieMatchPhotoIds([]);
        try {
            const result = await photoAiService.searchBySelfie(collectionId, imageBase64);
            if (result.matched && result.photoIds?.length) {
                setSelfieMatchPhotoIds(result.photoIds);
                setSelfieMessage(result.message || `Found ${result.photoIds.length} matching photos.`);
                if (result.people?.[0]?.id) {
                    setActivePersonId(result.people[0].id);
                }
            } else {
                setSelfieMatchPhotoIds([]);
                setSelfieMessage(result.message || 'No matching faces found in this gallery.');
            }
        } catch (err) {
            setSelfieMatchPhotoIds([]);
            setSelfieMessage(err?.message || 'Selfie search failed.');
        } finally {
            setSelfieSearching(false);
        }
    }, [collectionId]);

    const handleClearSelfie = useCallback(() => {
        setSelfiePreview('');
        setSelfieMatchPhotoIds([]);
        setSelfieMessage('');
        setActivePersonId(null);
    }, []);

    const handleTogglePersonHidden = useCallback(async (personId, hidden) => {
        if (!collectionId || !personId) return;
        try {
            await photoAiService.setPersonHidden(collectionId, personId, hidden);
            if (hidden && activePersonId === personId) {
                setActivePersonId(null);
            }
            setPhotoAiPeople((prev) =>
                prev.map((person) =>
                    person.id === personId ? { ...person, isHidden: hidden } : person
                )
            );
        } catch (err) {
            console.warn('Failed to update person visibility:', err);
            alert(err?.message || 'Could not update person visibility.');
        }
    }, [collectionId, activePersonId]);

    const photoAiRowsRef = useRef(photoAiRows);
    photoAiRowsRef.current = photoAiRows;

    const peopleLoadingRef = useRef(false);
    const photoAiAutoSyncKeyRef = useRef('');
    const uploadsWereBusyRef = useRef(false);

    const loadPhotoAiPeople = useCallback(async (options = {}) => {
        if (!collectionId || photoAiTableMissing) return;
        const rows = photoAiRowsRef.current;
        if (!rows.length) {
            setPhotoAiPeople([]);
            return;
        }
        if (peopleLoadingRef.current) return;

        const silent = Boolean(options.silent);
        peopleLoadingRef.current = true;
        if (!silent) {
            setPhotoAiLoadingPeople(true);
        }
        try {
            const people = await photoAiService.getPeople(collectionId, {
                forceRecluster: Boolean(options.forceRecluster),
                metadataRows: rows,
                includeHidden: true,
            });
            setPhotoAiPeople(Array.isArray(people) ? people : []);
        } catch (err) {
            console.warn('Failed to load clustered people:', err);
            if (!silent) setPhotoAiPeople([]);
        } finally {
            peopleLoadingRef.current = false;
            if (!silent) setPhotoAiLoadingPeople(false);
        }
    }, [collectionId, photoAiTableMissing]);

    const refreshPhotoAiMetadata = useCallback(async () => {
        if (!collectionId) return { rows: [], tableMissing: false };
        try {
            const { rows, tableMissing } = await photoAiService.getMetadataForCollection(collectionId);
            setPhotoAiRows(rows);
            setPhotoAiTableMissing(tableMissing);
            return { rows, tableMissing };
        } catch (err) {
            console.warn('Photo AI metadata refresh failed:', err);
            return { rows: [], tableMissing: false };
        }
    }, [collectionId]);

    const indexablePhotoCount = useMemo(
        () => photos.filter((photo) => isGalleryImagePhoto(photo)).length,
        [photos]
    );

    const photoAiSyncingRef = useRef(false);

    const runPhotoAiAutoSync = useCallback(async () => {
        if (!collectionId || photoAiTableMissing || photoAiSyncingRef.current) return;

        const { rows, tableMissing } = await photoAiService.getMetadataForCollection(collectionId);
        if (tableMissing) {
            setPhotoAiTableMissing(true);
            return;
        }

        const stale = !(await photoAiService.isPeopleCacheFresh(collectionId, rows));
        const unindexed = indexablePhotoCount > rows.length;
        if (!unindexed && !stale) {
            setPhotoAiRows(rows);
            return;
        }

        photoAiSyncingRef.current = true;
        setPhotoAiIndexing(true);
        try {
            await photoAiService.syncCollection(collectionId);
            await refreshPhotoAiMetadata();
            if (showPeoplePanel || activeSidebarTab === 'photos') {
                await loadPhotoAiPeople({ silent: true });
            }
        } catch (err) {
            console.warn('Photo AI auto-sync failed:', err);
        } finally {
            photoAiSyncingRef.current = false;
            setPhotoAiIndexing(false);
        }
    }, [
        collectionId,
        photoAiTableMissing,
        indexablePhotoCount,
        showPeoplePanel,
        activeSidebarTab,
        refreshPhotoAiMetadata,
        loadPhotoAiPeople,
    ]);

    useEffect(() => {
        setPhotoSearchQuery('');
    }, [activeSetId]);

    const sharingOverlaysEnabled = status === DELIVERY_STATUS.published;

    const handlePhotoSortFieldChange = useCallback((field) => {
        setPhotoSortField(field);
        setPhotoSortReverse(false);
        setSortOption(sortFieldToOption(field, false));
    }, []);

    const handlePhotoSortReverseChange = useCallback((reverse) => {
        setPhotoSortReverse(reverse);
        setSortOption(sortFieldToOption(photoSortField, reverse));
    }, [photoSortField]);

    useEffect(() => {
        if (!collectionId || !sharingOverlaysEnabled) {
            setClientFavoritedPhotoIds(new Set());
            setSelectionListPhotoIds(new Set());
            return;
        }
        void galleryService.getCollectionFavoriteOverlayPhotoIds(collectionId).then((overlays) => {
            setClientFavoritedPhotoIds(new Set(overlays.favoritedPhotoIds));
            setSelectionListPhotoIds(new Set(overlays.selectionListPhotoIds));
        });
    }, [collectionId, sharingOverlaysEnabled]);

    useEffect(() => {
        if (activeSidebarTab !== 'photos' || photoAiTableMissing || photoAiRows.length === 0) return;
        void loadPhotoAiPeople({ silent: true });
    }, [activeSidebarTab, photoAiTableMissing, photoAiRows.length, loadPhotoAiPeople]);

    useEffect(() => {
        if (!collectionId || indexablePhotoCount === 0 || photoAiTableMissing) return;

        const syncKey = `${collectionId}:${indexablePhotoCount}`;
        if (photoAiAutoSyncKeyRef.current === syncKey) return;
        photoAiAutoSyncKeyRef.current = syncKey;

        void runPhotoAiAutoSync();
    }, [collectionId, indexablePhotoCount, photoAiTableMissing, runPhotoAiAutoSync]);

    // Get the active set object
    const activeSet = activeSetId ? sets.find(s => s.id === activeSetId) : null;
    const activeSetName = activeSet ? activeSet.name : highlightsName;

    const uploadDestinationLabel = collection
        ? `${collection.name || 'Delivery'} / ${activeSetName}`
        : activeSetName;

    const getUploadTargetSnapshot = useCallback(
        () => ({
            collectionId,
            photographerId: collection?.photographer_id ?? user?.id,
            activeSetId: highlightsEnabled ? activeSetId : (activeSetId ?? sets[0]?.id ?? null),
            destinationLabel: uploadDestinationLabel,
        }),
        [
            collectionId,
            collection?.photographer_id,
            user?.id,
            highlightsEnabled,
            activeSetId,
            sets,
            uploadDestinationLabel,
        ]
    );

    const uploadSnapshotRef = useRef(null);

    const existingUploadFilenames = useMemo(
        () =>
            photos
                .filter((p) => p.filename && !isIncompleteUploadPhoto(p))
                .map((p) => p.filename)
                .filter(Boolean),
        [photos]
    );

    const incompleteUploadPhotos = useMemo(
        () => photos.filter((p) => isIncompleteUploadPhoto(p)),
        [photos]
    );

    const {
        state: uploadState,
        processFiles,
        pause: pauseUploads,
        resume: resumeUploads,
        cancel: cancelUploads,
        minimize: minimizeUploads,
        expand: expandUploads,
        setActiveTab: setUploadTab,
        toggleDetails: toggleUploadDetails,
    } = useUploadQueue({
        collectionId,
        photographerId: collection?.photographer_id ?? user?.id,
        activeSetId: highlightsEnabled ? activeSetId : (activeSetId ?? sets[0]?.id ?? null),
        photosLength: photos.length,
        existingFilenames: existingUploadFilenames,
        incompletePhotos: incompleteUploadPhotos,
        destinationLabel: uploadDestinationLabel,
        onPhotoUploaded: (photoData) => {
            if (!photoData?.id || photoData.collection_id !== collectionId) return;
            setPhotos((prev) => {
                if (prev.some((p) => p.id === photoData.id)) {
                    return prev.map((p) => p.id === photoData.id ? { ...p, ...photoData } : p);
                }
                return [...prev, photoData];
            });
            if (isRawMedia(photoData) && !hasRawDisplayPreview(photoData)) {
                void galleryService.repairRawPhotoPreview(photoData).then((updated) => {
                    if (updated?.id) {
                        setPhotos((prev) =>
                            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                        );
                    }
                }).catch((err) => console.warn('RAW preview backfill failed:', photoData.filename, err));
            }
        },
    });

    useEffect(() => {
        if (!highlightsEnabled && activeSetId == null && sets.length > 0) {
            setActiveSetId(sets[0].id);
        }
    }, [highlightsEnabled, activeSetId, sets]);

    const searchFilteredPhotos = useMemo(() => {
        const query = photoSearchQuery.trim().toLowerCase();
        if (!query) return mediaFilteredPhotos;
        return mediaFilteredPhotos.filter((photo) =>
            (photo.filename || '').toLowerCase().includes(query)
        );
    }, [mediaFilteredPhotos, photoSearchQuery]);

    const gridPhotos = useMemo(() => {
        const viewSetId = highlightsEnabled ? activeSetId : (activeSetId ?? sets[0]?.id ?? null);
        const completedNames = new Set(searchFilteredPhotos.map((p) => p.filename));
        const pending = uploadState.files
            .filter(
                (f) =>
                    f.status !== 'completed' &&
                    f.status !== 'error' &&
                    !completedNames.has(f.name) &&
                    (!f.collectionId || f.collectionId === collectionId) &&
                    (f.setId ?? null) === (viewSetId ?? null)
            )
            .map((f) => ({
                id: `upload-pending-${f.id}`,
                filename: f.name,
                full_url: f.previewUrl || '',
                thumbnail_url: f.previewUrl || '',
                media_type: getUploadMediaType(f.file),
                _uploadPending: true,
                _uploadProgress: f.progress,
            }));
        const filteredPending = filterGalleryMediaByType(pending, isFilmsView ? 'videos' : 'photos');
        return [...searchFilteredPhotos, ...filteredPending];
    }, [searchFilteredPhotos, uploadState.files, collectionId, highlightsEnabled, activeSetId, sets, isFilmsView]);

    const deliveryFilms = useMemo(() => {
        const videos = filterGalleryMediaByType(photos, 'videos');
        return sortDashboardPhotos(videos, sortOption);
    }, [photos, sortOption]);

    const videoDownloadEnabled = photoDownloadSizes.includes('video');

    const handlePreviewAsClient = useCallback(() => {
        const params = new URLSearchParams({
            coverStyle: selectedCoverStyle,
            font: normalizeFontId(selectedFont),
            color: normalizePaletteId(selectedColorPalette),
            grid: gridSettings.style,
            thumb: gridSettings.size,
            spacing: gridSettings.spacing,
            nav: gridSettings.navigation,
            slideshow: slideshow ? '1' : '0',
            socialSharing: socialSharing ? '1' : '0',
        });
        openSpaPath(`/gallery/${collectionUrl}?${params.toString()}`);
    }, [
        selectedCoverStyle,
        selectedFont,
        selectedColorPalette,
        gridSettings.style,
        gridSettings.size,
        gridSettings.spacing,
        gridSettings.navigation,
        slideshow,
        socialSharing,
        collectionUrl,
    ]);

    useEffect(() => {
        if (!pendingUploadScrollRef.current || activeSidebarTab !== 'photos') return;
        pendingUploadScrollRef.current = false;
        requestAnimationFrame(() => {
            photosGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [activeSidebarTab, gridPhotos.length]);

    const activeSetCountLabel = useMemo(() => {
        const typeCount = activeSetMediaCounts.photos;
        if (isPhotoAiFilterActive || photoSearchQuery.trim()) {
            return `${gridPhotos.filter((p) => !p._uploadPending).length.toLocaleString()} of ${Number(typeCount).toLocaleString()} photos`;
        }
        return `${Number(typeCount).toLocaleString()} photos`;
    }, [
        activeSetMediaCounts,
        isPhotoAiFilterActive,
        photoSearchQuery,
        gridPhotos,
    ]);

    const coverModalPhotos = useMemo(() => {
        if (coverModalScope === 'all') return photos;
        if (coverModalScope === 'highlights') return photos.filter((p) => !p.set_id);
        return photos.filter((p) => p.set_id === coverModalScope);
    }, [photos, coverModalScope]);

    const openCoverModal = (scope = 'all', view = 'edit') => {
        setCoverModalScope(scope);
        setCoverModalInitialView(view);
        setShowCoverModal(true);
    };

    const closeCoverModal = () => {
        setShowCoverModal(false);
        setCoverModalScope('all');
        setCoverModalPhotoOverride(null);
    };

    useEffect(() => {
        if (!showEmailHistoryModal || !collectionId) return undefined;
        let cancelled = false;
        const load = async () => {
            setEmailHistoryLoading(true);
            setEmailHistoryError('');
            try {
                const rows = await galleryService.getCollectionShareEmailHistory(collectionId);
                if (cancelled) return;
                setEmailHistory(
                    (rows || []).map((item) => {
                        const raw = String(item.status || 'Sent').trim().toLowerCase();
                        let status = 'Sent';
                        if (raw === 'pending' || raw === 'sending' || raw === 'queued') status = 'Pending';
                        else if (raw === 'rejected' || raw === 'bounced' || raw === 'failed' || raw === 'bounce') status = 'Rejected';
                        else if (raw === 'scheduled') status = 'Scheduled';
                        else if (raw === 'sent' || raw === 'delivered') status = 'Sent';
                        else status = String(item.status || 'Sent').replace(/^\w/, (c) => c.toUpperCase());
                        return {
                            id: item.id,
                            email: item.recipient_email,
                            subject: item.subject || '—',
                            date: new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            }),
                            status,
                        };
                    })
                );
            } catch (err) {
                console.error('Failed to load email history:', err);
                if (!cancelled) {
                    setEmailHistory([]);
                    setEmailHistoryError(err?.message || 'Failed to load email history.');
                }
            } finally {
                if (!cancelled) setEmailHistoryLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [showEmailHistoryModal, collectionId]);

    // ─── SET HANDLERS ────────────────────────────────────────
    const handleCreateSet = async () => {
        if (!newSetName.trim() || !collectionId || !collection) return;
        try {
            setSavingSet(true);
            const newSet = await galleryService.createSet({
                collectionId,
                photographerId: collection.photographer_id,
                name: newSetName.trim(),
                description: newSetDescription.trim() || null,
                position: sets.length
            });
            setSets(prev => [...prev, newSet]);
            setOrderedSetIds((prev) => {
                if (!prev || prev.length === 0) return prev;
                if (prev.includes(newSet.id)) return prev;
                const next = [...prev, newSet.id];
                void persistSidebarOrder(collectionId, next);
                return next;
            });
            setSelectedDownloadSets((prev) => {
                if (prev.length === 0) return prev;
                if (prev.includes(newSet.name) || prev.includes(newSet.id)) return prev;
                return [...prev, newSet.name];
            });
            setNewSetName('');
            setNewSetDescription('');
            setShowAddSetModal(false);
            // Switch to the new set
            setActiveSetId(newSet.id);
        } catch (err) {
            console.error('Failed to create set:', err);
            alert('Failed to create set. Please try again.');
        } finally {
            setSavingSet(false);
        }
    };

    const handleUpdateSet = async () => {
        if (!editingSet || !editSetName.trim()) return;
        try {
            setSavingSet(true);

            if (editingSet.id === 'highlights') {
                // Virtual Highlights set: name is local; description is stored on the collection (public Highlights view).
                const desc = editSetDescription.trim().slice(0, 500) || null;
                const updated = await galleryService.updateCollection(collectionId, { description: desc });
                setCollection((prev) => (prev ? { ...prev, ...updated } : prev));
                setHighlightsName(editSetName.trim());
                setEditingSet(null);
                setSavingSet(false);
                return;
            }

            const updated = await galleryService.updateSet(editingSet.id, {
                name: editSetName.trim(),
                description: editSetDescription.trim() || null
            });
            setSets(prev => prev.map(s => s.id === editingSet.id ? { ...s, ...updated } : s));
            setEditingSet(null);
        } catch (err) {
            console.error('Failed to update set:', err);
            alert('Failed to update set. Please try again.');
        } finally {
            setSavingSet(false);
        }
    };

    const handleDeleteSet = (setId) => {
        setDeleteSetId(setId);
    };

    const confirmDeleteSet = async () => {
        if (!deleteSetId) return;

        const isHighlights = deleteSetId === 'highlights';

        if (!isHighlights && sets.length === 0) {
            setToastMessage('You must have at least one set.');
            setTimeout(() => setToastMessage(null), 3000);
            setDeleteSetId(null);
            return;
        }
        
        try {
            setSaving(true);
            if (isHighlights) {
                const unassignedPhotoIds = photos.filter((p) => !p.set_id).map((p) => p.id);
                if (unassignedPhotoIds.length > 0) {
                    await galleryService.deletePhotos(unassignedPhotoIds);
                    setPhotos((prev) => prev.filter((p) => p.set_id));
                    if (collection?.cover_photo_id && unassignedPhotoIds.includes(collection.cover_photo_id)) {
                        setCollection((prev) => (prev ? { ...prev, cover_photo_id: null, cover_url: null } : prev));
                    }
                }
                await galleryService.updateCollection(collectionId, { highlights_enabled: false });
                setHighlightsEnabled(false);
                setCollection((prev) => (prev ? { ...prev, highlights_enabled: false } : prev));
                setOrderedSetIds((prev) => {
                    if (!prev) return prev;
                    const next = prev.filter((id) => id !== 'highlights');
                    void persistSidebarOrder(collectionId, next);
                    return next;
                });
                setActiveSetId(sets[0]?.id ?? null);
            } else {
                const removedIds = new Set(
                    photos.filter((p) => p.set_id === deleteSetId).map((p) => p.id)
                );
                await galleryService.deleteSet(deleteSetId);
                setPhotos((prev) => prev.filter((p) => !removedIds.has(p.id)));
                setSets((prev) => prev.filter((s) => s.id !== deleteSetId));
                setOrderedSetIds((prev) => {
                    if (!prev) return prev;
                    const next = prev.filter((id) => id !== deleteSetId);
                    void persistSidebarOrder(collectionId, next);
                    return next;
                });
                if (collection?.cover_photo_id && removedIds.has(collection.cover_photo_id)) {
                    setCollection((prev) => (prev ? { ...prev, cover_photo_id: null, cover_url: null } : prev));
                }
                if (activeSetId === deleteSetId) {
                    setActiveSetId(highlightsEnabled ? null : sets.find((s) => s.id !== deleteSetId)?.id ?? null);
                }
            }
            setDeleteSetId(null);
        } catch (err) {
            console.error('Failed to delete set:', err);
            const detail = err?.message ? `\n\n${err.message}` : '';
            alert(`Failed to delete set. Please try again.${detail}`);
        } finally {
            setSaving(false);
        }
    };

    const openEditSetModal = (set) => {
        setEditingSet(set);
        setEditSetName(set.name);
        setEditSetDescription(set.description || '');
        setShowSetMenu(null);
    };

    const handleMovePhotosToSet = async (setId) => {
        if (selectedPhotos.length === 0) return;
        try {
            setSaving(true);
            await galleryService.assignPhotosToSet(selectedPhotos, setId);

            // Update local state
            setPhotos(prev => prev.map(p =>
                selectedPhotos.includes(p.id) ? { ...p, set_id: setId } : p
            ));

            setShowMoveToSetMenu(false);
            clearSelection();
        } catch (err) {
            console.error('Move failed:', err);
            alert('Failed to move photos. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getSelectedPhotoRecords = () => {
        const idSet = new Set(selectedPhotos);
        return photos.filter((p) => idSet.has(p.id) && p.full_url);
    };

    const closeSelectionChrome = () => {
        setShowSelectionMore(false);
        setShowSelectAllMenu(false);
        setShowMoveToSetMenu(false);
    };

    const requireSingleSelectedPhoto = (actionLabel) => {
        const sel = getSelectedPhotoRecords();
        if (sel.length !== 1) {
            alert(`Select exactly one photo to ${actionLabel}.`);
            return null;
        }
        return sel[0];
    };

    const handleSelectionOpen = () => {
        const sel = getSelectedPhotoRecords();
        if (sel.length === 0) return;
        const idx = sortedPhotos.findIndex((p) => p.id === sel[0].id);
        closeSelectionChrome();
        setLightboxOpenIndex(idx >= 0 ? idx : 0);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            const target = e.target;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
            if (lightboxOpenIndex >= 0) return;
            if (selectedPhotos.length === 0) return;
            e.preventDefault();
            handleSelectionOpen();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhotos, lightboxOpenIndex, sortedPhotos, photos]);

    const handleSelectionStar = async () => {
        const sel = getSelectedPhotoRecords();
        if (sel.length === 0) return;
        const targetStarred = !sel.every((p) => p.is_starred);
        closeSelectionChrome();
        try {
            await Promise.all(sel.map((p) => galleryService.togglePhotoStar(p.id, targetStarred)));
            const ids = new Set(sel.map((p) => p.id));
            setPhotos((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, is_starred: targetStarred } : p)));
        } catch (err) {
            console.error('Bulk star failed:', err);
            alert('Failed to update starred photos.');
        }
    };

    const handleSelectionShareLink = () => {
        const sel = getSelectedPhotoRecords();
        if (sel.length === 0) return;
        closeSelectionChrome();
        handleQuickShare(sel[0]);
    };

    const handleSelectionCopyFilenames = () => {
        const sel = getSelectedPhotoRecords();
        if (sel.length === 0) return;
        const text = sel.map((p) => p.filename).filter(Boolean).join('\n');
        navigator.clipboard.writeText(text);
        closeSelectionChrome();
        alert(sel.length === 1 ? 'Filename copied to clipboard!' : `${sel.length} filenames copied to clipboard!`);
    };

    const handleSelectionSetAsCover = () => {
        const sel = getSelectedPhotoRecords();
        const photo = sel.find((p) => isGalleryImagePhoto(p)) || sel[0];
        if (!photo) return;
        closeSelectionChrome();
        handleSetAsCover(photo);
    };

    const handleSelectionRename = () => {
        const photo = requireSingleSelectedPhoto('rename');
        if (!photo) return;
        closeSelectionChrome();
        setEditingPhoto(photo);
        setNewPhotoName(photo.filename || '');
        setShowRenameModal(true);
    };

    const handleSelectionReplace = () => {
        const photo = requireSingleSelectedPhoto('replace');
        if (!photo) return;
        closeSelectionChrome();
        setEditingPhoto(photo);
        setShowReplaceModal(true);
    };

    const handleSelectionWatermark = () => {
        const photo = requireSingleSelectedPhoto('watermark');
        if (!photo) return;
        closeSelectionChrome();
        setEditingPhoto(photo);
        setShowWatermarkModal(true);
    };

    const handleSelectionDownload = async () => {
        const sel = getSelectedPhotoRecords();
        if (sel.length === 0) return;
        closeSelectionChrome();
        const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
        if (collection?.download_pin && pinRequiredForSingle) {
            const enteredPin = prompt('Please enter the download PIN to download:');
            if (enteredPin !== collection.download_pin) {
                alert('Incorrect PIN.');
                return;
            }
        }
        try {
            for (let i = 0; i < sel.length; i++) {
                const p = sel[i];
                if (p.full_url) {
                    await downloadPhotoFromR2(p.full_url, p.filename || 'photo.jpg');
                    if (i < sel.length - 1) {
                        await new Promise((r) => setTimeout(r, 350));
                    }
                }
            }
        } catch (err) {
            console.error('Selection download failed:', err);
            alert('Failed to download some photos.');
        }
    };

    const handleGridPhotoReorder = useCallback(
        async (_fromIndex, _toIndex, nextIds) => {
            if (!nextIds?.length) return;

            const draggablePhotos = gridPhotos.filter((p) => !p._uploadPending);
            const byId = new Map(draggablePhotos.map((p) => [p.id, p]));
            const reorderedVisible = nextIds.filter((id) => byId.has(id)).map((id) => byId.get(id));
            if (reorderedVisible.length !== draggablePhotos.length) return;

            const visibleIdSet = new Set(reorderedVisible.map((p) => p.id));
            let visibleIndex = 0;
            const newPoolOrder = sortedPhotos.map((p) => {
                if (!visibleIdSet.has(p.id)) return p;
                return reorderedVisible[visibleIndex++];
            });

            const realPhotos = newPoolOrder.filter((p) => !p._uploadPending);
            const posMap = new Map(realPhotos.map((p, index) => [p.id, index]));
            setPhotos((prev) =>
                prev.map((p) => (posMap.has(p.id) ? { ...p, position: posMap.get(p.id) } : p))
            );
            if (sortOption !== 'custom') setSortOption('custom');
            setCollection((prev) =>
                prev && prev.gallery_photo_sort !== 'custom'
                    ? { ...prev, gallery_photo_sort: 'custom' }
                    : prev
            );

            try {
                await Promise.all(
                    realPhotos.map((p, index) => galleryService.updatePhoto(p.id, { position: index }))
                );
                if (collection?.gallery_photo_sort !== 'custom') {
                    await galleryService.updateCollection(collectionId, { gallery_photo_sort: 'custom' });
                }
            } catch (err) {
                console.error('Grid reorder failed:', err);
                alert('Failed to reorder photos.');
            }
        },
        [collection?.gallery_photo_sort, collectionId, gridPhotos, sortOption, sortedPhotos]
    );

    const isGridPhotoDraggable = useCallback(
        (_index, photo) => Boolean(photo && !photo._uploadPending && !isPhotoAiFilterActive),
        [isPhotoAiFilterActive]
    );

    // Auto-save design settings (cover, type, palette, grid) to deliveries.
    useEffect(() => {
        designPersistRef.current = {
            collectionId,
            selectedCoverStyle,
            selectedFont,
            selectedColorPalette,
            gridSettings,
        };
        if (collectionId && designHydratedRef.current) {
            writeCachedDesignGrid(collectionId, gridSettings, {
                fontFamily: selectedFont,
                colorPalette: selectedColorPalette,
            });
        }

        if (!collection || loading || !designHydratedRef.current || !collectionId) return undefined;

        const saveSettings = async () => {
            try {
                const patch = toDeliveryDesignPatch({
                    coverStyle: selectedCoverStyle,
                    fontFamily: selectedFont,
                    colorPalette: selectedColorPalette,
                    grid: gridSettings,
                });
                const saved = await galleryService.updateCollection(collectionId, patch);
                if (saved) {
                    setCollection((prev) => {
                        if (!prev) return saved;
                        const next = { ...prev, ...saved };
                        if (!saved.cover_focals && prev.cover_focals) {
                            next.cover_focals = prev.cover_focals;
                        }
                        if (prev.cover_url && String(prev.cover_url).includes('coverFocals=') && !String(saved.cover_url || '').includes('coverFocals=')) {
                            next.cover_url = prev.cover_url;
                        }
                        return next;
                    });
                }
            } catch (err) {
                console.error('Error auto-saving settings:', err);
            }
        };

        const timeoutId = setTimeout(saveSettings, 400);
        return () => clearTimeout(timeoutId);
    }, [selectedCoverStyle, selectedFont, selectedColorPalette, gridSettings, collectionId, collection, loading]);

    useEffect(() => {
        const flushDesignSettings = () => {
            if (!designHydratedRef.current) return;
            const snapshot = designPersistRef.current;
            if (!snapshot.collectionId) return;
            const patch = toDeliveryDesignPatch({
                coverStyle: snapshot.selectedCoverStyle,
                fontFamily: snapshot.selectedFont,
                colorPalette: snapshot.selectedColorPalette,
                grid: snapshot.gridSettings,
            });
            void galleryService.updateCollection(snapshot.collectionId, patch).catch(() => {});
        };
        window.addEventListener('pagehide', flushDesignSettings);
        window.addEventListener('beforeunload', flushDesignSettings);
        return () => {
            window.removeEventListener('pagehide', flushDesignSettings);
            window.removeEventListener('beforeunload', flushDesignSettings);
        };
    }, []);

    // Listen for activity updates from gallery tabs
    useEffect(() => {
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.onmessage = (event) => {
            if (event.data?.type === 'ACTIVITY_UPDATED' && event.data?.collectionId === collectionId) {
                console.log('Activity update received, refreshing logs...');
                fetchDownloadActivity();
                fetchEmailRegistrationActivity();
                fetchFavoriteActivity();
            }
        };
        return () => channel.close();
    }, [collectionId]);

    // Auto-save general settings
    useEffect(() => {
        if (!collection || loading || !settingsHydratedRef.current) return;

        const saveGeneralSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    slug: collectionUrl,
                    guest_password_hash: collectionPassword,
                });
            } catch (err) {
                console.error('Error auto-saving general settings:', err);
            }
        };

        const timeoutId = setTimeout(saveGeneralSettings, 1500); // Slightly longer debounce for URL
        return () => clearTimeout(timeoutId);
    }, [collectionUrl, collectionPassword, collectionId, collection, loading]);

    // Auto-save privacy / client exclusive access
    useEffect(() => {
        if (!collection || loading || !settingsHydratedRef.current) return;

        const savePrivacySettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    client_exclusive_enabled: clientExclusiveAccess,
                    client_password_hash: clientPrivatePassword || null,
                    allow_clients_mark_private: allowClientsMarkPrivate,
                    client_only_highlights: clientOnlyHighlights,
                    show_on_showcase: showOnShowcase,
                    privacy: clientExclusiveAccess ? 'client_exclusive' : collection?.privacy === 'client_exclusive' ? 'public' : collection?.privacy,
                });
            } catch (err) {
                console.error('Error auto-saving privacy settings:', err);
            }
        };

        const timeoutId = setTimeout(savePrivacySettings, 1200);
        return () => clearTimeout(timeoutId);
    }, [
        clientExclusiveAccess,
        clientPrivatePassword,
        allowClientsMarkPrivate,
        clientOnlyHighlights,
        showOnShowcase,
        collectionId,
        collection,
        loading,
    ]);

    const showToast = useCallback((message, variant = 'default') => {
        setToastMessage(message);
        setToastVariant(variant);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
            setToastMessage(null);
            setToastVariant('default');
            toastTimerRef.current = null;
        }, 3000);
    }, []);

    const handleCategoryTagsChange = useCallback(
        async (nextTags) => {
            const normalized = categoryTagsToDb(nextTags);
            const prevTags = [...categoryTags];
            const added = normalized.filter(
                (t) => !prevTags.some((p) => p.toLowerCase() === t.toLowerCase())
            );
            setCategoryTags(normalized);
            if (!collectionId || !collection) return;
            setCategoryTagsSaving(true);
            try {
                const updated = await galleryService.updateCollection(collectionId, {
                    category_tags: normalized,
                });
                setCollection((prev) =>
                    prev ? { ...prev, ...updated, category_tags: normalized } : prev
                );
                if (added.length === 1) {
                    showToast(`Category tag “${added[0]}” saved`, 'success');
                } else if (added.length > 1) {
                    showToast(`${added.length} category tags saved`, 'success');
                } else if (normalized.length === 0 && prevTags.length > 0) {
                    showToast('Category tags cleared', 'success');
                } else if (normalized.length !== prevTags.length) {
                    showToast('Category tags updated', 'success');
                }
            } catch (err) {
                console.error('Failed to save category tags:', err);
                setCategoryTags(prevTags);
                if (isMissingDbColumnError(err, 'category_tags')) {
                    showToast(
                        'Category tags require a database update. Apply migration 20260521150000_collections_category_tags.sql in Supabase.',
                        'error'
                    );
                } else {
                    showToast('Failed to save category tags. Please try again.', 'error');
                }
            } finally {
                setCategoryTagsSaving(false);
            }
        },
        [collection, collectionId, categoryTags, showToast]
    );

    const handleDownloadPinEnter = useCallback(
        (pin) => {
            const digits = String(pin || '').replace(/\D/g, '');
            if (digits.length !== 4) {
                showToast('Enter a 4-digit PIN', 'error');
                return;
            }
            setPinValue(digits);
            showToast('PIN set successfully', 'success');
        },
        [showToast]
    );

    const handleSetClientOnlyChange = async (setId, isClientOnly) => {
        setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, is_private: isClientOnly } : s)));
        try {
            const { clientExclusiveAccessService } = await import('../services/clientExclusiveAccess.service');
            await clientExclusiveAccessService.updateSetClientOnly(setId, isClientOnly);
        } catch (err) {
            console.error('Error updating client-only set:', err);
        }
    };

    const photosInSidebarSet = useCallback((set) => {
        if (!set) return [];
        if (set.isHighlights || set.id === 'highlights') return photos.filter((p) => !p.set_id);
        return photos.filter((p) => p.set_id === set.id);
    }, [photos]);

    const persistMobileAppSets = useCallback((next) => {
        setMobileAppSets(next);
        if (!collectionId) return;
        try {
            localStorage.setItem(`pixnxt_mobile_app_sets_${collectionId}`, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    }, [collectionId]);

    const handleDuplicateSet = async (set) => {
        if (!collectionId || !collection?.photographer_id || !set) return;
        const sourcePhotos = photosInSidebarSet(set);
        const baseName = String(set.name || 'Set').replace(/\s+copy$/i, '');
        let nextName = `${baseName} copy`;
        const existing = new Set((sets || []).map((s) => String(s.name || '').toLowerCase()));
        let n = 2;
        while (existing.has(nextName.toLowerCase())) {
            nextName = `${baseName} copy ${n}`;
            n += 1;
        }
        try {
            const { set: created, photos: copied } = await galleryService.duplicateSet({
                collectionId,
                photographerId: collection.photographer_id,
                name: nextName,
                description: set.description || null,
                position: sets.length,
                photos: sourcePhotos,
            });
            setSets((prev) => [...prev, created]);
            if (copied?.length) {
                setPhotos((prev) => [...prev, ...copied]);
            }
            setOrderedSetIds((prev) => {
                if (!prev || prev.length === 0) return prev;
                const next = [...prev, created.id];
                void persistSidebarOrder(collectionId, next);
                return next;
            });
            setShowSetMenu(null);
            setSetMenuAnchor(null);
            setActiveSidebarTab('photos');
            setActiveSetId(created.id);
            showToast(`Duplicated “${set.name}”`, 'success');
        } catch (err) {
            console.error('Failed to duplicate set:', err);
            alert(err?.message || 'Failed to duplicate set. Please try again.');
        }
    };

    const handleToggleSetHidden = async (set, hidden) => {
        if (!set) return;
        if (set.isHighlights || set.id === 'highlights') {
            setClientOnlyHighlights(hidden);
            try {
                await galleryService.updateCollection(collectionId, { client_only_highlights: hidden });
            } catch (err) {
                console.error('Failed to hide Highlights:', err);
            }
            return;
        }
        await handleSetClientOnlyChange(set.id, hidden);
    };

    const handleMoveAllPhotosFromSet = async (fromSet, targetSetId) => {
        const sourcePhotos = photosInSidebarSet(fromSet);
        if (sourcePhotos.length === 0) {
            showToast('This set has no photos to move', 'error');
            return;
        }
        const ids = sourcePhotos.map((p) => p.id);
        try {
            await galleryService.assignPhotosToSet(ids, targetSetId);
            setPhotos((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, set_id: targetSetId } : p)));
            setShowSetMenu(null);
            setSetMenuAnchor(null);
            const targetName = targetSetId
                ? (sets.find((s) => s.id === targetSetId)?.name || 'set')
                : highlightsName;
            showToast(`Moved ${ids.length} photo${ids.length === 1 ? '' : 's'} to ${targetName}`, 'success');
        } catch (err) {
            console.error('Failed to move photos:', err);
            alert('Failed to move photos. Please try again.');
        }
    };

    const handleDownloadSet = async (set) => {
        const sourcePhotos = photosInSidebarSet(set).filter((p) => p.full_url);
        if (sourcePhotos.length === 0) {
            showToast('This set has no photos to download', 'error');
            return;
        }
        setShowSetMenu(null);
        setSetMenuAnchor(null);
        try {
            for (let i = 0; i < sourcePhotos.length; i += 1) {
                const p = sourcePhotos[i];
                await downloadPhotoFromR2(p.full_url, p.filename || 'photo.jpg');
                if (i < sourcePhotos.length - 1) {
                    await new Promise((r) => setTimeout(r, 250));
                }
            }
        } catch (err) {
            console.error('Set download failed:', err);
            alert('Failed to download some photos.');
        }
    };

    const handleToggleSetInApp = (set, enabled) => {
        if (!set) return;
        persistMobileAppSets({ ...mobileAppSets, [set.id]: enabled });
    };

    // Auto-save download settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveDownloadSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    downloads_enabled: photoDownload,
                    download_resolutions: (photoDownloadSizes || [])
                        .map((s) => (s === 'high' ? 'full' : s))
                        .filter((s) => s === 'web' || s === 'full' || s === 'original'),
                    video_downloads_enabled: (photoDownloadSizes || []).includes('video'),
                    download_pin_hash: downloadPin ? pinValue : null,
                    email_capture_enabled: emailRegistration,
                    gallery_download_enabled: galleryDownload,
                    single_photo_download_enabled: singlePhotoDownload,
                    require_pin_for_single_photo: requirePinForSinglePhoto,
                    // Advanced settings
                    download_limit_gallery: downloadLimit ? parseInt(downloadLimit) : null,
                    restrict_to_emails: restrictToEmails || null,
                    selected_download_sets: selectedDownloadSets,
                    pin_usage_limit: pinUsageLimit ? parseInt(pinUsageLimit) : null
                });

                // Broadcast update to open gallery tabs
                const channel = new BroadcastChannel('pixnxt-gallery-update');
                channel.postMessage({
                    type: 'SETTINGS_UPDATED',
                    collectionId,
                    slug: collectionUrl,
                    settings: {
                        downloads_enabled: photoDownload,
                        gallery_download_enabled: galleryDownload,
                        single_photo_download_enabled: singlePhotoDownload,
                        require_pin_for_single_photo: requirePinForSinglePhoto,
                        email_capture_enabled: emailRegistration
                    }
                });
                channel.close();
            } catch (err) {
                console.error('Error auto-saving download settings:', err);
            }
        };

        const timeoutId = setTimeout(saveDownloadSettings, 1000);
        return () => clearTimeout(timeoutId);
    }, [
        photoDownload, galleryDownload, singlePhotoDownload, 
        photoDownloadSizes, downloadPin, pinValue, 
        emailRegistration, requirePinForSinglePhoto, restrictSinglePhotoSizes,
        highResChoice, webSizeChoice, downloadLimit, restrictToEmails,
        selectedDownloadSets, pinUsageLimit,
        collectionId, collection, loading
    ]);

    // Auto-save general gallery visitor settings (slideshow, social sharing)
    useEffect(() => {
        if (!collection || loading || !settingsHydratedRef.current) return;

        const saveGeneralGallerySettings = async () => {
            cacheSlideshowEnabled(collectionId, slideshow);
            const patch = {
                social_sharing_enabled: socialSharing,
                gallery_assist: galleryAssist,
                ...(slideshowColumnReadyRef.current ? { slideshow_enabled: slideshow } : {}),
            };

            const channel = new BroadcastChannel('pixnxt-gallery-update');
            channel.postMessage({
                type: 'SETTINGS_UPDATED',
                collectionId,
                slug: collectionUrl,
                settings: {
                    slideshow_enabled: slideshow,
                    social_sharing_enabled: socialSharing,
                },
            });
            channel.close();

            try {
                const updated = await galleryService.updateCollection(collectionId, patch);

                if (updated) {
                    setCollection((prev) => (prev ? { ...prev, ...updated } : prev));
                }
            } catch (err) {
                console.error('Error auto-saving general gallery settings:', err);
            }
        };

        const timeoutId = setTimeout(saveGeneralGallerySettings, 800);
        return () => clearTimeout(timeoutId);
    }, [
        slideshow,
        socialSharing,
        galleryAssist,
        collectionId,
        collectionUrl,
        collection,
        loading,
    ]);

    // Auto-save favorite settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveFavoriteSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    favorites_enabled: favoritePhotos,
                    favorites_allow_comments: favoriteNotes
                });
            } catch (err) {
                console.error('Error auto-saving favorite settings:', err);
            }
        };

        const timeoutId = setTimeout(saveFavoriteSettings, 1000);
        return () => clearTimeout(timeoutId);
    }, [favoritePhotos, favoriteNotes, collectionId, collection, loading]);

    // Auto-save shop settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveShopSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    store_enabled: storeEnabled
                });
            } catch (err) {
                console.error('Error auto-saving shop settings:', err);
            }
        };

        const timeoutId = setTimeout(saveShopSettings, 1000);
        return () => clearTimeout(timeoutId);
    }, [storeEnabled, collectionId, collection, loading]);

    // Derived values
    const backTo = deliveryStudioBackPath({
        from: location.state?.from,
        folderId: collection?.folder_id,
    });
    const collectionName = collection?.name || 'Loading...';
    const collectionDate = collection?.event_date
        ? formatSidebarDeliveryDate(collection.event_date)
        : collection?.created_at
            ? formatSidebarDeliveryDate(collection.created_at)
            : '...';
    const lastSavedTime = formatLastSavedTime(collection?.updated_at || collection?.created_at);
    const coverDisplayDate = collection?.event_date
        ? formatCoverDate(collection.event_date)
        : collection?.created_at
            ? formatCoverDate(collection.created_at)
            : '';

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (shareRef.current && !shareRef.current.contains(e.target)) setShowShareDropdown(false);
            if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusMenu(false);
            if (
                photoMenuRef.current
                && !photoMenuRef.current.contains(e.target)
                && !e.target.closest?.('.cd-photo-more-btn')
            ) {
                setPhotoMenu(null);
                setPhotoMenuPosition(null);
            }
            if (gridSettingsRef.current && !gridSettingsRef.current.contains(e.target)) setShowGridSettings(false);
            if (moreRef.current && !moreRef.current.contains(e.target)) {
                setShowMoreDropdown(false);
                setShowPresetsSubmenu(false);
            }
            if (!e.target.closest?.('.cd-set-menu-wrapper') && !e.target.closest?.('.cd-set-options')) {
                setShowSetMenu(null);
                setSetMenuAnchor(null);
            }
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false);
            if (selectionMoreRef.current && !selectionMoreRef.current.contains(e.target)) setShowSelectionMore(false);
            if (selectAllMenuRef.current && !selectAllMenuRef.current.contains(e.target)) setShowSelectAllMenu(false);
            if (
                moveToSetRef.current
                && !moveToSetRef.current.contains(e.target)
                && (!moveMenuPortalRef.current || !moveMenuPortalRef.current.contains(e.target))
            ) {
                setShowMoveToSetMenu(false);
            }
            if (
                activeActivityMenu
                && !e.target.closest?.('.activity-row-menu')
                && !e.target.closest?.('.row-action-btn')
            ) {
                setActiveActivityMenu(null);
            }
            if (favoriteDetailToolbarMenuRef.current && !favoriteDetailToolbarMenuRef.current.contains(e.target)) setFavoriteDetailToolbarMenuOpen(false);
            if (favoriteDetailPhotoMenuRef.current && !favoriteDetailPhotoMenuRef.current.contains(e.target)) setFavoriteDetailPhotoMenuPhotoId(null);
            if (favoriteActivitySortMenuRef.current && !favoriteActivitySortMenuRef.current.contains(e.target)) setFavoriteActivitySortMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeActivityMenu, favoriteDetailPhotoMenuPhotoId, favoriteActivitySortMenuOpen]);

    const processSelectedUploadFiles = (fileList, snapshot) => {
        const rawSupportEnabled = isRawUploadEnabled(profile);
        let filesToProcess = Array.from(fileList || []);
        
        if (!rawSupportEnabled) {
            const initialLength = filesToProcess.length;
            filesToProcess = filesToProcess.filter(f => !isRawImageFile(f));
            if (filesToProcess.length < initialLength) {
                alert('RAW photo support is currently disabled in your preferences. Those files have been skipped.');
            }
        }

        const target = snapshot ?? uploadSnapshotRef.current ?? getUploadTargetSnapshot();
        uploadSnapshotRef.current = null;
        if (processFiles(filesToProcess, target)) {
            setShowUploadModal(false);
        }
    };

    const handleFileSelect = (e) => {
        processSelectedUploadFiles(e.target.files);
        e.target.value = '';
    };

    const openMediaFileDialog = (inputRef) => {
        uploadSnapshotRef.current = getUploadTargetSnapshot();
        void pickMediaFilesOrFallback({
            multiple: true,
            fallback: () => inputRef.current?.click(),
        }).then((files) => {
            if (files?.length) processSelectedUploadFiles(files);
        });
    };

    const handleDropzoneClick = () => {
        openMediaFileDialog(fileInputRef);
    };

    const handleDropzoneBrowse = (e) => {
        e?.stopPropagation?.();
        openMediaFileDialog(fileInputRef);
    };

    const handleDropzoneDragOver = (e) => {
        e.preventDefault();
        setIsDraggingDropzone(true);
    };

    const handleDropzoneDragLeave = () => {
        setIsDraggingDropzone(false);
    };

    const handleDropzoneDrop = (e) => {
        e.preventDefault();
        setIsDraggingDropzone(false);
        const mediaFiles = Array.from(e.dataTransfer.files).filter(isUploadableMediaFile);
        if (mediaFiles.length === 0) return;
        processFiles(mediaFiles, getUploadTargetSnapshot());
    };

    const handleModalBrowse = (e) => {
        e?.stopPropagation?.();
        openMediaFileDialog(modalFileInputRef);
    };

    const handleModalDragOver = (e) => {
        e.preventDefault();
        setIsDraggingModal(true);
    };

    const handleModalDragLeave = () => {
        setIsDraggingModal(false);
    };

    const handleModalDrop = (e) => {
        e.preventDefault();
        setIsDraggingModal(false);
        const mediaFiles = Array.from(e.dataTransfer.files).filter(isUploadableMediaFile);
        if (mediaFiles.length === 0) return;
        if (processFiles(mediaFiles, getUploadTargetSnapshot())) {
            setShowUploadModal(false);
        }
    };

    const persistDeliveryStatus = async (nextStatus) => {
        if (!collectionId || statusSaving) return;
        if (nextStatus === status) {
            setShowStatusMenu(false);
            return;
        }
        setStatusSaving(true);
        try {
            const saved = await galleryService.updateCollectionStatus(collectionId, nextStatus, collection);
            const next = uiDeliveryStatus(saved);
            setStatus(next);
            setCollection((prev) => (prev ? { ...prev, ...saved } : saved));
            setShowStatusMenu(false);
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err?.message || 'Could not update delivery status. Please try again.');
        } finally {
            setStatusSaving(false);
        }
    };

    const handleStatusBadgeClick = () => {
        if (statusSaving) return;
        setShowShareDropdown(false);
        setShowMoreDropdown(false);
        setShowPresetsSubmenu(false);
        if (!hasBeenPublished({ status, published_at: collection?.published_at })) {
            void persistDeliveryStatus(DELIVERY_STATUS.published);
            return;
        }
        setShowStatusMenu((open) => !open);
    };

    if (loading) {
        return (
            <div className="theme-mono cd-dashboard-shell flex h-screen items-center justify-center bg-[#F9F9F7]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#111111] font-medium tracking-widest uppercase text-[16px]">Loading Delivery...</p>
                </div>
            </div>
        );
    }

    if (error || !collection) {
        return (
            <div className="theme-mono cd-dashboard-shell flex h-screen items-center justify-center bg-[#F9F9F7]">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                        <h2 className="text-xl font-semibold text-[#111111] mb-2">
                            {error === 'Delivery not found' ? 'Delivery Not Found' : 'Failed to Load Delivery'}
                        </h2>
                        <p className="text-[#666] mb-4">{error || 'This delivery may have been deleted or you may not have permission to access it.'}</p>
                        <Link
                            to={backTo}
                            className="neu-pill inline-flex h-10 items-center rounded-full px-5 text-sm font-medium"
                        >
                            Back to Deliveries
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`cd-layout-container theme-mono cd-dashboard-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

            <div className="cd-shell-header">
                <div className="cd-shell-brand">
                    <Link
                        to={backTo}
                        className="cd-shell-brand__back"
                        aria-label="Back to deliveries"
                        title="Back to Deliveries"
                        onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                            e.preventDefault();
                            navigate(backTo);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </Link>
                    <div className="cd-shell-brand__text">
                        <h1 className="cd-shell-brand__title">{collectionName}</h1>
                        <p className="cd-shell-brand__date">{collectionDate}</p>
                    </div>
                </div>

                <header className="cd-topbar cd-topbar--shell">
                <div className="cd-topbar-left">
                    <div className="cd-status-wrap" ref={statusRef}>
                        <button
                            type="button"
                            className={`cd-status-badge ${
                                status === DELIVERY_STATUS.published
                                    ? 'cd-status-badge--published published'
                                    : status === DELIVERY_STATUS.archived
                                        ? 'cd-status-badge--hidden'
                                        : ''
                            }`}
                            aria-haspopup={hasBeenPublished({ status, published_at: collection?.published_at }) ? 'menu' : undefined}
                            aria-expanded={showStatusMenu}
                            disabled={statusSaving}
                            title={
                                hasBeenPublished({ status, published_at: collection?.published_at })
                                    ? 'Change delivery status'
                                    : 'Publish this delivery'
                            }
                            onClick={handleStatusBadgeClick}
                        >
                            <span>{statusSaving ? 'Saving…' : deliveryStatusLabel(status)}</span>
                            {hasBeenPublished({ status, published_at: collection?.published_at }) ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="6 9 12 15 18 9"></polyline></svg>
                            ) : null}
                        </button>
                        {showStatusMenu ? (
                            <div className="cd-status-dropdown" role="menu">
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={status === DELIVERY_STATUS.published}
                                    className={`cd-status-option ${status === DELIVERY_STATUS.published ? 'is-active' : ''}`}
                                    onClick={() => void persistDeliveryStatus(DELIVERY_STATUS.published)}
                                >
                                    Published
                                </button>
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={status === DELIVERY_STATUS.archived}
                                    className={`cd-status-option ${status === DELIVERY_STATUS.archived ? 'is-active' : ''}`}
                                    onClick={() => void persistDeliveryStatus(DELIVERY_STATUS.archived)}
                                >
                                    Hidden
                                </button>
                            </div>
                        ) : null}
                    </div>
                    {lastSavedTime ? (
                        <span className="cd-topbar-save">All changes saved · {lastSavedTime}</span>
                    ) : null}
                </div>

                <div className="cd-topbar-right">
                    <div className="cd-more-wrapper" ref={moreRef}>
                        <button
                            type="button"
                            className="cd-topbar-btn"
                            aria-expanded={showMoreDropdown}
                            aria-haspopup="menu"
                            onClick={() => {
                                setShowShareDropdown(false);
                                setShowStatusMenu(false);
                                if (showMoreDropdown) {
                                    setShowMoreDropdown(false);
                                    setShowPresetsSubmenu(false);
                                } else {
                                    setShowMoreDropdown(true);
                                }
                            }}
                        >
                            More <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {showMoreDropdown && (
                            <div className="cd-more-dropdown" role="menu">
                                <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowGetDirectLinkModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Get direct link</span>
                                </button>
                                <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowEmailHistoryModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M3.32 14A9 9 0 1 0 3 10l-2 1" /></svg>
                                    <span>View email history</span>
                                </button>
                                <div className={`cd-ctx-item--has-flyout ${showPresetsSubmenu ? 'is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="cd-ctx-item-trigger"
                                        aria-expanded={showPresetsSubmenu}
                                        aria-haspopup="menu"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPresetsSubmenu((open) => !open);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="12" y2="12" /></svg>
                                        <span>Manage presets</span>
                                        <svg className="cd-ctx-item-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6" /></svg>
                                    </button>
                                    {showPresetsSubmenu && (
                                        <div className="cd-preset-flyout" role="menu" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowApplyPresetModal(true); }}>
                                                <span>Apply preset</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowSavePresetModal(true); }}>
                                                <span>Save as preset</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowMoveToModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 12H3" /><path d="m11 18 6-6-6-6" /><path d="M21 5v14" /></svg>
                                    <span>Move to</span>
                                </button>
                                <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowDuplicateModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    <span>Duplicate</span>
                                </button>
                                <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowDeleteCollectionModal(true); setDeleteCollectionConfirm(false); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    <span>Delete delivery</span>
                                </button>
                            </div>
                        )}
                    </div>
                    {collection?.guest_delivery_enabled && (
                        <button
                            className="cd-text-btn cd-gd-qr-btn"
                            title="Guest registration"
                            onClick={() => setShowGdQrModal(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="14.01"/><line x1="21" y1="21" x2="21" y2="21.01"/><line x1="17" y1="21" x2="17" y2="21.01"/></svg>
                        </button>
                    )}
                    <button
                        className="cd-topbar-btn"
                        onClick={handlePreviewAsClient}
                    >
                        Preview
                    </button>
                    <div className="cd-share-wrapper" ref={shareRef}>
                        <button
                            type="button"
                            className="cd-topbar-btn"
                            aria-expanded={showShareDropdown}
                            aria-haspopup="menu"
                            onClick={() => {
                                setShowMoreDropdown(false);
                                setShowPresetsSubmenu(false);
                                setShowStatusMenu(false);
                                setShowShareDropdown(!showShareDropdown);
                            }}
                        >
                            Share <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {showShareDropdown && (
                            <div className="cd-share-dropdown">
                                <div
                                    className="cd-share-item"
                                    onClick={() => {
                                        setShowShareDropdown(false);
                                        navigate(`/deliveries/manage/share?id=${collectionId}`);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>Share by email</span>
                                </div>
                                <div
                                    className="cd-share-item"
                                    onClick={() => {
                                        setShowShareDropdown(false);
                                        setShowGetDirectLinkModal(true);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Get direct link</span>
                                </div>
                                <div
                                    className="cd-share-item"
                                    onClick={() => {
                                        setShowShareDropdown(false);
                                        setShowQrCodeModal(true);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                                    <span>Get QR code</span>
                                </div>
                                <div
                                    className="cd-share-item"
                                    onClick={() => {
                                        setShowShareDropdown(false);
                                        if (collectionUrl) {
                                            openWhatsAppShare(getCollectionShareUrl(collectionUrl), collection?.name || 'Delivery');
                                        }
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor" /></svg>
                                    <span>Share on WhatsApp</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {collection?.guest_delivery_enabled && gdEvent && (gdGuestCount || gdEvent?.guest_count) > 0 ? (
                        <button
                            type="button"
                            className="cd-topbar-btn cd-topbar-btn--primary"
                            onClick={() => {
                                setShowShareDropdown(false);
                                setShowMoreDropdown(false);
                                setActiveSidebarTab('guests');
                            }}
                        >
                            Send to {(gdGuestCount || gdEvent?.guest_count || 0).toLocaleString()} guests
                        </button>
                    ) : null}
                    {collection?.guest_delivery_enabled && gdEvent && (
                        <button
                            className="cd-text-btn cd-gd-publish-btn"
                            disabled={gdPublishing}
                            onClick={handlePublishGuestDelivery}
                        >
                            {gdPublishing ? 'Publishing…' : 'Publish Guest Delivery'}
                        </button>
                    )}
                </div>
            </header>
            </div>

            <div className="cd-layout-body">
                <CollectionDashboardSidebar
                    coverUrl={collection?.cover_url}
                    coverFocalX={collectionFocals.desktop?.x ?? collectionFocal.x}
                    coverFocalY={collectionFocals.desktop?.y ?? collectionFocal.y}
                    isCoverUploading={isCoverUploading}
                    onCoverPhotoDrop={handleCoverPhotoDropById}
                    onSelectCoverFromCollection={() =>
                        openCoverModal('all', collection?.cover_url ? 'edit' : 'pick')
                    }
                    onCoverFileSelect={(file) => void handleCoverFileSelect(file)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    activeSidebarTab={activeSidebarTab}
                    onSidebarTabChange={setActiveSidebarTab}
                    sortedSidebarSets={sortedSidebarSets.map((s) => (
                        s.isHighlights ? { ...s, isPrivate: clientOnlyHighlights === true } : s
                    ))}
                    activeSetId={activeSetId}
                    onSetSelect={setActiveSetId}
                    onAddSet={() => setShowAddSetModal(true)}
                    draggedSetIndex={draggedSetIndex}
                    dragOverSetIndex={dragOverSetIndex}
                    onSetDragStart={handleSetDragStart}
                    onSetDragOver={handleSetDragOver}
                    onSetDragEnd={handleSetDragEnd}
                    onSetDrop={handleSetDrop}
                    showSetMenu={showSetMenu}
                    onSetMenuToggle={(setId, anchor) => {
                        if (showSetMenu === setId) {
                            setShowSetMenu(null);
                            setSetMenuAnchor(null);
                        } else {
                            setShowSetMenu(setId);
                            setSetMenuAnchor(anchor || null);
                        }
                    }}
                    renderSetMenu={(set) => {
                        const setPhotos = photosInSidebarSet(set);
                        const bytes = setPhotos.reduce((sum, p) => sum + (Number(p.size_bytes) || 0), 0);
                        const gb = bytes / (1024 * 1024 * 1024);
                        const sizeLabel = gb >= 0.1
                            ? `${gb.toFixed(1)} GB`
                            : bytes >= 1024 * 1024
                                ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`
                                : '0 GB';
                        const hidden = set.isHighlights
                            ? clientOnlyHighlights
                            : set.isPrivate === true;
                        const visibleCount = sortedSidebarSets.filter((s) => (
                            s.isHighlights ? !clientOnlyHighlights : s.isPrivate !== true
                        )).length;
                        return (
                            <SetOptionsMenu
                                set={set}
                                photoCount={set.photoCount ?? setPhotos.length}
                                visibleSetCount={visibleCount}
                                otherSets={sortedSidebarSets.filter((s) => s.id !== set.id)}
                                hidden={hidden}
                                inApp={mobileAppSets[set.id] !== false}
                                sizeLabel={sizeLabel}
                                anchorEl={setMenuAnchor}
                                onRename={() => {
                                    setShowSetMenu(null);
                                    setSetMenuAnchor(null);
                                    if (set.isHighlights) {
                                        openEditSetModal({
                                            id: 'highlights',
                                            name: highlightsName,
                                            description: collection?.description || '',
                                        });
                                    } else {
                                        openEditSetModal(set);
                                    }
                                }}
                                onDuplicate={() => handleDuplicateSet(set)}
                                onToggleHidden={(nextHidden) => handleToggleSetHidden(set, nextHidden)}
                                onMoveAllTo={(targetId) => handleMoveAllPhotosFromSet(
                                    set,
                                    targetId === 'highlights' ? null : targetId
                                )}
                                onDownload={() => handleDownloadSet(set)}
                                onToggleInApp={(enabled) => handleToggleSetInApp(set, enabled)}
                                onDelete={() => {
                                    setShowSetMenu(null);
                                    setSetMenuAnchor(null);
                                    handleDeleteSet(set.isHighlights ? 'highlights' : set.id);
                                }}
                                onClose={() => {
                                    setShowSetMenu(null);
                                    setSetMenuAnchor(null);
                                }}
                            />
                        );
                    }}
                    activeDesignTab={activeDesignTab}
                    onDesignTabChange={setActiveDesignTab}
                    activeSettingsTab={activeSettingsTab}
                    onSettingsTabChange={setActiveSettingsTab}
                    activeActivitySubTab={activeActivitySubTab}
                    onActivitySubTabChange={setActiveActivitySubTab}
                    photoCount={totalMediaCounts.photos}
                    filmCount={totalMediaCounts.videos}
                    guestCount={gdGuestCount || gdEvent?.guest_count || 0}
                    activityCount={sidebarActivityCount}
                    guestDeliveryEnabled={collection?.guest_delivery_enabled}
                    photoDownload={photoDownload}
                    favoritePhotos={favoritePhotos}
                    storeEnabled={storeEnabled}
                />

                {/* Main Content Wrapper */}
                <div className="cd-main-wrapper">
                    <main className={`cd-main-area${activeSidebarTab === 'photos' ? ' cd-main-area--photos' : ''}${activeSidebarTab === 'design' ? ' cd-main-area--design' : ''}${activeSidebarTab === 'guests' ? ' cd-main-area--guests' : ''}${activeSidebarTab === 'activity' ? ' cd-main-area--activity' : ''}${activeSidebarTab === 'settings' ? ' cd-main-area--settings' : ''}`}>
                        {activeSidebarTab === 'photos' && (
                            <>
                                <CollectionPhotosWorkspaceHeader
                                    setName={activeSetName}
                                    countLabel={activeSetCountLabel}
                                    searchQuery={photoSearchQuery}
                                    onSearchQueryChange={setPhotoSearchQuery}
                                    sortField={photoSortField}
                                    sortReverse={photoSortReverse}
                                    onSortFieldChange={handlePhotoSortFieldChange}
                                    onSortReverseChange={handlePhotoSortReverseChange}
                                    showFilename={showFilename}
                                    onShowFilenameChange={(nextValue) => {
                                        setShowFilename(nextValue);
                                        localStorage.setItem('filename_display', nextValue ? 'show' : 'hide');
                                    }}
                                    showCameraBadges={showCameraBadges}
                                    onShowCameraBadgesChange={(nextValue) => {
                                        setShowCameraBadges(nextValue);
                                        localStorage.setItem('cd_show_camera_badges', nextValue ? '1' : '0');
                                    }}
                                    showUnmatchedPeople={showUnmatchedPeople}
                                    onShowUnmatchedPeopleChange={setShowUnmatchedPeople}
                                    showClientFavorited={showClientFavorited}
                                    onShowClientFavoritedChange={(nextValue) => {
                                        setShowClientFavorited(nextValue);
                                        localStorage.setItem('cd_show_client_favorited', nextValue ? '1' : '0');
                                    }}
                                    showInSelectionList={showInSelectionList}
                                    onShowInSelectionListChange={(nextValue) => {
                                        setShowInSelectionList(nextValue);
                                        localStorage.setItem('cd_show_selection_list', nextValue ? '1' : '0');
                                    }}
                                    sharingOverlaysEnabled={sharingOverlaysEnabled}
                                    onAddMedia={() => setShowUploadModal(true)}
                                    people={photoAiPeople}
                                    activePersonId={activePersonId}
                                    onSelectPerson={(id) => {
                                        setActivePersonId((current) => (current === id ? null : id));
                                        setSelfieMatchPhotoIds([]);
                                        setSelfieMessage('');
                                        setSelfiePreview('');
                                    }}
                                    onClearPerson={() => {
                                        setActivePersonId(null);
                                        handleClearSelfie();
                                    }}
                                    loadingPeople={photoAiLoadingPeople}
                                    analyzing={photoAiIndexing}
                                    indexedCount={photoAiRows.length}
                                />

                                {gridPhotos.length > 0 ? (
                                    <CollectionPhotoSortableGrid
                                        gridRef={photosGridRef}
                                        photos={gridPhotos}
                                        disabled={isPhotoAiFilterActive}
                                        className={`cd-photo-grid cd-photo-grid--manage ${gridSize === 'large' ? 'grid-large' : ''}${showFilename ? ' cd-photo-grid--filenames' : ''}`}
                                        onReorder={handleGridPhotoReorder}
                                        isDraggable={isGridPhotoDraggable}
                                        renderPhoto={(photo, index, { isDragging, consumeClick }) => {
                                            const cols = gridSize === 'large' ? 4 : 6;
                                            const menuAlignLeft = index % cols >= Math.ceil(cols / 2);
                                            const isPending = Boolean(photo._uploadPending);
                                            return (
                                            <div
                                                className={`cd-photo-card ${selectedPhotos.includes(photo.id) ? 'selected' : ''} ${photoMenu === photo.id ? 'cd-photo-card--menu-open' : ''} ${photo.is_starred ? 'cd-photo-card--starred' : ''} ${photo.is_private ? 'cd-photo-card--hidden' : ''} ${isPending ? 'cd-photo-card--pending' : ''}${isDragging ? ' cd-photo-card--sort-dragging' : ''}`}
                                                onClick={() => {
                                                    if (consumeClick?.()) return;
                                                    togglePhotoSelection(photo.id);
                                                }}
                                            >
                                                <div className="cd-photo-card-inner cd-photo-card-inner--contain">
                                                    <div className="cd-photo-thumb-shell">
                                                        <CollectionGridPhoto
                                                            photo={photo}
                                                            index={index}
                                                            containInCell
                                                        />
                                                        {showCameraBadges && photo.exif_camera ? (
                                                            <span className="cd-photo-overlay-badge cd-photo-overlay-badge--camera">
                                                                {photo.exif_camera}
                                                            </span>
                                                        ) : null}
                                                        {showClientFavorited && clientFavoritedPhotoIds.has(photo.id) ? (
                                                            <span className="cd-photo-overlay-badge cd-photo-overlay-badge--fav">
                                                                Favourited
                                                            </span>
                                                        ) : null}
                                                        {showInSelectionList && selectionListPhotoIds.has(photo.id) ? (
                                                            <span className="cd-photo-overlay-badge cd-photo-overlay-badge--list">
                                                                In list
                                                            </span>
                                                        ) : null}
                                                        {photo.is_private ? (
                                                            <span className="cd-photo-overlay-badge cd-photo-overlay-badge--hidden">
                                                                Hidden
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {!isPending && (
                                                    <>
                                                    <button
                                                        type="button"
                                                        className={`cd-photo-check ${selectedPhotos.includes(photo.id) ? 'is-checked' : ''}`}
                                                        aria-label={selectedPhotos.includes(photo.id) ? 'Deselect photograph' : 'Select photograph'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePhotoSelection(photo.id);
                                                        }}
                                                    >
                                                        {selectedPhotos.includes(photo.id) ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        ) : null}
                                                    </button>
                                                    <div className="cd-photo-hover-tools">
                                                        <button
                                                            type="button"
                                                            className={`cd-photo-star ${photo.is_starred ? 'active' : ''}`}
                                                            aria-label={photo.is_starred ? 'Unstar photograph' : 'Star photograph'}
                                                            onClick={(e) => { e.stopPropagation(); handleToggleStar(photo.id, photo.is_starred); }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={photo.is_starred ? "#FFC107" : "none"} stroke={photo.is_starred ? "#FFC107" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="cd-photo-more-btn"
                                                            aria-haspopup="menu"
                                                            aria-expanded={photoMenu === photo.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openPhotoMenuFor(
                                                                    photo.id,
                                                                    e.currentTarget,
                                                                    menuAlignLeft,
                                                                    selectedPhotos.length > 0 ? SELECTION_TOOLBAR_RESERVE : 0
                                                                );
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="12" cy="19" r="1.6"></circle></svg>
                                                        </button>
                                                    </div>
                                                    </>
                                                    )}
                                                </div>
                                                {showFilename && (
                                                    <div
                                                        className="cd-photo-filename"
                                                        title={photo.filename || `photo-${index + 1}.jpg`}
                                                    >
                                                        <span className="cd-filename-text">{photo.filename || `photo-${index + 1}.jpg`}</span>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        }}
                                    />
                                ) : sortedPhotos.length > 0 ? (
                                    <p className="cd-media-filter-empty">
                                        {photoSearchQuery.trim()
                                            ? 'No photos match your search'
                                            : 'No matching photos'}
                                    </p>
                                ) : (
                                    <div
                                        className={`cd-dropzone ${isDraggingDropzone ? 'dragging' : ''}`}
                                        onClick={handleDropzoneClick}
                                        onDragOver={handleDropzoneDragOver}
                                        onDragLeave={handleDropzoneDragLeave}
                                        onDrop={handleDropzoneDrop}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept={MEDIA_FILE_INPUT_ACCEPT}
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                        <div className="cd-dropzone-content">
                                            <div className="cd-drop-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cfd5d8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                                                    <path d="M8 2h12a2 2 0 0 1 2 2v10"></path>
                                                    <circle cx="15" cy="15" r="5" fill="#fff" stroke="#cfd5d8"></circle>
                                                    <line x1="15" y1="12" x2="15" y2="18"></line>
                                                    <line x1="12" y1="15" x2="18" y2="15"></line>
                                                </svg>
                                            </div>
                                            <p className="cd-drop-title">Drag photos and videos here to upload</p>
                                            <p className="cd-drop-subtitle">
                                                or{' '}
                                                <span
                                                    className="cd-browse-link"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={handleDropzoneBrowse}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleDropzoneBrowse(e);
                                                        }
                                                    }}
                                                >
                                                    Browse files
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeSidebarTab === 'films' && (
                            <DeliveryFilmsView
                                films={deliveryFilms}
                                videoDownloadEnabled={videoDownloadEnabled}
                                onAddFilm={() => setShowUploadModal(true)}
                                onPreviewAsClient={handlePreviewAsClient}
                                onFilmMenu={(film, anchorEl) => {
                                    openPhotoMenuFor(film.id, anchorEl, false, 0);
                                }}
                            />
                        )}

                        {/* --- DESIGN VIEW --- */}
                        {activeSidebarTab === 'design' && (
                            <div className="cd-design-split-view">
                                <PreviewPane
                                    dualPreview
                                    settings={{
                                        coverStyle: selectedCoverStyle,
                                        fontFamily: selectedFont,
                                        colorPalette: selectedColorPalette,
                                        grid: gridSettings
                                    }}
                                    collectionTitle={collection?.name || 'My Delivery'}
                                    collectionDate={coverDisplayDate}
                                    collectionDescription={
                                        activeSetId
                                            ? sets.find((s) => s.id === activeSetId)?.description || ''
                                            : (collection?.description || sets[0]?.description || '')
                                    }
                                    coverPhotoUrl={stripMediaUrlHash(collection?.cover_url || '') || (photos.length > 0 ? photos[0].full_url : null)}
                                    gridPhotos={photos}
                                    previewMode={previewMode}
                                    onPreviewModeChange={setPreviewMode}
                                    photographerName={profile?.business_name || user?.display_name || 'PHOTOGRAPHER'}
                                    coverLogoUrl={profile?.cover_logo_url || ''}
                                    dashboardState={{
                                        focalX: collectionFocals.desktop?.x ?? collectionFocal.x,
                                        focalY: collectionFocals.desktop?.y ?? collectionFocal.y,
                                        coverFocals: collectionFocals,
                                        activeSetId: activeSetId,
                                        sets: sets,
                                        highlightsName,
                                        sidebarSetOrder: orderedSetIds,
                                        collection: {
                                            ...collection,
                                            highlights_enabled: highlightsEnabled,
                                            store_enabled: storeEnabled,
                                            sidebar_set_order:
                                                orderedSetIds ?? collection?.sidebar_set_order ?? null,
                                        },
                                        photoDownload: photoDownload,
                                        galleryDownload: galleryDownload,
                                        singlePhotoDownload: singlePhotoDownload,
                                        favoritePhotos: favoritePhotos,
                                        socialSharing: socialSharing,
                                        slideshow: slideshow,
                                        downloadPin: downloadPin,
                                        pinValue: pinValue,
                                        requirePinForSinglePhoto: requirePinForSinglePhoto,
                                        emailTracking: emailRegistration,
                                        galleryPhotoSort: sortOption,
                                        selectedDownloadSets,
                                    }}
                                    onSetActiveSet={setActiveSetId}
                                />
                                <DesignTab
                                    settings={{
                                        coverStyle: selectedCoverStyle,
                                        fontFamily: selectedFont,
                                        colorPalette: selectedColorPalette,
                                        grid: gridSettings
                                    }}
                                    coverPhotoUrl={stripMediaUrlHash(collection?.cover_url || '') || (photos.length > 0 ? photos[0].full_url : null)}
                                    coverFocalX={collectionFocals.desktop?.x ?? collectionFocal.x}
                                    coverFocalY={collectionFocals.desktop?.y ?? collectionFocal.y}
                                    onSettingsChange={(newSettings) => {
                                        setSelectedCoverStyle(newSettings.coverStyle);
                                        setSelectedFont(normalizeFontId(newSettings.fontFamily));
                                        setSelectedColorPalette(normalizePaletteId(newSettings.colorPalette));
                                        setGridSettings(newSettings.grid);
                                    }}
                                    onOpenCoverModal={() => openCoverModal('all', 'pick')}
                                    onOpenFocalModal={() =>
                                        openCoverModal('all', collection?.cover_url ? 'edit' : 'pick')
                                    }
                                />
                            </div>
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'general' && (
                            <GeneralSettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
                                profile={profile}
                                collectionUrl={collectionUrl}
                                setCollectionUrl={setCollectionUrl}
                                defaultWatermark={defaultWatermark}
                                setDefaultWatermark={setDefaultWatermark}
                                autoExpiry={autoExpiry}
                                setAutoExpiry={setAutoExpiry}
                                setShowExpiryReminderModal={setShowExpiryReminderModal}
                                expiryReminders={expiryReminders}
                                onEditReminder={openEditReminder}
                                onDeleteReminder={handleDeleteReminder}
                                onAddReminder={openAddReminder}
                                onRemindersChange={fetchReminders}
                                emailRegistration={emailRegistration}
                                setEmailRegistration={setEmailRegistration}
                                galleryAssist={galleryAssist}
                                setGalleryAssist={setGalleryAssist}
                                slideshow={slideshow}
                                setSlideshow={setSlideshow}
                                socialSharing={socialSharing}
                                setSocialSharing={setSocialSharing}
                                language={language}
                                setLanguage={setLanguage}
                                categoryTags={categoryTags}
                                onCategoryTagsChange={handleCategoryTagsChange}
                                categoryTagsSaving={categoryTagsSaving}
                                showGeneralAdditionalOptions={showGeneralAdditionalOptions}
                                setShowGeneralAdditionalOptions={setShowGeneralAdditionalOptions}
                            />
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'privacy' && (
                            <PrivacySettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
                                collectionUrl={collectionUrl}
                                profile={profile}
                                emailRegistration={emailRegistration}
                                setEmailRegistration={setEmailRegistration}
                                downloadPin={downloadPin}
                                pinValue={pinValue}
                                defaultWatermark={defaultWatermark}
                                watermarks={watermarks}
                                onSelectWatermark={handleSelectDefaultWatermark}
                                collectionPassword={collectionPassword}
                                setCollectionPassword={setCollectionPassword}
                                showOnShowcase={showOnShowcase}
                                setShowOnShowcase={setShowOnShowcase}
                                clientExclusiveAccess={clientExclusiveAccess}
                                setClientExclusiveAccess={setClientExclusiveAccess}
                                clientPrivatePassword={clientPrivatePassword}
                                setClientPrivatePassword={setClientPrivatePassword}
                                allowClientsMarkPrivate={allowClientsMarkPrivate}
                                setAllowClientsMarkPrivate={setAllowClientsMarkPrivate}
                                clientOnlyHighlights={clientOnlyHighlights}
                                setClientOnlyHighlights={setClientOnlyHighlights}
                                clientOnlySets={(sets || [])
                                    .filter((s) => s.name?.toLowerCase() !== 'highlights')
                                    .map((s) => ({
                                        id: s.id,
                                        name: s.name,
                                        isClientOnly: Boolean(s.is_private),
                                    }))}
                                onSetClientOnlyChange={handleSetClientOnlyChange}
                            />
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'download' && (
                            <DownloadSettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
                                photos={photos}
                                photoDownloadSizes={photoDownloadSizes}
                                setPhotoDownloadSizes={setPhotoDownloadSizes}
                                highResChoice={highResChoice}
                                setHighResChoice={setHighResChoice}
                                webSizeChoice={webSizeChoice}
                                setWebSizeChoice={setWebSizeChoice}
                                photoDownload={photoDownload}
                                setPhotoDownload={setPhotoDownload}
                                galleryDownload={galleryDownload}
                                setGalleryDownload={setGalleryDownload}
                                singlePhotoDownload={singlePhotoDownload}
                                setSinglePhotoDownload={setSinglePhotoDownload}
                                requirePinForSinglePhoto={requirePinForSinglePhoto}
                                setRequirePinForSinglePhoto={setRequirePinForSinglePhoto}
                                emailRegistration={emailRegistration}
                                setEmailRegistration={setEmailRegistration}
                                restrictSinglePhotoSizes={restrictSinglePhotoSizes}
                                setRestrictSinglePhotoSizes={setRestrictSinglePhotoSizes}
                                downloadPin={downloadPin}
                                setDownloadPin={setDownloadPin}
                                pinValue={pinValue}
                                setPinValue={setPinValue}
                                onPinEnter={handleDownloadPinEnter}
                                downloadLimit={downloadLimit}
                                setDownloadLimit={setDownloadLimit}
                                restrictToEmails={restrictToEmails}
                                setRestrictToEmails={setRestrictToEmails}
                                selectedDownloadSets={selectedDownloadSets}
                                setSelectedDownloadSets={setSelectedDownloadSets}
                                sets={sets}
                                pinUsageLimit={pinUsageLimit}
                                setPinUsageLimit={setPinUsageLimit}
                                setActiveSidebarTab={setActiveSidebarTab}
                                setActiveActivitySubTab={setActiveActivitySubTab}
                            />
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'favorite' && (
                            <FavoriteSettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
                                collectionUrl={collectionUrl}
                                profile={profile}
                                favoritePhotos={favoritePhotos}
                                setFavoritePhotos={setFavoritePhotos}
                                favoriteNotes={favoriteNotes}
                                setFavoriteNotes={setFavoriteNotes}
                                favoriteLists={sortedFavoriteActivity}
                                onReviewList={handleReviewFavoriteList}
                                onEditList={openEditFavoriteListModal}
                                setShowCreateFavoriteListModal={setShowCreateFavoriteListModal}
                                setActiveSidebarTab={setActiveSidebarTab}
                                setActiveActivitySubTab={setActiveActivitySubTab}
                            />
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'shop' && (
                            <StoreSettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
                                storeEnabled={storeEnabled}
                                setStoreEnabled={setStoreEnabled}
                                setActiveSidebarTab={setActiveSidebarTab}
                                setActiveActivitySubTab={setActiveActivitySubTab}
                            />
                        )}

                        {activeSidebarTab === 'activity' && (
                        <ActivityView
                            activeActivityMenu={activeActivityMenu}
                            activeActivitySubTab={activeActivitySubTab}
                            activeDownloadActivityTab={activeDownloadActivityTab}
                            collection={collection}
                            downloadActivity={downloadActivity}
                            favoriteActivity={favoriteActivity}
                            favoriteActivitySortMenuOpen={favoriteActivitySortMenuOpen}
                            favoriteDetailLoading={favoriteDetailLoading}
                            favoriteDetailPhotoMenuPhotoId={favoriteDetailPhotoMenuPhotoId}
                            favoriteDetailSort={favoriteDetailSort}
                            favoriteDetailToolbarMenuOpen={favoriteDetailToolbarMenuOpen}
                            handleDeleteFavoriteActivity={handleDeleteFavoriteActivity}
                            handleDownloadAllFavoriteList={handleDownloadAllFavoriteList}
                            handleExportFavoriteList={handleExportFavoriteList}
                            handleFavoriteDetailRowDownload={handleFavoriteDetailRowDownload}
                            handleLightroomCopyList={handleLightroomCopyList}
                            handleRemovePhotoFromFavoriteList={handleRemovePhotoFromFavoriteList}
                            highlightsName={highlightsName}
                            openEditFavoriteListModal={openEditFavoriteListModal}
                            selectedDownloadId={selectedDownloadId}
                            selectedFavoriteListId={selectedFavoriteListId}
                            setActiveActivityMenu={setActiveActivityMenu}
                            setActiveDownloadActivityTab={setActiveDownloadActivityTab}
                            setFavoriteActivitySortMenuOpen={setFavoriteActivitySortMenuOpen}
                            setFavoriteDetailPhotoMenuPhotoId={setFavoriteDetailPhotoMenuPhotoId}
                            setFavoriteDetailSort={setFavoriteDetailSort}
                            setFavoriteDetailToolbarMenuOpen={setFavoriteDetailToolbarMenuOpen}
                            setSelectedDownloadId={setSelectedDownloadId}
                            setShowCreateFavoriteListModal={setShowCreateFavoriteListModal}
                            sets={sets}
                            activeSidebarTab={activeSidebarTab}
                            setActiveSidebarTab={setActiveSidebarTab}
                            photos={photos}
                            setDownloadDetailToolbarMenuOpen={setDownloadDetailToolbarMenuOpen}
                            handleExportActivity={handleExportActivity}
                            filteredDownloadActivityForTab={filteredDownloadActivityForTab}
                            handleDeleteAllDownloadActivity={handleDeleteAllDownloadActivity}
                            handleExportDownloadActivityExcel={handleExportDownloadActivityExcel}
                            handleExportDownloadActivityPdf={handleExportDownloadActivityPdf}
                            downloadDetailPhotos={downloadDetailPhotos}
                            loadingActivity={loadingActivity}
                            storeOrders={storeOrders}
                            storeOrderItems={storeOrderItems}
                            storeOrdersLoading={storeOrdersLoading}
                            emailRegistrationActivity={emailRegistrationActivity}
                            galleryOpenActivity={galleryOpenActivity}
                            guestDeliveryGuests={guestDeliveryGuests}
                            favoriteActivitySortMenuRef={favoriteActivitySortMenuRef}
                            favoriteActivityMenuRef={favoriteActivityMenuRef}
                            favoriteDetailToolbarMenuRef={favoriteDetailToolbarMenuRef}
                            favoriteDetailPhotoMenuRef={favoriteDetailPhotoMenuRef}
                            favoriteActivitySortMode={favoriteActivitySortMode}
                            favoriteActivitySortTriggerLabel={favoriteActivitySortTriggerLabel}
                            favoriteDetailRows={favoriteDetailRows}
                            handleDeleteActivity={handleDeleteActivity}
                            setEditingFavoriteList={setEditingFavoriteList}
                            setFavoriteActivitySortMode={setFavoriteActivitySortMode}
                            setFavoriteDetailRows={setFavoriteDetailRows}
                            setFavoriteListDesc={setFavoriteListDesc}
                            setFavoriteListEmail={setFavoriteListEmail}
                            setFavoriteListMax={setFavoriteListMax}
                            setFavoriteListName={setFavoriteListName}
                            setSelectedFavoriteListId={setSelectedFavoriteListId}
                            sortedFavoriteActivity={sortedFavoriteActivity}
                        />
                        )}

                        {activeSidebarTab === 'guests' && collection?.guest_delivery_enabled && (
                            <div className="cd-guests-main">
                                {gdEvent ? (
                                    <EventGuestsPanel
                                        key={gdEvent.id}
                                        event={gdEvent}
                                        photographerId={gdEvent.photographer_id || collection?.photographer_id || user?.id}
                                        onGuestCountChange={setGdGuestCount}
                                    />
                                ) : (
                                    <p className="gd-muted">Loading guest delivery…</p>
                                )}
                            </div>
                        )}
                    </main>

                    {photoMenu && photoMenuPosition && (() => {
                        const menuPhoto = gridPhotos.find((p) => p.id === photoMenu) || photos.find((p) => p.id === photoMenu);
                        if (!menuPhoto) return null;
                        const menuIndex = gridPhotos.findIndex((p) => p.id === menuPhoto.id);
                        const peopleCount = peopleInPhoto(menuPhoto.id, photoAiPeople, photoAiMetadataMap).length;
                        const isCover = Boolean(
                            (collection?.cover_photo_id && String(collection.cover_photo_id) === String(menuPhoto.id))
                            || coverPhoto?.id === menuPhoto.id
                        );
                        return createPortal(
                            <div
                                className={`cd-photo-menu cd-photo-menu--portal cd-photo-menu--pixnxt${photoMenuAlignLeft ? ' cd-photo-menu--align-left' : ''}`}
                                ref={photoMenuRef}
                                role="menu"
                                style={photoMenuPosition}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <PhotoOptionsMenu
                                    photo={menuPhoto}
                                    photographNumber={menuIndex >= 0 ? menuIndex + 1 : 1}
                                    peopleCount={peopleCount}
                                    isCover={isCover}
                                    onToggleStar={(p) => handleToggleStar(p.id, p.is_starred)}
                                    onUseAsCover={handleUseAsDeliveryCover}
                                    onMoveToSet={(p) => {
                                        closePhotoMenu();
                                        setEditingPhoto(p);
                                        setTargetSetId(p.set_id);
                                        setMoveMode('move');
                                        setShowMoveModal(true);
                                    }}
                                    onToggleHidden={(p) => {
                                        closePhotoMenu();
                                        void handleTogglePhotoHidden(p);
                                    }}
                                    onDownloadOriginal={(p) => {
                                        closePhotoMenu();
                                        void handleDownloadPhoto(p);
                                    }}
                                    onWhoIsInThis={handleWhoIsInThis}
                                    onRemove={(p) => {
                                        closePhotoMenu();
                                        void deleteSelectedPhotos([p.id]);
                                    }}
                                />
                            </div>,
                            document.body
                        );
                    })()}

                    {/* Multi-Selection Toolbar */}
                    {selectedPhotos.length > 0 && (
                        <div className="cd-selection-toolbar">
                            <div className="cd-selection-left">
                                <button type="button" className="cd-selection-close" onClick={clearSelection}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                                <div className="cd-selection-count-wrapper" onClick={() => setShowSelectAllMenu(!showSelectAllMenu)} ref={selectAllMenuRef}>
                                    <span className="cd-selection-count">{selectedPhotos.length} selected</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cd-selection-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    {showSelectAllMenu && (
                                        <div className="cd-selection-menu">
                                            <div className="cd-ctx-item" onClick={selectAll}>Select All</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="cd-selection-actions" onClick={(e) => e.stopPropagation()}>
                                <button type="button" className="cd-sel-action-btn" data-tooltip="Add to Starred" aria-label="Add to Starred" onClick={handleSelectionStar}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </button>
                                <button type="button" className="cd-sel-action-btn" data-tooltip="Share link" aria-label="Share link" onClick={handleSelectionShareLink}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                </button>
                                <div className={`cd-selection-move-wrapper${showMoveToSetMenu ? ' is-open' : ''}`} ref={moveToSetRef}>
                                    <button
                                        type="button"
                                        className="cd-sel-action-btn"
                                        data-tooltip="Move to set"
                                        aria-label="Move to set"
                                        aria-expanded={showMoveToSetMenu}
                                        aria-haspopup="menu"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSelectionMore(false);
                                            setShowMoveToSetMenu((open) => !open);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" /></svg>
                                    </button>
                                </div>
                                {showMoveToSetMenu && moveMenuPosition && createPortal(
                                    <div
                                        ref={moveMenuPortalRef}
                                        className="cd-selection-move-dropdown cd-selection-move-dropdown--portal"
                                        role="menu"
                                        style={moveMenuPosition}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="cd-sort-label">Move to set</div>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={`cd-ctx-item${!activeSetId ? ' disabled' : ''}`}
                                            disabled={!activeSetId}
                                            onClick={() => handleMovePhotosToSet(null)}
                                        >
                                            {highlightsName}
                                        </button>
                                        {sets.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                role="menuitem"
                                                className={`cd-ctx-item${activeSetId === s.id ? ' disabled' : ''}`}
                                                disabled={activeSetId === s.id}
                                                onClick={() => handleMovePhotosToSet(s.id)}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>,
                                    document.body
                                )}
                                <button type="button" className="cd-sel-action-btn" data-tooltip="Delete" aria-label="Delete" onClick={() => deleteSelectedPhotos()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                                <div className="cd-selection-more-wrap" ref={selectionMoreRef}>
                                    <button type="button" className="cd-sel-action-btn" data-tooltip="More" aria-label="More" onClick={(e) => { e.stopPropagation(); setShowMoveToSetMenu(false); setShowSelectionMore(!showSelectionMore); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                    </button>
                                    {showSelectionMore && selectionMoreMenuPosition && createPortal(
                                        <div
                                            ref={selectionMorePortalRef}
                                            className="cd-selection-more-dropdown cd-selection-more-dropdown--portal"
                                            role="menu"
                                            style={selectionMoreMenuPosition}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionOpen}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8M3 3l6 6M3 3v4.8M3 3h4.8M21 3l-6 6M21 3v4.8M21 3h-4.8M3 21l6-6M3 21v-4.8M3 21h4.8" /></svg></div>
                                                <span className="cd-ctx-text">Open</span>
                                                <span className="cd-ctx-hotkey">spacebar</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionDownload}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg></div>
                                                <span className="cd-ctx-text">Download</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionCopyFilenames}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></div>
                                                <span className="cd-ctx-text">Copy filenames</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionSetAsCover}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
                                                <span className="cd-ctx-text">Set as cover</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionRename}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>
                                                <span className="cd-ctx-text">Rename</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionReplace}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3" /></svg></div>
                                                <span className="cd-ctx-text">Replace photo</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={handleSelectionWatermark}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M14.5 9a2.5 2.5 0 0 0-5 0v6a2.5 2.5 0 0 0 5 0" /><path d="M10 12h4.5" /></svg></div>
                                                <span className="cd-ctx-text">Watermark</span>
                                            </button>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Add Media Modal */}
                {
                    showUploadModal && (
                        <div className="cd-modal-overlay" onClick={() => setShowUploadModal(false)}>
                            <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="cd-modal-header">
                                    <h3 className="cd-modal-title">ADD MEDIA</h3>
                                    <button className="cd-modal-close" onClick={() => setShowUploadModal(false)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                <div className="cd-modal-tabs">
                                    <button className={`cd-modal-tab ${activeMediaTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveMediaTab('upload')}>Upload</button>
                                    <button className={`cd-modal-tab ${activeMediaTab === 'embed' ? 'active' : ''}`} onClick={() => setActiveMediaTab('embed')}>Embed</button>
                                </div>
                                {activeMediaTab === 'upload' ? (
                                    <>
                                        <div
                                            className={`cd-modal-dropzone ${isDraggingModal ? 'dragging' : ''}`}
                                            onDragOver={handleModalDragOver}
                                            onDragLeave={handleModalDragLeave}
                                            onDrop={handleModalDrop}
                                        >
                                            <input
                                                type="file"
                                                ref={modalFileInputRef}
                                                style={{ display: 'none' }}
                                                accept={MEDIA_FILE_INPUT_ACCEPT}
                                                multiple
                                                onChange={handleFileSelect}
                                            />
                                            <div className="cd-modal-drop-content">
                                                <div className="cd-modal-drop-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cfd5d8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                                                        <path d="M8 2h12a2 2 0 0 1 2 2v10"></path>
                                                        <circle cx="15" cy="15" r="5" fill="#fff" stroke="#cfd5d8"></circle>
                                                        <line x1="15" y1="12" x2="15" y2="18"></line>
                                                        <line x1="12" y1="15" x2="18" y2="15"></line>
                                                    </svg>
                                                </div>
                                                <p className="cd-modal-drop-text">Drag photos and videos here to upload</p>
                                                <p className="cd-modal-drop-browse">or <span className="cd-browse-link" onClick={handleModalBrowse}>Browse files</span></p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="cd-modal-embed">
                                        <div className="cd-embed-input-wrapper">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                            <input type="text" placeholder="Add a YouTube or Vimeo Video URL" />
                                        </div>
                                        <p className="cd-embed-helper">Add a video from YouTube or Vimeo by entering the full video URL. <span className="settings-link">Learn more</span></p>
                                        <div className="cd-embed-logos">
                                            <svg className="cd-youtube-logo" viewBox="0 0 24 24" fill="#ff0000" width="30" height="30"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.083 0 12 0 12s0 3.917.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.917 24 12 24 12s0-3.917-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                            <svg className="cd-vimeo-logo" viewBox="0 0 24 24" fill="#1ab7ea" width="30" height="30"><path d="M22.396 7.164c-.093 2.026-1.507 4.8-4.245 8.32C15.32 19.161 12.93 21 11.002 21c-1.332 0-2.436-1.378-3.308-4.136-.582-2.613-1.096-5.59-1.636-7.85-1.026-4.634-1.921-1.652-3.876.104l-1.066-1.341c2.148-2.036 4.356-4.225 5.952-4.428 1.968-.25 3.12 1.343 3.454 4.777.424 4.295.666 4.975 1.505 4.975.766 0 1.956-2.08 2.87-4.482.724-1.916.638-3.32-.42-3.32-.61 0-1.272.186-1.908.498 1.258-4.116 3.98-5.807 7.025-4.832 2.164.693 2.887 2.859 2.796 4.881z" /></svg>
                                        </div>
                                        <div className="cd-embed-actions">
                                            <button className="cd-cancel-btn" onClick={() => setShowUploadModal(false)}>Cancel</button>
                                            <button className="cd-save-btn disabled">Add Video</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >
            {/* Add Set Modal */}
            {showAddSetModal && (
                <div className="cd-modal-overlay" onClick={() => setShowAddSetModal(false)}>
                    <div className="cd-modal cd-set-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">NEW PHOTO SET</h3>
                            <button className="cd-modal-close" onClick={() => setShowAddSetModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-set-modal-body">
                            <div className="cd-set-field">
                                <label className="cd-set-field-label">Photo Set Name</label>
                                <input
                                    type="text"
                                    className="cd-set-field-input"
                                    placeholder="e.g. Ceremony, Reception, Getting ready"
                                    value={newSetName}
                                    onChange={(e) => setNewSetName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="cd-set-field">
                                <label className="cd-set-field-label">Description</label>
                                <textarea
                                    className="cd-set-field-textarea"
                                    placeholder="Optional"
                                    value={newSetDescription}
                                    onChange={(e) => setNewSetDescription(e.target.value)}
                                    maxLength={500}
                                    rows={4}
                                />
                                <span className="cd-set-field-counter">{newSetDescription.length} / 500</span>
                                <p className="cd-set-field-hint">Description is shown to clients viewing this photo set for additional storytelling.</p>
                            </div>
                        </div>
                        <div className="cd-set-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowAddSetModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={handleCreateSet} disabled={!newSetName.trim() || savingSet}>
                                {savingSet ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Set Modal */}
            {editingSet && (
                <div className="cd-modal-overlay" onClick={() => setEditingSet(null)}>
                    <div className="cd-modal cd-set-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">EDIT PHOTO SET</h3>
                            <button className="cd-modal-close" onClick={() => setEditingSet(null)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-set-modal-body">
                            <div className="cd-set-field">
                                <label className="cd-set-field-label">Photo Set Name</label>
                                <input
                                    type="text"
                                    className="cd-set-field-input"
                                    value={editSetName}
                                    onChange={(e) => setEditSetName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="cd-set-field">
                                <label className="cd-set-field-label">Description</label>
                                <textarea
                                    className="cd-set-field-textarea"
                                    placeholder="Optional"
                                    value={editSetDescription}
                                    onChange={(e) => setEditSetDescription(e.target.value)}
                                    maxLength={500}
                                    rows={4}
                                />
                                <span className="cd-set-field-counter">{editSetDescription.length} / 500</span>
                                <p className="cd-set-field-hint">Description is shown to clients viewing this photo set for additional storytelling.</p>
                            </div>
                        </div>
                        <div className="cd-set-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setEditingSet(null)}>Cancel</button>
                            <button className="cd-save-btn" onClick={handleUpdateSet} disabled={!editSetName.trim() || savingSet}>
                                {savingSet ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Favorite List Modal (single overlay — matches preset list flow) */}
            {showCreateFavoriteListModal && (
                <div
                    className="favorite-list-form-modal-overlay fixed inset-0 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setShowCreateFavoriteListModal(false)}
                    role="presentation"
                >
                    <div
                        className="flex w-full max-w-[600px] flex-col rounded-lg bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="favorite-list-modal-title"
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                            <h3 id="favorite-list-modal-title" className="text-[16px] font-bold uppercase tracking-[0.12em] text-gray-900">
                                {editingFavoriteList ? 'Edit favorite list' : 'Create favorite list'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateFavoriteListModal(false)}
                                className="text-gray-400 transition-colors hover:text-gray-600"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                            <div className="mb-6">
                                <label className="mb-2 block text-[16px] font-semibold text-gray-900">Client email</label>
                                <input
                                    type="email"
                                    disabled={!!editingFavoriteList}
                                    className="w-full rounded border border-gray-200 p-3 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C] disabled:cursor-not-allowed disabled:bg-gray-50"
                                    placeholder="e.g. client@email.com"
                                    value={favoriteListEmail}
                                    onChange={(e) => setFavoriteListEmail(e.target.value)}
                                />
                                <p className="mt-2 text-[14px] text-gray-500">
                                    Your client is required to sign in using this email to see this favorite list
                                </p>
                            </div>

                            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:gap-6">
                                <div className="min-w-0 flex-1">
                                    <label className="mb-2 block text-[16px] font-semibold text-gray-900">Favorite list name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded border border-gray-200 p-3 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="e.g. For retouching"
                                        value={favoriteListName}
                                        onChange={(e) => setFavoriteListName(e.target.value)}
                                    />
                                    <p className="mt-2 text-[14px] text-gray-500">Your clients will see this name</p>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <label className="mb-2 block text-[16px] font-semibold text-gray-900">Max selection</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full rounded border border-gray-200 p-3 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="e.g. 30"
                                        value={favoriteListMax}
                                        onChange={(e) => setFavoriteListMax(e.target.value)}
                                    />
                                    <p className="mt-2 text-[14px] text-gray-500">Limit the number of photos your clients can pick</p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[16px] font-semibold text-gray-900">List description</label>
                                <div className="relative">
                                    <textarea
                                        className="h-32 w-full resize-none rounded border border-gray-200 p-3 pb-8 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="Optional"
                                        maxLength={500}
                                        value={favoriteListDesc}
                                        onChange={(e) => setFavoriteListDesc(e.target.value)}
                                    />
                                    <span className="pointer-events-none absolute bottom-2 left-3 text-[14px] text-gray-400">
                                        {favoriteListDesc.length} / 500
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-5">
                            <button
                                type="button"
                                onClick={() => setShowCreateFavoriteListModal(false)}
                                className="px-2 py-2 text-[16px] font-medium text-gray-600 transition-colors hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateFavoriteList}
                                disabled={!favoriteListEmail?.trim() || !favoriteListName?.trim()}
                                className="rounded bg-[#1ABC9C] px-6 py-2 text-[16px] font-medium text-white transition-colors hover:bg-[#16a085] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {editingFavoriteList ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Change Cover Modal */}
            <input
                ref={coverModalFileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept={COVER_IMAGE_ACCEPT}
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) {
                        void handleCoverFileSelect(file);
                        closeCoverModal();
                    }
                }}
            />
            <ChangeCoverModal
                isOpen={showCoverModal}
                onClose={closeCoverModal}
                photos={coverModalPhotos}
                coverUrl={collection?.cover_url}
                coverPhoto={coverModalPhotoOverride || coverPhoto}
                initialFocals={collectionFocals}
                initialView={coverModalInitialView}
                sets={sets}
                highlightsName={highlightsName}
                saving={isCoverUploading}
                onConfirm={handleCoverModalConfirm}
            />

            {/* Get Direct Link Modal */}
            {showGetDirectLinkModal && (
                <div className="cd-modal-overlay" onClick={() => setShowGetDirectLinkModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">GET DIRECT LINK</h3>
                            <button className="cd-modal-close" onClick={() => setShowGetDirectLinkModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DELIVERY URL</label>
                                <div style={{ display: 'flex' }}>
                                    <input type="text" readOnly value={`${window.location.origin}/gallery/${collectionUrl}`} style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', fontSize: '14px', backgroundColor: '#f9f9f9', outline: 'none', color: '#555' }} />
                                    <button style={{ padding: '0 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/gallery/${collectionUrl}`)}>Copy</button>
                                </div>
                                <div style={{ fontSize: '13px', color: '#2b78c5', marginTop: '8px', cursor: 'pointer', display: 'inline-block' }}>Need a custom domain?</div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DELIVERY PASSWORD</label>
                                <div style={{ display: 'flex' }}>
                                    <input type="text" readOnly value={collectionPassword || 'No password set'} style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', fontSize: '14px', backgroundColor: '#f9f9f9', outline: 'none', color: '#555' }} />
                                    <button style={{ padding: '0 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }} onClick={() => collectionPassword && navigator.clipboard.writeText(collectionPassword)}>Copy</button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DOWNLOAD PIN</label>
                                <div style={{ display: 'flex' }}>
                                    <input type="text" readOnly value={pinValue || '1060'} style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', fontSize: '14px', backgroundColor: '#f9f9f9', outline: 'none', color: '#555' }} />
                                    <button style={{ padding: '0 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }} onClick={() => pinValue && navigator.clipboard.writeText(pinValue)}>Copy</button>
                                </div>
                                <div style={{ fontSize: '13px', color: '#2b78c5', marginTop: '8px', cursor: 'pointer', display: 'inline-block' }} onClick={() => { setShowGetDirectLinkModal(false); setActiveSidebarTab('settings'); setActiveSettingsTab('download'); }}>Download Settings</div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            <CollectionQrModal
                collection={
                    collection
                        ? { ...collection, slug: collectionUrl || collection.slug, name: collection?.name }
                        : null
                }
                isOpen={showQrCodeModal}
                onClose={() => setShowQrCodeModal(false)}
            />

            {showGdQrModal && collection?.guest_delivery_enabled && gdEvent && (
                <GuestDeliveryQrModal
                    slug={gdEvent.slug}
                    event={gdEvent}
                    guests={guestDeliveryGuests}
                    photographerId={gdEvent.photographer_id || collection?.photographer_id || user?.id}
                    onClose={() => setShowGdQrModal(false)}
                    onOpenGuestList={() => setActiveSidebarTab('guests')}
                    onEventUpdated={(updated) => {
                        if (updated) setGdEvent(updated);
                    }}
                />
            )}

            {/* Email History Modal */}
            {showEmailHistoryModal && (
                <div className="cd-modal-overlay" onClick={() => { setShowEmailHistoryModal(false); setEmailHistoryHelpOpen(false); }}>
                    <div className="cd-modal cd-email-history-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                EMAIL HISTORY
                                <button
                                    type="button"
                                    className="cd-email-history-help-btn"
                                    aria-expanded={emailHistoryHelpOpen}
                                    aria-label="About email statuses"
                                    onClick={() => setEmailHistoryHelpOpen((v) => !v)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                </button>
                            </h3>
                            <button className="cd-modal-close" onClick={() => { setShowEmailHistoryModal(false); setEmailHistoryHelpOpen(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p className="cd-email-history-intro">
                                Emails sent for this delivery will be listed here. Note that email history might take up to a few minutes to show up.
                            </p>

                            {emailHistoryHelpOpen && (
                                <div className="cd-email-history-help">
                                    <div className="cd-email-history-help-block">
                                        <h4>Pending</h4>
                                        <p>After you click Send, the invite may show as Pending while it is still being delivered. This can take up to a couple of minutes. Once delivered, the status updates to Sent.</p>
                                    </div>
                                    <div className="cd-email-history-help-block">
                                        <h4>Sent</h4>
                                        <p>The email was accepted for delivery. If your client still does not see it, ask them to check junk/spam/promotions, or wait for their email provider to finish delivery.</p>
                                    </div>
                                    <div className="cd-email-history-help-block">
                                        <h4>Rejected</h4>
                                        <p>The email bounced and was rejected by the recipient’s server (soft bounce: temporary issues like a full mailbox; hard bounce: invalid address or permanent block). Rejected emails are not re-delivered — send again with a corrected address if needed.</p>
                                    </div>
                                    <div className="cd-email-history-help-block">
                                        <h4>DIY personal invite</h4>
                                        <p>If email delivery is unreliable, share a direct link instead (text message, WhatsApp, etc.).</p>
                                        <button
                                            type="button"
                                            className="cd-email-history-link-btn"
                                            onClick={() => {
                                                setShowEmailHistoryModal(false);
                                                setEmailHistoryHelpOpen(false);
                                                setShowGetDirectLinkModal(true);
                                            }}
                                        >
                                            Get direct link
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="cd-email-history-table-wrap">
                                <table className="cd-email-history-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Subject</th>
                                            <th>Date Sent</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emailHistoryLoading ? (
                                            <tr>
                                                <td colSpan="4" className="cd-email-history-empty">Loading…</td>
                                            </tr>
                                        ) : emailHistoryError ? (
                                            <tr>
                                                <td colSpan="4" className="cd-email-history-empty cd-email-history-empty--error">{emailHistoryError}</td>
                                            </tr>
                                        ) : emailHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="cd-email-history-empty">No email history found.</td>
                                            </tr>
                                        ) : (
                                            emailHistory.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.email}</td>
                                                    <td>{item.subject}</td>
                                                    <td>{item.date}</td>
                                                    <td>
                                                        <span className={`cd-email-status cd-email-status--${item.status.toLowerCase()}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="cd-email-history-diy">
                                <span>Having trouble with email delivery?</span>
                                <button
                                    type="button"
                                    className="cd-email-history-link-btn"
                                    onClick={() => {
                                        setShowEmailHistoryModal(false);
                                        setEmailHistoryHelpOpen(false);
                                        setShowGetDirectLinkModal(true);
                                    }}
                                >
                                    Get direct link
                                </button>
                            </div>
                        </div>
                        <div className="cd-modal-footer">
                            <button type="button" className="cd-cancel-btn" onClick={() => { setShowEmailHistoryModal(false); setEmailHistoryHelpOpen(false); }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Preset Modal */}
            {showApplyPresetModal && (
                <div className="cd-modal-overlay" onClick={() => setShowApplyPresetModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">APPLY PRESET TO DELIVERY</h3>
                            <button className="cd-modal-close" onClick={() => setShowApplyPresetModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>Applying a preset will overwrite your current delivery settings. This action cannot be undone.</p>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>SELECT PRESET</label>
                            <div style={{ position: 'relative', marginBottom: '10px' }}>
                                <select 
                                    value={selectedApplyPresetId} 
                                    onChange={(e) => setSelectedApplyPresetId(e.target.value)} 
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', appearance: 'none', backgroundColor: '#fff', outline: 'none', transition: 'border-color 0.2s ease', color: '#1a1a1a', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    <option value="">None</option>
                                    {presets.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        <div className="cd-set-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowApplyPresetModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={handleApplyPreset}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Preset Modal */}
            {showSavePresetModal && (
                <div className="cd-modal-overlay" onClick={() => setShowSavePresetModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">SAVE SETTINGS AS A PRESET</h3>
                            <button className="cd-modal-close" onClick={() => setShowSavePresetModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>Save your current delivery settings as a preset to easily apply them to other deliveries.</p>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>PRESET NAME</label>
                            <input 
                                type="text" 
                                value={savePresetName} 
                                onChange={(e) => setSavePresetName(e.target.value)} 
                                placeholder="e.g. Standard Wedding" 
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', fontWeight: '500' }} 
                            />
                        </div>
                        <div className="cd-set-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowSavePresetModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={handleSavePreset}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            <MoveCollectionModal
                isOpen={showMoveToModal}
                onClose={() => setShowMoveToModal(false)}
                collectionId={collectionId}
                photographerId={collection?.photographer_id ?? user?.id}
                currentFolderId={collection?.folder_id}
                onMoved={(folderId) => setCollection((prev) => (prev ? { ...prev, folder_id: folderId } : prev))}
            />

            <CollectionDuplicateModal
                collection={showDuplicateModal && collection ? collection : null}
                isOpen={showDuplicateModal}
                onClose={() => setShowDuplicateModal(false)}
                busy={saving}
                onConfirm={async () => {
                    const photographerId = collection?.photographer_id ?? user?.id;
                    if (!collectionId || !photographerId) {
                        alert('Missing delivery or account. Refresh and try again.');
                        return;
                    }
                    try {
                        setSaving(true);
                        const newRow = await galleryService.duplicateCollection(collectionId, photographerId);
                        setShowDuplicateModal(false);
                        navigate(`/deliveries/manage?id=${newRow.id}`);
                    } catch (err) {
                        console.error('Failed to duplicate:', err);
                        alert(err?.message || 'Failed to duplicate delivery. Please try again.');
                    } finally {
                        setSaving(false);
                    }
                }}
            />

            {/* Delete Set Modal */}
            {deleteSetId && (
                <div className="cd-modal-overlay">
                    <div className="cd-modal" style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">DELETE PHOTO SET</h3>
                            <button className="cd-modal-close" onClick={() => setDeleteSetId(null)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}>All photos and past activities for this photo set will be deleted. This cannot be undone.</p>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setDeleteSetId(null)}>Cancel</button>
                            <button className="cd-save-btn" style={{ backgroundColor: '#009070', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', fontWeight: '500' }} onClick={confirmDeleteSet} disabled={saving}>
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Delivery Modal */}
            {showDeleteCollectionModal && (
                <div className="cd-modal-overlay" onClick={() => setShowDeleteCollectionModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">DELETE DELIVERY</h3>
                            <button className="cd-modal-close" onClick={() => setShowDeleteCollectionModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Are you sure you want to delete this delivery?</p>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}><strong>Warning:</strong> All photos and past activities will be permanently removed.</p>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={deleteCollectionConfirm}
                                    onChange={(e) => setDeleteCollectionConfirm(e.target.checked)}
                                    style={{ marginTop: '4px', width: '16px', height: '16px' }}
                                />
                                <span style={{ fontSize: '13px', color: '#333' }}>I accept that this delivery will be permanently deleted</span>
                            </label>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowDeleteCollectionModal(false)}>Cancel</button>
                            <button
                                className="cd-save-btn"
                                style={{ backgroundColor: '#e53e3e', borderColor: '#e53e3e', opacity: deleteCollectionConfirm ? 1 : 0.5 }}
                                disabled={!deleteCollectionConfirm || saving}
                                onClick={async () => {
                                    try {
                                        setSaving(true);
                                        await galleryService.deleteCollection(collectionId);
                                        navigate(backTo);
                                    } catch (err) {
                                        console.error('Failed to delete collection:', err);
                                        alert('Failed to delete delivery. Please try again.');
                                        setSaving(false);
                                    }
                                }}
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Rename Modal */}
            {showRenameModal && (
                <div className="cd-modal-overlay">
                    <div className="cd-modal cd-modal-sm">
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">Rename Photo</h3>
                            <button className="cd-modal-close" onClick={() => setShowRenameModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body">
                            <div className="cd-form-group">
                                <label className="cd-form-label">Photo Filename</label>
                                <input
                                    type="text"
                                    className="cd-form-input"
                                    value={newPhotoName}
                                    onChange={(e) => setNewPhotoName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-btn-secondary" onClick={() => setShowRenameModal(false)}>Cancel</button>
                            <button className="cd-btn-primary" onClick={handleRenamePhoto} disabled={saving}>
                                {saving ? 'Renaming...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move/Copy Modal */}
            {showMoveModal && (
                <div className="cd-modal-overlay">
                    <div className="cd-modal cd-modal-sm">
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">Move or Copy Photo</h3>
                            <button className="cd-modal-close" onClick={() => setShowMoveModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body">
                            <div className="cd-form-group">
                                <label className="cd-form-label">Action</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={moveMode === 'move'} onChange={() => setMoveMode('move')} />
                                        <span className="text-[16px]">Move</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={moveMode === 'copy'} onChange={() => setMoveMode('copy')} />
                                        <span className="text-[16px]">Copy</span>
                                    </label>
                                </div>
                            </div>
                            <div className="cd-form-group mt-6">
                                <label className="cd-form-label">Target Set</label>
                                <div className="settings-select-wrapper">
                                    <select
                                        className="settings-select"
                                        value={targetSetId || ''}
                                        onChange={(e) => setTargetSetId(e.target.value || null)}
                                    >
                                        <option value="">Highlights</option>
                                        {sets.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-btn-secondary" onClick={() => setShowMoveModal(false)}>Cancel</button>
                            <button className="cd-btn-primary" onClick={handleMovePhoto} disabled={saving}>
                                {saving ? 'Processing...' : (moveMode === 'move' ? 'Move Photo' : 'Copy Photo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replace Photo Modal */}
            {showReplaceModal && (
                <div className="cd-modal-overlay">
                    <div className="cd-modal cd-modal-sm">
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">Replace Photo</h3>
                            <button className="cd-modal-close" onClick={() => setShowReplaceModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body">
                            <p className="text-[16px] text-[#666] mb-6">
                                Choose a new photo to replace the current one. The new photo will inherit the star status.
                            </p>
                            <input
                                type="file"
                                id="replace-file-input"
                                className="hidden"
                                accept="image/*"
                                onChange={handleReplacePhoto}
                            />
                            <button
                                className="cd-btn-primary w-full py-4 flex items-center justify-center gap-2"
                                onClick={() => document.getElementById('replace-file-input').click()}
                                disabled={saving}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                {saving ? 'Uploading...' : 'Upload New Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── LIGHTBOX / OPEN ───── */}
            {lightboxOpenIndex >= 0 && (() => {
                const lbPhotos = sortedPhotos;
                const lbPhoto = lbPhotos[lightboxOpenIndex];
                if (!lbPhoto) return null;
                return (
                    <div className="cd-lightbox" onClick={() => setLightboxOpenIndex(-1)}>
                        {/* Close */}
                        <button className="cd-lightbox-close" onClick={() => setLightboxOpenIndex(-1)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        {/* Prev */}
                        {lightboxOpenIndex > 0 && (
                            <button
                                className="cd-lightbox-nav prev"
                                onClick={(e) => { e.stopPropagation(); setLightboxOpenIndex(i => i - 1); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                        )}

                        {/* Image / Video / RAW */}
                        {/\.(mp4|webm|ogg|mov)$/i.test(lbPhoto.filename || lbPhoto.full_url || '') ? (
                            <video
                                src={lbPhoto.full_url}
                                className="cd-lightbox-image"
                                style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%', objectFit: 'contain' }}
                                controls
                                autoPlay
                                loop
                                playsInline
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (() => {
                            const lbSrc = getPhotoFullDisplayUrl(lbPhoto);
                            if (lbSrc && !lightboxImgFailed) {
                                return (
                                    <img
                                        src={lbSrc}
                                        alt={lbPhoto.filename}
                                        className="cd-lightbox-image"
                                        onClick={(e) => e.stopPropagation()}
                                        onError={() => setLightboxImgFailed(true)}
                                    />
                                );
                            }
                            if (isRawMedia(lbPhoto)) {
                                return (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <RawPhotoPlaceholder variant="lightbox" />
                                    </div>
                                );
                            }
                            if (lbSrc) {
                                return (
                                    <img
                                        src={lbSrc}
                                        alt={lbPhoto.filename}
                                        className="cd-lightbox-image"
                                        onClick={(e) => e.stopPropagation()}
                                        onError={() => setLightboxImgFailed(true)}
                                    />
                                );
                            }
                            return (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <RawPhotoPlaceholder variant="lightbox" />
                                </div>
                            );
                        })()}

                        {/* Caption */}
                        <div className="cd-lightbox-caption">
                            {lbPhoto.filename} &nbsp;·&nbsp; {lightboxOpenIndex + 1} / {lbPhotos.length}
                        </div>

                        {/* Next */}
                        {lightboxOpenIndex < lbPhotos.length - 1 && (
                            <button
                                className="cd-lightbox-nav next"
                                onClick={(e) => { e.stopPropagation(); setLightboxOpenIndex(i => i + 1); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        )}

                        {/* Action bar */}
                        <div className="cd-lightbox-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="cd-lightbox-btn" onClick={() => handleDownloadPhoto(lbPhoto)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Download
                            </button>
                            <button className="cd-lightbox-btn" onClick={() => { handleSetAsCover(lbPhoto); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Set as cover
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ───── QUICK SHARE MODAL ───── */}
            {showQuickShareModal && editingPhoto && (() => {
                const isMultiple = selectedPhotos.length > 1;
                const shareUrl = isMultiple
                    ? `${window.location.origin}/gallery/${collection?.slug}?photos=${selectedPhotos.join(',')}`
                    : `${window.location.origin}/gallery/${collection?.slug}?photo=${editingPhoto.id}`;
                return (
                    <div className="cd-modal-overlay" onClick={() => setShowQuickShareModal(false)}>
                        <div className="cd-modal cd-modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
                            <div className="cd-modal-header">
                                <h3 className="cd-modal-title">Quick Share</h3>
                                <button className="cd-modal-close" onClick={() => setShowQuickShareModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                            <div className="cd-set-modal-body">
                                {/* Photo preview */}
                                <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 8, maxHeight: 200, display: 'flex', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
                                    <img src={editingPhoto.full_url} alt={editingPhoto.filename} style={{ maxHeight: 200, objectFit: 'contain' }} />
                                </div>
                                <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                                    {isMultiple
                                        ? `Share a direct link to these ${selectedPhotos.length} photos with your client.`
                                        : 'Share a direct link to this photo with your client.'
                                    }
                                </p>
                                <div style={{ display: 'flex', gap: 0, border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
                                    <input type="text" readOnly value={shareUrl} style={{ flex: 1, padding: '10px 12px', fontSize: 13, border: 'none', outline: 'none', background: '#f9f9f9', color: '#555' }} />
                                    <button
                                        style={{ padding: '0 18px', backgroundColor: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
                                        onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div className="cd-quick-share-icons" style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button type="button" title="Share by email" onClick={() => openShareByEmail(shareUrl, `Photo from ${collection?.name || 'Delivery'}`)} style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f5f5f5', color: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    </button>
                                    <button type="button" title="Copy direct link" onClick={() => { void navigator.clipboard.writeText(shareUrl); }} style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f5f5f5', color: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    </button>
                                    <button type="button" title="Show QR code" onClick={() => setQuickShareShowQr((v) => !v)} style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: quickShareShowQr ? '#e6f7f6' : '#f5f5f5', color: '#111', border: quickShareShowQr ? '2px solid #20b2aa' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><rect x="7" y="7" width="3" height="3" /><rect x="14" y="7" width="3" height="3" /><rect x="7" y="14" width="3" height="3" /><rect x="14" y="14" width="3" height="3" /></svg>
                                    </button>
                                    <button type="button" title="Share on WhatsApp" onClick={() => openWhatsAppShare(shareUrl, collection?.name || 'Photo')} style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </button>
                                </div>
                                {quickShareShowQr && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
                                        <img src={getQrCodeImageUrl(shareUrl)} alt="QR code for photo link" width={180} height={180} />
                                        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Scan to open this photo</p>
                                    </div>
                                )}
                            </div>
                            <div className="cd-set-modal-footer">
                                <button className="cd-cancel-btn" onClick={() => setShowQuickShareModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ───── WATERMARK MODAL ───── */}
            {showWatermarkModal && editingPhoto && (
                <div className="cd-modal-overlay" onClick={() => setShowWatermarkModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', borderRadius: '4px', padding: '24px' }}>
                        <div className="cd-modal-header" style={{ borderBottom: 'none', padding: '0 0 16px 0' }}>
                            <h3 className="cd-modal-title" style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#1a1a1a', textTransform: 'uppercase' }}>WATERMARK</h3>
                            <button className="cd-modal-close" onClick={() => setShowWatermarkModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: 0 }}>
                            {/* Important alert block */}
                            <div style={{ backgroundColor: '#fdf6ed', border: '1px solid #f5dbbf', borderRadius: '4px', padding: '16px', display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e28743" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#111' }}>Important</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                                        Watermark changes can take anywhere from a few minutes to several hours to process. These photos will be unavailable during this time.
                                    </p>
                                </div>
                            </div>

                            {/* Dropdown wrapper */}
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <select 
                                    value={selectedWatermarkId} 
                                    onChange={(e) => setSelectedWatermarkId(e.target.value)} 
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d2d6dc', borderRadius: '4px', fontSize: '14px', appearance: 'none', backgroundColor: '#fff', outline: 'none', transition: 'border-color 0.2s ease', color: '#374151', cursor: 'pointer', height: '45px' }}
                                >
                                    <option value="">No watermark</option>
                                    {watermarks.map((wm) => (
                                        <option key={wm.id} value={wm.id}>{wm.name}</option>
                                    ))}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>

                            {/* Checkbox */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#4b5563', marginBottom: '24px', userSelect: 'none' }}>
                                <input 
                                    type="checkbox" 
                                    checked={applyToAllPhotos}
                                    onChange={(e) => setApplyToAllPhotos(e.target.checked)}
                                    style={{ width: '16px', height: '16px', border: '1px solid #d2d6dc', borderRadius: '3px', cursor: 'pointer' }}
                                />
                                Apply to all in this delivery ({photos.length} photos)
                            </label>
                        </div>
                        <div className="cd-set-modal-footer" style={{ borderTop: 'none', padding: '12px 0 0 0', display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'center' }}>
                            <button className="cd-cancel-btn" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 }} onClick={() => setShowWatermarkModal(false)}>Cancel</button>
                            <button 
                                className="cd-save-btn" 
                                style={{ backgroundColor: '#a2d9c5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', height: '40px', minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={handleSaveWatermarkSettings} 
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <>
            {showDeleteConfirm && (
                <div className="cd-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="cd-modal cd-modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">DELETE PHOTOS</h3>
                            <button className="cd-modal-close" onClick={() => setShowDeleteConfirm(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body">
                            <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '10px 0' }}>
                                Are you sure you want to delete {photosToDelete.length} photo(s)? This action cannot be undone and will remove them from all sets.
                            </p>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button 
                                className="cd-btn-primary" 
                                style={{ backgroundColor: '#e53e3e', border: 'none' }} 
                                onClick={confirmDeletePhotos}
                                disabled={saving}
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Expiry Reminder Email Modal */}
            {showExpiryReminderModal && (
                <div className="cd-modal-overlay" style={{ backgroundColor: '#fff', zIndex: 100000 }}>
                    <div className="expiry-email-container">
                        <div className="expiry-email-header">
                            <div className="header-left">
                                <button className="close-btn" onClick={() => setShowExpiryReminderModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                                <h2 className="header-title">{editingReminderId ? 'Edit' : 'Add'} Auto Expiry Reminder Email</h2>
                            </div>
                            <div className="header-right">
                                <div className="timing-dropdown">
                                    <select value={expiryEmailTiming} onChange={(e) => setExpiryEmailTiming(e.target.value)}>
                                        <option>1 day before auto expiry date</option>
                                        <option>2 days before auto expiry date</option>
                                        <option>3 days before auto expiry date</option>
                                        <option>5 days before auto expiry date</option>
                                        <option>7 days before auto expiry date</option>
                                        <option>14 days before auto expiry date</option>
                                        <option>30 days before auto expiry date</option>
                                    </select>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                                <button className="save-btn" onClick={handleSaveExpiryEmail} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>

                        <div className="expiry-email-content">
                            <div className="email-editor-pane">
                                <div className="expiry-to-row">
                                    <span className="expiry-to-label">To:</span>
                                    <input 
                                        type="text" 
                                        className="expiry-to-input"
                                        placeholder="Enter email or select an activity list" 
                                        value={expiryEmailTo}
                                        onChange={(e) => setExpiryEmailTo(e.target.value)}
                                    />
                                </div>

                                <div className="activity-lists-container">
                                    <p className="grid-label">Activity Lists</p>
                                    <div className="activity-lists-grid">
                                        <div className="list-item">
                                            <input 
                                                type="checkbox" 
                                                checked={expiryEmailLists.includes('contacts')}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setExpiryEmailLists(prev => checked ? [...prev, 'contacts'] : prev.filter(l => l !== 'contacts'));
                                                }}
                                            />
                                            <label>Contacts <span>{activityCounts.contacts}</span></label>
                                        </div>
                                        <div className="list-item">
                                            <input 
                                                type="checkbox" 
                                                checked={expiryEmailLists.includes('downloaded')}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setExpiryEmailLists(prev => checked ? [...prev, 'downloaded'] : prev.filter(l => l !== 'downloaded'));
                                                }}
                                            />
                                            <label>Downloaded <span>{activityCounts.downloaded}</span></label>
                                        </div>
                                        <div className="list-item">
                                            <input 
                                                type="checkbox" 
                                                checked={expiryEmailLists.includes('registered')}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setExpiryEmailLists(prev => checked ? [...prev, 'registered'] : prev.filter(l => l !== 'registered'));
                                                }}
                                            />
                                            <label>Registered <span>{activityCounts.registered}</span></label>
                                        </div>
                                        <div className="list-item">
                                            <input 
                                                type="checkbox" 
                                                checked={expiryEmailLists.includes('favorited')}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setExpiryEmailLists(prev => checked ? [...prev, 'favorited'] : prev.filter(l => l !== 'favorited'));
                                                }}
                                            />
                                            <label>Favorited <span>{activityCounts.favorited}</span></label>
                                        </div>
                                        <div className="list-item">
                                            <input 
                                                type="checkbox" 
                                                checked={expiryEmailLists.includes('purchased')}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setExpiryEmailLists(prev => checked ? [...prev, 'purchased'] : prev.filter(l => l !== 'purchased'));
                                                }}
                                            />
                                            <label>Purchased <span>{activityCounts.purchased}</span></label>
                                        </div>
                                    </div>
                                    <p className="upgrade-notice">Upgrade to send reminder emails to activity lists.</p>
                                </div>

                                <div className="form-group">
                                    <input 
                                        type="text" 
                                        className="subject-input"
                                        value={expiryEmailSubject}
                                        onChange={(e) => setExpiryEmailSubject(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <textarea 
                                        className="body-editor"
                                        value={expiryEmailBody}
                                        onChange={(e) => setExpiryEmailBody(e.target.value)}
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                                <div className="expiry-sender-name">
                                    {user?.full_name || collection?.photographer_name || 'Your Name'}
                                </div>

                                <div className="dynamic-text-section">
                                    <div className="section-header" onClick={() => setShowDynamicTextInfo(!showDynamicTextInfo)}>
                                        <span>How to insert dynamic text</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showDynamicTextInfo ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                    {showDynamicTextInfo && (
                                        <div className="section-content">
                                            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <li><strong>{`{delivery.name}`}</strong> - Name of the delivery</li>
                                                <li><strong>{`{expiry.date}`}</strong> - The date the delivery expires</li>
                                                <li><strong>{`{days.prior}`}</strong> - Number of days before expiry</li>
                                                <li><strong>{`{delivery.url}`}</strong> - Link to the gallery</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="include-info-section">
                                    <p className="section-label">Include delivery info:</p>
                                    <div className="checkbox-row">
                                        <label className="checkbox-item">
                                            <input type="checkbox" checked={expiryEmailIncludePin} onChange={(e) => setExpiryEmailIncludePin(e.target.checked)} />
                                            <span>Download PIN</span>
                                        </label>
                                        <label className="checkbox-item">
                                            <input type="checkbox" checked={expiryEmailSendCopy} onChange={(e) => setExpiryEmailSendCopy(e.target.checked)} />
                                            <span>Send me a copy</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="whatsapp-section" style={{ marginTop: '32px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                            WhatsApp Notification
                                        </h3>
                                        <label className="cd-switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={whatsappEnabled} 
                                                onChange={(e) => setWhatsappEnabled(e.target.checked)} 
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span style={{ 
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                                                backgroundColor: whatsappEnabled ? '#25D366' : '#ccc', 
                                                transition: '.4s', borderRadius: '20px' 
                                            }}></span>
                                            <span style={{
                                                position: 'absolute', height: '14px', width: '14px', left: whatsappEnabled ? '19px' : '3px', bottom: '3px',
                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                            }}></span>
                                        </label>
                                    </div>

                                    {whatsappEnabled && (
                                        <div className="whatsapp-details">
                                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>Send to Phone Number:</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. +1234567890" 
                                                    value={toWhatsapp}
                                                    onChange={(e) => setToWhatsapp(e.target.value)}
                                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                                                />
                                                <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Include country code. Multiple numbers separated by commas.</p>
                                            </div>

                                            <div className="form-group">
                                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>WhatsApp Message:</label>
                                                <textarea 
                                                    value={whatsappBody}
                                                    onChange={(e) => setWhatsappBody(e.target.value)}
                                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', height: '80px', resize: 'vertical' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="email-preview-pane">
                                <div className="email-preview-container">
                                    <div className="email-preview-card">
                                        <div className="email-preview-content">
                                            <p className="email-preview-photographer">{user?.full_name || collection?.photographer_name || 'PHOTOGRAPHER'}</p>
                                            <h3 className="email-preview-title">{collection?.name || 'WEDDING'}</h3>
                                            {collection?.cover_url && (
                                                <div className="email-preview-cover">
                                                    <img src={collection.cover_url} alt="Cover" />
                                                </div>
                                            )}
                                            <div className="email-preview-body">
                                                <p className="preview-greeting">Hi,</p>
                                                {expiryEmailBody
                                                    .replace(/\{delivery\.name\}/g, collection?.name || 'WEDDING')
                                                    .replace(/\{collection\.name\}/g, collection?.name || 'WEDDING')
                                                    .replace(/\{expiry\.date\}/g, autoExpiry ? `${new Date(autoExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at 11:59 PM` : 'MM/DD/YYYY at 11:59 PM')
                                                    .replace(/\{days\.prior\}/g, expiryEmailTiming.split(' ')[0])
                                                    .replace(/\{delivery\.url\}/g, `${window.location.origin}/gallery/${collection?.slug || '...'}`)
                                                    .replace(/\{collection\.url\}/g, `${window.location.origin}/gallery/${collection?.slug || '...'}`)
                                                    .split('\n').map((line, i) => {
                                                        const trimmedLine = line.trim().toLowerCase();
                                                        if (i === 0 && (trimmedLine === 'hi,' || trimmedLine === 'hi')) return null;
                                                        return <p key={i}>{line || <br />}</p>;
                                                    })
                                                }
                                                {expiryEmailIncludePin && (
                                                    <div style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '13px', color: '#888' }}>
                                                        <p>Download PIN: <strong>{pinValue || '1234'}</strong></p>
                                                    </div>
                                                )}
                                            </div>
                                            <button className="email-preview-view-btn">View Gallery</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: toastVariant === 'success' ? '#26a69a' : toastVariant === 'error' ? '#E74C3C' : '#E74C3C',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 99999,
                    fontSize: '14px',
                    fontWeight: 500
                }}>
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}
            </>
        </div>
    );
};

export default CollectionDashboard;
