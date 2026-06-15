import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoreHeader from './components/StoreHeader';
import CoverHero from './components/CoverHero';
import PhotoGrid from './components/PhotoGrid';
import ShopLanding from './components/ShopLanding';
import AllProducts from './components/AllProducts';
import ProductCustomizer from './components/ProductCustomizer';
import MattedCollagesCustomizer from './components/MattedCollagesCustomizer';
import CartPage from './components/CartPage';
import ReviewPage from './components/ReviewPage';
import PaymentPage from './components/PaymentPage';
import TrackOrderPage from './components/TrackOrderPage';
import CheckoutForm from './components/CheckoutForm';
import StoreFooter from './components/StoreFooter';
import LeftSidebar from './components/LeftSidebar';
import ProductDetailPage from './components/ProductDetailPage';
import { MOCK_PHOTOS, MOCK_PRODUCTS } from './data/mockStoreData';
import { ShoppingBag, Heart, X, Check, Upload, Bookmark, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import './PrintStore.css';

export default function PrintStoreApp() {
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'light';
  const font = searchParams.get('font') || 'sans';

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'shop'
  const [activeCollection, setActiveCollection] = useState('portraits'); // 'favorites' | 'portraits'
  const [checkoutState, setCheckoutState] = useState('shopping'); // 'shopping' | 'cart' | 'checkout' | 'completed'
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'all-products'
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  const [customizingProduct, setCustomizingProduct] = useState(null); // Product we are currently picking photos for
  const [customizingProductOptions, setCustomizingProductOptions] = useState(null); // Selected options (size, frame, paper)
  
  // Interaction States
  const [favorites, setFavorites] = useState(['photo_2', 'photo_5']); // Initial mock favorites
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasPlacedOrder, setHasPlacedOrder] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null); // Photo currently open in lightbox
  const [gallerySelectedPhoto, setGallerySelectedPhoto] = useState(null); // Photo selected from gallery for shop use
  
  // Shopping Cart States
  const [cartItems, setCartItems] = useState([]);
  
  // Customizer States
  const [activeCustomizerProduct, setActiveCustomizerProduct] = useState(null);
  const [customizerPhoto, setCustomizerPhoto] = useState(null);
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [editingCartItemOptions, setEditingCartItemOptions] = useState(null);
  const [previousViewState, setPreviousViewState] = useState(null);

  // Refs for scroll-spy sections
  const galleryRef = useRef(null);
  const shopRef = useRef(null);

  // Scroll tracking for parallax reveal
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      const diff = currentScrollY - lastScrollY.current;
      // Use a 5px hysteresis delta threshold to filter out tiny sub-pixel updates
      if (Math.abs(diff) > 5) {
        if (diff > 0 && currentScrollY > 80) {
          setScrollDirection('down');
        } else if (diff < 0) {
          setScrollDirection('up');
        }
      }
      lastScrollY.current = currentScrollY;

      if (checkoutState === 'shopping' && activeCollection === 'portraits' && viewMode === 'landing') {
        if (shopRef.current) {
          const shopTop = shopRef.current.getBoundingClientRect().top + currentScrollY;
          // Trigger tab active transition
          if (currentScrollY >= shopTop - 200) {
            setActiveTab('shop');
          } else if (!gallerySelectedPhoto) {
            // Only auto-reset to gallery if user has NOT explicitly chosen a photo for the shop
            // (gallerySelectedPhoto is set when navigating via the lightbox Shop button)
            setActiveTab('gallery');
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkoutState, activeCollection, viewMode, gallerySelectedPhoto]);

  // ── Tab click handler ──
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setViewMode('landing');
    setTimeout(() => {
      if (tab === 'gallery') {
        const top = galleryRef.current ? galleryRef.current.getBoundingClientRect().top + window.scrollY - 60 : 0;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth'
        });
      } else if (tab === 'shop') {
        const top = shopRef.current ? shopRef.current.getBoundingClientRect().top + window.scrollY - 60 : 0;
        window.scrollTo({
          top: top,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  // ── Scroll action ──
  const handleScrollToGallery = () => {
    if (galleryRef.current) {
      const top = galleryRef.current.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  // ── Toggle favorite status ──
  const handleToggleFavorite = (photoId) => {
    if (!favorites.includes(photoId)) {
      setPendingFavoritePhotoId(photoId);
      setShowSaveModal(true);
    } else {
      setFavorites((prev) => prev.filter((id) => id !== photoId));
    }
  };

  const handleToggleSelectPhoto = (photoId) => {
    const isCurrentlySelected = selectedPhotos.includes(photoId);
    let newSelectedLength = selectedPhotos.length;
    
    if (isCurrentlySelected) {
      newSelectedLength -= 1;
    } else {
      newSelectedLength += 1;
    }

    if (newSelectedLength === 0) {
      setIsSelectionMode(false);
    } else if (!isSelectionMode) {
      setIsSelectionMode(true);
    }

    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // ── Trigger Customizer ──
  const handleOpenCustomizer = (product, photos = []) => {
    setActiveCustomizerProduct(product);
    // Convert array of photo IDs or photo objects to an array of photo objects
    const photoObjects = photos.map(p => typeof p === 'string' ? MOCK_PHOTOS.find(mock => mock.id === p) : p).filter(Boolean);
    // Default to first mock if empty for some reason
    setCustomizerPhoto(photoObjects.length ? photoObjects : [MOCK_PHOTOS[0]]);
  };

  // ── Enter Selection Mode for a Product ──
  const handleSelectPhotosForProduct = (prod, options = null) => {
    setCustomizingProduct(prod);
    setCustomizingProductOptions(options);
    setIsSelectionMode(true);
    setSelectedPhotos([]);
    setSelectedProductForDetail(null);
    setActiveTab('gallery');
    setActiveCollection('portraits');
    setViewMode('landing');
    
    // Scroll past the cover hero if we are in portraits
    setTimeout(() => {
      if (galleryRef.current) {
        const top = galleryRef.current.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }, 50);
  };

  const handleCancelCustomizing = () => {
    setIsSelectionMode(false);
    setSelectedProductForDetail(customizingProduct);
    setCustomizingProduct(null);
    setSelectedPhotos([]);
  };

  // ── Cart operations ──
  const handleAddToCart = (newItem, skipCartOpen = false) => {
    setCartItems((prev) => {
      if (editingCartItemId) {
        // If we are editing, update the item instead of adding a new one
        return prev.map(item => item.id === editingCartItemId ? { ...item, ...newItem, id: editingCartItemId } : item);
      }

      // If item with same product, photo, size, frame, paper, and border exists, increment quantity
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.photo?.id === newItem.photo?.id &&
          item.size?.id === newItem.size?.id &&
          item.frame?.id === newItem.frame?.id &&
          item.paper?.id === newItem.paper?.id &&
          item.border === newItem.border
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        updated[existingIdx].totalPrice = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        return updated;
      }

      return [...prev, newItem];
    });

    if (!skipCartOpen) {
      // Reset customizer and go to cart
      setActiveCustomizerProduct(null);
      setCustomizerPhoto(null);
      setEditingCartItemId(null);
      openCart();
    }
  };

  const openCart = () => {
    // Save current states before entering cart (only if not already in cart)
    setPreviousViewState((prev) => {
      if (checkoutState !== 'cart' && checkoutState !== 'review' && checkoutState !== 'payment') {
        return {
          selectedProductForDetail,
          viewMode,
          activeTab,
          activeCollection
        };
      }
      return prev;
    });
    setCheckoutState('cart');
  };

  const handleBackFromCart = () => {
    if (previousViewState) {
      setSelectedProductForDetail(previousViewState.selectedProductForDetail);
      setViewMode(previousViewState.viewMode);
      setActiveTab(previousViewState.activeTab);
      setActiveCollection(previousViewState.activeCollection);
    } else {
      // Fallback: reset to default shopping view
      setSelectedProductForDetail(null);
      setViewMode('landing');
      setActiveTab('gallery');
      setActiveCollection('portraits');
    }
    setCheckoutState('shopping');
  };

  const handleUpdateCartQuantity = (itemId, newQty) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
          : item
      )
    );
  };

  const handleRemoveCartItem = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // ── Filter photos based on folder view ──
  const getPhotosToDisplay = () => {
    if (activeCollection === 'favorites') {
      return MOCK_PHOTOS.filter((p) => favorites.includes(p.id));
    }
    return MOCK_PHOTOS;
  };

  // ── Batch purchase action ──
  const handleBuySelection = () => {
    if (selectedPhotos.length === 0) return;
    const firstSelectedPhoto = MOCK_PHOTOS.find((p) => p.id === selectedPhotos[0]);
    // Open customizer with first selected photo and default to Matted Frame
    handleOpenCustomizer(MOCK_PRODUCTS[1], firstSelectedPhoto);
    setSelectedPhotos([]);
    setIsSelectionMode(false);
  };

  const showCover = activeTab === 'gallery' && activeCollection === 'portraits' && checkoutState === 'shopping' && !isSelectionMode && viewMode === 'landing';

  const isHeaderThin = viewMode === 'all-products'
    ? (scrollDirection === 'down' && scrollY > 80)
    : (showCover ? scrollY > window.innerHeight + 336 : scrollY > 336);

  return (
    <div className={`printstore-container gallery-view-page theme-${theme} font-${font}`}>
      {/* 1. CoverHero Page fold */}
      {showCover && (
        <CoverHero onExplore={handleScrollToGallery} />
      )}

      {/* 2. Scrollable Content Wrapper (Slides up over cover) */}
      <div className={`printstore-scroll-content ${showCover ? 'has-cover' : ''}`}>
        {/* Top Header Nav */}
        {!selectedProductForDetail && checkoutState !== 'cart' && checkoutState !== 'review' && checkoutState !== 'payment' && (
          <StoreHeader
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            onOpenCart={openCart}
            activeCollection={activeCollection}
            setActiveCollection={setActiveCollection}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            scrollY={scrollY}
            showCover={showCover}
            isHeaderThin={isHeaderThin}
            hasPlacedOrder={hasPlacedOrder}
            onOpenMenu={() => setIsMenuOpen(true)}
            onOpenTrackOrder={() => setViewMode('tracking')}
            onNavigateToShop={() => {
              setActiveTab('shop');
              setViewMode('all-products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            customizingProduct={customizingProduct}
            onCancelCustomizing={handleCancelCustomizing}
          />
        )}

        {/* 3. Main Views Merged Flow */}
        {checkoutState === 'cart' ? (
          <CartPage
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onEditItem={(item) => {
              setEditingCartItemId(item.id);
              setActiveCustomizerProduct(MOCK_PRODUCTS.find(p => p.id === item.productId) || MOCK_PRODUCTS[0]);
              setCustomizerPhoto(item.photos && item.photos.length > 0 ? item.photos : [item.photo]);
              setEditingCartItemOptions({
                size: item.size,
                frame: item.frame,
                paper: item.paper,
                border: item.border,
                layout: item.layout
              });
              setCheckoutState('shopping');
            }}
            onBack={handleBackFromCart}
            onContinueToShipping={() => setCheckoutState('review')}
          />
        ) : checkoutState === 'review' ? (
          <ReviewPage
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onBack={() => setCheckoutState('cart')}
            onContinueToPayment={() => setCheckoutState('payment')}
          />
        ) : checkoutState === 'payment' ? (
          <PaymentPage
            cartItems={cartItems}
            onBack={() => setCheckoutState('review')}
            onPaymentSuccess={() => {
              setCartItems([]);
              setCheckoutState('shopping');
              setViewMode('tracking');
              setHasPlacedOrder(true);
            }}
          />
        ) : checkoutState === 'shopping' ? (
          selectedProductForDetail ? (
            <ProductDetailPage
              product={selectedProductForDetail}
              selectedPhotoUrl={gallerySelectedPhoto?.url}
              onBack={() => {
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              onSelectPhotosForProduct={handleSelectPhotosForProduct}
              onFinishAndPersonalize={(prod, options) => {
                // Go directly to customizer with the gallery photo
                const photoObj = gallerySelectedPhoto ? 
                  MOCK_PHOTOS.find(p => p.url === gallerySelectedPhoto.url) || gallerySelectedPhoto : 
                  MOCK_PHOTOS[0];
                setActiveCustomizerProduct(prod);
                setCustomizerPhoto([photoObj]);
                setCustomizingProductOptions(options);
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            />
          ) : viewMode === 'tracking' ? (
            <TrackOrderPage />
          ) : viewMode === 'all-products' ? (
            /* All Products Full Grid Screen */
            <div className="store-shopping-flow all-products-view">
              <AllProducts
                products={MOCK_PRODUCTS}
                selectedPhotoUrl={gallerySelectedPhoto?.url}
                onSelectProduct={(prod) => {
                  setSelectedProductForDetail(prod);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
              />
            </div>
          ) : (
            <div className="store-shopping-flow">
              {/* Gallery Section */}
              {activeTab === 'gallery' && (
                <div ref={galleryRef} className="gallery-section-wrapper">
                  <PhotoGrid
                    title={activeCollection === 'favorites' ? 'Favorites' : 'Portraits'}
                    photos={getPhotosToDisplay()}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onBuyPrint={(photo) => handleOpenCustomizer(MOCK_PRODUCTS[0], photo)}
                    isSelectionMode={isSelectionMode}
                    selectedPhotos={selectedPhotos}
                    onToggleSelectPhoto={handleToggleSelectPhoto}
                    onViewPhoto={(photo) => {
                      setViewingPhoto(photo);
                    }}
                    onSelectAll={() => {
                      const allPhotoIds = getPhotosToDisplay().map(p => p.id);
                      setSelectedPhotos(allPhotoIds);
                    }}
                    onDeselectAll={() => setSelectedPhotos([])}
                  />
                </div>
              )}

              {/* Shop Section - displayed below portraits in gallery mode, or as target of Shop navigation */}
              {(activeTab === 'shop' || (activeTab === 'gallery' && activeCollection === 'portraits' && !isSelectionMode)) && (
                <div ref={shopRef} className="shop-section-wrapper">
                  <ShopLanding
                    products={MOCK_PRODUCTS.slice(0, 3)} // Dibond, Matted, Gallery
                    selectedPhotoUrl={gallerySelectedPhoto?.url}
                    onSelectProduct={(prod) => {
                      setSelectedProductForDetail(prod);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    onExploreAll={() => {
                      setViewMode('all-products');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          )
        ) : checkoutState === 'checkout' ? (
          /* Checkout Shipping Forms Panel */
          <CheckoutForm
            cartItems={cartItems}
            onOrderCompleted={() => setCheckoutState('completed')}
            onBackToShopping={() => setCheckoutState('shopping')}
          />
        ) : (
          /* Order Complete Success Overlay */
          <div className="order-success-overlay">
            <div className="success-check-badge">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="success-title">Thank you for your order!</h2>
            <p className="success-text">
              Your print order has been mocked successfully. In a production environment, this request would be sent directly to the printing lab for processing.
            </p>
            <button
              className="explore-btn"
              onClick={() => {
                setCartItems([]);
                setCheckoutState('shopping');
                setActiveTab('gallery');
                setActiveCollection('portraits');
                setViewMode('landing');
              }}
            >
              Return to Gallery
            </button>
          </div>
        )}

        {/* Bottom Footer inside scroll flow — hidden on PDP */}
        {!selectedProductForDetail && checkoutState !== 'cart' && checkoutState !== 'review' && checkoutState !== 'payment' && <StoreFooter />}
      </div>

      {/* Photo Lightbox Viewer */}
      {viewingPhoto && (() => {
        const allPhotos = getPhotosToDisplay();
        const currentIdx = allPhotos.findIndex(p => p.id === viewingPhoto.id);
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < allPhotos.length - 1;
        return (
          <div className="photo-lightbox-overlay" onClick={() => setViewingPhoto(null)} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 9999 }}>
            
            {/* Top Bar Header */}
            <div 
              className="lightbox-header-bar" 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                position: 'absolute', 
                top: '16px', 
                right: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                zIndex: 100
              }}
            >
              <button 
                className="lightbox-icon-btn" 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '50%', 
                  width: '38px', 
                  height: '38px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: '#222',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '0'
                }}
              >
                <MoreVertical size={20} />
              </button>
              <button 
                className="lightbox-icon-btn" 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '50%', 
                  width: '38px', 
                  height: '38px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: '#222',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '0'
                }}
              >
                <Upload size={20} />
              </button>
              <button 
                className="lightbox-icon-btn" 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '50%', 
                  width: '38px', 
                  height: '38px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: '#222',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '0'
                }}
              >
                <Bookmark size={20} />
              </button>
              <button 
                className="lightbox-icon-btn" 
                onClick={() => handleToggleFavorite(viewingPhoto.id)}
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '50%', 
                  width: '38px', 
                  height: '38px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: favorites.includes(viewingPhoto.id) ? '#e04f5f' : '#222',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '0'
                }}
              >
                <Heart size={20} fill={favorites.includes(viewingPhoto.id) ? '#e04f5f' : 'none'} />
              </button>
              
              <button
                className="lightbox-shop-btn"
                onClick={() => {
                  // Save the photo for shop use
                  setGallerySelectedPhoto(viewingPhoto);
                  // Navigate to shop landing page
                  setViewMode('landing');
                  setActiveTab('shop');
                  setSelectedProductForDetail(null);
                  setCheckoutState('shopping');
                  // Close the lightbox
                  setViewingPhoto(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: '#222222',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Shop
              </button>
              
              <span style={{ height: '24px', width: '1px', backgroundColor: '#eaeaea', margin: '0 4px' }} />
              
              <button 
                className="lightbox-icon-btn" 
                onClick={() => setViewingPhoto(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#222', 
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {hasPrev && (
              <button
                className="lightbox-nav-btn prev"
                onClick={(e) => { e.stopPropagation(); setViewingPhoto(allPhotos[currentIdx - 1]); }}
                style={{
                  position: 'absolute',
                  left: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#222',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <ChevronLeft size={24} strokeWidth={1.5} />
              </button>
            )}

            <div className="lightbox-image-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '75vw', maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img key={viewingPhoto.id} src={viewingPhoto.url} alt={viewingPhoto.name} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
            </div>

            {hasNext && (
              <button
                className="lightbox-nav-btn next"
                onClick={(e) => { e.stopPropagation(); setViewingPhoto(allPhotos[currentIdx + 1]); }}
                style={{
                  position: 'absolute',
                  right: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#222',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <ChevronRight size={24} strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      })()}
      {/* 4. Batch Actions Toolbar (Appears at bottom during selection) */}
      {isSelectionMode && activeTab === 'gallery' && (
        <div className="selection-toolbar-floating selection-toolbar-redesign">
          <div className="selection-toolbar-left">
            <span className="selection-count">
              {selectedPhotos.length > 0 
                ? `${selectedPhotos.length} item${selectedPhotos.length === 1 ? '' : 's'} selected`
                : "Start selecting"}
            </span>
            {selectedPhotos.length > 0 && (
              <button 
                className="selection-view-link"
                onClick={() => {
                  // Scroll to top to view them or trigger something
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                View
              </button>
            )}
          </div>
          
          <div className="selection-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className={`finish-personalize-btn ${selectedPhotos.length === 0 ? 'disabled' : ''}`}
              disabled={selectedPhotos.length === 0}
              onClick={() => {
                if (selectedPhotos.length > 0) {
                  if (!customizingProduct) {
                    // Directly selecting from gallery - set the selected photo and go to Shop landing
                    const photoId = selectedPhotos[0];
                    const firstSelectedPhoto = MOCK_PHOTOS.find(p => p.id === photoId) || { id: photoId, url: photoId };
                    setGallerySelectedPhoto(firstSelectedPhoto);
                    setActiveTab('shop');
                    setViewMode('landing');
                    setCheckoutState('shopping');
                    setIsSelectionMode(false);
                    setSelectedPhotos([]);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    // Normal customizing flow
                    handleOpenCustomizer(customizingProduct, selectedPhotos);
                    setIsSelectionMode(false);
                    setCustomizingProduct(null);
                    setSelectedPhotos([]);
                    setSelectedProductType('');
                  }
                }
              }}
            >
              {customizingProduct ? 'Finish & Personalize' : 'Shop From This'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Product Options Configuration Modal */}
      {activeCustomizerProduct && (
        activeCustomizerProduct.id === 'matted_collages' ? (
          <MattedCollagesCustomizer
            product={activeCustomizerProduct}
            photos={MOCK_PHOTOS}
            initialPhotos={customizerPhoto}
            editingCartItemId={editingCartItemId}
            initialSize={editingCartItemId ? editingCartItemOptions?.size : customizingProductOptions?.size}
            initialFrame={editingCartItemId ? editingCartItemOptions?.frame : customizingProductOptions?.frame}
            initialPaper={editingCartItemId ? editingCartItemOptions?.paper : customizingProductOptions?.paper}
            initialBorder={editingCartItemId ? editingCartItemOptions?.border : customizingProductOptions?.border}
            initialLayout={editingCartItemId ? editingCartItemOptions?.layout : customizingProductOptions?.layout}
            initialEditedPhotoUrl={editingCartItemId ? editingCartItemOptions?.editedPhotoUrl : customizingProductOptions?.editedPhotoUrl}
            initialCustomBorderWidthCm={editingCartItemId ? editingCartItemOptions?.customBorderWidthCm : customizingProductOptions?.customBorderWidthCm}
            onAddToCart={handleAddToCart}
            onClose={() => {
              const productToRestore = activeCustomizerProduct;
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setCustomizingProductOptions(null);
              setEditingCartItemOptions(null);
              if (editingCartItemId) {
                setCheckoutState('cart');
                setEditingCartItemId(null);
              } else {
                // Navigate back to the product detail page (store), not gallery
                setSelectedProductForDetail(productToRestore);
                setActiveTab('shop');
                setViewMode('landing');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }
            }}
            onOpenCart={() => {
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setEditingCartItemId(null);
              setCustomizingProductOptions(null);
              setEditingCartItemOptions(null);
              openCart();
            }}
            onBrowseGallery={(currentPhotos) => {
              setIsSelectionMode(true);
              setSelectedPhotos(currentPhotos.map(p => p.id));
              setCustomizingProduct(activeCustomizerProduct);
              setCustomizingProductOptions({
                size: editingCartItemId ? editingCartItemOptions?.size : customizingProductOptions?.size,
                frame: editingCartItemId ? editingCartItemOptions?.frame : customizingProductOptions?.frame,
                paper: editingCartItemId ? editingCartItemOptions?.paper : customizingProductOptions?.paper,
                border: editingCartItemId ? editingCartItemOptions?.border : customizingProductOptions?.border,
                layout: editingCartItemId ? editingCartItemOptions?.layout : customizingProductOptions?.layout
              });
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setActiveTab('gallery');
              setActiveCollection('portraits');
              setViewMode('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <ProductCustomizer
            product={activeCustomizerProduct}
            photos={MOCK_PHOTOS}
            initialPhotos={customizerPhoto}
            editMode={!!editingCartItemId}
            editingCartItemId={editingCartItemId}
            initialSize={editingCartItemId ? editingCartItemOptions?.size : customizingProductOptions?.size}
            initialFrame={editingCartItemId ? editingCartItemOptions?.frame : customizingProductOptions?.frame}
            initialPaper={editingCartItemId ? editingCartItemOptions?.paper : customizingProductOptions?.paper}
            initialBorder={editingCartItemId ? editingCartItemOptions?.border : customizingProductOptions?.border}
            initialLayout={editingCartItemId ? editingCartItemOptions?.layout : customizingProductOptions?.layout}
            initialEditedPhotoUrl={editingCartItemId ? editingCartItemOptions?.editedPhotoUrl : customizingProductOptions?.editedPhotoUrl}
            initialCustomBorderWidthCm={editingCartItemId ? editingCartItemOptions?.customBorderWidthCm : customizingProductOptions?.customBorderWidthCm}
            onAddToCart={handleAddToCart}
            onClose={() => {
              const productToRestore = activeCustomizerProduct;
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setCustomizingProductOptions(null);
              setEditingCartItemOptions(null);
              if (editingCartItemId) {
                setCheckoutState('cart');
                setEditingCartItemId(null);
              } else {
                // Navigate back to the product detail page (store), not gallery
                setSelectedProductForDetail(productToRestore);
                setActiveTab('shop');
                setViewMode('landing');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }
            }}
            onOpenCart={() => {
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setEditingCartItemId(null);
              setCustomizingProductOptions(null);
              setEditingCartItemOptions(null);
              openCart();
            }}
            onBrowseGallery={(currentPhotos) => {
              setIsSelectionMode(true);
              setSelectedPhotos(currentPhotos.map(p => p.id));
              setCustomizingProduct(activeCustomizerProduct);
              setCustomizingProductOptions({
                size: editingCartItemId ? editingCartItemOptions?.size : customizingProductOptions?.size,
                frame: editingCartItemId ? editingCartItemOptions?.frame : customizingProductOptions?.frame,
                paper: editingCartItemId ? editingCartItemOptions?.paper : customizingProductOptions?.paper,
                border: editingCartItemId ? editingCartItemOptions?.border : customizingProductOptions?.border,
                layout: editingCartItemId ? editingCartItemOptions?.layout : customizingProductOptions?.layout
              });
              setActiveCustomizerProduct(null);
              setCustomizerPhoto(null);
              setActiveTab('gallery');
              setActiveCollection('portraits');
              setViewMode('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )
      )}

      {/* 5.5 Left Navigation Sidebar Drawer */}
      <LeftSidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isLoggedIn={isLoggedIn}
        onToggleLogin={() => setIsLoggedIn(!isLoggedIn)}
      />



      {/* 7. Save Collections Modal popup */}
      {showSaveModal && (
        <div className="save-collections-modal-overlay">
          <div className="save-collections-modal-box">
            <button 
              className="save-collections-close-btn"
              onClick={() => setShowSaveModal(false)}
              aria-label="Close dialog"
            >
              <X size={20} strokeWidth={1.5} color="#222222" />
            </button>
            <h3 className="save-collections-title">Save your collections</h3>
            <p className="save-collections-text">
              Create an account to save your collections, so you can come back to them anytime, from any device
            </p>
            <div className="save-collections-actions">
              <button 
                className="save-collections-btn-secondary"
                onClick={() => {
                  if (pendingFavoritePhotoId) {
                    setFavorites((prev) => [...prev, pendingFavoritePhotoId]);
                  }
                  setShowSaveModal(false);
                }}
              >
                Continue without saving
              </button>
              <button 
                className="save-collections-btn-primary"
                onClick={() => {
                  if (pendingFavoritePhotoId) {
                    setFavorites((prev) => [...prev, pendingFavoritePhotoId]);
                  }
                  setShowSaveModal(false);
                  alert("Creating a mock account... Collections saved!");
                }}
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SVG filter for deckled/hand-torn edge effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="deckled-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="slight-deckled-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
