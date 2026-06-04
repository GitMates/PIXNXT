import React from 'react';
import { Heart, ZoomIn, Check } from 'lucide-react';

export default function PhotoGrid({
  title,
  photos,
  favorites,
  onToggleFavorite,
  onBuyPrint,
  isSelectionMode,
  selectedPhotos,
  onToggleSelectPhoto
}) {
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
      <div className="photos-section-header">
        <h2 className="photos-section-title">{title}</h2>
      </div>

      <div className="photo-grid">
        {photos.map((photo) => {
          const isFavorited = favorites.includes(photo.id);
          const isSelected = selectedPhotos.includes(photo.id);

          return (
            <div
              key={photo.id}
              className={`photo-grid-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleSelectPhoto(photo.id)}
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
                  {/* Toggle Favorite Button */}
                  <button
                    className={`card-heart-btn ${isFavorited ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(photo.id);
                    }}
                    aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart
                      size={15}
                      fill={isFavorited ? "#2563eb" : "none"}
                      stroke="#000000"
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {/* Right: Select Toggle Checkmark with Tooltip */}
                <div className="card-select-wrapper">
                  <button
                    className={`card-select-btn ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectPhoto(photo.id);
                    }}
                    aria-label="Select photo"
                  >
                    {isSelected && (
                      <Check size={14} strokeWidth={3.5} color="#ffffff" />
                    )}
                  </button>
                  <div className="card-select-tooltip">Press to select item</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
