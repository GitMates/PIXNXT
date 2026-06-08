import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, Check, ChevronRight } from 'lucide-react';
import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS, MOCK_LAYOUTS, MOCK_WALLS } from '../data/mockStoreData';
import AddPhotosSidebar from './AddPhotosSidebar';

export default function ProductCustomizer({ product, photos, initialPhotos, editMode, initialSize, initialFrame, initialPaper, onAddToCart, onClose, onOpenCart }) {
  const [selectedSize, setSelectedSize] = useState(initialSize || MOCK_SIZES[0]);
  const [selectedFrame, setSelectedFrame] = useState(
    initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_light_wood') || MOCK_FRAMES[1]
  );
  const [selectedPaper, setSelectedPaper] = useState(initialPaper || MOCK_PAPERS[0]);
  const [selectedLayout, setSelectedLayout] = useState(product.id === 'matted_collages' ? MOCK_LAYOUTS[0] : null);
  const [selectedWall, setSelectedWall] = useState(product.id === 'matted_collages' ? MOCK_WALLS[0] : null);
  
  // Grid slots configuration based on whether it is a print pack/box product or single items
  const isPrintPack = product.id === 'print_packs' || product.id === 'print_boxes' || product.id === 'prints';
  const totalSlots = isPrintPack ? 12 : 1; 

  const [gridItems, setGridItems] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Sync initial items and pre-populate slots
  useEffect(() => {
    let initialSlots = Array(totalSlots).fill(null);
    if (initialPhotos && initialPhotos.length > 0) {
      initialPhotos.forEach((photo, idx) => {
        if (idx < totalSlots) {
          initialSlots[idx] = photo;
        }
      });
      setSelectedPhotoIds(initialPhotos.map(p => p.id));
    } else if (photos && photos.length > 0) {
      // Auto fill if standard gallery images exist
      photos.slice(0, Math.min(3, totalSlots)).forEach((photo, idx) => {
        initialSlots[idx] = photo;
      });
      setSelectedPhotoIds(photos.slice(0, Math.min(3, totalSlots)).map(p => p.id));
    }
    setGridItems(initialSlots);
  }, [initialPhotos, photos, totalSlots]);

  const handleOpenSidebarForSlot = (index) => {
    setActiveSlotIndex(index);
    setIsSidebarOpen(true);
  };

  const togglePhoto = (photo) => {
    if (activeSlotIndex !== null) {
      // Direct slot selection assignment assignment flow
      const updatedGrid = [...gridItems];
      if (updatedGrid[activeSlotIndex]?.id === photo.id) {
        updatedGrid[activeSlotIndex] = null;
      } else {
        updatedGrid[activeSlotIndex] = photo;
      }
      setGridItems(updatedGrid);

      // Recalculate unique active selection highlights
      const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
      setSelectedPhotoIds(activeIds);
      setIsSidebarOpen(false);
      setActiveSlotIndex(null);
    } else {
      // Fallback multiple auto-append assignment flow
      const currentIdx = gridItems.findIndex(item => item === null);
      if (selectedPhotoIds.includes(photo.id)) {
        const updatedGrid = gridItems.map(item => item?.id === photo.id ? null : item);
        setGridItems(updatedGrid);
        setSelectedPhotoIds(prev => prev.filter(id => id !== photo.id));
      } else if (currentIdx !== -1) {
        const updatedGrid = [...gridItems];
        updatedGrid[currentIdx] = photo;
        setGridItems(updatedGrid);
        setSelectedPhotoIds(prev => [...prev, photo.id]);
      }
    }
  };

  const handleRemoveSlotPhoto = (index, e) => {
    e.stopPropagation();
    const updatedGrid = [...gridItems];
    updatedGrid[index] = null;
    setGridItems(updatedGrid);
    const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
    setSelectedPhotoIds(activeIds);
  };

  const handleAddToCartClick = () => {
    const finalPhotos = gridItems.filter(item => item !== null);
    onAddToCart({
      product,
      size: selectedSize,
      frame: selectedFrame,
      paper: selectedPaper,
      photos: finalPhotos,
      quantity: 1
    });
    setShowCartModal(true);
  };

  const handleGoToCart = () => {
    setShowCartModal(false);
    onOpenCart();
  };

  const handleContinueShopping = () => {
    setShowCartModal(false);
    onClose();
  };

  return (
    <div className="product-customizer-fullscreen">
      {/* Top Header Controls Bar */}
      <div className="customizer-top-bar">
        <button className="customizer-back-btn" onClick={onClose}>
          <ChevronLeft size={20} />
          <span>Back to Store</span>
        </button>
        <div className="customizer-title-center">
          <h2>{editMode ? 'Edit' : 'Customize'} {product.name}</h2>
        </div>
        <div className="customizer-history-actions">
          <button className="icon-action-btn disabled"><Undo2 size={18} /></button>
          <button className="icon-action-btn disabled"><Redo2 size={18} /></button>
          <button className="icon-action-btn"><HelpCircle size={18} /></button>
        </div>
      </div>

      {/* Main App Workspace View Split */}
      <div className="customizer-workspace">
        {/* Left Interactive Grid Sandbox Section */}
        <div className="customizer-preview-pane">
          {isPrintPack ? (
            <div className="print-pack-canvas-scroll">
              <div className="print-pack-grid-container">
                {gridItems.map((slot, index) => (
                  <div 
                    key={index} 
                    className={`print-pack-item-card ${slot ? 'has-content' : 'is-empty'}`}
                    onClick={() => handleOpenSidebarForSlot(index)}
                  >
                    {slot ? (
                      <div className="pack-image-wrapper">
                        <img src={slot.url} alt={`Slot ${index + 1}`} className="pack-slotted-img" />
                        <button 
                          className="remove-slot-item-btn" 
                          onClick={(e) => handleRemoveSlotPhoto(index, e)}
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="slot-badge-indicator">{index + 1}</div>
                      </div>
                    ) : (
                      <div className="pack-empty-placeholder">
                        <Plus size={20} className="placeholder-plus" />
                        <span>Add Photo {index + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Single Image Product Layout Frame Fallback View Wrapper */
            <div className="single-frame-view-canvas">
              <div 
                className="customizer-frame-shadow-wrapper"
                style={{ 
                  border: selectedFrame?.id !== 'none' ? `24px solid ${selectedFrame?.color || '#333'}` : '1px solid #ddd',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.15)'
                }}
              >
                {gridItems[0] ? (
                  <div className="single-image-wrapper" onClick={() => handleOpenSidebarForSlot(0)}>
                    <img src={gridItems[0].url} alt="Customized view" className="single-customizer-img" />
                    <button 
                      className="remove-slot-item-btn" 
                      onClick={(e) => handleRemoveSlotPhoto(0, e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="single-empty-placeholder" onClick={() => handleOpenSidebarForSlot(0)}>
                    <ImageIcon size={40} strokeWidth={1} />
                    <p>Click to add image template</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Configuration Setup Control Sidebar Section */}
        <div className="customizer-properties-pane">
          <div className="properties-section-group">
            <h3 className="section-label-heading">Size</h3>
            <div className="options-selection-grid">
              {MOCK_SIZES.map(size => (
                <button
                  key={size.id}
                  className={`option-pill-button ${selectedSize.id === size.id ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  <span className="pill-primary-title">{size.label}</span>
                  <span className="pill-subtitle-desc">{size.dimensions}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="properties-section-group">
            <h3 className="section-label-heading">Paper Type</h3>
            <div className="options-selection-grid">
              {MOCK_PAPERS.map(paper => (
                <button
                  key={paper.id}
                  className={`option-pill-button ${selectedPaper.id === paper.id ? 'active' : ''}`}
                  onClick={() => setSelectedPaper(paper)}
                >
                  <span className="pill-primary-title">{paper.name}</span>
                  <span className="pill-subtitle-desc">{paper.finish}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer Callout Row */}
          <div className="customizer-footer-action-buy">
            <div className="price-summary-box">
              <span className="computed-total-label">Total Price</span>
              <h2 className="computed-price-value">
                ${((product.basePrice || 45) + (selectedSize.priceModifier || 0)).toFixed(2)}
              </h2>
              <span className="tax-text">Tax not included</span>
            </div>

            <button 
              className="select-photos-btn" 
              onClick={() => { setActiveSlotIndex(null); setIsSidebarOpen(true); }}
            >
              <ImageIcon size={16} style={{ marginRight: '8px' }} />
              Browse Gallery Photos ({selectedPhotoIds.length}/{totalSlots})
            </button>

            <button 
              className="add-to-cart-action-submit-btn"
              onClick={handleAddToCartClick}
              disabled={selectedPhotoIds.length === 0}
            >
              <ShoppingCart size={18} style={{ marginRight: '8px' }} />
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Add Photos Sidebar Drawer */}
      <AddPhotosSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => { setIsSidebarOpen(false); setActiveSlotIndex(null); }}
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

















// import React, { useState, useEffect } from 'react';
// import { X, ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, Check, ChevronRight } from 'lucide-react';
// import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS, MOCK_LAYOUTS, MOCK_WALLS } from '../data/mockStoreData';
// import AddPhotosSidebar from './AddPhotosSidebar';

// export default function ProductCustomizer({ product, photos, initialPhotos, editMode, initialSize, initialFrame, initialPaper, onAddToCart, onClose, onOpenCart }) {
//   const [selectedSize, setSelectedSize] = useState(initialSize || MOCK_SIZES[0]);
//   const [selectedFrame, setSelectedFrame] = useState(
//     initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_light_wood') || MOCK_FRAMES[1]
//   );
//   const [selectedPaper, setSelectedPaper] = useState(initialPaper || MOCK_PAPERS[0]);
//   const [selectedLayout, setSelectedLayout] = useState(product.id === 'matted_collages' ? MOCK_LAYOUTS[0] : null);
//   const [selectedWall, setSelectedWall] = useState(product.id === 'matted_collages' ? MOCK_WALLS[0] : null);
  
//   const [gridItems, setGridItems] = useState([]);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [showCartModal, setShowCartModal] = useState(false);

//   useEffect(() => {
//     if (initialPhotos && initialPhotos.length > 0) {
//       setGridItems(initialPhotos.map(photo => ({
//         id: `${photo.id}_${Date.now()}_${Math.random()}`,
//         photo: photo,
//         quantity: 1
//       })));
//     }
//   }, [initialPhotos]);

//   const unitPrice =
//     product.basePrice +
//     selectedSize.priceModifier +
//     selectedFrame.priceModifier +
//     selectedPaper.priceModifier;

//   const totalQuantity = gridItems.reduce((sum, item) => sum + item.quantity, 0);
//   const totalPrice = unitPrice * totalQuantity;

//   const handleAddToCartClick = () => {
//     gridItems.forEach(item => {
//       if (item.quantity > 0) {
//         const cartItem = {
//           id: `${product.id}_${item.photo.id}_${Date.now()}_${Math.random()}`,
//           productName: product.name,
//           productId: product.id,
//           photo: item.photo,
//           size: selectedSize,
//           frame: selectedFrame,
//           paper: selectedPaper,
//           layout: selectedLayout,
//           wall: selectedWall,
//           quantity: item.quantity,
//           unitPrice,
//           totalPrice: unitPrice * item.quantity
//         };
//         onAddToCart(cartItem, true);
//       }
//     });
//     if (editMode) {
//       onOpenCart();
//     } else {
//       setShowCartModal(true);
//     }
//   };

//   const handleGoToCart = () => {
//     setShowCartModal(false);
//     onClose(); 
//     if (onOpenCart) onOpenCart();
//   };

//   const handleContinueShopping = () => {
//     setShowCartModal(false);
//     onClose();
//   };
//   const updateItemQuantity = (id, newQty) => {
//     setGridItems(prev => prev.map(item => 
//       item.id === id ? { ...item, quantity: Math.max(1, newQty) } : item
//     ));
//   };

//   const removeItem = (id) => {
//     setGridItems(prev => prev.filter(item => item.id !== id));
//   };

//   const togglePhoto = (photo) => {
//     const existingIndex = gridItems.findIndex(item => item.photo.id === photo.id);
//     if (existingIndex >= 0) {
//       setGridItems(prev => prev.filter((_, idx) => idx !== existingIndex));
//     } else {
//       setGridItems(prev => [...prev, {
//         id: `${photo.id}_${Date.now()}`,
//         photo: photo,
//         quantity: 1
//       }]);
//     }
//   };

//   const selectedPhotoIds = gridItems.map(item => item.photo.id);

//   return (
//     <div className="customizer-fullscreen">
//       {/* Top Navigation Bar */}
//       <div className="customizer-topbar">
//         <div className="topbar-left">
//           <button className="back-btn" onClick={onClose} aria-label="Go back">
//             <ChevronLeft size={20} />
//           </button>
//           <span className="product-title">{product.name}</span>
//         </div>
//       </div>

//       <div className="customizer-main-content-matted">
//         {/* Left: Preview Area */}
//         <div className="preview-area">
//           {product.id === 'matted_collages' && selectedWall && (
//             <div className="wall-preview-wrapper">
//               <img src={selectedWall.url} alt="Wall" className="wall-background-img" />
//               <div className="frame-on-wall">
//                 <div 
//                   className="matted-collage-frame" 
//                   style={{ 
//                     borderColor: selectedFrame?.color || '#000',
//                     backgroundColor: '#fff',
//                     padding: '3rem'
//                   }}
//                 >
//                   <div className="collage-layout">
//                     {/* Show dummy photos if no grid items */}
//                     {gridItems.length > 0 ? (
//                       gridItems.slice(0, 2).map((item, index) => (
//                         <div key={index} className="collage-photo-slot">
//                           <img src={item.photo.url} alt={`Collage ${index}`} />
//                         </div>
//                       ))
//                     ) : (
//                       <>
//                         <div className="collage-photo-slot">
//                           <div className="empty-slot">10x10</div>
//                         </div>
//                         <div className="collage-photo-slot">
//                           <div className="empty-slot">10x10</div>
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Wall Thumbnails */}
//           {product.id === 'matted_collages' && (
//             <div className="wall-thumbnails">
//               {MOCK_WALLS.map(wall => (
//                 <div 
//                   key={wall.id} 
//                   className={`wall-thumbnail ${selectedWall?.id === wall.id ? 'active' : ''}`} 
//                   onClick={() => setSelectedWall(wall)}
//                 >
//                   <img src={wall.url} alt={wall.label} />
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Right: Options Sidebar */}
//         <div className="options-sidebar">
//           <h2 className="sidebar-header">Style your {product.name}</h2>

//           {/* Frame Size */}
//           <div className="option-group">
//             <h4 className="option-label">Frame Size</h4>
//             <select 
//               className="option-select"
//               value={selectedSize.id}
//               onChange={(e) => setSelectedSize(MOCK_SIZES.find(s => s.id === e.target.value))}
//             >
//               {MOCK_SIZES.map(size => (
//                 <option key={size.id} value={size.id}>{size.label}</option>
//               ))}
//             </select>
//           </div>

//           {/* Color */}
//           <div className="option-group">
//             <h4 className="option-label">Color</h4>
//             <div className="color-options">
//               {MOCK_FRAMES.filter(frame => frame.id !== 'frame_none').map(frame => (
//                 <div 
//                   key={frame.id} 
//                   className={`color-option ${selectedFrame?.id === frame.id ? 'active' : ''}`}
//                   onClick={() => setSelectedFrame(frame)}
//                   title={frame.label}
//                 >
//                   {frame.colorThumb ? (
//                     <img src={frame.colorThumb} alt={frame.label} />
//                   ) : (
//                     <div style={{ backgroundColor: frame.color, width: '100%', height: '100%', borderRadius: '50%' }} />
//                   )}
//                   {selectedFrame?.id === frame.id && <Check size={16} className="check-icon" />}
//                 </div>
//               ))}
//               <button className="color-scroll-btn"><ChevronRight size={16} /></button>
//             </div>
//           </div>

//           {/* Layout */}
//           {product.id === 'matted_collages' && (
//             <div className="option-group">
//               <h4 className="option-label">Layout</h4>
//               <div className="layout-options">
//                 <button className="layout-scroll-btn"><ChevronLeft size={16} /></button>
//                 {MOCK_LAYOUTS.map(layout => (
//                   <div 
//                     key={layout.id} 
//                     className={`layout-option ${selectedLayout?.id === layout.id ? 'active' : ''}`}
//                     onClick={() => setSelectedLayout(layout)}
//                   >
//                     <img src={layout.thumbnail} alt={layout.label} />
//                     {selectedLayout?.id === layout.id && (
//                       <div className="layout-check">
//                         <Check size={14} />
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Price */}
//           <div className="price-section">
//             <span className="price">${totalPrice.toFixed(2)}</span>
//             <span className="tax-text">Tax not included</span>
//           </div>

//           {/* Select Photos Button */}
//           <button 
//             className="select-photos-btn" 
//             onClick={() => setIsSidebarOpen(true)}
//           >
//             Select photos
//           </button>

//           {/* Product Info Accordion */}
//           <div className="accordion">
//             <button className="accordion-header">Product Info <span className="accordion-icon">˅</span></button>
//           </div>
          
//           <div className="accordion">
//             <button className="accordion-header">Production & Shipping <span className="accordion-icon">˅</span></button>
//           </div>
//         </div>
//       </div>

//       {/* Add Photos Sidebar Drawer */}
//       <AddPhotosSidebar 
//         isOpen={isSidebarOpen} 
//         onClose={() => setIsSidebarOpen(false)}
//         collectionPhotos={photos}
//         selectedPhotoIds={selectedPhotoIds}
//         onTogglePhoto={togglePhoto}
//       />

//       {/* Added to Cart Modal */}
//       {showCartModal && (
//         <div className="cart-modal-overlay">
//           <div className="cart-modal">
//             <h3>{product.name} were added to the cart</h3>
//             <div className="cart-modal-actions">
//               <button className="btn-outline" onClick={handleGoToCart}>Go to cart</button>
//               <button className="btn-dark" onClick={handleContinueShopping}>Continue shopping</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
