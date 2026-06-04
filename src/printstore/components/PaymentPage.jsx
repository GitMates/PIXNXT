import React, { useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';

export default function PaymentPage({
  cartItems,
  onBack,
  onPaymentSuccess
}) {
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = itemsTotal > 0 ? 111.04 : 0;
  const taxes = 0.00;
  const estimatedTotal = itemsTotal + shipping + taxes;

  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    cardNumber: '',
    expiration: '',
    cvc: '',
    country: 'India'
  });
  const [errors, setErrors] = useState({});

  const handlePayNow = () => {
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
    setIsSuccess(true);
    setTimeout(() => {
      if (onPaymentSuccess) onPaymentSuccess();
    }, 2500);
  };

  return (
    <div className="cart-page-container payment-page-container">
      {isSuccess && (
        <div className="success-overlay">
          <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className="success-checkmark__circle" cx="26" cy="26" r="25" fill="none" />
            <path className="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
          <div className="success-text">Payment Successful!</div>
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
                <button className="pay-now-btn" onClick={handlePayNow}>
                  Pay now
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
                <button className="pay-now-btn" onClick={handlePayNow}>
                  Confirm Payment
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
              <button className="hide-details-btn">Hide details</button>
            </div>

            <div className="payment-details-section">
              <h4 className="details-heading">Payment details</h4>
              
              <div className="summary-row">
                <span>Items ({totalItems})</span>
                <div className="price-right">
                  <span>₹{itemsTotal.toFixed(2)}</span>
                  <span className="tax-note">Not including taxes</span>
                </div>
              </div>
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
