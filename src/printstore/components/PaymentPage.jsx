import React, { useState, useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const totalItems = displayCart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const itemsTotal = displayCart.reduce((acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
  const shipping = allDigital ? 0 : (itemsTotal > 0 ? 111.04 : 0);
  const taxes = 0.00;
  const estimatedTotal = itemsTotal + shipping + taxes;

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: (collectionId ? localStorage.getItem(`pixnxt_fav_email_${collectionId}`) : '') || '',
    cardNumber: '',
    expiration: '',
    cvc: '',
    country: 'India'
  });
  const [errors, setErrors] = useState({});

  const handlePayNow = async () => {
    if (!displayCart.length || estimatedTotal <= 0) {
      setErrors({ submit: 'Your cart is empty or total is ₹0. Go back and add a paid item.' });
      return;
    }

    if (paymentMethod === 'Credit Card') {
      const newErrors = {};
      if (!formData.email) newErrors.email = 'Required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';

      if (!formData.cardNumber) newErrors.cardNumber = 'Required';
      else if (!/^[\d\s]{16,19}$/.test(formData.cardNumber)) newErrors.cardNumber = 'Invalid format';

      if (!formData.expiration) newErrors.expiration = 'Required';
      else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(formData.expiration.replace(/\s/g, ''))) newErrors.expiration = 'Invalid (MM/YY)';

      if (!formData.cvc) newErrors.cvc = 'Required';
      else if (!/^\d{3,4}$/.test(formData.cvc)) newErrors.cvc = 'Invalid CVC';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
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
      setErrors({ submit: 'Failed to place order. Please try again.' });
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
          
          <div className="payment-method-selector">
            <label className="payment-label">Payment method</label>
            <div className="custom-dropdown-container">
              <button 
                className="custom-dropdown-btn" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{paymentMethod}</span>
                <ChevronDown size={20} strokeWidth={1.5} />
              </button>
              
              {isDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div 
                    className={`custom-dropdown-item ${paymentMethod === 'Credit Card' ? 'selected' : ''}`}
                    onClick={() => { setPaymentMethod('Credit Card'); setIsDropdownOpen(false); }}
                  >
                    Credit Card
                  </div>
                  <div 
                    className={`custom-dropdown-item ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                    onClick={() => { setPaymentMethod('UPI'); setIsDropdownOpen(false); }}
                  >
                    UPI
                  </div>
                </div>
              )}
            </div>
          </div>

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

          {/* Form Area based on selection */}
          <div className="payment-form-box">
            {paymentMethod === 'Credit Card' ? (
              <div className="credit-card-form">
                <div className="form-group">
                  <label>Email {errors.email && <span style={{color: '#d32f2f', marginLeft: '8px'}}>{errors.email}</span>}</label>
                  <input type="email" placeholder="nandhaprabhur2004@gmail.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ borderColor: errors.email ? '#d32f2f' : '#ccc' }} />
                </div>
                <div className="form-group">
                  <label>Card number {errors.cardNumber && <span style={{color: '#d32f2f', marginLeft: '8px'}}>{errors.cardNumber}</span>}</label>
                  <div className="input-with-icon">
                    <input type="text" placeholder="1234 1234 1234 1234" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: e.target.value})} style={{ borderColor: errors.cardNumber ? '#d32f2f' : '#ccc' }} />
                    <div className="card-brand-icon">💳</div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Expiration date {errors.expiration && <span style={{color: '#d32f2f', marginLeft: '8px'}}>{errors.expiration}</span>}</label>
                  <input type="text" placeholder="MM / YY" value={formData.expiration} onChange={(e) => setFormData({...formData, expiration: e.target.value})} style={{ borderColor: errors.expiration ? '#d32f2f' : '#ccc' }} />
                </div>
                <div className="form-group">
                  <label>Security code {errors.cvc && <span style={{color: '#d32f2f', marginLeft: '8px'}}>{errors.cvc}</span>}</label>
                  <div className="input-with-icon">
                    <input type="text" placeholder="CVC" value={formData.cvc} onChange={(e) => setFormData({...formData, cvc: e.target.value})} style={{ borderColor: errors.cvc ? '#d32f2f' : '#ccc' }} />
                    <div className="cvc-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                        <line x1="2" y1="10" x2="22" y2="10"></line>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}>
                    <option value="India">India</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                  </select>
                </div>
                {errors.submit && <div style={{ color: '#d32f2f', marginBottom: '8px', fontSize: '0.85rem' }}>{errors.submit}</div>}
                <button className="pay-now-btn" onClick={handlePayNow} disabled={submitting}>
                  {submitting ? 'Placing order…' : 'Pay now'}
                </button>
              </div>
            ) : (
              <div className="upi-payment-form">
                <div className="qr-code-container">
                  <div className="qr-placeholder">
                    {/* Visual mockup of a QR code */}
                    <div className="qr-squares">
                      <div className="qr-sq top-left"></div>
                      <div className="qr-sq top-right"></div>
                      <div className="qr-sq bottom-left"></div>
                      <div className="qr-center-pattern"></div>
                    </div>
                    <p>Scan with any UPI App</p>
                  </div>
                </div>
                {errors.submit && <div style={{ color: '#d32f2f', marginBottom: '8px', fontSize: '0.85rem' }}>{errors.submit}</div>}
                <button className="pay-now-btn" onClick={handlePayNow} disabled={submitting}>
                  {submitting ? 'Placing order…' : 'Confirm Payment'}
                </button>
              </div>
            )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {displayCart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', alignItems: 'center' }}>
                      <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f7f7f7', border: '1px solid #eaeaea', flexShrink: 0 }}>
                        <div style={{ transform: 'scale(0.16)', transformOrigin: 'center center', width: '307.25px', height: '307.25px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CartItemPreview item={item} collectionPhotos={collectionPhotos} />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>
                          {item.size?.label || (item.productId === 'digital_download_all' ? 'All Photos' : item.productId === 'digital_package' ? (item.size?.label || `${item.options?.photo_count || ''} Photos`) : 'High Resolution')} • Qty: {item.quantity}
                        </div>
                      </div>
                      <div style={{ fontWeight: 500, flexShrink: 0 }}>
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
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
