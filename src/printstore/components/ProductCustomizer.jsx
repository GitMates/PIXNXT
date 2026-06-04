import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, Check } from 'lucide-react';
import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS } from '../data/mockStoreData';
import AddPhotosSidebar from './AddPhotosSidebar';

export default function ProductCustomizer({ product, photos, initialPhotos, editMode, onAddToCart, onClose, onOpenCart }) {
  // Global options (apply to all items or represent the current selected variant)
  const [selectedSize, setSelectedSize] = useState(MOCK_SIZES[0]);
  const [selectedFrame, setSelectedFrame] = useState(
    product.id === 'matted_frame' ? MOCK_FRAMES[1] : MOCK_FRAMES[0] // Default to black frame for matted frame product
  );
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  
  // Grid items state: each item has a unique ID, a photo, and a quantity
  const [gridItems, setGridItems] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  // Initialize grid items from initialPhotos
  useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      setGridItems(initialPhotos.map(photo => ({
        id: `${photo.id}_${Date.now()}_${Math.random()}`,
        photo: photo,
        quantity: 1
      })));
    }
  }, [initialPhotos]);

  // Calculate prices
  const unitPrice =
    product.basePrice +
    selectedSize.priceModifier +
    selectedFrame.priceModifier +
    selectedPaper.priceModifier;

  const totalQuantity = gridItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = unitPrice * totalQuantity;

  const handleAddToCartClick = () => {
    gridItems.forEach(item => {
      if (item.quantity > 0) {
        const cartItem = {
          id: `${product.id}_${item.photo.id}_${Date.now()}_${Math.random()}`,
          productName: product.name,
          productId: product.id,
          photo: item.photo,
          size: selectedSize,
          frame: selectedFrame,
          paper: selectedPaper,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice * item.quantity
        };
        onAddToCart(cartItem, true); // true to skip opening cart immediately
      }
    });
    if (editMode) {
      onOpenCart(); // When editing, we just go back to the Cart Page directly
    } else {
      setShowCartModal(true);
    }
  };

  const handleGoToCart = () => {
    setShowCartModal(false);
    onClose(); 
    if (onOpenCart) onOpenCart();
  };

  const handleContinueShopping = () => {
    setShowCartModal(false);
    onClose();
  };
  const updateItemQuantity = (id, newQty) => {
    setGridItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, newQty) } : item
    ));
  };

  const removeItem = (id) => {
    setGridItems(prev => prev.filter(item => item.id !== id));
  };

  const togglePhoto = (photo) => {
    const existingIndex = gridItems.findIndex(item => item.photo.id === photo.id);
    if (existingIndex >= 0) {
      setGridItems(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      setGridItems(prev => [...prev, {
        id: `${photo.id}_${Date.now()}`,
        photo: photo,
        quantity: 1
      }]);
    }
  };

  const selectedPhotoIds = gridItems.map(item => item.photo.id);

  return (
    <div className="customizer-fullscreen">
      
      {/* Top Navigation Bar */}
      <div className="customizer-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={onClose} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          <span className="product-title">{product.name}</span>
        </div>
        
        <div className="topbar-right">
          <button className="icon-btn"><Undo2 size={16} /> <span className="btn-text">Undo</span></button>
          <button className="icon-btn"><Redo2 size={16} /> <span className="btn-text">Redo</span></button>
          
          <div className="topbar-divider"></div>
          
          <button className="icon-btn help-btn"><HelpCircle size={18} /></button>
          
          {editMode ? null : (
            <div className="cart-summary">
              <div className="cart-icon-wrapper">
                <ShoppingCart size={20} />
                {totalQuantity > 0 && <span className="cart-badge">{totalQuantity}</span>}
              </div>
            </div>
          )}
          <div className="price-details" style={{ marginLeft: editMode ? '16px' : '0' }}>
            <span className="price-bold">₹{totalPrice.toFixed(2)}</span>
            <span className="tax-text">Tax not included</span>
          </div>
          
          <button 
            className="add-to-cart-dark" 
            onClick={handleAddToCartClick}
            disabled={gridItems.length === 0}
          >
            {editMode ? (
              <><Check size={16} /> Done</>
            ) : (
              <><ShoppingCart size={16} /> Add to cart</>
            )}
          </button>
        </div>
      </div>

      <div className="customizer-main-content">
        {/* Left Visualizer Area */}
        <div className="customizer-visualizer-grid-area">
          <div className="customizer-size-header">
            <h3>{selectedSize.label}</h3>
          </div>
          
          <div className="customizer-grid no-scrollbar">
            {gridItems.map(item => (
              <div key={item.id} className={`customizer-grid-item product-card-${product.id}`} style={{ '--frame-color': selectedFrame?.color || 'transparent' }}>
                <div className="product-image-box customizer-product-image-box">
                  {product.id === 'matted_collages' ? (
                    <div className="collage-container">
                      <img src={item.photo.url} alt={item.photo.name} className="collage-img" />
                      <img src={item.photo.url} alt={item.photo.name} className="collage-img" />
                    </div>
                  ) : product.id === 'prints' ? (
                    <div className="prints-container">
                      <img src={item.photo.url} alt={item.photo.name} className="print-img print-img-back" />
                      <img src={item.photo.url} alt={item.photo.name} className="print-img print-img-front" />
                    </div>
                  ) : product.id === 'print_pack' ? (
                    <div className="print-pack-container">
                      {[0, 1, 2, 3].map((i) => (
                        <img key={i} src={item.photo.url} alt={item.photo.name} className={`print-pack-img img-${i}`} />
                      ))}
                    </div>
                  ) : product.id === 'deckled_prints' ? (
                    <div className="deckled-print-wrapper">
                      <img src={item.photo.url} alt={item.photo.name} className="deckled-print-img" />
                    </div>
                  ) : (
                    <img src={item.photo.url} alt={item.photo.name} className="product-image" />
                  )}
                </div>
                
                <div className="customizer-item-controls">
                  <span className="item-paper-label">{selectedPaper.label}</span>
                  <div className="customizer-control-divider"></div>
                  <div className="quantity-control small">
                    <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <div className="customizer-control-divider"></div>
                  <button className="item-delete-btn" onClick={() => removeItem(item.id)}>
                    <Trash2 size={22} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
            
              {/* Simple Add More Box without frame styling */}
            <div className="customizer-grid-item" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer' }}>
               <div className="customizer-product-image-box" style={{ background: '#fcfcfc', border: '2px dashed #ddd', borderRadius: '4px', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={32} color="#aaa" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Toolbar removed as requested */}
      
      {/* Add Photos Sidebar Drawer */}
      <AddPhotosSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        collectionPhotos={photos}
        selectedPhotoIds={selectedPhotoIds}
        onTogglePhoto={togglePhoto}
      />

      {/* Added to Cart Modal */}
      {showCartModal && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">
            <h3>{product.name} were added to the cart</h3>
            <div className="cart-modal-actions">
              <button className="btn-outline" onClick={handleGoToCart}>Go to cart</button>
              <button className="btn-dark" onClick={handleContinueShopping}>Continue shopping</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
