import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { guestDeliveryPhotosService, validateGuestDeliveryJpeg } from '../../services/guestDeliveryPhotos.service';
import {
  filterPhotosBySearch,
  sortMobileGalleryPhotos,
} from '../../lib/mobileGalleryPhotoSort';
import { useUploadQueue } from '../features/CollectionDashboard/Upload/useUploadQueue';
import AppPhotosToolbar from '../mobile-gallery/AppPhotosToolbar';
import { AppLoader } from '../ui/AppLoading';
import AppPhotoGrid from '../mobile-gallery/AppPhotoGrid';
import '../../pages/mobile-gallery/MobileGallery.css';

const EventPhotosPanel = ({ event, photographerId, onPhotoCountChange }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('position');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [isDraggingDropzone, setIsDraggingDropzone] = useState(false);
  const fileInputRef = useRef(null);
  const onPhotoCountChangeRef = useRef(onPhotoCountChange);

  useEffect(() => {
    onPhotoCountChangeRef.current = onPhotoCountChange;
  }, [onPhotoCountChange]);

  const syncPhotoCount = useCallback((nextPhotos) => {
    onPhotoCountChangeRef.current?.(nextPhotos.length);
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!photographerId || !event?.id) return;
    try {
      setLoading(true);
      const data = await guestDeliveryPhotosService.getPhotos(photographerId, event.id);
      setPhotos(data);
      syncPhotoCount(data);
    } catch (err) {
      console.error(err);
      setPhotos([]);
      syncPhotoCount([]);
    } finally {
      setLoading(false);
    }
  }, [photographerId, event?.id, syncPhotoCount]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const existingFilenames = useMemo(
    () => photos.map((p) => p.filename).filter(Boolean),
    [photos]
  );

  const handlePhotoUploaded = useCallback(
    (photoData) => {
      if (!photoData?.id || photoData.event_id !== event?.id) return;
      setPhotos((prev) => {
        if (prev.some((p) => p.id === photoData.id)) return prev;
        const next = [...prev, photoData];
        syncPhotoCount(next);
        return next;
      });
    },
    [event?.id, syncPhotoCount]
  );

  const uploadPhotoFn = useCallback(
    async ({ file, photographerId: ownerId, sortIndex, onProgress }) =>
      guestDeliveryPhotosService.uploadPhoto({
        photographerId: ownerId,
        eventId: event.id,
        eventName: event.name,
        file,
        position: sortIndex,
        onProgress,
      }),
    [event?.id, event?.name]
  );

  const {
    state: uploadState,
    processFiles,
    getUploadTargetSnapshot,
  } = useUploadQueue({
    collectionId: event?.id,
    photographerId,
    activeSetId: null,
    photosLength: photos.length,
    existingFilenames,
    destinationLabel: event?.name || 'Guest Delivery Event',
    viewPath: event?.id ? `/guest-delivery/event/${event.id}` : null,
    uploadPhotoFn,
    onPhotoUploaded: handlePhotoUploaded,
  });

  const displayPhotos = useMemo(() => {
    const filtered = filterPhotosBySearch(photos, searchQuery);
    return sortMobileGalleryPhotos(filtered, sortKey);
  }, [photos, searchQuery, sortKey]);

  const gridPhotos = useMemo(() => {
    const completedNames = new Set(photos.map((p) => p.filename));
    const pending = uploadState.files
      .filter(
        (f) =>
          f.status !== 'completed' &&
          f.status !== 'error' &&
          !completedNames.has(f.name) &&
          f.collectionId === event?.id
      )
      .map((f) => ({
        id: `upload-pending-${f.id}`,
        filename: f.name,
        full_url: f.previewUrl || '',
        thumbnail_url: f.previewUrl || '',
        _uploadPending: true,
        _uploadProgress: f.progress,
      }));
    return [...displayPhotos, ...pending];
  }, [displayPhotos, uploadState.files, photos, event?.id]);

  const pickFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const valid = [];
    const errors = [];
    files.forEach((file) => {
      const err = validateGuestDeliveryJpeg(file);
      if (err) errors.push(`${file.name}: ${err}`);
      else valid.push(file);
    });

    if (errors.length) {
      alert(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n…and ${errors.length - 5} more` : ''));
    }
    if (!valid.length) return;

    processFiles(valid, getUploadTargetSnapshot());
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const toggleSelect = (photoId) => {
    if (String(photoId).startsWith('upload-pending-')) return;
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
    if (!selectedIds.size || !photographerId || !event?.id) return;
    if (!window.confirm(`Delete ${selectedIds.size} photo${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const toDelete = photos.filter((p) => selectedIds.has(p.id));
      await guestDeliveryPhotosService.deletePhotos(photographerId, event.id, toDelete);
      const remaining = photos.filter((p) => !selectedIds.has(p.id));
      setPhotos(remaining);
      syncPhotoCount(remaining);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to delete photos. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (orderedIds) => {
    setSortKey('position');
    const realIds = orderedIds.filter((id) => !String(id).startsWith('upload-pending-'));
    const idToPhoto = Object.fromEntries(photos.map((p) => [p.id, p]));
    const reordered = realIds.map((id) => idToPhoto[id]).filter(Boolean);
    setPhotos(reordered);
    try {
      await guestDeliveryPhotosService.updatePhotoOrder(photographerId, event.id, realIds);
    } catch (err) {
      console.error(err);
      loadPhotos();
    }
  };

  const hasUploadActivity = uploadState.files.some(
    (f) => f.collectionId === event?.id && f.status !== 'completed' && f.status !== 'error'
  );
  const showGrid = gridPhotos.length > 0;
  const photoCount = photos.length;
  const showInitialLoading = loading && photos.length === 0 && !hasUploadActivity;

  return (
    <div className="mg-app-photos-panel">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,.jpg,.jpeg"
        multiple
        hidden
        onChange={(e) => {
          pickFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {showGrid && (
        <AppPhotosToolbar
          photoCount={photoCount}
          selectedCount={selectedIds.size}
          sortKey={sortKey}
          onSortChange={setSortKey}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDeleteSelected={deleteSelected}
          onAddPhotos={openFilePicker}
          deleting={deleting}
        />
      )}

      {!showInitialLoading && !showGrid && (
        <div
          className={`mg-upload-dropzone mg-upload-dropzone--standalone${isDraggingDropzone ? ' mg-upload-dropzone--dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingDropzone(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setIsDraggingDropzone(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingDropzone(false);
            pickFiles(e.dataTransfer.files);
          }}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFilePicker();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload photos"
        >
          <div className="mg-upload-dropzone-inner">
            <p className="mg-upload-drag-text">Drag photos here to upload</p>
            <p className="mg-upload-or">Or...</p>
            <button
              type="button"
              className="mg-btn-primary neu-pill mg-upload-select-btn"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Select photos from your computer
            </button>
            <p className="mg-upload-hint">JPEG up to 100MB each · Face matching runs on publish</p>
          </div>
        </div>
      )}

      {showGrid && (
        <>
          {displayPhotos.length === 0 && searchQuery ? (
            <div className="mg-photos-empty mg-photos-empty--compact">
              <p>No photos match your search.</p>
            </div>
          ) : (
            <AppPhotoGrid
              photos={gridPhotos}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onReorder={handleReorder}
              sortKey={sortKey}
              canReorder={!searchQuery.trim()}
            />
          )}
        </>
      )}

      {showInitialLoading && (
        <div style={{ padding: '24px 40px' }}>
          <AppLoader label="Loading photos" variant="page-short" className="gd-muted app-loader" />
        </div>
      )}
    </div>
  );
};

export default EventPhotosPanel;
