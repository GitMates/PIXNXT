import React, { useState } from 'react';
import { Heart, ZoomIn, Check } from 'lucide-react';

export default function PhotoGrid({
  title,
  photos,
  favorites,
  onToggleFavorite,
  onBuyPrint,
  isSelectionMode,
  selectedPhotos,
  onToggleSelectPhoto,
  onSelectAll,
  onDeselectAll
}) {
  const [flyingPhoto, setFlyingPhoto] = useState(null);

  const handlePhotoClick = (e, photo) => {
    const isSelected = selectedPhotos.includes(photo.id);
    
    // If we are selecting (not deselecting), trigger the fly animation
    if (!isSelected && isSelectionMode) {
      const card = e.currentTarget.closest('.photo-grid-item');
      if (card) {
        const rect = card.getBoundingClientRect();
        setFlyingPhoto({
          id: photo.id + '_' + Date.now(),
          url: photo.url,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        });
        
        // Remove flying photo after animation completes
        setTimeout(() => setFlyingPhoto(null), 800);
      }
    }
    
    onToggleSelectPhoto(photo.id);
  };

  if (photos.length === 0) {
    return (
      <div className="photos-section" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: '#777777', fontSize: '1rem', letterSpacing: '0.05em' }}>
          No photos found in this collection.
        </p>
      </div>
    );
  }

  return (
    <section className="photos-section">
      <div className="photos-section-header" style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
        <h2 className="photos-section-title" style={{ margin: 0 }}>{title}</h2>
        {isSelectionMode && (
          <div className="photos-selection-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#333', marginTop: '1rem' }}>
            <span className="items-count" style={{ fontSize: '14px' }}>{photos.length} items</span>
            {selectedPhotos.length === photos.length && photos.length > 0 ? (
              <button 
                type="button" 
                onClick={onDeselectAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#111' }}
              >
                <span style={{ fontSize: '16px' }}>✕</span> Deselect all
              </button>
            ) : (
              <button 
                type="button" 
                onClick={onSelectAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#111' }}
              >
                <Check size={16} strokeWidth={2} /> Select all
              </button>
            )}
          </div>
        )}
      </div>

      <div className="photo-grid">
        {photos.map((photo) => {
          const isFavorited = favorites.includes(photo.id);
          const isSelected = selectedPhotos.includes(photo.id);

          return (
            <div
              key={photo.id}
              className={`photo-grid-item ${isSelected ? 'selected' : ''}`}
              onClick={(e) => isSelectionMode ? handlePhotoClick(e, photo) : onToggleSelectPhoto(photo.id)}
              style={{
                border: isSelected ? '3px solid #a68c5b' : '1px solid #eaeaea',
                transform: isSelected ? 'scale(0.97)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <img
                src={photo.url}
                alt={photo.name}
                className="photo-grid-img"
              />

              {/* Selection Checkmark & Hover Actions Overlay */}
              <div className="photo-card-actions">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Heart button removed */}
                </div>

                {/* Right: Select Toggle Checkmark with Tooltip */}
                <div className="card-select-wrapper">
                  <button
                    className={`card-select-btn ${isSelected ? 'selected' : ''}`}
                    style={{
                      background: isSelected ? '#a68c5b' : 'transparent',
                      border: isSelected ? '2px solid white' : '2px solid rgba(255,255,255,0.7)',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoClick(e, photo);
                    }}
                    aria-label="Select photo"
                  >
                    {isSelected && (
                      <Check size={16} strokeWidth={3} color="#ffffff" />
                    )}
                  </button>
                  <div className="card-select-tooltip">Press to select item</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flying Photo Animation Overlay */}
      {flyingPhoto && (
        <img
          src={flyingPhoto.url}
          className="flying-thumbnail"
          style={{
            '--start-x': `${flyingPhoto.x}px`,
            '--start-y': `${flyingPhoto.y}px`,
            '--start-w': `${flyingPhoto.width}px`,
            '--start-h': `${flyingPhoto.height}px`
          }}
          alt=""
        />
      )}
    </section>
  );
}
