import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function AddPhotosSidebar({
  isOpen,
  onClose,
  collectionPhotos,
  selectedPhotoIds,
  onTogglePhoto
}) {
  if (!isOpen) return null;

  return (
    <div className="add-photos-overlay" onClick={onClose}>
      <div className="add-photos-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="add-photos-header">
          <h3>Add Photos</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="add-photos-grid">
          {collectionPhotos.map(photo => {
            const isSelected = selectedPhotoIds.includes(photo.id);
            return (
              <div 
                key={photo.id} 
                className={`add-photo-item ${isSelected ? 'in-use' : ''}`}
                onClick={() => onTogglePhoto(photo)}
              >
                <img src={photo.url} alt={photo.name} />
                {isSelected && (
                  <div className="in-use-overlay">
                    <span className="in-use-badge">In use</span>
                    <div className="check-circle">
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
