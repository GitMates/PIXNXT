import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';
import CartItemPreview from './CartItemPreview';


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
                    <div style={{
                      transform: 'scale(0.26)',
                      transformOrigin: 'center center',
                      width: '307.25px',
                      height: '307.25px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CartItemPreview item={item} />
                    </div>
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
