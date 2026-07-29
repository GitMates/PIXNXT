import React from 'react';

export default function CircularFramesPreview({ product, selectedFrame, currentAspect }) {
  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: `${currentAspect.toFixed(6)} / 1`, 
        width: '100%', 
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out'
      }}>
        <div className="composition-preview__printable-area" style={{ 
          position: 'absolute',
          width: '80%', height: '80%', top: '10%', left: '10%', borderRadius: '50%'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '58%', height: '58%', top: '21%', left: '21%', borderRadius: '50%', overflow: 'hidden'
          }}>
            {/* Base image hidden for circular_frames because the overlay provides the deckled image */}
          </div>
        </div>

        <div className="product-card-circular_frames composition-preview__overlay" style={{ 
          '--frame-color': selectedFrame?.color || '#a89f91', 
          width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' 
        }}>
          <div className="cf-outer-frame" style={{
            width: '100%', height: '100%',
            backgroundColor: 'var(--frame-color)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(0,0,0,0.08)',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="cf-square-mat" style={{
              width: '94%', height: '94%',
              backgroundColor: '#f9f9f9',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div className="cf-photo-container" style={{
                width: '64%',
                height: '64%',
                position: 'absolute', zIndex: 1
              }}>
                <img
                  src={product.image}
                  alt=""
                  className="cf-deckle-photo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              {/* Perfect circular mat opening — photo sits just inside with wrinkled edge */}
              <div className="cf-mat-hole" style={{
                width: '70%',
                height: '70%',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.95)',
                position: 'absolute', zIndex: 2, pointerEvents: 'none',
                boxShadow: '0 0 0 2000px #f9f9f9, inset 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.06)'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
