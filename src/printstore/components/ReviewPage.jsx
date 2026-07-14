import React, { useState, useEffect } from 'react';
import { Trash2, Info, Mail, Phone } from 'lucide-react';
import '../PrintStore.css';
import CartItemPreview from './CartItemPreview';

const DIGITAL_PRODUCTS = ['digital_download', 'digital_download_all'];

export default function ReviewPage({
  cartItems,
  collectionPhotos = [],
  collectionId = '',
  onUpdateQuantity,
  onRemoveItem,
  onBack,
  onContinueToPayment,
  sessionId,
  initialAddress
}) {
  const [customerEmail, setCustomerEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(initialAddress?.phoneNumber || initialAddress?.phone || '');
  const [street, setStreet] = useState(initialAddress?.street || initialAddress?.address || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [zipCode, setZipCode] = useState(initialAddress?.zipCode || initialAddress?.zip || '');
  const [recipientName, setRecipientName] = useState(initialAddress?.recipientName || initialAddress?.accountName || '');
  const [formError, setFormError] = useState('');

  const allDigital = cartItems.length > 0 && cartItems.every(i => DIGITAL_PRODUCTS.includes(i.productId));

  useEffect(() => {
    function loadEmail() {
      if (collectionId) {
        const visitorEmail = localStorage.getItem(`pixnxt_fav_email_${collectionId}`);
        if (visitorEmail) {
          setCustomerEmail(visitorEmail);
          return;
        }
      }

      try {
        const cached = localStorage.getItem('pixnxt_printstore_address');
        const parsed = cached ? JSON.parse(cached) : null;
        if (parsed?.email) {
          setCustomerEmail(parsed.email);
          return;
        }
      } catch (_) {}

      setCustomerEmail('');
    }
    loadEmail();
  }, [collectionId]);

  useEffect(() => {
    if (!initialAddress) return;
    setPhoneNumber(initialAddress.phoneNumber || initialAddress.phone || '');
    setStreet(initialAddress.street || initialAddress.address || '');
    setCity(initialAddress.city || '');
    setZipCode(initialAddress.zipCode || initialAddress.zip || '');
    setRecipientName(initialAddress.recipientName || initialAddress.accountName || '');
  }, [initialAddress]);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = allDigital ? 0 : (itemsTotal > 0 ? 111.04 : 0);
  const estimatedTotal = itemsTotal + shipping;

  const handleContinue = () => {
    setFormError('');
    if (!allDigital) {
      const phone = String(phoneNumber || '').replace(/\D/g, '');
      if (!recipientName.trim()) {
        setFormError('Enter recipient name.');
        return;
      }
      if (!street.trim() || !city.trim() || !zipCode.trim()) {
        setFormError('Enter a complete shipping address.');
        return;
      }
      if (phone.length < 10) {
        setFormError('Enter a valid 10-digit phone number for delivery / WhatsApp.');
        return;
      }
    }

    const email = customerEmail
      || (collectionId ? localStorage.getItem(`pixnxt_fav_email_${collectionId}`) : '')
      || initialAddress?.email
      || '';

    onContinueToPayment({
      ...(initialAddress || {}),
      recipientName: recipientName || initialAddress?.recipientName || '',
      accountName: recipientName || initialAddress?.accountName || '',
      email,
      street: street || initialAddress?.street || '',
      address: street || initialAddress?.address || '',
      city: city || initialAddress?.city || '',
      zipCode: zipCode || initialAddress?.zipCode || '',
      zip: zipCode || initialAddress?.zip || '',
      phoneNumber: String(phoneNumber || '').replace(/\D/g, ''),
      phone: String(phoneNumber || '').replace(/\D/g, ''),
      country: 'India',
    });
  };

  return (
    <div className="cart-page-container">
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
                <div className="pt-editor-header__caption-text">Review items ({totalItems} items)</div>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="cart-page-content">
        <div className="cart-items-column">
          {allDigital ? (
            <div className="delivery-summary-block" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Mail size={20} color="#555" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Your downloads will be sent to your email
                </h3>
                {customerEmail && (
                  <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#555', fontWeight: 500 }}>
                    {customerEmail}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                  High-resolution files will be available after payment confirmation.
                </p>
              </div>
            </div>
          ) : (
            <div className="delivery-summary-block">
              <h3>We'll deliver the items to:</h3>
              <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  placeholder="Street address"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="ZIP / PIN"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#777" style={{ position: 'absolute', left: 12, top: 13 }} />
                  <input
                    type="tel"
                    placeholder="Phone number (WhatsApp)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                {formError && (
                  <p style={{ margin: 0, color: '#d32f2f', fontSize: '12px' }}>{formError}</p>
                )}
              </div>
            </div>
          )}

          <hr className="review-divider" />

          <div className="review-items-container">
            {cartItems.length === 0 ? (
              <div className="cart-empty-message">Your cart is empty.</div>
            ) : (
              cartItems.map((item) => {
                const isFramed = ['matted_frame', 'frames', 'float_frames', 'circular_frames', 'matted_collages'].includes(item.productId);
                const isDigital = DIGITAL_PRODUCTS.includes(item.productId);
                return (
                  <div key={item.id} className="cart-page-item review-page-item">
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
                      <div className="cart-item-price-mobile">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </div>

                      {!isDigital && (
                        <div className="cart-quantity-control">
                          <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                      )}

                      <div className="cart-item-actions">
                        <button className="cart-delete-btn" onClick={() => onRemoveItem(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="review-item-right">
                      <div className="cart-item-price">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                      {!isDigital && (
                        <div className="international-delivery-badge">
                          International<br />delivery
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="cart-summary-column">
          <div className="cart-summary-box">
            <div className="summary-total-row">
              <span className="summary-total-label">Estimated total:</span>
              <span className="summary-total-value">₹{estimatedTotal.toFixed(2)} INR</span>
            </div>

            <button
              className="continue-shipping-btn"
              onClick={handleContinue}
              disabled={cartItems.length === 0}
            >
              Continue to payment
            </button>

            <div className="payment-details-section">
              <h4>Payment details</h4>

              <div className="payment-row">
                <div className="payment-label-col">
                  <span>Items ({totalItems})</span>
                </div>
                <div className="payment-value-col">
                  <span>₹{itemsTotal.toFixed(2)}</span>
                </div>
              </div>

              {!allDigital && (
                <>
                  <div className="payment-row">
                    <span className="payment-label">Shipping <Info size={14} color="#777" /></span>
                    <span className="payment-value">₹{shipping.toFixed(2)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="payment-label">Taxes <Info size={14} color="#777" /></span>
                    <span className="payment-value">₹0.00</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
