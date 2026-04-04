import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { galleryService } from '../services/gallery.service';
import './CollectionDashboard.css';

const CollectionDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get('id');
    
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
    const [showSetMenu, setShowSetMenu] = useState(null); // set id or null
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [showSelectionMore, setShowSelectionMore] = useState(false);
    const [showSelectAllMenu, setShowSelectAllMenu] = useState(false);
    const [showMoveToSetMenu, setShowMoveToSetMenu] = useState(false);
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

    // SORT STATE
    const [sortOption, setSortOption] = useState('upload-new-old');

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
    const [showCoverModal, setShowCoverModal] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('general');

    // General Settings State
    const [collectionUrl, setCollectionUrl] = useState('vbn');
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
    const [downloadPin, setDownloadPin] = useState(true);
    const [pinValue, setPinValue] = useState('1060');

    // Favorite State
    const [favoritePhotos, setFavoritePhotos] = useState(true);
    const [favoriteNotes, setFavoriteNotes] = useState(true);

    // Activity State
    const [activeActivitySubTab, setActiveActivitySubTab] = useState('download'); // download, favorite, store, email, share, private
    const [activeDownloadActivityTab, setActiveDownloadActivityTab] = useState('gallery'); // gallery, photo, video

    const coverStyles = [
        { id: 'center', name: 'Center' },
        { id: 'left', name: 'Left' },
        { id: 'novel', name: 'Novel' },
        { id: 'vintage', name: 'Vintage' },
        { id: 'frame', name: 'Frame' },
        { id: 'stripe', name: 'Stripe' },
        { id: 'divider', name: 'Divider' },
        { id: 'journal', name: 'Journal' },
        { id: 'stamp', name: 'Stamp' },
        { id: 'outline', name: 'Outline' },
        { id: 'classic', name: 'Classic' },
        { id: 'none', name: 'None' },
    ];

    const typographyOptions = [
        { id: 'sans', name: 'Sans', desc: 'A neutral font', sample: 'SANS' },
        { id: 'serif', name: 'Serif', desc: 'A classic font', sample: 'Serif' },
        { id: 'modern', name: 'Modern', desc: 'A sophisticated font', sample: 'Modern' },
        { id: 'timeless', name: 'Timeless', desc: 'A light and airy font', sample: 'Timeless' },
        { id: 'bold', name: 'Bold', desc: 'A punchy font', sample: 'BOLD' },
        { id: 'subtle', name: 'Subtle', desc: 'A minimal font', sample: 'SUBTLE' },
    ];

    const colorPalettes = [
        { id: 'light', name: 'Light', colors: ['#ffffff', '#f7f9fa', '#111111'] },
        { id: 'gold', name: 'Gold', colors: ['#ffffff', '#faf7f2', '#a68c5b'] },
        { id: 'rose', name: 'Rose', colors: ['#ffffff', '#faf4f4', '#a67d7d'] },
        { id: 'terracotta', name: 'Terracotta', colors: ['#ffffff', '#faf5f2', '#a66d5b'] },
        { id: 'sand', name: 'Sand', colors: ['#ffffff', '#f7f5f2', '#967b6b'] },
        { id: 'olive', name: 'Olive', colors: ['#ffffff', '#f5f7f2', '#8c966b'] },
        { id: 'agave', name: 'Agave', colors: ['#ffffff', '#f2f7f6', '#6b968c'] },
        { id: 'sea', name: 'Sea', colors: ['#ffffff', '#f2f4f7', '#6b7a96'] },
        { id: 'dark', name: 'Dark', colors: ['#111111', '#1a1a1a', '#444444'] },
    ];
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

    const deleteSelectedPhotos = async () => {
        if (selectedPhotos.length === 0 || !collectionId) return;

        const confirmed = window.confirm(`Are you sure you want to delete ${selectedPhotos.length} photo(s)?`);
        if (!confirmed) return;

        try {
            setSaving(true);
            await galleryService.deletePhotos(selectedPhotos);
            
            // Update local state
            setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)));
            setSelectedPhotos([]);
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
                if (data.password) setCollectionPassword(data.password);
                
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

                // Fetch photos and sets
                const photoData = data.photos || [];
                setPhotos(photoData);
                const setsData = data.sets || [];
                setSets(setsData);
            } catch (err) {
                console.error('Error fetching collection:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCollectionData();
    }, [collectionId, navigate]);

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

        const sorted = [...filtered];
        switch (sortOption) {
            case 'upload-new-old':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'upload-old-new':
                sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'taken-new-old':
                sorted.sort((a, b) => {
                    const aDate = a.exif_taken_at ? new Date(a.exif_taken_at) : new Date(a.created_at);
                    const bDate = b.exif_taken_at ? new Date(b.exif_taken_at) : new Date(b.created_at);
                    return bDate - aDate;
                });
                break;
            case 'taken-old-new':
                sorted.sort((a, b) => {
                    const aDate = a.exif_taken_at ? new Date(a.exif_taken_at) : new Date(a.created_at);
                    const bDate = b.exif_taken_at ? new Date(b.exif_taken_at) : new Date(b.created_at);
                    return aDate - bDate;
                });
                break;
            case 'name-az':
                sorted.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
                break;
            case 'name-za':
                sorted.sort((a, b) => (b.filename || '').localeCompare(a.filename || ''));
                break;
            case 'random':
                for (let i = sorted.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
                }
                break;
            default:
                break;
        }
        return sorted;
    }, [photos, activeSetId, sortOption]);

    // Get the active set object
    const activeSet = activeSetId ? sets.find(s => s.id === activeSetId) : null;
    const activeSetName = activeSet ? activeSet.name : 'Highlights';
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

    const handleDeleteSet = async (setId) => {
        const setToDelete = sets.find(s => s.id === setId);
        const confirmed = window.confirm(`Are you sure you want to delete the set "${setToDelete?.name}"? Photos will be moved to Highlights.`);
        if (!confirmed) return;
        try {
            setSaving(true);
            await galleryService.deleteSet(setId);
            // Unassign photos locally
            setPhotos(prev => prev.map(p => p.set_id === setId ? { ...p, set_id: null } : p));
            setSets(prev => prev.filter(s => s.id !== setId));
            if (activeSetId === setId) setActiveSetId(null);
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
                    cover_style: selectedCoverStyle === 'novel' ? 'photo' : (selectedCoverStyle === 'none' ? 'text_only' : 'photo'), // Map internal UI styles to enums
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
                    password: collectionPassword
                });
            } catch (err) {
                console.error('Error auto-saving general settings:', err);
            }
        };

        const timeoutId = setTimeout(saveGeneralSettings, 1500); // Slightly longer debounce for URL
        return () => clearTimeout(timeoutId);
    }, [collectionUrl, collectionPassword, collectionId, collection, loading]);

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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
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
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        try {
            setSaving(true);
            const uploadedPhotos = await galleryService.uploadPhotos(
                collectionId, 
                collection.photographer_id, 
                files
            );
            setPhotos(prev => [...prev, ...uploadedPhotos]);
            setShowUploadModal(false);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload photos. Please try again.');
        } finally {
            setSaving(false);
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
            <div className="flex h-screen items-center justify-center bg-[#fdfcfb]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#593116] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#593116] font-medium tracking-widest uppercase text-sm">Loading Collection...</p>
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
                        <button className="cd-text-btn" onClick={() => setShowMoreDropdown(!showMoreDropdown)}>
                            More <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {showMoreDropdown && (
                            <div className="cd-more-dropdown">
                                <div className="cd-ctx-item" onClick={() => setShowMoreDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Get direct link</span>
                                </div>
                                <div className="cd-ctx-item" onClick={() => setShowMoreDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>View email history</span>
                                </div>
                                <div className="cd-ctx-item" onClick={() => setShowMoreDropdown(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>Download</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="cd-text-btn">Preview</button>
                    <div className="cd-share-wrapper" ref={shareRef}>
                        <div className="cd-share-split-btn">
                            <button className="cd-share-main" onClick={() => navigate('/shared-collection')}>Share</button>
                            <button className="cd-share-arrow" onClick={() => setShowShareDropdown(!showShareDropdown)}>
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
                            {photos.length > 0 ? (
                                <img src={photos[0].full_url} alt="Cover" />
                            ) : (
                                <img src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&auto=format&fit=crop&q=60" alt="Cover" />
                            )}
                            <div className="cd-cover-hover-overlay" onClick={() => { setActiveSidebarTab('design'); setActiveDesignTab('cover'); }}>
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
                                title="Share Activity"
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
                                    <span className="cd-set-name">Highlights ({photos.filter(p => !p.set_id).length})</span>
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
                                <div
                                    className={`cd-design-nav-item ${activeSettingsTab === 'store' ? 'active' : ''}`}
                                    onClick={() => setActiveSettingsTab('store')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    <span>Store</span>
                                    <span className="tab-badge off">OFF</span>
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    <span>Store Orders</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'email' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('email')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>Email Registration</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'share' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('share')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    <span>Quick Share Links</span>
                                </div>
                                <div
                                    className={`cd-design-nav-item ${activeActivitySubTab === 'private' ? 'active' : ''}`}
                                    onClick={() => setActiveActivitySubTab('private')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    <span>Private Photos</span>
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
                                    <h2 className="cd-main-title">{activeSetName}</h2>
                                    <div className="cd-main-actions">
                                        <div className="cd-sort-wrapper" ref={sortRef}>
                                            <button className="cd-icon-btn sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
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
                                            <button className="cd-icon-btn active grid-btn" onClick={() => setShowGridSettings(!showGridSettings)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                            </button>
                                            {showGridSettings && (
                                                <div className="cd-grid-dropdown">
                                                    <div className="cd-grid-section-label">Grid Size</div>
                                                    <div className={`cd-grid-option ${gridSize === 'small' ? 'selected' : ''}`} onClick={() => setGridSize('small')}>
                                                        <span>Small</span>
                                                        {gridSize === 'small' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className={`cd-grid-option ${gridSize === 'large' ? 'selected' : ''}`} onClick={() => setGridSize('large')}>
                                                        <span>Large</span>
                                                        {gridSize === 'large' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className="cd-grid-divider"></div>
                                                    <div className="cd-grid-section-label">Show</div>
                                                    <div className="cd-grid-toggle-row">
                                                        <span>Filename</span>
                                                        <label className="cd-toggle">
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
                                    <div className={`cd-photo-grid ${gridSize === 'large' ? 'grid-large' : ''}`}>
                                        {sortedPhotos.map((photo, index) => (
                                            <div
                                                className={`cd-photo-card ${selectedPhotos.includes(photo.id) ? 'selected' : ''}`}
                                                key={photo.id || index}
                                                onClick={() => togglePhotoSelection(photo.id)}
                                            >
                                                <div className="cd-photo-card-inner">
                                                    <img src={photo.full_url} alt={photo.filename || `Photo ${index + 1}`} />
                                                </div>
                                                {showFilename && <div className="cd-photo-filename">{photo.filename || `photo-${index + 1}.jpg`}</div>}
                                                <button className="cd-photo-menu" onClick={(e) => { e.stopPropagation(); setActivePhotoMenu(activePhotoMenu === photo.id ? null : photo.id); }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                </button>
                                                <button 
                                                    className={`cd-photo-star ${photo.is_starred ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); handleToggleStar(photo.id, photo.is_starred); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={photo.is_starred ? "#FFC107" : "none"} stroke={photo.is_starred ? "#FFC107" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                </button>
                                                {activePhotoMenu === photo.id && (
                                                    <div className="cd-photo-context-menu" ref={photoMenuRef}>
                                                        <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setActivePhotoMenu(null); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                                            <span>Make cover</span>
                                                        </div>
                                                        <div className="cd-ctx-item cd-ctx-delete" onClick={(e) => { e.stopPropagation(); setActivePhotoMenu(null); deleteSelectedPhotos([photo.id]); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            <span>Delete</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="cd-dropzone" onClick={handleDropzoneClick}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept="image/*"
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

                        {activeSidebarTab === 'design' && (
                            <div className="cd-design-split-view">
                                <div className="cd-design-settings-pane">
                                    <div className="cd-design-settings-header">
                                        <h2 className="cd-design-title">{activeDesignTab.charAt(0).toUpperCase() + activeDesignTab.slice(1)}</h2>
                                        {activeDesignTab === 'cover' && (
                                            <div className="cd-design-tabs">
                                                <button className="cd-design-tab-btn active" onClick={() => setShowCoverModal(true)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                                    Cover Photo
                                                </button>
                                                <button className="cd-design-tab-btn" onClick={() => setShowFocalModal(true)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                                                    Focal
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="cd-design-settings-content">
                                    {activeDesignTab === 'cover' && (
                                        <div className="cd-cover-grid">
                                            {coverStyles.map(style => (
                                                <div
                                                    key={style.id}
                                                    className={`cd-cover-card ${selectedCoverStyle === style.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedCoverStyle(style.id)}
                                                >
                                                    <div className="cd-cover-card-preview">
                                                        <div className={`preview-placeholder style-${style.id}`}>
                                                            {style.id === 'none' ? (
                                                                <div className="none-preview">/</div>
                                                            ) : (
                                                                <div className="preview-image-mock">
                                                                    <div className="preview-title-mock">TITLE</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="cd-cover-card-name">{style.name}</span>
                                                </div>
                                            ))}
                                            <div className="cd-cover-card cd-cover-more">
                                                <div className="cd-cover-card-preview">
                                                    <div className="preview-placeholder more">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                                    </div>
                                                </div>
                                                <span className="cd-cover-card-name">More</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeDesignTab === 'typography' && (
                                        <div className="cd-typography-grid">
                                            {typographyOptions.map(option => (
                                                <div
                                                    key={option.id}
                                                    className={`cd-typography-card ${selectedFont === option.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedFont(option.id)}
                                                >
                                                    <div className={`cd-typography-preview-box font-preview-${option.id}`}>
                                                        <div className="sample-text">{option.sample}</div>
                                                        <div className="desc-text">{option.desc}</div>
                                                    </div>
                                                    <span className="cd-typography-name">{option.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeDesignTab === 'color' && (
                                        <div className="cd-color-grid">
                                            {colorPalettes.map(palette => (
                                                <div
                                                    key={palette.id}
                                                    className={`cd-color-card ${selectedColorPalette === palette.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedColorPalette(palette.id)}
                                                >
                                                    <div className="cd-color-preview-box">
                                                        {palette.colors.map((color, i) => (
                                                            <div key={i} className="color-swatch" style={{ backgroundColor: color }}></div>
                                                        ))}
                                                    </div>
                                                    <span className="cd-color-name">{palette.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeDesignTab === 'grid' && (
                                        <div className="cd-grid-settings-pane-content">
                                            <div className="grid-setting-section">
                                                <label className="grid-section-label">Grid Style</label>
                                                <div className="grid-option-cards">
                                                    <div
                                                        className={`grid-option-card ${gridSettings.style === 'vertical' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, style: 'vertical' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="4" y="4" width="7" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="4" width="7" height="16"></rect></svg>
                                                        </div>
                                                        <span>Vertical</span>
                                                    </div>
                                                    <div
                                                        className={`grid-option-card ${gridSettings.style === 'horizontal' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, style: 'horizontal' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="4" y="4" width="16" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="13" width="7" height="7"></rect></svg>
                                                        </div>
                                                        <span>Horizontal</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid-setting-section">
                                                <label className="grid-section-label">Thumbnail Size</label>
                                                <div className="grid-option-cards">
                                                    <div
                                                        className={`grid-option-card ${gridSettings.size === 'regular' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, size: 'regular' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="6" width="5" height="5"></rect><rect x="13" y="6" width="5" height="5"></rect><rect x="6" y="13" width="5" height="5"></rect><rect x="13" y="13" width="5" height="5"></rect></svg>
                                                        </div>
                                                        <span>Regular</span>
                                                    </div>
                                                    <div
                                                        className={`grid-option-card ${gridSettings.size === 'large' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, size: 'large' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="4" y="4" width="16" height="16"></rect></svg>
                                                        </div>
                                                        <span>Large</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid-setting-section">
                                                <label className="grid-section-label">Grid Spacing</label>
                                                <div className="grid-option-cards">
                                                    <div
                                                        className={`grid-option-card ${gridSettings.spacing === 'regular' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, spacing: 'regular' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="6" width="5" height="5"></rect><rect x="13" y="6" width="5" height="5"></rect><rect x="6" y="13" width="5" height="5"></rect><rect x="13" y="13" width="5" height="5"></rect></svg>
                                                        </div>
                                                        <span>Regular</span>
                                                    </div>
                                                    <div
                                                        className={`grid-option-card ${gridSettings.spacing === 'large' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, spacing: 'large' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="0" y="0" width="10" height="10"></rect><rect x="14" y="0" width="10" height="10"></rect><rect x="0" y="14" width="10" height="10"></rect><rect x="14" y="14" width="10" height="10"></rect></svg>
                                                        </div>
                                                        <span>Large</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid-setting-section">
                                                <label className="grid-section-label">Navigation Style</label>
                                                <div className="grid-option-cards">
                                                    <div
                                                        className={`grid-option-card ${gridSettings.navigation === 'icon' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, navigation: 'icon' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                                                        </div>
                                                        <span>Icon Only</span>
                                                    </div>
                                                    <div
                                                        className={`grid-option-card ${gridSettings.navigation === 'text' ? 'active' : ''}`}
                                                        onClick={() => setGridSettings({ ...gridSettings, navigation: 'text' })}
                                                    >
                                                        <div className="grid-icon">
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>A</span>
                                                        </div>
                                                        <span>Icon & Text</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                                <div className={`cd-design-preview-pane ${previewMode}`}>
                                    <div className="cd-preview-workspace">
                                        <div className="cd-preview-canvas">
                                            <div className={`cd-preview-gallery-card style-${selectedCoverStyle} font-${selectedFont} theme-${selectedColorPalette}`}>
                                                <div className="cd-preview-gallery-header">
                                                    {/* 3. NOVEL */}
                                                    {selectedCoverStyle === 'novel' && (
                                                        <div className="header-novel-layout">
                                                            <div className="header-left">
                                                                <div className="header-title-box">
                                                                    <div className="h-super">DFCGVHBJNK</div>
                                                                    <div className="h-title">b</div>
                                                                    <div className="h-date">MARCH 12TH, 2026</div>
                                                                    <button className="view-gallery-btn">VIEW GALLERY</button>
                                                                </div>
                                                            </div>
                                                            <div className="header-right">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 1. CENTER */}
                                                    {selectedCoverStyle === 'center' && (
                                                        <div className="header-center-layout">
                                                            <div className="header-bg-img">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="header-overlay">
                                                                <div className="h-super">DFCGVHBJNK</div>
                                                                <div className="h-title">b</div>
                                                                <div className="h-date">MARCH 12TH, 2026</div>
                                                                <button className="view-gallery-btn">VIEW GALLERY</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 2. LEFT */}
                                                    {selectedCoverStyle === 'left' && (
                                                        <div className="header-left-layout">
                                                            <div className="header-bg-img">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="header-content">
                                                                <div className="h-super">DFCGVHBJNK</div>
                                                                <div className="h-title">b</div>
                                                                <div className="h-date">MARCH 12TH, 2026</div>
                                                                <button className="view-gallery-btn">VIEW GALLERY</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 4. VINTAGE */}
                                                    {selectedCoverStyle === 'vintage' && (
                                                        <div className="header-vintage-layout">
                                                            <div className="header-left">
                                                                <div className="vintage-img-box">
                                                                    {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                                </div>
                                                            </div>
                                                            <div className="header-right">
                                                                <div className="header-title-box">
                                                                    <div className="h-super">DFCGVHBJNK</div>
                                                                    <div className="h-title">b</div>
                                                                    <div className="h-date">MARCH 12TH, 2026</div>
                                                                    <button className="view-gallery-btn">VIEW GALLERY</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 5. FRAME */}
                                                    {selectedCoverStyle === 'frame' && (
                                                        <div className="header-frame-layout">
                                                            <div className="header-frame-inner">
                                                                <div className="header-bg-img">
                                                                    {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                                </div>
                                                                <div className="header-overlay">
                                                                    <div className="h-super">DFCGVHBJNK</div>
                                                                    <div className="h-title">b</div>
                                                                    <div className="h-date">MARCH 12TH, 2026</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 6. STRIPE */}
                                                    {selectedCoverStyle === 'stripe' && (
                                                        <div className="header-stripe-layout">
                                                            <div className="header-bg-img">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="header-overlay">
                                                                <div className="stripe-line"></div>
                                                                <div className="h-title">b</div>
                                                                <div className="stripe-line"></div>
                                                                <div className="h-date">MARCH 12TH, 2026</div>
                                                                <button className="view-gallery-btn">VIEW GALLERY</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 7. DIVIDER */}
                                                    {selectedCoverStyle === 'divider' && (
                                                        <div className="header-divider-layout">
                                                            <div className="divider-left">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="divider-right">
                                                                <div className="header-title-box">
                                                                    <div className="h-super">DFCGVHBJNK</div>
                                                                    <div className="h-title">b</div>
                                                                    <div className="h-date">MARCH 12TH, 2026</div>
                                                                    <button className="view-gallery-btn">VIEW GALLERY</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 8. JOURNAL */}
                                                    {selectedCoverStyle === 'journal' && (
                                                        <div className="header-journal-layout">
                                                            <div className="journal-left">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="journal-right">
                                                                <div className="header-title-box">
                                                                    <div className="h-super">DFCGVHBJNK</div>
                                                                    <div className="h-title">b</div>
                                                                    <div className="h-date">MARCH 12TH, 2026</div>
                                                                    <button className="view-gallery-btn">VIEW GALLERY</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 9. STAMP */}
                                                    {selectedCoverStyle === 'stamp' && (
                                                        <div className="header-stamp-layout">
                                                            <div className="stamp-img">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="h-super">DFCGVHBJNK</div>
                                                            <div className="h-title">b</div>
                                                            <div className="h-date">MARCH 12TH, 2026</div>
                                                            <button className="view-gallery-btn">VIEW GALLERY</button>
                                                        </div>
                                                    )}

                                                    {/* 10. OUTLINE */}
                                                    {selectedCoverStyle === 'outline' && (
                                                        <div className="header-outline-layout">
                                                            <div className="outline-box">
                                                                <div className="h-super">DFCGVHBJNK</div>
                                                                <div className="h-title">b</div>
                                                                <div className="h-date">MARCH 12TH, 2026</div>
                                                                <button className="view-gallery-btn">VIEW GALLERY</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 11. CLASSIC */}
                                                    {selectedCoverStyle === 'classic' && (
                                                        <div className="header-classic-layout">
                                                            <div className="header-bg-img">
                                                                {photos.length > 0 && <img src={photos[0].full_url} alt="Preview" />}
                                                            </div>
                                                            <div className="classic-overlay">
                                                                <div className="h-title">b</div>
                                                                <div className="h-date">MARCH 12TH, 2026</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`cd-preview-gallery-body grid-style-${gridSettings.style} grid-size-${gridSettings.size} grid-spacing-${gridSettings.spacing} nav-style-${gridSettings.navigation}`}>
                                                    <div className="gallery-meta">
                                                        <div className="meta-left">B</div>
                                                        <div className="meta-right">
                                                            <div className="meta-icon-item">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                                                {gridSettings.navigation === 'text' && <span>Favorite</span>}
                                                            </div>
                                                            <div className="meta-icon-item">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                                                {gridSettings.navigation === 'text' && <span>Download</span>}
                                                            </div>
                                                            <div className="meta-icon-item">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                                                {gridSettings.navigation === 'text' && <span>Share</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="gallery-mock-grid">
                                                        {[...Array(12)].map((_, i) => (
                                                            <div key={i} className={`mock-grid-item item-${i}`}>
                                                                {photos[i % photos.length] && <img src={photos[i % photos.length].full_url} alt="Grid Mock" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cd-preview-toolbar">
                                            <button
                                                className={`cd-preview-tool-btn ${previewMode === 'desktop' ? 'active' : ''}`}
                                                onClick={() => setPreviewMode('desktop')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                            </button>
                                            <button
                                                className={`cd-preview-tool-btn ${previewMode === 'mobile' ? 'active' : ''}`}
                                                onClick={() => setPreviewMode('mobile')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSidebarTab === 'settings' && activeSettingsTab === 'general' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header">
                                    <h2 className="cd-settings-main-title">General Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
                                </div>

                                <div className="cd-settings-form">
                                    <div className="settings-section">
                                        <label className="settings-label">Collection Contact</label>
                                        <p className="settings-desc">Link this collection to one or more contacts and view in Studio Manager. <span className="settings-link">Learn more</span></p>
                                        <button className="cd-add-contact-btn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                            Add Contact
                                        </button>
                                    </div>

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
                                        <div className="settings-input-wrapper with-icon">
                                            <input type="text" className="settings-input" placeholder="Optional" value={autoExpiry} onChange={(e) => setAutoExpiry(e.target.value)} />
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                        <p className="settings-desc">Automatically set your collection to hidden on a specific date (at 11:59pm <span className="highlight-text">GMT+5:30</span>)</p>
                                        <button className="settings-action-btn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                            Add expiry reminder email
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
                                                    <input type="checkbox" checked={socialSharing} onChange={() => setSocialSharing(!socialSharing)} />
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
                                    <h2 className="cd-settings-main-title">Download Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
                                    <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Download Activity</span>
                                </div>

                                <div className="settings-tab-nav">
                                    <span className={`settings-tab-item ${activeDownloadTab === 'general' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('general')}>General Settings</span>
                                    <span className={`settings-tab-item ${activeDownloadTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('advanced')}>Advanced Settings</span>
                                </div>

                                <div className="cd-settings-form">
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
                                        <button className="settings-action-btn secondary">Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                                    </div>

                                    <div className="settings-section">
                                        <label className="settings-label">Photo Download Sizes</label>
                                        <div className="checkbox-group">
                                            <div className="checkbox-row">
                                                <label className="custom-checkbox">
                                                    <input type="checkbox" checked={photoDownloadSizes.includes('high')} onChange={() => { }} />
                                                    <span className="checkmark"></span>
                                                    High Resolution
                                                </label>
                                                <div className="radio-group-horizontal">
                                                    <label className="custom-radio">
                                                        <input type="radio" name="high-res" disabled />
                                                        <span className="radio-mark"></span>
                                                        Original - Upgrade required. <span className="settings-link">Upgrade</span>
                                                    </label>
                                                    <label className="custom-radio">
                                                        <input type="radio" name="high-res" checked />
                                                        <span className="radio-mark"></span>
                                                        3600px
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="checkbox-row mt-12">
                                                <label className="custom-checkbox">
                                                    <input type="checkbox" checked={photoDownloadSizes.includes('web')} onChange={() => { }} />
                                                    <span className="checkmark"></span>
                                                    Web Size
                                                </label>
                                                <div className="radio-group-horizontal">
                                                    <label className="custom-radio">
                                                        <input type="radio" name="web-res" />
                                                        <span className="radio-mark"></span>
                                                        2048px
                                                    </label>
                                                    <label className="custom-radio">
                                                        <input type="radio" name="web-res" checked />
                                                        <span className="radio-mark"></span>
                                                        1024px
                                                    </label>
                                                    <label className="custom-radio">
                                                        <input type="radio" name="web-res" />
                                                        <span className="radio-mark"></span>
                                                        640px
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="settings-desc">Allow photos to be downloaded in select sizes. <span className="settings-link">Learn more</span></p>
                                    </div>

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
                                        <div className="settings-input-wrapper with-action mt-12">
                                            <input type="text" className="settings-input" value={pinValue} onChange={(e) => setPinValue(e.target.value)} />
                                            <button className="input-action-btn no-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                                Reset PIN
                                            </button>
                                        </div>
                                        <p className="settings-desc">Require visitors to enter a 4-digit PIN to download photos and videos.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'favorite' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">Favorite Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
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
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#593116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                        </div>
                                        <div className="info-box-content">
                                            <h4 className="info-box-title">Preset Favorite Lists</h4>
                                            <p className="info-box-text">Create Favorite lists and set selection limits for your clients to make selections for albums, free downloads, retouching and more.</p>
                                            <span className="settings-link">Create Favorite List</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'settings' && activeSettingsTab === 'store' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">Store Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
                                    <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Store Activity</span>
                                </div>

                                <div className="cd-settings-form">
                                    <div className="settings-info-box">
                                        <div className="info-box-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#593116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        </div>
                                        <div className="info-box-content">
                                            <h4 className="info-box-title">Activate Store</h4>
                                            <p className="info-box-text">Setup Pixieset Store to start selling prints, digital downloads, and more directly from your collections.</p>
                                            <span className="settings-link">Get Started</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSidebarTab === 'activity' && (
                            <div className="cd-general-settings-view">
                                <div className="cd-settings-content-header split">
                                    <h2 className="cd-settings-main-title">
                                        {activeActivitySubTab === 'download' && 'Download Activity'}
                                        {activeActivitySubTab === 'favorite' && 'Favorite Activity'}
                                        {activeActivitySubTab === 'store' && 'Store Activity'}
                                        {activeActivitySubTab === 'email' && 'Email Registration'}
                                        {activeActivitySubTab === 'share' && 'Quick Share Links'}
                                        {activeActivitySubTab === 'private' && 'Private Photo Activity'}
                                        {(activeActivitySubTab === 'download' || activeActivitySubTab === 'store' || activeActivitySubTab === 'favorite') && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        )}
                                    </h2>
                                    {activeActivitySubTab === 'download' && <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Download Activity</span>}
                                    {activeActivitySubTab === 'favorite' && <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Favorite Activity</span>}
                                    {activeActivitySubTab === 'store' && <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Store Activity</span>}
                                </div>

                                {activeActivitySubTab === 'download' && (
                                    <div className="settings-tab-nav">
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('gallery')}>Gallery</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'photo' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('photo')}>Single Photo</span>
                                        <span className={`settings-tab-item ${activeDownloadActivityTab === 'video' ? 'active' : ''}`} onClick={() => setActiveDownloadActivityTab('video')}>Single Video</span>
                                    </div>
                                )}

                                <div className="cd-empty-state-section">
                                    <div className="cd-empty-state-content">
                                        <div className="cd-empty-state-illustration">
                                            {/* Unified Illustration Container */}
                                            {activeActivitySubTab === 'download' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M40 140H200L180 60H60L40 140Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <rect x="80" y="40" width="80" height="60" rx="4" fill="white" stroke="#666" strokeWidth="1.5" />
                                                    <path d="M120 70V110M120 110L110 100M120 110L130 100" stroke="#593116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                            {activeActivitySubTab === 'favorite' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="120" cy="90" r="50" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <path d="M120 75C120 75 115 65 100 65C85 65 80 80 80 90C80 115 120 140 120 140C120 140 160 115 160 90C160 80 155 65 140 65C125 65 120 75 120 75Z" fill="white" stroke="#593116" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {activeActivitySubTab === 'store' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <rect x="60" y="50" width="120" height="90" rx="8" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <circle cx="120" cy="95" r="25" fill="white" stroke="#666" strokeWidth="1.5" />
                                                    <path d="M110 95H130M120 85V105" stroke="#593116" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {activeActivitySubTab === 'email' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <rect x="50" y="60" width="140" height="80" rx="4" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <path d="M50 60L120 100L190 60" stroke="#666" strokeWidth="1.5" />
                                                    <circle cx="120" cy="110" r="15" fill="white" stroke="#593116" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {activeActivitySubTab === 'share' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M70 110L170 110" stroke="#666" strokeWidth="1.5" strokeDasharray="4 4" />
                                                    <circle cx="70" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <circle cx="170" cy="110" r="20" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <path d="M120 90V130" stroke="#593116" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {activeActivitySubTab === 'private' && (
                                                <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M120 60C150 60 180 80 180 110C180 140 150 160 120 160C90 160 60 140 60 110C60 80 90 60 120 60Z" fill="#F8FAFB" stroke="#666" strokeWidth="1.5" />
                                                    <circle cx="120" cy="110" r="20" fill="white" stroke="#593116" strokeWidth="2" />
                                                </svg>
                                            )}
                                        </div>
                                        <h3 className="cd-empty-state-title">
                                            {activeActivitySubTab === 'download' && 'No gallery downloads yet'}
                                            {activeActivitySubTab === 'favorite' && 'No favorites activity yet'}
                                            {activeActivitySubTab === 'store' && 'No store order activity yet'}
                                            {activeActivitySubTab === 'email' && 'No email registration activity yet'}
                                            {activeActivitySubTab === 'share' && 'No quick share links yet'}
                                            {activeActivitySubTab === 'private' && 'No private photo activity yet'}
                                        </h3>
                                        <p className="cd-empty-state-text">
                                            {activeActivitySubTab === 'download' && 'Gallery download activity details will show here when visitors download all photos from their collection.'}
                                            {activeActivitySubTab === 'favorite' && 'Activity details will show here when visitors favorite photos in their collection.'}
                                            {activeActivitySubTab === 'store' && 'Store order activity details will show here when visitors purchase products from the store.'}
                                            {activeActivitySubTab === 'email' && 'Email registration activity will show here when visitors register their email before viewing the collection.'}
                                            {activeActivitySubTab === 'share' && 'Quick Share links will show here when you create them from the photos tab.'}
                                            {activeActivitySubTab === 'private' && 'Private photo activity details will show here when clients mark photos as private.'}
                                        </p>
                                    </div>
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
                                    <span>{selectedPhotos.length} selected</span>
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
                                                accept="image/*"
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
                                            <svg className="cd-youtube-logo" viewBox="0 0 24 24" fill="#ff0000" width="30" height="30"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.083 0 12 0 12s0 3.917.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.917 24 12 24 12s0-3.917-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                            <svg className="cd-vimeo-logo" viewBox="0 0 24 24" fill="#1ab7ea" width="30" height="30"><path d="M22.396 7.164c-.093 2.026-1.507 4.8-4.245 8.32C15.32 19.161 12.93 21 11.002 21c-1.332 0-2.436-1.378-3.308-4.136-.582-2.613-1.096-5.59-1.636-7.85-1.026-4.634-1.921-1.652-3.876.104l-1.066-1.341c2.148-2.036 4.356-4.225 5.952-4.428 1.968-.25 3.12 1.343 3.454 4.777.424 4.295.666 4.975 1.505 4.975.766 0 1.956-2.08 2.87-4.482.724-1.916.638-3.32-.42-3.32-.61 0-1.272.186-1.908.498 1.258-4.116 3.98-5.807 7.025-4.832 2.164.693 2.887 2.859 2.796 4.881z"/></svg>
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
                            <div className="cd-modal-body">
                                <div className="focal-point-container">
                                    {photos.length > 0 ? (
                                        <div className="focal-image-wrapper">
                                            <img src={photos[0]} alt="Focal" />
                                            <div className="focal-crosshair">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#593116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="focal-empty">No cover photo set</div>
                                    )}
                                </div>
                                <p className="focal-instruction">Drag the crosshair to set the focal point for your cover photo and grid.</p>
                            </div>
                            <div className="cd-modal-footer">
                                <button className="cd-cancel-btn" onClick={() => setShowFocalModal(false)}>Cancel</button>
                                <button className="cd-save-btn" onClick={() => setShowFocalModal(false)}>Save</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Change Cover Modal */}
            {
                showCoverModal && (
                    <div className="cd-modal-overlay" onClick={() => setShowCoverModal(false)}>
                        <div className="cd-modal cover-selection-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="cd-modal-header">
                                <h3 className="cd-modal-title" style={{ textTransform: 'uppercase' }}>CHANGE COVER</h3>
                                <button className="cd-modal-close" onClick={() => setShowCoverModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="cd-modal-body no-padding">
                                <div className="cd-modal-dropzone">
                                    <div className="cd-modal-drop-content">
                                        <div className="cd-modal-drop-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        </div>
                                        <p className="cd-modal-drop-text">Drag photo here to upload or</p>
                                        <button className="cd-save-btn">Select from Collection</button>
                                        <p className="cd-modal-drop-browse">
                                            <span className="cd-browse-link">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> 
                                                Browse files
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
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
                                            <span style={{color: '#10b981'}}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            </span>
                                        )}
                                        {file.status === 'error' && (
                                            <span style={{color: '#ef4444'}}>
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
        </div>
    );
};

export default CollectionDashboard;
