import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Laptop } from 'lucide-react';
import { ChangeCoverModalProps } from './ChangeCoverModal.types';
import { cn } from '../../../../lib/utils';
import { isGalleryImagePhoto } from '../../../../lib/coverPhotoDrag';
import { getFileMime, isImageMime } from '../../../../lib/fileMime';
import { isRawImageFile } from '../../../../lib/rawImageFormats';
import './ChangeCoverModal.css';

const COVER_UPLOAD_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="56"
    height="56"
    viewBox="0 0 56 56"
    fill="none"
    aria-hidden
  >
    <rect x="8" y="12" width="28" height="22" rx="2" stroke="#cfd5d8" strokeWidth="1.5" />
    <rect x="18" y="6" width="28" height="22" rx="2" stroke="#cfd5d8" strokeWidth="1.5" fill="#fff" />
    <circle cx="36" cy="32" r="10" fill="#fff" stroke="#cfd5d8" strokeWidth="1.5" />
    <path d="M36 28v8M32 32h8" stroke="#cfd5d8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

function isCoverImageFile(file: File) {
  if (!file?.size) return false;
  const mime = getFileMime(file);
  return isImageMime(mime) || isRawImageFile(file);
}

export const ChangeCoverModal: React.FC<ChangeCoverModalProps> = ({
  isOpen,
  onClose,
  photos,
  onSelectPhoto,
  scopeLabel = 'All photos',
  onBrowseFiles,
  onDropCoverFile,
  isUploading = false,
}) => {
  const [view, setView] = useState<'upload' | 'collection'>('upload');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) setView('upload');
  }, [isOpen]);

  const imagePhotos = photos.filter(isGalleryImagePhoto);
  const emptyMessage =
    scopeLabel === 'All photos'
      ? 'No photos in this collection yet. Add media to a set first.'
      : `No photos in ${scopeLabel} yet.`;

  const handleClose = useCallback(() => {
    setView('upload');
    onClose();
  }, [onClose]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isUploading) return;
      const file = Array.from(e.dataTransfer?.files || []).find(isCoverImageFile);
      if (file) onDropCoverFile?.(file);
    },
    [isUploading, onDropCoverFile]
  );

  if (!isOpen) return null;

  return (
    <div className="cover-modal-overlay" onClick={handleClose}>
      <div
        className={cn('cover-modal-container', view === 'collection' && 'cover-modal-container--wide')}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'cover-modal-header',
            view === 'collection' && 'cover-modal-header--stacked'
          )}
        >
          {view === 'collection' ? (
            <button
              type="button"
              className="cover-modal-back-btn"
              onClick={() => setView('upload')}
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          ) : (
            <span className="cover-modal-header-spacer" aria-hidden />
          )}
          <div className="cover-modal-header-text">
            <h3 className="modal-title">CHANGE COVER</h3>
            {view === 'collection' && <p className="cover-modal-scope">{scopeLabel}</p>}
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={cn('cover-modal-content', view === 'upload' && 'cover-modal-content--upload')}>
          {view === 'upload' ? (
            <div
              className={cn(
                'cd-cover-modal-dropzone',
                isDragging && 'dragging',
                isUploading && 'uploading'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="cd-cover-modal-drop-inner">
                <div className="cd-cover-modal-drop-icon">{COVER_UPLOAD_ICON}</div>
                <p className="cd-cover-modal-drop-title">Drag photo here to upload or</p>
                <button
                  type="button"
                  className="cover-modal-select-btn"
                  disabled={isUploading}
                  onClick={() => setView('collection')}
                >
                  Select from Collection
                </button>
                <button
                  type="button"
                  className="cover-modal-browse-btn"
                  disabled={isUploading}
                  onClick={() => onBrowseFiles?.()}
                >
                  <Laptop size={16} strokeWidth={1.75} aria-hidden />
                  Browse files
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-collection-view">
              <div className="photo-grid-scroll">
                {imagePhotos.length === 0 ? (
                  <div className="empty-collection-state">
                    <p>{emptyMessage}</p>
                  </div>
                ) : (
                  <div className="photo-selection-grid">
                    {imagePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="photo-grid-item"
                        onClick={() => {
                          onSelectPhoto(photo);
                          handleClose();
                        }}
                      >
                        <img
                          src={photo.thumbnail_url || photo.full_url || undefined}
                          alt={photo.filename}
                        />
                        <div className="photo-overlay">
                          <button type="button" className="use-photo-btn">
                            Use as Cover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
