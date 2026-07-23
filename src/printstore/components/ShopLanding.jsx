import React from 'react';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { galleryService } from '../../services/gallery.service';

export default function ShopLanding({ products, selectedPhotoUrl, onSelectProduct, onExploreAll, photos = [], collection, onUnlockVault }) {
  // When shop was opened from a specific gallery photo, use that photo for ALL previews.
  // Never mix in other gallery photos — that looked like frames “randomly choosing” images.
  const primaryPhotoUrl =
    selectedPhotoUrl
    || photos[0]?.url
    || photos[0]?.web_url
    || "";
  const firstPhotoUrl = primaryPhotoUrl;
  const secondPhotoUrl = primaryPhotoUrl;

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const vaultPurchased = collection?.id ? (localStorage.getItem(`pixnxt_vault_purchased_${collection.id}`) === 'true') : false;

  const [vaultPlan, setVaultPlan] = React.useState(null);
  React.useEffect(() => {
    if (collection?.id) {
      galleryService.fetchVaultPlan(collection.id).then(plan => {
        if (plan) setVaultPlan(plan);
      });
    }
  }, [collection?.id]);

  const vaultEnabled = vaultPlan?.vault_enabled === true;

  return (
    <section className="shop-section">
      {/* Permanent Vault Storage Countdown Banner */}
      {collection?.auto_expiry && vaultEnabled && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 32px auto', width: '100%' }}>
          {!vaultPurchased ? (
            <div style={{
              background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
              color: '#ffffff',
              padding: '24px 32px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              borderRadius: '8px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '28px' }}>⏳</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Gallery Expiry Countdown
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', lineHeight: 1.4 }}>
                    This gallery is scheduled to expire in <strong style={{ color: '#ffffff' }}>{getDaysRemaining(collection.auto_expiry)} days</strong> (on {new Date(collection.auto_expiry).toLocaleDateString('en-IN', { dateStyle: 'medium' })}). Unlock Permanent Vault to host these photos forever.
                  </p>
                </div>
              </div>
              <button
                onClick={onUnlockVault}
                style={{
                  background: '#ffffff',
                  color: '#111111',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                Unlock Lifetime Access (₹{localStorage.getItem(`pixnxt_vault_price_${collection.id}`) || '499'})
              </button>
            </div>
          ) : (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #bbf7d0',
              color: '#065f46',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-heading, "Outfit", sans-serif)'
            }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Permanent Vault Storage Active
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#047857' }}>
                  This gallery has been upgraded to permanent hosting. It will not expire.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
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
                  <img src={firstPhotoUrl} alt={product.name} className="collage-img" />
                  <img src={secondPhotoUrl} alt={product.name} className="collage-img" />
                </div>
              ) : product.id === 'prints' ? (
                <div className="prints-container">
                  <img src={firstPhotoUrl} alt={product.name} className="print-img print-img-back" />
                  <img src={secondPhotoUrl} alt={product.name} className="print-img print-img-front" />
                </div>
              ) : product.id === 'print_pack' ? (
                <div className="print-pack-container">
                  {[0, 1, 2, 3].map((i) => (
                    <img key={i} src={firstPhotoUrl || product.image} alt={product.name} className={`print-pack-img img-${i}`} />
                  ))}
                </div>
              ) : product.id === 'deckled_prints' ? (
                <div className="deckled-print-wrapper">
                  <img src={firstPhotoUrl} alt={product.name} className="deckled-print-img" />
                </div>
              ) : (
                (() => {
                  const defaultImg = firstPhotoUrl;
                  const isFloatFrame = product.id === 'float_frames';
                  const photoObj = MOCK_PHOTOS.find(p => p.url === defaultImg);
                  const isLandscape = photoObj ? photoObj.aspectRatio === '3:2' : (defaultImg && defaultImg.includes('w=1200&h=800'));
                  return (
                    <img 
                      src={defaultImg} 
                      alt={product.name} 
                      className={`product-image${isFloatFrame && isLandscape ? ' landscape-image' : ''}`} 
                    />
                  );
                })()
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
                  Explore
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
