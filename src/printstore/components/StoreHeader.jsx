import React, { useState } from 'react';
import { ShoppingCart, Menu, ChevronLeft, Bell } from 'lucide-react';
import { MOCK_PRODUCTS } from '../data/mockStoreData';


const renderMiniFrame = (productId, photoUrl) => {
  return (
    <div className={`shop-dropdown-item-img-wrapper mini-frame-${productId}`} style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', position: 'relative', transition: 'transform 0.2s ease' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', position: 'relative' }}>
        {productId === 'matted_collages' ? (
          <div style={{ display: 'flex', gap: '4px', padding: '6px', background: '#fdfdfd', border: '3.5px solid #111111', width: '74px', height: '74px', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <img src={photoUrl} alt="preview" style={{ width: '47%', height: '100%', objectFit: 'cover' }} />
            <img src={photoUrl} alt="preview" style={{ width: '47%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'prints' ? (
          <div style={{ width: '70px', height: '70px', background: '#fff', border: '1px solid #e2e8f0', padding: '4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'print_pack' ? (
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <div style={{ position: 'absolute', top: '4px', left: '4px', width: '60px', height: '60px', background: '#fff', border: '1px solid #e2e8f0', padding: '1px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', transform: 'rotate(-6deg)' }}>
              <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', top: '0px', left: '0px', width: '60px', height: '60px', background: '#fff', border: '1px solid #e2e8f0', padding: '1px', boxShadow: '0 3px 6px rgba(0,0,0,0.12)', transform: 'rotate(5deg)', zIndex: 2 }}>
              <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        ) : productId === 'circular_frames' ? (
          <div style={{ 
            width: '74px', 
            height: '74px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '4.5px solid #5d4037', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.22)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#f9f9f9',
            padding: '5px',
            boxSizing: 'border-box'
          }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          </div>
        ) : productId === 'matted_frame' ? (
          <div style={{ width: '74px', height: '74px', background: '#fdfdfd', border: '4.5px solid #111111', padding: '6px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }} />
          </div>
        ) : productId === 'frames' ? (
          <div style={{ width: '74px', height: '74px', border: '4.5px solid #6d4c41', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)', background: '#fff' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'float_frames' ? (
          <div style={{ width: '74px', height: '74px', border: '4.5px solid #111111', padding: '6px', boxSizing: 'border-box', background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
            <div style={{ width: '100%', height: '100%', background: '#fff', padding: '1px', boxShadow: '2px 4px 6px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        ) : productId === 'canvas' ? (
          <div style={{ width: '72px', height: '72px', boxShadow: '2px 4px 8px rgba(0,0,0,0.25)', border: '1px solid #ccc', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRightWidth: '4px', borderBottomWidth: '4px', transform: 'perspective(100px) rotateY(-8deg)', background: '#fff' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'acrylic_prints' ? (
          <div style={{ width: '72px', height: '72px', boxShadow: '0 4px 12px rgba(0,0,0,0.22)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.4)', background: '#000' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)', zIndex: 1 }} />
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'gallery_board' || productId === 'gallery_boards' ? (
          <div style={{ width: '72px', height: '72px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.12)', padding: '5px', boxSizing: 'border-box' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'dibond' ? (
          <div style={{ width: '72px', height: '72px', position: 'relative', boxShadow: '2px 4px 10px rgba(0,0,0,0.18)', border: '1px solid #ddd', background: '#fff' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : productId === 'deckled_prints' ? (
          <div style={{ width: '72px', height: '72px', background: '#fff', padding: '5px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '1px 2px 5px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '100%', height: '100%', border: '1px dashed #bbb', padding: '1px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        ) : productId === 'panoramic_prints' ? (
          <div style={{ width: '78px', height: '48px', background: '#fff', border: '1px solid #ddd', padding: '3px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '1px 2px 4px rgba(0,0,0,0.1)' }}>
            <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <img src={photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    </div>
  );
};

export default function StoreHeader({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  activeCollection,
  setActiveCollection,
  isSelectionMode,
  setIsSelectionMode,
  activePhoto,
  activePhotoIndex,
  isHeaderThin,
  onOpenMenu,
  onNavigateToShop,
  onOpenTrackOrder,
  hasPlacedOrder,
  customizingProduct,
  onCancelCustomizing,
  onSelectProduct,
  photographer,
  products = [],
  notificationCount = 0,
  onOpenNotifications,
  selectedPhotoUrl
}) {
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);

  if (customizingProduct) {
    return (
      <div className="store-header-wrapper">
        <header className="store-header thin-header" style={{ justifyContent: 'flex-start', height: '64px', borderBottom: '1px solid #eee' }}>
          <div 
            onClick={onCancelCustomizing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '0 1.5rem',
              fontSize: '15px',
              fontFamily: 'var(--font-heading)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontWeight: 500
            }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color="#111" />
            <span style={{ textDecoration: 'underline' }}>{activeCollection || 'portraits'}</span>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="store-header-wrapper">
      <header className={`store-header ${isHeaderThin ? 'thin-header' : ''}`}>
        <div className="store-header-left">
          {/* Gallery / Shop Tab Toggle */}
          <nav className="store-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              className="store-nav-btn"
              onClick={() => {
                const searchParams = new URLSearchParams(window.location.search);
                const slug = searchParams.get('slug') || searchParams.get('collection');
                if (slug) {
                  window.location.assign(`/gallery/${slug}?socialSharing=1`);
                } else {
                  window.location.assign('/');
                }
              }}
              style={{ fontWeight: 400, opacity: 0.8 }}
            >
              Back to Gallery
            </button>
            <div
              className="store-shop-nav-container"
              onMouseEnter={() => setIsShopDropdownOpen(true)}
              onMouseLeave={() => setIsShopDropdownOpen(false)}
              style={{ display: 'inline-block' }}
            >
              <button
                className={`store-nav-btn ${activeTab === 'shop' ? 'active' : ''}`}
                onClick={() => onNavigateToShop ? onNavigateToShop() : setActiveTab('shop')}
              >
                Shop
              </button>
              {isShopDropdownOpen && (
                <div className="shop-hover-dropdown">
                  <div className="shop-dropdown-list">
                    {(products && products.length > 0 ? products : MOCK_PRODUCTS).map((prod) => (
                      <div 
                        key={prod.id} 
                        className="shop-dropdown-item"
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(prod);
                          setIsShopDropdownOpen(false);
                        }}
                      >
                        {renderMiniFrame(prod.id, selectedPhotoUrl || prod.image)}
                        <span className="shop-dropdown-item-name">{prod.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="store-header-right">
          {/* Track Order Button */}
          {hasPlacedOrder && (
            <button
              className="store-header-action-btn select-text-btn"
              onClick={() => onOpenTrackOrder && onOpenTrackOrder()}
            >
              Track Order
            </button>
          )}





          {/* Bell Icon with badge count (Alerts) */}
          <button 
            className="cart-icon-wrapper" 
            onClick={onOpenNotifications}
            aria-label="View Alerts"
            style={{ marginRight: '8px', position: 'relative' }}
          >
            <Bell size={20} strokeWidth={1.5} color="var(--gallery-text, #111111)" />
            {notificationCount > 0 && (
              <span className="cart-badge cart-badge-filled" style={{ background: '#ea580c' }}>
                {notificationCount}
              </span>
            )}
          </button>

          {/* Cart Icon with badge count - always rendered to prevent shaking */}
          <button 
            className="cart-icon-wrapper" 
            onClick={onOpenCart}
            aria-label="View Cart"
          >
            <ShoppingCart size={20} strokeWidth={1.5} color="var(--gallery-text, #111111)" />
            <span className={`cart-badge ${cartCount > 0 ? 'cart-badge-filled' : 'cart-badge-empty'}`}>
              {cartCount > 0 ? cartCount : ''}
            </span>
          </button>

          {/* Hamburger Menu Icon */}
          <button 
            className="store-header-icon-btn menu-btn"
            onClick={onOpenMenu}
            aria-label="Toggle Menu"
          >
            <Menu size={20} strokeWidth={1.5} color="var(--gallery-text, #111111)" />
          </button>

          {/* Photographer Branding */}
          <div className="store-photographer-logo">
            {photographer?.display_name || ''}
          </div>
        </div>
      </header>
    </div>
  );
}
