import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Play } from 'lucide-react';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { DesignTab } from '../components/features/CollectionDashboard/DesignTab';
import { PreviewPane } from '../components/features/CollectionDashboard/PreviewPane';
import { ChangeCoverModal } from '../components/features/CollectionDashboard/CoverSettings/ChangeCoverModal';
import { SidebarCoverUpload } from '../components/features/CollectionDashboard/CoverSettings/SidebarCoverUpload';
import { downloadPhotoFromR2 } from '../lib/downloadPhoto';
import { openSpaPath } from '../lib/spaNavigation';
import { openShareByEmail, openWhatsAppShare, getCollectionShareUrl, getQrCodeImageUrl } from '../lib/shareCollection';
import { CollectionQrModal } from '../components/features/ClientGallery/CollectionShareModals';
import { sortDashboardPhotos } from '../utils/sortDashboardPhotos';
import { MEDIA_FILE_ACCEPT, pickMediaFilesOrFallback } from '../lib/mediaFilePicker';
import { setCoverPhotoDragData, endCoverPhotoDrag, isGalleryImagePhoto } from '../lib/coverPhotoDrag';
import { DatePicker } from '../components/ui/DatePicker';
import './CollectionDashboard.css';
import '../components/features/CollectionDashboard/Activity/DownloadActivity.css';
import '../components/features/CollectionDashboard/Activity/FavoriteActivity.css';
import '../components/features/CollectionDashboard/Settings/Settings.css';
import { ActivityView } from '../components/features/CollectionDashboard/Activity/ActivityView';
import { DownloadSettings } from '../components/features/CollectionDashboard/Settings/DownloadSettings';
import { FavoriteSettings } from '../components/features/CollectionDashboard/Settings/FavoriteSettings';
import { GeneralSettings } from '../components/features/CollectionDashboard/Settings/GeneralSettings';
import { PrivacySettings } from '../components/features/CollectionDashboard/Settings/PrivacySettings';
import { UploadManager } from '../components/features/CollectionDashboard/Upload/UploadManager';
import { useUploadQueue } from '../components/features/CollectionDashboard/Upload/useUploadQueue';
import { getFileMime } from '../lib/fileMime';
import { clearMediaUrlCache } from '../lib/imageLoadCache';
import { CollectionGridPhoto } from '../components/features/CollectionDashboard/Media/CollectionGridPhoto';

const CollectionDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get('id');
    const { user } = useAuth();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [collection, setCollection] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState('upload');
    const [status, setStatus] = useState('DRAFT'); // DRAFT or PUBLISHED
    const [showShareDropdown, setShowShareDropdown] = useState(false);
    const [isDraggingModal, setIsDraggingModal] = useState(false);
    const [activePhotoMenu, setActivePhotoMenu] = useState(null);
    const [showGridSettings, setShowGridSettings] = useState(false);
    const [gridSize, setGridSize] = useState('small');
    const [showFilename, setShowFilename] = useState(false);
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);
    const [photoMenu, setPhotoMenu] = useState(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showQuickShareModal, setShowQuickShareModal] = useState(false);
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [showWatermarkModal, setShowWatermarkModal] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [lightboxOpenIndex, setLightboxOpenIndex] = useState(-1); // -1 = closed
    const [newPhotoName, setNewPhotoName] = useState('');
    const [targetSetId, setTargetSetId] = useState(null);
    const [moveMode, setMoveMode] = useState('move'); // 'move' or 'copy'
    const [showSetMenu, setShowSetMenu] = useState(null); // set id or null
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [photosToDelete, setPhotosToDelete] = useState([]);
    const [showSelectionMore, setShowSelectionMore] = useState(false);
    const [showSelectAllMenu, setShowSelectAllMenu] = useState(false);
    const [showMoveToSetMenu, setShowMoveToSetMenu] = useState(false);
    const [moveMenuPosition, setMoveMenuPosition] = useState(null);

    // MORE DROPDOWN MODAL STATES
    const [showGetDirectLinkModal, setShowGetDirectLinkModal] = useState(false);
    const [showQrCodeModal, setShowQrCodeModal] = useState(false);
    const [quickShareShowQr, setQuickShareShowQr] = useState(false);
    const [showEmailHistoryModal, setShowEmailHistoryModal] = useState(false);
    const [showPresetsSubmenu, setShowPresetsSubmenu] = useState(false);
    const [showApplyPresetModal, setShowApplyPresetModal] = useState(false);
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
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
    const [toastMessage, setToastMessage] = useState(null);

    // SORT STATE
    const [sortOption, setSortOption] = useState('custom');

    // TAB STATES
    const [activeSidebarTab, setActiveSidebarTab] = useState('photos'); // photos, design, settings, activity
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
    const [showFocalModal, setShowFocalModal] = useState(false);
    const [focalX, setFocalX] = useState(50);
    const [focalY, setFocalY] = useState(50);
    const [isDraggingFocal, setIsDraggingFocal] = useState(false);
    const [showCoverModal, setShowCoverModal] = useState(false);
    /** 'all' | 'highlights' | set uuid */
    const [coverModalScope, setCoverModalScope] = useState('all');
    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('general'); // general, privacy, download, favorite

    // General Settings State
    const [collectionUrl, setCollectionUrl] = useState('');
    const [categoryTags, setCategoryTags] = useState([]);
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
    const [showOnHomepage, setShowOnHomepage] = useState(true);
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

    // Additional options states
    const [galleryDownload, setGalleryDownload] = useState(true);
    const [singlePhotoDownload, setSinglePhotoDownload] = useState(true);
    const [requirePinForSinglePhoto, setRequirePinForSinglePhoto] = useState(false);
    const [restrictSinglePhotoSizes, setRestrictSinglePhotoSizes] = useState(false);

    // Advanced settings states
    const [downloadLimit, setDownloadLimit] = useState('');
    const [restrictToEmails, setRestrictToEmails] = useState('');
    const [selectedDownloadSets, setSelectedDownloadSets] = useState(['Highlights']);
    const [pinUsageLimit, setPinUsageLimit] = useState('');

    // Favorite State
    const [favoritePhotos, setFavoritePhotos] = useState(true);
    const [favoriteNotes, setFavoriteNotes] = useState(true);
    
    // Create Favorite List Modal State
    const [showCreateFavoriteListModal, setShowCreateFavoriteListModal] = useState(false);
    const [favoriteListEmail, setFavoriteListEmail] = useState('');
    const [favoriteListName, setFavoriteListName] = useState('');
    const [favoriteListMax, setFavoriteListMax] = useState('');
    const [favoriteListDesc, setFavoriteListDesc] = useState('');
    const [favoriteActivity, setFavoriteActivity] = useState([]);
    const [downloadActivity, setDownloadActivity] = useState([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
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
    const [expiryEmailSubject, setExpiryEmailSubject] = useState('The gallery {collection.name} is about to expire');
    const [expiryEmailBody, setExpiryEmailBody] = useState('Hi,\n\nThe gallery {collection.name} will expire in {days.prior} on {expiry.date}. You will no longer be able to access this gallery after the expiry date.\n\nIf you have any questions, please don\'t hesitate to get in touch!');
    const [expiryEmailIncludePin, setExpiryEmailIncludePin] = useState(false);
    const [expiryEmailSendCopy, setExpiryEmailSendCopy] = useState(true);
    const [expiryEmailLists, setExpiryEmailLists] = useState([]); // ['downloaded', 'favorited', etc.]
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [whatsappBody, setWhatsappBody] = useState('Hi, the gallery {collection.name} is expiring on {expiry.date}. View it here: {collection.url}');
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
    const [activeActivitySubTab, setActiveActivitySubTab] = useState('download'); // download, favorite, store, email, share, private
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
        const item = downloadActivity.find(a => a.id === selectedDownloadId);
        if (!item) return [];

        if (item.type === 'single' || item.type === 'photo' || item.type === 'video') {
            const photo = photos.find(p => p.filename === item.filename || p.id === item.id);
            return photo ? [photo] : [];
        }

        if (item.type === 'gallery') {
            const set = sets.find(s => s.name === item.setName);
            if (set) {
                return photos.filter(p => p.set_id === set.id);
            } else if (item.setName === 'Highlights') {
                return photos.filter(p => !p.set_id);
            }
        }
        return [];
    }, [selectedDownloadId, downloadActivity, photos, sets]);

    const handleExportFavoriteList = async (listId, listName) => {
        try {
            const photos = await galleryService.getFavoriteListPhotos(listId);
            if (!photos.length) {
                alert("This list has no photos.");
                return;
            }

            const headers = ['Filename', 'Original Name', 'URL'];
            const rows = photos.map(p => [
                p.filename,
                p.original_filename || p.filename,
                p.full_url
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `favorites-${listName.replace(/\s+/g, '-').toLowerCase()}.csv`);
            link.click();
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

    const openEditFavoriteListModal = (item) => {
        if (!item) return;
        setFavoriteListEmail(item.email);
        setFavoriteListName(item.name);
        setFavoriteListMax(item.max_selection != null && item.max_selection !== '' ? String(item.max_selection) : '');
        setFavoriteListDesc(item.description || '');
        setEditingFavoriteList(item.id);
        setShowCreateFavoriteListModal(true);
        setFavoriteDetailToolbarMenuOpen(false);
        setActiveActivityMenu(null);
    };

    const handleExportActivity = () => {
        if (!downloadActivity.length) return;
        
        const filteredData = downloadActivity.filter(a => a.type === activeDownloadActivityTab);
        if (!filteredData.length) return;

        // Header row
        const headers = ['Email', 'Photo Set', 'PIN', 'Date Downloaded'];
        
        // Data rows
        const rows = filteredData.map(item => [
            item.email,
            item.setName || 'Highlights',
            item.pin || (item.pinUsed ? 'Yes' : '---'),
            new Date(item.date).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            }).replace(',', '')
        ]);

        // Construct CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `collection-download-activity-${collectionId}-${activeDownloadActivityTab}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteActivity = async (id) => {
        try {
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
    const setMenuRef = useRef(null);
    const sortRef = useRef(null);
    const shareRef = useRef(null);
    const selectionMoreRef = useRef(null);
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
    const favoriteDetailToolbarMenuRef = useRef(null);
    const favoriteDetailPhotoMenuRef = useRef(null);
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
        }
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

            // Update local state
            setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
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
            fetchReminders();
        }
    }, [collectionId]);

    useEffect(() => {
        if (activeActivitySubTab === 'share' || activeActivitySubTab === 'private') {
            setActiveActivitySubTab('favorite');
        }
    }, [activeActivitySubTab]);

    useEffect(() => {
        if (activeActivitySubTab !== 'favorite') {
            setSelectedFavoriteListId(null);
            setFavoriteDetailRows([]);
            setFavoriteDetailToolbarMenuOpen(false);
            setFavoriteDetailPhotoMenuPhotoId(null);
            setFavoriteActivitySortMenuOpen(false);
        }
        if (activeActivitySubTab !== 'download') {
            setSelectedDownloadId(null);
            setDownloadDetailToolbarMenuOpen(false);
        }
    }, [activeActivitySubTab]);

    useEffect(() => {
        if (!selectedFavoriteListId || activeActivitySubTab !== 'favorite') {
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
    }, [selectedFavoriteListId, activeActivitySubTab]);

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

    useEffect(() => {
        if (showFocalModal) {
            let initialX = 50;
            let initialY = 50;
            if (collection?.focal_x !== undefined) {
                initialX = collection.focal_x;
                initialY = collection.focal_y;
            } else if (collection?.cover_url && collection.cover_url.includes('#focal=')) {
                const match = collection.cover_url.match(/#focal=([\d.]+),([\d.]+)/);
                if (match) {
                    initialX = parseFloat(match[1]);
                    initialY = parseFloat(match[2]);
                }
            }
            setFocalX(initialX);
            setFocalY(initialY);
        }
    }, [showFocalModal, collection]);

    const handleFocalDrag = (e) => {
        if (!isDraggingFocal && e.type !== 'mousedown') return;

        const rect = e.currentTarget.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;

        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        setFocalX(x);
        setFocalY(y);
    };

    const handleFocalSave = async () => {
        try {
            setSaving(true);
            const currentCoverUrl = collection?.cover_url || (photos.length > 0 ? photos[0].full_url : '');
            if (!currentCoverUrl) {
                setShowFocalModal(false);
                return;
            }

            const coverUrlBase = currentCoverUrl.split('#')[0];
            const newCoverUrl = `${coverUrlBase}#focal=${focalX},${focalY}`;

            await galleryService.updateCollection(collectionId, { cover_url: newCoverUrl });
            setCollection(prev => ({ ...prev, cover_url: newCoverUrl, focal_x: focalX, focal_y: focalY }));
            setShowFocalModal(false);
        } catch (err) {
            console.error('Failed to save focal point:', err);
            alert('Failed to save focal point.');
        } finally {
            setSaving(false);
        }
    };

    const handleCoverPhotoSelect = async (photo) => {
        if (!photo?.full_url || !collectionId) return;
        try {
            setIsCoverUploading(true);
            await galleryService.updateCollection(collectionId, {
                cover_photo_id: photo.id,
                cover_url: photo.full_url,
            });
            setCollection((prev) => ({
                ...prev,
                cover_url: photo.full_url,
                cover_photo_id: photo.id,
            }));
        } catch (err) {
            console.error('Failed to set cover:', err);
            alert('Failed to set cover photo.');
        } finally {
            setIsCoverUploading(false);
        }
    };

    const handleSetAsCover = (photo) => {
        void handleCoverPhotoSelect(photo);
    };

    const handleCoverPhotoDropById = (photoId) => {
        const photo = photos.find((p) => String(p.id) === String(photoId));
        if (!photo) return;
        if (!isGalleryImagePhoto(photo)) return;
        void handleCoverPhotoSelect(photo);
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
        await downloadPhotoFromR2(photo.full_url, photo.filename || 'photo.jpg');
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

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `${photographerId}/${collectionId}/${fileName}`;
            const { url: publicUrl } = await storageService.upload(filePath, file);

            const updated = await galleryService.updatePhoto(editingPhoto.id, {
                full_url: publicUrl,
                web_url: publicUrl,
                thumbnail_url: publicUrl,
                original_storage_path: filePath,
                size_bytes: file.size
            });

            setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? updated : p));
            setShowReplaceModal(false);
            setEditingPhoto(null);
            alert('Photo replaced successfully!');
        } catch (err) {
            console.error('Error replacing photo:', err);
            alert('Failed to replace photo.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveExpiryEmail = async () => {
        try {
            setSaving(true);
            const reminderData = {
                collection_id: collectionId,
                timing: expiryEmailTiming,
                to_email: expiryEmailTo,
                subject: expiryEmailSubject,
                body: expiryEmailBody,
                include_pin: expiryEmailIncludePin,
                send_copy: expiryEmailSendCopy,
                activity_lists: expiryEmailLists,
                whatsapp_enabled: whatsappEnabled,
                whatsapp_body: whatsappBody,
                to_whatsapp: toWhatsapp
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
            alert('Failed to save expiry email settings.');
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

    const openAddReminder = () => {
        setEditingReminderId(null);
        setExpiryEmailTiming('1 day before auto expiry date');
        setExpiryEmailTo('');
        setExpiryEmailSubject('The gallery {collection.name} is about to expire');
        setExpiryEmailBody('Hi,\n\nThe gallery {collection.name} will expire in {days.prior} on {expiry.date}. You will no longer be able to access this gallery after the expiry date.\n\nIf you have any questions, please don\'t hesitate to get in touch!');
        setExpiryEmailIncludePin(false);
        setExpiryEmailSendCopy(true);
        setExpiryEmailLists([]);
        setWhatsappEnabled(false);
        setWhatsappBody('Hi, the gallery {collection.name} is expiring on {expiry.date}. View it here: {collection.url}');
        setToWhatsapp('');
        setShowExpiryReminderModal(true);
    };

    // Load real data from Supabase
    useEffect(() => {
        const fetchCollectionData = async () => {
            if (!collectionId) {
                navigate('/client-gallery');
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await galleryService.getCollectionDashboardData(collectionId);
                
                if (!data) {
                    setError('Collection not found');
                    return;
                }
                
                setCollection(data);

                // Initialize state from collection data
                if (data.status) setStatus(data.status.toUpperCase());
                if (data.slug) setCollectionUrl(data.slug);
                if (data.guest_password_hash) setCollectionPassword(data.guest_password_hash);
                else if (data.client_password_hash && !data.guest_password_hash) {
                    setCollectionPassword(data.client_password_hash);
                }
                if (data.client_password_hash) setClientPrivatePassword(data.client_password_hash);
                if (data.client_exclusive_enabled !== undefined) setClientExclusiveAccess(data.client_exclusive_enabled);
                if (data.allow_clients_mark_private !== undefined) setAllowClientsMarkPrivate(data.allow_clients_mark_private);
                if (data.client_only_highlights !== undefined) setClientOnlyHighlights(data.client_only_highlights);

                // Map individual columns to state
                if (data.cover_style) setSelectedCoverStyle(data.cover_style);
                if (data.font_family) setSelectedFont(data.font_family);
                if (data.color_palette) setSelectedColorPalette(data.color_palette);

                setGridSettings({
                    style: data.grid_style || 'vertical',
                    size: data.thumbnail_size || 'regular',
                    spacing: data.grid_spacing || 'regular',
                    navigation: data.nav_style === 'icons_labels' ? 'text' : 'icon'
                });

                // Initialize download settings
                if (data.downloads_enabled !== undefined) setPhotoDownload(data.downloads_enabled);
                if (data.download_resolutions) setPhotoDownloadSizes(data.download_resolutions);
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
                if (data.selected_download_sets) setSelectedDownloadSets(data.selected_download_sets);
                if (data.pin_usage_limit) setPinUsageLimit(data.pin_usage_limit.toString());
                
                // Initialize favorite settings
                if (data.favorites_enabled !== undefined) setFavoritePhotos(data.favorites_enabled);
                if (data.favorites_allow_comments !== undefined) setFavoriteNotes(data.favorites_allow_comments);

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
                if (data.slideshow !== undefined) setSlideshow(data.slideshow);
                if (data.auto_expiry) setAutoExpiry(data.auto_expiry);

                const photoData = data.photos || [];
                setPhotos(photoData);
                const setsData = data.sets || [];
                setSets(setsData);

                // Activity counts load in background — do not block grid render
                galleryService
                    .getActivityCounts(collectionId)
                    .then((counts) => setBackendActivityCounts(counts))
                    .catch((activityErr) => console.warn('Activity counts unavailable:', activityErr));
            } catch (err) {
                console.error('Error fetching collection:', err);
                setError(err.message || 'Failed to load collection');
            } finally {
                setLoading(false);
            }
        };

        fetchCollectionData();
    }, [collectionId, navigate]);

    useEffect(() => {
        clearMediaUrlCache();
    }, [collectionId]);

    // Global click listener to close menus (ref-aware so toolbar toggles work)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeActivityMenu) setActiveActivityMenu(null);
            if (favoriteDetailPhotoMenuPhotoId) setFavoriteDetailPhotoMenuPhotoId(null);
            if (showSelectionMore && selectionMoreRef.current && !selectionMoreRef.current.contains(e.target)) {
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
            if (favoriteActivitySortMenuOpen) setFavoriteActivitySortMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeActivityMenu, favoriteDetailPhotoMenuPhotoId, favoriteActivitySortMenuOpen, showSelectionMore, showSelectAllMenu, showMoveToSetMenu]);

    // ─── SORT LOGIC ──────────────────────────────────────────
    const sortedPhotos = useMemo(() => {
        // Filter by active set
        let filtered = photos;
        if (activeSetId) {
            filtered = photos.filter(p => p.set_id === activeSetId);
        } else {
            // Highlights: Only photos not assigned to any set
            filtered = photos.filter(p => !p.set_id);
        }

        return sortDashboardPhotos(filtered, sortOption);
    }, [photos, activeSetId, sortOption]);

    // Get the active set object
    const activeSet = activeSetId ? sets.find(s => s.id === activeSetId) : null;
    const activeSetName = activeSet ? activeSet.name : highlightsName;

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
        activeSetId,
        photosLength: photos.length,
        onPhotoUploaded: (photoData) => setPhotos((prev) => [...prev, photoData]),
    });

    const uploadDestinationLabel = collection
        ? `${collection.name || 'Collection'} / ${activeSetName}`
        : activeSetName;

    const gridPhotos = useMemo(() => {
        const completedNames = new Set(sortedPhotos.map((p) => p.filename));
        const pending = uploadState.files
            .filter(
                (f) =>
                    f.previewUrl &&
                    f.status !== 'completed' &&
                    f.status !== 'error' &&
                    !completedNames.has(f.name)
            )
            .map((f) => ({
                id: `upload-pending-${f.id}`,
                filename: f.name,
                full_url: f.previewUrl,
                thumbnail_url: f.previewUrl,
                media_type: getFileMime(f.file).startsWith('video/') ? 'video' : 'image',
                _uploadPending: true,
                _uploadProgress: f.progress,
            }));
        return [...sortedPhotos, ...pending];
    }, [sortedPhotos, uploadState.files]);

    const activeSetPhotoCount = activeSetId
        ? photos.filter(p => p.set_id === activeSetId).length
        : photos.filter(p => !p.set_id).length;

    const coverModalPhotos = useMemo(() => {
        if (coverModalScope === 'all') return photos;
        if (coverModalScope === 'highlights') return photos.filter((p) => !p.set_id);
        return photos.filter((p) => p.set_id === coverModalScope);
    }, [photos, coverModalScope]);

    const coverModalScopeLabel = useMemo(() => {
        if (coverModalScope === 'all') return 'All photos';
        if (coverModalScope === 'highlights') return highlightsName;
        const set = sets.find((s) => s.id === coverModalScope);
        return set?.name || 'Set';
    }, [coverModalScope, highlightsName, sets]);

    const openCoverModal = (scope = 'all') => {
        setCoverModalScope(scope);
        setShowCoverModal(true);
    };

    const closeCoverModal = () => {
        setShowCoverModal(false);
        setCoverModalScope('all');
    };

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

        // "You must have at least one set" logic
        if (sets.length === 0) {
            setToastMessage("You must have at least one set.");
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }

        const isHighlights = deleteSetId === 'highlights';
        
        try {
            setSaving(true);
            if (isHighlights) {
                // Delete all photos that have no set_id
                const unassignedPhotoIds = photos.filter(p => !p.set_id).map(p => p.id);
                if (unassignedPhotoIds.length > 0) {
                    await galleryService.deletePhotos(unassignedPhotoIds);
                    setPhotos(prev => prev.filter(p => p.set_id !== null));
                }
            } else {
                await galleryService.deleteSet(deleteSetId);
                // Unassign photos locally (move back to highlights)
                setPhotos(prev => prev.map(p => p.set_id === deleteSetId ? { ...p, set_id: null } : p));
                setSets(prev => prev.filter(s => s.id !== deleteSetId));
            }
            if (activeSetId === deleteSetId || (isHighlights && !activeSetId)) setActiveSetId(null);
            setDeleteSetId(null);
        } catch (err) {
            console.error('Failed to delete set:', err);
            alert('Failed to delete set. Please try again.');
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
        const photo = requireSingleSelectedPhoto('share a link');
        if (!photo) return;
        closeSelectionChrome();
        handleQuickShare(photo);
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

    const handleSelectionReorder = async (toEnd) => {
        const selIds = new Set(getSelectedPhotoRecords().map((p) => p.id));
        if (selIds.size === 0) return;

        let pool = photos.filter((p) => (activeSetId ? p.set_id === activeSetId : !p.set_id));
        pool = [...pool].sort((a, b) => (a.position || 0) - (b.position || 0));

        const selected = pool.filter((p) => selIds.has(p.id));
        const rest = pool.filter((p) => !selIds.has(p.id));
        const reordered = toEnd ? [...rest, ...selected] : [...selected, ...rest];

        closeSelectionChrome();
        try {
            setSaving(true);
            await Promise.all(reordered.map((p, index) => galleryService.updatePhoto(p.id, { position: index })));
            const posMap = new Map(reordered.map((p, index) => [p.id, index]));
            setPhotos((prev) => prev.map((p) => (posMap.has(p.id) ? { ...p, position: posMap.get(p.id) } : p)));
            if (sortOption !== 'custom') setSortOption('custom');
        } catch (err) {
            console.error('Reorder failed:', err);
            alert('Failed to reorder photos.');
        } finally {
            setSaving(false);
        }
    };

    // Auto-save design settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    cover_style: selectedCoverStyle === 'none' ? 'text_only' : 'photo', // Map internal UI styles to enums since DB enum lacks full styles
                    font_family: selectedFont,
                    color_palette: selectedColorPalette,
                    grid_style: gridSettings.style,
                    thumbnail_size: gridSettings.size,
                    grid_spacing: gridSettings.spacing,
                    nav_style: gridSettings.navigation === 'icon' ? 'icons' : 'icons_labels'
                });
            } catch (err) {
                console.error('Error auto-saving settings:', err);
            }
        };

        const timeoutId = setTimeout(saveSettings, 1000);
        return () => clearTimeout(timeoutId);
    }, [selectedCoverStyle, selectedFont, selectedColorPalette, gridSettings, collectionId, collection, loading]);

    // Listen for activity updates from gallery tabs
    useEffect(() => {
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.onmessage = (event) => {
            if (event.data?.type === 'ACTIVITY_UPDATED' && event.data?.collectionId === collectionId) {
                console.log('Activity update received, refreshing logs...');
                fetchDownloadActivity();
                fetchFavoriteActivity();
            }
        };
        return () => channel.close();
    }, [collectionId]);

    // Auto-save general settings
    useEffect(() => {
        if (!collection || loading) return;

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
        if (!collection || loading) return;

        const savePrivacySettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    client_exclusive_enabled: clientExclusiveAccess,
                    client_password_hash: clientPrivatePassword || null,
                    allow_clients_mark_private: allowClientsMarkPrivate,
                    client_only_highlights: clientOnlyHighlights,
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
        collectionId,
        collection,
        loading,
    ]);

    const handleSetClientOnlyChange = async (setId, isClientOnly) => {
        setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, is_private: isClientOnly } : s)));
        try {
            const { clientExclusiveAccessService } = await import('../services/clientExclusiveAccess.service');
            await clientExclusiveAccessService.updateSetClientOnly(setId, isClientOnly);
        } catch (err) {
            console.error('Error updating client-only set:', err);
        }
    };

    // Auto-save download settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveDownloadSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    downloads_enabled: photoDownload,
                    download_resolutions: photoDownloadSizes,
                    download_pin_hash: downloadPin ? pinValue : null,
                    email_capture_enabled: emailRegistration,
                    gallery_download_enabled: galleryDownload,
                    single_photo_download_enabled: singlePhotoDownload,
                    require_pin_for_single_photo: requirePinForSinglePhoto,
                    social_sharing_enabled: socialSharing,
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
                        social_sharing_enabled: socialSharing,
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

    // Derived values
    const collectionName = collection?.name || 'Loading...';
    const collectionDate = collection?.event_date
        ? new Date(collection.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '...';

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (shareRef.current && !shareRef.current.contains(e.target)) setShowShareDropdown(false);
            if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setPhotoMenu(null);
            if (gridSettingsRef.current && !gridSettingsRef.current.contains(e.target)) setShowGridSettings(false);
            if (moreRef.current && !moreRef.current.contains(e.target)) {
                setShowMoreDropdown(false);
                setShowPresetsSubmenu(false);
            }
            if (setMenuRef.current && !setMenuRef.current.contains(e.target)) setShowSetMenu(null);
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
            if (favoriteActivityMenuRef.current && !favoriteActivityMenuRef.current.contains(e.target)) setActiveActivityMenu(null);
            if (favoriteDetailToolbarMenuRef.current && !favoriteDetailToolbarMenuRef.current.contains(e.target)) setFavoriteDetailToolbarMenuOpen(false);
            if (favoriteDetailPhotoMenuRef.current && !favoriteDetailPhotoMenuRef.current.contains(e.target)) setFavoriteDetailPhotoMenuPhotoId(null);
            if (favoriteActivitySortMenuRef.current && !favoriteActivitySortMenuRef.current.contains(e.target)) setFavoriteActivitySortMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const processSelectedUploadFiles = (fileList) => {
        if (processFiles(fileList)) {
            setShowUploadModal(false);
        }
    };

    const handleFileSelect = (e) => {
        processSelectedUploadFiles(e.target.files);
        e.target.value = '';
    };

    const openMediaFileDialog = (inputRef) => {
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
        const mediaFiles = Array.from(e.dataTransfer.files).filter(
            (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (mediaFiles.length === 0) return;
        if (processFiles(mediaFiles)) {
            setShowUploadModal(false);
        }
    };

    const toggleStatus = async () => {
        const newStatus = status === 'DRAFT' ? 'published' : 'draft';
        try {
            await galleryService.updateCollection(collectionId, { status: newStatus });
            setStatus(newStatus.toUpperCase());
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#111111] font-medium tracking-widest uppercase text-sm">Loading Collection...</p>
                </div>
            </div>
        );
    }

    if (error || !collection) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                        <h2 className="text-xl font-semibold text-[#111111] mb-2">
                            {error === 'Collection not found' ? 'Collection Not Found' : 'Failed to Load Collection'}
                        </h2>
                        <p className="text-[#666] mb-4">{error || 'This collection may have been deleted or you may not have permission to access it.'}</p>
                        <button 
                            onClick={() => navigate('/client-gallery')}
                            className="px-6 py-2 bg-[#111111] text-white rounded hover:bg-[#333] transition-colors"
                        >
                            Back to Collections
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`cd-layout-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

            {/* Top Navigation Bar ALWAYS Top */}
            <header className="cd-topbar">
                <div className="cd-topbar-left">
                    <button className="cd-back-btn" onClick={() => navigate('/client-gallery')} title="Back to Collections">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="cd-title-area">
                        <h1 className="cd-title">{collectionName}</h1>
                        <span className="cd-subtitle">{collectionDate}</span>
                    </div>
                    <div
                        className={`cd-status-badge ${status === 'PUBLISHED' ? 'published' : ''}`}
                        onClick={toggleStatus}
                    >
                        {status}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>

                <div className="cd-topbar-right">
                    <div className="cd-more-wrapper" ref={moreRef}>
                        <button
                            type="button"
                            className="cd-text-btn"
                            aria-expanded={showMoreDropdown}
                            aria-haspopup="menu"
                            onClick={() => {
                                setShowShareDropdown(false);
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
                                    <span>Delete collection</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="cd-text-btn"
                        onClick={() => {
                            const params = new URLSearchParams({
                                coverStyle: selectedCoverStyle,
                                font: selectedFont,
                                color: selectedColorPalette,
                                grid: gridSettings.style
                            });
                            openSpaPath(`/gallery/${collectionUrl}?${params.toString()}`);
                        }}
                    >
                        Preview
                    </button>
                    <div className="cd-share-wrapper" ref={shareRef}>
                        <div className="cd-share-split-btn">
                            <button className="cd-share-main" onClick={() => navigate('/shared-collection')}>Share</button>
                            <button className="cd-share-arrow" onClick={() => { setShowMoreDropdown(false); setShowPresetsSubmenu(false); setShowShareDropdown(!showShareDropdown); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                        </div>
                        {showShareDropdown && (
                            <div className="cd-share-dropdown">
                                <div
                                    className="cd-share-item"
                                    onClick={() => {
                                        setShowShareDropdown(false);
                                        if (collectionUrl) {
                                            openShareByEmail(getCollectionShareUrl(collectionUrl), collection?.name || 'Collection');
                                        }
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
                                            openWhatsAppShare(getCollectionShareUrl(collectionUrl), collection?.name || 'Collection');
                                        }
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor" /></svg>
                                    <span>Share on WhatsApp</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="cd-layout-body">
                {/* Left Sidebar */}
                <aside className="cd-sidebar">
                    <div className="cd-sidebar-scrollable">

                        <SidebarCoverUpload
                            coverUrl={collection?.cover_url}
                            isUpdating={isCoverUploading}
                            activeSetName={activeSetName}
                            onPhotoDrop={handleCoverPhotoDropById}
                            onSelectFromCollection={() => openCoverModal('all')}
                        />

                        <div className="cd-icon-bar">
                            <button
                                className={`cd-icon-bar-btn ${activeSidebarTab === 'photos' ? 'active' : ''}`}
                                title="Photos"
                                onClick={() => setActiveSidebarTab('photos')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </button>
                            <button
                                className={`cd-icon-bar-btn ${activeSidebarTab === 'design' ? 'active' : ''}`}
                                title="Design"
                                onClick={() => setActiveSidebarTab('design')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                            </button>
                            <button
                                className={`cd-icon-bar-btn ${activeSidebarTab === 'settings' ? 'active' : ''}`}
                                title="Settings"
                                onClick={() => setActiveSidebarTab('settings')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </button>
                            <button
                                className={`cd-icon-bar-btn ${activeSidebarTab === 'activity' ? 'active' : ''}`}
                                title="Activity"
                                onClick={() => setActiveSidebarTab('activity')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
                            </button>
                        </div>

                        {activeSidebarTab === 'photos' && (
                            <div className="cd-sidebar-photos-section">
                                <div className="cd-sidebar-photos-header">
                                    <span className="cd-photos-label">PHOTOS</span>
                                    <button className="cd-add-set-btn" onClick={() => setShowAddSetModal(true)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                        Add Set
                                    </button>
                                </div>
                                {/* Highlights (all photos) */}
                                <div className={`cd-set-item ${!activeSetId ? 'active' : ''}`} onClick={() => setActiveSetId(null)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cd-drag-handle"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line></svg>
                                    <span className="cd-set-name">{highlightsName} ({photos.filter(p => !p.set_id).length})</span>
                                    <div className="cd-set-actions">
                                        <div className="cd-set-more-container">
                                            <div className="cd-set-menu-wrapper">
                                                <button className="cd-set-menu-btn" onClick={(e) => { e.stopPropagation(); setShowSetMenu(showSetMenu === 'highlights' ? null : 'highlights'); }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                                </button>
                                                {showSetMenu === 'highlights' && (
                                                    <div className="cd-set-dropdown">
                                                        <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); openCoverModal('highlights'); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                            <span>Change cover</span>
                                                        </div>
                                                        <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); openEditSetModal({ id: 'highlights', name: highlightsName, description: collection?.description || '' }); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                            <span>Edit set</span>
                                                        </div>
                                                        <div className="cd-ctx-item cd-ctx-delete" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); handleDeleteSet('highlights'); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            <span>Delete set</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Dynamic Sets */}
                                {sets.map(set => (
                                    <div key={set.id} className={`cd-set-item ${activeSetId === set.id ? 'active' : ''}`} onClick={() => setActiveSetId(set.id)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cd-drag-handle"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line></svg>
                                        <span className="cd-set-name">{set.name} ({photos.filter(p => p.set_id === set.id).length})</span>
                                        <div className="cd-set-actions">
                                            <div className="cd-set-more-container">
                                                <div className="cd-set-menu-wrapper" ref={setMenuRef}>
                                                    <button className="cd-set-menu-btn" onClick={(e) => { e.stopPropagation(); setShowSetMenu(showSetMenu === set.id ? null : set.id); }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                                    </button>
                                                    {showSetMenu === set.id && (
                                                        <div className="cd-set-dropdown">
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); openCoverModal(set.id); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                                <span>Change cover</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); openEditSetModal(set); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                <span>Edit set</span>
                                                            </div>
                                                            <div className="cd-ctx-item cd-ctx-delete" onClick={(e) => { e.stopPropagation(); setShowSetMenu(null); handleDeleteSet(set.id); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                                <span>Delete set</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSidebarTab === 'design' && (
                            <div className="cd-sidebar-design-section">
                                <div className="cd-sidebar-design-header">
                                    <span className="cd-photos-label">DESIGN</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeDesignTab === 'cover' ? 'active' : ''}`}
                                    onClick={() => setActiveDesignTab('cover')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    <span>Cover</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeDesignTab === 'typography' ? 'active' : ''}`}
                                    onClick={() => setActiveDesignTab('typography')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
                                    <span>Typography</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeDesignTab === 'color' ? 'active' : ''}`}
                                    onClick={() => setActiveDesignTab('color')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 22c5-5 5-5 10-5h9" /><path d="M22 22c-5-5-5-5-10-5" /></svg>
                                    <span>Color</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeDesignTab === 'grid' ? 'active' : ''}`}
                                    onClick={() => setActiveDesignTab('grid')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                    <span>Grid</span>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'settings' && (
                            <div className="cd-sidebar-settings-section">
                                <div className="cd-sidebar-settings-header">
                                    <span className="cd-photos-label">SETTINGS</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeSettingsTab === 'general' ? 'active' : ''}`}
                                    onClick={() => setActiveSettingsTab('general')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    <span>General</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeSettingsTab === 'privacy' ? 'active' : ''}`}
                                    onClick={() => setActiveSettingsTab('privacy')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    <span>Privacy</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeSettingsTab === 'download' ? 'active' : ''}`}
                                    onClick={() => setActiveSettingsTab('download')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>Download</span>
                                    <span className="tab-badge">ON</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeSettingsTab === 'favorite' ? 'active' : ''}`}
                                    onClick={() => setActiveSettingsTab('favorite')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span>Favorite</span>
                                    <span className="tab-badge">ON</span>
                                </div>

                            </div>
                        )}

                        {activeSidebarTab === 'activity' && (
                            <div className="cd-sidebar-activity-section">
                                <div className="cd-sidebar-activity-header">
                                    <span className="cd-photos-label">ACTIVITIES</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'download' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('download')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>Download Activity</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'favorite' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('favorite')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span>Favorite Activity</span>
                                </div>

                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'store' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('store')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                                    <span>Store Orders</span>
                                </div>

                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'email' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('email')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>Email Registration</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Collapse Toggle */}
                    <div className="cd-sidebar-bottom-action">
                        <button
                            className="cd-collapse-toggle"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isSidebarCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                            )}
                        </button>
                    </div>
                </aside>

                {/* Main Content Wrapper */}
                <div className="cd-main-wrapper">
                    <main className="cd-main-area">
                        {activeSidebarTab === 'photos' && (
                            <>
                                <div className="cd-main-header">
                                    <h2 className="cd-main-title">{activeSetName} ({activeSetPhotoCount})</h2>
                                    <div className="cd-main-actions">
                                        <div className="cd-sort-wrapper" ref={sortRef}>
                                            <button type="button" className="cd-icon-btn sort-btn" onClick={() => { setShowGridSettings(false); setShowSortMenu(!showSortMenu); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="3" y1="6" x2="3" y2="18"></line><polyline points="1 15 3 18 5 15"></polyline></svg>
                                            </button>
                                            {showSortMenu && (
                                                <div className="cd-sort-dropdown">
                                                    <div className="cd-sort-label">Sort by</div>
                                                    <div className={`cd-sort-option ${sortOption === 'upload-new-old' ? 'selected' : ''}`} onClick={() => { setSortOption('upload-new-old'); setShowSortMenu(false); }}>Uploaded: New → Old</div>
                                                    <div className={`cd-sort-option ${sortOption === 'upload-old-new' ? 'selected' : ''}`} onClick={() => { setSortOption('upload-old-new'); setShowSortMenu(false); }}>Uploaded: Old → New</div>
                                                    <div className={`cd-sort-option ${sortOption === 'taken-new-old' ? 'selected' : ''}`} onClick={() => { setSortOption('taken-new-old'); setShowSortMenu(false); }}>Date Taken: New → Old</div>
                                                    <div className={`cd-sort-option ${sortOption === 'taken-old-new' ? 'selected' : ''}`} onClick={() => { setSortOption('taken-old-new'); setShowSortMenu(false); }}>Date Taken: Old → New</div>
                                                    <div className={`cd-sort-option ${sortOption === 'name-az' ? 'selected' : ''}`} onClick={() => { setSortOption('name-az'); setShowSortMenu(false); }}>Name: A-Z</div>
                                                    <div className={`cd-sort-option ${sortOption === 'name-za' ? 'selected' : ''}`} onClick={() => { setSortOption('name-za'); setShowSortMenu(false); }}>Name: Z-A</div>
                                                    <div className={`cd-sort-option ${sortOption === 'random' ? 'selected' : ''}`} onClick={() => { setSortOption('random'); setShowSortMenu(false); }}>Random</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="cd-grid-settings-wrapper" ref={gridSettingsRef}>
                                            <button type="button" className="cd-icon-btn active grid-btn" onClick={() => { setShowSortMenu(false); setShowGridSettings(!showGridSettings); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                            </button>
                                            {showGridSettings && (
                                                <div className="cd-grid-dropdown" role="menu">
                                                    <div className="cd-grid-section-label">Grid Size</div>
                                                    <div
                                                        className={`cd-grid-option ${gridSize === 'small' ? 'selected' : ''}`}
                                                        role="menuitemradio"
                                                        aria-checked={gridSize === 'small'}
                                                        onClick={() => setGridSize('small')}
                                                    >
                                                        <span>Small</span>
                                                        {gridSize === 'small' && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`cd-grid-option ${gridSize === 'large' ? 'selected' : ''}`}
                                                        role="menuitemradio"
                                                        aria-checked={gridSize === 'large'}
                                                        onClick={() => setGridSize('large')}
                                                    >
                                                        <span>Large</span>
                                                        {gridSize === 'large' && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        )}
                                                    </div>
                                                    <div className="cd-grid-divider"></div>
                                                    <div className="cd-grid-section-label">Show</div>
                                                    <div className="cd-grid-toggle-row">
                                                        <span>Filename</span>
                                                        <label className="cd-toggle" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                                            <input type="checkbox" checked={showFilename} onChange={() => setShowFilename(!showFilename)} />
                                                            <span className="cd-toggle-slider"></span>
                                                        </label>
                                                        <span className="cd-toggle-label">{showFilename ? 'On' : 'Off'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="cd-main-actions-divider"></div>
                                        <button className="cd-add-media-btn" onClick={() => setShowUploadModal(true)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                            Add Media
                                        </button>
                                    </div>
                                </div>

                                {gridPhotos.length > 0 ? (
                                    <div
                                        className={`cd-photo-grid cd-photo-grid--manage ${gridSize === 'large' ? 'grid-large' : ''}`}
                                    >
                                        {gridPhotos.map((photo, index) => {
                                            const menuAlignLeft = index % 4 >= 2;
                                            const isPending = Boolean(photo._uploadPending);
                                            return (
                                            <div
                                                className={`cd-photo-card ${selectedPhotos.includes(photo.id) ? 'selected' : ''} ${isGalleryImagePhoto(photo) && !isPending ? 'cd-photo-card--cover-draggable' : ''} ${photoMenu === photo.id ? 'cd-photo-card--menu-open' : ''} ${isPending ? 'cd-photo-card--pending' : ''}`}
                                                key={photo.id || index}
                                                draggable={isGalleryImagePhoto(photo) && !isPending}
                                                onDragStart={(e) => {
                                                    if (!isGalleryImagePhoto(photo)) return;
                                                    e.stopPropagation();
                                                    setCoverPhotoDragData(e.dataTransfer, photo.id);
                                                }}
                                                onDragEnd={() => endCoverPhotoDrag()}
                                                onClick={() => togglePhotoSelection(photo.id)}
                                            >
                                                <div className="cd-photo-card-inner cd-photo-card-inner--contain">
                                                    <CollectionGridPhoto
                                                        photo={photo}
                                                        index={index}
                                                    />
                                                    {isPending && (
                                                        <div
                                                            className="cd-photo-upload-overlay"
                                                            style={{ width: `${photo._uploadProgress || 0}%` }}
                                                        />
                                                    )}
                                                    {showFilename && <div className="cd-photo-filename" style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 12, color: '#666', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: 4 }}>{photo.filename || `photo-${index + 1}.jpg`}</div>}
                                                </div>

                                                {!isPending && (
                                                <>
                                                <div className="cd-photo-actions">
                                                    <button className="cd-photo-more-btn" onClick={(e) => { e.stopPropagation(); setPhotoMenu(photoMenu === photo.id ? null : photo.id); }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>
                                                    {photoMenu === photo.id && (
                                                        <div className={`cd-photo-menu ${menuAlignLeft ? 'cd-photo-menu--align-left' : ''}`} ref={photoMenuRef}>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); setLightboxOpenIndex(index); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                                                                <span>Open</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); handleQuickShare(photo); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                                <span>Quick share</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); handleDownloadPhoto(photo); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                                <span>Download</span>
                                                            </div>
                                                            <div className="cd-ctx-divider"></div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); setEditingPhoto(photo); setTargetSetId(photo.set_id); setMoveMode('move'); setShowMoveModal(true); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                                                                <span>Move/Copy</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); handleCopyFilename(photo); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                                <span>Copy filenames</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); handleSetAsCover(photo); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                                <span>Set as cover</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); setEditingPhoto(photo); setNewPhotoName(photo.filename); setShowRenameModal(true); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                                <span>Rename</span>
                                                            </div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); setEditingPhoto(photo); setShowReplaceModal(true); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path></svg>
                                                                <span>Replace photo</span>
                                                            </div>
                                                            <div className="cd-ctx-divider"></div>
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); setEditingPhoto(photo); setShowWatermarkModal(true); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M14.83 14.83a4 4 0 1 1 0-5.66"></path></svg>
                                                                <span>Watermark</span>
                                                            </div>
                                                            <div className="cd-ctx-divider"></div>
                                                            <div className="cd-ctx-item cd-ctx-delete" onClick={(e) => { e.stopPropagation(); setPhotoMenu(null); deleteSelectedPhotos([photo.id]); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                                <span>Delete</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    className={`cd-photo-star ${photo.is_starred ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); handleToggleStar(photo.id, photo.is_starred); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={photo.is_starred ? "#FFC107" : "none"} stroke={photo.is_starred ? "#FFC107" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                </button>
                                                </>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                ) : (
                                    <div className="cd-dropzone" onClick={handleDropzoneClick}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept={MEDIA_FILE_ACCEPT}
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
                                            <h3 className="cd-drop-title">Upload photos to {activeSetName}</h3>
                                            <p className="cd-drop-subtitle">or <span className="cd-browse-link">Browse files</span></p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* --- DESIGN VIEW --- */}
                        {activeSidebarTab === 'design' && (
                            <div className="cd-design-split-view">
                                <DesignTab
                                    activeTab={activeDesignTab}
                                    settings={{
                                        coverStyle: selectedCoverStyle,
                                        fontFamily: selectedFont,
                                        colorPalette: selectedColorPalette,
                                        grid: gridSettings
                                    }}
                                    coverPhotoUrl={collection?.cover_url || (photos.length > 0 ? photos[0].full_url : null)}
                                    onSettingsChange={(newSettings) => {
                                        setSelectedCoverStyle(newSettings.coverStyle);
                                        setSelectedFont(newSettings.fontFamily);
                                        setSelectedColorPalette(newSettings.colorPalette);
                                        setGridSettings(newSettings.grid);
                                    }}
                                    onOpenCoverModal={() => setShowCoverModal(true)}
                                    onOpenFocalModal={() => setShowFocalModal(true)}
                                />
                                <PreviewPane
                                    settings={{
                                        coverStyle: selectedCoverStyle,
                                        fontFamily: selectedFont,
                                        colorPalette: selectedColorPalette,
                                        grid: gridSettings
                                    }}
                                    collectionTitle={collection?.name || 'My Collection'}
                                    collectionDate="MARCH 12TH, 2026"
                                    collectionDescription={
                                        activeSetId
                                            ? sets.find((s) => s.id === activeSetId)?.description || ''
                                            : (collection?.description || sets[0]?.description || '')
                                    }
                                    coverPhotoUrl={collection?.cover_url || (photos.length > 0 ? photos[0].full_url : null)}
                                    gridPhotos={photos}
                                    previewMode={previewMode}
                                    onPreviewModeChange={setPreviewMode}
                                    photographerName={user?.display_name || 'PHOTOGRAPHER'}
                                    dashboardState={{
                                        focalX: collection?.focal_x ?? (collection?.cover_url?.match(/#focal=([\d.]+),([\d.]+)/)?.[1] ? parseFloat(collection.cover_url.match(/#focal=([\d.]+),([\d.]+)/)[1]) : 50),
                                        focalY: collection?.focal_y ?? (collection?.cover_url?.match(/#focal=([\d.]+),([\d.]+)/)?.[2] ? parseFloat(collection.cover_url.match(/#focal=([\d.]+),([\d.]+)/)[2]) : 50),
                                        activeSetId: activeSetId,
                                        sets: sets,
                                        collection: collection,
                                        photoDownload: photoDownload,
                                        galleryDownload: galleryDownload,
                                        singlePhotoDownload: singlePhotoDownload,
                                        favoritePhotos: favoritePhotos,
                                        socialSharing: socialSharing,
                                        downloadPin: downloadPin,
                                        pinValue: pinValue,
                                        requirePinForSinglePhoto: requirePinForSinglePhoto,
                                        emailTracking: emailRegistration,
                                        galleryPhotoSort: collection?.gallery_photo_sort,
                                    }}
                                    onSetActiveSet={setActiveSetId}
                                />
                            </div>
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'general' && (
                            <GeneralSettings
                                collectionId={collectionId}
                                collection={collection}
                                setCollection={setCollection}
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
                            />
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'privacy' && (
                            <PrivacySettings
                                collectionPassword={collectionPassword}
                                setCollectionPassword={setCollectionPassword}
                                showOnHomepage={showOnHomepage}
                                setShowOnHomepage={setShowOnHomepage}
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
                                photoDownload={photoDownload}
                                setPhotoDownload={setPhotoDownload}
                                showAdditionalOptions={showAdditionalOptions}
                                setShowAdditionalOptions={setShowAdditionalOptions}
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
                                downloadLimit={downloadLimit}
                                setDownloadLimit={setDownloadLimit}
                                restrictToEmails={restrictToEmails}
                                setRestrictToEmails={setRestrictToEmails}
                                selectedDownloadSets={selectedDownloadSets}
                                setSelectedDownloadSets={setSelectedDownloadSets}
                                sets={sets}
                                pinUsageLimit={pinUsageLimit}
                                setPinUsageLimit={setPinUsageLimit}
                                activeDownloadTab={activeDownloadTab}
                                setActiveDownloadTab={setActiveDownloadTab}
                                setActiveSidebarTab={setActiveSidebarTab}
                                setActiveActivitySubTab={setActiveActivitySubTab}
                            />
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'favorite' && (
                            <FavoriteSettings
                                favoritePhotos={favoritePhotos}
                                setFavoritePhotos={setFavoritePhotos}
                                favoriteNotes={favoriteNotes}
                                setFavoriteNotes={setFavoriteNotes}
                                setShowCreateFavoriteListModal={setShowCreateFavoriteListModal}
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
                            downloadDetailPhotos={downloadDetailPhotos}
                            loadingActivity={loadingActivity}
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
                    </main>

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
                                    {showSelectionMore && (
                                        <div className="cd-selection-more-dropdown" role="menu">
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
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => handleSelectionReorder(false)}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6m0 0l-5 5m5-5l5 5M5 6h14" /></svg></div>
                                                <span className="cd-ctx-text">Move to top</span>
                                                <span className="cd-ctx-hotkey">⌘ + ↑</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => handleSelectionReorder(true)}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v13m0 0l-5-5m5 5l5-5M5 18h14" /></svg></div>
                                                <span className="cd-ctx-text">Move to bottom</span>
                                                <span className="cd-ctx-hotkey">⌘ + ↓</span>
                                            </button>
                                            <button type="button" className="cd-ctx-item" role="menuitem" onClick={() => { closeSelectionChrome(); alert('Mobile app creation is coming soon.'); }}>
                                                <div className="cd-ctx-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
                                                <span className="cd-ctx-text">Create mobile app</span>
                                            </button>
                                        </div>
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
                                                accept={MEDIA_FILE_ACCEPT}
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
                                        <div className="cd-modal-footer">
                                            <span className="cd-modal-switch">Switch to classic uploader</span>
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
            {/* Focal Point Modal */}
            {
                showFocalModal && (
                    <div className="cd-modal-overlay">
                        <div className="cd-modal focal-modal">
                            <div className="cd-modal-header">
                                <h3 className="cd-modal-title">Set Focal Point</h3>
                                <button className="cd-modal-close" onClick={() => setShowFocalModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="cd-set-modal-body">
                                <div className="focal-point-container">
                                    {collection?.cover_url || photos.length > 0 ? (
                                        <div
                                            className="focal-image-wrapper"
                                            onMouseDown={(e) => {
                                                setIsDraggingFocal(true);
                                                handleFocalDrag(e);
                                            }}
                                            onMouseMove={handleFocalDrag}
                                            onMouseUp={() => setIsDraggingFocal(false)}
                                            onMouseLeave={() => setIsDraggingFocal(false)}
                                        >
                                            <img src={collection?.cover_url || photos[0]?.full_url} alt="Focal" draggable="false" />
                                            <div
                                                className="focal-crosshair"
                                                style={{ left: `${focalX}%`, top: `${focalY}%` }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}>
                                                    <circle cx="16" cy="16" r="12" fill="rgba(255, 255, 255, 0.85)" />
                                                    <circle cx="16" cy="16" r="5" fill="#26a69a" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="focal-empty">No cover photo set</div>
                                    )}
                                </div>
                                <p className="focal-instruction">Drag the crosshair to set the focal point for your cover photo and grid.</p>
                            </div>
                            <div className="cd-set-modal-footer">
                                <button className="cd-cancel-btn" onClick={() => setShowFocalModal(false)}>Cancel</button>
                                <button className="cd-save-btn" onClick={handleFocalSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>
                    </div>
                )
            }


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

            <UploadManager
                state={uploadState}
                destinationLabel={uploadDestinationLabel}
                isPaused={uploadState.isPaused}
                onMinimize={minimizeUploads}
                onExpand={expandUploads}
                onClose={cancelUploads}
                onPause={pauseUploads}
                onResume={resumeUploads}
                onCancel={cancelUploads}
                onTabChange={setUploadTab}
                onToggleDetails={toggleUploadDetails}
                onViewCompleted={minimizeUploads}
            />

            {/* Create Favorite List Modal (single overlay — matches preset list flow) */}
            {showCreateFavoriteListModal && (
                <div
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
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
                            <h3 id="favorite-list-modal-title" className="text-sm font-bold uppercase tracking-[0.12em] text-gray-900">
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
                                <label className="mb-2 block text-sm font-semibold text-gray-900">Client email</label>
                                <input
                                    type="email"
                                    disabled={!!editingFavoriteList}
                                    className="w-full rounded border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C] disabled:cursor-not-allowed disabled:bg-gray-50"
                                    placeholder="e.g. client@email.com"
                                    value={favoriteListEmail}
                                    onChange={(e) => setFavoriteListEmail(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Your client is required to sign in using this email to see this favorite list
                                </p>
                            </div>

                            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:gap-6">
                                <div className="min-w-0 flex-1">
                                    <label className="mb-2 block text-sm font-semibold text-gray-900">Favorite list name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="e.g. For retouching"
                                        value={favoriteListName}
                                        onChange={(e) => setFavoriteListName(e.target.value)}
                                    />
                                    <p className="mt-2 text-xs text-gray-500">Your clients will see this name</p>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <label className="mb-2 block text-sm font-semibold text-gray-900">Max selection</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full rounded border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="e.g. 30"
                                        value={favoriteListMax}
                                        onChange={(e) => setFavoriteListMax(e.target.value)}
                                    />
                                    <p className="mt-2 text-xs text-gray-500">Limit the number of photos your clients can pick</p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-900">List description</label>
                                <div className="relative">
                                    <textarea
                                        className="h-32 w-full resize-none rounded border border-gray-200 p-3 pb-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1ABC9C] focus:outline-none focus:ring-1 focus:ring-[#1ABC9C]"
                                        placeholder="Optional"
                                        maxLength={500}
                                        value={favoriteListDesc}
                                        onChange={(e) => setFavoriteListDesc(e.target.value)}
                                    />
                                    <span className="pointer-events-none absolute bottom-2 left-3 text-xs text-gray-400">
                                        {favoriteListDesc.length} / 500
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-5">
                            <button
                                type="button"
                                onClick={() => setShowCreateFavoriteListModal(false)}
                                className="px-2 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateFavoriteList}
                                disabled={!favoriteListEmail?.trim() || !favoriteListName?.trim()}
                                className="rounded bg-[#1ABC9C] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#16a085] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {editingFavoriteList ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Change Cover Modal */}
            <ChangeCoverModal
                isOpen={showCoverModal}
                onClose={closeCoverModal}
                photos={coverModalPhotos}
                scopeLabel={coverModalScopeLabel}
                onSelectPhoto={(photo) => {
                    void handleCoverPhotoSelect(photo);
                }}
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
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>COLLECTION URL</label>
                                <div style={{ display: 'flex' }}>
                                    <input type="text" readOnly value={`${window.location.origin}/gallery/${collectionUrl}`} style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', fontSize: '14px', backgroundColor: '#f9f9f9', outline: 'none', color: '#555' }} />
                                    <button style={{ padding: '0 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/gallery/${collectionUrl}`)}>Copy</button>
                                </div>
                                <div style={{ fontSize: '13px', color: '#2b78c5', marginTop: '8px', cursor: 'pointer', display: 'inline-block' }}>Need a custom domain?</div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>COLLECTION PASSWORD</label>
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
                collection={collectionUrl ? { slug: collectionUrl, name: collection?.name } : null}
                isOpen={showQrCodeModal}
                onClose={() => setShowQrCodeModal(false)}
            />

            {/* Email History Modal */}
            {showEmailHistoryModal && (
                <div className="cd-modal-overlay" onClick={() => setShowEmailHistoryModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>EMAIL HISTORY <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></h3>
                            <button className="cd-modal-close" onClick={() => setShowEmailHistoryModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Please note it may take a few minutes for new email history to appear.</p>
                            <div style={{ border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#555', letterSpacing: '0.5px' }}>EMAIL</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#555', letterSpacing: '0.5px' }}>SUBJECT</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#555', letterSpacing: '0.5px' }}>DATE SENT</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#555', letterSpacing: '0.5px' }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#888', fontSize: '14px' }}>No email history found.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Preset Modal */}
            {showApplyPresetModal && (
                <div className="cd-modal-overlay" onClick={() => setShowApplyPresetModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">APPLY PRESET TO COLLECTION</h3>
                            <button className="cd-modal-close" onClick={() => setShowApplyPresetModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>Applying a preset will overwrite your current collection settings. This action cannot be undone.</p>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>SELECT PRESET</label>
                            <div style={{ position: 'relative', marginBottom: '10px' }}>
                                <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', appearance: 'none', backgroundColor: '#fff', outline: 'none' }}>
                                    <option>Select a preset...</option>
                                    <option>Default Settings</option>
                                    <option>Wedding Default</option>
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowApplyPresetModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={() => setShowApplyPresetModal(false)}>Apply</button>
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
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>Save your current collection settings as a preset to easily apply them to other collections.</p>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>PRESET NAME</label>
                            <input type="text" placeholder="e.g. Standard Wedding" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowSavePresetModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={() => setShowSavePresetModal(false)}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move To Modal */}
            {showMoveToModal && (
                <div className="cd-modal-overlay" onClick={() => setShowMoveToModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">MOVE COLLECTION TO</h3>
                            <button className="cd-modal-close" onClick={() => setShowMoveToModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                <span style={{ fontWeight: '500' }}>Home</span>
                            </div>
                            <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: '#f9f9f9' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#a4d1f5" stroke="#a4d1f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    <span style={{ fontSize: '14px', color: '#333' }}>2026 Weddings</span>
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#a4d1f5" stroke="#a4d1f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    <span style={{ fontSize: '14px', color: '#333' }}>Portraits</span>
                                </div>
                            </div>
                            <div style={{ color: '#2b78c5', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>+ Move to new folder</div>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowMoveToModal(false)}>Cancel</button>
                            <button className="cd-save-btn disabled">Move</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Modal */}
            {showDuplicateModal && (
                <div className="cd-modal-overlay" onClick={() => setShowDuplicateModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">DUPLICATE COLLECTION</h3>
                            <button className="cd-modal-close" onClick={() => setShowDuplicateModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Are you sure you want to duplicate this collection?</p>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>• Duplicating a collection may take a few minutes depending on the size.</p>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>• Videos will not be duplicated.</p>
                            <p style={{ fontSize: '13px', color: '#666' }}>• Photos in the new collection will be temporarily unavailable while the process is running.</p>
                        </div>
                        <div className="cd-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowDuplicateModal(false)}>Cancel</button>
                            <button className="cd-save-btn" disabled={saving} onClick={async () => {
                                const photographerId = collection?.photographer_id ?? user?.id;
                                if (!collectionId || !photographerId) {
                                    alert('Missing collection or account. Refresh and try again.');
                                    return;
                                }
                                try {
                                    setSaving(true);
                                    const newRow = await galleryService.duplicateCollection(collectionId, photographerId);
                                    setShowDuplicateModal(false);
                                    navigate(`/collections/manage?id=${newRow.id}`);
                                } catch (err) {
                                    console.error('Failed to duplicate:', err);
                                    alert(err?.message || 'Failed to duplicate collection. Please try again.');
                                } finally {
                                    setSaving(false);
                                }
                            }}>{saving ? 'Duplicating…' : 'Duplicate'}</button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Delete Collection Modal */}
            {showDeleteCollectionModal && (
                <div className="cd-modal-overlay" onClick={() => setShowDeleteCollectionModal(false)}>
                    <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">DELETE COLLECTION</h3>
                            <button className="cd-modal-close" onClick={() => setShowDeleteCollectionModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="cd-modal-body" style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Are you sure you want to delete this collection?</p>
                            <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}><strong>Warning:</strong> All photos and past activities will be permanently removed.</p>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={deleteCollectionConfirm}
                                    onChange={(e) => setDeleteCollectionConfirm(e.target.checked)}
                                    style={{ marginTop: '4px', width: '16px', height: '16px' }}
                                />
                                <span style={{ fontSize: '13px', color: '#333' }}>I accept that this collection will be permanently deleted</span>
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
                                        navigate('/client-gallery');
                                    } catch (err) {
                                        console.error('Failed to delete collection:', err);
                                        alert('Failed to delete collection. Please try again.');
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
                                        <span className="text-sm">Move</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={moveMode === 'copy'} onChange={() => setMoveMode('copy')} />
                                        <span className="text-sm">Copy</span>
                                    </label>
                                </div>
                            </div>
                            <div className="cd-form-group mt-6">
                                <label className="cd-form-label">Target Set</label>
                                <select
                                    className="cd-form-input"
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
                            <p className="text-sm text-[#666] mb-6">
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

                        {/* Image / Video */}
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
                        ) : (
                            <img
                                src={lbPhoto.full_url}
                                alt={lbPhoto.filename}
                                className="cd-lightbox-image"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}

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
                const shareUrl = `${window.location.origin}/gallery/${collection?.slug}?photo=${editingPhoto.id}`;
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
                                <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Share a direct link to this photo with your client.</p>
                                <div style={{ display: 'flex', gap: 0, border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
                                    <input type="text" readOnly value={shareUrl} style={{ flex: 1, padding: '10px 12px', fontSize: 13, border: 'none', outline: 'none', background: '#f9f9f9', color: '#555' }} />
                                    <button
                                        style={{ padding: '0 18px', backgroundColor: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
                                        onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                                    >
                                        Copy Link
                                    </button>
                                </div>
                                <div className="cd-quick-share-icons" style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button type="button" title="Share by email" onClick={() => openShareByEmail(shareUrl, `Photo from ${collection?.name || 'Collection'}`)} style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f5f5f5', color: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
                    <div className="cd-modal cd-modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="cd-modal-header">
                            <h3 className="cd-modal-title">Watermark Photo</h3>
                            <button className="cd-modal-close" onClick={() => setShowWatermarkModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="cd-set-modal-body">
                            {/* Preview */}
                            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', marginBottom: 16, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', maxHeight: 200 }}>
                                <img src={editingPhoto.full_url} alt={editingPhoto.filename} style={{ maxHeight: 200, objectFit: 'contain' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 28, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                                        {collection?.name || 'WATERMARK'}
                                    </span>
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                                Watermarks are applied using your collection name. To customize watermarks, go to <strong>Settings → Watermark</strong>.
                            </p>
                            <div style={{ backgroundColor: '#fef9e7', border: '1px solid #f9d055', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: '#7a6000' }}>
                                <strong>Note:</strong> This is a preview. Watermark functionality requires a Premium plan upgrade.
                            </div>
                        </div>
                        <div className="cd-set-modal-footer">
                            <button className="cd-cancel-btn" onClick={() => setShowWatermarkModal(false)}>Cancel</button>
                            <button className="cd-save-btn" onClick={() => { alert('Watermark applied! (Premium feature)'); setShowWatermarkModal(false); }}>Apply Watermark</button>
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
                                <div className="form-group">
                                    <label>To:</label>
                                    <input 
                                        type="text" 
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
                                    />
                                </div>

                                <div className="dynamic-text-section">
                                    <div className="section-header" onClick={() => setShowDynamicTextInfo(!showDynamicTextInfo)}>
                                        <span>How to insert dynamic text</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showDynamicTextInfo ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                    {showDynamicTextInfo && (
                                        <div className="section-content">
                                            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <li><strong>{`{collection.name}`}</strong> - Name of the collection</li>
                                                <li><strong>{`{expiry.date}`}</strong> - The date the collection expires</li>
                                                <li><strong>{`{days.prior}`}</strong> - Number of days before expiry</li>
                                                <li><strong>{`{collection.url}`}</strong> - Link to the gallery</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="include-info-section">
                                    <p className="section-label">Include collection info:</p>
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
                                                        .replace(/{collection.name}/g, collection?.name || 'WEDDING')
                                                        .replace(/{expiry.date}/g, autoExpiry ? `${new Date(autoExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at 11:59 PM` : 'MM/DD/YYYY at 11:59 PM')
                                                        .replace(/{days.prior}/g, expiryEmailTiming.split(' ')[0])
                                                        .replace(/{collection.url}/g, `${window.location.origin}/gallery/${collection?.slug || '...'}`)
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

            <button type="button" className="cd-help-fab" aria-label="Help and support" title="Help">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            </button>

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: '#E74C3C',
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
