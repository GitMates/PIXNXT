import React from 'react';

export default function FramesPreview({ product, selectedFrame, currentAspect }) {
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
          width: '69.7802%', height: '76.3746%', top: '11.8127%', left: '15.1099%'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '64%', height: '68.5714%', top: '15.8095%', left: '18%'
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

        <div className="matted-frame-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
          <div className="matted-frame-shadow" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: selectedFrame?.color || '#111111', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="matted-frame-mat" style={{ width: '84%', height: '87%', backgroundColor: '#fff' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
