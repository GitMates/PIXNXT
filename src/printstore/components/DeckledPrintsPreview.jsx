import React from 'react';

export default function DeckledPrintsPreview({ product, selectedBorder, currentAspect }) {
  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: `${currentAspect.toFixed(6)} / 1`, 
        width: '100%', 
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out',
        transform: 'rotate(-7deg)', 
        transformOrigin: 'center center'
      }}>
        <div className="composition-preview__printable-area" style={{ 
          position: 'absolute',
          width: '100%', 
          height: '100%', 
          top: '0%', 
          left: '0%', 
          backgroundColor: selectedBorder === 'white' ? '#ffffff' : 'transparent', 
          padding: selectedBorder === 'white' ? '8%' : '0', 
          boxSizing: 'border-box'
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '100%', height: '100%', top: '0%', left: '0%'
          }}>
            <img 
              src={product.image}
              alt=""
              className="deckled-print-preview-photo"
              style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                left: '0px', 
                top: '0px',
                objectFit: 'cover',
                filter: 'url(#slight-deckled-edge) drop-shadow(2px 4px 8px rgba(0,0,0,0.18))'
              }}
            />
          </div>
        </div>

        <div className="deckled-print-pdp-overlay composition-preview__overlay" style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none'
        }}>
          <div className="deckled-print-pdp-overlay__matte" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
            <div className="deckled-print-pdp-overlay__photo-box" style={{ position: 'absolute', top: '0%', left: '0%', width: '100%', height: '100%' }}></div>
          </div>
          <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--top"></div>
          <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--bottom"></div>
          <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--left"><div className="deckled-print-pdp-overlay__deckle-tile"></div></div>
          <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--right"><div className="deckled-print-pdp-overlay__deckle-tile"></div></div>
        </div>
      </div>
    </div>
  );
}
