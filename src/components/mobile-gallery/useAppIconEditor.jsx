import React, { useCallback, useState } from 'react';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import { storageService } from '../../services/storage.service';
import AppIconModal from './AppIconModal';

export function useAppIconEditor(app, photographerId, onAppUpdated) {
  const [showIconModal, setShowIconModal] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const openIconEditor = useCallback(() => {
    setShowIconModal(true);
  }, []);

  const closeIconEditor = useCallback(() => {
    if (!uploadingIcon) setShowIconModal(false);
  }, [uploadingIcon]);

  const handleIconUpload = useCallback(
    async (file) => {
      if (!file || !photographerId || !app?.id) return;
      setUploadingIcon(true);
      try {
        const ext = file.name.split('.').pop() || 'png';
        const path = `photographers/${photographerId}/mobile-gallery/${app.id}/icon_${Date.now()}.${ext}`;
        const result = await storageService.upload(path, file);
        const updated = await mobileGalleryService.updateApp(photographerId, app.id, {
          icon_url: result.url,
          settings: app.settings || {},
        });
        onAppUpdated?.(updated);
        setShowIconModal(false);
      } catch (err) {
        console.error(err);
        alert('Failed to upload app icon.');
      } finally {
        setUploadingIcon(false);
      }
    },
    [photographerId, app, onAppUpdated]
  );

  const iconModal = (
    <AppIconModal
      open={showIconModal}
      uploading={uploadingIcon}
      onUpload={handleIconUpload}
      onClose={closeIconEditor}
    />
  );

  return {
    openIconEditor,
    uploadingIcon,
    iconModal,
  };
}

export function AppDetailIconButton({ app, onEdit, uploading = false }) {
  const initial = String(app?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <button
      type="button"
      className="mg-app-detail-icon mg-app-detail-icon--editable"
      onClick={onEdit}
      disabled={uploading}
      aria-label="Edit App Icon"
    >
      {app?.icon_url ? (
        <img src={app.icon_url} alt="" key={app.icon_url} />
      ) : (
        <span className="mg-app-detail-icon-letter">{initial}</span>
      )}
      <span className="mg-app-detail-icon-edit-overlay" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </span>
      <span className="mg-app-detail-icon-tooltip" role="tooltip">
        Edit App Icon
      </span>
    </button>
  );
}

export default useAppIconEditor;
