import React from 'react';

export default function PanoramicPrintsPreview({ product, currentAspect }) {
  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: '118.1 / 249.33', 
        width: '100%', 
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out'
      }}>
        <div className="composition-preview__printable-area" style={{ 
          position: 'absolute',
          width: '100%', height: '100%', top: '0%', left: '0%'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '100%', height: '100%', top: '0%', left: '0%'
          }}>
            <img
              src={product.image}
              alt="Panoramic Print"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block'
              }}
            />
          </div>
        </div>

        <div className="panoramic-print-pdp-overlay composition-preview__overlay" style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none',
          boxShadow: 'rgba(0,0,0,0) 33px 33px 13px 0px, rgba(0,0,0,0.01) 21px 21px 12px 0px, rgba(0,0,0,0.05) 12px 12px 10px 0px, rgba(0,0,0,0.09) 5px 5px 7px 0px, rgba(0,0,0,0.1) 1px 1px 4px 0px'
        }}></div>
      </div>
    </div>
  );
}
