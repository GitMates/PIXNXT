import React, { useState, useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import CartItemPreview from './CartItemPreview';
import paymentSuccessAnimation from '../../assets/animations/payment-success.json';


export default function PaymentPage({
  cartItems,
  collectionPhotos = [],
  collectionId = '',
  onBack,
  onPaymentSuccess,
  onPlaceOrder,
  shippingAddress
}) {
  const [showDetails, setShowDetails] = useState(true);

  // Freeze cart for this screen so totals never flash to ₹0 while order is placing
  const lockedCartRef = useRef(null);
  useEffect(() => {
    if (!lockedCartRef.current && Array.isArray(cartItems) && cartItems.length > 0) {
      lockedCartRef.current = cartItems;
    }
  }, [cartItems]);

  const displayCart =
    (lockedCartRef.current && lockedCartRef.current.length > 0)
      ? lockedCartRef.current
      : (cartItems || []);

  const DIGITAL_PRODUCTS = ['digital_download', 'digital_download_all', 'digital_package'];
  const allDigital = displayCart.length > 0 && displayCart.every(i => DIGITAL_PRODUCTS.includes(i.productId));
  const hasDigital = displayCart.some(i => DIGITAL_PRODUCTS.includes(i.productId));
  const hasPhysical = displayCart.some(i => !DIGITAL_PRODUCTS.includes(i.productId));
  const mixedCart = hasDigital && hasPhysical;

  const totalItems = displayCart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const itemsTotal = displayCart.reduce((acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
  const shipping = allDigital ? 0 : (itemsTotal > 0 ? 111.04 : 0);
  const taxes = 0.00;
  const estimatedTotal = itemsTotal + shipping + taxes;

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: shippingAddress?.email || (collectionId ? localStorage.getItem(`pixnxt_fav_email_${collectionId}`) : '') || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (shippingAddress?.email) {
      setFormData((prev) => ({ ...prev, email: shippingAddress.email }));
    }
  }, [shippingAddress?.email]);

  const handlePayNow = async () => {
    if (!displayCart.length || estimatedTotal <= 0) {
      setErrors({ submit: 'Your cart is empty or total is ₹0. Go back and add a paid item.' });
      return;
    }

    const newErrors = {};
    const email = shippingAddress?.email || formData.email;
    if (!email) newErrors.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      if (onPlaceOrder) {
        await onPlaceOrder({
          name: shippingAddress?.recipientName || shippingAddress?.accountName || '',
          email: shippingAddress?.email || formData.email,
          address: shippingAddress?.street || shippingAddress?.address || '',
          city: shippingAddress?.city || '',
          zip: shippingAddress?.zipCode || shippingAddress?.zip || '',
          phone: shippingAddress?.phoneNumber || shippingAddress?.phone || '',
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
      }, 2800);
    } catch (err) {
      console.error('Failed to place order:', err);
      setErrors({ submit: err?.message || 'Failed to place order. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cart-page-container payment-page-container">
      {isSuccess && (
        <div className="success-overlay">
          <div style={{ width: 160, height: 160 }}>
            <Lottie
              animationData={paymentSuccessAnimation}
              loop={false}
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="success-text" style={{ opacity: 1, animation: 'none' }}>Payment Successful!</div>
        </div>
      )}

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
                <div className="pt-editor-header__caption-text">Payment ({totalItems} items)</div>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="cart-page-content">
        {/* Left Column: Payment Options */}
        <div className="cart-items-column">

          {mixedCart && (
            <div className="digital-delivery-notice payment-mixed-delivery-notice">
              <div>
                <p className="digital-delivery-notice__title">This order includes digital downloads and printed items</p>
                <p className="digital-delivery-notice__text">
                  Printed products will be shipped to your address.
                  {' '}Your digital images will be sent to{' '}
                  <strong>{shippingAddress?.email || formData.email || 'your email'}</strong>
                  {' '}after payment.
                </p>
              </div>
            </div>
          )}
          
          <div className="payment-security-notice">
            <div className="security-icon-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
              <h3>Secure online payment</h3>
            </div>
            <p>
              We never store your payment details. Once your payment is processed, your order will be placed and you'll get a confirmation email. Due to the custom nature of printed products, orders are final and can't be modified or canceled once they're placed.
            </p>
          </div>

          <div className="payment-form-box">
            <div className="credit-card-form">
              {!shippingAddress?.email && (
                <div className="form-group">
                  <label>Email {errors.email && <span style={{color: '#d32f2f', marginLeft: '8px'}}>{errors.email}</span>}</label>
                  <input type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ borderColor: errors.email ? '#d32f2f' : '#ccc' }} />
                </div>
              )}
              <p style={{ margin: '0 0 16px', color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Pay now opens Razorpay. Cards, UPI, and netbanking stay on Razorpay’s page. This store does not keep the card number.
              </p>
              {errors.submit && <div style={{ color: '#d32f2f', marginBottom: '8px', fontSize: '0.85rem' }}>{errors.submit}</div>}
              <button className="pay-now-btn" type="button" onClick={handlePayNow} disabled={submitting}>
                {submitting ? 'Opening checkout…' : `Pay ₹${estimatedTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="cart-summary-column">
          <div className="order-summary-card payment-summary-card">
            
            <div className="summary-header-row">
              <div className="summary-header-left">
                <h4>Total Payment ({totalItems} items):</h4>
                <div className="large-total-price">₹{estimatedTotal.toFixed(2)} INR</div>
              </div>
              <button className="hide-details-btn" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>

            {showDetails && (
              <div className="payment-details-section">
                <h4 className="details-heading">Payment details</h4>
                
                {/* Itemized List with Frame Previews */}
                <div
                  className="payment-itemized-list"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    marginTop: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '1.5rem',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    paddingRight: '10px',
                    scrollbarGutter: 'stable',
                  }}
                >
                  {displayCart.map((item) => {
                    const isDigital = DIGITAL_PRODUCTS.includes(item.productId);
                    return (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', alignItems: 'center', minWidth: 0 }}>
                        <div className={`payment-item-thumb-wrapper product-card-${item.productId}`}>
                          {isDigital ? (
                            <CartItemPreview item={item} collectionPhotos={collectionPhotos} compact />
                          ) : (
                            <div className="payment-item-thumb-frame">
                              <CartItemPreview item={item} collectionPhotos={collectionPhotos} />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                          <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>
                            {item.size?.label || (item.productId === 'digital_download_all' ? 'All Photos' : item.productId === 'digital_package' ? (item.size?.label || `${item.options?.photo_count || ''} Photos`) : 'High Resolution')} • Qty: {item.quantity}
                          </div>
                        </div>
                        <div style={{ fontWeight: 500, flexShrink: 0, paddingLeft: '4px' }}>
                          ₹{(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="summary-row">
                  <span>Items ({totalItems})</span>
                  <div className="price-right">
                    <span>₹{itemsTotal.toFixed(2)}</span>
                  </div>
                </div>
                {!allDigital && (
                  <>
                    <div className="summary-row">
                      <span>Shipping</span>
                      <div className="price-right">
                        <span>₹{shipping.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="summary-row">
                      <span>Taxes</span>
                      <div className="price-right">
                        <span>₹{taxes.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
