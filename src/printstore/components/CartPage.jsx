import React, { useState } from 'react';
import { Trash2, Info, Plus, X, Check } from 'lucide-react';
import '../PrintStore.css';
import CartItemPreview from './CartItemPreview';

const DIGITAL_PRODUCTS = ['digital_download', 'digital_download_all'];

export default function CartPage({
  cartItems,
  collectionPhotos = [],
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onUpdateItemPhoto,   // (itemId, newPhoto) => void
  onBack,
  onContinueToShipping
}) {
  const [photoPickerItemId, setPhotoPickerItemId] = useState(null);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = itemsTotal > 0 ? 111.04 : 0;
  const estimatedTotal = itemsTotal + shipping;

  const pickerItem = cartItems.find(i => i.id === photoPickerItemId);

  return (
    <div className="cart-page-container" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="pdp-products-page__header" style={{ background: '#ffffff', borderBottom: '1px solid #eee', margin: '0 -40px' }}>
        <div className="pt-editor-header-wrapper">
          <div className="pt-editor-header pt-container">
            <div className="pt-editor-header__left">
              <button className="BS-5-3-3" type="button" onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <div className="pt-button__content">
                  <div className="pt-button__inner">
                    <svg viewBox="0 0 20 20" className="IS-7" style={{ width: '24px', height: '24px', fill: 'currentColor' }}>
                      <path d="M14.53 17.47a.75.75 0 1 1-1.06 1.06l-8-8a.75.75 0 0 1 0-1.06l8-8a.75.75 0 1 1 1.06 1.06L7.06 10l7.47 7.47Z" />
                    </svg>
                  </div>
                </div>
              </button>
              <span className="pt-editor-header__caption SF-1-4" style={{ marginLeft: '16px', fontSize: '24px', fontWeight: '500', color: '#333' }}>
                <div className="pt-editor-header__caption-text">Cart ({totalItems} items)</div>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="cart-page-content">
        {/* Left Column: Items */}
        <div className="cart-items-column">
          {cartItems.length === 0 ? (
            <div className="cart-empty-message">Your cart is empty.</div>
          ) : (
            cartItems.map((item) => {
              const isFramed = ['matted_frame', 'frames', 'float_frames', 'circular_frames', 'matted_collages'].includes(item.productId);
              const isDigital = DIGITAL_PRODUCTS.includes(item.productId);
              const isSingleDownload = item.productId === 'digital_download';
              return (
                <div key={item.id} className="cart-page-item">
                  <div className={`cart-item-image-wrapper product-card-${item.productId} ${isFramed ? 'has-frame-size' : ''}`} style={{ '--frame-color': item.frame?.color || 'transparent' }}>
                    <div className="cart-item-product-image-box">
                      <CartItemPreview item={item} collectionPhotos={collectionPhotos} />
                    </div>
                  </div>

                  <div className="cart-item-info">
                    <h4 className="cart-item-title">{item.productName}</h4>
                    <p className="cart-item-meta">
                      {item.size?.label ? `${item.size.label}, ` : ''}{item.frame && item.frame.id !== 'frame_none' && item.frame.label !== 'No Frame' && item.frame.label !== 'No Frame (Print Only)' ? item.frame.label + ', ' : ''}{item.paper?.label || ''}
                      {item.layout && <>, Layout: {item.layout.icon?.replace(/_/g, ' ')} ({item.layout.photos} photos)</>}
                      {item.productId === 'digital_download_all' && collectionPhotos.length > 0 && (
                        <span style={{ display: 'block', marginTop: '4px', fontWeight: 600, color: '#111', fontSize: '13px' }}>
                          {collectionPhotos.length} photos included
                        </span>
                      )}
                    </p>

                    {/* Quantity — hidden for digital downloads */}
                    {!isDigital && (
                      <div className="cart-quantity-control">
                        <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                    )}

                    <div className="cart-item-actions">
                      {/* Edit: shown for print products + single photo download (opens photo picker) */}
                      {!isDigital && (
                        <button className="cart-edit-btn" onClick={() => onEditItem(item)}>Edit</button>
                      )}
                      {isSingleDownload && collectionPhotos.length > 0 && (
                        <button
                          className="cart-edit-btn"
                          onClick={() => setPhotoPickerItemId(item.id)}
                        >
                          Change Photo
                        </button>
                      )}
                      <button className="cart-delete-btn" onClick={() => onRemoveItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-price">
                    ₹{(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Summary */}
        <div className="cart-summary-column">
          <div className="cart-summary-box">
            <div className="summary-total-row">
              <span className="summary-total-label">Estimated total:</span>
              <span className="summary-total-value">₹{estimatedTotal.toFixed(2)} INR</span>
            </div>

            <button
              className="continue-shipping-btn"
              onClick={onContinueToShipping}
              disabled={cartItems.length === 0}
            >
              Continue to shipping
            </button>

            <div className="payment-details-section">
              <h4>Payment details</h4>

              <div className="payment-row">
                <div className="payment-label-col">
                  <span>Items ({totalItems})</span>
                </div>
                <div className="payment-value-col">
                  <span>₹{itemsTotal.toFixed(2)}</span>
                  <span className="payment-subtext">Not including taxes</span>
                </div>
              </div>

              <div className="payment-row">
                <span className="payment-label">Shipping <Info size={14} color="#777" /></span>
                <span className="payment-value">₹{shipping.toFixed(2)}</span>
              </div>

              <div className="payment-row">
                <span className="payment-label">Taxes <Info size={14} color="#777" /></span>
                <span className="payment-value">₹0.00</span>
              </div>

              <div className="coupons-section">
                <span className="coupons-label"><Info size={14} color="#777" style={{marginRight: '4px'}}/> Coupons</span>
                <div className="coupon-input-row">
                  <input type="text" placeholder="Enter coupon code" />
                  <button className="apply-coupon-btn"><Plus size={14} /> Apply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo Picker Sidebar for single digital download ── */}
      {photoPickerItemId && pickerItem && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setPhotoPickerItemId(null)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
              zIndex: 900, cursor: 'pointer',
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '360px', backgroundColor: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
            zIndex: 901, display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', sans-serif",
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f0',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111' }}>Choose Photo</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                  Select a different photo for your download
                </p>
              </div>
              <button
                onClick={() => setPhotoPickerItemId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#555' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current selection */}
            {(() => {
              const currentPhoto = pickerItem.options?.photo || pickerItem.photo;
              const currentSrc = currentPhoto?.web_url || currentPhoto?.thumbnail_url || currentPhoto?.url || '';
              return currentSrc ? (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fafafa' }}>
                  <img src={currentSrc} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #111' }} />
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Currently selected</span>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Scrollable photo grid — each cell wrapped so padding creates spacing, not gap (immune to CSS overrides) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}>
              {collectionPhotos.map((photo, idx) => {
                const src = photo.url || photo.web_url || photo.thumbnail_url || photo.full_url || '';
                const currentPhoto = pickerItem.options?.photo || pickerItem.photo;
                const isSelected = currentPhoto?.id === photo.id || currentPhoto?.url === photo.url;
                return (
                  /* Padding wrapper — creates gap between cells without relying on CSS gap */
                  <div key={idx} style={{ padding: '5px' }}>
                    <div
                      onClick={() => {
                        if (onUpdateItemPhoto) onUpdateItemPhoto(photoPickerItemId, photo);
                        setPhotoPickerItemId(null);
                      }}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        outline: isSelected ? '2.5px solid #111' : '2px solid transparent',
                        outlineOffset: '1px',
                        transition: 'outline-color 0.15s, transform 0.15s',
                        boxShadow: isSelected ? '0 0 0 1px #111' : '0 1px 4px rgba(0,0,0,0.12)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isSelected && (
                        <div style={{
                          position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.28)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ backgroundColor: '#111', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                            <Check size={14} color="#fff" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0' }}>
              <button
                onClick={() => setPhotoPickerItemId(null)}
                style={{
                  width: '100%', padding: '12px', backgroundColor: '#111', color: '#fff',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, letterSpacing: '0.03em',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
