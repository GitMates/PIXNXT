import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

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
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                {/* Photo Thumbnail */}
                <div className="cart-item-photo-box">
                  <img
                    src={item.photo.url}
                    alt={item.photo.name}
                    className="cart-item-photo-img"
                  />
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
            ))
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
