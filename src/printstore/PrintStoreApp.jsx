import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoreHeader from './components/StoreHeader';
import CoverHero from './components/CoverHero';
import PhotoGrid from './components/PhotoGrid';
import ShopLanding from './components/ShopLanding';
import AllProducts from './components/AllProducts';
import ProductCustomizer from './components/ProductCustomizer';
import CartSidebar from './components/CartSidebar';
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
  const [checkoutState, setCheckoutState] = useState('shopping'); // 'shopping' | 'checkout' | 'completed'
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'all-products'
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  
  // Interaction States
  const [favorites, setFavorites] = useState(['photo_2', 'photo_5']); // Initial mock favorites
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingFavoritePhotoId, setPendingFavoritePhotoId] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Shopping Cart States
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Customizer States
  const [activeCustomizerProduct, setActiveCustomizerProduct] = useState(null);
  const [customizerPhoto, setCustomizerPhoto] = useState(null);

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

  // ── Toggle photo selection (batch actions) ──
  const handleToggleSelectPhoto = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // ── Trigger Customizer ──
  const handleOpenCustomizer = (product, photo = null) => {
    setActiveCustomizerProduct(product);
    setCustomizerPhoto(photo || MOCK_PHOTOS[0]);
  };

  // ── Cart operations ──
  const handleAddToCart = (newItem) => {
    setCartItems((prev) => {
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
        updated[existingIdx].totalPrice = updated[existingIdx].unitPrice * updated[existingIdx].quantity;
        return updated;
      }

      return [...prev, newItem];
    });

    // Reset customizer and open cart side panel
    setActiveCustomizerProduct(null);
    setCustomizerPhoto(null);
    setIsCartOpen(true);
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
        {!selectedProductForDetail && (
          <StoreHeader
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            onOpenCart={() => setIsCartOpen(true)}
            activeCollection={activeCollection}
            setActiveCollection={setActiveCollection}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            scrollY={scrollY}
            showCover={showCover}
            isHeaderThin={isHeaderThin}
            onOpenMenu={() => setIsMenuOpen(true)}
            onNavigateToShop={() => {
              setActiveTab('shop');
              setViewMode('all-products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* 3. Main Views Merged Flow */}
        {checkoutState === 'shopping' ? (
          selectedProductForDetail ? (
            <ProductDetailPage
              product={selectedProductForDetail}
              onBack={() => {
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              onStartCustomizing={(prod) => handleOpenCustomizer(prod, MOCK_PHOTOS[0])}
            />
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

        {/* Bottom Footer inside scroll flow */}
        <StoreFooter />
      </div>

      {/* 4. Batch Actions Toolbar (Appears at bottom during selection) */}
      {isSelectionMode && activeTab === 'gallery' && (
        <div className="selection-toolbar-floating">
          <div className="selection-toolbar-left">
            <span className="selection-count">
              {selectedPhotos.length > 0 
                ? `${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'photo' : 'photos'} selected`
                : "Start selecting items"}
            </span>
            {selectedPhotos.length > 0 && (
              <button 
                className="selection-view-btn"
                onClick={() => {
                  const firstSelectedPhoto = MOCK_PHOTOS.find((p) => p.id === selectedPhotos[0]);
                  handleOpenCustomizer(MOCK_PRODUCTS[0], firstSelectedPhoto);
                }}
              >
                View
              </button>
            )}
          </div>
          
          <div className="selection-toolbar-right">
            <button 
              className="selection-action-item"
              onClick={() => {
                const top = shopRef.current ? shopRef.current.getBoundingClientRect().top + window.scrollY - 60 : 0;
                window.scrollTo({ top, behavior: 'smooth' });
              }}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span>Shop</span>
            </button>
            
            <button 
              className="selection-action-item"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Collection link copied to clipboard!");
              }}
            >
              <Upload size={20} strokeWidth={1.5} />
              <span>Share</span>
            </button>
            
            <button 
              className="selection-action-item"
              onClick={() => {
                selectedPhotos.forEach((pid) => {
                  if (!favorites.includes(pid)) handleToggleFavorite(pid);
                });
                alert("Added selected photos to favorites collection!");
              }}
            >
              <Bookmark size={20} strokeWidth={1.5} />
              <span>Collections</span>
            </button>
            
            <span className="action-divider">|</span>
            
            <button 
              className="selection-close-btn"
              onClick={() => {
                setSelectedPhotos([]);
                setIsSelectionMode(false);
              }}
              aria-label="Clear selection"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Product Options Configuration Modal */}
      {activeCustomizerProduct && (
        <ProductCustomizer
          product={activeCustomizerProduct}
          photos={MOCK_PHOTOS}
          initialPhoto={customizerPhoto}
          onAddToCart={handleAddToCart}
          onClose={() => {
            setActiveCustomizerProduct(null);
            setCustomizerPhoto(null);
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

      {/* 6. Slide-Over Sidebar Cart Panel */}
      <CartSidebar
        isOpen={isCartOpen}
        cartItems={cartItems}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setCheckoutState('checkout');
        }}
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
