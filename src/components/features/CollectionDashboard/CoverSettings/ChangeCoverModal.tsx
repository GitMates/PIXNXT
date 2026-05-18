import React from 'react';
import { ChangeCoverModalProps } from './ChangeCoverModal.types';
import { cn } from '../../../../lib/utils';
import { isGalleryImagePhoto } from '../../../../lib/coverPhotoDrag';
import './ChangeCoverModal.css';

export const ChangeCoverModal: React.FC<ChangeCoverModalProps> = ({
  isOpen,
  onClose,
  photos,
  onSelectPhoto,
  scopeLabel = 'All photos',
}) => {
  if (!isOpen) return null;

  const imagePhotos = photos.filter(isGalleryImagePhoto);
  const emptyMessage =
    scopeLabel === 'All photos'
      ? 'No photos in this collection yet. Add media to a set first.'
      : `No photos in ${scopeLabel} yet.`;

  return (
    <div className="cover-modal-overlay" onClick={onClose}>
      <div
        className={cn('cover-modal-container', 'wide')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-header cover-modal-header--stacked">
          <div className="cover-modal-header-text">
            <h3 className="modal-title">CHANGE COVER</h3>
            <p className="cover-modal-scope">{scopeLabel}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="cover-modal-content">
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
                        onClose();
                      }}
                    >
                      <img src={photo.thumbnail_url || photo.full_url || undefined} alt={photo.filename} />
                      <div className="photo-overlay">
                        <button type="button" className="use-photo-btn">Use as Cover</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
