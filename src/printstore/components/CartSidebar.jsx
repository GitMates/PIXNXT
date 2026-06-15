import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';

export default function CartSidebar({
  isOpen,
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <h3 className="cart-drawer-title">Shopping Cart</h3>
          <button className="cart-drawer-close" onClick={onClose} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable list of items */}
        <div className="cart-items-list no-scrollbar">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={48} strokeWidth={1} color="#bbbbbb" />
              <p className="cart-empty-text">Your cart is empty</p>
              <button
                className="explore-btn"
                style={{ fontSize: '0.75rem', padding: '0.6rem 1.5rem' }}
                onClick={onClose}
              >
                Go Shop Prints
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
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
                  if (['grid_1x2_horizontal', 'grid_2x3', 'grid_2x2_landscape', 'grid_2x4', 'grid_2x5'].includes(type)) {
                    w = maxD;
                    h = minD;
                  } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right', 'grid_1left_3right', 'grid_3top_1bottom', 'grid_4x2', 'grid_5x2'].includes(type)) {
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
                <div key={item.id} className="cart-item">
                  {/* Photo Thumbnail */}
                  <div className="cart-item-photo-box" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f7f7f7' }}>
                    {item.productId === 'matted_collages' ? (
                      <div 
                        className="product-card-matted_collages"
                        style={{
                          '--frame-color': item.frame?.color || '#111111',
                          width: w >= h ? '100%' : 'auto',
                          height: h >= w ? '100%' : 'auto',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          aspectRatio: `${w} / ${h}`,
                          background: item.frame?.color || '#111111',
                          padding: '5.5%',
                          boxSizing: 'border-box'
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
                            const type = item.layout?.type || 'grid_2x2';
                            switch(type) {
                              case 'grid_2x2':
                              case 'grid_2x2_landscape':
                                gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                break;
                              case 'grid_1x2_horizontal': gridTemplate = '1fr / repeat(2, 1fr)'; break;
                              case 'grid_3x2': gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2x3': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_1top_2bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_1left_2right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2left_1right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_asymmetric_4': gridTemplate = '2fr 1fr 2fr / 1fr 1fr'; break;
                              case 'grid_2x1_vertical': gridTemplate = 'repeat(2, 1fr) / 1fr'; break;
                              case 'grid_1left_3right': gridTemplate = 'repeat(3, 1fr) / 3fr 1fr'; break;
                              case 'grid_3top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_3x3': gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_4x4': gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)'; break;
                              case 'grid_4x2': gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_5x2': gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2x4': gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)'; break;
                              case 'grid_2x5': gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)'; break;
                            }
                            return gridTemplate.split(' / ')[0];
                          })(),
                          gridTemplateColumns: (() => {
                            let gridTemplate = '1fr / 1fr';
                            const type = item.layout?.type || 'grid_2x2';
                            switch(type) {
                              case 'grid_2x2':
                              case 'grid_2x2_landscape':
                                gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                                break;
                              case 'grid_1x2_horizontal': gridTemplate = '1fr / repeat(2, 1fr)'; break;
                              case 'grid_3x2': gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2x3': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_1top_2bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_1left_2right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2left_1right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_asymmetric_4': gridTemplate = '2fr 1fr 2fr / 1fr 1fr'; break;
                              case 'grid_2x1_vertical': gridTemplate = 'repeat(2, 1fr) / 1fr'; break;
                              case 'grid_1left_3right': gridTemplate = 'repeat(3, 1fr) / 3fr 1fr'; break;
                              case 'grid_3top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_3x3': gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)'; break;
                              case 'grid_4x4': gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)'; break;
                              case 'grid_4x2': gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_5x2': gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)'; break;
                              case 'grid_2x4': gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)'; break;
                              case 'grid_2x5': gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)'; break;
                            }
                            return gridTemplate.split(' / ')[1];
                          })(),
                          gap: '1px',
                          width: '100%',
                          height: '100%'
                        }}>
                          {item.photos?.map((p, index) => {
                            const customStyle = (() => {
                              switch (item.layout?.type) {
                                case 'grid_1top_2bottom': if (index === 0) return { gridColumn: 'span 2' }; break;
                                case 'grid_2top_1bottom': if (index === 2) return { gridColumn: 'span 2' }; break;
                                case 'grid_1left_2right': if (index === 0) return { gridRow: 'span 2' }; break;
                                case 'grid_2left_1right': if (index === 1) return { gridRow: 'span 2' }; break;
                                case 'grid_asymmetric_4':
                                  if (index === 0) return { gridRow: '1 / 3', gridColumn: '1' };
                                  if (index === 1) return { gridRow: '3 / 4', gridColumn: '1' };
                                  if (index === 2) return { gridRow: '1 / 2', gridColumn: '2' };
                                  if (index === 3) return { gridRow: '2 / 4', gridColumn: '2' };
                                  break;
                                case 'grid_1left_3right': if (index === 0) return { gridRow: 'span 3' }; break;
                                case 'grid_3top_1bottom': if (index === 3) return { gridColumn: 'span 3' }; break;
                              }
                              return {};
                            })();
                             return p ? (
                               <img key={index} src={adjustPhotoUrl(p.url, isSlotLandscape(item.layout?.type, index))} alt="" style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover', objectPosition: 'center 20%', ...customStyle }} />
                             ) : (
                               <div key={index} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, backgroundColor: '#e0e0e0', ...customStyle }} />
                             );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.editedPhotoUrl || item.photo?.url}
                      alt={item.photo?.name}
                      className="cart-item-photo-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                {/* Configurations & Labels */}
                <div className="cart-item-details">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 className="cart-item-name">{item.productName}</h4>
                    <button
                      className="cart-item-remove-btn"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="cart-item-meta">
                    <span>Size: {item.size.label}</span>
                    {item.productId !== 'dibond' && item.productId !== 'gallery_board' && (
                      <span>Frame: {item.frame.label.split(' (')[0]}</span>
                    )}
                    <span>Paper: {item.paper.label}</span>
                  </div>

                  {/* Quantity and Price */}
                  <div className="cart-item-price-row">
                    <div className="cart-item-quantity-control">
                      <button
                        className="cart-item-quantity-btn"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      >
                        -
                      </button>
                      <span className="cart-item-quantity-val">{item.quantity}</span>
                      <button
                        className="cart-item-quantity-btn"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-price">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            })
          )}
        </div>

        {/* Footer Subtotal & Checkout button */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal-row">
              <span className="cart-subtotal-label">Subtotal</span>
              <span className="cart-subtotal-val">₹{subtotal.toFixed(2)}</span>
            </div>
            <button className="cart-checkout-btn" onClick={onCheckout}>
              Checkout
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
