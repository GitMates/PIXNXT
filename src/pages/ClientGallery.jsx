import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { openSpaPath } from '../lib/spaNavigation';
import { generateCollectionSlug } from '../lib/collectionSlug';
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
import { getFolderStudioUrl } from '../lib/folderStudioUrl';


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
    const [showViewDropdown, setShowViewDropdown] = useState(false);
    const [activeView, setActiveView] = useState('grid');
    const [activeSort, setActiveSort] = useState('created-new');
    const [selectedCards, setSelectedCards] = useState([]);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
    const [activeFilter, setActiveFilter] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
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
    const fileInputRef = useRef(null);
    const sortRef = useRef(null);
    const viewRef = useRef(null);
    const contextRef = useRef(null);
    const folderMenuRef = useRef(null);
    const filterRef = useRef(null);
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
        setSelectedCards(rootCollections.map((c) => c.id));
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

    const sortedRootCollections = useMemo(
        () => sortCollections(rootCollections, activeSort),
        [rootCollections, activeSort]
    );

    const sortedFolderRows = useMemo(() => sortFolders(folders, activeSort), [folders, activeSort]);

    const dashboardGridItems = useMemo(
        () => [
            ...sortedFolderRows.map((f) => ({ kind: 'folder', id: f.id, folder: f })),
            ...sortedRootCollections.map((c) => ({ kind: 'collection', id: c.id, collection: c })),
        ],
        [sortedFolderRows, sortedRootCollections]
    );

    const sortedCollections = sortedRootCollections;

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
        const url = getShareUrlForCollection(collection);
        closeContextMenu();
        openShareByEmail(url, collection.name || 'Photo Gallery');
    }, [closeContextMenu]);

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
        if (!duplicateCollection || !user) return;
        setDuplicateBusy(true);
        try {
            const newRow = await galleryService.createCollection({
                photographer_id: user.id,
                name: `${duplicateCollection.name} (Copy)`,
                slug: `${generateCollectionSlug(duplicateCollection.name)}-copy-${Date.now().toString(36)}`,
                event_date: duplicateCollection.event_date || null,
                status: 'draft',
                font_family: 'sans_1',
                color_palette: 'light_1',
                grid_style: 'vertical',
                thumbnail_size: 'regular',
                grid_spacing: 'regular',
                nav_style: 'icons',
                privacy: 'public',
                cover_style: 'photo',
            });
            setDuplicateCollection(null);
            navigate(`/collections/manage?id=${newRow.id}`);
        } catch (err) {
            console.error('Failed to duplicate collection:', err);
            alert('Failed to duplicate collection. Please try again.');
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

    const handleCardClick = (collection) => {
        if (selectedCards.length > 0) return;
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
            if (viewRef.current && !viewRef.current.contains(e.target)) setShowViewDropdown(false);
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
            if (filterRef.current && !filterRef.current.contains(e.target)) setActiveFilter(null);
            if (newCollectionRef.current && !newCollectionRef.current.contains(e.target)) setShowNewCollectionDropdown(false);
            if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) setShowSelectionMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle a filter dropdown
    const toggleFilter = (filterName) => {
        setActiveFilter(activeFilter === filterName ? null : filterName);
    };

    // Calendar helpers
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
    const today = new Date();

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
        const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
        const daysInPrevMonth = getDaysInMonth(calendarMonth - 1 < 0 ? 11 : calendarMonth - 1, calendarMonth - 1 < 0 ? calendarYear - 1 : calendarYear);
        const cells = [];
        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push(<span key={`prev-${i}`} className="cg-style-1">{daysInPrevMonth - i}</span>);
        }
        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
            cells.push(<span key={`cur-${d}`} className={`cg-style-69 ${isToday ? 'text-[#593116] font-bold' : 'text-[#333]'}`}>{d}</span>);
        }
        // Next month leading days
        const remaining = 7 - (cells.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                cells.push(<span key={`next-${i}`} className="cg-style-1">{i}</span>);
            }
        }
        return cells;
    };

    // Toggle selection of a card
    const toggleSelectCard = (e, collectionId) => {
        e.stopPropagation();
        setContextMenuId(null);
        setSelectedCards(prev => {
            if (prev.includes(collectionId)) {
                return prev.filter(id => id !== collectionId);
            }
            return [...prev, collectionId];
        });
    };

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
                {/* Header */}
                <div className="cg-style-3">
                    <div className="cg-style-4">
                        <h1 className="cg-style-5">Collections</h1>
                        <div className="cg-style-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search" className="cg-style-7" />
                        </div>
                    </div>
                    <div className="cg-style-8">
                        <button className="cg-style-9">View Presets</button>
                        <div className="cg-style-10" ref={newCollectionRef}>
                            <button className="cg-style-11" onClick={navigateNewCollection}>
                                New Collection
                            </button>
                            <button className="cg-style-12" onClick={() => setShowNewCollectionDropdown(!showNewCollectionDropdown)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {showNewCollectionDropdown && (
                                <div className="cg-style-13">
                                    <div className="cg-style-14" onClick={navigateNewFolder}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                        New Folder
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="cg-style-15" ref={filterRef}>
                    <div className="cg-style-16">
                        {/* Status Filter */}
                        <div className="relative inline-flex">
                            <button className={`cg-style-70 ${activeFilter === 'status' ? 'bg-[#fdfaf4] border border-[#c29775] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`} onClick={() => toggleFilter('status')}>
                                Status
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'status' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'status' && (
                                <div className="cg-style-17">
                                    <div className="cg-style-18" onClick={() => setActiveFilter(null)}>Published</div>
                                    <div className="cg-style-18" onClick={() => setActiveFilter(null)}>Hidden</div>
                                    <div className="cg-style-18" onClick={() => setActiveFilter(null)}>Draft</div>
                                </div>
                            )}
                        </div>
                        {/* Category Tag Filter */}
                        <div className="relative inline-flex">
                            <button className={`cg-style-70 ${activeFilter === 'category' ? 'bg-[#fdfaf4] border border-[#c29775] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`} onClick={() => toggleFilter('category')}>
                                Category Tag
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'category' && (
                                <div className="cg-style-17">
                                    <div className="cg-style-19">You don't have category tags yet. <a className="cg-style-20" href="#">Learn more</a></div>
                                </div>
                            )}
                        </div>
                        {/* Event Date Filter */}
                        <div className="relative inline-flex">
                            <button className={`cg-style-70 ${activeFilter === 'eventdate' ? 'bg-[#fdfaf4] border border-[#c29775] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`} onClick={() => toggleFilter('eventdate')}>
                                Event Date
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'eventdate' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'eventdate' && (
                                <div className="cg-style-21">
                                    <div className="cg-style-22">
                                        <div className="cg-style-23">
                                            <span className="cg-style-24">{monthNames[calendarMonth]}</span>
                                            <span className="cg-style-25">{calendarYear}</span>
                                            <button className="cg-style-26" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}>←</button>
                                            <button className="cg-style-26" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}>→</button>
                                        </div>
                                        <div className="cg-style-27">{dayNames.map((d, i) => <span key={i}>{d}</span>)}</div>
                                        <div className="cg-style-28">{renderCalendarGrid()}</div>
                                    </div>
                                    <div className="cg-style-29">
                                        <div className="cg-style-30">QUICK SEARCH</div>
                                        <div className="cg-style-31">Last week</div>
                                        <div className="cg-style-31">Last 2 weeks</div>
                                        <div className="cg-style-31">Last month</div>
                                        <div className="cg-style-31">Last 6 months</div>
                                        <div className="cg-style-31">Last year</div>
                                        <div className="cg-style-31">Next week</div>
                                        <div className="cg-style-31">Next 2 weeks</div>
                                        <div className="cg-style-31">Next month</div>
                                        <div className="cg-style-31">Next 6 months</div>
                                        <div className="cg-style-31">Next year</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Expiry Date Filter */}
                        <div className="relative inline-flex">
                            <button className={`cg-style-70 ${activeFilter === 'expirydate' ? 'bg-[#fdfaf4] border border-[#c29775] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`} onClick={() => toggleFilter('expirydate')}>
                                Expiry Date
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'expirydate' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'expirydate' && (
                                <div className="cg-style-21">
                                    <div className="cg-style-22">
                                        <div className="cg-style-23">
                                            <span className="cg-style-24">{monthNames[calendarMonth]}</span>
                                            <span className="cg-style-25">{calendarYear}</span>
                                            <button className="cg-style-26" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}>←</button>
                                            <button className="cg-style-26" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}>→</button>
                                        </div>
                                        <div className="cg-style-27">{dayNames.map((d, i) => <span key={i}>{d}</span>)}</div>
                                        <div className="cg-style-28">{renderCalendarGrid()}</div>
                                    </div>
                                    <div className="cg-style-29">
                                        <div className="cg-style-30">QUICK SEARCH</div>
                                        <div className="cg-style-31">Next week</div>
                                        <div className="cg-style-31">Next 2 weeks</div>
                                        <div className="cg-style-31">Next month</div>
                                        <div className="cg-style-31">Next 6 months</div>
                                        <div className="cg-style-31">Next year</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Starred Filter */}
                        <div className="relative inline-flex">
                            <button className={`cg-style-70 ${activeFilter === 'starred' ? 'bg-[#fdfaf4] border border-[#c29775] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`} onClick={() => toggleFilter('starred')}>
                                Starred
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'starred' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'starred' && (
                                <div className="cg-style-17">
                                    <div className="cg-style-18" onClick={() => setActiveFilter(null)}>Yes</div>
                                    <div className="cg-style-18" onClick={() => setActiveFilter(null)}>No</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="cg-style-32">
                        <div className="relative inline-flex" ref={sortRef}>
                            <button className="cg-view-icon-btn" onClick={() => { setShowSortDropdown(!showSortDropdown); setShowViewDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="3" y1="6" x2="3" y2="18"></line><polyline points="1 15 3 18 5 15"></polyline></svg>
                            </button>
                            {showSortDropdown && (
                                <div className="cg-style-33">
                                    <div className="cg-style-34">Sort dashboard by</div>
                                    <div className={`cg-style-71 ${activeSort === 'created-new' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('created-new'); setShowSortDropdown(false); }}>Created: New → Old</div>
                                    <div className={`cg-style-71 ${activeSort === 'created-old' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('created-old'); setShowSortDropdown(false); }}>Created: Old → New</div>
                                    <div className={`cg-style-71 ${activeSort === 'event-new' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('event-new'); setShowSortDropdown(false); }}>Event Date: New → Old</div>
                                    <div className={`cg-style-71 ${activeSort === 'event-old' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('event-old'); setShowSortDropdown(false); }}>Event Date: Old → New</div>
                                    <div className={`cg-style-71 ${activeSort === 'name-az' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('name-az'); setShowSortDropdown(false); }}>Name: A-Z</div>
                                    <div className={`cg-style-71 ${activeSort === 'name-za' ? 'cg-sort-active' : 'text-[#333]'}`} onClick={() => { setActiveSort('name-za'); setShowSortDropdown(false); }}>Name: Z-A</div>
                                </div>
                            )}
                        </div>
                        <div className="relative inline-flex" ref={viewRef}>
                            <button className={`cg-style-72 ${activeView === 'grid' ? 'text-[#444]' : 'text-[#b0b0b0] hover:text-[#444]'}`} onClick={() => { setShowViewDropdown(!showViewDropdown); setShowSortDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                            {showViewDropdown && (
                                <div className="cg-style-35">
                                    <div className="cg-style-34">View Style</div>
                                    <div className={`cg-style-71 ${activeView === 'grid' ? 'text-[#593116]' : 'text-[#333]'}`} onClick={() => { setActiveView('grid'); setShowViewDropdown(false); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                        Grid View
                                        {activeView === 'grid' && <span className="cg-style-36">✓</span>}
                                    </div>
                                    <div className={`cg-style-71 ${activeView === 'list' ? 'text-[#593116]' : 'text-[#333]'}`} onClick={() => { setActiveView('list'); setShowViewDropdown(false); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                        List View
                                        {activeView === 'list' && <span className="cg-style-36">✓</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="px-10 py-20 text-center text-[#666] text-sm">Loading…</div>
                ) : dashboardGridItems.length > 0 && activeView === 'grid' ? (
                    <div className="cg-style-37">
                        {dashboardGridItems.map((item) =>
                            item.kind === 'folder' ? (
                                <div
                                    key={`folder-${item.folder.id}`}
                                    className={`cg-style-73 cg-folder-card group ${folderContextMenuId === item.folder.id ? 'cg-style-73--ctx-open' : ''}`}
                                    onClick={() => handleFolderCardClick(item.folder)}
                                >
                                    <div className="cg-style-74 cg-folder-thumb-wrap">
                                        <FolderThumbGrid folder={item.folder} />
                                        <div className="cg-style-39" onClick={(e) => openFolderContextMenu(e, item.folder.id)}>
                                            ⋮
                                        </div>
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
                                    onClick={() => handleCardClick(item.collection)}
                                >
                                    <div className={`cg-style-74 ${selectedCards.includes(item.collection.id) ? 'cg-style-74--selected' : ''}`}>
                                        {getCoverSrc(item.collection) ? (
                                            <img src={getCoverSrc(item.collection)} alt={item.collection.name} loading="lazy" />
                                        ) : (
                                            <div className="cg-style-38">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            </div>
                                        )}
                                        <div className={`cg-style-75 ${selectedCards.includes(item.collection.id) ? 'border-[#593116] bg-[#593116] opacity-100' : 'border-white/85 bg-black/15 opacity-0 group-hover:opacity-100'}`} onClick={(e) => toggleSelectCard(e, item.collection.id)}>
                                            {selectedCards.includes(item.collection.id) && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            )}
                                        </div>
                                        <div className="cg-style-39" onClick={(e) => openContextMenu(e, item.collection.id)}>⋮</div>
                                        <svg className={`cg-style-76 ${item.collection.is_starred ? 'opacity-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'opacity-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:opacity-100'}`} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={item.collection.is_starred ? '#f5c518' : 'none'} stroke={item.collection.is_starred ? '#f5c518' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => handleToggleCollectionStar(e, item.collection)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    {renderContextMenu(item.collection)}
                                    <div className="px-1">
                                        <h3 className="cg-style-43">{item.collection.name}</h3>
                                        <div className="cg-style-44 cg-style-44--split">
                                            <div className="cg-style-44-meta">
                                                <span className="cg-style-45"></span>
                                                <span>{item.collection.photo_count || 0} items</span>
                                                <span className="cg-style-46">·</span>
                                                <span>{item.collection.event_date ? new Date(item.collection.event_date).toLocaleDateString() : 'No date'}</span>
                                            </div>
                                            <span className="cg-style-80" title="Storage used by this collection">
                                                {formatStorageBytes(item.collection.storage_bytes)}
                                            </span>
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
                                    onClick={() => handleCardClick(item.collection)}
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
                                        <span className={`cg-style-77 ${item.collection.status === 'published' ? 'bg-[#e6f9f3] text-[#593116] border border-[#b8f0de]' : 'bg-[#f0f2f3] text-[#666]'}`}>{item.collection.status?.toUpperCase() || 'DRAFT'}</span>
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
                ) : (
                    <div className="cg-style-60">
                        <div className="mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d5d9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                        </div>
                        <h3 className="cg-style-61">No collections yet</h3>
                        <p className="cg-style-62">Create your first collection to get started</p>
                        <button className="cg-style-63" onClick={navigateNewCollection}>
                            Create Collection
                        </button>
                    </div>
                )}

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
