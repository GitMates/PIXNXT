import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS } from '../data/mockStoreData';

export default function ProductCustomizer({ product, photos, initialPhoto, onAddToCart, onClose }) {
  const [selectedPhoto, setSelectedPhoto] = useState(initialPhoto || photos[0]);
  const [selectedSize, setSelectedSize] = useState(MOCK_SIZES[0]);
  const [selectedFrame, setSelectedFrame] = useState(
    product.id === 'matted_frame' ? MOCK_FRAMES[1] : MOCK_FRAMES[0] // Default to black frame for matted frame product
  );
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  const [quantity, setQuantity] = useState(1);

  // Sync photo if initialPhoto changes
  useEffect(() => {
    if (initialPhoto) {
      setSelectedPhoto(initialPhoto);
    }
  }, [initialPhoto]);

  // Calculate prices
  const unitPrice =
    product.basePrice +
    selectedSize.priceModifier +
    selectedFrame.priceModifier +
    selectedPaper.priceModifier;

  const totalPrice = unitPrice * quantity;

  const handleAddClick = () => {
    const cartItem = {
      id: `${product.id}_${Date.now()}`,
      productName: product.name,
      productId: product.id,
      photo: selectedPhoto,
      size: selectedSize,
      frame: selectedFrame,
      paper: selectedPaper,
      quantity,
      unitPrice,
      totalPrice
    };
    onAddToCart(cartItem);
  };

  // Get frame styling for visualizer
  const getFrameStyle = () => {
    if (selectedFrame.id === 'frame_none') {
      return {
        border: '1px solid #cccccc',
        padding: '0'
      };
    }

    let frameBorderColor = '#111111'; // black
    if (selectedFrame.id === 'frame_white') frameBorderColor = '#e5e5e5';
    if (selectedFrame.id === 'frame_oak') frameBorderColor = '#c68e54'; // oak wood tone

    return {
      border: `16px solid ${frameBorderColor}`,
      borderRadius: '2px',
      padding: product.id === 'matted_frame' ? '24px' : '0', // matte margin
      backgroundColor: '#fbfbfb', // paper mat border color
      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.25)'
    };
  };

  return (
    <div className="customizer-overlay">
      <div className="customizer-dialog">
        {/* Close Button */}
        <button className="customizer-close-btn" onClick={onClose} aria-label="Close customizer">
          <X size={24} />
        </button>

        {/* Left Visualizer Preview Panel */}
        <div className="customizer-visualizer">
          <div className="frame-preview-outer" style={getFrameStyle()}>
            <img
              src={selectedPhoto.url}
              alt="Customized Print Preview"
              className="frame-preview-image"
            />
          </div>
          <div className="visualizer-desc">
            Visualizing {product.name} ({selectedSize.label})
          </div>
        </div>

        {/* Right Configuration Sidebar */}
        <div className="customizer-config">
          <div className="customizer-config-header">
            <h3 className="customizer-product-title">{product.name}</h3>
            <span className="customizer-product-price">
              ₹{unitPrice.toFixed(2)} <span style={{ fontSize: '0.85rem', color: '#777777', fontWeight: 400 }}>each</span>
            </span>
          </div>

          <div className="customizer-scrollable-options no-scrollbar">
            {/* Option 1: Choose Photo */}
            <div className="customizer-option-group">
              <span className="customizer-option-label">1. Choose Photo</span>
              <div className="customizer-photo-picker">
                {photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.name}
                    className={`customizer-photo-thumb ${selectedPhoto.id === photo.id ? 'active' : ''}`}
                    onClick={() => setSelectedPhoto(photo)}
                  />
                ))}
              </div>
            </div>

            {/* Option 2: Choose Size */}
            <div className="customizer-option-group">
              <span className="customizer-option-label">2. Choose Size</span>
              <div className="option-select-grid">
                {MOCK_SIZES.map((size) => (
                  <button
                    key={size.id}
                    className={`option-select-btn ${selectedSize.id === size.id ? 'active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size.label}
                    {size.priceModifier > 0 && <span>+₹{size.priceModifier}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Option 3: Choose Frame (If applicable to product type) */}
            {product.id !== 'dibond' && product.id !== 'gallery_board' && (
              <div className="customizer-option-group">
                <span className="customizer-option-label">3. Frame Wood Finish</span>
                <div className="option-select-grid">
                  {MOCK_FRAMES.map((frame) => (
                    <button
                      key={frame.id}
                      className={`option-select-btn ${selectedFrame.id === frame.id ? 'active' : ''}`}
                      onClick={() => setSelectedFrame(frame)}
                    >
                      {frame.label.split(' (')[0]}
                      {frame.priceModifier > 0 && <span>+₹{frame.priceModifier}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Option 4: Choose Paper Type */}
            <div className="customizer-option-group">
              <span className="customizer-option-label">4. Paper Type</span>
              <div className="option-select-grid">
                {MOCK_PAPERS.map((paper) => (
                  <button
                    key={paper.id}
                    className={`option-select-btn ${selectedPaper.id === paper.id ? 'active' : ''}`}
                    onClick={() => setSelectedPaper(paper)}
                  >
                    {paper.label}
                    {paper.priceModifier > 0 && <span>+₹{paper.priceModifier}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div className="customizer-footer">
            {/* Quantity */}
            <div className="quantity-control">
              <button
                className="quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <span className="quantity-val">{quantity}</span>
              <button
                className="quantity-btn"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>

            {/* Submit */}
            <button className="add-to-cart-submit" onClick={handleAddClick}>
              <ShoppingCart size={16} />
              Add to Cart — ₹{totalPrice.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
