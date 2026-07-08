import React from 'react';
import { MOCK_PHOTOS } from '../data/mockStoreData';

export default function AllProducts({ products, selectedPhotoUrl, onSelectProduct }) {
  const defaultImg = selectedPhotoUrl || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200";
  const secondImg = selectedPhotoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200";
  const renderProductImage = (product) => {
    const defaultImg = selectedPhotoUrl || product.image;
    const secondImg = selectedPhotoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200";

    if (product.id === 'matted_collages') {
      return (
        <div className="collage-container">
          <img src={defaultImg} alt={product.name} className="collage-img" />
          <img src={defaultImg} alt={product.name} className="collage-img" />
        </div>
      );
    }

    if (product.id === 'prints') {
      return (
        <div className="prints-container">
          <img src={defaultImg} alt={product.name} className="print-img print-img-back" />
          <img src={secondImg} alt={product.name} className="print-img print-img-front" />
        </div>
      );
    }

    if (product.id === 'print_pack') {
      return (
        <div className="print-pack-container">
          {[0, 1, 2, 3].map((i) => (
            <img key={i} src={defaultImg} alt={product.name} className={`print-pack-img img-${i}`} />
          ))}
        </div>
      );
    }

    if (product.id === 'deckled_prints') {
      return (
        <div className="deckled-print-wrapper">
          <img src={defaultImg} alt={product.name} className="deckled-print-img" />
        </div>
      );
    }

    // Default for dibond, gallery_board, canvas, acrylic_prints, circular_frames, float_frames, matted_frame, frames
    const isFloatFrame = product.id === 'float_frames';
    const photoObj = MOCK_PHOTOS.find(p => p.url === defaultImg);
    const isLandscape = photoObj ? photoObj.aspectRatio === '3:2' : (defaultImg && defaultImg.includes('w=1200&h=800'));
    return (
      <img src={defaultImg} alt={product.name} className={`product-image${isFloatFrame && isLandscape ? ' landscape-image' : ''}`} />
    );
  };

  return (
    <section className="shop-section all-products-section" style={{ paddingTop: '2rem' }}>
      {/* Centered shop header banner */}
      <div className="shop-banner" style={{ marginBottom: '3.5rem' }}>
        <h2 className="shop-banner-title" style={{ fontSize: '2.5rem', fontFamily: "'EB Garamond', serif", fontWeight: 400, color: '#111111' }}>
          Bring your favorite photos to life
        </h2>
        <p className="shop-banner-subtitle" style={{ color: '#666666', marginTop: '0.75rem', fontSize: '1.05rem' }}>
          Turn your gallery into high-quality printed products.
        </p>
      </div>

      {/* Grid of all 6 products */}
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className={`product-card product-card-${product.id}`} style={{ display: 'flex', flexDirection: 'column', background: '#f7f7f7', padding: '2rem', transition: 'all 0.3s ease' }}>
            <div className="product-image-box">
              {renderProductImage(product)}
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-footer">
                <span className="product-price">
                  <span>From</span> ₹{product.basePrice.toFixed(2)}
                </span>
                <button
                  className="product-buy-btn"
                  onClick={() => onSelectProduct(product)}
                >
                  Explore
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
