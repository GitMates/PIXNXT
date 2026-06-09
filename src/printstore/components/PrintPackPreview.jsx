import React from 'react';

export default function PrintPackPreview({ product }) {
  return (
    <div 
      className="product-card-print_pack wall-preview-print-pack" 
      style={{ 
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'transparent'
      }}
    >
      <style>{`.wall-preview-print-pack.product-card-print_pack { background: transparent !important; }`}</style>
      <div 
        className="print-pack-container" 
        style={{ 
          margin: 0,
          width: '100%',
          height: '100%'
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <img 
            key={i} 
            src={product.image || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"} 
            alt="" 
            className={`print-pack-img img-${i}`} 
          />
        ))}
      </div>
    </div>
  );
}
