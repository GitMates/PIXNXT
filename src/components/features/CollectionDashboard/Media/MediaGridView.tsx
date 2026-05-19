import React from 'react';
import { MediaGridViewProps } from './Media.types';
import { PhotoCard } from './PhotoCard';

export const MediaGridView: React.FC<MediaGridViewProps> = ({
  photos,
  gridSize,
  showFilename,
  selectedPhotos,
  onToggleSelection,
  onToggleStar,
  onDelete,
  onAddMedia
}) => {
  if (photos.length === 0) {
    return (
      <div className="cd-dropzone" onClick={onAddMedia}>
        <div className="cd-dropzone-content">
          <div className="cd-drop-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cfd5d8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
              <path d="M8 2h12a2 2 0 0 1 2 2v10"></path>
              <circle cx="15" cy="15" r="5" fill="#fff" stroke="#cfd5d8"></circle>
              <line x1="15" y1="12" x2="15" y2="18"></line>
              <line x1="12" y1="15" x2="18" y2="15"></line>
            </svg>
          </div>
          <h3 className="cd-drop-title">Upload photos</h3>
          <p className="cd-drop-subtitle">or <span className="cd-browse-link">Browse files</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cd-photo-grid cd-photo-grid--manage ${gridSize === 'large' ? 'grid-large' : ''}`}>
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isSelected={selectedPhotos.includes(photo.id)}
          showFilename={showFilename}
          gridSize={gridSize}
          onSelect={() => onToggleSelection(photo.id)}
          onToggleStar={() => onToggleStar(photo.id, photo.is_starred)}
          onDelete={() => onDelete([photo.id])}
          onMakeCover={() => {}} // TODO: Implement
        />
      ))}
    </div>
  );
};
