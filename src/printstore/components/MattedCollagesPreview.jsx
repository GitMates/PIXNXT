import React from 'react';
import { adjustPhotoUrl } from '../data/mockStoreData';

export default function MattedCollagesPreview({ product, selectedFrame, compositionWidth }) {
  const img1 = product.image || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200";
  const img2 = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200";

  return (
    <div 
      className="product-card-matted_collages" 
      style={{ 
        '--frame-color': selectedFrame?.color || '#111111',
        width: '215px',
        height: '280px',
        transform: `scale(${compositionWidth / 215})`,
        transformOrigin: 'top left',
        background: selectedFrame?.color || '#111111',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    >
      <div 
        className="matted-frame-mat" 
        style={{ 
          width: '183.18px', 
          height: '243.6px', 
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 20px',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="collage-container" 
          style={{ 
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            height: '100%'
          }}
        >
          <img
            src={adjustPhotoUrl(img1, true)}
            alt=""
            className="collage-img"
            style={{
              width: '100%',
              height: 'calc(50% - 6px)',
              minWidth: 0,
              minHeight: 0,
              objectFit: 'cover',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
            }}
          />
          <img
            src={adjustPhotoUrl(img2, true)}
            alt=""
            className="collage-img"
            style={{
              width: '100%',
              height: 'calc(50% - 6px)',
              minWidth: 0,
              minHeight: 0,
              objectFit: 'cover',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
