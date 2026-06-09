import React from 'react';

export default function FloatFramesPreview({ product, selectedFrame, currentAspect }) {
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
          width: '78.6987%', height: '82.2006%', top: '8.89968%', left: '10.6507%', backgroundColor: '#ffffff'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '56.25%', height: '65%', top: '17.5%', left: '21.875%'
          }}>
            <img 
              src={product.image}
              alt=""
              className="float-frame-preview-photo"
              style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                left: '0px', 
                top: '0px',
                objectFit: 'cover',
                filter: 'url(#deckled-edge) drop-shadow(3px 6px 10px rgba(0,0,0,0.22))'
              }}
            />
          </div>
        </div>

        <div className="pdp-overlay-float_frames composition-preview__overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none', '--frame-color': selectedFrame?.color && selectedFrame.color !== 'transparent' ? selectedFrame.color : '#d2b48c' }}></div>
      </div>
    </div>
  );
}
