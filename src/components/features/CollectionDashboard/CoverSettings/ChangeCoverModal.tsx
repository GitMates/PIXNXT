import React, { useState, useRef } from 'react';
import { ChangeCoverModalProps } from './ChangeCoverModal.types';
import { cn } from '../../../../lib/utils';
import './ChangeCoverModal.css';

export const ChangeCoverModal: React.FC<ChangeCoverModalProps> = ({ 
  isOpen, 
  onClose, 
  photos, 
  onSelectPhoto,
  onUploadPhoto,
  isUploading 
}) => {
  const [view, setView] = useState<'initial' | 'collection'>('initial');
  const [isOverflowing, setIsOverflowing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      onClose();
    }
  };

  const handleBack = () => setView('initial');

  return (
    <div className="cover-modal-overlay" onClick={onClose}>
      <div 
        className={cn('cover-modal-container', view === 'collection' && 'wide')} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-header">
          {view === 'collection' && (
            <button className="modal-back-btn" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          )}
          <h3 className="modal-title">{view === 'initial' ? 'CHANGE COVER' : 'SELECT FROM COLLECTION'}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="cover-modal-content">
          {view === 'initial' ? (
            <div className="modal-initial-view">
              <div className="upload-dropzone">
                <div className="cloud-icon-wrapper">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="drag-text">Drag photo here to upload or</p>
                
                <button 
                  className="select-collection-btn"
                  onClick={() => setView('collection')}
                >
                  Select from Collection
                </button>

                <div className="browse-link-wrapper">
                  <button className="browse-text-btn" onClick={handleBrowseClick}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span>Browse files</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="modal-collection-view">
              <div className="photo-grid-scroll">
                {photos.length === 0 ? (
                  <div className="empty-collection-state">
                    <p>No photos in this collection yet.</p>
                  </div>
                ) : (
                  <div className="photo-selection-grid">
                    {photos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="photo-grid-item"
                        onClick={() => {
                          onSelectPhoto(photo);
                          onClose();
                        }}
                      >
                        <img src={photo.thumbnail_url || photo.full_url} alt={photo.filename} />
                        <div className="photo-overlay">
                          <button className="use-photo-btn">Use as Cover</button>
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
