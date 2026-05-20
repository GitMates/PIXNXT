import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { galleryService } from '../../../services/gallery.service';
import './MoveCollectionModal.css';

export type MoveFolderOption = {
  id: string;
  name: string;
  cover_url: string | null;
};

type MoveTarget = 'home' | string;

export interface MoveCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId?: string | null;
  collectionIds?: string[];
  photographerId: string | null | undefined;
  currentFolderId?: string | null;
  currentFolderIds?: (string | null)[];
  onMoved?: (folderId: string | null) => void;
}

function FolderThumb({ coverUrl }: { coverUrl: string | null }) {
  if (coverUrl) {
    return <img src={coverUrl} alt="" className="move-folder-thumb" loading="lazy" />;
  }
  return (
    <span className="move-folder-thumb move-folder-thumb--empty" aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#a4d1f5" stroke="#a4d1f5" strokeWidth="1.5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    </span>
  );
}

export function MoveCollectionModal({
  isOpen,
  onClose,
  collectionId,
  collectionIds,
  photographerId,
  currentFolderId = null,
  currentFolderIds,
  onMoved,
}: MoveCollectionModalProps) {
  const effectiveIds = useMemo(
    () => (collectionIds?.length ? collectionIds : collectionId ? [collectionId] : []),
    [collectionIds, collectionId]
  );
  const isBulk = effectiveIds.length > 1;

  const [folders, setFolders] = useState<MoveFolderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<MoveTarget>('home');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const currentTarget: MoveTarget = currentFolderId ? currentFolderId : 'home';

  const currentLocationLabel = useMemo(() => {
    if (isBulk && currentFolderIds?.length) {
      const unique = [...new Set(currentFolderIds.map((id) => id ?? 'home'))];
      if (unique.length === 1) {
        const only = unique[0];
        if (only === 'home') return 'No folder';
        return folders.find((f) => f.id === only)?.name ?? 'Folder';
      }
      return 'Various locations';
    }
    if (!currentFolderId) return 'No folder';
    return folders.find((f) => f.id === currentFolderId)?.name ?? 'Folder';
  }, [currentFolderId, currentFolderIds, folders, isBulk]);

  const loadFolders = useCallback(async () => {
    if (!photographerId) return;
    setLoading(true);
    try {
      const rows = await galleryService.getFoldersForMove(photographerId);
      setFolders(rows);
    } catch (err) {
      console.error('Failed to load folders:', err);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [photographerId]);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(isBulk ? 'home' : currentTarget);
    setShowNewFolder(false);
    setNewFolderName('');
    void loadFolders();
  }, [isOpen, isBulk, currentTarget, loadFolders]);

  const needsMove = useMemo(() => {
    if (isBulk && currentFolderIds?.length) {
      const folderId = selected === 'home' ? null : selected;
      return currentFolderIds.some((id) => (id ?? null) !== folderId);
    }
    return selected !== currentTarget;
  }, [isBulk, currentFolderIds, selected, currentTarget]);

  const canMove = needsMove && !busy;

  const handleMove = async () => {
    if (!effectiveIds.length || !canMove) return;
    setBusy(true);
    try {
      const folderId = selected === 'home' ? null : selected;
      await Promise.all(
        effectiveIds.map((id) => galleryService.moveCollectionToFolder(id, folderId))
      );
      onMoved?.(folderId);
      onClose();
    } catch (err) {
      console.error('Failed to move collection:', err);
      alert(err instanceof Error ? err.message : 'Failed to move collection.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!photographerId || !newFolderName.trim()) return;
    setBusy(true);
    try {
      const created = await galleryService.createFolder(photographerId, newFolderName.trim());
      setFolders((prev) => [...prev, { id: created.id, name: created.name, cover_url: created.cover_url }]);
      setSelected(created.id);
      setShowNewFolder(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert(err instanceof Error ? err.message : 'Failed to create folder.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div
        className="cd-modal move-collection-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="move-collection-title"
      >
        <div className="cd-modal-header">
          <h3 id="move-collection-title" className="cd-modal-title">
            {isBulk ? 'MOVE COLLECTIONS TO' : 'MOVE COLLECTION TO'}
          </h3>
          <button type="button" className="cd-modal-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cd-modal-body move-collection-body">
          <div className="move-collection-current">
            <span className="move-collection-current-label">Current Location</span>
            <span className="move-collection-current-value">{currentLocationLabel}</span>
          </div>

          <div className="move-folder-list-wrap">
            <button
              type="button"
              className={`move-folder-row move-folder-row--home${selected === 'home' ? ' is-selected' : ''}`}
              onClick={() => setSelected('home')}
            >
              <span className="move-folder-row-icon" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span className="move-folder-row-name">Home</span>
            </button>

            {loading && <p className="move-folder-status">Loading folders…</p>}
            {!loading && folders.length === 0 && (
              <p className="move-folder-status move-folder-status--muted">
                No folders yet. Create one below to organize collections.
              </p>
            )}
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`move-folder-row${selected === folder.id ? ' is-selected' : ''}`}
                onClick={() => setSelected(folder.id)}
              >
                <FolderThumb coverUrl={folder.cover_url} />
                <span className="move-folder-row-name">{folder.name}</span>
              </button>
            ))}
          </div>

          {showNewFolder ? (
            <form className="move-new-folder-form" onSubmit={handleCreateFolder}>
              <input
                type="text"
                className="move-new-folder-input"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                disabled={busy}
              />
              <button type="submit" className="move-new-folder-submit" disabled={busy || !newFolderName.trim()}>
                Create
              </button>
              <button
                type="button"
                className="move-new-folder-cancel"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </form>
          ) : null}
        </div>

        <div className="move-collection-footer">
          <button
            type="button"
            className="move-new-folder-link"
            onClick={() => setShowNewFolder(true)}
            disabled={busy || showNewFolder}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 12H3" />
              <path d="m11 18 6-6-6-6" />
              <path d="M21 5v14" />
            </svg>
            Move to new folder
          </button>
          <div className="move-collection-footer-actions">
            <button type="button" className="cd-cancel-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className={`cd-save-btn${canMove ? '' : ' disabled'}`}
              disabled={!canMove}
              onClick={() => void handleMove()}
            >
              {busy ? 'Moving…' : 'Move'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
