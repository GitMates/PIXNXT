import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, RotateCw } from 'lucide-react';
import { MOCK_SIZES, MOCK_FRAMES, MOCK_PAPERS, PRINT_PACK_SIZES, MATTED_FRAME_SIZES, GALLERY_BOARD_SIZES, CIRCULAR_FRAME_SIZES, FLOAT_FRAME_SIZES, ACRYLIC_PRINT_SIZES, MOCK_PHOTOS } from '../data/mockStoreData';
import AddPhotosSidebar from './AddPhotosSidebar';

export default function ProductCustomizer({
  product,
  photos,
  initialPhotos,
  editMode,
  initialSize,
  initialFrame,
  initialPaper,
  initialBorder,
  initialLayout,
  initialEditedPhotoUrl,
  initialCustomBorderWidthCm,
  onAddToCart,
  onClose,
  onOpenCart,
  onBrowseGallery,
  editingCartItemId,
  editingCartItemOptions
}) {
  const productSizes = 
    product.id === 'print_pack' ? PRINT_PACK_SIZES :
    product.id === 'matted_frame' ? MATTED_FRAME_SIZES :
    product.id === 'frames' ? MATTED_FRAME_SIZES :
    product.id === 'gallery_board' ? GALLERY_BOARD_SIZES :
    product.id === 'circular_frames' ? CIRCULAR_FRAME_SIZES :
    product.id === 'float_frames' ? FLOAT_FRAME_SIZES :
    product.id === 'acrylic_prints' ? ACRYLIC_PRINT_SIZES :
    MOCK_SIZES;

  const [selectedSize, setSelectedSize] = useState(
    initialSize || productSizes[0]
  );
  const [selectedPaper, setSelectedPaper] = useState(initialPaper || MOCK_PAPERS[0]);
  const [selectedBorder, setSelectedBorder] = useState(initialBorder || 'none');

  // List of customized items on the canvas
  const [items, setItems] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  const handleGoToCart = () => {
    setShowCartModal(false);
    onOpenCart();
  };

  const handleContinueShopping = () => {
    setShowCartModal(false);
    onClose();
  };

  // Initialize workspace items from initialPhotos or default to a single slot
  useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      setItems(initialPhotos.map((photo, idx) => ({
        id: `item_${idx}_${Date.now()}_${Math.random()}`,
        photo: photo,
        quantity: 1,
        frame: initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_black') || MOCK_FRAMES[1],
        rotation: 0
      })));
    } else {
      const defaultPhoto = (photos && photos.length > 0) ? photos[0] : MOCK_PHOTOS[0];
      setItems([{
        id: `item_0_${Date.now()}`,
        photo: defaultPhoto,
        quantity: 1,
        frame: initialFrame || MOCK_FRAMES.find(f => f.id === 'frame_black') || MOCK_FRAMES[1],
        rotation: 0
      }]);
    }
  }, [initialPhotos]);

  // Compute aspect ratio based on selected size for dynamic layouts
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

  // Workspace actions
  const addItem = () => {
    const defaultPhoto = (photos && photos.length > 0) ? photos[0] : MOCK_PHOTOS[0];
    const usedIds = items.map(item => item.photo?.id).filter(Boolean);
    const unusedPhoto = photos.find(p => !usedIds.includes(p.id)) || defaultPhoto;

    setItems(prev => [
      ...prev,
      {
        id: `item_${prev.length}_${Date.now()}_${Math.random()}`,
        photo: unusedPhoto,
        quantity: 1,
        frame: prev[prev.length - 1]?.frame || MOCK_FRAMES.find(f => f.id === 'frame_black') || MOCK_FRAMES[1],
        rotation: 0
      }
    ]);
  };

  const updateItemQty = (index, delta) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, updated[index].quantity + delta);
    setItems(updated);
  };

  const rotateItem = (index) => {
    const updated = [...items];
    updated[index].rotation = (updated[index].rotation + 90) % 360;
    setItems(updated);
  };

  const deleteItem = (index) => {
    if (items.length === 1) {
      const updated = [...items];
      updated[0].photo = null;
      setItems(updated);
    } else {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleOpenSidebarForSlot = (index) => {
    if (onBrowseGallery) {
      onBrowseGallery(items.map(item => item.photo).filter(Boolean));
    } else {
      setActiveSlotIndex(index);
      setIsSidebarOpen(true);
    }
  };

  const togglePhoto = (photo) => {
    if (activeSlotIndex !== null) {
      const updated = [...items];
      updated[activeSlotIndex].photo = photo;
      setItems(updated);
      setIsSidebarOpen(false);
      setActiveSlotIndex(null);
    }
  };

  // Pricing calculations
  const itemPrice = ((product.basePrice || 45) + (selectedSize.priceModifier || 0));
  const totalPrice = items.reduce((acc, item) => acc + (itemPrice + (item.frame?.priceModifier || 0)) * item.quantity, 0);

  const handleAddToCartClick = () => {
    const validItems = items.filter(item => item.photo !== null);
    if (validItems.length === 0) {
      alert("Please add at least one photo.");
      return;
    }

    validItems.forEach((item, index) => {
      const itemUnitPrice = itemPrice + (item.frame?.priceModifier || 0);
      onAddToCart({
        id: editingCartItemId && index === 0 ? editingCartItemId : `${item.id}_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        photo: item.photo,
        photos: [item.photo],
        size: selectedSize,
        frame: item.frame,
        paper: selectedPaper,
        border: selectedBorder,
        layout: null,
        unitPrice: itemUnitPrice,
        totalPrice: itemUnitPrice * item.quantity,
        quantity: item.quantity,
        editedPhotoUrl: initialEditedPhotoUrl || null,
        customBorderWidthCm: initialCustomBorderWidthCm || null
      }, true); // Always skip direct redirect to show cart modal
    });

    setShowCartModal(true);
  };

  const selectedPhotoIds = items.map(item => item.photo?.id).filter(Boolean);

  // Helper: prefer the user's cropped edit over the raw gallery URL
  const getPhotoSrc = (item) => initialEditedPhotoUrl || item?.photo?.url || '';

  const renderVisualizerCard = (item, index) => {
    if (product.id === 'float_frames') {
      return (
        <div 
          className="customizer-frame-shadow-wrapper"
          style={{ 
            backgroundColor: item.frame?.color || '#111111', 
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '257.27px',
            height: '307.25px',
            padding: '12px',
            boxSizing: 'border-box'
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
              padding: '3px',
              boxSizing: 'border-box',
              filter: 'url(#slight-deckled-edge) drop-shadow(2px 6px 12px rgba(0,0,0,0.22))',
              overflow: 'hidden'
            }}>
              {item.photo ? (
                <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }} onClick={() => handleOpenSidebarForSlot(index)}>
                  <img src={getPhotoSrc(item)} alt="" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `rotate(${item.rotation}deg)` }} />
                </div>
              ) : (
                <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleOpenSidebarForSlot(index)}>
                  <ImageIcon size={32} strokeWidth={1.5} color="#888" />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (product.id === 'matted_frame' || product.id === 'frames') {
      const pmatch = selectedSize?.printSize ? selectedSize.printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/) : null;
      const printW = pmatch ? parseFloat(pmatch[1]) : currentWidthCm * 0.71;
      const printH = pmatch ? parseFloat(pmatch[2]) : currentHeightCm * 0.80;

      const borderW = initialCustomBorderWidthCm > 0
        ? initialCustomBorderWidthCm
        : (currentWidthCm - printW) / 2;
      const borderH = initialCustomBorderWidthCm > 0
        ? initialCustomBorderWidthCm
        : (currentHeightCm - printH) / 2;

      const matW = printW + 2 * borderW;
      const matH = printH + 2 * borderH;
      const imgPctW = (printW / matW) * 100;
      const imgPctH = (printH / matH) * 100;

      return (
        <div 
          className="customizer-frame-shadow-wrapper"
          style={{ 
            backgroundColor: item.frame?.color || '#111111', 
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '257.27px',
            height: '307.25px',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div className="matted-frame-mat" style={{ 
            width: '100%', height: '100%', backgroundColor: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div className="matted-frame-photo-container" style={{
              position: 'relative',
              width: `${imgPctW}%`, 
              height: `${imgPctH}%`, 
              backgroundColor: 'transparent',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              {item.photo ? (
                <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }} onClick={() => handleOpenSidebarForSlot(index)}>
                  <img src={getPhotoSrc(item)} alt="" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `rotate(${item.rotation}deg)` }} />
                </div>
              ) : (
                <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleOpenSidebarForSlot(index)}>
                  <ImageIcon size={32} strokeWidth={1.5} color="#888" />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (product.id === 'circular_frames') {
      return (
        <div 
          className="product-card-circular_frames" 
          style={{ 
            '--frame-color': item.frame?.color || '#a89f91',
            width: '280px', 
            height: '280px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxSizing: 'border-box',
            background: 'transparent'
          }}
        >
          <div className="product-image-box" style={{ margin: '0 !important' }}>
            {item.photo ? (
              <img 
                src={getPhotoSrc(item)} 
                alt="" 
                className="product-image" 
                style={{ 
                  transform: `rotate(${item.rotation}deg)`,
                  cursor: 'pointer' 
                }} 
                onClick={() => handleOpenSidebarForSlot(index)}
              />
            ) : (
              <div 
                className="product-image" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  backgroundColor: '#e0e0e0',
                  border: 'none'
                }} 
                onClick={() => handleOpenSidebarForSlot(index)}
              >
                <ImageIcon size={32} strokeWidth={1.5} color="#888" />
              </div>
            )}
          </div>
        </div>
      );
    }


    // Print Pack — show stacked fanned 4-print preview
    if (product.id === 'print_pack') {
      return (
        <div
          className="customizer-frame-shadow-wrapper product-card-print_pack"
          style={{
            width: '257.27px',
            height: '307.25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            background: '#f8f8f8',
            padding: '1.5rem',
            overflow: 'visible',
            cursor: 'pointer'
          }}
          onClick={() => handleOpenSidebarForSlot(index)}
        >
          <div className="print-pack-container" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.photo ? (
              [0, 1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={getPhotoSrc(item)}
                  alt=""
                  className={`print-pack-img img-${i}`}
                  style={{
                    width: '55%',
                    aspectRatio: '4/5',
                    objectFit: 'cover',
                    position: 'absolute',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    padding: '8px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                    transform: i === 0 ? 'rotate(-8deg) translate(-12px, -8px)' : i === 1 ? 'rotate(-3deg) translate(-4px, -4px)' : i === 2 ? 'rotate(2deg) translate(4px, 2px)' : 'rotate(6deg) translate(12px, 8px)',
                    zIndex: i + 1,
                    filter: i < 3 ? `brightness(${0.92 + i * 0.03})` : undefined
                  }}
                />
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'absolute', zIndex: 10 }}>
                <ImageIcon size={32} strokeWidth={1.5} color="#888" />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default prints, acrylics, or dibonds
    const hasBorder = selectedBorder === 'white';
    return (
      <div 
        className="customizer-frame-shadow-wrapper"
        style={{ 
          border: (['frames', 'matted_frame', 'float_frames', 'circular_frames'].includes(product.id) && item.frame?.id !== 'none') ? `18px solid ${item.frame?.color || '#333'}` : '1px solid #ddd',
          boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
          width: '257.27px',
          height: '307.25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
          overflow: 'hidden'
        }}
      >
        {item.photo ? (
          <div 
            className="single-image-wrapper" 
            style={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative',
              padding: hasBorder ? '24px' : '0',
              boxSizing: 'border-box',
              backgroundColor: '#fff'
            }} 
            onClick={() => handleOpenSidebarForSlot(index)}
          >
            <img 
              src={getPhotoSrc(item)} 
              alt="" 
              className="single-customizer-img" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: hasBorder ? 'contain' : 'cover', 
                transform: `rotate(${item.rotation}deg)` 
              }} 
            />
          </div>
        ) : (
          <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleOpenSidebarForSlot(index)}>
            <ImageIcon size={32} strokeWidth={1.5} color="#888" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="product-customizer-fullscreen" style={{ background: '#f9f9f9', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 200 }}>
      {/* Top Header Controls Bar */}
      <div className="customizer-top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: '64px', background: 'white', borderBottom: '1px solid #eaeaea', position: 'relative', flexShrink: 0 }}>
        <button className="customizer-back-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <ChevronLeft size={20} />
          <span>{product.name}</span>
        </button>
        
        <div className="customizer-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-action-btn disabled" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><Undo2 size={16} /> <span>Undo</span></button>
          <button className="icon-action-btn disabled" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><Redo2 size={16} /> <span>Redo</span></button>
          <button className="icon-action-btn" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><HelpCircle size={20} /></button>
          
          <button className="cart-icon-wrapper" onClick={onOpenCart} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
            <ShoppingCart size={20} strokeWidth={1.5} color="#111" />
            <span className="cart-badge" style={{ background: '#c68e54' }}>0</span>
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>₹{totalPrice.toFixed(2)}</span>
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
      </div>

      {/* Main Workspace Layout Area */}
      <div className="customizer-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', minWidth: 0, width: '100%', overflow: 'hidden' }}>
          {/* Wall / Frame Layout Container */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', alignContent: items.length > 2 ? 'flex-start' : 'center', justifyContent: 'center', gap: '40px', padding: '40px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
            {/* Customized Frame Cards */}
            {items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                {/* Visualizer Frame */}
                {renderVisualizerCard(item, index)}

                {/* Card Controls Panel underneath each card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#555' }}>
                  {['frames', 'matted_frame', 'float_frames', 'circular_frames'].includes(product.id) ? (
                    <select
                      value={item.frame?.id}
                      onChange={(e) => {
                        const fr = MOCK_FRAMES.find(f => f.id === e.target.value);
                        const updated = [...items];
                        updated[index].frame = fr;
                        setItems(updated);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#111',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        outline: 'none',
                        maxWidth: '90px'
                      }}
                    >
                      {MOCK_FRAMES.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{selectedPaper.label}</span>
                  )}
                  
                  <span style={{ color: '#ddd' }}>|</span>
                  
                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #ddd', borderRadius: '20px', padding: '2px 8px', background: '#fff' }}>
                    <button 
                      onClick={() => updateItemQty(index, -1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '12px', textAlign: 'center', fontWeight: 600, color: '#111', fontSize: '13px' }}>{item.quantity}</span>
                    <button 
                      onClick={() => updateItemQty(index, 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                    >
                      +
                    </button>
                  </div>
                  
                  <span style={{ color: '#ddd' }}>|</span>
                  
                  {/* Rotate Control */}
                  <button 
                    onClick={() => rotateItem(index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' }}
                    title="Rotate photo"
                  >
                    <RotateCw size={14} />
                  </button>
                  
                  <span style={{ color: '#ddd' }}>|</span>
                  
                  {/* Delete Control */}
                  <button 
                    onClick={() => deleteItem(index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' }}
                    title="Delete frame"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Dashed placeholder card to add a new frame */}
            <div 
              style={{
                width: '257.27px',
                height: '307.25px',
                border: '2.5px dashed #cccccc',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                boxSizing: 'border-box',
                flexShrink: 0,
                transition: 'all 0.2s',
                marginBottom: '35px' // aligned with controls offset
              }}
              onClick={addItem}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
            >
              <Plus size={36} color="#999" />
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
              zIndex: 100,
              border: '1px solid #eaeaea'
            }}
          >
            <button 
              onClick={() => handleOpenSidebarForSlot(items.length - 1)}
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
              onClick={addItem}
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
