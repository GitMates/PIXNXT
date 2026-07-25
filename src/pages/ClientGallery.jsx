import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Plus,
    LayoutGrid,
    Rows3,
    Star,
    Filter,
    ArrowUpDown,
    MoreHorizontal,
} from 'lucide-react';
import SidebarLayout from '../components/SidebarLayout';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { openSpaPath } from '../lib/spaNavigation';
import { openShareByEmail, openWhatsAppShare, getShareUrlForCollection } from '../lib/shareCollection';
import { CollectionContextMenu } from '../components/features/ClientGallery/CollectionContextMenu';
import { FolderThumbGrid } from '../components/features/ClientGallery/FolderThumbGrid';
import { EditCollectionModal } from '../components/features/ClientGallery/EditCollectionModal';
import {
    CollectionDirectLinkModal,
    CollectionQrModal,
    CollectionDuplicateModal,
    FolderDirectLinkModal,
    FolderQrModal,
} from '../components/features/ClientGallery/CollectionShareModals';
import { MoveCollectionModal } from '../components/features/Collections/MoveCollectionModal';
import { FolderContextMenu } from '../components/features/ClientGallery/FolderContextMenu';
import { EditFolderModal } from '../components/features/ClientGallery/EditFolderModal';
import {
    BulkCollectionStatusModal,
    BulkCollectionTagsModal,
} from '../components/features/ClientGallery/BulkCollectionModals';
import { BulkEditCollectionsModal } from '../components/features/ClientGallery/BulkEditCollectionsModal';
import './ClientGallery.css';
import { sortCollections } from '../utils/sortCollections';
import { sortFolders } from '../utils/sortFolders';
import { formatStorageBytes } from '../utils/formatStorageBytes';
import {
    normalizeGallerySearchQuery,
    filterRootCollectionsForSearch,
    filterFoldersForSearch,
} from '../utils/filterClientGallerySearch';
import {
    EMPTY_CLIENT_GALLERY_FILTERS,
    filterCollectionsByClientGalleryFilters,
    folderMatchesClientGalleryFilters,
    hasActiveClientGalleryFilters,
} from '../utils/clientGalleryFilters';
import { ClientGalleryFilterBar } from '../components/features/ClientGallery/ClientGalleryFilterBar';
import { getFolderStudioUrl } from '../lib/folderStudioUrl';

function getStatusDotClass(status) {
    if (status === 'published') return 'cg-status-dot--live';
    if (status === 'archived') return 'cg-status-dot--hidden';
    return 'cg-status-dot--draft';
}

