import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, ChevronLeft, Undo2, Redo2, HelpCircle, Image as ImageIcon, RotateCw, Crop } from 'lucide-react';
import { MOCK_FRAMES, MOCK_PAPERS, MOCK_WALLS, MATTED_COLLAGE_SIZES, MATTED_COLLAGE_LAYOUTS, isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImageUtils';
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
  onBrowseGallery,
  customizerItems,
  setCustomizerItems,
  isDirectGallerySelection = true
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

  const [localItems, setLocalItems] = useState([]);
  const gridItems = customizerItems !== undefined ? customizerItems : localItems;
  const setGridItems = setCustomizerItems !== undefined ? setCustomizerItems : setLocalItems;
  const [hasInitialized, setHasInitialized] = useState(false);

  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  const [collagesList, setCollagesList] = useState([]);
  const [activeCollageIndex, setActiveCollageIndex] = useState(null);

  const [cropState, setCropState] = useState({
    isOpen: false,
    collageIndex: null,
    slotIndex: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
    aspect: 1
  });

  const getSlotAspectRatio = (layout, size, index) => {
    if (!layout || !size) return 1.0;
    const sizeMatch = size.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    let wCm = 25, hCm = 25;
    if (sizeMatch) {
      const d1 = parseFloat(sizeMatch[1]);
      const d2 = parseFloat(sizeMatch[2]);
      wCm = d1;
      hCm = d2;
      if (d1 !== d2) {
        const minD = Math.min(d1, d2);
        const maxD = Math.max(d1, d2);
        if (['grid_1x2_horizontal', 'grid_2x3', 'grid_2x2_landscape', 'grid_2x4', 'grid_2x5'].includes(layout.type)) {
          wCm = maxD;
          hCm = minD;
        } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right', 'grid_1left_3right', 'grid_3top_1bottom', 'grid_4x2', 'grid_5x2'].includes(layout.type)) {
          wCm = minD;
          hCm = maxD;
        }
      }
    }
    let cols = 1, rows = 1;
    let colSpan = 1, rowSpan = 1;
    const type = layout.type || 'grid_2x2';
    switch (type) {
      case 'grid_2x2':
      case 'grid_2x2_landscape':
        cols = 2; rows = 2;
        break;
      case 'grid_1x2_horizontal':
        cols = 2; rows = 1;
        break;
      case 'grid_3x2':
        cols = 2; rows = 3;
        break;
      case 'grid_2x3':
        cols = 3; rows = 2;
        break;
      case 'grid_1top_2bottom':
        cols = 2; rows = 2;
        if (index === 0) colSpan = 2;
        break;
      case 'grid_2top_1bottom':
        cols = 2; rows = 2;
        if (index === 2) colSpan = 2;
        break;
      case 'grid_1left_2right':
        cols = 2; rows = 2;
        if (index === 0) rowSpan = 2;
        break;
      case 'grid_2left_1right':
        cols = 2; rows = 2;
        if (index === 1) rowSpan = 2;
        break;
      case 'grid_asymmetric_4':
        if (index === 0) { colSpan = 1; rowSpan = 1.2; }
        else if (index === 1) { colSpan = 1; rowSpan = 0.4; }
        else if (index === 2) { colSpan = 1; rowSpan = 0.8; }
        else if (index === 3) { colSpan = 1; rowSpan = 1.2; }
        cols = 2; rows = 1.6;
        break;
      case 'grid_2x1_vertical':
        cols = 1; rows = 2;
        break;
      case 'grid_1left_3right':
        cols = 4; rows = 3;
        if (index === 0) { colSpan = 3; rowSpan = 3; }
        else { colSpan = 1; rowSpan = 1; }
        break;
      case 'grid_3top_1bottom':
        cols = 3; rows = 2;
        if (index === 3) colSpan = 3;
        break;
      case 'grid_3x3':
        cols = 3; rows = 3;
        break;
      case 'grid_4x4':
        cols = 4; rows = 4;
        break;
      case 'grid_4x2':
        cols = 2; rows = 4;
        break;
      case 'grid_5x2':
        cols = 2; rows = 5;
        break;
      case 'grid_2x4':
        cols = 4; rows = 2;
        break;
      case 'grid_2x5':
        cols = 5; rows = 2;
        break;
    }
    const cellWidth = wCm * (colSpan / cols);
    const cellHeight = hCm * (rowSpan / rows);
    return cellWidth / cellHeight;
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCropState(prev => ({ ...prev, croppedAreaPixels }));
  };

  const openCropModal = (collageIndex, slotIndex) => {
    const collage = collagesList[collageIndex];
    if (!collage) return;
    const aspect = getSlotAspectRatio(collage.layout, collage.size, slotIndex);
    setCropState({
      isOpen: true,
      collageIndex,
      slotIndex,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
      aspect
    });
  };

  const handleSaveCrop = async () => {
    if (!cropState.croppedAreaPixels || cropState.slotIndex === null || cropState.collageIndex === null) {
      setCropState(prev => ({ ...prev, isOpen: false }));
      return;
    }
    try {
      const collage = collagesList[cropState.collageIndex];
      const photoObj = collage?.photos[cropState.slotIndex];
      const photoUrlToCrop = photoObj?.url || '';
      if (!photoUrlToCrop) return;

      const croppedImage = await getCroppedImg(
        photoUrlToCrop,
        cropState.croppedAreaPixels
      );

      if (cropState.collageIndex === 0) {
        const updatedGrid = [...gridItems];
        if (updatedGrid[cropState.slotIndex]) {
          updatedGrid[cropState.slotIndex] = {
            ...updatedGrid[cropState.slotIndex],
            editedPhotoUrl: croppedImage
          };
          setGridItems(updatedGrid);
        }
      } else {
        setCollagesList(prev => {
          const updated = [...prev];
          const col = updated[cropState.collageIndex];
          const updatedSlots = [...col.photos];
          if (updatedSlots[cropState.slotIndex]) {
            updatedSlots[cropState.slotIndex] = {
              ...updatedSlots[cropState.slotIndex],
              editedPhotoUrl: croppedImage
            };
          }
          updated[cropState.collageIndex] = { ...col, photos: updatedSlots };
          return updated;
        });
      }
      setCropState(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error("Cropping failed:", e);
      setCropState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const rotatePhoto = (collageIndex, slotIndex) => {
    if (collageIndex === 0) {
      const updatedGrid = [...gridItems];
      if (updatedGrid[slotIndex]) {
        const currentRotation = updatedGrid[slotIndex].rotation || 0;
        const newRotation = (currentRotation + 90) % 360;
        updatedGrid[slotIndex] = {
          ...updatedGrid[slotIndex],
          rotation: newRotation
        };
        setGridItems(updatedGrid);
      }
    } else {
      setCollagesList(prev => {
        const updated = [...prev];
        const collage = updated[collageIndex];
        const updatedSlots = [...collage.photos];
        if (updatedSlots[slotIndex]) {
          const currentRotation = updatedSlots[slotIndex].rotation || 0;
          const newRotation = (currentRotation + 90) % 360;
          updatedSlots[slotIndex] = {
            ...updatedSlots[slotIndex],
            rotation: newRotation
          };
        }
        updated[collageIndex] = { ...collage, photos: updatedSlots };
        return updated;
      });
    }
  };

  // Sync first collage with gridItems and customization settings
  useEffect(() => {
    if (gridItems && gridItems.length > 0) {
      setCollagesList(prev => {
        if (prev.length === 0) {
          return [{
            id: `collage_0_${Date.now()}`,
            photos: [...gridItems],
            layout: selectedLayout,
            size: selectedSize,
            frame: selectedFrame,
            quantity: quantity
          }];
        }
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          photos: [...gridItems],
          layout: selectedLayout,
          size: selectedSize,
          frame: selectedFrame,
          quantity: quantity
        };
        return updated;
      });
    }
  }, [gridItems, selectedLayout, selectedSize, selectedFrame, quantity]);

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
    if (hasInitialized) return;
    let initialSlots = Array(totalSlots).fill(null);
    if (initialPhotos && initialPhotos.length > 0) {
      const nonNullPhotos = initialPhotos.filter(p => p !== null);
      if (nonNullPhotos.length > 0) {
        for (let i = 0; i < totalSlots; i++) {
          initialSlots[i] = nonNullPhotos[i % nonNullPhotos.length];
        }
      }
      setSelectedPhotoIds(initialSlots.map(p => p.id));
      setHasInitialized(true);
    } else if (photos && photos.length > 0) {
      const targetPhoto = photos.find(p => p.id === 'photo_6') || photos[0];
      for (let i = 0; i < totalSlots; i++) {
        initialSlots[i] = targetPhoto;
      }
      setSelectedPhotoIds(Array(totalSlots).fill(targetPhoto.id));
      setHasInitialized(true);
    }
    setGridItems(initialSlots);
  }, [initialPhotos, photos, totalSlots, hasInitialized]);

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

  const handleOpenSidebarForSlot = (collageIndex, index) => {
    if (collageIndex === 0 && onBrowseGallery) {
      onBrowseGallery(gridItems.filter(Boolean), index);
    } else {
      setActiveCollageIndex(collageIndex);
      setActiveSlotIndex(index);
      setIsSidebarOpen(true);
    }
  };

  const togglePhoto = (photo) => {
    if (activeSlotIndex !== null && activeCollageIndex !== null) {
      if (activeCollageIndex === 0) {
        const updatedGrid = [...gridItems];
        if (updatedGrid[activeSlotIndex]?.id === photo.id) {
          updatedGrid[activeSlotIndex] = null;
        } else {
          updatedGrid[activeSlotIndex] = photo;
        }
        setGridItems(updatedGrid);

        const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
        setSelectedPhotoIds(activeIds);
      } else {
        setCollagesList(prev => {
          const updated = [...prev];
          const collage = updated[activeCollageIndex];
          const updatedSlots = [...collage.photos];
          if (updatedSlots[activeSlotIndex]?.id === photo.id) {
            updatedSlots[activeSlotIndex] = null;
          } else {
            updatedSlots[activeSlotIndex] = photo;
          }
          updated[activeCollageIndex] = { ...collage, photos: updatedSlots };
          return updated;
        });
      }
      setIsSidebarOpen(false);
      setActiveSlotIndex(null);
      setActiveCollageIndex(null);
    }
  };

  const handleRemoveSlotPhoto = (collageIndex, index, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (collageIndex === 0) {
      const updatedGrid = [...gridItems];
      updatedGrid[index] = null;
      setGridItems(updatedGrid);
      const activeIds = updatedGrid.filter(item => item !== null).map(item => item.id);
      setSelectedPhotoIds(activeIds);
    } else {
      setCollagesList(prev => {
        const updated = [...prev];
        const collage = updated[collageIndex];
        const updatedSlots = [...collage.photos];
        updatedSlots[index] = null;
        updated[collageIndex] = { ...collage, photos: updatedSlots };
        return updated;
      });
    }
  };

  const addCollage = () => {
    const initialSlots = Array(totalSlots).fill(null);
    if (photos && photos.length > 0) {
      const targetPhoto = photos.find(p => p.id === 'photo_6') || photos[0];
      for (let i = 0; i < totalSlots; i++) {
        initialSlots[i] = targetPhoto;
      }
    }
    setCollagesList(prev => [
      ...prev,
      {
        id: `collage_${prev.length}_${Date.now()}_${Math.random()}`,
        photos: initialSlots,
        layout: selectedLayout,
        size: selectedSize,
        frame: selectedFrame,
        quantity: 1
      }
    ]);
  };

  const updateCollageQty = (index, delta) => {
    if (index === 0) {
      setQuantity(q => Math.max(1, q + delta));
    } else {
      setCollagesList(prev => {
        const updated = [...prev];
        updated[index].quantity = Math.max(1, updated[index].quantity + delta);
        return updated;
      });
    }
  };

  const deleteCollage = (index) => {
    if (collagesList.length <= 1) {
      alert("You must have at least one frame.");
      return;
    }
    const newCollages = collagesList.filter((_, i) => i !== index);
    setCollagesList(newCollages);
    if (index === 0) {
      setGridItems(newCollages[0].photos);
      setQuantity(newCollages[0].quantity);
    }
  };

  const updateCollageFrame = (index, frame) => {
    if (index === 0) {
      setSelectedFrame(frame);
    } else {
      setCollagesList(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], frame: frame };
        return updated;
      });
    }
  };

  const filledSlotsCount = gridItems.filter(item => item !== null).length;
  const hasEmptySlots = collagesList.some(collage => collage.photos.some(p => p === null));

  const currentPrice = ((product.basePrice || 104) + (selectedSize.priceModifier || 0));
  const totalPrice = collagesList.length > 0 
    ? collagesList.reduce((acc, collage) => {
        const price = ((product.basePrice || 104) + (collage.size?.priceModifier || 0));
        return acc + price * collage.quantity;
      }, 0)
    : currentPrice;

  const handleAddToCartClick = (forceEmpty = false) => {
    if (hasEmptySlots && !forceEmpty) {
      setShowWarningPopover(true);
      return;
    }

    collagesList.forEach((collage, idx) => {
      const finalPhotos = collage.photos.filter(item => item !== null);
      const collagePrice = ((product.basePrice || 104) + (collage.size?.priceModifier || 0));
      onAddToCart({
        id: idx === 0 ? (editingCartItemId || Date.now().toString()) : `${collage.id}_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        photo: finalPhotos[0] || null,
        photos: collage.photos,
        size: collage.size || selectedSize,
        frame: collage.frame || selectedFrame,
        paper: selectedPaper,
        border: selectedBorder,
        layout: collage.layout || selectedLayout,
        unitPrice: collagePrice,
        totalPrice: collagePrice * collage.quantity,
        quantity: collage.quantity
      }, true);
    });

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
          <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '40px', padding: '40px', boxSizing: 'border-box', overflowY: 'auto' }}>
            {collagesList.map((collage, collageIndex) => {
              const sizeMatch = collage.size?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
              let wCm = 25, hCm = 25;
              let currentAspect = 1.0;
              if (sizeMatch) {
                const d1 = parseFloat(sizeMatch[1]);
                const d2 = parseFloat(sizeMatch[2]);
                wCm = d1;
                hCm = d2;
                if (d1 !== d2) {
                  const minD = Math.min(d1, d2);
                  const maxD = Math.max(d1, d2);
                  if (['grid_1x2_horizontal', 'grid_2x3', 'grid_2x2_landscape', 'grid_2x4', 'grid_2x5'].includes(collage.layout?.type)) {
                    wCm = maxD;
                    hCm = minD;
                  } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right', 'grid_1left_3right', 'grid_3top_1bottom', 'grid_4x2', 'grid_5x2'].includes(collage.layout?.type)) {
                    wCm = minD;
                    hCm = maxD;
                  }
                }
                currentAspect = wCm / hCm;
              }

              return (
                <div key={collage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div 
                    className="customizer-frame-shadow-wrapper"
                    style={{ 
                      backgroundColor: collage.frame?.color || '#3e2723', 
                      backgroundImage: collage.frame?.colorThumb ? `url(${collage.frame.colorThumb})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.25)', 
                      height: '45vh',
                      width: `calc(45vh * ${currentAspect})`,
                      aspectRatio: `${wCm} / ${hCm}`,
                      padding: '5.5%', // Frame width
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="matted-frame-mat" style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: '#fff',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
                      padding: '12%',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div 
                        className="collage-grid-container" 
                        style={{ 
                          display: 'grid',
                          gridTemplateRows: (() => {
                            let gridTemplate = '1fr / 1fr';
                            const type = collage.layout?.type || 'grid_2x2';
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
                            const type = collage.layout?.type || 'grid_2x2';
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
                        }}
                      >
                        {Array(collage.layout?.photos || 4).fill(null).map((_, index) => {
                          const slot = collage.photos[index];
                          const customStyle = (() => {
                            switch (collage.layout?.type) {
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
                              onClick={() => handleOpenSidebarForSlot(collageIndex, index)}
                            >
                               {slot ? (
                                <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, position: 'relative' }}>
                                  <img 
                                    src={adjustPhotoUrl(slot.editedPhotoUrl || slot.url, isSlotLandscape(collage.layout?.type, index))} 
                                    alt={`Slot ${index + 1}`} 
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      minWidth: 0, 
                                      minHeight: 0, 
                                      objectFit: 'cover', 
                                      objectPosition: 'center 20%',
                                      transform: `rotate(${slot.rotation || 0}deg)`,
                                      transition: 'transform 0.2s ease'
                                    }} 
                                  />
                                  <div 
                                    className="slot-controls-overlay" 
                                    style={{ 
                                      position: 'absolute', 
                                      top: 0, 
                                      left: 0, 
                                      right: 0, 
                                      bottom: 0, 
                                      backgroundColor: 'rgba(0,0,0,0.15)', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '8px',
                                      zIndex: 10
                                    }}
                                  >
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openCropModal(collageIndex, index); }}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        color: '#111'
                                      }}
                                      title="Crop/Arrange Image"
                                    >
                                      <Crop size={12} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); rotatePhoto(collageIndex, index); }}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        color: '#111'
                                      }}
                                      title="Rotate Image"
                                    >
                                      <RotateCw size={12} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleRemoveSlotPhoto(collageIndex, index, e); }}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        color: '#111'
                                      }}
                                      title="Remove Photo"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
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
                    <span style={{ fontWeight: 500 }}>{collage.size?.label}</span>
                    <span style={{ color: '#ccc' }}>|</span>

                    <select
                      value={collage.frame?.id}
                      onChange={(e) => {
                        const fr = MOCK_FRAMES.find(f => f.id === e.target.value);
                        updateCollageFrame(collageIndex, fr);
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
                      {MOCK_FRAMES.filter(f => f.id !== 'frame_none').map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>

                    <span style={{ color: '#ccc' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #ddd', borderRadius: '20px', padding: '2px 8px', background: '#fff' }}>
                      <button 
                        onClick={() => updateCollageQty(collageIndex, -1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 600, color: '#111' }}>{collage.quantity}</span>
                      <button 
                        onClick={() => updateCollageQty(collageIndex, 1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666' }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ color: '#ccc' }}>|</span>
                    <button 
                      onClick={() => deleteCollage(collageIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' }}
                      title="Delete frame"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Right Side: Dashed Placeholder Box */}
            <div 
              style={{
                height: '45vh',
                width: `calc(45vh * ${currentAspect})`,
                aspectRatio: `${currentWidthCm} / ${currentHeightCm}`,
                border: '2px dashed #ccc',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
              onClick={addCollage}
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
                  onBrowseGallery(gridItems.filter(Boolean), null);
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
              onClick={addCollage}
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

      {/* Crop Modal Overlay */}
      {cropState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '90%',
            height: '70%',
            background: '#333',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <Cropper
              image={collagesList[cropState.collageIndex]?.photos[cropState.slotIndex]?.url || ''}
              crop={cropState.crop}
              zoom={cropState.zoom}
              aspect={cropState.aspect}
              onCropChange={(crop) => setCropState(prev => ({ ...prev, crop }))}
              onZoomChange={(zoom) => setCropState(prev => ({ ...prev, zoom }))}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '90%', maxWidth: '400px', margin: '20px auto 0 auto', color: 'white' }}>
            <button 
              onClick={() => setCropState(prev => ({ ...prev, zoom: Math.max(1, prev.zoom - 0.1) }))}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '24px', padding: '0 12px' }}
            >
              -
            </button>
            <input 
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={cropState.zoom}
              onChange={(e) => setCropState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
              style={{ flex: 1, accentColor: '#0d9488', cursor: 'pointer' }}
            />
            <button 
              onClick={() => setCropState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '24px', padding: '0 12px' }}
            >
              +
            </button>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => setCropState(prev => ({ ...prev, isOpen: false }))}
              style={{ padding: '9px 19px', background: 'transparent', color: '#0d9488', borderRadius: '4px', border: '1px solid #0d9488', cursor: 'pointer', fontWeight: '500' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveCrop}
              style={{ padding: '9px 19px', background: '#0d9488', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              Save Crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
