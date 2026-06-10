import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, Check, ChevronRight } from 'lucide-react';
import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS, MOCK_LAYOUTS, MOCK_WALLS, PRINT_PACK_SIZES, MATTED_FRAME_SIZES, GALLERY_BOARD_SIZES, CIRCULAR_FRAME_SIZES, FLOAT_FRAME_SIZES, ACRYLIC_PRINT_SIZES } from '../data/mockStoreData';
import AddPhotosSidebar from './AddPhotosSidebar';

export default function ProductCustomizer({ product, photos, initialPhotos, editMode, initialSize, initialFrame, initialPaper, initialBorder, onAddToCart, onClose, onOpenCart }) {
  const [selectedSize, setSelectedSize] = useState(
    initialSize || (
      product.id === 'print_pack' ? PRINT_PACK_SIZES[0] :
      product.id === 'matted_frame' ? MATTED_FRAME_SIZES[0] :
      product.id === 'gallery_board' ? GALLERY_BOARD_SIZES[0] :
      product.id === 'circular_frames' ? CIRCULAR_FRAME_SIZES[0] :
      product.id === 'float_frames' ? FLOAT_FRAME_SIZES[0] :
      product.id === 'acrylic_prints' ? ACRYLIC_PRINT_SIZES[0] :
      MOCK_SIZES[0]
    )
  );
  const [selectedFrame, setSelectedFrame] = useState(
    initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_light_wood') || MOCK_FRAMES[1]
  );
  const [selectedPaper, setSelectedPaper] = useState(initialPaper || MOCK_PAPERS[0]);
  const [selectedBorder, setSelectedBorder] = useState(initialBorder || 'none');
  const [selectedLayout, setSelectedLayout] = useState(product.id === 'matted_collages' ? MOCK_LAYOUTS[0] : null);
  const [selectedWall, setSelectedWall] = useState(product.id === 'matted_collages' ? MOCK_WALLS[0] : null);
  
  // Grid slots configuration based on whether it is a print pack/box product or single items
  const isPrintPack = product.id === 'print_packs' || product.id === 'print_boxes' || product.id === 'prints' || product.id === 'print_pack';
  const totalSlots = isPrintPack ? 12 : 1; 

  const [gridItems, setGridItems] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Compute aspect ratio based on selected size for dynamic frames (like float_frames)
  let currentAspect = 0.8;
  const sizeMatch = selectedSize?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  let currentWidthCm = 20;
  let currentHeightCm = 25;
  if (sizeMatch) {
    currentWidthCm = parseFloat(sizeMatch[1]);
    currentHeightCm = parseFloat(sizeMatch[2]);
    currentAspect = currentWidthCm / currentHeightCm;
  }

  let ffPrintWidth = currentWidthCm;
  let ffPrintHeight = currentHeightCm;
  if (product.id === 'float_frames' && selectedSize?.printSize) {
    const pMatch = selectedSize.printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (pMatch) {
      ffPrintWidth = parseFloat(pMatch[1]);
      ffPrintHeight = parseFloat(pMatch[2]);
    }
  }
  const ffPrintWidthPct = Math.min((ffPrintWidth / currentWidthCm) * 100, 100);
  const ffPrintHeightPct = Math.min((ffPrintHeight / currentHeightCm) * 100, 100);

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
      border: selectedBorder,
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
                      <div 
                        className="pack-image-wrapper"
                        style={{
                          backgroundColor: selectedBorder === 'white' ? '#fff' : 'transparent',
                          padding: selectedBorder === 'white' ? '3%' : '0',
                          boxSizing: 'border-box'
                        }}
                      >
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
          ) : product.id === 'float_frames' ? (
            /* Float Frames Customizer View */
            <div className="single-frame-view-canvas float-frame-customizer">
              <div 
                className="customizer-frame-shadow-wrapper"
                style={{ 
                  backgroundColor: selectedFrame?.color || '#111111', 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '70vh',
                  aspectRatio: currentAspect,
                  padding: '12px' // thin frame border width
                }}
              >
                <div className="float-frame-mat" style={{ 
                  width: '94%', height: '94%', backgroundColor: '#fdfdfd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  <div className="float-frame-photo-container" style={{
                    position: 'relative',
                    width: `${ffPrintWidthPct}%`, 
                    height: `${ffPrintHeightPct}%`, 
                    backgroundColor: '#fff',
                    padding: '3px', // VERY THIN white border inside
                    boxSizing: 'border-box',
                    filter: 'url(#slight-deckled-edge) drop-shadow(2px 6px 12px rgba(0,0,0,0.22))',
                  }}>
                    {gridItems[0] ? (
                      <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }} onClick={() => handleOpenSidebarForSlot(0)}>
                        <img src={gridItems[0].url} alt="Customized view" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button className="remove-slot-item-btn" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} onClick={(e) => { e.stopPropagation(); handleRemoveSlotPhoto(0, e); }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="single-empty-placeholder" onClick={() => handleOpenSidebarForSlot(0)}>
                        <ImageIcon size={40} strokeWidth={1} />
                        <p>Click to add image</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : product.id === 'matted_frame' || product.id === 'frames' ? (
            /* Matted Frames / Frames Customizer View */
            <div className="single-frame-view-canvas matted-frame-customizer">
              <div 
                className="customizer-frame-shadow-wrapper"
                style={{ 
                  backgroundColor: selectedFrame?.color || '#111111', 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '70vh',
                  aspectRatio: currentAspect,
                  padding: '16px' // Frame width
                }}
              >
                <div className="matted-frame-mat" style={{ 
                  width: '100%', height: '100%', backgroundColor: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div className="matted-frame-photo-container" style={{
                    position: 'relative',
                    width: '71%', 
                    height: '80%', 
                    backgroundColor: 'transparent',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    {gridItems[0] ? (
                      <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }} onClick={() => handleOpenSidebarForSlot(0)}>
                        <img src={gridItems[0].url} alt="Customized view" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button className="remove-slot-item-btn" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} onClick={(e) => { e.stopPropagation(); handleRemoveSlotPhoto(0, e); }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="single-empty-placeholder" onClick={() => handleOpenSidebarForSlot(0)}>
                        <ImageIcon size={40} strokeWidth={1} />
                        <p>Click to add image</p>
                      </div>
                    )}
                  </div>
                </div>
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
              {(
                product.id === 'print_pack' ? PRINT_PACK_SIZES :
                product.id === 'matted_frame' ? MATTED_FRAME_SIZES :
                product.id === 'gallery_board' ? GALLERY_BOARD_SIZES :
                product.id === 'circular_frames' ? CIRCULAR_FRAME_SIZES :
                product.id === 'float_frames' ? FLOAT_FRAME_SIZES :
                product.id === 'acrylic_prints' ? ACRYLIC_PRINT_SIZES :
                MOCK_SIZES
              ).map(size => (
                <button
                  key={size.id}
                  className={`option-pill-button ${selectedSize?.id === size.id ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  <span className="pill-primary-title">{size.label}</span>
                  <span className="pill-subtitle-desc">{size.dimensions || ''}</span>
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
  
//   // Grid slots configuration based on whether it is a print pack/box product or single items
//   const isPrintPack = product.id === 'print_packs' || product.id === 'print_boxes' || product.id === 'prints';
//   const totalSlots = isPrintPack ? 12 : 1; 

//   const [gridItems, setGridItems] = useState([]);
//   const [activeSlotIndex, setActiveSlotIndex] = useState(null);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [showCartModal, setShowCartModal] = useState(false);
//   const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

//   // Sync initial items and pre-populate slots
//   useEffect(() => {
//     let initialSlots = Array(totalSlots).fill(null);
//     if (initialPhotos && initialPhotos.length > 0) {
//       initialPhotos.forEach((photo, idx) => {
//         if (idx < totalSlots) {
//           initialSlots[idx] = photo;
//         }
//       });
//       setSelectedPhotoIds(initialPhotos.map(p => p.id));
//     } else if (photos && photos.length > 0) {
//       // Auto fill if standard gallery images exist
//       photos.slice(0, Math.min(3, totalSlots)).forEach((photo, idx) => {
//         initialSlots[idx] = photo;
//       });
//       setSelectedPhotoIds(photos.slice(0, Math.min(3, totalSlots)).map(p => p.id));
//     }
//     setGridItems(initialSlots);
//   }, [initialPhotos, photos, totalSlots]);

//   const handleOpenSidebarForSlot = (index) => {
//     setActiveSlotIndex(index);
//     setIsSidebarOpen(true);
//   };

//   const togglePhoto = (photo) => {
//     if (activeSlotIndex !== null) {
//       // Direct slot selection assignment assignment flow
//       const updatedGrid = [...gridItems];
//       if (updatedGrid[activeSlotIndex]?.id === photo.id) {
//         updatedGrid[activeSlotIndex] = null;
//       } else {
//         updatedGrid[activeSlotIndex] = photo;
//       }
//       setGridItems(updatedGrid);

//       // Recalculate unique active selection highlights
//       const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
//       setSelectedPhotoIds(activeIds);
//       setIsSidebarOpen(false);
//       setActiveSlotIndex(null);
//     } else {
//       // Fallback multiple auto-append assignment flow
//       const currentIdx = gridItems.findIndex(item => item === null);
//       if (selectedPhotoIds.includes(photo.id)) {
//         const updatedGrid = gridItems.map(item => item?.id === photo.id ? null : item);
//         setGridItems(updatedGrid);
//         setSelectedPhotoIds(prev => prev.filter(id => id !== photo.id));
//       } else if (currentIdx !== -1) {
//         const updatedGrid = [...gridItems];
//         updatedGrid[currentIdx] = photo;
//         setGridItems(updatedGrid);
//         setSelectedPhotoIds(prev => [...prev, photo.id]);
//       }
//     }
//   };

//   const handleRemoveSlotPhoto = (index, e) => {
//     e.stopPropagation();
//     const updatedGrid = [...gridItems];
//     updatedGrid[index] = null;
//     setGridItems(updatedGrid);
//     const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
//     setSelectedPhotoIds(activeIds);
//   };

//   const handleAddToCartClick = () => {
//     const finalPhotos = gridItems.filter(item => item !== null);
//     onAddToCart({
//       product,
//       size: selectedSize,
//       frame: selectedFrame,
//       paper: selectedPaper,
//       photos: finalPhotos,
//       quantity: 1
//     });
//     setShowCartModal(true);
//   };

//   const handleGoToCart = () => {
//     setShowCartModal(false);
//     onOpenCart();
//   };

//   const handleContinueShopping = () => {
//     setShowCartModal(false);
//     onClose();
//   };

//   return (
//     <div className="product-customizer-fullscreen">
//       {/* Top Header Controls Bar */}
//       <div className="customizer-top-bar">
//         <button className="customizer-back-btn" onClick={onClose}>
//           <ChevronLeft size={20} />
//           <span>Back to Store</span>
//         </button>
//         <div className="customizer-title-center">
//           <h2>{editMode ? 'Edit' : 'Customize'} {product.name}</h2>
//         </div>
//         <div className="customizer-history-actions">
//           <button className="icon-action-btn disabled"><Undo2 size={18} /></button>
//           <button className="icon-action-btn disabled"><Redo2 size={18} /></button>
//           <button className="icon-action-btn"><HelpCircle size={18} /></button>
//         </div>
//       </div>

//       {/* Main App Workspace View Split */}
//       <div className="customizer-workspace">
//         {/* Left Interactive Grid Sandbox Section */}
//         <div className="customizer-preview-pane">
//           {isPrintPack ? (
//             <div className="print-pack-canvas-scroll">
//               <div className="print-pack-grid-container">
//                 {gridItems.map((slot, index) => (
//                   <div 
//                     key={index} 
//                     className={`print-pack-item-card ${slot ? 'has-content' : 'is-empty'}`}
//                     onClick={() => handleOpenSidebarForSlot(index)}
//                   >
//                     {slot ? (
//                       <div className="pack-image-wrapper">
//                         <img src={slot.url} alt={`Slot ${index + 1}`} className="pack-slotted-img" />
//                         <button 
//                           className="remove-slot-item-btn" 
//                           onClick={(e) => handleRemoveSlotPhoto(index, e)}
//                           title="Remove photo"
//                         >
//                           <Trash2 size={14} />
//                         </button>
//                         <div className="slot-badge-indicator">{index + 1}</div>
//                       </div>
//                     ) : (
//                       <div className="pack-empty-placeholder">
//                         <Plus size={20} className="placeholder-plus" />
//                         <span>Add Photo {index + 1}</span>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ) : (
//             /* Single Image Product Layout Frame Fallback View Wrapper */
//             <div className="single-frame-view-canvas">
//               <div 
//                 className="customizer-frame-shadow-wrapper"
//                 style={{ 
//                   border: selectedFrame?.id !== 'none' ? `24px solid ${selectedFrame?.color || '#333'}` : '1px solid #ddd',
//                   boxShadow: '0 12px 36px rgba(0,0,0,0.15)'
//                 }}
//               >
//                 {gridItems[0] ? (
//                   <div className="single-image-wrapper" onClick={() => handleOpenSidebarForSlot(0)}>
//                     <img src={gridItems[0].url} alt="Customized view" className="single-customizer-img" />
//                     <button 
//                       className="remove-slot-item-btn" 
//                       onClick={(e) => handleRemoveSlotPhoto(0, e)}
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="single-empty-placeholder" onClick={() => handleOpenSidebarForSlot(0)}>
//                     <ImageIcon size={40} strokeWidth={1} />
//                     <p>Click to add image template</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Right Configuration Setup Control Sidebar Section */}
//         <div className="customizer-properties-pane">
//           <div className="properties-section-group">
//             <h3 className="section-label-heading">Size</h3>
//             <div className="options-selection-grid">
//               {MOCK_SIZES.map(size => (
//                 <button
//                   key={size.id}
//                   className={`option-pill-button ${selectedSize.id === size.id ? 'active' : ''}`}
//                   onClick={() => setSelectedSize(size)}
//                 >
//                   <span className="pill-primary-title">{size.label}</span>
//                   <span className="pill-subtitle-desc">{size.dimensions}</span>
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="properties-section-group">
//             <h3 className="section-label-heading">Paper Type</h3>
//             <div className="options-selection-grid">
//               {MOCK_PAPERS.map(paper => (
//                 <button
//                   key={paper.id}
//                   className={`option-pill-button ${selectedPaper.id === paper.id ? 'active' : ''}`}
//                   onClick={() => setSelectedPaper(paper)}
//                 >
//                   <span className="pill-primary-title">{paper.name}</span>
//                   <span className="pill-subtitle-desc">{paper.finish}</span>
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Action Footer Callout Row */}
//           <div className="customizer-footer-action-buy">
//             <div className="price-summary-box">
//               <span className="computed-total-label">Total Price</span>
//               <h2 className="computed-price-value">
//                 ${((product.basePrice || 45) + (selectedSize.priceModifier || 0)).toFixed(2)}
//               </h2>
//               <span className="tax-text">Tax not included</span>
//             </div>

//             <button 
//               className="select-photos-btn" 
//               onClick={() => { setActiveSlotIndex(null); setIsSidebarOpen(true); }}
//             >
//               <ImageIcon size={16} style={{ marginRight: '8px' }} />
//               Browse Gallery Photos ({selectedPhotoIds.length}/{totalSlots})
//             </button>

//             <button 
//               className="add-to-cart-action-submit-btn"
//               onClick={handleAddToCartClick}
//               disabled={selectedPhotoIds.length === 0}
//             >
//               <ShoppingCart size={18} style={{ marginRight: '8px' }} />
//               Add to Cart
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Add Photos Sidebar Drawer */}
//       <AddPhotosSidebar 
//         isOpen={isSidebarOpen} 
//         onClose={() => { setIsSidebarOpen(false); setActiveSlotIndex(null); }}
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
















