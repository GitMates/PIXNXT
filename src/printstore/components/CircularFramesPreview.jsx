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
            <div 
              className="composition-preview-box__image" 
              style={{ 
                position: 'absolute', 
                backgroundImage: `url(${product.image})`, 
                width: '100%', 
                height: '100%', 
                left: '0px', 
                top: '0px',
                backgroundSize: 'cover',
                backgroundPosition: 'center center'
              }}
            ></div>
          </div>
        </div>

        <div className="product-card-circular_frames composition-preview__overlay" style={{ '--frame-color': selectedFrame?.color || '#ffffff', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
          <div className="product-image-box" style={{ width: '85%', height: '85%', margin: '0' }}>
            <img src={product.image} className="product-image" style={{ width: '73.5%', height: '73.5%', objectFit: 'cover' }} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}
