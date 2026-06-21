import React, { useState } from 'react';
import '../../pages/mobile-gallery/MobileGallery.css';

const MoveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <polyline points="15 19 12 22 9 19" />
    <polyline points="19 9 22 12 19 15" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);

const AppPhotoGrid = ({
  photos,
  selectedIds,
  onToggleSelect,
  onReorder,
  sortKey,
  canReorder = true,
}) => {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const canDrag = sortKey === 'position' && canReorder;

  const handleDragStart = (e, photoId) => {
    if (!canDrag) return;
    setDragId(photoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, photoId) => {
    if (!canDrag || !dragId || dragId === photoId) return;
    e.preventDefault();
    setOverId(photoId);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!canDrag || !dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = photos.map((p) => p.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragId);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="mg-photos-grid">
      {photos.map((photo) => {
        const selected = selectedIds.has(photo.id);
        return (
          <div
            key={photo.id}
            className={`mg-photo-thumb${selected ? ' mg-photo-thumb--selected' : ''}${overId === photo.id ? ' mg-photo-thumb--drag-over' : ''}`}
            draggable={canDrag}
            onDragStart={(e) => handleDragStart(e, photo.id)}
            onDragOver={(e) => handleDragOver(e, photo.id)}
            onDrop={(e) => handleDrop(e, photo.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onToggleSelect(photo.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleSelect(photo.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={photo.filename}
          >
            {canDrag && (
              <span className="mg-photo-drag-handle" aria-hidden>
                <MoveIcon />
              </span>
            )}
            <img
              src={photo.thumbnail_url || photo.full_url}
              alt={photo.filename}
              loading="lazy"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AppPhotoGrid;
