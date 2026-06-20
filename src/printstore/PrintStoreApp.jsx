import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
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
import { 
  MOCK_PHOTOS, 
  MOCK_PRODUCTS,
  MOCK_SIZES,
  MOCK_FRAMES,
  MOCK_PAPERS,
  PRINT_PACK_SIZES,
  MATTED_FRAME_SIZES,
  GALLERY_BOARD_SIZES,
  CIRCULAR_FRAME_SIZES,
  FLOAT_FRAME_SIZES,
  ACRYLIC_PRINT_SIZES,
  DECKLED_PRINTS_SIZES,
  PANORAMIC_PRINTS_SIZES,
  CANVAS_SIZES,
  MOCK_WRAPS,
  MOCK_FINISHINGS,
  MATTED_COLLAGE_SIZES,
  PRINT_SIZES
} from './data/mockStoreData';
import { ShoppingBag, Heart, X, Check, Upload, Bookmark, ChevronLeft, ChevronRight, MoreVertical, ArrowUp } from 'lucide-react';
import './PrintStore.css';

export default function PrintStoreApp() {
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'light';
  const font = searchParams.get('font') || 'sans';

  const [photographer, setPhotographer] = useState(() => {
    try {
      const slug = searchParams.get('slug') || searchParams.get('collection') || 'default';
      const cached = localStorage.getItem(`pixnxt_printstore_photographer_${slug}`);
      return cached ? JSON.parse(cached) : { id: '', display_name: '', email: '' };
    } catch (e) {
      return { id: '', display_name: '', email: '' };
    }
  });

  const [collectionId, setCollectionId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [products, setProducts] = useState([]);

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
  
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Shopping Cart States
  const [cartItems, setCartItems] = useState(() => {
    try {
      const cached = localStorage.getItem('pixnxt_printstore_cart');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedShippingAddress, setSavedShippingAddress] = useState(() => {
    try {
      const cached = localStorage.getItem('pixnxt_printstore_address');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (savedShippingAddress) {
        localStorage.setItem('pixnxt_printstore_address', JSON.stringify(savedShippingAddress));
      }
    } catch (e) {
      console.error("Failed to save shipping address to localStorage:", e);
    }
  }, [savedShippingAddress]);
  
  // Customizer States
  const [activeCustomizerProduct, setActiveCustomizerProduct] = useState(null);
  const [customizerPhoto, setCustomizerPhoto] = useState(null);
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [editingCartItemOptions, setEditingCartItemOptions] = useState(null);
  const [previousViewState, setPreviousViewState] = useState(null);
  const [customizerItems, setCustomizerItems] = useState([]);
  const [customizerActiveSlotIndex, setCustomizerActiveSlotIndex] = useState(null);
  const [isDirectGallerySelection, setIsDirectGallerySelection] = useState(true);

  // Refs for scroll-spy sections
  const loadPhotographer = async () => {
    try {
      let id = '';
      let display_name = '';
      let email = '';
      let resolvedSessionId = '';

      // 1. Try to load photographer by collection slug in query parameters
      const slug = searchParams.get('slug') || searchParams.get('collection');
      if (slug) {
        const { data: collection } = await supabase
          .from('collections')
          .select('id, photographer_id')
          .eq('slug', slug)
          .maybeSingle();

        if (collection?.id) {
          setCollectionId(collection.id);
          // Resolve session
          const visitorEmail = localStorage.getItem(`pixnxt_fav_email_${collection.id}`);
          if (visitorEmail) {
            const { data: session } = await supabase
              .from('client_sessions')
              .select('id')
              .eq('collection_id', collection.id)
              .eq('visitor_email', visitorEmail)
              .maybeSingle();
            if (session?.id) {
              setSessionId(session.id);
              resolvedSessionId = session.id;
            }
          }
        }

        if (collection?.photographer_id) {
          const { data: profile } = await supabase
            .from('photographers')
            .select('id, display_name, email')
            .eq('id', collection.photographer_id)
            .maybeSingle();

          if (profile?.display_name) {
            id = profile.id;
            display_name = profile.display_name;
            email = profile.email || 'kbaskaran@example.com';
          }
        }
      }

      // 2. If not resolved by slug, try to resolve via active user session
      if (!display_name) {
        let user = null;
        try {
          const { data, error } = await supabase.auth.getUser();
          if (data && !error) {
            user = data.user;
          }
        } catch (authErr) {
          console.warn("Could not get authenticated user:", authErr);
        }

        if (user) {
          const { data: profile } = await supabase
            .from('photographers')
            .select('id, display_name, email')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.display_name) {
            id = profile.id;
            display_name = profile.display_name;
            email = profile.email || user.email || 'kbaskaran@example.com';
          }
        }
      }

      // 3. Fallback: load first photographer in database
      if (!display_name) {
        const { data: profiles } = await supabase
          .from('photographers')
          .select('id, display_name, email')
          .limit(1);

        if (profiles?.[0]?.display_name) {
          id = profiles[0].id;
          display_name = profiles[0].display_name;
          email = profiles[0].email || 'kbaskaran@example.com';
        }
      }

      // 4. Update state if resolved
      if (display_name) {
        const profileData = {
          id,
          display_name,
          email: email || 'kbaskaran@example.com'
        };
        setPhotographer(profileData);
        const cacheSlug = searchParams.get('slug') || searchParams.get('collection') || 'default';
        localStorage.setItem(`pixnxt_printstore_photographer_${cacheSlug}`, JSON.stringify(profileData));
      }

      return resolvedSessionId;
    } catch (err) {
      console.error("Error resolving photographer dynamic info:", err);
      return '';
    }
  };

  // Coordinator effect to initialize photographer, products, and cart on load
  useEffect(() => {
    async function initApp() {
      setLoading(true);
      try {
        const resolvedSessionId = await loadPhotographer();
        await Promise.all([
          loadProducts(),
          loadCart(resolvedSessionId)
        ]);
      } catch (err) {
        console.error("Error initializing print store:", err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, [searchParams]);

  // Shared mapper function to convert DB product rows to frontend shape
  const mapProductRow = (p) => ({
    ...p,
    id: p.product_type, // Map product_type to id for backward compatibility
    db_id: p.id, // Store actual database primary key id
    basePrice: parseFloat(p.base_price),
    image: p.image_url
  });

  // Shared mapper function to convert DB cart item rows to frontend shape
  const mapCartItemRow = (item) => {
    const opts = item.options || {};
    return {
      id: item.id,
      productId: opts.productId || '',
      productName: opts.productName || '',
      photo: opts.photo || null,
      photos: opts.photos || [],
      size: opts.size || null,
      frame: opts.frame || null,
      paper: opts.paper || null,
      border: opts.border || 'none',
      layout: opts.layout || null,
      rotation: opts.rotation || 0,
      quantity: item.quantity,
      unitPrice: parseFloat(opts.unitPrice || 0),
      totalPrice: parseFloat(opts.unitPrice || 0) * item.quantity,
      product_db_id: item.product_id
    };
  };

  const loadProducts = async () => {
    try {
      // Fetch all products currently in the database (visible or hidden)
      let { data, error } = await supabase
        .from('printstore_products')
        .select('*');

      if (error) throw error;

      const existingTypes = new Set((data || []).map(p => p.product_type));
      const missingProducts = MOCK_PRODUCTS.filter(item => !existingTypes.has(item.id));

      if (missingProducts.length > 0) {
        console.log("Seeding missing print store products:", missingProducts.map(p => p.id));
        const seededData = [];

        for (const item of missingProducts) {
          let sizes = [];
          let frames = [];
          let papers = [];
          let wraps = [];
          let finishings = [];

          if (item.id === 'dibond') {
            sizes = MOCK_SIZES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'matted_frame') {
            sizes = MATTED_FRAME_SIZES;
            frames = MOCK_FRAMES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'gallery_board') {
            sizes = GALLERY_BOARD_SIZES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'frames') {
            sizes = MOCK_SIZES;
            frames = MOCK_FRAMES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'canvas') {
            sizes = CANVAS_SIZES;
            wraps = MOCK_WRAPS;
          } else if (item.id === 'acrylic_prints') {
            sizes = ACRYLIC_PRINT_SIZES;
            finishings = MOCK_FINISHINGS;
          } else if (item.id === 'circular_frames') {
            sizes = CIRCULAR_FRAME_SIZES;
            frames = MOCK_FRAMES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'float_frames') {
            sizes = FLOAT_FRAME_SIZES;
            frames = MOCK_FRAMES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'matted_collages') {
            sizes = MATTED_COLLAGE_SIZES;
            frames = MOCK_FRAMES;
          } else if (item.id === 'prints') {
            sizes = PRINT_SIZES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'panoramic_prints') {
            sizes = PANORAMIC_PRINTS_SIZES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'deckled_prints') {
            sizes = DECKLED_PRINTS_SIZES;
            papers = MOCK_PAPERS;
          } else if (item.id === 'print_pack') {
            sizes = PRINT_PACK_SIZES;
            papers = MOCK_PAPERS;
          }

          const options = { sizes, frames, papers, wraps, finishings, borders: [] };

          const { data: inserted, error: insertError } = await supabase
            .from('printstore_products')
            .insert({
              product_type: item.id,
              name: item.name,
              description: item.description,
              base_price: item.basePrice,
              image_url: item.image,
              options: options,
              is_visible: true
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Error seeding product ${item.id}:`, insertError.message);
          } else if (inserted) {
            console.log(`Successfully seeded missing product ${item.id}`);
            seededData.push(inserted);
          }
        }

        if (seededData.length > 0) {
          data = [...(data || []), ...seededData];
        }
      }

      // Filter only visible products and sort by creation time
      const visibleProducts = (data || [])
        .filter(p => p.is_visible)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setProducts(visibleProducts.map(mapProductRow));
    } catch (err) {
      console.error("Error loading print store products:", err);
      // Fallback to static mock products if db query fails
      setProducts(MOCK_PRODUCTS);
    }
  };

  // ── Supabase Realtime: Products ──
  // Listen for changes to printstore_products and re-fetch visible products live
  useEffect(() => {
    const channel = supabase
      .channel('printstore-products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'printstore_products' },
        async (payload) => {
          console.log('Realtime products change detected:', payload);
          try {
            const { data, error } = await supabase
              .from('printstore_products')
              .select('*')
              .eq('is_visible', true)
              .order('created_at', { ascending: true });
            if (!error && data) {
              console.log('Realtime products list refreshed:', data);
              setProducts(data.map(mapProductRow));
            }
          } catch (err) {
            console.error('Realtime products refresh error:', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime products subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Supabase Realtime: Cart Items ──
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('printstore-cart-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'printstore_cart_items' },
        async (payload) => {
          console.log('Realtime cart change detected:', payload);
          try {
            let userId = null;
            try {
              const { data } = await supabase.auth.getUser();
              if (data?.user) userId = data.user.id;
            } catch (e) {}

            const row = payload.new || payload.old;
            if (!row) return;

            // Verify if the changed row belongs to our visitor session or logged in user
            const isOurItem = userId 
              ? row.user_id === userId 
              : row.session_id === sessionId;

            if (!isOurItem) return;

            setCartItems((prev) => {
              let updated = [...prev];
              if (payload.eventType === 'INSERT') {
                const newItem = mapCartItemRow(payload.new);
                // Check if already exists in state
                const exists = updated.some(item => 
                  item.id === newItem.id || 
                  (item.productId === newItem.productId &&
                   item.photo?.id === newItem.photo?.id &&
                   item.size?.id === newItem.size?.id &&
                   item.frame?.id === newItem.frame?.id &&
                   item.paper?.id === newItem.paper?.id &&
                   item.border === newItem.border)
                );
                if (exists) {
                  // Swap ID or update quantities if already present
                  updated = updated.map(item => {
                    if (item.productId === newItem.productId &&
                        item.photo?.id === newItem.photo?.id &&
                        item.size?.id === newItem.size?.id &&
                        item.frame?.id === newItem.frame?.id &&
                        item.paper?.id === newItem.paper?.id &&
                        item.border === newItem.border) {
                      return { ...item, id: newItem.id, quantity: newItem.quantity, totalPrice: newItem.totalPrice };
                    }
                    return item;
                  });
                } else {
                  updated.push(newItem);
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedItem = mapCartItemRow(payload.new);
                updated = updated.map(item => 
                  item.id === updatedItem.id ||
                  (item.productId === updatedItem.productId &&
                   item.photo?.id === updatedItem.photo?.id &&
                   item.size?.id === updatedItem.size?.id &&
                   item.frame?.id === updatedItem.frame?.id &&
                   item.paper?.id === updatedItem.paper?.id &&
                   item.border === updatedItem.border) ? updatedItem : item
                );
              } else if (payload.eventType === 'DELETE') {
                updated = updated.filter(item => item.id !== payload.old.id);
              }
              localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated));
              return updated;
            });
          } catch (err) {
            console.error('Realtime cart refresh error:', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime cart subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadCart = async (activeSessionId) => {
    try {
      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (e) {
        console.warn("Auth user query failed:", e);
      }

      const currentSessionId = activeSessionId || sessionId;

      // If we have either userId or currentSessionId, load from Supabase
      if (userId || currentSessionId) {
        const query = supabase
          .from('printstore_cart_items')
          .select('*');

        if (userId) {
          query.eq('user_id', userId);
        } else {
          query.eq('session_id', currentSessionId);
        }

        const { data: cartData, error } = await query;
        if (error) throw error;

        if (cartData) {
          // Map table rows to frontend cart items
          const mappedCart = cartData.map(mapCartItemRow);
          setCartItems(mappedCart);
          localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(mappedCart));
          return;
        }
      }

      // Fallback: load from local storage
      const localCart = localStorage.getItem('pixnxt_printstore_cart');
      if (localCart) {
        setCartItems(JSON.parse(localCart));
      }
    } catch (err) {
      console.error("Error loading cart items from Supabase:", err);
      // Fallback: local storage
      const localCart = localStorage.getItem('pixnxt_printstore_cart');
      if (localCart) {
        setCartItems(JSON.parse(localCart));
      }
    }
  };

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
    const finalPhotos = photoObjects.length ? photoObjects : [MOCK_PHOTOS[0]];
    setCustomizerPhoto(finalPhotos);

    if (customizerActiveSlotIndex !== null && customizerItems && customizerItems.length > 0) {
      const updated = [...customizerItems];
      if (photoObjects.length > 0) {
        const currentSlotPhotoId = product.id === 'matted_collages' ? 
          updated[customizerActiveSlotIndex]?.id : 
          updated[customizerActiveSlotIndex]?.photo?.id;
          
        const newPhoto = photoObjects.find(p => p.id !== currentSlotPhotoId) || photoObjects[0];
        if (newPhoto) {
          if (product.id === 'matted_collages') {
            updated[customizerActiveSlotIndex] = newPhoto;
          } else {
            updated[customizerActiveSlotIndex] = {
              ...updated[customizerActiveSlotIndex],
              photo: newPhoto
            };
          }
        }
      }
      setCustomizerItems(updated);
      setCustomizerActiveSlotIndex(null);
    } else {
      setCustomizerItems([]);
    }
  };

  // ── Enter Selection Mode for a Product ──
  const handleSelectPhotosForProduct = (prod, options = null) => {
    setCustomizingProduct(prod);
    setCustomizingProductOptions(options);
    setIsSelectionMode(true);
    setSelectedPhotos([]);
    setIsDirectGallerySelection(false);
    setCustomizerItems([]);
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
  const handleAddToCart = async (newItem, skipCartOpen = false) => {
    const matchedProduct = products.find(p => p.id === newItem.productId);
    const productDbId = matchedProduct ? matchedProduct.db_id : null;

    // Generate a temporary local ID if we don't have a database ID yet
    const localId = editingCartItemId || `local_${Date.now()}`;
    
    // Update local state immediately (optimistic update)
    setCartItems((prev) => {
      let updatedCart = [];
      if (editingCartItemId) {
        updatedCart = prev.map(item => item.id === editingCartItemId ? { ...item, ...newItem, id: editingCartItemId } : item);
      } else {
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
          updatedCart = updated;
        } else {
          const itemToAdd = {
            ...newItem,
            id: localId,
            product_db_id: productDbId
          };
          updatedCart = [...prev, itemToAdd];
        }
      }

      localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updatedCart));
      return updatedCart;
    });

    if (!skipCartOpen) {
      setActiveCustomizerProduct(null);
      setCustomizerPhoto(null);
      setEditingCartItemId(null);
      openCart();
    }

    // Sync to Supabase in the background
    let userId = null;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        userId = data.user.id;
      }
    } catch (e) {}

    if (userId || sessionId) {
      try {
        if (editingCartItemId) {
          if (typeof editingCartItemId === 'string' && !editingCartItemId.startsWith('local_')) {
            await supabase
              .from('printstore_cart_items')
              .update({
                quantity: newItem.quantity,
                options: {
                  productId: newItem.productId,
                  productName: newItem.productName,
                  photo: newItem.photo,
                  photos: newItem.photos,
                  size: newItem.size,
                  frame: newItem.frame,
                  paper: newItem.paper,
                  border: newItem.border,
                  layout: newItem.layout,
                  rotation: newItem.rotation || 0,
                  unitPrice: newItem.unitPrice
                }
              })
              .eq('id', editingCartItemId);
          }
        } else {
          const query = supabase
            .from('printstore_cart_items')
            .select('*');

          if (userId) {
            query.eq('user_id', userId);
          } else {
            query.eq('session_id', sessionId);
          }
          query.eq('product_id', productDbId);

          const { data: existingItems } = await query;
          const duplicate = (existingItems || []).find(item => {
            const opts = item.options;
            return (
              opts.productId === newItem.productId &&
              opts.photo?.id === newItem.photo?.id &&
              opts.size?.id === newItem.size?.id &&
              opts.frame?.id === newItem.frame?.id &&
              opts.paper?.id === newItem.paper?.id &&
              opts.border === newItem.border
            );
          });

          if (duplicate) {
            const newQuantity = duplicate.quantity + newItem.quantity;
            await supabase
              .from('printstore_cart_items')
              .update({ quantity: newQuantity })
              .eq('id', duplicate.id);
            
            // Swap the local ID with the real database ID
            setCartItems((prev) => {
              const updated = prev.map(item => 
                item.id === localId ? { ...item, id: duplicate.id } : item
              );
              localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated));
              return updated;
            });
          } else {
            const { data: inserted, error } = await supabase
              .from('printstore_cart_items')
              .insert({
                user_id: userId,
                session_id: userId ? null : (sessionId || null),
                product_id: productDbId,
                quantity: newItem.quantity,
                options: {
                  productId: newItem.productId,
                  productName: newItem.productName,
                  photo: newItem.photo,
                  photos: newItem.photos,
                  size: newItem.size,
                  frame: newItem.frame,
                  paper: newItem.paper,
                  border: newItem.border,
                  layout: newItem.layout,
                  rotation: newItem.rotation || 0,
                  unitPrice: newItem.unitPrice
                }
              })
              .select()
              .single();
            
            if (!error && inserted) {
              // Swap the local ID with the real database ID
              setCartItems((prev) => {
                const updated = prev.map(item => 
                  item.id === localId ? { ...item, id: inserted.id } : item
                );
                localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated));
                return updated;
              });
            }
          }
        }
      } catch (err) {
        console.error("Error syncing cart item to Supabase:", err);
      }
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

  const handleUpdateCartQuantity = async (itemId, newQty) => {
    if (typeof itemId === 'string' && !itemId.startsWith('local_')) {
      try {
        await supabase
          .from('printstore_cart_items')
          .update({ quantity: newQty })
          .eq('id', itemId);
      } catch (err) {
        console.error("Error updating cart quantity in Supabase:", err);
      }
    }

    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
          : item
      );
      localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveCartItem = async (itemId) => {
    if (typeof itemId === 'string' && !itemId.startsWith('local_')) {
      try {
        await supabase
          .from('printstore_cart_items')
          .delete()
          .eq('id', itemId);
      } catch (err) {
        console.error("Error removing cart item from Supabase:", err);
      }
    }

    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePlaceOrder = async (shippingDetails) => {
    try {
      const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
      const shipping = subtotal > 100 ? 0 : 9.99;
      const tax = subtotal * 0.08;
      const total = subtotal + shipping + tax;

      const photographerId = photographer?.id;
      if (!photographerId) {
        throw new Error("No photographer ID resolved. Order cannot be placed.");
      }

      const { data: order, error: orderError } = await supabase
        .from('printstore_orders')
        .insert({
          photographer_id: photographerId,
          session_id: sessionId || null,
          customer_name: shippingDetails.name,
          customer_email: shippingDetails.email,
          shipping_address: {
            address: shippingDetails.address,
            city: shippingDetails.city,
            zip: shippingDetails.zip,
            country: 'India'
          },
          shipping_amount: shipping,
          tax_amount: tax,
          discount_amount: 0.00,
          subtotal: subtotal,
          total: total,
          status: 'pending',
          payment_provider: 'stripe',
          payment_intent_id: 'mock_pi_' + Math.random().toString(36).substr(2, 9)
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsToInsert = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_db_id || null,
        product_name: item.productName,
        product_type: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        options: {
          size: item.size,
          frame: item.frame,
          paper: item.paper,
          border: item.border,
          layout: item.layout,
          photos: item.photos,
          photo: item.photo,
          rotation: item.rotation
        }
      }));

      const { error: itemsError } = await supabase
        .from('printstore_order_items')
        .insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (authErr) {}

      if (userId || sessionId) {
        const query = supabase.from('printstore_cart_items').delete();
        if (userId) {
          await query.eq('user_id', userId);
        } else {
          await query.eq('session_id', sessionId);
        }
      }

      setCartItems([]);
      localStorage.removeItem('pixnxt_printstore_cart');
      
      // Update local shipping address state so it persists
      setSavedShippingAddress({
        recipientName: shippingDetails.name,
        accountName: shippingDetails.name,
        email: shippingDetails.email,
        street: shippingDetails.address,
        city: shippingDetails.city,
        zipCode: shippingDetails.zip,
        country: 'India',
        phoneNumber: '',
        sameBilling: true
      });
      // Don't set checkoutState here — let the calling component
      // (PaymentPage or CheckoutForm) control post-order navigation.
    } catch (err) {
      console.error("Failed to place print store order:", err);
      alert("Failed to place order: " + err.message);
      throw err;
    }
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
    handleOpenCustomizer(products.find(p => p.id === 'matted_frame') || MOCK_PRODUCTS[1], firstSelectedPhoto);
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
        <CoverHero onExplore={handleScrollToGallery} photographer={photographer} />
      )}

      {/* 2. Scrollable Content Wrapper (Slides up over cover) */}
      <div className={`printstore-scroll-content ${showCover ? 'has-cover' : ''}`}>
        {/* Top Header Nav */}
        {!selectedProductForDetail && checkoutState !== 'cart' && checkoutState !== 'review' && checkoutState !== 'payment' && (
          <StoreHeader
            products={products}
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
            onSelectProduct={(prod) => {
              setSelectedProductForDetail(prod);
              setCheckoutState('shopping');
              setActiveTab('shop');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            customizingProduct={customizingProduct}
            onCancelCustomizing={handleCancelCustomizing}
            photographer={photographer}
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
              setActiveCustomizerProduct(products.find(p => p.id === item.productId) || products[0] || MOCK_PRODUCTS[0]);
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
            onContinueToShipping={() => {
              if (cartItems.length > 0) setCheckoutState('review');
            }}
          />
         ) : checkoutState === 'review' ? (
           <ReviewPage
             cartItems={cartItems}
             onUpdateQuantity={handleUpdateCartQuantity}
             onRemoveItem={handleRemoveCartItem}
             onBack={() => setCheckoutState('cart')}
             onContinueToPayment={(address) => {
               if (cartItems.length > 0) {
                 setSavedShippingAddress(address);
                 setCheckoutState('payment');
               }
             }}
            sessionId={sessionId}
            initialAddress={savedShippingAddress}
          />
        ) : checkoutState === 'payment' ? (
          <PaymentPage
            cartItems={cartItems}
            onBack={() => setCheckoutState('review')}
            onPlaceOrder={handlePlaceOrder}
            shippingAddress={savedShippingAddress}
            onPaymentSuccess={() => {
              setCartItems([]);
              localStorage.removeItem('pixnxt_printstore_cart');
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
                setIsDirectGallerySelection(true);
                setCustomizerItems([]);
                setActiveCustomizerProduct(prod);
                setCustomizerPhoto([photoObj]);
                setCustomizingProductOptions(options);
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            />
          ) : viewMode === 'tracking' ? (
            <TrackOrderPage sessionId={sessionId} photographer={photographer} />
          ) : viewMode === 'all-products' ? (
            /* All Products Full Grid Screen */
            <div className="store-shopping-flow all-products-view">
              <AllProducts
                products={products.length > 0 ? products : MOCK_PRODUCTS}
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
                    onBuyPrint={(photo) => handleOpenCustomizer(products.find(p => p.id === 'prints') || MOCK_PRODUCTS[0], photo)}
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
                    products={products.length > 0 ? products.slice(0, 3) : MOCK_PRODUCTS.slice(0, 3)} // Dibond, Matted, Gallery
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
            onPlaceOrder={handlePlaceOrder}
            onBackToShopping={() => setCheckoutState('shopping')}
            photographer={photographer}
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
        {!selectedProductForDetail && checkoutState !== 'cart' && checkoutState !== 'review' && checkoutState !== 'payment' && <StoreFooter photographer={photographer} />}
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
            customizerItems={customizerItems}
            setCustomizerItems={setCustomizerItems}
            isDirectGallerySelection={isDirectGallerySelection}
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
            onBrowseGallery={(currentPhotos, slotIndex = null) => {
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
              setCustomizerActiveSlotIndex(slotIndex);
              setIsDirectGallerySelection(false);
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
            customizerItems={customizerItems}
            setCustomizerItems={setCustomizerItems}
            isDirectGallerySelection={isDirectGallerySelection}
            onClose={(customizerItems) => {
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
            onBrowseGallery={(currentPhotos, slotIndex = null) => {
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
              setCustomizerActiveSlotIndex(slotIndex);
              setIsDirectGallerySelection(false);
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
        photographer={photographer}
        onSeeGallery={() => {
          setActiveTab('gallery');
          setCheckoutState('shopping');
          setViewMode('landing');
          setActiveCustomizerProduct(null);
        }}
        onGoToCart={() => {
          setCheckoutState('cart');
        }}
        onGoToOrders={() => {
          setCheckoutState('shopping');
          setViewMode('tracking');
          setSelectedProductForDetail(null);
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

      {showScrollTop && !activeCustomizerProduct && !viewingPhoto && (
        <button
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'var(--gallery-accent, #111111)',
            color: 'var(--gallery-on-accent, #ffffff)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            zIndex: 9999,
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp size={22} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
