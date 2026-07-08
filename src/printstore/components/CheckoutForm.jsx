import React, { useState } from 'react';
import { CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import CartItemPreview from './CartItemPreview';


export default function CheckoutForm({ cartItems, onOrderCompleted, onPlaceOrder, onBackToShopping, photographer }) {
  const [formData, setFormData] = useState(() => {
    try {
      const cached = localStorage.getItem('pixnxt_printstore_address');
      if (cached) {
        const addr = JSON.parse(cached);
        return {
          name: addr.recipientName || addr.accountName || '',
          email: addr.email || '',
          address: addr.street || '',
          city: addr.city || '',
          zip: addr.zipCode || '',
          cardNumber: '',
          expiry: '',
          cvv: ''
        };
      }
    } catch (e) {}
    return {
      name: '',
      email: '',
      address: '',
      city: '',
      zip: '',
      cardNumber: '',
      expiry: '',
      cvv: ''
    };
  });

  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.address || !formData.cardNumber) {
      alert("Please fill in the required fields (Name, Email, Address, Card Number).");
      return;
    }

    setSubmitting(true);
    try {
      try {
        localStorage.setItem('pixnxt_printstore_address', JSON.stringify({
          recipientName: formData.name,
          accountName: formData.name,
          email: formData.email,
          street: formData.address,
          city: formData.city,
          zipCode: formData.zip,
          country: 'India',
          phoneNumber: '',
          sameBilling: true
        }));
      } catch (e) {}

      if (onPlaceOrder) {
        await onPlaceOrder(formData);
        onOrderCompleted();
      } else {
        // Mock processing payment
        await new Promise((resolve) => setTimeout(resolve, 1500));
        onOrderCompleted();
      }
    } catch (err) {
      console.error("Order submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal + shipping + tax;

  return (
    <div className="checkout-section">
      {/* Main Billing Shipping Details */}
      <div className="checkout-main">
        <button
          onClick={onBackToShopping}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            color: '#666666'
          }}
        >
          <ArrowLeft size={16} />
          Back to Shopping
        </button>

        <form onSubmit={handleSubmit}>
          <div className="checkout-step-title">1. Shipping Information</div>
          <div className="checkout-form-grid">
            <div className="form-group checkout-form-col-span-2">
              <label className="form-label" htmlFor="chk-name">Full Name *</label>
              <input
                id="chk-name"
                type="text"
                name="name"
                required
                className="form-input"
                placeholder="Nandha"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group checkout-form-col-span-2">
              <label className="form-label" htmlFor="chk-email">Email Address *</label>
              <input
                id="chk-email"
                type="email"
                name="email"
                required
                className="form-input"
                placeholder={photographer?.email ? `e.g. ${photographer.email}` : "your.email@example.com"}
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group checkout-form-col-span-2">
              <label className="form-label" htmlFor="chk-address">Shipping Address *</label>
              <input
                id="chk-address"
                type="text"
                name="address"
                required
                className="form-input"
                placeholder="123 Gallery Lane"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chk-city">City *</label>
              <input
                id="chk-city"
                type="text"
                name="city"
                required
                className="form-input"
                placeholder="Chennai"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chk-zip">Postal Code / ZIP *</label>
              <input
                id="chk-zip"
                type="text"
                name="zip"
                required
                className="form-input"
                placeholder="600001"
                value={formData.zip}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="checkout-step-title">2. Payment Method</div>
          <div className="checkout-payment-box">
            <div className="checkout-form-grid" style={{ marginBottom: 0 }}>
              <div className="form-group checkout-form-col-span-2">
                <label className="form-label" htmlFor="chk-card">Card Number *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="chk-card"
                    type="text"
                    name="cardNumber"
                    required
                    className="form-input"
                    placeholder="4111 2222 3333 4444"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                  />
                  <CreditCard size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#888888' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="chk-expiry">Expiry Date *</label>
                <input
                  id="chk-expiry"
                  type="text"
                  name="expiry"
                  required
                  className="form-input"
                  placeholder="MM/YY"
                  value={formData.expiry}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="chk-cvv">CVV *</label>
                <input
                  id="chk-cvv"
                  type="password"
                  name="cvv"
                  required
                  className="form-input"
                  placeholder="•••"
                  maxLength={4}
                  value={formData.cvv}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="add-to-cart-submit"
            style={{ width: '100%', height: '48px', marginTop: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Processing Payment...' : `Place Order — ₹${total.toFixed(2)}`}
          </button>
        </form>
      </div>

      {/* Sidebar Summary */}
      <div className="checkout-sidebar">
        <h3 className="checkout-step-title" style={{ borderBottom: '1px solid #eaeaea' }}>Order Details</h3>
        
        {/* Cart items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto' }}>
          {cartItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f7f7f7', border: '1px solid #eaeaea', flexShrink: 0 }}>
                <div style={{ transform: 'scale(0.16)', transformOrigin: 'center center', width: '307.25px', height: '307.25px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CartItemPreview item={item} />
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 500, color: '#111' }}>{item.productName}</div>
                <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>
                  {item.size.label} • Qty: {item.quantity}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontWeight: 500 }}>
                ₹{(item.unitPrice * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Calculations */}
        <div className="checkout-order-summary-box">
          <div className="checkout-summary-item">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="checkout-summary-item">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
          </div>
          <div className="checkout-summary-item">
            <span>Sales Tax (8%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="checkout-summary-total">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
