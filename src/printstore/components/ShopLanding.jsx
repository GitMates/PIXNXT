import React from 'react';

export default function ShopLanding({ products, onSelectProduct, onExploreAll }) {
  return (
    <section className="shop-section">
      {/* Centered shop header banner */}
      <div className="shop-banner">
        <h2 className="shop-banner-title">Bring your favorite photos to life</h2>
        <p className="shop-banner-subtitle">
          Turn your gallery into high-quality printed products.
        </p>
      </div>

      {/* Grid of product categories */}
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className={`product-card product-card-${product.id}`}>
            <div className="product-image-box">
              {product.id === 'matted_collages' ? (
                <div className="collage-container">
                  <img
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"
                    alt={product.name}
                    className="collage-img"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"
                    alt={product.name}
                    className="collage-img"
                  />
                </div>
              ) : product.id === 'prints' ? (
                <div className="prints-container">
                  <img
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"
                    alt={product.name}
                    className="print-img print-img-back"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200"
                    alt={product.name}
                    className="print-img print-img-front"
                  />
                </div>
              ) : product.id === 'print_pack' ? (
                <div className="print-pack-container">
                  {[0, 1, 2, 3].map((i) => (
                    <img
                      key={i}
                      src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"
                      alt={product.name}
                      className={`print-pack-img img-${i}`}
                    />
                  ))}
                </div>
              ) : product.id === 'deckled_prints' ? (
                <div className="deckled-print-wrapper">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="deckled-print-img"
                  />
                </div>
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                />
              )}
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
                  Customize
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Explore footer button */}
      <div className="explore-all-box">
        <button
          className="explore-btn"
          onClick={onExploreAll}
        >
          Explore all products
        </button>
      </div>
    </section>
  );
}
