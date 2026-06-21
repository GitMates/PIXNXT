import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { mobileGalleryPhotosService } from '../../services/mobileGalleryPhotos.service';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import {
  filterPhotosBySearch,
  sortMobileGalleryPhotos,
} from '../../lib/mobileGalleryPhotoSort';
import AppPhotoUploadZone from './AppPhotoUploadZone';
import AppPhotosToolbar from './AppPhotosToolbar';
import AppPhotoGrid from './AppPhotoGrid';
import AppUploadQueueList from './AppUploadQueueList';
import '../../pages/mobile-gallery/MobileGallery.css';

const AppPhotosPanel = ({ app, photographerId, onAppUpdated }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('skip');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [sortKey, setSortKey] = useState('position');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!photographerId || !app?.id) return;
    try {
      setLoading(true);
      const data = await mobileGalleryPhotosService.getPhotos(photographerId, app.id);
      setPhotos(data);
    } catch (err) {
      console.error(err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [photographerId, app?.id]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const existingFilenames = photos.map((p) => p.filename);

  const displayPhotos = useMemo(() => {
    const filtered = filterPhotosBySearch(photos, searchQuery);
    return sortMobileGalleryPhotos(filtered, sortKey);
  }, [photos, searchQuery, sortKey]);

  const openUpload = () => {
    setUploadQueue([]);
    setShowUpload(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setShowUpload(false);
    setUploadQueue([]);
  };

  const handleFilesSelected = async (filesToUpload) => {
    if (!filesToUpload.length || !photographerId || !app?.id) return;

    const queueItems = filesToUpload.map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      filename: file.name,
      status: 'pending',
      progress: 0,
      file,
    }));
    setUploadQueue(queueItems);
    setUploading(true);
    setUploadProgress(0);

    if (duplicateMode === 'replace') {
      const replaceFilenames = new Set(filesToUpload.map((f) => f.name.toLowerCase()));
      const toRemove = photos.filter((p) => replaceFilenames.has(p.filename.toLowerCase()));
      for (const photo of toRemove) {
        try {
          await mobileGalleryPhotosService.deletePhoto(
            photographerId,
            app.id,
            photo.id,
            photo.storage_path
          );
        } catch (err) {
          console.warn('Failed to remove duplicate photo:', err);
        }
      }
      if (toRemove.length) {
        setPhotos((prev) => prev.filter((p) => !replaceFilenames.has(p.filename.toLowerCase())));
      }
    }

    const uploaded = [];
    const startPosition = photos.length;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const queueId = queueItems[i].id;

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId ? { ...item, status: 'uploading', progress: 0 } : item
          )
        );

        try {
          const photo = await mobileGalleryPhotosService.uploadPhoto({
            photographerId,
            appId: app.id,
            appName: app.name,
            file,
            position: startPosition + i,
            onProgress: (pct) => {
              const overall = Math.round(((i + pct / 100) / filesToUpload.length) * 100);
              setUploadProgress(overall);
              setUploadQueue((prev) =>
                prev.map((item) =>
                  item.id === queueId ? { ...item, progress: pct } : item
                )
              );
            },
          });
          uploaded.push(photo);
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === queueId ? { ...item, status: 'done', progress: 100 } : item
            )
          );
        } catch (err) {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === queueId
                ? { ...item, status: 'error', error: err?.message || 'Upload failed' }
                : item
            )
          );
        }
      }

      if (uploaded.length) {
        setPhotos((prev) => [...prev, ...uploaded]);
        if (!app.cover_image_url) {
          try {
            const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
              cover_image_url: uploaded[0].thumbnail_url || uploaded[0].full_url,
            });
            onAppUpdated?.(updated);
          } catch (err) {
            console.warn('Could not update app cover:', err);
          }
        }
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleManageApp = () => {
    setShowUpload(false);
    setUploadQueue([]);
  };

  const handleUploadMore = () => {
    setUploadQueue([]);
  };

  const toggleSelect = (photoId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(displayPhotos.map((p) => p.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = async () => {
    if (!selectedIds.size || !photographerId || !app?.id) return;
    if (!window.confirm(`Delete ${selectedIds.size} photo${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const toDelete = photos.filter((p) => selectedIds.has(p.id));
      await mobileGalleryPhotosService.deletePhotos(photographerId, app.id, toDelete);
      const remaining = photos.filter((p) => !selectedIds.has(p.id));
      setPhotos(remaining);
      setSelectedIds(new Set());

      const coverStillExists = remaining.some(
        (p) => (p.thumbnail_url || p.full_url) === app.cover_image_url
      );
      if (!coverStillExists && remaining.length) {
        const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
          cover_image_url: remaining[0].thumbnail_url || remaining[0].full_url,
        });
        onAppUpdated?.(updated);
      } else if (!remaining.length) {
        const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
          cover_image_url: null,
        });
        onAppUpdated?.(updated);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete photos. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (orderedIds) => {
    setSortKey('position');
    const idToPhoto = Object.fromEntries(photos.map((p) => [p.id, p]));
    const reordered = orderedIds.map((id) => idToPhoto[id]).filter(Boolean);
    setPhotos(reordered);
    try {
      await mobileGalleryPhotosService.updatePhotoOrder(photographerId, app.id, orderedIds);
    } catch (err) {
      console.error(err);
      loadPhotos();
    }
  };

  const setCoverFromSelection = async () => {
    if (selectedIds.size !== 1 || !photographerId || !app?.id) return;
    const photo = photos.find((p) => selectedIds.has(p.id));
    if (!photo) return;
    try {
      const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
        cover_image_url: photo.thumbnail_url || photo.full_url,
      });
      onAppUpdated?.(updated);
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('Could not set cover photo.');
    }
  };

  const photoCount = photos.length;
  const showEmpty = !loading && photoCount === 0 && !showUpload;
  const showQueue = showUpload && uploadQueue.length > 0;
  const showDropzone = showUpload && !showQueue;

  return (
    <>
      {!showUpload && photoCount > 0 && (
        <AppPhotosToolbar
          photoCount={photoCount}
          selectedCount={selectedIds.size}
          sortKey={sortKey}
          onSortChange={setSortKey}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDeleteSelected={deleteSelected}
          onAddPhotos={openUpload}
          onSetCover={setCoverFromSelection}
          deleting={deleting}
        />
      )}

      {showUpload && !showQueue && (
        <div className="mg-photos-bar">
          <span className="mg-photos-count">Upload photos</span>
        </div>
      )}

      {showDropzone && (
        <AppPhotoUploadZone
          existingFilenames={existingFilenames}
          duplicateMode={duplicateMode}
          onDuplicateModeChange={setDuplicateMode}
          onCancel={closeUpload}
          onFilesSelected={handleFilesSelected}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      )}

      {showQueue && (
        <>
          <AppPhotoUploadZone
            existingFilenames={existingFilenames}
            duplicateMode={duplicateMode}
            onDuplicateModeChange={setDuplicateMode}
            onCancel={closeUpload}
            onFilesSelected={handleFilesSelected}
            uploading={uploading}
            uploadProgress={uploadProgress}
            toolbarOnly
          />
          <AppUploadQueueList
            items={uploadQueue}
            onUploadMore={handleUploadMore}
            onManageApp={handleManageApp}
            uploading={uploading}
          />
        </>
      )}

      {showEmpty && (
        <div className="mg-photos-empty">
          <div className="mg-photos-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p>You don&apos;t have any photos yet.</p>
          <button type="button" className="mg-btn-primary" onClick={openUpload}>
            Add Photos
          </button>
        </div>
      )}

      {!loading && photoCount > 0 && !showUpload && (
        <>
          {displayPhotos.length === 0 && searchQuery ? (
            <div className="mg-photos-empty mg-photos-empty--compact">
              <p>No photos match your search.</p>
            </div>
          ) : (
            <AppPhotoGrid
              photos={displayPhotos}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onReorder={handleReorder}
              sortKey={sortKey}
              canReorder={!searchQuery.trim()}
            />
          )}
        </>
      )}
    </>
  );
};

export default AppPhotosPanel;
