import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { openSpaPath } from '../lib/spaNavigation';
import { openShareByEmail, openWhatsAppShare, getShareUrlForCollection } from '../lib/shareCollection';
import { getFolderStudioUrl } from '../lib/folderStudioUrl';
import { CollectionContextMenu } from '../components/features/ClientGallery/CollectionContextMenu';
import { EditCollectionModal } from '../components/features/ClientGallery/EditCollectionModal';
import {
  CollectionDirectLinkModal,
  CollectionQrModal,
  CollectionDuplicateModal,
  FolderDirectLinkModal,
  FolderQrModal,
} from '../components/features/ClientGallery/CollectionShareModals';
import { MoveCollectionModal } from '../components/features/Collections/MoveCollectionModal';
import {
  BulkCollectionStatusModal,
  BulkCollectionTagsModal,
} from '../components/features/ClientGallery/BulkCollectionModals';
import { BulkEditCollectionsModal } from '../components/features/ClientGallery/BulkEditCollectionsModal';
import { sortCollections } from '../utils/sortCollections';
import { formatStorageBytes } from '../utils/formatStorageBytes';
import './ClientGallery.css';
import './FolderView.css';

const FolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [folder, setFolder] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSort, setActiveSort] = useState('created-new');
  const [activeView, setActiveView] = useState('grid');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [contextMenuId, setContextMenuId] = useState(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState(null);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [editCollection, setEditCollection] = useState(null);
  const [directLinkCollection, setDirectLinkCollection] = useState(null);
  const [qrCollection, setQrCollection] = useState(null);
  const [duplicateCollection, setDuplicateCollection] = useState(null);
  const [moveToCollection, setMoveToCollection] = useState(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [folderLinkOpen, setFolderLinkOpen] = useState(false);
  const [folderQrOpen, setFolderQrOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const sortRef = useRef(null);
  const viewRef = useRef(null);
  const contextRef = useRef(null);
  const shareRef = useRef(null);
  const selectionMenuRef = useRef(null);

  const selectedCollections = useMemo(
    () => collections.filter((c) => selectedCards.includes(c.id)),
    [collections, selectedCards]
  );

  const load = useCallback(async () => {
    if (!user?.id || !folderId) return;
    setLoading(true);
    setError(null);
    try {
      const [f, cols] = await Promise.all([
        galleryService.getFolderById(folderId, user.id),
        galleryService.getCollectionsForFolder(user.id, folderId),
      ]);
      if (!f) {
        setError('Folder not found');
        setFolder(null);
        setCollections([]);
        return;
      }
      setFolder(f);
      setCollections(cols);
    } catch (err) {
      console.error(err);
      setError('Failed to load folder.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, folderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedCollections = useMemo(
    () => sortCollections(collections, activeSort),
    [collections, activeSort]
  );

  const getCoverSrc = (c) => c.cover_url || c.cover || '';

  const closeContextMenu = useCallback(() => {
    setContextMenuId(null);
    setContextMenuAnchor(null);
  }, []);

  const clearSelection = useCallback(() => setSelectedCards([]), []);

  const applyBulkUpdate = async (payload, { closeStatus, closeTags, closeEdit } = {}) => {
    if (!selectedCards.length || !Object.keys(payload).length) return;
    setBulkApplying(true);
    try {
      await Promise.all(selectedCards.map((id) => galleryService.updateCollection(id, payload)));
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
      await Promise.all(selectedCards.map((id) => galleryService.updateCollection(id, { is_starred: next })));
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

  const handleBulkMoveComplete = async (targetFolderId) => {
    const movedIds = [...selectedCards];
    setBulkMoveOpen(false);
    clearSelection();
    if (targetFolderId !== folderId) {
      setCollections((prev) => prev.filter((c) => !movedIds.includes(c.id)));
    } else {
      void load();
    }
  };

  const selectAllCollections = () => {
    setSelectedCards(sortedCollections.map((c) => c.id));
    setShowSelectionMenu(false);
  };

  const toggleSelectCard = (e, collectionId) => {
    e.stopPropagation();
    closeContextMenu();
    setSelectedCards((prev) =>
      prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId]
    );
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

  const handlePreviewCollection = useCallback(
    (collection) => {
      closeContextMenu();
      if (collection?.slug) openSpaPath(`/gallery/${collection.slug}`);
    },
    [closeContextMenu]
  );

  const handleCardClick = (collection) => {
    if (selectedCards.length > 0) return;
    navigate(`/collections/manage?id=${collection.id}`);
  };

  const navigateNewInFolder = () => {
    navigate(`/collections/create?folderId=${folderId}`);
  };

  useEffect(() => {
    const onDown = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
      if (viewRef.current && !viewRef.current.contains(e.target)) setShowViewDropdown(false);
      if (shareRef.current && !shareRef.current.contains(e.target)) setShowShareMenu(false);
      const inMenuPortal = e.target.closest?.(
        '.cg-ctx-submenu--portal, .cg-ctx-submenu-bridge, .cgm-overlay, .cg-ctx-menu--portal'
      );
      if (contextRef.current && !contextRef.current.contains(e.target) && !inMenuPortal) {
        closeContextMenu();
      }
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) {
        setShowSelectionMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [closeContextMenu]);

  const openContextMenu = (e, id) => {
    e.stopPropagation();
    if (contextMenuId === id) {
      closeContextMenu();
      return;
    }
    setContextMenuAnchor(e.currentTarget);
    setContextMenuId(id);
  };

  const renderContextMenu = (collection, variant = 'grid') => {
    if (contextMenuId !== collection.id) return null;
    return (
      <CollectionContextMenu
        menuRef={contextRef}
        anchorEl={contextMenuAnchor}
        variant={variant}
        onPreview={() => handlePreviewCollection(collection)}
        onQuickEdit={() => {
          closeContextMenu();
          setEditCollection(collection);
        }}
        onMoveTo={() => {
          closeContextMenu();
          setMoveToCollection(collection);
        }}
        onDuplicate={() => {
          closeContextMenu();
          setDuplicateCollection(collection);
        }}
        onDelete={() => {
          closeContextMenu();
          void handleDeleteCollection(collection.id);
        }}
        onShareByEmail={() => {
          const url = getShareUrlForCollection(collection);
          closeContextMenu();
          openShareByEmail(url, collection.name || 'Photo Gallery');
        }}
        onGetDirectLink={() => {
          setDirectLinkCollection(collection);
          closeContextMenu();
        }}
        onGetQrCode={() => {
          setQrCollection(collection);
          closeContextMenu();
        }}
        onShareWhatsApp={() => {
          const url = getShareUrlForCollection(collection);
          closeContextMenu();
          openWhatsAppShare(url, collection.name || 'Gallery');
        }}
      />
    );
  };

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
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('Delete this collection? All photos will be removed.')) return;
    try {
      await galleryService.deleteCollection(collectionId);
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete collection.');
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
      console.error(err);
      alert(err?.message || 'Failed to duplicate collection. Please try again.');
    } finally {
      setDuplicateBusy(false);
    }
  };

  const folderDateLabel = folder?.event_date
    ? new Date(folder.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : folder?.created_at
      ? new Date(folder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

  if (!user) return null;

  return (
    <SidebarLayout>
      <main className="cg-style-2 fv-main">
        <div className="fv-topbar">
          <button type="button" className="fv-back" onClick={() => navigate('/client-gallery')} aria-label="Back to collections">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="fv-title-block">
            <div className="fv-title-row">
              <span className="fv-folder-icon" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <h1 className="fv-folder-name">{folder?.name || 'Folder'}</h1>
                {folderDateLabel && <p className="fv-folder-date">{folderDateLabel}</p>}
              </div>
            </div>
          </div>
          <div className="fv-actions">
            <div className="fv-share-wrap" ref={shareRef}>
              <button type="button" className="fv-btn-secondary" onClick={() => setShowShareMenu((v) => !v)}>
                Share
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showShareMenu && (
                <div className="fv-dropdown">
                  <button
                    type="button"
                    className="fv-dropdown-item"
                    onClick={() => {
                      setShowShareMenu(false);
                      openShareByEmail(getFolderStudioUrl(folderId), folder?.name || 'Folder');
                    }}
                  >
                    Share by email
                  </button>
                  <button
                    type="button"
                    className="fv-dropdown-item"
                    onClick={() => {
                      setShowShareMenu(false);
                      setFolderLinkOpen(true);
                    }}
                  >
                    Get direct link
                  </button>
                  <button
                    type="button"
                    className="fv-dropdown-item"
                    onClick={() => {
                      setShowShareMenu(false);
                      setFolderQrOpen(true);
                    }}
                  >
                    Get QR code
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="cg-style-11 fv-btn-primary fv-new-collection-solo"
              onClick={navigateNewInFolder}
            >
              New Collection
            </button>
          </div>
        </div>

        <div className="fv-toolbar">
          <div className="relative inline-flex" ref={sortRef}>
            <button type="button" className="cg-view-icon-btn" onClick={() => { setShowSortDropdown(!showSortDropdown); setShowViewDropdown(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="18" x2="12" y2="18" />
                <line x1="3" y1="6" x2="3" y2="18" />
                <polyline points="1 15 3 18 5 15" />
              </svg>
            </button>
            {showSortDropdown && (
              <div className="cg-style-33">
                <div className="cg-style-34">Sort by</div>
                {['created-new', 'created-old', 'event-new', 'event-old', 'name-az', 'name-za'].map((key) => (
                  <div
                    key={key}
                    className={`cg-style-71 ${activeSort === key ? 'cg-sort-active' : 'text-[#333]'}`}
                    onClick={() => {
                      setActiveSort(key);
                      setShowSortDropdown(false);
                    }}
                  >
                    {key.replace(/-/g, ' ')}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative inline-flex" ref={viewRef}>
            <button type="button" className={`cg-style-72 ${activeView === 'grid' ? 'text-[#444]' : 'text-[#b0b0b0]'}`} onClick={() => { setShowViewDropdown(!showViewDropdown); setShowSortDropdown(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            {showViewDropdown && (
              <div className="cg-style-35">
                <div className={`cg-style-71 ${activeView === 'grid' ? 'text-[#44aaa7]' : 'text-[#333]'}`} onClick={() => { setActiveView('grid'); setShowViewDropdown(false); }}>
                  Grid View
                </div>
                <div className={`cg-style-71 ${activeView === 'list' ? 'text-[#44aaa7]' : 'text-[#333]'}`} onClick={() => { setActiveView('list'); setShowViewDropdown(false); }}>
                  List View
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && <div className="fv-loading">Loading…</div>}
        {error && !loading && <div className="fv-error">{error}</div>}

        {!loading && !error && sortedCollections.length === 0 && (
          <div className="fv-empty">
            <div className="fv-empty-art" aria-hidden>
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="56" fill="#eefaf9" />
                <path d="M40 85 L55 55 L70 75 L85 45 L95 85 Z" fill="none" stroke="#8BDFDD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="48" y="38" width="24" height="18" rx="2" fill="none" stroke="#333" strokeWidth="2" />
                <circle cx="60" cy="44" r="3" fill="#333" />
              </svg>
            </div>
            <h2 className="fv-empty-title">Create collections for this folder</h2>
            <p className="fv-empty-desc">
              Group collections into a folder to stay organized — ideal for events with multiple galleries or volume photography sessions.
            </p>
            <button type="button" className="fv-empty-cta" onClick={navigateNewInFolder}>
              New Collection
            </button>
          </div>
        )}

      {!loading && !error && sortedCollections.length > 0 && activeView === 'grid' && (
        <div className="cg-style-37 fv-grid">
          {sortedCollections.map((collection) => (
            <div
              key={collection.id}
              className={`cg-style-73 group ${contextMenuId === collection.id ? 'cg-style-73--ctx-open' : ''}`}
              onClick={() => handleCardClick(collection)}
            >
              <div className={`cg-style-74 ${selectedCards.includes(collection.id) ? 'cg-style-74--selected' : ''}`}>
                {getCoverSrc(collection) ? (
                  <img src={getCoverSrc(collection)} alt={collection.name} loading="lazy" />
                ) : (
                  <div className="cg-style-38">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                <div
                  className={`cg-style-75 ${selectedCards.includes(collection.id) ? 'border-[#8BDFDD] bg-[#8BDFDD] opacity-100' : 'border-white/85 bg-black/15 opacity-0 group-hover:opacity-100'}`}
                  onClick={(e) => toggleSelectCard(e, collection.id)}
                >
                  {selectedCards.includes(collection.id) && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
                <div className="cg-style-39" onClick={(e) => openContextMenu(e, collection.id)}>
                  ⋮
                </div>
                <svg
                  className={`cg-style-76 ${collection.is_starred ? 'opacity-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'opacity-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:opacity-100'}`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={collection.is_starred ? '#f5c518' : 'none'}
                  stroke={collection.is_starred ? '#f5c518' : 'white'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={(e) => handleToggleCollectionStar(e, collection)}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              {renderContextMenu(collection)}
              <div className="px-1">
                <h3 className="cg-style-43">{collection.name}</h3>
                <div className="cg-style-44 cg-style-44--split">
                  <div className="cg-style-44-meta">
                    <span>{collection.photo_count || 0} items</span>
                    <span className="cg-style-46">·</span>
                    <span>{collection.event_date ? new Date(collection.event_date).toLocaleDateString() : 'No date'}</span>
                  </div>
                  <span className="cg-style-80">{formatStorageBytes(collection.storage_bytes)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && sortedCollections.length > 0 && activeView === 'list' && (
        <div className="px-10 fv-list">
          {sortedCollections.map((collection) => (
            <div key={collection.id} className="cg-style-52" onClick={() => handleCardClick(collection)}>
              <div className="cg-style-48">
                <div className="cg-style-53">
                  {getCoverSrc(collection) ? (
                    <img src={getCoverSrc(collection)} alt="" loading="lazy" />
                  ) : (
                    <div className="cg-style-38" />
                  )}
                </div>
                <div className="cg-style-54">
                  <span className="cg-style-55">{collection.name}</span>
                  <span className="cg-style-56">
                    {collection.photo_count || 0} items · {formatStorageBytes(collection.storage_bytes)}
                  </span>
                </div>
              </div>
              <span className="cg-style-59" onClick={(e) => openContextMenu(e, collection.id)}>
                ···
              </span>
              {renderContextMenu(collection, 'list')}
            </div>
          ))}
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
      <CollectionDirectLinkModal collection={directLinkCollection} isOpen={Boolean(directLinkCollection)} onClose={() => setDirectLinkCollection(null)} />
      <CollectionQrModal collection={qrCollection} isOpen={Boolean(qrCollection)} onClose={() => setQrCollection(null)} />
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
        currentFolderId={folderId}
        onMoved={() => {
          setMoveToCollection(null);
          void load();
        }}
      />
      <FolderDirectLinkModal folder={folder} isOpen={folderLinkOpen} onClose={() => setFolderLinkOpen(false)} />
      <FolderQrModal folder={folder} isOpen={folderQrOpen} onClose={() => setFolderQrOpen(false)} />

      {selectedCards.length > 0 && (
        <div className="cg-style-64">
          <div className="cg-style-65" ref={selectionMenuRef}>
            <button type="button" className="cg-style-66" onClick={clearSelection} aria-label="Clear selection">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <span className="whitespace-nowrap">{selectedCards.length} selected</span>
            <button
              type="button"
              className="cg-style-66"
              onClick={() => setShowSelectionMenu((v) => !v)}
              aria-label="Selection options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={selectedCollections.every((c) => c.is_starred) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </button>
            <button type="button" className="cg-style-68" title="Edit status" onClick={() => setBulkStatusOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button type="button" className="cg-style-68" title="Edit tags" onClick={() => setBulkTagsOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
            </button>
            <button type="button" className="cg-style-68" title="Move to" onClick={() => setBulkMoveOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /><line x1="19" y1="12" x2="19" y2="5" /></svg>
            </button>
            <button type="button" className="cg-style-68" title="Edit settings" onClick={() => setBulkEditOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
            </button>
          </div>
        </div>
      )}

      <MoveCollectionModal
        isOpen={bulkMoveOpen}
        onClose={() => setBulkMoveOpen(false)}
        collectionIds={selectedCards}
        photographerId={user?.id}
        currentFolderIds={selectedCollections.map(() => folderId)}
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
    </main>
    </SidebarLayout >
  );
};

export default FolderView;
