import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { openSpaPath } from '../lib/spaNavigation';
import { openShareByEmail, openWhatsAppShare, getShareUrlForCollection } from '../lib/shareCollection';
import { getFolderStudioUrl } from '../lib/folderStudioUrl';
import { generateCollectionSlug } from '../lib/collectionSlug';
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
  const [contextMenuId, setContextMenuId] = useState(null);
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

  const closeContextMenu = useCallback(() => setContextMenuId(null), []);

  const handlePreviewCollection = useCallback(
    (collection) => {
      closeContextMenu();
      if (collection?.slug) openSpaPath(`/gallery/${collection.slug}`);
    },
    [closeContextMenu]
  );

  const handleCardClick = (collection) => {
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
      const inSharePortal = e.target.closest?.('.cg-ctx-submenu--portal, .cg-ctx-submenu-bridge, .cgm-overlay');
      if (contextRef.current && !contextRef.current.contains(e.target) && !inSharePortal) {
        setContextMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const openContextMenu = (e, id) => {
    e.stopPropagation();
    setContextMenuId(contextMenuId === id ? null : id);
  };

  const renderContextMenu = (collection, variant = 'grid') => {
    if (contextMenuId !== collection.id) return null;
    return (
      <CollectionContextMenu
        menuRef={contextRef}
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
    if (!duplicateCollection || !user) return;
    setDuplicateBusy(true);
    try {
      const newRow = await galleryService.createCollection({
        photographer_id: user.id,
        folder_id: folderId,
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
      console.error(err);
      alert('Failed to duplicate collection.');
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
                <div className={`cg-style-71 ${activeView === 'grid' ? 'text-[#593116]' : 'text-[#333]'}`} onClick={() => { setActiveView('grid'); setShowViewDropdown(false); }}>
                  Grid View
                </div>
                <div className={`cg-style-71 ${activeView === 'list' ? 'text-[#593116]' : 'text-[#333]'}`} onClick={() => { setActiveView('list'); setShowViewDropdown(false); }}>
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
                <circle cx="60" cy="60" r="56" fill="#e8f6f3" />
                <path d="M40 85 L55 55 L70 75 L85 45 L95 85 Z" fill="none" stroke="#1a9b87" strokeWidth="2" />
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
                <div className="cg-style-74">
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
                  <div className="cg-style-39" onClick={(e) => openContextMenu(e, collection.id)}>
                    ⋮
                  </div>
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
      </main>
    </SidebarLayout>
  );
};

export default FolderView;
