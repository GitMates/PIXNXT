import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search,
    LayoutGrid,
    Menu,
    Filter,
    MoreVertical,
    ShoppingBag,
} from 'lucide-react';
import SidebarLayout from '../components/SidebarLayout';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { buildDeliveryStatusPatch } from '../lib/deliveryStatus';
import { openShareByEmail, openWhatsAppShare, getShareUrlForCollection } from '../lib/shareCollection';
import { CollectionCardCover } from '../components/features/ClientGallery/CollectionCardCover';
import { CollectionContextMenu } from '../components/features/ClientGallery/CollectionContextMenu';
import { DeleteDeliveryModal } from '../components/features/ClientGallery/DeleteDeliveryModal';
import { getCollectionCardCoverSrc } from '../lib/photoDisplayUrl';
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
import { getFolderStudioUrl } from '../lib/folderStudioUrl';
import {
    DELIVERY_SHOW_FILTERS,
    DELIVERY_SORT_OPTIONS,
    countDeliveriesByShow,
    countStillsAndFilms,
    coverFallbackIndex,
    deliveryAttentionBadge,
    deliveryBoardSummary,
    deliveryUiStatus,
    deliveryUiStatusLabel,
    filterDeliveriesByShow,
    formatDeliveryFullDate,
    formatDeliveryShortDate,
    formatInr,
} from '../lib/deliveryListPresentation';

function attachBoardExtras(rows, extras) {
    if (!extras) return rows || [];
    return (rows || []).map((c) => ({
        ...c,
        list_submitted: extras.submittedIds.has(c.id),
        order_stuck: extras.stuckIds.has(c.id),
        store_earnings: extras.earningsById[c.id] || 0,
    }));
}

function photographLabel(n) {
    const count = Number(n) || 0;
    return `${count.toLocaleString('en-IN')} ${count === 1 ? 'photograph' : 'photographs'}`;
}

function filmLabel(n) {
    const count = Number(n) || 0;
    if (count <= 0) return '';
    return `${count.toLocaleString('en-IN')} ${count === 1 ? 'film' : 'films'}`;
}

function deliveryDateValue(collection) {
    return collection?.event_date || collection?.created_at;
}

function SortArrowsIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
                d="M5 2.75v10.5M3.2 10.6 5 13.25 6.8 10.6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11 13.25V2.75M9.2 5.4 11 2.75 12.8 5.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const ClientGallery = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [collections, setCollections] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [photographerProfile, setPhotographerProfile] = useState(null);
    const navigateNewCollection = () => navigate('/deliveries/create');

    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [activeView, setActiveView] = useState('grid');
    const [activeSort, setActiveSort] = useState('activity');
    const [showBucket, setShowBucket] = useState('everything');
    const [selectedCards, setSelectedCards] = useState([]);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
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
    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [showSelectionMenu, setShowSelectionMenu] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const sortRef = useRef(null);
    const filterRef = useRef(null);
    const contextRef = useRef(null);
    const folderMenuRef = useRef(null);
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
                selectedCards.map((id) => {
                    const col = collections.find((c) => c.id === id);
                    const nextPayload = payload.status
                        ? { ...payload, ...buildDeliveryStatusPatch(payload.status, col) }
                        : payload;
                    return galleryService.updateCollection(id, nextPayload);
                })
            );
            setCollections((prev) =>
                prev.map((c) => (selectedCards.includes(c.id) ? { ...c, ...payload } : c))
            );
            if (closeStatus) setBulkStatusOpen(false);
            if (closeTags) setBulkTagsOpen(false);
            if (closeEdit) setBulkEditOpen(false);
        } catch (err) {
            console.error('Bulk update failed:', err);
            alert('Failed to update deliveries. Please try again.');
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
            let extras = { submittedIds: new Set(), stuckIds: new Set(), earningsById: {} };
            try {
                extras = await galleryService.getDeliveryBoardExtras(cols.map((c) => c.id));
            } catch (extraErr) {
                console.error('Delivery board extras failed:', extraErr);
            }
            setCollections(attachBoardExtras(cols, extras));
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
        if (!user?.id) {
            setPhotographerProfile(null);
            return;
        }
        galleryService
            .getPhotographerProfile(user.id)
            .then((data) => setPhotographerProfile(data || null))
            .catch(() => setPhotographerProfile(null));
    }, [user?.id]);

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
                let extras = { submittedIds: new Set(), stuckIds: new Set(), earningsById: {} };
                try {
                    extras = await galleryService.getDeliveryBoardExtras(data.map((c) => c.id));
                } catch (extraErr) {
                    console.error('Delivery board extras failed:', extraErr);
                }
                setCollections(attachBoardExtras(data, extras));
                setFolders(folderRows);
            } catch (err) {
                console.error('Error fetching collections:', err);
                setError('Failed to load deliveries. Please try again.');
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

    const collectionsForBoard = showBucket === 'everything' ? rootCollections : collections;

    const filteredRootCollections = useMemo(() => {
        const searched = filterRootCollectionsForSearch(collectionsForBoard, normalizedSearch);
        return filterDeliveriesByShow(searched, showBucket);
    }, [collectionsForBoard, normalizedSearch, showBucket]);

    const filteredFolders = useMemo(() => {
        if (showBucket !== 'everything') return [];
        return filterFoldersForSearch(folders, normalizedSearch, collections);
    }, [folders, collections, normalizedSearch, showBucket]);

    const sortedRootCollections = useMemo(
        () => sortCollections(filteredRootCollections, activeSort),
        [filteredRootCollections, activeSort]
    );

    const sortedFolderRows = useMemo(
        () => sortFolders(filteredFolders, activeSort),
        [filteredFolders, activeSort]
    );

    const hasDashboardItems = collections.length > 0 || folders.length > 0;

    const dashboardGridItems = useMemo(
        () => [
            ...sortedFolderRows.map((f) => ({ kind: 'folder', id: f.id, folder: f })),
            ...sortedRootCollections.map((c) => ({ kind: 'collection', id: c.id, collection: c })),
        ],
        [sortedFolderRows, sortedRootCollections]
    );

    const boardSummary = useMemo(() => deliveryBoardSummary(collections), [collections]);
    const showCounts = useMemo(() => countDeliveriesByShow(collections), [collections]);
    const filterIsNarrow = showBucket !== 'everything';

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
                ? `Remove folder "${folder.name}"? ${n} delivery(s) will move back to the main list (not deleted).`
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

    const getCoverSrc = (collection) => getCollectionCardCoverSrc(collection);

    const handlePreviewCollection = useCallback((collection) => {
        closeContextMenu();
        if (!collection?.slug && !collection?.name) return;
        const url = getShareUrlForCollection(collection, photographerProfile);
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [closeContextMenu, photographerProfile]);

    const handleCopyLink = useCallback(async (collection) => {
        if (!collection) return;
        closeContextMenu();
        const url = getShareUrlForCollection(collection, photographerProfile);
        try {
            await navigator.clipboard.writeText(url);
        } catch (err) {
            console.error(err);
            window.prompt('Copy link', url);
        }
    }, [closeContextMenu, photographerProfile]);

    const handleOpenDelivery = useCallback((collection) => {
        closeContextMenu();
        if (!collection?.id) return;
        navigate(`/deliveries/manage?id=${collection.id}`, {
            state: { from: `${location.pathname}${location.search}` },
        });
    }, [closeContextMenu, navigate, location.pathname, location.search]);

    const handleQuickEdit = useCallback((collection) => {
        closeContextMenu();
        setEditCollection(collection);
    }, [closeContextMenu]);

    const handleArchiveCollection = useCallback(async (collection) => {
        if (!collection?.id) return;
        closeContextMenu();
        try {
            const patch = buildDeliveryStatusPatch('archived', collection);
            await galleryService.updateCollection(collection.id, patch);
            setCollections((prev) =>
                prev.map((c) => (c.id === collection.id ? { ...c, ...patch } : c))
            );
        } catch (err) {
            console.error(err);
            alert('Failed to archive delivery.');
        }
    }, [closeContextMenu]);

    const handleStarFromMenu = useCallback(async (collection) => {
        if (!collection?.id) return;
        closeContextMenu();
        const next = !collection.is_starred;
        try {
            await galleryService.updateCollection(collection.id, { is_starred: next });
            setCollections((prev) =>
                prev.map((c) => (c.id === collection.id ? { ...c, is_starred: next } : c))
            );
        } catch (err) {
            console.error('Failed to update star:', err);
        }
    }, [closeContextMenu]);

    const handleEditSave = async (payload) => {
        if (!editCollection) return;
        setEditSaving(true);
        try {
            const { status: nextStatus, ...rest } = payload;
            const statusPatch = nextStatus
                ? buildDeliveryStatusPatch(nextStatus, editCollection)
                : {};
            const updated = await galleryService.updateCollection(editCollection.id, {
                ...rest,
                ...statusPatch,
            });
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
            navigate(`/deliveries/manage?id=${newRow.id}`);
        } catch (err) {
            console.error('Failed to duplicate collection:', err);
            alert(err?.message || 'Failed to duplicate delivery. Please try again.');
        } finally {
            setDuplicateBusy(false);
        }
    };

    const renderContextMenu = (collection, variant = 'grid') => {
        if (contextMenuId !== collection.id) return null;
        const storageLabel =
            Number(collection.storage_bytes) > 0
                ? formatStorageBytes(collection.storage_bytes)
                : '';
        return (
            <CollectionContextMenu
                menuRef={contextRef}
                anchorEl={contextMenuAnchor}
                variant={variant}
                collection={collection}
                storageLabel={storageLabel}
                onOpen={() => handleOpenDelivery(collection)}
                onCopyLink={() => handleCopyLink(collection)}
                onPreviewAsClient={() => handlePreviewCollection(collection)}
                onStar={() => handleStarFromMenu(collection)}
                onDuplicate={() => {
                    closeContextMenu();
                    setDuplicateCollection(collection);
                }}
                onRename={() => handleQuickEdit(collection)}
                onArchive={() => handleArchiveCollection(collection)}
                onDelete={() => {
                    closeContextMenu();
                    setPendingDelete(collection);
                }}
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
        navigate(`/deliveries/manage?id=${collection.id}`, {
            state: { from: `${location.pathname}${location.search}` },
        });
    };

    const handleConfirmDeleteCollection = async () => {
        if (!pendingDelete) return;
        const collectionId = pendingDelete.id;
        setDeleteBusy(true);
        try {
            await galleryService.deleteCollection(collectionId);
            setPendingDelete(null);
            setDeletingId(collectionId);
            setCollections((prev) => prev.filter((c) => c.id !== collectionId));
            await new Promise((resolve) => window.setTimeout(resolve, 280));
            setDeletingId(null);
        } catch (err) {
            console.error('Error deleting collection:', err);
            alert(err?.message || 'Failed to delete delivery.');
        } finally {
            setDeleteBusy(false);
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
            if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
            const inSharePortal = e.target.closest?.('.cg-ctx-submenu--portal, .cg-ctx-submenu-bridge, .cgm-overlay, .dl-delete-overlay');
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
            <main className="cg-style-2 dl-page">
                <div className="mx-auto w-full max-w-[92rem] px-4 pt-10 sm:px-8 sm:pt-12 pb-16">
                    <div className="dl-header flex items-start justify-between gap-4">
                        <div>
                            <h1 className="cg-page-title">Deliveries</h1>
                            <p className="dl-lede">
                                {boardSummary.lead ? <strong>{boardSummary.lead}</strong> : null}
                                {boardSummary.rest}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="dl-new shrink-0"
                            onClick={navigateNewCollection}
                        >
                            + New delivery
                        </button>
                    </div>

                    <div className="dl-toolbar mt-8">
                        <div className="dl-search">
                            <Search aria-hidden />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search deliveries or clients..."
                                aria-label="Search deliveries, folders, and photo filenames"
                            />
                        </div>

                        <div className="dl-tools">
                            <div className="relative" ref={filterRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFilterPanel((v) => !v);
                                        setShowSortDropdown(false);
                                    }}
                                    className={cn('dl-icon-btn', (showFilterPanel || filterIsNarrow) && 'is-on')}
                                    aria-label="Show filter"
                                    aria-expanded={showFilterPanel}
                                >
                                    <Filter className="size-4" strokeWidth={1.6} />
                                </button>
                                {showFilterPanel ? (
                                    <div className="dl-popover" role="menu">
                                        <p className="dl-popover__kicker">SHOW</p>
                                        {DELIVERY_SHOW_FILTERS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                role="menuitem"
                                                className={cn('dl-popover__item', showBucket === opt.id && 'is-on')}
                                                onClick={() => {
                                                    setShowBucket(opt.id);
                                                    setShowFilterPanel(false);
                                                }}
                                            >
                                                <span>{opt.label}</span>
                                                <span className="dl-popover__count">{showCounts[opt.id] ?? 0}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="relative" ref={sortRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSortDropdown((v) => !v);
                                        setShowFilterPanel(false);
                                    }}
                                    className={cn('dl-icon-btn', showSortDropdown && 'is-on')}
                                    aria-label="Sort"
                                    aria-expanded={showSortDropdown}
                                >
                                    <SortArrowsIcon />
                                </button>
                                {showSortDropdown ? (
                                    <div className="dl-popover" role="menu">
                                        <p className="dl-popover__kicker">SORT BY</p>
                                        {DELIVERY_SORT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                role="menuitem"
                                                className={cn('dl-popover__item', activeSort === opt.id && 'is-on')}
                                                onClick={() => {
                                                    setActiveSort(opt.id);
                                                    setShowSortDropdown(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="dl-view-toggle" role="group" aria-label="View">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('grid')}
                                    className={cn(activeView === 'grid' && 'is-on')}
                                    aria-label="Grid view"
                                    aria-pressed={activeView === 'grid'}
                                >
                                    <LayoutGrid className="size-3.5" strokeWidth={1.6} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('list')}
                                    className={cn(activeView === 'list' && 'is-on')}
                                    aria-label="List view"
                                    aria-pressed={activeView === 'list'}
                                >
                                    <Menu className="size-3.5" strokeWidth={1.6} />
                                </button>
                            </div>
                        </div>
                    </div>

                {loading ? (
                    <div className="px-2 py-20 text-center text-[#666] text-[16px]">Loading…</div>
                ) : error ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">Couldn’t load deliveries</h3>
                        <p className="cg-style-62">{error}</p>
                    </div>
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
                ) : filterIsNarrow && dashboardGridItems.length === 0 ? (
                    <div className="cg-style-60">
                        <h3 className="cg-style-61">No matching deliveries</h3>
                        <p className="cg-style-62">
                            No deliveries match the current filter.
                        </p>
                        <button
                            type="button"
                            className="cg-style-63 bg-transparent border border-[#ddd] text-[#333] hover:bg-[#f5f5f5]"
                            onClick={() => setShowBucket('everything')}
                        >
                            Show everything
                        </button>
                    </div>
                ) : dashboardGridItems.length > 0 && activeView === 'grid' ? (
                    <div className="dl-grid">
                        {dashboardGridItems.map((item) =>
                            item.kind === 'folder' ? (
                                <div
                                    key={`folder-${item.folder.id}`}
                                    className={cn('dl-card', folderContextMenuId === item.folder.id && 'is-menu')}
                                    onClick={() => handleFolderCardClick(item.folder)}
                                >
                                    <div className="dl-cover">
                                        <FolderThumbGrid folder={item.folder} />
                                        <button
                                            type="button"
                                            className="dl-more"
                                            onClick={(e) => openFolderContextMenu(e, item.folder.id)}
                                            aria-label="Folder options"
                                        >
                                            <MoreVertical className="size-3.5" strokeWidth={2} />
                                        </button>
                                    </div>
                                    {renderFolderContextMenu(item.folder)}
                                    <div className="dl-card-body">
                                        <h3 className="dl-card-title">{item.folder.name}</h3>
                                    </div>
                                    <div className="dl-meta">
                                        <span>
                                            {(item.folder.collection_count || 0) === 1
                                                ? '1 delivery'
                                                : `${item.folder.collection_count || 0} deliveries`}
                                        </span>
                                        {formatFolderDate(item.folder) ? (
                                            <>
                                                <span aria-hidden>·</span>
                                                <span>{formatFolderDate(item.folder)}</span>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                (() => {
                                    const collection = item.collection;
                                    const attention = deliveryAttentionBadge(collection);
                                    const status = deliveryUiStatus(collection);
                                    const counts = countStillsAndFilms(collection);
                                    const earn = formatInr(collection.store_earnings);
                                    const shortDate = formatDeliveryShortDate(deliveryDateValue(collection));
                                    const coverSrc = getCoverSrc(collection);
                                    return (
                                        <div
                                            key={collection.id}
                                            className={cn(
                                                'dl-card',
                                                contextMenuId === collection.id && 'is-menu',
                                                selectedCards.includes(collection.id) && 'is-selected',
                                                deletingId === collection.id && 'is-leaving',
                                            )}
                                            onClick={(e) => handleCardClick(collection, e)}
                                        >
                                            <div className="dl-cover">
                                                {coverSrc ? (
                                                    <CollectionCardCover collection={collection} alt="" />
                                                ) : (
                                                    <div
                                                        className={`dl-cover-fallback dl-cover-fallback--${coverFallbackIndex(collection.id)}`}
                                                        aria-hidden
                                                    />
                                                )}
                                                {attention ? (
                                                    <span className="dl-badge">
                                                        <span className="dl-badge__dot" />
                                                        {attention.label}
                                                    </span>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="dl-more"
                                                    onClick={(e) => openContextMenu(e, collection.id)}
                                                    aria-label="Delivery options"
                                                >
                                                    <MoreVertical className="size-3.5" strokeWidth={2} />
                                                </button>
                                            </div>
                                            {renderContextMenu(collection)}
                                            <div className="dl-card-body">
                                                <h3 className="dl-card-title">{collection.name}</h3>
                                                {earn ? (
                                                    <span className="dl-earn">
                                                        <ShoppingBag aria-hidden />
                                                        {earn}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="dl-meta">
                                                {shortDate ? (
                                                    <>
                                                        <span>{shortDate}</span>
                                                        <span aria-hidden>·</span>
                                                    </>
                                                ) : null}
                                                <span>{photographLabel(counts.photographs)}</span>
                                                <span aria-hidden>·</span>
                                                <span className={`dl-status-dot dl-status-dot--${status}`} />
                                                <span>{deliveryUiStatusLabel(collection)}</span>
                                            </div>
                                        </div>
                                    );
                                })()
                            )
                        )}
                    </div>
                ) : dashboardGridItems.length > 0 && activeView === 'list' ? (
                    <div className="dl-list">
                        {dashboardGridItems.map((item) =>
                            item.kind === 'folder' ? (
                                <div
                                    key={`folder-${item.folder.id}`}
                                    className={cn('dl-row', folderContextMenuId === item.folder.id && 'is-menu')}
                                    onClick={() => handleFolderCardClick(item.folder)}
                                >
                                    <div className="dl-row-main">
                                        <div className="dl-row-thumb">
                                            <FolderThumbGrid folder={item.folder} size="sm" />
                                        </div>
                                        <div>
                                            <div className="dl-row-title">
                                                <span>{item.folder.name}</span>
                                                <span className="dl-chip">Folder</span>
                                            </div>
                                            <div className="dl-row-sub">
                                                <span>
                                                    {(item.folder.collection_count || 0) === 1
                                                        ? '1 delivery'
                                                        : `${item.folder.collection_count || 0} deliveries`}
                                                </span>
                                                {formatFolderDate(item.folder) ? (
                                                    <>
                                                        <span aria-hidden>·</span>
                                                        <span>{formatFolderDate(item.folder)}</span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="dl-row-size" />
                                    <span className="dl-row-earn" />
                                    <button
                                        type="button"
                                        className="dl-row-more"
                                        onClick={(e) => openFolderContextMenu(e, item.folder.id)}
                                        aria-label="Folder options"
                                    >
                                        <MoreVertical className="size-4" />
                                    </button>
                                    {renderFolderContextMenu(item.folder, 'list')}
                                </div>
                            ) : (
                                (() => {
                                    const collection = item.collection;
                                    const attention = deliveryAttentionBadge(collection);
                                    const status = deliveryUiStatus(collection);
                                    const counts = countStillsAndFilms(collection);
                                    const earn = formatInr(collection.store_earnings);
                                    const fullDate = formatDeliveryFullDate(deliveryDateValue(collection));
                                    const films = filmLabel(counts.films);
                                    const size =
                                        Number(collection.storage_bytes) > 0
                                            ? formatStorageBytes(collection.storage_bytes)
                                            : '';
                                    const coverSrc = getCoverSrc(collection);
                                    return (
                                        <div
                                            key={collection.id}
                                            className={cn(
                                                'dl-row',
                                                contextMenuId === collection.id && 'is-menu',
                                                selectedCards.includes(collection.id) && 'is-selected',
                                                deletingId === collection.id && 'is-leaving',
                                            )}
                                            onClick={(e) => handleCardClick(collection, e)}
                                        >
                                            <div className="dl-row-main">
                                                <div className="dl-row-thumb">
                                                    {coverSrc ? (
                                                        <CollectionCardCover collection={collection} alt="" />
                                                    ) : (
                                                        <div
                                                            className={`dl-cover-fallback dl-cover-fallback--${coverFallbackIndex(collection.id)}`}
                                                            aria-hidden
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="dl-row-title">
                                                        <span>{collection.name}</span>
                                                        {attention ? (
                                                            <span
                                                                className={cn(
                                                                    'dl-chip',
                                                                    attention.kind === 'late' ? 'dl-chip--late' : 'dl-chip--warn',
                                                                )}
                                                            >
                                                                {attention.label}
                                                            </span>
                                                        ) : null}
                                                        <span className="dl-row-status">
                                                            <span className={`dl-status-dot dl-status-dot--${status}`} />
                                                            {deliveryUiStatusLabel(collection)}
                                                        </span>
                                                    </div>
                                                    <div className="dl-row-sub">
                                                        {fullDate ? (
                                                            <>
                                                                <span>{fullDate}</span>
                                                                <span aria-hidden>·</span>
                                                            </>
                                                        ) : null}
                                                        <span>{photographLabel(counts.photographs)}</span>
                                                        {films ? (
                                                            <>
                                                                <span aria-hidden>·</span>
                                                                <span>{films}</span>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="dl-row-size">{size}</span>
                                            <span className="dl-row-earn">
                                                {earn ? (
                                                    <>
                                                        <ShoppingBag className="size-3.5" aria-hidden />
                                                        {earn}
                                                    </>
                                                ) : null}
                                            </span>
                                            <button
                                                type="button"
                                                className="dl-row-more"
                                                onClick={(e) => openContextMenu(e, collection.id)}
                                                aria-label="Delivery options"
                                            >
                                                <MoreVertical className="size-4" />
                                            </button>
                                            {renderContextMenu(collection, 'list')}
                                        </div>
                                    );
                                })()
                            )
                        )}
                    </div>
                ) : !hasDashboardItems ? (
                    <div className="cg-style-60">
                        <div className="mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d5d9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                        </div>
                        <h3 className="cg-style-61">No deliveries yet</h3>
                        <p className="cg-style-62">Create your first delivery to get started</p>
                        <button className="dl-new" onClick={navigateNewCollection}>
                            Create Delivery
                        </button>
                    </div>
                ) : null}
                </div>

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
                    onAdvanced={(c) => navigate(`/deliveries/manage?id=${c.id}`, {
                        state: { from: `${location.pathname}${location.search}` },
                    })}
                    saving={editSaving}
                />
                <CollectionDirectLinkModal
                    collection={directLinkCollection}
                    photographerProfile={photographerProfile}
                    isOpen={Boolean(directLinkCollection)}
                    onClose={() => setDirectLinkCollection(null)}
                />
                <CollectionQrModal
                    collection={qrCollection}
                    photographerProfile={photographerProfile}
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
                            let extras = { submittedIds: new Set(), stuckIds: new Set(), earningsById: {} };
                            try {
                                extras = await galleryService.getDeliveryBoardExtras(cols.map((c) => c.id));
                            } catch (extraErr) {
                                console.error('Delivery board extras failed:', extraErr);
                            }
                            setCollections(attachBoardExtras(cols, extras));
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
                <DeleteDeliveryModal
                    isOpen={Boolean(pendingDelete)}
                    name={pendingDelete?.name}
                    busy={deleteBusy}
                    onClose={() => {
                        if (!deleteBusy) setPendingDelete(null);
                    }}
                    onConfirm={handleConfirmDeleteCollection}
                />
            </main>
        </SidebarLayout>
    );
};

export default ClientGallery;
