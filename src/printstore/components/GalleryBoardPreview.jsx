import React from 'react';

export default function GalleryBoardPreview({ product, currentAspect }) {
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
          width: '78.33%', height: '84.14%', top: '7.92%', left: '10.83%'
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

        <div className="gallery-board-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: '#fff', boxShadow: 'rgba(0, 0, 0, 0) 33px 33px 13px 0px, rgba(0, 0, 0, 0.01) 21px 21px 12px 0px, rgba(0, 0, 0, 0.05) 12px 12px 10px 0px, rgba(0, 0, 0, 0.09) 5px 5px 7px 0px, rgba(0, 0, 0, 0.1) 1px 1px 4px 0px' }}></div>
      </div>
    </div>
  );
}
