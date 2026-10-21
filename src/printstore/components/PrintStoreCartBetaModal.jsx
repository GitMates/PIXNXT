import React from 'react';
import { PRINTSTORE_CART_BETA_COPY } from '../printstoreCartBeta';
import './PrintStoreCartBetaModal.css';

/**
 * Polite beta notice shown when Add to cart is intercepted during soft launch.
 */
export function PrintStoreCartBetaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="ps-cart-beta-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="ps-cart-beta-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-cart-beta-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="ps-cart-beta-title" className="ps-cart-beta-modal__title">
          {PRINTSTORE_CART_BETA_COPY.title}
        </h3>
        <p className="ps-cart-beta-modal__body">{PRINTSTORE_CART_BETA_COPY.body}</p>
        <button type="button" className="ps-cart-beta-modal__btn" onClick={onClose}>
          {PRINTSTORE_CART_BETA_COPY.button}
        </button>
      </div>
    </div>
  );
}
