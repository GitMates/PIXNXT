import React, { useState } from 'react';
import { ChevronLeft, Trash2, Info, Plus, Calendar, Edit2 } from 'lucide-react';
import AddressSidebar from './AddressSidebar';
import '../PrintStore.css';

export default function ReviewPage({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onBack,
  onContinueToPayment
}) {
  const [isAddressSidebarOpen, setIsAddressSidebarOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(null);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shipping = itemsTotal > 0 ? 111.04 : 0;
  const estimatedTotal = itemsTotal + shipping;

  const handleSaveAddress = (addressData) => {
    setShippingAddress(addressData);
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
              cartItems.map((item) => (
                <div key={item.id} className="cart-page-item review-page-item">
                  <div className={`cart-item-image-wrapper product-card-${item.productId}`} style={{ '--frame-color': item.frame?.color || 'transparent' }}>
                    <div className="product-image-box cart-item-product-image-box">
                      {item.productId === 'matted_collages' ? ( (() => {
                        const type = item.layout?.type || 'grid_2x2';
                        let w = 25;
                        let h = 25;
                        const sizeMatch = item.size?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
                        if (sizeMatch) {
                          const d1 = parseFloat(sizeMatch[1]);
                          const d2 = parseFloat(sizeMatch[2]);
                          if (d1 !== d2) {
                            const minD = Math.min(d1, d2);
                            const maxD = Math.max(d1, d2);
                            if (['grid_1x2_horizontal', 'grid_2x3'].includes(type)) {
                              w = maxD;
                              h = minD;
                            } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right'].includes(type)) {
                              w = minD;
                              h = maxD;
                            } else {
                              w = d1;
                              h = d2;
                            }
                          } else {
                            w = d1;
                            h = d2;
                          }
                        }

                        return (
                          <div 
                            className="product-card-matted_collages"
                            style={{
                              '--frame-color': item.frame?.color || '#111111',
                              width: '100%',
                              aspectRatio: `${w} / ${h}`,
                              background: item.frame?.color || '#111111',
                              padding: '5.5%',
                              boxSizing: 'border-box',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                            }}
                          >
                            <div 
                              className="matted-frame-mat"
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#ffffff',
                                padding: '12%',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div className="collage-grid-container" style={{
                                display: 'grid',
                                gridTemplateRows: (() => {
                                  let gridTemplate = '1fr / 1fr';
                                  switch(type) {
                                    case 'grid_2x2':
                                    case 'grid_2x2_landscape':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_1x2_horizontal':
                                      gridTemplate = '1fr / repeat(2, 1fr)';
                                      break;
                                    case 'grid_3x2':
                                      gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2x3':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
                                      break;
                                    case 'grid_1top_2bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2top_1bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_1left_2right':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2left_1right':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_asymmetric_4':
                                      gridTemplate = '2fr 1fr 2fr / 1fr 1fr';
                                      break;
                                    case 'grid_2x1_vertical':
                                      gridTemplate = 'repeat(2, 1fr) / 1fr';
                                      break;
                                    case 'grid_1left_3right':
                                      gridTemplate = 'repeat(3, 1fr) / 3fr 1fr';
                                      break;
                                    case 'grid_3top_1bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
                                      break;
                                  }
                                  return gridTemplate.split(' / ')[0];
                                })(),
                                gridTemplateColumns: (() => {
                                  let gridTemplate = '1fr / 1fr';
                                  switch(type) {
                                    case 'grid_2x2':
                                    case 'grid_2x2_landscape':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_1x2_horizontal':
                                      gridTemplate = '1fr / repeat(2, 1fr)';
                                      break;
                                    case 'grid_3x2':
                                      gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2x3':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
                                      break;
                                    case 'grid_1top_2bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2top_1bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_1left_2right':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_2left_1right':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                      break;
                                    case 'grid_asymmetric_4':
                                      gridTemplate = '2fr 1fr 2fr / 1fr 1fr';
                                      break;
                                    case 'grid_2x1_vertical':
                                      gridTemplate = 'repeat(2, 1fr) / 1fr';
                                      break;
                                    case 'grid_1left_3right':
                                      gridTemplate = 'repeat(3, 1fr) / 3fr 1fr';
                                      break;
                                    case 'grid_3top_1bottom':
                                      gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
                                      break;
                                  }
                                  return gridTemplate.split(' / ')[1];
                                })(),
                            gap: '2px',
                            width: '100%',
                            height: '100%'
                          }}>
                            {(item.photos && item.photos.length > 0) ? (
                              item.photos.map((p, index) => {
                                const customStyle = (() => {
                                  switch (item.layout?.type) {
                                    case 'grid_1top_2bottom':
                                      if (index === 0) return { gridColumn: 'span 2' };
                                      break;
                                    case 'grid_2top_1bottom':
                                      if (index === 2) return { gridColumn: 'span 2' };
                                      break;
                                    case 'grid_1left_2right':
                                      if (index === 0) return { gridRow: 'span 2' };
                                      break;
                                    case 'grid_2left_1right':
                                      if (index === 1) return { gridRow: 'span 2' };
                                      break;
                                    case 'grid_asymmetric_4':
                                      if (index === 0) return { gridRow: '1 / 3', gridColumn: '1' };
                                      if (index === 1) return { gridRow: '3 / 4', gridColumn: '1' };
                                      if (index === 2) return { gridRow: '1 / 2', gridColumn: '2' };
                                      if (index === 3) return { gridRow: '2 / 4', gridColumn: '2' };
                                      break;
                                    case 'grid_1left_3right':
                                      if (index === 0) return { gridRow: 'span 3' };
                                      break;
                                    case 'grid_3top_1bottom':
                                      if (index === 3) return { gridColumn: 'span 3' };
                                      break;
                                  }
                                  return {};
                                })();
                                return p ? (
                                  <img 
                                    key={index} 
                                    src={p.url} 
                                    alt={p.name} 
                                    className="collage-grid-img" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', ...customStyle }} 
                                  />
                                ) : (
                                  <div 
                                    key={index}
                                    className="collage-grid-img-empty" 
                                    style={{ width: '100%', height: '100%', backgroundColor: '#e0e0e0', ...customStyle }} 
                                  />
                                );
                              })
                            ) : item.photo ? (
                              <img src={item.photo.url} alt={item.photo.name} className="collage-grid-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : null}
                          </div>
                        </div>
                      </div>
                      );
                    })() ) : item.productId === 'prints' ? (
                        <div className="prints-container">
                          <img src={item.photo.url} alt={item.photo.name} className="print-img print-img-back" />
                          <img src={item.photo.url} alt={item.photo.name} className="print-img print-img-front" />
                        </div>
                      ) : item.productId === 'print_pack' ? (
                        <div className="print-pack-container">
                          {[0, 1, 2, 3].map((i) => (
                            <img key={i} src={item.photo.url} alt={item.photo.name} className={`print-pack-img img-${i}`} />
                          ))}
                        </div>
                      ) : item.productId === 'deckled_prints' ? (
                        <div className="deckled-print-wrapper">
                          <img src={item.photo.url} alt={item.photo.name} className="deckled-print-img" />
                        </div>
                      ) : (
                        <img src={item.photo.url} alt={item.photo.name} className="product-image" />
                      )}
                    </div>
                  </div>
                  
                  <div className="cart-item-info">
                    <h4 className="cart-item-title">{item.productName} ({item.quantity})</h4>
                    <p className="cart-item-meta">
                      {item.size.label}, {item.frame.label !== 'No Frame (Print Only)' ? item.frame.label + ', ' : ''}{item.paper.label}
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
              ))
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
              onClick={onContinueToPayment}
              disabled={!shippingAddress}
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
