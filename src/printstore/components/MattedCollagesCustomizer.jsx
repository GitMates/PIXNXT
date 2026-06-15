import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { MOCK_FRAMES, MOCK_PAPERS, MOCK_WALLS, MATTED_COLLAGE_SIZES, MATTED_COLLAGE_LAYOUTS, isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';
import AddPhotosSidebar from './AddPhotosSidebar';

export default function MattedCollagesCustomizer({
  product,
  photos,
  initialPhotos,
  editingCartItemId,
  initialSize,
  initialFrame,
  initialPaper,
  initialBorder,
  initialLayout,
  onAddToCart,
  onClose,
  onOpenCart,
  onBrowseGallery
}) {
  const [selectedSize, setSelectedSize] = useState(
    initialSize || MATTED_COLLAGE_SIZES[0]
  );
  const [selectedFrame, setSelectedFrame] = useState(
    initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_lightwood') || MOCK_FRAMES[1]
  );
  const [selectedPaper, setSelectedPaper] = useState(initialPaper || MOCK_PAPERS[0]);
  const [selectedBorder, setSelectedBorder] = useState(initialBorder || 'none');
  const [selectedLayout, setSelectedLayout] = useState(() => {
    if (initialLayout) return initialLayout;
    const layouts = MATTED_COLLAGE_LAYOUTS[initialSize?.id || MATTED_COLLAGE_SIZES[0].id] || [];
    return layouts[0] || null;
  });

  const [quantity, setQuantity] = useState(1);
  const [showWarningPopover, setShowWarningPopover] = useState(false);

  const totalSlots = selectedLayout?.photos || 4;

  const [gridItems, setGridItems] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Compute aspect ratio based on selected size
  let currentAspect = 1.0;
  const sizeMatch = selectedSize?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  let currentWidthCm = 25;
  let currentHeightCm = 25;
  if (sizeMatch) {
    const d1 = parseFloat(sizeMatch[1]);
    const d2 = parseFloat(sizeMatch[2]);
    if (d1 !== d2) {
      const minD = Math.min(d1, d2);
      const maxD = Math.max(d1, d2);
      if (['grid_1x2_horizontal', 'grid_2x3', 'grid_2x2_landscape', 'grid_2x4', 'grid_2x5'].includes(selectedLayout?.type)) {
        currentWidthCm = maxD;
        currentHeightCm = minD;
      } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right', 'grid_1left_3right', 'grid_3top_1bottom', 'grid_4x2', 'grid_5x2'].includes(selectedLayout?.type)) {
        currentWidthCm = minD;
        currentHeightCm = maxD;
      } else {
        currentWidthCm = d1;
        currentHeightCm = d2;
      }
    } else {
      currentWidthCm = d1;
      currentHeightCm = d2;
    }
    currentAspect = currentWidthCm / currentHeightCm;
  }

  // Pre-populate grid slots with photos passed from gallery
  useEffect(() => {
    let initialSlots = Array(totalSlots).fill(null);
    if (initialPhotos && initialPhotos.length > 0) {
      const nonNullPhotos = initialPhotos.filter(p => p !== null);
      if (nonNullPhotos.length > 0) {
        for (let i = 0; i < totalSlots; i++) {
          initialSlots[i] = nonNullPhotos[i % nonNullPhotos.length];
        }
      }
      setSelectedPhotoIds(initialSlots.map(p => p.id));
    } else if (photos && photos.length > 0) {
      const targetPhoto = photos.find(p => p.id === 'photo_6') || photos[0];
      for (let i = 0; i < totalSlots; i++) {
        initialSlots[i] = targetPhoto;
      }
      setSelectedPhotoIds(Array(totalSlots).fill(targetPhoto.id));
    }
    setGridItems(initialSlots);
  }, [initialPhotos, photos, totalSlots]);

  // Sync layout if size changes
  useEffect(() => {
    if (MATTED_COLLAGE_LAYOUTS[selectedSize?.id]) {
      const layouts = MATTED_COLLAGE_LAYOUTS[selectedSize.id];
      setSelectedLayout(layouts[0]);
    }
  }, [selectedSize]);

  // Sync slots array length on layout change
  useEffect(() => {
    setGridItems(prev => {
      let nextGrid = Array(totalSlots).fill(null);
      prev.forEach((photo, idx) => {
        if (idx < totalSlots) {
          nextGrid[idx] = photo;
        }
      });
      const firstPhoto = prev.find(p => p !== null) || (photos && (photos.find(p => p.id === 'photo_6') || photos[0]));
      for (let i = 0; i < totalSlots; i++) {
        if (!nextGrid[i] && firstPhoto) {
          nextGrid[i] = firstPhoto;
        }
      }
      return nextGrid;
    });
  }, [totalSlots, photos]);

  const handleOpenSidebarForSlot = (index) => {
    if (onBrowseGallery) {
      onBrowseGallery(gridItems.filter(Boolean));
    } else {
      setActiveSlotIndex(index);
      setIsSidebarOpen(true);
    }
  };

  const togglePhoto = (photo) => {
    if (activeSlotIndex !== null) {
      const updatedGrid = [...gridItems];
      if (updatedGrid[activeSlotIndex]?.id === photo.id) {
        updatedGrid[activeSlotIndex] = null;
      } else {
        updatedGrid[activeSlotIndex] = photo;
      }
      setGridItems(updatedGrid);

      const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
      setSelectedPhotoIds(activeIds);
      setIsSidebarOpen(false);
      setActiveSlotIndex(null);
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

  const filledSlotsCount = gridItems.filter(item => item !== null).length;
  const hasEmptySlots = filledSlotsCount < totalSlots;

  const currentPrice = ((product.basePrice || 104) + (selectedSize.priceModifier || 0));

  const handleAddToCartClick = (forceEmpty = false) => {
    if (hasEmptySlots && !forceEmpty) {
      setShowWarningPopover(true);
      return;
    }

    const finalPhotos = gridItems.filter(item => item !== null);
    onAddToCart({
      id: editingCartItemId || Date.now().toString(),
      productId: product.id,
      productName: product.name,
      photo: finalPhotos[0] || null,
      photos: gridItems,
      size: selectedSize,
      frame: selectedFrame,
      paper: selectedPaper,
      border: selectedBorder,
      layout: selectedLayout,
      unitPrice: currentPrice,
      totalPrice: currentPrice * quantity,
      quantity: quantity
    }, true);
    setShowCartModal(true);
    setShowWarningPopover(false);
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
    <div className="product-customizer-fullscreen" style={{ background: '#f9f9f9', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 200 }}>
      {/* Top Header Controls Bar */}
      <div className="customizer-top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '64px', background: 'white', borderBottom: '1px solid #eaeaea', position: 'relative', flexShrink: 0 }}>
        <button className="customizer-back-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <ChevronLeft size={20} />
          <span>Matted Frame Collages</span>
        </button>
        
        <div className="customizer-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-action-btn disabled" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><Undo2 size={16} /> <span>Undo</span></button>
          <button className="icon-action-btn disabled" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><Redo2 size={16} /> <span>Redo</span></button>
          
          {hasEmptySlots && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowWarningPopover(!showWarningPopover)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#E04F5F',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>!</span>
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#C23D4B',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid white'
                }}>
                  1
                </span>
              </button>
            </div>
          )}
          
          <button className="icon-action-btn" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><HelpCircle size={20} /></button>
          
          <button className="cart-icon-wrapper" onClick={onOpenCart} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
            <ShoppingCart size={20} strokeWidth={1.5} color="#111" />
            <span className="cart-badge" style={{ background: '#c68e54' }}>0</span>
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>₹{currentPrice.toFixed(2)}</span>
            <span style={{ fontSize: '10px', color: '#777' }}>Tax not included</span>
          </div>
          
          <button 
            onClick={() => handleAddToCartClick()}
            style={{
              background: '#1e1e1e',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShoppingCart size={16} />
            <span>Add to cart</span>
          </button>
        </div>

        {/* Attention / Warning Popover Card */}
        {showWarningPopover && (
          <div 
            style={{
              position: 'absolute',
              top: '70px',
              right: '24px',
              width: '450px',
              background: 'white',
              border: '1px solid #eaeaea',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              zIndex: 250,
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111' }}>Some items need your attention</h3>
              <button 
                onClick={() => setShowWarningPopover(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: 0 }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666' }}>Some errors are critical and affect the final product</p>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '16px 0' }}>
              {/* Warning icon */}
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'black', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '14px' }}>
                <span style={{ margin: '0 auto' }}>!</span>
              </div>
              
              {/* Mini Frame Collage Preview */}
              <div style={{
                width: '70px',
                height: '70px',
                border: `3px solid ${selectedFrame?.color || '#3e2723'}`,
                background: 'white',
                padding: '4px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '2px'
                }}>
                  {Array(totalSlots).fill(null).map((_, i) => {
                    const item = gridItems[i];
                    return (
                      <div key={i} style={{ width: '100%', height: '100%', background: item ? 'transparent' : '#e0e0e0', overflow: 'hidden' }}>
                        {item && <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Text & Action Links */}
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#111' }}>Missing photos</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#555' }}>There are missing photos. Fill them in.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span 
                    onClick={() => setShowWarningPopover(false)} 
                    style={{ fontSize: '13px', fontWeight: 500, color: '#111', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    View
                  </span>
                  <span 
                    onClick={() => handleAddToCartClick(true)} 
                    style={{ fontSize: '13px', fontWeight: 500, color: '#111', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Leave empty
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main App Workspace View Split */}
      <div className="customizer-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Matted Collages Redesigned Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          {/* Subheader */}
          <div style={{ padding: '24px 24px 0 24px', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111', fontFamily: 'inherit' }}>{selectedSize?.label}</h3>
            <hr style={{ border: 'none', borderBottom: '1px solid #eaeaea', marginTop: '16px', marginBottom: 0 }} />
          </div>

          {/* Wall / Frame Area */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '40px', padding: '40px', boxSizing: 'border-box' }}>
            {/* Left Side: Frame Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div 
                className="customizer-frame-shadow-wrapper"
                style={{ 
                  backgroundColor: selectedFrame?.color || '#3e2723', 
                  boxShadow: '0 12px 36px rgba(0,0,0,0.25)', 
                  height: '45vh',
                  aspectRatio: `${currentWidthCm} / ${currentHeightCm}`,
                  padding: '5.5%', // Frame width
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  display: 'grid'
                }}
              >
                <div className="matted-frame-mat" style={{ 
                  width: '100%', 
                  height: '100%', 
                  backgroundColor: '#fff',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
                  padding: '12%',
                  boxSizing: 'border-box',
                  display: 'grid'
                }}>
                  <div 
                    className="collage-grid-container" 
                    style={{ 
                      display: 'grid',
                      gridTemplateRows: (() => {
                        let gridTemplate = '1fr / 1fr';
                        const type = selectedLayout?.type || 'grid_2x2';
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
                          case 'grid_3x3':
                            gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)';
                            break;
                          case 'grid_4x4':
                            gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)';
                            break;
                          case 'grid_4x2':
                            gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)';
                            break;
                          case 'grid_5x2':
                            gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)';
                            break;
                          case 'grid_2x4':
                            gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)';
                            break;
                          case 'grid_2x5':
                            gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)';
                            break;
                        }
                        return gridTemplate.split(' / ')[0];
                      })(),
                      gridTemplateColumns: (() => {
                        let gridTemplate = '1fr / 1fr';
                        const type = selectedLayout?.type || 'grid_2x2';
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
                          case 'grid_3x3':
                            gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)';
                            break;
                          case 'grid_4x4':
                            gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)';
                            break;
                          case 'grid_4x2':
                            gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)';
                            break;
                          case 'grid_5x2':
                            gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)';
                            break;
                          case 'grid_2x4':
                            gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)';
                            break;
                          case 'grid_2x5':
                            gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)';
                            break;
                        }
                        return gridTemplate.split(' / ')[1];
                      })(),
                      gap: '2%',
                      width: '100%',
                      height: '100%'
                    }}>
                    {Array(totalSlots).fill(null).map((_, index) => {
                      const slot = gridItems[index];
                      const customStyle = (() => {
                        switch (selectedLayout?.type) {
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

                      return (
                        <div 
                          key={index} 
                          className={`collage-slot-item ${slot ? 'has-content' : 'is-empty'}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            minWidth: 0,
                            minHeight: 0,
                            position: 'relative',
                            cursor: 'pointer',
                            border: slot ? 'none' : '1.5px dashed #ccc',
                            background: slot ? 'transparent' : '#f4f4f4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            ...customStyle
                          }}
                          onClick={() => handleOpenSidebarForSlot(index)}
                        >
                          {slot ? (
                            <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, position: 'relative' }}>
                              <img src={adjustPhotoUrl(slot.url, isSlotLandscape(selectedLayout?.type, index))} alt={`Slot ${index + 1}`} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover', objectPosition: 'center 20%' }} />
                              <button 
                                className="remove-slot-item-btn" 
                                style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, padding: '4px', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyCentert: 'center' }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveSlotPhoto(index, e); }}
                                title="Remove photo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#888' }}>
                              <Plus size={18} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Info & Adjuster Underneath Frame */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#555', marginTop: '8px' }}>
                <span style={{ fontWeight: 500 }}>{selectedSize?.label}</span>
                <span style={{ color: '#ccc' }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #ddd', borderRadius: '20px', padding: '2px 8px', background: '#fff' }}>
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 600, color: '#111' }}>{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                  >
                    +
                  </button>
                </div>
                <span style={{ color: '#ccc' }}>|</span>
                <button 
                  onClick={() => {
                    setGridItems(Array(totalSlots).fill(null));
                    setSelectedPhotoIds([]);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' }}
                  title="Clear photos"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Right Side: Dashed Placeholder Box */}
            <div 
              style={{
                height: '45vh',
                aspectRatio: `${currentWidthCm} / ${currentHeightCm}`,
                border: '2px dashed #ccc',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onClick={() => {
                alert("Add new frame to set! (Mock add frame)");
              }}
            >
              <Plus size={32} color="#aaa" />
            </div>
          </div>

          {/* Floating Bottom Pill Toolbar */}
          <div 
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              borderRadius: '30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              padding: '4px',
              gap: '8px',
              zIndex: 100
            }}
          >
            <button 
              onClick={() => {
                if (onBrowseGallery) {
                  onBrowseGallery(gridItems.filter(Boolean));
                } else {
                  setActiveSlotIndex(null);
                  setIsSidebarOpen(true);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                color: '#111'
              }}
            >
              <ImageIcon size={18} />
              <span>Photos</span>
            </button>
            <div style={{ width: '1px', background: '#eee', margin: '4px 0' }}></div>
            <button 
              onClick={() => {
                alert("Duplicating layout... (Mock add frame)");
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                color: '#111'
              }}
            >
              <Plus size={18} />
              <span>Add</span>
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
