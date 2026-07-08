import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Info, Plus, Calendar, Edit2 } from 'lucide-react';
import AddressSidebar from './AddressSidebar';
import '../PrintStore.css';
import { isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';
import CartItemPreview from './CartItemPreview';
import { supabase } from '../../lib/supabase/client';


export default function ReviewPage({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onBack,
  onContinueToPayment,
  sessionId,
  initialAddress
}) {
  const [isAddressSidebarOpen, setIsAddressSidebarOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(() => {
    if (initialAddress) return initialAddress;
    try {
      const cached = localStorage.getItem('pixnxt_printstore_address');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    async function loadSavedAddress() {
      // If we already have a shipping address (from props or localStorage), do not query/overwrite it
      if (shippingAddress && shippingAddress.street) return;

      let query = supabase
        .from('printstore_orders')
        .select('shipping_address, customer_name, customer_email, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      let hasFilter = false;

      if (sessionId) {
        query = query.eq('session_id', sessionId);
        hasFilter = true;
      } else {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.email) {
            query = query.eq('customer_email', userData.user.email);
            hasFilter = true;
          }
        } catch (e) {}
      }

      if (!hasFilter) return;

      const { data, error } = await query;
      if (error || !data || data.length === 0) return;

      const order = data[0];
      const dbAddress = {
        accountName: order.customer_name,
        email: order.customer_email,
        recipientName: order.customer_name,
        street: order.shipping_address?.address || '',
        city: order.shipping_address?.city || '',
        zipCode: order.shipping_address?.zip || '',
        country: order.shipping_address?.country || 'India',
        phoneNumber: '',
        sameBilling: true
      };

      setShippingAddress(dbAddress);
      try {
        localStorage.setItem('pixnxt_printstore_address', JSON.stringify(dbAddress));
      } catch (e) {}
    }
    loadSavedAddress();
  }, [sessionId]);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = itemsTotal > 0 ? 111.04 : 0;
  const estimatedTotal = itemsTotal + shipping;

  const handleSaveAddress = (addressData) => {
    setShippingAddress(addressData);
    try {
      localStorage.setItem('pixnxt_printstore_address', JSON.stringify(addressData));
    } catch (e) {}
    setIsAddressSidebarOpen(false);
  };

  const getAddressString = () => {
    if (!shippingAddress) return 'No address provided yet.';
    const parts = [
      shippingAddress.street,
      shippingAddress.addressLine2,
      shippingAddress.city,
      shippingAddress.zipCode,
      shippingAddress.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="cart-page-container">
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
                <div className="pt-editor-header__caption-text">Review items and delivery ({totalItems} items)</div>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="cart-page-content">
        {/* Left Column: Items & Delivery */}
        <div className="cart-items-column">
          
          {/* Delivery Summary Block */}
          <div className="delivery-summary-block">
            <div className="delivery-summary-header">
              <h3>We'll deliver the items to:</h3>
              <button 
                className="edit-address-link"
                onClick={() => setIsAddressSidebarOpen(true)}
              >
                <Edit2 size={14} /> Edit addresses and details
              </button>
            </div>
            <p className="delivery-address-text">{getAddressString()}</p>
          </div>

          <hr className="review-divider" />

          {/* Items List */}
          <div className="review-items-container">
            <div className="review-arrival-header">
              <Calendar size={20} strokeWidth={1.5} />
              <div>
                <h4>Estimated arrival by Jul 4, 2026</h4>
                <p>Local customs duties and taxes may apply</p>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="cart-empty-message">Your cart is empty.</div>
            ) : (
              cartItems.map((item) => {
                const isFramed = ['matted_frame', 'frames', 'float_frames', 'circular_frames', 'matted_collages'].includes(item.productId);
                return (
                  <div key={item.id} className="cart-page-item review-page-item">
                    <div className={`cart-item-image-wrapper product-card-${item.productId} ${isFramed ? 'has-frame-size' : ''}`} style={{ '--frame-color': item.frame?.color || 'transparent' }}>
                      <div className="cart-item-product-image-box">
                         <CartItemPreview item={item} />
                      </div>
                    </div>
                  
                  <div className="cart-item-info">
                    <h4 className="cart-item-title">{item.productName} ({item.quantity})</h4>
                    <p className="cart-item-meta">
                      {item.size.label}, {item.frame && item.frame.id !== 'frame_none' && item.frame.label !== 'No Frame' && item.frame.label !== 'No Frame (Print Only)' ? item.frame.label + ', ' : ''}{item.paper.label}
                      {item.layout && <>, Layout: {item.layout.icon?.replace(/_/g, ' ')} ({item.layout.photos} photos)</>}
                    </p>
                    <div className="cart-item-price-mobile">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </div>
                    
                    <div className="cart-quantity-control">
                      <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    
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
                    <div className="international-delivery-badge">
                      International<br/>delivery
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
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
              onClick={() => onContinueToPayment(shippingAddress)}
              disabled={!shippingAddress || cartItems.length === 0}
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

      <AddressSidebar 
        isOpen={isAddressSidebarOpen}
        onClose={() => setIsAddressSidebarOpen(false)}
        onSaveAddress={handleSaveAddress}
        initialData={shippingAddress}
      />
    </div>
  );
}
