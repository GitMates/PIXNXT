import React from 'react';
import { MediaGridViewProps } from './Media.types';
import { PhotoCard } from './PhotoCard';
import { MediaUploadDropzoneContent } from './MediaUploadDropzoneContent';

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
          <MediaUploadDropzoneContent
            onBrowse={() => {
              onAddMedia?.();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cd-photo-grid cd-photo-grid--manage ${gridSize === 'large' ? 'grid-large' : ''}${showFilename ? ' cd-photo-grid--filenames' : ''}`}
    >
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
