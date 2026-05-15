import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { DesignTab } from '../components/features/CollectionDashboard/DesignTab';
import { PreviewPane } from '../components/features/CollectionDashboard/PreviewPane';
import { ChangeCoverModal } from '../components/features/CollectionDashboard/CoverSettings/ChangeCoverModal';
import { downloadPhotoFromR2 } from '../lib/downloadPhoto';
import { sortDashboardPhotos } from '../utils/sortDashboardPhotos';
import { DatePicker } from '../components/ui/DatePicker';
import './CollectionDashboard.css';

const CollectionDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get('id');
    const { user } = useAuth();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [collection, setCollection] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // MORE DROPDOWN MODAL STATES
    const [showGetDirectLinkModal, setShowGetDirectLinkModal] = useState(false);
    const [showEmailHistoryModal, setShowEmailHistoryModal] = useState(false);
    const [showManagePresetsModal, setShowManagePresetsModal] = useState(false);
    const [showApplyPresetModal, setShowApplyPresetModal] = useState(false);
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [showMoveToModal, setShowMoveToModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
    const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState(false);
    const [uploadWidget, setUploadWidget] = useState({
        isOpen: false,
        isMinimized: false,
        files: [] // { id, name, size, progress, status }
    });

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
    const [showDynamicTextInfo, setShowDynamicTextInfo] = useState(false);
    const [backendActivityCounts, setBackendActivityCounts] = useState({
        contacts: 0,
        downloaded: 0,
        registered: 0,
        favorited: 0,
        purchased: 0
    });





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
    const favoriteActivityMenuRef = useRef(null);
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

    useEffect(() => {
        if (collectionId) {
            fetchFavoriteActivity();
            fetchDownloadActivity();
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

    const handleSetAsCover = async (photo) => {
        try {
            await galleryService.updateCollection(collectionId, { cover_url: photo.full_url });
            setCollection(prev => ({ ...prev, cover_url: photo.full_url }));
            alert('Collection cover updated!');
        } catch (err) {
            console.error('Failed to set cover:', err);
            alert('Failed to set cover photo.');
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
            await galleryService.updateCollection(collectionId, {
                expiry_email_timing: expiryEmailTiming,
                expiry_email_to: expiryEmailTo,
                expiry_email_subject: expiryEmailSubject,
                expiry_email_body: expiryEmailBody,
                expiry_email_include_pin: expiryEmailIncludePin,
                expiry_email_send_copy: expiryEmailSendCopy,
                expiry_email_lists: expiryEmailLists
            });
            setCollection(prev => ({
                ...prev,
                expiry_email_timing: expiryEmailTiming,
                expiry_email_to: expiryEmailTo,
                expiry_email_subject: expiryEmailSubject,
                expiry_email_body: expiryEmailBody,
                expiry_email_include_pin: expiryEmailIncludePin,
                expiry_email_send_copy: expiryEmailSendCopy,
                expiry_email_lists: expiryEmailLists
            }));
            setShowExpiryReminderModal(false);
            setToastMessage('Expiry reminder email saved!');
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error('Failed to save expiry email:', err);
            alert('Failed to save expiry email settings.');
        } finally {
            setSaving(false);
        }
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
                const data = await galleryService.getCollectionById(collectionId);
                setCollection(data);

                // Initialize state from collection data
                if (data.status) setStatus(data.status.toUpperCase());
                if (data.slug) setCollectionUrl(data.slug);
                if (data.client_password_hash) setCollectionPassword(data.client_password_hash);

                // Map individual columns to state
                if (data.cover_style) setSelectedCoverStyle(data.cover_style);
                if (data.font_family) setSelectedFont(data.font_family);
                if (data.color_palette) setSelectedColorPalette(data.color_palette);

                setGridSettings({
                    style: data.grid_style || 'vertical',
                    size: data.thumbnail_size || 'regular',
                    spacing: data.grid_spacing || 'regular',
                    navigation: data.nav_style || 'icons'
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

                // Fetch photos and sets
                const photoData = data.photos || [];
                setPhotos(photoData);
                const setsData = data.sets || [];
                setSets(setsData);

                // Fetch activity counts
                const counts = await galleryService.getActivityCounts(collectionId);
                setBackendActivityCounts(counts);
            } catch (err) {
                console.error('Error fetching collection:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCollectionData();
    }, [collectionId, navigate]);

    // Global click listener to close menus
    useEffect(() => {
        const handleClickOutside = () => {
            if (activeActivityMenu) setActiveActivityMenu(null);
            if (favoriteDetailPhotoMenuPhotoId) setFavoriteDetailPhotoMenuPhotoId(null);
            if (showSelectionMore) setShowSelectionMore(false);
            if (showSelectAllMenu) setShowSelectAllMenu(false);
            if (showMoveToSetMenu) setShowMoveToSetMenu(false);
            if (favoriteActivitySortMenuOpen) setFavoriteActivitySortMenuOpen(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
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
    const activeSetPhotoCount = activeSetId
        ? photos.filter(p => p.set_id === activeSetId).length
        : photos.filter(p => !p.set_id).length;

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

    // Auto-save general settings
    useEffect(() => {
        if (!collection || loading) return;

        const saveGeneralSettings = async () => {
            try {
                await galleryService.updateCollection(collectionId, {
                    slug: collectionUrl,
                    client_password_hash: collectionPassword
                });
            } catch (err) {
                console.error('Error auto-saving general settings:', err);
            }
        };

        const timeoutId = setTimeout(saveGeneralSettings, 1500); // Slightly longer debounce for URL
        return () => clearTimeout(timeoutId);
    }, [collectionUrl, collectionPassword, collectionId, collection, loading]);

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
            if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setActivePhotoMenu(null);
            if (gridSettingsRef.current && !gridSettingsRef.current.contains(e.target)) setShowGridSettings(false);
            if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreDropdown(false);
            if (setMenuRef.current && !setMenuRef.current.contains(e.target)) setShowSetMenu(null);
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false);
            if (selectionMoreRef.current && !selectionMoreRef.current.contains(e.target)) setShowSelectionMore(false);
            if (selectAllMenuRef.current && !selectAllMenuRef.current.contains(e.target)) setShowSelectAllMenu(false);
            if (moveToSetRef.current && !moveToSetRef.current.contains(e.target)) setShowMoveToSetMenu(false);
            if (favoriteActivityMenuRef.current && !favoriteActivityMenuRef.current.contains(e.target)) setActiveActivityMenu(null);
            if (favoriteDetailToolbarMenuRef.current && !favoriteDetailToolbarMenuRef.current.contains(e.target)) setFavoriteDetailToolbarMenuOpen(false);
            if (favoriteDetailPhotoMenuRef.current && !favoriteDetailPhotoMenuRef.current.contains(e.target)) setFavoriteDetailPhotoMenuPhotoId(null);
            if (favoriteActivitySortMenuRef.current && !favoriteActivitySortMenuRef.current.contains(e.target)) setFavoriteActivitySortMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (e) => {
        const rawFiles = Array.from(e.target.files);
        const files = rawFiles.filter(f => f.size > 0);
        
        if (rawFiles.length > 0 && files.length === 0) {
            alert("The selected files are empty or corrupted. If you are uploading a file from another app, please save it to your computer first.");
            return;
        }
        if (files.length === 0) return;

        setShowUploadModal(false);

        const newUploadFiles = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'uploading'
        }));

        setUploadWidget(prev => ({
            isOpen: true,
            isMinimized: false,
            files: [...prev.files, ...newUploadFiles]
        }));

        newUploadFiles.forEach(uf => {
            // Simulate progress while uploading
            const interval = setInterval(() => {
                setUploadWidget(prev => ({
                    ...prev,
                    files: prev.files.map(f => {
                        if (f.id === uf.id && f.status === 'uploading') {
                            const add = Math.floor(Math.random() * 15) + 5;
                            return { ...f, progress: Math.min(f.progress + add, 90) };
                        }
                        return f;
                    })
                }));
            }, 400);

            // Upload with activeSetId so photos are assigned to the current set
            galleryService.uploadPhoto(collectionId, collection.photographer_id, uf.file, photos.length, activeSetId)
                .then(photoData => {
                    clearInterval(interval);
                    setUploadWidget(prev => ({
                        ...prev,
                        files: prev.files.map(f => f.id === uf.id ? { ...f, progress: 100, status: 'completed' } : f)
                    }));
                    setPhotos(prev => [...prev, photoData]);
                })
                .catch(err => {
                    clearInterval(interval);
                    console.error('Upload failed:', err);
                    setUploadWidget(prev => ({
                        ...prev,
                        files: prev.files.map(f => f.id === uf.id ? { ...f, status: 'error' } : f)
                    }));
                });
        });
    };

    const handleDropzoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleModalBrowse = () => {
        modalFileInputRef.current?.click();
    };

    const handleModalDragOver = (e) => {
        e.preventDefault();
        setIsDraggingModal(true);
    };

    const handleModalDragLeave = () => {
        setIsDraggingModal(false);
    };

    const handleModalDrop = async (e) => {
        e.preventDefault();
        setIsDraggingModal(false);
        const rawFiles = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        const files = rawFiles.filter(f => f.size > 0);

        if (rawFiles.length > 0 && files.length === 0) {
            alert("The dropped files are empty (0 bytes). This commonly happens when dragging directly from apps like WhatsApp. Please save the file to your computer first, then upload.");
            return;
        }
        if (files.length === 0) return;

        setShowUploadModal(false);

        const newUploadFiles = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'uploading'
        }));

        setUploadWidget(prev => ({
            isOpen: true,
            isMinimized: false,
            files: [...prev.files, ...newUploadFiles]
        }));

        newUploadFiles.forEach(uf => {
            const interval = setInterval(() => {
                setUploadWidget(prev => ({
                    ...prev,
                    files: prev.files.map(f => {
                        if (f.id === uf.id && f.status === 'uploading') {
                            const add = Math.floor(Math.random() * 15) + 5;
                            return { ...f, progress: Math.min(f.progress + add, 90) };
                        }
                        return f;
                    })
                }));
            }, 400);

            galleryService.uploadPhoto(collectionId, collection.photographer_id, uf.file, photos.length, activeSetId)
                .then(photoData => {
                    clearInterval(interval);
                    setUploadWidget(prev => ({
                        ...prev,
                        files: prev.files.map(f => f.id === uf.id ? { ...f, progress: 100, status: 'completed' } : f)
                    }));
                    setPhotos(prev => [...prev, photoData]);
                })
                .catch(err => {
                    clearInterval(interval);
                    console.error('Upload failed:', err);
                    setUploadWidget(prev => ({
                        ...prev,
                        files: prev.files.map(f => f.id === uf.id ? { ...f, status: 'error' } : f)
                    }));
                });
        });
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
                        <button className="cd-text-btn" onClick={() => { setShowShareDropdown(false); setShowMoreDropdown(!showMoreDropdown); }}>
                            More <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {showMoreDropdown && (
                            <div className="cd-more-dropdown">
                                <div className="cd-ctx-item" onClick={() => { setShowMoreDropdown(false); setShowGetDirectLinkModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Get direct link</span>
                                </div>
                                <div className="cd-ctx-item" onClick={() => { setShowMoreDropdown(false); setShowEmailHistoryModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M3.32 14A9 9 0 1 0 3 10l-2 1" /></svg>
                                    <span>View email history</span>
                                </div>
                                <div className="cd-ctx-item preset-item" onClick={() => setShowManagePresetsModal(!showManagePresetsModal)} style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="12" y2="12" /></svg>
                                        <span>Manage presets</span>
                                    </div>
                                    {showManagePresetsModal && (
                                        <div className="cd-preset-submenu" style={{ position: 'absolute', right: '-190px', top: '-4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 0', width: '180px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowMoreDropdown(false); setShowManagePresetsModal(false); setShowApplyPresetModal(true); }}>
                                                <span>Apply preset</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowMoreDropdown(false); setShowManagePresetsModal(false); setShowSavePresetModal(true); }}>
                                                <span>Save as preset</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="cd-ctx-item" onClick={() => { setShowMoreDropdown(false); setShowMoveToModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 12H3" /><path d="m11 18 6-6-6-6" /><path d="M21 5v14" /></svg>
                                    <span>Move to</span>
                                </div>
                                <div className="cd-ctx-item" onClick={() => { setShowMoreDropdown(false); setShowDuplicateModal(true); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    <span>Duplicate</span>
                                </div>
                                <div className="cd-ctx-item" onClick={() => { setShowMoreDropdown(false); setShowDeleteCollectionModal(true); setDeleteCollectionConfirm(false); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    <span>Delete collection</span>
                                </div>
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
                            window.open(`/gallery/${collectionUrl}?${params.toString()}`, '_blank');
                        }}
                    >
                        Preview
                    </button>
                    <div className="cd-share-wrapper" ref={shareRef}>
                        <div className="cd-share-split-btn">
                            <button className="cd-share-main" onClick={() => navigate('/shared-collection')}>Share</button>
                            <button className="cd-share-arrow" onClick={() => { setShowMoreDropdown(false); setShowShareDropdown(!showShareDropdown); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                        </div>
                        {showShareDropdown && (
                            <div className="cd-share-dropdown">
                                <div className="cd-share-item" onClick={() => setShowShareDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>Share by email</span>
                                </div>
                                <div className="cd-share-item" onClick={() => setShowShareDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Get direct link</span>
                                </div>
                                <div className="cd-share-item" onClick={() => setShowShareDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                                    <span>Get QR code</span>
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

                        <div className="cd-cover-image">
                            {collection?.cover_url ? (
                                <img src={collection.cover_url} alt="Cover" />
                            ) : photos.length > 0 ? (
                                <img src={photos[0].full_url} alt="Cover" />
                            ) : (
                                <img src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&auto=format&fit=crop&q=60" alt="Cover" />
                            )}
                            <div className="cd-cover-hover-overlay" onClick={() => setShowCoverModal(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                <span>Change Cover</span>
                            </div>
                        </div>

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
                                                        <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); openEditSetModal({ id: 'highlights', name: highlightsName, description: collection?.description || '' }); }}>
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
                                                            <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); openEditSetModal(set); }}>
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

                                {sortedPhotos.length > 0 ? (
                                    <div
                                        className={`cd-photo-grid ${gridSize === 'large' ? 'grid-large' : ''}`}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize === 'large' ? 280 : 200}px, 1fr))`,
                                            gap: gridSize === 'large' ? '20px' : '16px',
                                            padding: '16px 0'
                                        }}
                                    >
                                        {sortedPhotos.map((photo, index) => (
                                            <div
                                                className={`cd-photo-card ${selectedPhotos.includes(photo.id) ? 'selected' : ''}`}
                                                key={photo.id || index}
                                                onClick={() => togglePhotoSelection(photo.id)}
                                                style={{
                                                    aspectRatio: '1 / 1',
                                                    backgroundColor: '#f8f8f8',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'visible',
                                                    cursor: 'pointer',
                                                    border: selectedPhotos.includes(photo.id) ? '2px solid #12b8a6' : '1px solid #f0f0f0'
                                                }}
                                            >
                                                <div className="cd-photo-card-inner">
                                                    {/\.(mp4|webm|ogg|mov)$/i.test(photo.filename || photo.full_url || '') ? (
                                                        <video
                                                            src={photo.full_url}
                                                            className="cd-photo-img"
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'contain',
                                                                display: 'block'
                                                            }}
                                                            muted
                                                            loop
                                                            playsInline
                                                            onMouseEnter={(e) => e.target.play().catch(() => {})}
                                                            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={photo.full_url}
                                                            alt={photo.filename || `Photo ${index + 1}`}
                                                            className="cd-photo-img"
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'contain',
                                                                display: 'block'
                                                            }}
                                                        />
                                                    )}
                                                    {showFilename && <div className="cd-photo-filename" style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 12, color: '#666', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: 4 }}>{photo.filename || `photo-${index + 1}.jpg`}</div>}
                                                </div>

                                                <div className="cd-photo-actions">
                                                    <button className="cd-photo-more-btn" onClick={(e) => { e.stopPropagation(); setPhotoMenu(photoMenu === photo.id ? null : photo.id); }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>
                                                    {photoMenu === photo.id && (
                                                        <div className="cd-photo-menu" ref={photoMenuRef}>
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
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="cd-dropzone" onClick={handleDropzoneClick}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept="image/*,video/*"
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
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header">
                                    <h2 className="cd-settings-main-title">General Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
                                </div>

                                <div className="cd-settings-form">


                                    <div className="settings-section">
                                        <label className="settings-label">Collection URL</label>
                                        <div className="settings-input-wrapper">
                                            <input
                                                type="text"
                                                className="settings-input"
                                                value={collectionUrl}
                                                onChange={(e) => setCollectionUrl(e.target.value)}
                                            />
                                        </div>
                                        <p className="settings-desc">Choose a unique url for visitors to access your collection.</p>
                                    </div>

                                    <div className="settings-section">
                                        <label className="settings-label">Category Tags</label>
                                        <div className="settings-input-wrapper">
                                            <input type="text" className="settings-input" placeholder="Select or enter tags" />
                                        </div>
                                        <p className="settings-desc">Add tags to categorize different collections e.g. wedding, outdoor, summer. <span className="settings-link">Learn more</span></p>
                                    </div>

                                    <div className="settings-section">
                                        <label className="settings-label">Default Watermark</label>
                                        <div className="settings-select-wrapper">
                                            <select className="settings-select" value={defaultWatermark} onChange={(e) => setDefaultWatermark(e.target.value)}>
                                                <option>No watermark</option>
                                                <option>Center Watermark</option>
                                                <option>Bottom Right Watermark</option>
                                            </select>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                        <p className="settings-desc">Set the default watermark to apply to photos. Manage watermarks in <span className="settings-link">App settings</span>.</p>
                                    </div>

                                    <div className="settings-section">
                                        <label className="settings-label">Auto Expiry</label>
                                        <div className="settings-input-wrapper custom-dp">
                                            <DatePicker 
                                                value={autoExpiry} 
                                                onChange={async (newDate) => {
                                                    setAutoExpiry(newDate);
                                                    try {
                                                        await galleryService.updateCollection(collectionId, { auto_expiry: newDate });
                                                        setCollection(prev => ({ ...prev, auto_expiry: newDate }));
                                                    } catch (err) {
                                                        console.error('Failed to save auto expiry:', err);
                                                    }
                                                }}
                                                placeholder="Optional"
                                                disablePastDates={true}
                                            />
                                        </div>
                                        <p className="settings-desc">Automatically set your collection to hidden on a specific date (at 11:59pm <span className="highlight-text">GMT+5:30</span>)</p>
                                        <button className="settings-action-btn" onClick={() => setShowExpiryReminderModal(true)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                            {collection?.expiry_email_to ? 'Edit expiry reminder email' : 'Add expiry reminder email'}
                                        </button>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Email Registration</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={emailRegistration} onChange={() => setEmailRegistration(!emailRegistration)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{emailRegistration ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Track email addresses accessing this collection. <span className="settings-link">Learn more</span></p>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Gallery Assist</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={galleryAssist} onChange={() => setGalleryAssist(!galleryAssist)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{galleryAssist ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Add walk-through cards to help visitors use the collection. <span className="settings-link">Learn more</span></p>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Slideshow</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={slideshow} onChange={() => setSlideshow(!slideshow)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{slideshow ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Allow visitors to view the images in their collection as a slideshow. <span className="settings-link">Learn more</span></p>
                                        <button className="settings-action-btn secondary">
                                            Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </button>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Social Sharing</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialSharing} 
                                                        onChange={() => {
                                                            const newValue = !socialSharing;
                                                            setSocialSharing(newValue);
                                                            setCollection(prev => prev ? { ...prev, social_sharing_enabled: newValue } : prev);
                                                        }} 
                                                    />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{socialSharing ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Allow collection visitors to share your work to social media.</p>
                                    </div>

                                    <div className="settings-section">
                                        <label className="settings-label">Language</label>
                                        <div className="settings-select-wrapper">
                                            <select className="settings-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                                <option>English</option>
                                                <option>Spanish</option>
                                                <option>French</option>
                                                <option>German</option>
                                            </select>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                        <p className="settings-desc">Choose the language to display this collection in.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'privacy' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header">
                                    <h2 className="cd-settings-main-title">Privacy Settings</h2>
                                </div>

                                <div className="cd-settings-form">
                                    <div className="settings-section">
                                        <label className="settings-label">Collection Password</label>
                                        <div className="settings-input-wrapper with-action">
                                            <input
                                                type="text"
                                                className="settings-input"
                                                placeholder="Add a password"
                                                value={collectionPassword}
                                                onChange={(e) => setCollectionPassword(e.target.value)}
                                            />
                                            <button className="input-action-btn" onClick={() => setCollectionPassword(Math.random().toString(36).slice(-8))}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                                Generate
                                            </button>
                                        </div>
                                        <p className="settings-desc">Require visitors to enter this password in order to see the collection.</p>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Show on Homepage</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={showOnHomepage} onChange={() => setShowOnHomepage(!showOnHomepage)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{showOnHomepage ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Show this collection on your <span className="settings-link">Homepage</span>. Manage Homepage in <span className="settings-link">Homepage settings</span>.</p>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Client Exclusive Access</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={clientExclusiveAccess} onChange={() => setClientExclusiveAccess(!clientExclusiveAccess)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{clientExclusiveAccess ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Give clients exclusive access to sets and the ability to mark photos private. <span className="settings-link">Learn more</span></p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'download' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">Download Settings</h2>
                                    <span className="activity-link" onClick={() => { setActiveSidebarTab('activity'); setActiveActivitySubTab('download'); }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Download Activity</span>
                                </div>

                                <div className="settings-tab-nav">
                                    <span className={`settings-tab-item ${activeDownloadTab === 'general' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('general')}>General Settings</span>
                                    <span className={`settings-tab-item ${activeDownloadTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('advanced')}>Advanced Settings</span>
                                </div>

                                <div className="cd-settings-form">
                                    {activeDownloadTab === 'general' ? (
                                        <>
                                            <div className="settings-toggle-section no-margin">
                                                <div className="settings-toggle-row">
                                                    <div className="toggle-info">
                                                        <label className="settings-label">Photo Download</label>
                                                    </div>
                                                    <div className="toggle-control">
                                                        <label className="cd-toggle">
                                                            <input type="checkbox" checked={photoDownload} onChange={() => setPhotoDownload(!photoDownload)} />
                                                            <span className="cd-toggle-slider"></span>
                                                        </label>
                                                        <span className="toggle-state-label">{photoDownload ? 'On' : 'Off'}</span>
                                                    </div>
                                                </div>
                                                <p className="settings-desc small">Allow visitors to download photos in your gallery</p>
                                                <button
                                                    className={`settings-action-btn secondary ${showAdditionalOptions ? 'active' : ''}`}
                                                    onClick={() => setShowAdditionalOptions(!showAdditionalOptions)}
                                                >
                                                    Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdditionalOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </button>

                                                {showAdditionalOptions && (
                                                    <div className="additional-options-panel">
                                                        <div className="checkbox-group mt-12">
                                                            <label className="custom-checkbox">
                                                                <input type="checkbox" checked={galleryDownload} onChange={() => setGalleryDownload(!galleryDownload)} />
                                                                <span className="checkmark"></span>
                                                                Gallery Download
                                                            </label>
                                                            <label className="custom-checkbox">
                                                                <input type="checkbox" checked={singlePhotoDownload} onChange={() => setSinglePhotoDownload(!singlePhotoDownload)} />
                                                                <span className="checkmark"></span>
                                                                Single Photo Download
                                                            </label>
                                                            <div className="indent-options">
                                                                <label className="custom-checkbox">
                                                                    <input type="checkbox" checked={requirePinForSinglePhoto} onChange={() => setRequirePinForSinglePhoto(!requirePinForSinglePhoto)} />
                                                                    <span className="checkmark"></span>
                                                                    Require PIN for single photos
                                                                </label>
                                                                <label className="custom-checkbox">
                                                                    <input type="checkbox" checked={emailRegistration} onChange={() => setEmailRegistration(!emailRegistration)} />
                                                                    <span className="checkmark"></span>
                                                                    Email Tracking
                                                                </label>
                                                                <label className="custom-checkbox">
                                                                    <input type="checkbox" checked={restrictSinglePhotoSizes} onChange={() => setRestrictSinglePhotoSizes(!restrictSinglePhotoSizes)} />
                                                                    <span className="checkmark"></span>
                                                                    Restrict Single Photo sizes
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

{/* <div className="settings-section">
                                                <label className="settings-label">Photo Download Sizes</label>
                                                <div className="checkbox-group">
                                                    <div className="checkbox-row">
                                                        <label className="custom-checkbox">
                                                            <input type="checkbox" checked={photoDownloadSizes.includes('high')} onChange={() => {
                                                                setPhotoDownloadSizes(prev => prev.includes('high') ? prev.filter(s => s !== 'high') : [...prev, 'high']);
                                                            }} />
                                                            <span className="checkmark"></span>
                                                            High Resolution
                                                        </label>
                                                        <div className="radio-group-horizontal">
                                                            <label className="custom-radio">
                                                                <input 
                                                                    type="radio" 
                                                                    name="high-res" 
                                                                    checked={highResChoice === 'original'}
                                                                    onChange={() => setHighResChoice('original')}
                                                                />
                                                                <span className="radio-mark"></span>
                                                                Original - Upgrade required. <span className="settings-link">Upgrade</span>
                                                            </label>
                                                            <label className="custom-radio">
                                                                <input 
                                                                    type="radio" 
                                                                    name="high-res" 
                                                                    checked={highResChoice === '3600px'}
                                                                    onChange={() => setHighResChoice('3600px')}
                                                                />
                                                                <span className="radio-mark"></span>
                                                                3600px
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="checkbox-row mt-12">
                                                        <label className="custom-checkbox">
                                                            <input type="checkbox" checked={photoDownloadSizes.includes('web')} onChange={() => {
                                                                setPhotoDownloadSizes(prev => prev.includes('web') ? prev.filter(s => s !== 'web') : [...prev, 'web']);
                                                            }} />
                                                            <span className="checkmark"></span>
                                                            Web Size
                                                        </label>
                                                        <div className="radio-group-horizontal">
                                                            <label className="custom-radio">
                                                                <input 
                                                                    type="radio" 
                                                                    name="web-res" 
                                                                    checked={webSizeChoice === '2048px'}
                                                                    onChange={() => setWebSizeChoice('2048px')}
                                                                />
                                                                <span className="radio-mark"></span>
                                                                2048px
                                                            </label>
                                                            <label className="custom-radio">
                                                                <input 
                                                                    type="radio" 
                                                                    name="web-res" 
                                                                    checked={webSizeChoice === '1024px'}
                                                                    onChange={() => setWebSizeChoice('1024px')}
                                                                />
                                                                <span className="radio-mark"></span>
                                                                1024px
                                                            </label>
                                                            <label className="custom-radio">
                                                                <input 
                                                                    type="radio" 
                                                                    name="web-res" 
                                                                    checked={webSizeChoice === '640px'}
                                                                    onChange={() => setWebSizeChoice('640px')}
                                                                />
                                                                <span className="radio-mark"></span>
                                                                640px
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="settings-desc">Allow photos to be downloaded in select sizes. <span className="settings-link">Learn more</span></p>
                                            </div> */}

                                            <div className="settings-toggle-section">
                                                <div className="settings-toggle-row">
                                                    <div className="toggle-info">
                                                        <label className="settings-label">Download PIN</label>
                                                    </div>
                                                    <div className="toggle-control">
                                                        <label className="cd-toggle">
                                                            <input type="checkbox" checked={downloadPin} onChange={() => setDownloadPin(!downloadPin)} />
                                                            <span className="cd-toggle-slider"></span>
                                                        </label>
                                                        <span className="toggle-state-label">{downloadPin ? 'On' : 'Off'}</span>
                                                    </div>
                                                </div>
                                                {downloadPin && (
                                                    <div className="settings-input-wrapper with-action mt-12">
                                                        <input type="text" className="settings-input" value={pinValue} onChange={(e) => setPinValue(e.target.value)} maxLength={4} />
                                                        <button className="input-action-btn no-icon" onClick={() => setPinValue(Math.floor(1000 + Math.random() * 9000).toString())}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                                            Reset PIN
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="settings-desc">Require visitors to enter a 4-digit PIN to download photos and videos.</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="advanced-settings-panel">
                                            <div className="settings-section">
                                                <label className="settings-label">Download Limits</label>
                                                <p className="settings-desc">Limit the total number of photo downloads for this collection. Leave blank for no limit.</p>
                                                <div className="settings-input-wrapper">
                                                    <input
                                                        type="number"
                                                        className="settings-input"
                                                        placeholder="No limit"
                                                        value={downloadLimit}
                                                        onChange={(e) => setDownloadLimit(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="settings-section">
                                                <label className="settings-label">Restrict to Specific Emails</label>
                                                <p className="settings-desc">Only allow these email addresses to download. Separate with commas.</p>
                                                <div className="settings-input-wrapper">
                                                    <textarea
                                                        className="settings-input settings-textarea"
                                                        placeholder="e.g. client@example.com, assistant@example.com"
                                                        value={restrictToEmails}
                                                        onChange={(e) => setRestrictToEmails(e.target.value)}
                                                        style={{ height: '80px', padding: '12px' }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="settings-section">
                                                <label className="settings-label">Set-Specific Downloads</label>
                                                <p className="settings-desc">Choose which photo sets are available for download.</p>
                                                <div className="checkbox-group mt-8">
                                                    <label className="custom-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDownloadSets.includes('Highlights')}
                                                            onChange={() => {
                                                                setSelectedDownloadSets(prev =>
                                                                    prev.includes('Highlights') ? prev.filter(s => s !== 'Highlights') : [...prev, 'Highlights']
                                                                );
                                                            }}
                                                        />
                                                        <span className="checkmark"></span>
                                                        Highlights (All Photos)
                                                    </label>
                                                    {sets.map(set => (
                                                        <label key={set.id} className="custom-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDownloadSets.includes(set.name)}
                                                                onChange={() => {
                                                                    setSelectedDownloadSets(prev =>
                                                                        prev.includes(set.name) ? prev.filter(s => s !== set.name) : [...prev, set.name]
                                                                    );
                                                                }}
                                                            />
                                                            <span className="checkmark"></span>
                                                            {set.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="settings-section">
                                                <label className="settings-label">PIN Usage Limits</label>
                                                <p className="settings-desc">Limit the number of times the download PIN can be used.</p>
                                                <div className="settings-input-wrapper">
                                                    <input
                                                        type="number"
                                                        className="settings-input"
                                                        placeholder="No limit"
                                                        value={pinUsageLimit}
                                                        onChange={(e) => setPinUsageLimit(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'favorite' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">Favorite Settings</h2>
                                    <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Favorite Activity</span>
                                </div>

                                <div className="cd-settings-form">
                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Favorite Photos</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={favoritePhotos} onChange={() => setFavoritePhotos(!favoritePhotos)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{favoritePhotos ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Allow visitors to favorite photos. You can review these afterwards in Favorite Activity.</p>
                                    </div>

                                    <div className="settings-toggle-section">
                                        <div className="settings-toggle-row">
                                            <div className="toggle-info">
                                                <label className="settings-label">Favorite Notes</label>
                                            </div>
                                            <div className="toggle-control">
                                                <label className="cd-toggle">
                                                    <input type="checkbox" checked={favoriteNotes} onChange={() => setFavoriteNotes(!favoriteNotes)} />
                                                    <span className="cd-toggle-slider"></span>
                                                </label>
                                                <span className="toggle-state-label">{favoriteNotes ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <p className="settings-desc small">Allow clients to add notes to photos they have favorited. <span className="settings-link">Learn more</span></p>
                                    </div>

                                    <div className="settings-info-box">
                                        <div className="info-box-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                        </div>
                                        <div className="info-box-content">
                                            <h4 className="info-box-title">Preset Favorite Lists</h4>
                                            <p className="info-box-text">Create Favorite lists and set selection limits for your clients to make selections for albums, free downloads, retouching and more.</p>
                                            <span className="settings-link" onClick={() => setShowCreateFavoriteListModal(true)} style={{cursor: 'pointer'}}>Create Favorite List</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'activity' && (
                            <div className={`cd-general-settings-view${activeActivitySubTab === 'favorite' && favoriteActivity.length > 0 ? ' cd-favorite-activity-wide' : ''}`}>
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">
                                        {activeActivitySubTab === 'download' && 'Download Activity'}
                                        {activeActivitySubTab === 'favorite' && 'Favorite Activity'}

                                        {activeActivitySubTab === 'store' && 'Store Orders'}
                                        {activeActivitySubTab === 'email' && 'Email Registration'}
                                    </h2>
                                    {activeActivitySubTab === 'favorite' && (
                                        <div className="favorite-activity-actions">
                                            <div className="favorite-activity-sort-wrap">
                                                <button
                                                    type="button"
                                                    className="favorite-activity-header-link favorite-activity-header-link--muted"
                                                    aria-expanded={favoriteActivitySortMenuOpen}
                                                    aria-haspopup="menu"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveActivityMenu(null);
                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                        setFavoriteDetailPhotoMenuPhotoId(null);
                                                        setFavoriteActivitySortMenuOpen((o) => !o);
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="13" y1="14" x2="3" y2="14" /><line x1="9" y1="18" x2="3" y2="18" /></svg>
                                                    {favoriteActivitySortTriggerLabel}
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`favorite-activity-header-chevron${favoriteActivitySortMenuOpen ? ' favorite-activity-header-chevron--open' : ''}`} aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
                                                </button>
                                                {favoriteActivitySortMenuOpen && (
                                                    <div ref={favoriteActivitySortMenuRef} className="favorite-activity-sort-menu cd-sort-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'email' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('email');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by email
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'created' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('created');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by created date
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className={`cd-sort-option w-full text-left ${favoriteActivitySortMode === 'updated' ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFavoriteActivitySortMode('updated');
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                        >
                                                            Sort by updated date
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <button type="button" className="favorite-activity-header-link favorite-activity-header-link--teal" onClick={() => {
                                                setEditingFavoriteList(null);
                                                setFavoriteListEmail('');
                                                setFavoriteListName('');
                                                setFavoriteListMax('');
                                                setFavoriteListDesc('');
                                                setSelectedFavoriteListId(null);
                                                setFavoriteDetailRows([]);
                                                setFavoriteDetailToolbarMenuOpen(false);
                                                setFavoriteActivitySortMenuOpen(false);
                                                setShowCreateFavoriteListModal(true);
                                            }}>
                                                + New Favorite List
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {activeActivitySubTab === 'download' && (
                                    <div className="settings-tab-nav">
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('gallery')}>Gallery</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'photo' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('photo')}>Single Photo</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'video' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('video')}>Single Video</span>
                                    </div>
                                )}

                                <div className="cd-empty-state-section">
                                    {activeActivitySubTab === 'favorite' && favoriteActivity.length > 0 ? (
                                        <div className={`favorite-activity-layout${selectedFavoriteListId ? ' favorite-activity-layout--split' : ''}`}>
                                            <div className={`activity-list-container favorite-activity-table-wrap${selectedFavoriteListId ? ' favorite-activity-table-wrap--compact' : ''}`}>
                                                <div className="activity-table-header favorite">
                                                    <div className="activity-col-email">Email</div>
                                                    <div className="activity-col-list">Favorite List</div>
                                                    <div className="activity-col-photos">Photos</div>
                                                    <div className="activity-col-created">Date Created</div>
                                                    <div className="activity-col-updated">Date Updated</div>
                                                    <div className="activity-col-actions"></div>
                                                </div>
                                                <div className="activity-table-body">
                                                    {sortedFavoriteActivity.map((item, index, array) => (
                                                        <div
                                                            key={item.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            className={`activity-row favorite${selectedFavoriteListId === item.id ? ' favorite-row-selected' : ''}`}
                                                            onClick={() => {
                                                                setSelectedFavoriteListId(item.id);
                                                                setActiveActivityMenu(null);
                                                                setFavoriteDetailToolbarMenuOpen(false);
                                                                setFavoriteDetailPhotoMenuPhotoId(null);
                                                                setFavoriteActivitySortMenuOpen(false);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setSelectedFavoriteListId(item.id);
                                                                    setActiveActivityMenu(null);
                                                                    setFavoriteDetailToolbarMenuOpen(false);
                                                                    setFavoriteDetailPhotoMenuPhotoId(null);
                                                                    setFavoriteActivitySortMenuOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            <div className="activity-col-email">
                                                                <span>{item.email}</span>
                                                            </div>
                                                            <div className="activity-col-list">
                                                                <div className="list-thumb">
                                                                    {item.thumbnail ? (
                                                                        <img src={item.thumbnail} alt="" />
                                                                    ) : (
                                                                        <div className="thumb-placeholder">
                                                                            <Heart size={14} fill="#ff4d4d" stroke="#ff4d4d" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="list-name-link">{item.name}</span>
                                                            </div>
                                                            <div className="activity-col-photos">
                                                                {item.max_selection != null && Number(item.max_selection) > 0
                                                                    ? `${item.photoCount} of ${item.max_selection}`
                                                                    : item.photoCount}
                                                            </div>
                                                            <div className="activity-col-created">
                                                                {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-updated">
                                                                {new Date(item.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-actions">
                                                                <button
                                                                    type="button"
                                                                    className="row-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                                        setFavoriteDetailPhotoMenuPhotoId(null);
                                                                        setFavoriteActivitySortMenuOpen(false);
                                                                        setActiveActivityMenu(activeActivityMenu === item.id ? null : item.id);
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                </button>

                                                                {activeActivityMenu === item.id && (
                                                                    <div 
                                                                        ref={favoriteActivityMenuRef}
                                                                        className={`activity-row-menu favorite-menu ${index > 0 && index >= array.length - 3 ? 'up' : ''}`}
                                                                    >
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleExportFavoriteList(item.id, item.name); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                            Export
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleLightroomCopyList(item.id); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                                            Lightroom Copy List
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openEditFavoriteListModal(item);
                                                                            setActiveActivityMenu(null);
                                                                        }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                            Edit List
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); window.open(`/gallery/${collection?.slug}?list=${item.id}`, '_blank'); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                            View in Gallery
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" onClick={(e) => { e.stopPropagation(); handleDownloadAllFavoriteList(item.id); setActiveActivityMenu(null); }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                            Download all
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                                            Send as download
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                                            Copy to new set
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                                                            Copy to new collection
                                                                        </button>
                                                                        <button type="button" className="activity-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                                                            Create mobile app
                                                                        </button>
                                                                        <div style={{ height: '1px', background: '#f5f5f5', margin: '4px 0' }} />
                                                                        <button
                                                                            type="button"
                                                                            className="activity-menu-item delete"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteFavoriteActivity(item.id);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                            Delete info
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {selectedFavoriteListId && (() => {
                                                const detail = favoriteActivity.find((a) => a.id === selectedFavoriteListId);
                                                const sortedRows = [...favoriteDetailRows].sort((a, b) => {
                                                    const fa = a.photo?.filename || '';
                                                    const fb = b.photo?.filename || '';
                                                    return favoriteDetailSort === 'name-za' ? fb.localeCompare(fa) : fa.localeCompare(fb);
                                                });
                                                return (
                                                    <aside className="favorite-list-detail-panel">
                                                        <div className="favorite-list-detail-header">
                                                            <h3 className="favorite-list-detail-title">Favorite List Details</h3>
                                                            <button
                                                                type="button"
                                                                className="favorite-list-detail-close"
                                                                onClick={() => {
                                                                    setSelectedFavoriteListId(null);
                                                                    setFavoriteDetailRows([]);
                                                                    setFavoriteDetailToolbarMenuOpen(false);
                                                                    setFavoriteDetailPhotoMenuPhotoId(null);
                                                                }}
                                                                aria-label="Close details"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </button>
                                                        </div>
                                                        {detail && (
                                                            <>
                                                                <div className="favorite-list-detail-toolbar">
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => openEditFavoriteListModal(detail)}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                        Edit List
                                                                    </button>
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => handleDownloadAllFavoriteList(detail.id)}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Download All
                                                                    </button>
                                                                    <button type="button" className="favorite-detail-toolbar-link" onClick={() => { handleExportFavoriteList(detail.id, detail.name); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Export
                                                                    </button>
                                                                    <div className="favorite-detail-toolbar-more-wrap">
                                                                        <button
                                                                            type="button"
                                                                            className="favorite-detail-toolbar-icon-btn"
                                                                            aria-label="More actions"
                                                                            aria-expanded={favoriteDetailToolbarMenuOpen}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveActivityMenu(null);
                                                                                setFavoriteDetailPhotoMenuPhotoId(null);
                                                                                setFavoriteDetailToolbarMenuOpen((o) => !o);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                        </button>
                                                                        {favoriteDetailToolbarMenuOpen && (
                                                                            <div ref={favoriteDetailToolbarMenuRef} className="favorite-detail-toolbar-menu" role="menu">
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => { handleLightroomCopyList(detail.id); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                                                    Lightroom Copy List
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => { window.open(`/gallery/${collection?.slug}?list=${detail.id}`, '_blank'); setFavoriteDetailToolbarMenuOpen(false); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                                    View in Gallery
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" onClick={() => handleDownloadAllFavoriteList(detail.id)}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                                    Send as download
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                                                    Copy to new set
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                                                                    Copy to new collection
                                                                                </button>
                                                                                <button type="button" className="activity-menu-item" role="menuitem" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                                                                    Create mobile app
                                                                                </button>
                                                                                <div style={{ height: '1px', background: '#eee', margin: '4px 0' }} />
                                                                                <button type="button" className="activity-menu-item delete" role="menuitem" onClick={() => { setFavoriteDetailToolbarMenuOpen(false); handleDeleteFavoriteActivity(detail.id); }}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                                    Delete info
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="favorite-list-detail-meta">
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Name</span><span>{detail.name}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Email</span><span>{detail.email}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">No. of photos</span><span>{detail.max_selection != null && Number(detail.max_selection) > 0 ? `${detail.photoCount} of ${detail.max_selection}` : detail.photoCount}</span></div>
                                                                    <div className="favorite-detail-meta-row"><span className="favorite-detail-meta-label">Last modified</span><span>{new Date(detail.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}</span></div>
                                                                    {detail.description?.trim() ? (
                                                                        <div className="favorite-detail-meta-row favorite-detail-meta-row--multiline">
                                                                            <span className="favorite-detail-meta-label">Description</span>
                                                                            <span className="favorite-detail-meta-value-wrap">{detail.description.trim()}</span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="favorite-list-detail-photos-head">
                                                            <button type="button" className="favorite-detail-sort-btn" onClick={() => setFavoriteDetailSort((s) => (s === 'name-az' ? 'name-za' : 'name-az'))}>
                                                                <span className="favorite-detail-sort-arrows" aria-hidden>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                                                </span>
                                                                Name: {favoriteDetailSort === 'name-az' ? 'A-Z' : 'Z-A'}
                                                            </button>
                                                        </div>
                                                        <div className="favorite-list-detail-photos">
                                                            {favoriteDetailLoading ? (
                                                                <p className="favorite-detail-loading">Loading…</p>
                                                            ) : sortedRows.length === 0 ? (
                                                                <p className="favorite-detail-empty">No photos in this list yet.</p>
                                                            ) : (
                                                                sortedRows.map((row, index) => {
                                                                    const ph = row.photo;
                                                                    const setLabel = !ph?.set_id ? highlightsName : (sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights');
                                                                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                    const menuOpen = favoriteDetailPhotoMenuPhotoId === ph?.id;
                                                                    return (
                                                                        <div
                                                                            key={`${ph?.id}-${row.itemCreatedAt}`}
                                                                            className={`favorite-detail-photo-row${menuOpen ? ' favorite-detail-photo-row--menu-open' : ''}`}
                                                                        >
                                                                            <div className="favorite-detail-thumb">{thumb ? <img src={thumb} alt="" /> : null}</div>
                                                                            <div className="favorite-detail-photo-main">
                                                                                <div className="favorite-detail-filename">{ph?.filename || 'Photo'}</div>
                                                                                <div className="favorite-detail-sub">
                                                                                    {new Date(row.itemCreatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                                                    <span className="favorite-detail-set-tag">- {setLabel}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="favorite-detail-row-actions">
                                                                                <button
                                                                                    type="button"
                                                                                    className="favorite-detail-row-more"
                                                                                    aria-label="More options"
                                                                                    aria-expanded={menuOpen}
                                                                                    aria-haspopup="menu"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFavoriteDetailToolbarMenuOpen(false);
                                                                                        setActiveActivityMenu(null);
                                                                                        setFavoriteDetailPhotoMenuPhotoId((id) => (id === ph?.id ? null : ph?.id));
                                                                                    }}
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                                </button>
                                                                                {menuOpen && (
                                                                                    <div
                                                                                        ref={favoriteDetailPhotoMenuRef}
                                                                                        className={`favorite-detail-photo-row-menu${index > 0 && index >= sortedRows.length - 2 ? ' favorite-detail-photo-row-menu--up' : ''}`}
                                                                                        role="menu"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <button
                                                                                            type="button"
                                                                                            className="activity-menu-item"
                                                                                            role="menuitem"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleFavoriteDetailRowDownload(ph);
                                                                                            }}
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                                            Download
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="activity-menu-item delete"
                                                                                            role="menuitem"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleRemovePhotoFromFavoriteList(selectedFavoriteListId, ph?.id);
                                                                                            }}
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                                            Remove Favorite
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </aside>
                                                );
                                            })()}
                                        </div>
                                    ) : activeActivitySubTab === 'store' ? (
                                        <div className="cd-empty-state-content" style={{ padding: '48px 24px', textAlign: 'center' }}>
                                            <div className="cd-empty-state-illustration" style={{ marginBottom: '24px' }}>
                                                <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                    <rect x="40" y="40" width="120" height="80" rx="6" fill="#F8FAFB" stroke="#ddd" strokeWidth="1.5" />
                                                    <circle cx="100" cy="75" r="18" fill="#fff" stroke="#00c0a3" strokeWidth="1.5" />
                                                    <path d="M92 75h16M100 67v16" stroke="#00c0a3" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <h3 className="cd-empty-state-title">No store orders yet</h3>
                                            <p className="cd-empty-state-text">When clients place orders from your store, they will appear here.</p>
                                        </div>
                                    ) : activeActivitySubTab === 'download' && downloadActivity.filter(a => a.type === activeDownloadActivityTab).length > 0 ? (
                                        <div className={`download-activity-layout${selectedDownloadId ? ' download-activity-layout--split' : ''}`}>
                                            <div className={`activity-list-container download-activity-table-wrap${selectedDownloadId ? ' download-activity-table-wrap--compact' : ''}`}>
                                                <div className="activity-table-header download">
                                                    <div className="activity-col-email">Email</div>
                                                    <div className="activity-col-set">Photo Set</div>
                                                    <div className="activity-col-pin">PIN</div>
                                                    <div className="activity-col-date-downloaded">Date Downloaded</div>
                                                    <div className="activity-col-actions"></div>
                                                </div>
                                                <div className="activity-table-body">
                                                    {downloadActivity.filter(a => a.type === activeDownloadActivityTab).map((item, index, array) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`activity-row download${selectedDownloadId === item.id ? ' download-row-selected' : ''}`}
                                                            onClick={() => {
                                                                setSelectedDownloadId(selectedDownloadId === item.id ? null : item.id);
                                                                setActiveActivityMenu(null);
                                                                setDownloadDetailToolbarMenuOpen(false);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="activity-col-email">
                                                                <span>{item.email}</span>
                                                            </div>
                                                            <div className="activity-col-set">
                                                                <span className="set-badge">
                                                                    {item.setName && item.setName !== 'Unknown Set' 
                                                                        ? item.setName 
                                                                        : (sets.find(s => s.id === item.photoSetId)?.name || 'Highlights')}
                                                                </span>
                                                            </div>
                                                            <div className="activity-col-pin">
                                                                {item.pin !== '---' ? item.pin : (item.pinUsed ? 'Yes' : '---')}
                                                            </div>
                                                            <div className="activity-col-date-downloaded">
                                                                {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}
                                                            </div>
                                                            <div className="activity-col-actions">
                                                                <button 
                                                                    className="row-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveActivityMenu(activeActivityMenu === item.id ? null : item.id);
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                                </button>
    
                                                                {activeActivityMenu === item.id && (
                                                                    <div className={`activity-row-menu ${index >= array.length - 2 && array.length > 3 ? 'up' : ''}`}>
                                                                        <button 
                                                                            className="activity-menu-item delete"
                                                                            onClick={() => handleDeleteActivity(item.id)}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                            Delete info
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {selectedDownloadId && (() => {
                                                const detail = downloadActivity.find((a) => a.id === selectedDownloadId);
                                                return (
                                                    <aside className="download-detail-panel">
                                                        <div className="download-detail-header">
                                                            <h3 className="download-detail-title">Download Details</h3>
                                                            <button
                                                                type="button"
                                                                className="download-detail-close"
                                                                onClick={() => {
                                                                    setSelectedDownloadId(null);
                                                                    setDownloadDetailToolbarMenuOpen(false);
                                                                }}
                                                                aria-label="Close details"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </button>
                                                        </div>
                                                        {detail && (
                                                            <>
                                                                <div className="download-detail-toolbar">
                                                                    <button type="button" className="download-detail-toolbar-link" onClick={() => handleExportActivity()}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                        Export
                                                                    </button>
                                                                </div>
                                                                <div className="download-detail-meta">
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">Email</span><span className="download-detail-meta-value">{detail.email}</span></div>
                                                                    <div className="download-detail-meta-row">
                                                                        <span className="download-detail-meta-label">Photo Set</span>
                                                                        <span className="download-detail-meta-value">
                                                                            {detail.setName && detail.setName !== 'Unknown Set' 
                                                                                ? detail.setName 
                                                                                : (sets.find(s => s.id === detail.photoSetId)?.name || 'Highlights')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">PIN</span><span className="download-detail-meta-value">{detail.pin}</span></div>
                                                                    <div className="download-detail-meta-row"><span className="download-detail-meta-label">Date</span><span className="download-detail-meta-value">{new Date(detail.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' -')}</span></div>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="download-detail-photos-head">
                                                            <span className="download-detail-photos-title">Photos ({downloadDetailPhotos.length})</span>
                                                        </div>
                                                        <div className="download-detail-photos">
                                                            {downloadDetailPhotos.length === 0 ? (
                                                                <p className="download-detail-empty">No photos found for this download.</p>
                                                            ) : (
                                                                downloadDetailPhotos.map((ph) => {
                                                                    const setLabel = !ph?.set_id ? highlightsName : (sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights');
                                                                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                                                                    return (
                                                                        <div key={ph?.id} className="download-detail-photo-row">
                                                                            <div className="download-detail-thumb">{thumb ? <img src={thumb} alt="" /> : null}</div>
                                                                            <div className="download-detail-photo-main">
                                                                                <div className="download-detail-filename">{ph?.filename || 'Photo'}</div>
                                                                                <div className="download-detail-sub">
                                                                                    <span className="download-detail-set-tag">{setLabel}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </aside>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="cd-empty-state-content">
                                            <div className="cd-empty-state-illustration">
                                                {/* Unified Illustration Container */}
                                                {activeActivitySubTab === 'download' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M40 140H200L180 60H60L40 140Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <rect x="80" y="40" width="80" height="60" rx="4" fill="white" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 70V110M120 110L110 100M120 110L130 100" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'favorite' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="120" cy="90" r="50" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 75C120 75 115 65 100 65C85 65 80 80 80 90C80 115 120 140 120 140C120 140 160 115 160 90C160 80 155 65 140 65C125 65 120 75 120 75Z" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}

                                                {activeActivitySubTab === 'email' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect x="50" y="60" width="140" height="80" rx="4" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M50 60L120 100L190 60" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="120" cy="110" r="15" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'share' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M70 110L170 110" stroke="#666" strokeWidth="1.5" strokeDasharray="4 4" />
                                                        <circle cx="70" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="170" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <path d="M120 90V130" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                                {activeActivitySubTab === 'private' && (
                                                    <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M120 60C150 60 180 80 180 110C180 140 150 160 120 160C90 160 60 140 60 110C60 80 90 60 120 60Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                        <circle cx="120" cy="110" r="20" fill="white" stroke="#111111" strokeWidth="2" />
                                                    </svg>
                                                )}
                                            </div>
                                            <h3 className="cd-empty-state-title">
                                                {activeActivitySubTab === 'download' && (
                                                    activeDownloadActivityTab === 'gallery' ? 'No gallery downloads yet' :
                                                    activeDownloadActivityTab === 'photo' ? 'No single photo downloads yet' :
                                                    'No single video downloads yet'
                                                )}
                                                {activeActivitySubTab === 'favorite' && (loadingActivity ? 'Loading activity...' : 'No favorites activity yet')}

                                                {activeActivitySubTab === 'email' && 'No email registration activity yet'}
                                                {activeActivitySubTab === 'share' && 'No quick share links yet'}
                                                {activeActivitySubTab === 'private' && 'No private photo activity yet'}
                                            </h3>
                                            <p className="cd-empty-state-text">
                                                {activeActivitySubTab === 'download' && (
                                                    activeDownloadActivityTab === 'gallery' ? 'Gallery download activity details will show here when visitors download all photos from their collection.' :
                                                    activeDownloadActivityTab === 'photo' ? 'Single photo download activity details will show here when visitors download individual photos.' :
                                                    'Single video download activity details will show here when visitors download individual videos.'
                                                )}
                                                {activeActivitySubTab === 'favorite' && 'Activity details will show here when visitors favorite photos in their collection.'}

                                                {activeActivitySubTab === 'email' && 'Email registration activity will show here when visitors register their email before viewing the collection.'}
                                                {activeActivitySubTab === 'share' && 'Quick Share links will show here when you create them from the photos tab.'}
                                                {activeActivitySubTab === 'private' && 'Private photo activity details will show here when clients mark photos as private.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Multi-Selection Toolbar */}
                    {selectedPhotos.length > 0 && (
                        <div className="cd-selection-toolbar">
                            <div className="cd-selection-left">
                                <button className="cd-selection-close" onClick={clearSelection}>
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
                            <div className="cd-selection-actions">
                                <button className="cd-sel-action-btn" title="Add to Starred">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </button>
                                <button className="cd-sel-action-btn" title="Share link">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                </button>
                                <div className="cd-selection-move-wrapper" ref={moveToSetRef}>
                                    <button className="cd-sel-action-btn" title="Move/Copy" onClick={() => setShowMoveToSetMenu(!showMoveToSetMenu)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" /></svg>
                                    </button>
                                    {showMoveToSetMenu && (
                                        <div className="cd-selection-move-dropdown">
                                            <div className="cd-sort-label">Move to Set</div>
                                            <div className={`cd-ctx-item ${!activeSetId ? 'disabled' : ''}`} onClick={() => activeSetId && handleMovePhotosToSet(null)}>
                                                Highlights
                                            </div>
                                            {sets.map(s => (
                                                <div key={s.id} className={`cd-ctx-item ${activeSetId === s.id ? 'disabled' : ''}`} onClick={() => activeSetId !== s.id && handleMovePhotosToSet(s.id)}>
                                                    {s.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button className="cd-sel-action-btn" title="Delete" onClick={deleteSelectedPhotos}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                                <button className="cd-sel-action-btn" title="More" onClick={() => setShowSelectionMore(!showSelectionMore)} ref={selectionMoreRef}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                    {showSelectionMore && (
                                        <div className="cd-selection-more-dropdown">
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8M3 3l6 6M3 3v4.8M3 3h4.8M21 3l-6 6M21 3v4.8M21 3h-4.8M3 21l6-6M3 21v-4.8M3 21h4.8" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Open</span>
                                                <span className="cd-ctx-hotkey">spacebar</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Download</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </div>
                                                <span className="cd-ctx-text">Copy filenames</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                </div>
                                                <span className="cd-ctx-text">Set as cover</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </div>
                                                <span className="cd-ctx-text">Rename</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Replace photo</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M14.5 9a2.5 2.5 0 0 0-5 0v6a2.5 2.5 0 0 0 5 0" /><path d="M10 12h4.5" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Watermark</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6m0 0l-5 5m5-5l5 5M5 6h14" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Move to top</span>
                                                <span className="cd-ctx-hotkey">⌘ + ↑</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v13m0 0l-5-5m5 5l5-5M5 18h14" /></svg>
                                                </div>
                                                <span className="cd-ctx-text">Move to bottom</span>
                                                <span className="cd-ctx-hotkey">⌘ + ↓</span>
                                            </div>
                                            <div className="cd-ctx-item" onClick={() => setShowSelectionMore(false)}>
                                                <div className="cd-ctx-item-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                                </div>
                                                <span className="cd-ctx-text">Create mobile app</span>
                                            </div>
                                        </div>
                                    )}
                                </button>
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
                                                accept="image/*,video/*"
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

            {/* Upload Widget */}
            {uploadWidget.isOpen && (
                <div className={`upload-widget ${uploadWidget.isMinimized ? 'minimized' : ''}`}>
                    <div className="upload-widget-header" onClick={() => setUploadWidget(prev => ({ ...prev, isMinimized: !prev.isMinimized }))}>
                        <div className="upload-header-left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            <div className="upload-progress-info">
                                <h4>Uploading {uploadWidget.files.filter(f => f.status === 'uploading').length} Items</h4>
                                {uploadWidget.files.filter(f => f.status === 'uploading').length > 0 && (
                                    <span>
                                        {Math.round(uploadWidget.files.reduce((acc, f) => acc + (f.size * f.progress / 100), 0) / 1024 / 1024 * 100) / 100} MB /
                                        {Math.round(uploadWidget.files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024 * 100) / 100} MB
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="upload-header-actions">
                            <button className="upload-action-btn">{uploadWidget.isMinimized ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            )}</button>
                            <button className="upload-action-btn" onClick={(e) => { e.stopPropagation(); setUploadWidget({ isOpen: false, isMinimized: false, files: [] }); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                    {!uploadWidget.isMinimized && (
                        <div className="upload-widget-list">
                            {uploadWidget.files.map(file => (
                                <div key={file.id} className="upload-widget-item">
                                    <div className="upload-item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    </div>
                                    <div className="upload-item-details">
                                        <p className="upload-item-name">{file.name}</p>
                                        <p className="upload-item-status">
                                            {file.status === 'uploading' ? `Uploading • ${(file.size / 1024 / 1024).toFixed(2)} MB`
                                                : file.status === 'completed' ? 'Completed'
                                                    : 'Failed'}
                                        </p>
                                    </div>
                                    <div className="upload-item-progress">
                                        {file.status === 'uploading' && (
                                            <div className="progress-circle-wrap">
                                                <svg className="progress-circle" viewBox="0 0 36 36">
                                                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    <path className="circle-progress" strokeDasharray={`${file.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                </svg>
                                            </div>
                                        )}
                                        {file.status === 'completed' && (
                                            <span style={{ color: '#10b981' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            </span>
                                        )}
                                        {file.status === 'error' && (
                                            <span style={{ color: '#ef4444' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                onClose={() => setShowCoverModal(false)}
                photos={photos}
                onSelectPhoto={async (photo) => {
                    try {
                        setSaving(true);
                        await galleryService.updateCollection(collectionId, {
                            cover_photo_id: photo.id,
                            cover_url: photo.full_url
                        });
                        setCollection(prev => ({ ...prev, cover_url: photo.full_url, cover_photo_id: photo.id }));
                    } catch (err) {
                        console.error('Failed to update cover:', err);
                    } finally {
                        setSaving(false);
                    }
                }}
                onUploadPhoto={async (file) => {
                    try {
                        setSaving(true);
                        // Upload specifically for cover (index 0 for now as priority)
                        const photoData = await galleryService.uploadPhoto(collectionId, collection.photographer_id, file, 0);
                        setPhotos(prev => [photoData, ...prev]);

                        await galleryService.updateCollection(collectionId, {
                            cover_photo_id: photoData.id,
                            cover_url: photoData.full_url
                        });
                        setCollection(prev => ({ ...prev, cover_url: photoData.full_url, cover_photo_id: photoData.id }));
                    } catch (err) {
                        console.error('Cover upload failed:', err);
                    } finally {
                        setSaving(false);
                    }
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
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b5998', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></button>
                                <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1da1f2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg></button>
                                <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#bd081c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.439.214-.903 1.383-5.857 1.383-5.857s-.353-.707-.353-1.75c0-1.64.953-2.866 2.138-2.866 1.006 0 1.492.754 1.492 1.658 0 1.011-.643 2.525-.976 3.926-.279 1.176.591 2.135 1.753 2.135 2.106 0 3.722-2.222 3.722-5.431 0-2.842-2.045-4.831-4.966-4.831-3.41 0-5.412 2.557-5.412 5.195 0 1.013.39 2.096.877 2.686.096.116.111.22.083.332-.089.366-.289 1.175-.328 1.332-.051.206-.17.252-.382.153-1.423-.664-2.316-2.756-2.316-4.436 0-3.606 2.62-6.915 7.546-6.915 3.957 0 7.03 2.82 7.03 6.582 0 3.934-2.48 7.098-5.922 7.098-1.157 0-2.244-.6-2.615-1.306l-.71 2.705c-.256.974-.95 2.193-1.417 2.936C9.913 23.784 10.938 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"></path></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <button className="cd-save-btn" onClick={async () => {
                                try {
                                    setSaving(true);
                                    await galleryService.createCollection({
                                        name: `${collectionName} (Copy)`,
                                        event_date: collection?.event_date,
                                        status: 'draft'
                                    });
                                    setShowDuplicateModal(false);
                                    navigate('/client-gallery');
                                } catch (err) {
                                    console.error('Failed to duplicate:', err);
                                    alert('Failed to duplicate collection. Please try again.');
                                } finally {
                                    setSaving(false);
                                }
                            }}>Duplicate</button>
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
                                {/* Social share row */}
                                <div style={{ display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center' }}>
                                    <a 
                                        href={`mailto:?subject=${encodeURIComponent('Photo from ' + (collection?.name || 'Collection'))}&body=${encodeURIComponent('Check out this photo: ' + shareUrl)}`} 
                                        style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f5f5f5', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.2s' }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    </a>
                                    <a 
                                        href={`https://wa.me/?text=${encodeURIComponent('Check out this photo: ' + shareUrl)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </a>
                                </div>
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
                                <h2 className="header-title">Add Auto Expiry Reminder Email</h2>
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
                                            <p>Use these placeholders to automatically insert collection information:</p>
                                            <ul>
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
                                                        .replace(/{expiry.date}/g, autoExpiry || 'MM/DD/YYYY')
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
