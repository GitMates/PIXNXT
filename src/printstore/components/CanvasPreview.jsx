import React from 'react';

export default function CanvasPreview({ product, currentAspect, isRoomPreview }) {
  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: `${currentAspect.toFixed(6)} / 1`, 
        width: '100%', 
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out',
        clipPath: 'inset(17.28%)', 
        borderRadius: '0.13px'
      }}>
        <div className="composition-preview__printable-area" style={{ 
          position: 'absolute',
          width: '100%', height: '100%', top: '0%', left: '0%'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '100%', height: '100%', top: '0%', left: '0%'
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

        <div className="canvas-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, scale: isRoomPreview ? '0.654443' : '1', borderRadius: '0.13px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 15px 16px 3px, rgba(0, 0, 0, 0.06) 0px 0px 7px 3px, rgba(0, 0, 0, 0.25) -1px -1px 3px 0px inset, rgba(0, 0, 0, 0.1) 1px 1px 1px 0px inset, rgba(255, 255, 255, 0.25) 3.5px 3.5px 1px 0px inset', overflow: 'hidden' }}></div>
      </div>
    </div>
  );
}
