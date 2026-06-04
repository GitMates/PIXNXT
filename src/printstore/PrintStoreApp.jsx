import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoreHeader from './components/StoreHeader';
import CoverHero from './components/CoverHero';
import PhotoGrid from './components/PhotoGrid';
import ShopLanding from './components/ShopLanding';
import AllProducts from './components/AllProducts';
import ProductCustomizer from './components/ProductCustomizer';
import CartPage from './components/CartPage';
import ReviewPage from './components/ReviewPage';
import PaymentPage from './components/PaymentPage';
import TrackOrderPage from './components/TrackOrderPage';
import CheckoutForm from './components/CheckoutForm';
import StoreFooter from './components/StoreFooter';
import LeftSidebar from './components/LeftSidebar';
import ProductDetailPage from './components/ProductDetailPage';
import { MOCK_PHOTOS, MOCK_PRODUCTS } from './data/mockStoreData';
import { ShoppingBag, Heart, X, Check, Upload, Bookmark } from 'lucide-react';
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
  
  // Shopping Cart States
  const [cartItems, setCartItems] = useState([]);
  
  // Customizer States
  const [activeCustomizerProduct, setActiveCustomizerProduct] = useState(null);
  const [customizerPhoto, setCustomizerPhoto] = useState(null);
  const [editingCartItemId, setEditingCartItemId] = useState(null);

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
          } else {
            setActiveTab('gallery');
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkoutState, activeCollection, viewMode]);

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
  const handleSelectPhotosForProduct = (prod) => {
    setCustomizingProduct(prod);
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

  // ── Cart operations ──
  const handleAddToCart = (newItem, skipCartOpen = false) => {
    setCartItems((prev) => {
      if (editingCartItemId) {
        // If we are editing, update the item instead of adding a new one
        return prev.map(item => item.id === editingCartItemId ? { ...item, ...newItem, id: editingCartItemId } : item);
      }

      // If item with same product, photo, size, frame, and paper exists, increment quantity
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.photo.id === newItem.photo.id &&
          item.size.id === newItem.size.id &&
          item.frame.id === newItem.frame.id &&
          item.paper.id === newItem.paper.id
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
      setCheckoutState('cart');
    }
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
            onOpenCart={() => setCheckoutState('cart')}
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
              setCustomizerPhoto([item.photo]);
              setCheckoutState('shopping');
            }}
            onBack={() => setCheckoutState('shopping')}
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
              onBack={() => {
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              onSelectPhotosForProduct={handleSelectPhotosForProduct}
            />
          ) : viewMode === 'tracking' ? (
            <TrackOrderPage />
          ) : viewMode === 'all-products' ? (
            /* All Products Full Grid Screen */
            <div className="store-shopping-flow all-products-view">
              <AllProducts
                products={MOCK_PRODUCTS}
                onSelectProduct={(prod) => {
                  setSelectedProductForDetail(prod);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
              />
            </div>
          ) : (
            <div className="store-shopping-flow">
              {/* Gallery Section */}
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
                  onSelectAll={() => {
                    const allPhotoIds = getPhotosToDisplay().map(p => p.id);
                    setSelectedPhotos(allPhotoIds);
                  }}
                  onDeselectAll={() => setSelectedPhotos([])}
                />
              </div>

              {/* Shop Section - displayed below portraits in gallery mode, or as target of Shop navigation */}
              {activeCollection === 'portraits' && !isSelectionMode && (
                <div ref={shopRef} className="shop-section-wrapper">
                  <ShopLanding
                    products={MOCK_PRODUCTS.slice(0, 3)} // Dibond, Matted, Gallery
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

      {/* 4. Batch Actions Toolbar (Appears at bottom during selection) */}
      {isSelectionMode && activeTab === 'gallery' && (
        <div className="selection-toolbar-floating selection-toolbar-redesign">
          <div className="selection-toolbar-left">
            <span className="selection-count">
              {selectedPhotos.length > 0 
                ? `${selectedPhotos.length} item${selectedPhotos.length === 1 ? '' : 's'} selected`
                : "Select items"}
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
            {!customizingProduct && (
              <select 
                value={selectedProductType} 
                onChange={(e) => setSelectedProductType(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  fontSize: '14px',
                  color: '#111',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select Frame Type</option>
                {MOCK_PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button 
              className={`finish-personalize-btn ${(selectedPhotos.length === 0 || (!customizingProduct && !selectedProductType)) ? 'disabled' : ''}`}
              disabled={selectedPhotos.length === 0 || (!customizingProduct && !selectedProductType)}
              onClick={() => {
                if (selectedPhotos.length > 0) {
                  // Animate the finish action
                  const productToCustomize = customizingProduct || MOCK_PRODUCTS.find(p => p.id === selectedProductType) || MOCK_PRODUCTS[0];
                  handleOpenCustomizer(productToCustomize, selectedPhotos);
                  setIsSelectionMode(false);
                  setCustomizingProduct(null);
                  setSelectedPhotos([]);
                  setSelectedProductType('');
                }
              }}
            >
              Finish & Personalize
            </button>
          </div>
        </div>
      )}

      {/* 5. Product Options Configuration Modal */}
      {activeCustomizerProduct && (
        <ProductCustomizer
          product={activeCustomizerProduct}
          photos={MOCK_PHOTOS}
          initialPhotos={customizerPhoto}
          editMode={!!editingCartItemId}
          onAddToCart={handleAddToCart}
          onClose={() => {
            setActiveCustomizerProduct(null);
            setCustomizerPhoto(null);
            setEditingCartItemId(null);
          }}
          onOpenCart={() => {
            setActiveCustomizerProduct(null);
            setCustomizerPhoto(null);
            setEditingCartItemId(null);
            setCheckoutState('cart');
          }}
        />
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
          <filter id="deckled-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="slight-deckled-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