const ClientGallery = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [collections, setCollections] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigateNewCollection = () => navigate('/collections/create');

    const navigateNewFolder = () => {
        setShowNewCollectionDropdown(false);
        navigate('/folders/create');
    };

    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [displayPlaceholder, setDisplayPlaceholder] = useState('');
    const [activeView, setActiveView] = useState('grid');
    const [activeSort, setActiveSort] = useState('created-new');
    const [selectedCards, setSelectedCards] = useState([]);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const [galleryFilters, setGalleryFilters] = useState(EMPTY_CLIENT_GALLERY_FILTERS);
    const [editCollection, setEditCollection] = useState(null);
    const [directLinkCollection, setDirectLinkCollection] = useState(null);
    const [qrCollection, setQrCollection] = useState(null);
    const [duplicateCollection, setDuplicateCollection] = useState(null);
    const [moveToCollection, setMoveToCollection] = useState(null);
    const [duplicateBusy, setDuplicateBusy] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [folderEditSaving, setFolderEditSaving] = useState(false);
    const [editFolder, setEditFolder] = useState(null);
    const [folderDirectLink, setFolderDirectLink] = useState(null);
    const [folderQr, setFolderQr] = useState(null);
    const [folderContextMenuId, setFolderContextMenuId] = useState(null);
    const [folderMenuAnchor, setFolderMenuAnchor] = useState(null);
    const [showNewCollectionDropdown, setShowNewCollectionDropdown] = useState(false);
    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [showSelectionMenu, setShowSelectionMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);
    const sortRef = useRef(null);
    const filterRef = useRef(null);
    const contextRef = useRef(null);
    const folderMenuRef = useRef(null);
    const newCollectionRef = useRef(null);
    const selectionMenuRef = useRef(null);

    const selectedCollections = useMemo(
        () => collections.filter((c) => selectedCards.includes(c.id)),
        [collections, selectedCards]
    );

    const applyBulkUpdate = async (payload, { closeStatus, closeTags, closeEdit } = {}) => {
        if (!selectedCards.length || !Object.keys(payload).length) return;
        setBulkApplying(true);
        try {
            await Promise.all(
                selectedCards.map((id) => galleryService.updateCollection(id, payload))
            );
            setCollections((prev) =>
                prev.map((c) => (selectedCards.includes(c.id) ? { ...c, ...payload } : c))
            );
            if (closeStatus) setBulkStatusOpen(false);
            if (closeTags) setBulkTagsOpen(false);
            if (closeEdit) setBulkEditOpen(false);
        } catch (err) {
            console.error('Bulk update failed:', err);
            alert('Failed to update collections. Please try again.');
        } finally {
            setBulkApplying(false);
        }
    };

    const handleBulkStar = async () => {
        if (!selectedCollections.length) return;
        const allStarred = selectedCollections.every((c) => c.is_starred);
        const next = !allStarred;
        setBulkApplying(true);
        try {
            await Promise.all(
                selectedCards.map((id) => galleryService.updateCollection(id, { is_starred: next }))
            );
            setCollections((prev) =>
                prev.map((c) => (selectedCards.includes(c.id) ? { ...c, is_starred: next } : c))
            );
        } catch (err) {
            console.error('Bulk star failed:', err);
            alert('Failed to update starred status.');
        } finally {
            setBulkApplying(false);
        }
    };

    const handleBulkMoveComplete = async (folderId) => {
        if (!user) return;
        setBulkMoveOpen(false);
        clearSelection();
        try {
            const [cols, fols] = await Promise.all([
                galleryService.getCollections(user.id),
                galleryService.listFoldersForGallery(user.id),
            ]);
            setCollections(cols);
            setFolders(fols);
        } catch (e) {
            console.error(e);
            setCollections((prev) =>
                prev.map((c) => (selectedCards.includes(c.id) ? { ...c, folder_id: folderId } : c))
            );
        }
    };

    const selectAllCollections = () => {
        setSelectedCards(sortedRootCollections.map((c) => c.id));
        setShowSelectionMenu(false);
    };

    useEffect(() => {
        const fetchCollections = async () => {
            if (!user) return;
            
            try {
                setLoading(true);
                setError(null);
                const [data, folderRows] = await Promise.all([
                    galleryService.getCollections(user.id),
                    galleryService.listFoldersForGallery(user.id),
                ]);
                setCollections(data);
                setFolders(folderRows);
            } catch (err) {
                console.error('Error fetching collections:', err);
                setError('Failed to load collections. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCollections();
    }, [user]);

    const rootCollections = useMemo(
        () => collections.filter((c) => !c.folder_id),
        [collections]
    );

    const normalizedSearch = useMemo(
        () => normalizeGallerySearchQuery(searchQuery),
        [searchQuery]
    );

    const filteredRootCollections = useMemo(() => {
        const byFilters = filterCollectionsByClientGalleryFilters(rootCollections, galleryFilters);
        return filterRootCollectionsForSearch(byFilters, normalizedSearch);
    }, [rootCollections, galleryFilters, normalizedSearch]);

    const filteredFolders = useMemo(() => {
        const byFilters = folders.filter((f) =>
            folderMatchesClientGalleryFilters(f, galleryFilters, collections)
        );
        return filterFoldersForSearch(byFilters, normalizedSearch, collections);
    }, [folders, galleryFilters, collections, normalizedSearch]);

    const sortedRootCollections = useMemo(
        () => sortCollections(filteredRootCollections, activeSort),
        [filteredRootCollections, activeSort]
    );

    const sortedFolderRows = useMemo(
        () => sortFolders(filteredFolders, activeSort),
        [filteredFolders, activeSort]
    );

    const hasDashboardItems = rootCollections.length > 0 || folders.length > 0;

    const dashboardGridItems = useMemo(
        () => [
            ...sortedFolderRows.map((f) => ({ kind: 'folder', id: f.id, folder: f })),
            ...sortedRootCollections.map((c) => ({ kind: 'collection', id: c.id, collection: c })),
        ],
        [sortedFolderRows, sortedRootCollections]
    );

    const sortedCollections = sortedRootCollections;

    const dashboardStats = useMemo(() => {
        const liveCount = collections.filter((c) => c.status === 'published').length;
        const photosDelivered = collections.reduce((n, c) => n + (c.photo_count || 0), 0);
        return {
            total: collections.length,
            live: liveCount,
            photos: photosDelivered,
        };
    }, [collections]);

    useEffect(() => {
        const fullText = 'Search collections or clients…';
        let index = 0;
        const interval = window.setInterval(() => {
            if (index <= fullText.length) {
                setDisplayPlaceholder(fullText.slice(0, index));
                index += 1;
            } else {
                window.clearInterval(interval);
            }
        }, 80);
        return () => window.clearInterval(interval);
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenuId(null);
        setContextMenuAnchor(null);
    }, []);
    const closeFolderContextMenu = useCallback(() => {
        setFolderContextMenuId(null);
        setFolderMenuAnchor(null);
    }, []);

    const formatFolderDate = (folder) => {
        const raw = folder?.event_date || folder?.created_at;
        if (!raw) return '';
        return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleFolderCardClick = (folder) => {
        if (selectedCards.length > 0) return;
        navigate(`/folders/${folder.id}`);
    };

    const openFolderContextMenu = (e, folderId) => {
        e.stopPropagation();
        setContextMenuId(null);
        setContextMenuAnchor(null);
        if (folderContextMenuId === folderId) {
            closeFolderContextMenu();
            return;
        }
        setFolderMenuAnchor(e.currentTarget);
        setFolderContextMenuId(folderId);
    };

    const handleFolderShareByEmail = (folder) => {
        const url = getFolderStudioUrl(folder.id);
        closeFolderContextMenu();
        openShareByEmail(url, folder.name || 'Folder');
    };

    const handleFolderShareWhatsApp = (folder) => {
        const url = getFolderStudioUrl(folder.id);
        closeFolderContextMenu();
        openWhatsAppShare(url, folder.name || 'Folder');
    };

    const handleRemoveFolder = async (folder) => {
        closeFolderContextMenu();
        const n = folder.collection_count || 0;
        const msg =
            n > 0
                ? `Remove folder "${folder.name}"? ${n} collection(s) will move back to the main list (not deleted).`
                : `Remove folder "${folder.name}"?`;
        if (!window.confirm(msg)) return;
        if (!user?.id) return;
        try {
            await galleryService.deleteFolder(folder.id, user.id);
            setFolders((prev) => prev.filter((f) => f.id !== folder.id));
            setCollections((prev) => prev.map((c) => (c.folder_id === folder.id ? { ...c, folder_id: null } : c)));
        } catch (err) {
            console.error(err);
            alert('Failed to remove folder.');
        }
    };

    const handleFolderEditSave = async (payload) => {
        if (!editFolder || !user) return;
        setFolderEditSaving(true);
        try {
            const updated = await galleryService.updateFolder(editFolder.id, user.id, payload);
            setFolders((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
            setEditFolder(null);
        } catch (err) {
            console.error(err);
            alert('Failed to save folder.');
        } finally {
            setFolderEditSaving(false);
        }
    };

    const renderFolderContextMenu = (folder, variant = 'grid') => {
        if (folderContextMenuId !== folder.id) return null;
        return (
            <FolderContextMenu
                menuRef={folderMenuRef}
                anchorEl={folderMenuAnchor}
                folder={folder}
                variant={variant}
                onPreview={() => {
                    closeFolderContextMenu();
                    navigate(`/folders/${folder.id}`);
                }}
                onQuickEdit={() => {
                    closeFolderContextMenu();
                    setEditFolder(folder);
                }}
                onRemoveFolder={() => handleRemoveFolder(folder)}
                onShareByEmail={handleFolderShareByEmail}
                onGetDirectLink={(f) => {
                    closeFolderContextMenu();
                    setFolderDirectLink(f);
                }}
                onGetQrCode={(f) => {
                    closeFolderContextMenu();
                    setFolderQr(f);
                }}
                onShareWhatsApp={handleFolderShareWhatsApp}
            />
        );
    };

    const getCoverSrc = (collection) => collection.cover_url || collection.cover || '';

    const handlePreviewCollection = useCallback((collection) => {
        closeContextMenu();
        if (collection?.slug) {
            openSpaPath(`/gallery/${collection.slug}`);
        }
    }, [closeContextMenu]);

    const handleShareByEmail = useCallback((collection) => {
        if (!collection) return;
        closeContextMenu();
        navigate(`/collections/manage/share?id=${collection.id}`);
    }, [closeContextMenu, navigate]);

    const handleShareWhatsApp = useCallback((collection) => {
        if (!collection) return;
        const url = getShareUrlForCollection(collection);
        closeContextMenu();
        openWhatsAppShare(url, collection.name || 'Gallery');
    }, [closeContextMenu]);

    const handleGetDirectLink = useCallback((collection) => {
        if (!collection) return;
        setDirectLinkCollection(collection);
        closeContextMenu();
    }, [closeContextMenu]);

    const handleGetQrCode = useCallback((collection) => {
        if (!collection) return;
        setQrCollection(collection);
        closeContextMenu();
    }, [closeContextMenu]);

    const handleQuickEdit = useCallback((collection) => {
        closeContextMenu();
        setEditCollection(collection);
    }, [closeContextMenu]);

    const handleEditSave = async (payload) => {
        if (!editCollection) return;
        setEditSaving(true);
        try {
            const updated = await galleryService.updateCollection(editCollection.id, payload);
            setCollections((prev) =>
                prev.map((c) => (c.id === updated.id ? { ...c, ...updated, photo_count: c.photo_count } : c))
            );
            setEditCollection(null);
        } catch (err) {
            console.error('Failed to update collection:', err);
            alert('Failed to save changes. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleDuplicateConfirm = async () => {
        if (!duplicateCollection || !user?.id) return;
        const photographerId = duplicateCollection.photographer_id ?? user.id;
        setDuplicateBusy(true);
        try {
            const newRow = await galleryService.duplicateCollection(
                duplicateCollection.id,
                photographerId
            );
            setDuplicateCollection(null);
            navigate(`/collections/manage?id=${newRow.id}`);
        } catch (err) {
            console.error('Failed to duplicate collection:', err);
            alert(err?.message || 'Failed to duplicate collection. Please try again.');
        } finally {
            setDuplicateBusy(false);
        }
    };

    const handleToggleCollectionStar = async (e, collection) => {
        e.stopPropagation();
        const next = !collection.is_starred;
        try {
            await galleryService.updateCollection(collection.id, { is_starred: next });
            setCollections((prev) =>
                prev.map((c) => (c.id === collection.id ? { ...c, is_starred: next } : c))
            );
        } catch (err) {
            console.error('Failed to update star:', err);
        }
    };

    const renderContextMenu = (collection, variant = 'grid') => {
        if (contextMenuId !== collection.id) return null;
        return (
            <CollectionContextMenu
                menuRef={contextRef}
                anchorEl={contextMenuAnchor}
                variant={variant}
                onPreview={() => handlePreviewCollection(collection)}
                onQuickEdit={() => handleQuickEdit(collection)}
                onMoveTo={() => { closeContextMenu(); setMoveToCollection(collection); }}
                onDuplicate={() => { closeContextMenu(); setDuplicateCollection(collection); }}
                onDelete={() => { closeContextMenu(); handleDeleteCollection(collection.id); }}
                onShareByEmail={() => handleShareByEmail(collection)}
                onGetDirectLink={() => handleGetDirectLink(collection)}
                onGetQrCode={() => handleGetQrCode(collection)}
                onShareWhatsApp={() => handleShareWhatsApp(collection)}
            />
        );
    };

    const handleCardClick = (collection, e) => {
        const multiSelect = e?.metaKey || e?.ctrlKey || selectedCards.length > 0;
        if (multiSelect) {
            setContextMenuId(null);
            setSelectedCards((prev) => {
                if (prev.includes(collection.id)) {
                    return prev.filter((id) => id !== collection.id);
                }
                return [...prev, collection.id];
            });
            return;
        }
        navigate(`/collections/manage?id=${collection.id}`);
    };

    const handleCoverUpload = async (collectionId, e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                setLoading(true);
                // In a real app, upload to storage and get URL
                // For now, let's just use the galleryService to update
                // But normally we'd do galleryService.uploadPhotos then updateCollection
                alert('Please use the dynamic Collection Dashboard to manage cover photos for better storage management.');
            } catch (err) {
                console.error('Error updating cover:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteCollection = async (collectionId) => {
        if (!window.confirm('Are you sure you want to delete this collection? All photos will be removed.')) return;
        
        try {
            await galleryService.deleteCollection(collectionId);
            setCollections(prev => prev.filter(c => c.id !== collectionId));
        } catch (err) {
            console.error('Error deleting collection:', err);
            alert('Failed to delete collection.');
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
            if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
            const inSharePortal = e.target.closest?.('.cg-ctx-submenu--portal, .cg-ctx-submenu-bridge, .cgm-overlay');
            if (
                contextRef.current &&
                !contextRef.current.contains(e.target) &&
                !inSharePortal
            ) {
                setContextMenuId(null);
                setContextMenuAnchor(null);
            }
            if (
                folderMenuRef.current &&
                !folderMenuRef.current.contains(e.target) &&
                !inSharePortal
            ) {
                setFolderContextMenuId(null);
            }
            if (newCollectionRef.current && !newCollectionRef.current.contains(e.target)) setShowNewCollectionDropdown(false);
            if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) setShowSelectionMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clear selection
    const clearSelection = () => {
        setSelectedCards([]);
    };

    // Open context menu for a card
    const openContextMenu = (e, collectionId) => {
        e.stopPropagation();
        setFolderContextMenuId(null);
        setFolderMenuAnchor(null);
        if (contextMenuId === collectionId) {
            closeContextMenu();
            return;
        }
        setContextMenuAnchor(e.currentTarget);
        setContextMenuId(collectionId);
    };

    return (
        <SidebarLayout>
            <main className="cg-style-2">
                <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-8 sm:pt-12">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="cg-page-title text-3xl font-medium tracking-tight sm:text-4xl">Collections</h1>
                            <p className="mt-2 text-sm text-[#71717A]">
                                {dashboardStats.total} galleries · {dashboardStats.live} live ·{' '}
                                {dashboardStats.photos.toLocaleString()} photos delivered
                            </p>
                        </div>
                        <div className="relative shrink-0 flex items-center gap-1" ref={newCollectionRef}>
                            <button
                                type="button"
                                onClick={navigateNewCollection}
                                className="neu-pill inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium"
                            >
                                <Plus className="size-4" />
                                New collection
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowNewCollectionDropdown(!showNewCollectionDropdown)}
                                className="neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#1A1A1A]"
                                aria-label="More create options"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {showNewCollectionDropdown && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-[150] min-w-[200px] overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl shadow-black/10 border border-[#ECEAE6]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#F4F3F0]"
                                        onClick={navigateNewFolder}
                                    >
                                        New Folder
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={displayPlaceholder}
                                aria-label="Search collections, folders, and photo filenames"
                                className="neu-inset h-10 w-full rounded-full border-0 pl-9 pr-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A]"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative" ref={filterRef}>
                                <button
                                    type="button"
                                    onClick={() => { setShowFilterPanel(!showFilterPanel); setShowSortDropdown(false); }}
                                    className="neu-circle inline-flex size-10 items-center justify-center rounded-full text-[#1A1A1A]"
                                    aria-label="Filters"
                                >
                                    <Filter className="size-5" />
                                </button>
                                {showFilterPanel && (
                                    <div className="cg-filter-panel">
                                        <ClientGalleryFilterBar
                                            filters={galleryFilters}
                                            onFiltersChange={setGalleryFilters}
                                            collections={collections}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={sortRef}>
                                <button
                                    type="button"
                                    onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterPanel(false); }}
                                    className="neu-circle inline-flex size-10 items-center justify-center rounded-full text-[#1A1A1A]"
                                    aria-label="Sort"
                                >
                                    <ArrowUpDown className="size-5" />
                                </button>
                                {showSortDropdown && (
                                    <div className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-2xl bg-white p-2 shadow-xl shadow-black/10 border border-[#ECEAE6]">
                                        {[
                                            { id: 'created-new', label: 'Created: New → Old' },
                                            { id: 'created-old', label: 'Created: Old → New' },
                                            { id: 'event-new', label: 'Event Date: New → Old' },
                                            { id: 'event-old', label: 'Event Date: Old → New' },
                                            { id: 'name-az', label: 'Name: A–Z' },
                                            { id: 'name-za', label: 'Name: Z–A' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => { setActiveSort(opt.id); setShowSortDropdown(false); }}
                                                className={cn(
                                                    'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                                    activeSort === opt.id
                                                        ? 'bg-[#1A1A1A] font-medium text-white'
                                                        : 'text-[#1A1A1A] hover:bg-[#F4F3F0]',
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="neu-inset flex items-center rounded-full p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('grid')}
                                    className={cn(
                                        'inline-flex size-8 items-center justify-center rounded-full transition-all',
                                        activeView === 'grid' ? 'neu-circle text-[#1A1A1A]' : 'text-[#71717A] hover:text-[#1A1A1A]',
                                    )}
                                    aria-label="Grid view"
                                    aria-pressed={activeView === 'grid'}
                                >
                                    <LayoutGrid className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('list')}
                                    className={cn(
                                        'inline-flex size-8 items-center justify-center rounded-full transition-all',
                                        activeView === 'list' ? 'neu-circle text-[#1A1A1A]' : 'text-[#71717A] hover:text-[#1A1A1A]',
                                    )}
                                    aria-label="List view"
                                    aria-pressed={activeView === 'list'}
                                >
                                    <Rows3 className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="px-10 py-20 text-center text-[#666] text-[16px]">Loading…</div>
                ) : normalizedSearch && dashboardGridItems.length === 0 ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">No results</h3>
                        <p className="cg-style-62">
                            Nothing matches &ldquo;{searchQuery.trim()}&rdquo;. Try another name or clear search.
                        </p>
                        <button
                            type="button"
                            className="cg-style-63 bg-transparent border border-[#ddd] text-[#333] hover:bg-[#f5f5f5]"
                            onClick={() => setSearchQuery('')}
                        >
                            Clear search
                        </button>
                    </div>
                ) : hasActiveClientGalleryFilters(galleryFilters) && dashboardGridItems.length === 0 ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">No matching collections</h3>
                        <p className="cg-style-62">
                            No folders or collections match the current filters.
                        </p>
                        <button
                            type="button"
                            className="cg-style-63 bg-transparent border border-[#ddd] text-[#333] hover:bg-[#f5f5f5]"
                            onClick={() => setGalleryFilters(EMPTY_CLIENT_GALLERY_FILTERS)}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : dashboardGridItems.length > 0 && activeView === 'grid' ? (
                    <div className="cg-style-37 mx-auto w-full max-w-7xl px-4 sm:px-8">
                        {dashboardGridItems.map((item) =>
                            item.kind === 'folder' ? (
                                <div
                                    key={`folder-${item.folder.id}`}
                                    className={`cg-style-73 cg-folder-card group ${folderContextMenuId === item.folder.id ? 'cg-style-73--ctx-open' : ''}`}
                                    onClick={() => handleFolderCardClick(item.folder)}
                                >
                                    <div className="cg-style-74 cg-folder-thumb-wrap">
                                        <div className="cg-card-cover">
                                            <FolderThumbGrid folder={item.folder} />
                                        </div>
                                        <button
                                            type="button"
                                            className={cn(
                                                'cg-style-39',
                                                folderContextMenuId === item.folder.id && 'cg-style-39--visible',
                                                'group-hover:opacity-100',
                                            )}
                                            onClick={(e) => openFolderContextMenu(e, item.folder.id)}
                                            aria-label="Folder options"
                                        >
                                            <MoreHorizontal className="size-3.5" strokeWidth={2} />
                                        </button>
                                    </div>
                                    {renderFolderContextMenu(item.folder)}
                                    <div className="px-1">
                                        <h3 className="cg-style-43 cg-folder-title-row">
                                            <svg className="cg-folder-inline-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                            </svg>
                                            {item.folder.name}
                                        </h3>
                                        <div className="cg-style-44">
                                            <div className="cg-style-44-meta">
                                                <span>
                                                    {(item.folder.collection_count || 0) === 1
                                                        ? '1 collection'
                                                        : `${item.folder.collection_count || 0} collections`}
                                                </span>
                                                {formatFolderDate(item.folder) && (
                                                    <>
                                                        <span className="cg-style-46">·</span>
                                                        <span>{formatFolderDate(item.folder)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={item.collection.id}
                                    className={`cg-style-73 group ${contextMenuId === item.collection.id ? 'cg-style-73--ctx-open' : ''}`}
                                    onClick={(e) => handleCardClick(item.collection, e)}
                                >
                                    <div className={`cg-style-74 ${selectedCards.includes(item.collection.id) ? 'cg-style-74--selected' : ''}`}>
                                        <div className="cg-card-cover">
                                            {getCoverSrc(item.collection) ? (
                                                <img src={getCoverSrc(item.collection)} alt={item.collection.name} loading="lazy" decoding="async" />
                                            ) : (
                                                <div className="cg-style-38">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className={cn(
                                                'cg-card-star-btn',
                                                item.collection.is_starred
                                                    ? 'cg-card-star-btn--starred'
                                                    : 'cg-card-star-btn--idle group-hover:opacity-100',
                                            )}
                                            onClick={(e) => handleToggleCollectionStar(e, item.collection)}
                                            aria-label={item.collection.is_starred ? 'Unstar collection' : 'Star collection'}
                                        >
                                            <Star
                                                className="size-3.5"
                                                fill={item.collection.is_starred ? 'currentColor' : 'none'}
                                                strokeWidth={item.collection.is_starred ? 0 : 2}
                                            />
                                        </button>

                                        <button
                                            type="button"
                                            className={cn(
                                                'cg-style-39 group-hover:opacity-100',
                                                contextMenuId === item.collection.id && 'cg-style-39--visible',
                                            )}
                                            onClick={(e) => openContextMenu(e, item.collection.id)}
                                            aria-label="Collection options"
                                        >
                                            <MoreHorizontal className="size-3.5" strokeWidth={2} />
                                        </button>
                                    </div>
                                    {renderContextMenu(item.collection)}
                                    <div className="px-0 pt-2">
                                        <h3 className="truncate text-xs font-bold leading-tight text-[#1A1A1A]">{item.collection.name}</h3>
                                        <div className="flex items-center gap-1.5 text-xs leading-tight text-[#71717A]">
                                            <span>{item.collection.photo_count || 0} items</span>
                                            <span>•</span>
                                            <span>{formatStorageBytes(item.collection.storage_bytes)}</span>
                                            <span>•</span>
                                            <span
                                                className={cn('size-2 rounded-full', getStatusDotClass(item.collection.status))}
                                                title={item.collection.status || 'draft'}
                                                aria-label={item.collection.status || 'draft'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                ) : dashboardGridItems.length > 0 && activeView === 'list' ? (
                    /* List View */
                    <div className="px-10">
                        <div className="cg-style-47">
                            <span className="cg-style-48">NAME</span>
                            <span className="cg-style-49">PASSWORD <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>
                            <span className="cg-style-49">DOWNLOAD PIN <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>
                            <span className="cg-style-50">DATE CREATED</span>
                            <span className="cg-style-51"></span>
                        </div>
                        {dashboardGridItems.map((item) =>
                            item.kind === 'folder' ? (
                                <div
                                    key={`folder-${item.folder.id}`}
                                    className="cg-style-52 cg-style-52--menu"
                                    onClick={() => handleFolderCardClick(item.folder)}
                                >
                                    <div className="cg-style-48">
                                        <div className="cg-style-53 cg-folder-list-thumb">
                                            <FolderThumbGrid folder={item.folder} size="sm" />
                                        </div>
                                        <div className="cg-style-54">
                                            <span className="cg-style-55 cg-folder-title-row">
                                                <svg className="cg-folder-inline-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                </svg>
                                                {item.folder.name}
                                            </span>
                                            <span className="cg-style-56">
                                                {(item.folder.collection_count || 0) === 1
                                                    ? '1 collection'
                                                    : `${item.folder.collection_count || 0} collections`}
                                                {formatFolderDate(item.folder) ? ` · ${formatFolderDate(item.folder)}` : ''}
                                            </span>
                                        </div>
                                        <span className="cg-style-77 bg-[#eef6fc] text-[#333] border border-[#dbeafe]">FOLDER</span>
                                    </div>
                                    <div className="cg-style-49">
                                        <span className="cg-style-46">—</span>
                                    </div>
                                    <div className="cg-style-49">
                                        <span className="cg-style-46">—</span>
                                    </div>
                                    <div className="cg-style-50">
                                        {item.folder.created_at
                                            ? new Date(item.folder.created_at).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </div>
                                    <div className="cg-style-51 cg-style-51--relative">
                                        <span className="cg-style-59" onClick={(e) => openFolderContextMenu(e, item.folder.id)}>
                                            ···
                                        </span>
                                        {renderFolderContextMenu(item.folder, 'list')}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={item.collection.id}
                                    className="cg-style-52 cg-style-52--menu"
                                    onClick={(e) => handleCardClick(item.collection, e)}
                                >
                                    <div className="cg-style-48">
                                        <div className="cg-style-53">
                                            {getCoverSrc(item.collection) ? (
                                                <img src={getCoverSrc(item.collection)} alt={item.collection.name} loading="lazy" />
                                            ) : (
                                                <div className="cg-style-38">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="cg-style-54">
                                            <span className="cg-style-55">{item.collection.name}</span>
                                            <span className="cg-style-56">
                                                {item.collection.photo_count || 0} items
                                                {item.collection.event_date ? ` · ${new Date(item.collection.event_date).toLocaleDateString()}` : ''}
                                                {' · '}
                                                {formatStorageBytes(item.collection.storage_bytes)}
                                            </span>
                                        </div>
                                        <span className={`cg-style-77 ${item.collection.status === 'published' ? 'bg-[#eefaf9] text-[#44aaa7] border border-[#bceceb]' : 'bg-[#f0f2f3] text-[#666]'}`}>{item.collection.status?.toUpperCase() || 'DRAFT'}</span>
                                    </div>
                                    <div className="cg-style-49">
                                        <span className="cg-style-46">-</span>
                                    </div>
                                    <div className="cg-style-49">
                                        <span className="cg-style-57">••••</span>
                                    </div>
                                    <div className="cg-style-50">
                                        {item.collection.created_at
                                            ? new Date(item.collection.created_at).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </div>
                                    <div className="cg-style-51 cg-style-51--relative">
                                        <svg className="cg-style-58" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={item.collection.is_starred ? '#f5c518' : 'none'} stroke={item.collection.is_starred ? '#f5c518' : '#ccc'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => handleToggleCollectionStar(e, item.collection)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        <span className="cg-style-59" onClick={(e) => openContextMenu(e, item.collection.id)}>···</span>
                                        {renderContextMenu(item.collection, 'list')}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                ) : !hasDashboardItems ? (
                    <div className="cg-style-60">
                        <div className="mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d5d9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                        </div>
                        <h3 className="cg-style-61">No collections yet</h3>
                        <p className="cg-style-62">Create your first collection to get started</p>
                        <button className="neu-pill inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium" onClick={navigateNewCollection}>
                            Create Collection
                        </button>
                    </div>
                ) : null}

                {/* Selection Action Bar */}
                {selectedCards.length > 0 && (
                    <div className="cg-style-64">
                        <div className="cg-style-65" ref={selectionMenuRef}>
                            <button type="button" className="cg-style-66" onClick={clearSelection} aria-label="Clear selection">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <span className="whitespace-nowrap">{selectedCards.length} selected</span>
                            <button
                                type="button"
                                className="cg-style-66"
                                onClick={() => setShowSelectionMenu((v) => !v)}
                                aria-label="Selection options"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {showSelectionMenu ? (
                                <div className="cg-selection-menu">
                                    <button type="button" onClick={selectAllCollections}>Select all</button>
                                    <button type="button" onClick={clearSelection}>Deselect all</button>
                                </div>
                            ) : null}
                        </div>
                        <div className="cg-style-67">
                            <button type="button" className="cg-style-68" title="Edit starred" onClick={handleBulkStar} disabled={bulkApplying}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={selectedCollections.every((c) => c.is_starred) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </button>
                            <button type="button" className="cg-style-68" title="Edit status" onClick={() => setBulkStatusOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button type="button" className="cg-style-68" title="Edit tags" onClick={() => setBulkTagsOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </button>
                            <button type="button" className="cg-style-68" title="Move to" onClick={() => setBulkMoveOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path><line x1="19" y1="12" x2="19" y2="5"></line></svg>
                            </button>
                            <button type="button" className="cg-style-68" title="Edit settings" onClick={() => setBulkEditOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>
                    </div>
                )}

                <EditCollectionModal
                    collection={editCollection}
                    isOpen={Boolean(editCollection)}
                    onClose={() => setEditCollection(null)}
                    onSave={handleEditSave}
                    onAdvanced={(c) => navigate(`/collections/manage?id=${c.id}`)}
                    saving={editSaving}
                />
                <CollectionDirectLinkModal
                    collection={directLinkCollection}
                    isOpen={Boolean(directLinkCollection)}
                    onClose={() => setDirectLinkCollection(null)}
                />
                <CollectionQrModal
                    collection={qrCollection}
                    isOpen={Boolean(qrCollection)}
                    onClose={() => setQrCollection(null)}
                />
                <CollectionDuplicateModal
                    collection={duplicateCollection}
                    isOpen={Boolean(duplicateCollection)}
                    onClose={() => setDuplicateCollection(null)}
                    onConfirm={handleDuplicateConfirm}
                    busy={duplicateBusy}
                />
                <MoveCollectionModal
                    isOpen={Boolean(moveToCollection)}
                    onClose={() => setMoveToCollection(null)}
                    collectionId={moveToCollection?.id}
                    photographerId={user?.id}
                    currentFolderId={moveToCollection?.folder_id}
                    onMoved={async (folderId) => {
                        if (!moveToCollection || !user) return;
                        setMoveToCollection(null);
                        try {
                            const [cols, fols] = await Promise.all([
                                galleryService.getCollections(user.id),
                                galleryService.listFoldersForGallery(user.id),
                            ]);
                            setCollections(cols);
                            setFolders(fols);
                        } catch (e) {
                            console.error(e);
                            setCollections((prev) =>
                                prev.map((c) =>
                                    c.id === moveToCollection.id ? { ...c, folder_id: folderId } : c
                                )
                            );
                        }
                    }}
                />
                <MoveCollectionModal
                    isOpen={bulkMoveOpen}
                    onClose={() => setBulkMoveOpen(false)}
                    collectionIds={selectedCards}
                    photographerId={user?.id}
                    currentFolderIds={selectedCollections.map((c) => c.folder_id ?? null)}
                    onMoved={handleBulkMoveComplete}
                />
                <BulkCollectionStatusModal
                    isOpen={bulkStatusOpen}
                    count={selectedCards.length}
                    onClose={() => setBulkStatusOpen(false)}
                    applying={bulkApplying}
                    onApply={(payload) => applyBulkUpdate(payload, { closeStatus: true })}
                />
                <BulkCollectionTagsModal
                    isOpen={bulkTagsOpen}
                    count={selectedCards.length}
                    onClose={() => setBulkTagsOpen(false)}
                    applying={bulkApplying}
                    onApply={(payload) => applyBulkUpdate(payload, { closeTags: true })}
                />
                <BulkEditCollectionsModal
                    isOpen={bulkEditOpen}
                    count={selectedCards.length}
                    onClose={() => setBulkEditOpen(false)}
                    applying={bulkApplying}
                    onApply={(payload) => applyBulkUpdate(payload, { closeEdit: true })}
                />
                <EditFolderModal
                    folder={editFolder}
                    isOpen={Boolean(editFolder)}
                    onClose={() => setEditFolder(null)}
                    onSave={handleFolderEditSave}
                    saving={folderEditSaving}
                />
                <FolderDirectLinkModal folder={folderDirectLink} isOpen={Boolean(folderDirectLink)} onClose={() => setFolderDirectLink(null)} />
                <FolderQrModal folder={folderQr} isOpen={Boolean(folderQr)} onClose={() => setFolderQr(null)} />
            </main>
        </SidebarLayout>
    );
};

export default ClientGallery;
