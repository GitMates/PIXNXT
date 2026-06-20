import React, { useState } from 'react';
import { ShoppingCart, Menu, ChevronLeft } from 'lucide-react';
import { MOCK_PRODUCTS } from '../data/mockStoreData';


export default function StoreHeader({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  activeCollection,
  setActiveCollection,
  isSelectionMode,
  setIsSelectionMode,
  isHeaderThin,
  onOpenMenu,
  onNavigateToShop,
  onOpenTrackOrder,
  hasPlacedOrder,
  customizingProduct,
  onCancelCustomizing,
  onSelectProduct,
  photographer,
  products = []
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
          <nav className="store-nav-links">
            <button
              className={`store-nav-btn ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              Gallery
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
                        <img src={prod.image} alt={prod.name} className="shop-dropdown-item-img" />
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
