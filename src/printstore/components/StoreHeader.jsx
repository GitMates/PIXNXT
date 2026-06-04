import React from 'react';
import { ShoppingCart, Menu, Upload } from 'lucide-react';

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
  onNavigateToShop
}) {
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
            <button
              className={`store-nav-btn ${activeTab === 'shop' ? 'active' : ''}`}
              onClick={() => onNavigateToShop ? onNavigateToShop() : setActiveTab('shop')}
            >
              Shop
            </button>
          </nav>
        </div>

        <div className="store-header-right">
          {/* Select Button - Only show on gallery tab */}
          {activeTab === 'gallery' && (
            <button
              className={`store-header-action-btn select-text-btn ${isSelectionMode ? 'active' : ''}`}
              onClick={() => setIsSelectionMode(!isSelectionMode)}
            >
              {isSelectionMode ? 'Selecting' : 'Select'}
            </button>
          )}

          {/* Share/Upload Button (Icon only) */}
          <button
            className="store-header-icon-btn"
            onClick={() => alert("Collection link copied to clipboard! (Mock share)")}
            aria-label="Share Collection"
          >
            <Upload size={20} strokeWidth={1.5} color="var(--gallery-text, #111111)" />
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
            Kbaskaran
          </div>
        </div>
      </header>
    </div>
  );
}
