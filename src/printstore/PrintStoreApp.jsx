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
import NotificationsPage from './components/NotificationsPage';
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
import { ShoppingBag, Heart, X, Check, Upload, Bookmark, ChevronLeft, ChevronRight, MoreVertical, ArrowUp, CreditCard, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import Lottie from 'lottie-react';
import paymentSuccessAnimation from '../assets/animations/payment-success.json';
import './PrintStore.css';
import { getStoreViewPhotoUrl, toStoreCartPhoto } from '../lib/storePhotoQuality';
import { galleryService } from '../services/gallery.service';

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

  const [collection, setCollection] = useState(null);
  const [collectionId, setCollectionId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [products, setProducts] = useState([]);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('shop'); // 'gallery' | 'shop'
  const [activeCollection, setActiveCollection] = useState('portraits'); // 'favorites' | 'portraits'
  const [checkoutState, setCheckoutState] = useState('shopping'); // 'shopping' | 'cart' | 'checkout' | 'completed'
  const [completedOrder, setCompletedOrder] = useState(null);
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
  const [notifCount, setNotifCount] = useState(0);

  // Permanent Vault States
  const [showVaultPaymentModal, setShowVaultPaymentModal] = useState(false);
  const [vaultCardName, setVaultCardName] = useState('');
  const [vaultCardNumber, setVaultCardNumber] = useState('');
  const [vaultCardExpiry, setVaultCardExpiry] = useState('');
  const [vaultCardCvc, setVaultCardCvc] = useState('');
  const [isVaultPaying, setIsVaultPaying] = useState(false);
  const [vaultEmail, setVaultEmail] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultPurchasedState, setVaultPurchasedState] = useState(false);

  useEffect(() => {
    if (collection?.id) {
      supabase
        .from('buylink_plans')
        .select('id')
        .eq('collection_id', collection.id)
        .eq('status', 'completed')
        .limit(1)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setVaultPurchasedState(true);
          } else {
            setVaultPurchasedState(localStorage.getItem(`pixnxt_vault_purchased_${collection.id}`) === 'true');
          }
        });
    }
  }, [collection?.id]);

  const handleVaultPaymentSubmit = async (e) => {
    e.preventDefault();
    setVaultError('');
    setIsVaultPaying(true);

    try {
      const targetEmail = vaultEmail || (completedOrder?.customer_email || '');
      if (!targetEmail) {
        throw new Error('Please enter your email address for delivery confirmation.');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const price = parseFloat(localStorage.getItem(`pixnxt_vault_price_${collection.id}`) || '499');

      const { data: purchase, error: purchaseError } = await supabase
        .from('buylink_plans')
        .insert({
          collection_id: collection.id,
          customer_name: vaultCardName || 'Client Visitor',
          customer_email: targetEmail,
          amount_paid: price,
          plan_type: 'lifetime',
          status: 'completed',
          payment_method: 'Credit Card',
          payment_intent_id: 'mock_pi_vault_' + Math.random().toString(36).substr(2, 9)
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      localStorage.setItem(`pixnxt_vault_purchased_${collection.id}`, 'true');
      setVaultPurchasedState(true);

      try {
        await fetch(`${supabase.supabaseUrl}/functions/v1/send-order-placed-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({
            orderId: purchase.id,
            recipientEmail: targetEmail,
            siteOrigin: window.location.origin
          })
        });
      } catch (emailErr) {
        console.warn('Could not trigger vault email:', emailErr);
      }

      setIsVaultPaying(false);
      setShowVaultPaymentModal(false);
    } catch (err) {
      console.error('Vault payment error:', err);
      setIsVaultPaying(false);
      setVaultError(err.message || 'Payment failed. Please check your card details.');
    }
  };

  const fetchNotifCount = async () => {
    try {
      let query = supabase.from('printstore_orders').select('id');
      let hasFilter = false;
      if (sessionId) {
        query = query.eq('session_id', sessionId);
        hasFilter = true;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          query = query.eq('customer_email', userData.user.email);
          hasFilter = true;
        }
      }
      if (!hasFilter) return;
      const { data: orders } = await query;
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const { count } = await supabase
          .from('printstore_artwork_reviews')
          .select('*', { count: 'exact', head: true })
          .in('order_id', orderIds)
          .eq('review_status', 'Waiting Customer');
        setNotifCount(count || 0);
      } else {
        setNotifCount(0);
      }
    } catch (err) {
      setNotifCount(0);
    }
  };

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'notifications' || view === 'frame-alert') {
      setViewMode('notifications');
    }
  }, [searchParams]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      const loadOrderFromParams = async () => {
        try {
          const { data: order, error } = await supabase
            .from('printstore_orders')
            .select('*')
            .eq('id', orderId)
            .single();
          if (error) throw error;

          const { data: items, error: itemsError } = await supabase
            .from('printstore_order_items')
            .select('*')
            .eq('order_id', orderId);
          if (itemsError) throw itemsError;

          setCompletedOrder({
            ...order,
            items: items.map(item => ({
              productName: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              productId: item.product_type,
              product_type: item.product_type,
              size: item.options?.size,
              frame: item.options?.frame,
              paper: item.options?.paper,
              border: item.options?.border,
              layout: item.options?.layout,
              photo: item.options?.photo
            }))
          });
          setCheckoutState('completed');
        } catch (e) {
          console.error("Error loading order from URL search params:", e);
        }
      };
      loadOrderFromParams();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const [selectedProductType, setSelectedProductType] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null); // Photo currently open in lightbox
  const [gallerySelectedPhoto, setGallerySelectedPhoto] = useState(null); // Photo selected from gallery for shop use
  const gallerySelectedPhotoUrl = getStoreViewPhotoUrl(gallerySelectedPhoto);
  const [collectionPhotos, setCollectionPhotos] = useState([]);

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

  // Re-hydrate digital cart thumbnails from live collection photos (fixes stale/missing URLs)
  useEffect(() => {
    if (!collectionPhotos?.length) return;
    setCartItems((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        if (item.productId !== 'digital_download') return item;
        const raw = item.options?.photo || item.photo;
        if (!raw?.id) return item;
        const match = collectionPhotos.find((p) => p && String(p.id) === String(raw.id));
        if (!match) return item;
        const hydrated = toStoreCartPhoto({
          ...raw,
          url: match.web_url || match.url || raw.url || '',
          web_url: match.web_url || match.url || raw.web_url || '',
          thumbnail_url: match.thumbnail_url || match.web_url || match.url || raw.thumbnail_url || '',
          full_url: match.full_url || raw.full_url || match.web_url || match.url || '',
          display_url: match.web_url || match.display_url || match.url || raw.display_url || '',
        });
        const before = raw.web_url || raw.thumbnail_url || raw.url || '';
        const after = hydrated.web_url || hydrated.thumbnail_url || hydrated.url || '';
        if (before === after && (raw.web_url || raw.thumbnail_url) && raw.full_url) return item;
        changed = true;
        return {
          ...item,
          photo: hydrated,
          options: { ...(item.options || {}), photo: hydrated },
        };
      });
      if (!changed) return prev;
      try {
        localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(next));
      } catch (_) { /* ignore */ }
      return next;
    });
  }, [collectionPhotos]);

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
      const photoIdParam = searchParams.get('photo');
      const orderIdParam = searchParams.get('orderId');
      const hasCartItems = (() => {
        try {
          const items = JSON.parse(localStorage.getItem('pixnxt_printstore_cart') || '[]');
          return items.length > 0;
        } catch(e) { return false; }
      })();

      if (!slug || (!photoIdParam && !orderIdParam && !searchParams.get('cart') && !hasCartItems)) {
        if (slug) {
          window.location.assign(`/gallery/${slug}`);
        } else {
          window.location.assign('/');
        }
        return;
      }

      if (slug) {
        const { data: collection } = await supabase
          .from('collections')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (collection?.id) {
          setCollection(collection);
          setCollectionId(collection.id);

          // Fetch photos for the collection
          const { data: photosData } = await supabase
            .from('photos')
            .select('id, filename, web_url, thumbnail_url, full_url, width, height')
            .eq('collection_id', collection.id);

          if (photosData && photosData.length > 0) {
            const mappedPhotos = photosData.map(p => toStoreCartPhoto({
              id: p.id,
              name: p.filename || `Photo`,
              filename: p.filename || '',
              url: p.web_url || p.thumbnail_url || '',
              web_url: p.web_url || p.thumbnail_url || '',
              thumbnail_url: p.thumbnail_url || p.web_url || '',
              full_url: p.full_url || p.web_url || p.thumbnail_url || '',
              display_url: p.web_url || p.thumbnail_url || '',
              aspectRatio: p.width && p.height ? (p.width > p.height ? '3:2' : '2:3') : '2:3'
            }));
            setCollectionPhotos(mappedPhotos);

            const photoIdParam = searchParams.get('photo');
            let matchedPhoto = null;
            if (photoIdParam) {
              matchedPhoto = mappedPhotos.find(p => String(p.id) === String(photoIdParam));
            }
            if (!matchedPhoto && mappedPhotos.length > 0) {
              matchedPhoto = mappedPhotos[0];
            }
            if (matchedPhoto) {
              setGallerySelectedPhoto(matchedPhoto);
              setActiveTab('shop');
            }
          }

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

      // 3. Try to resolve via sessionId
      if (!display_name && sessionId) {
        try {
          const { data: session } = await supabase
            .from('client_sessions')
            .select('collection_id')
            .eq('id', sessionId)
            .maybeSingle();

          if (session?.collection_id) {
            const { data: collection } = await supabase
              .from('collections')
              .select('*')
              .eq('id', session.collection_id)
              .maybeSingle();

            if (collection) {
              setCollection(collection);

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
          }
        } catch (e) {
          console.warn("Could not load photographer via sessionId:", e);
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
        // Auto-open cart drawer if URL has cart=open
        if (searchParams.get('cart') === 'open') {
          setCheckoutState('cart');
        }
      }
    }
    initApp();
  }, []);

  // Shared mapper function to convert DB product rows to frontend shape
  const mapProductRow = (p) => {
    const customPrice = (p.options?.selling_price !== undefined && p.options?.selling_price !== null)
      ? parseFloat(p.options.selling_price)
      : parseFloat(p.base_price);
    return {
      ...p,
      id: p.product_type, // Map product_type to id for backward compatibility
      db_id: p.id, // Store actual database primary key id
      basePrice: customPrice,
      image: p.image_url
    };
  };

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
      product_db_id: item.product_id,
      options: opts,
    };
  };

  const normalizeLocalCartItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const opts = item.options || {};
    const productId = item.productId || item.product_id || opts.productId || '';
    const photo = item.photo || opts.photo || null;
    const size = item.size || opts.size || null;
    const unitPrice = Number(item.unitPrice ?? opts.unitPrice ?? 0);
    const quantity = Number(item.quantity || 1);
    return {
      ...item,
      id: item.id || `local_${Date.now()}`,
      productId,
      productName: item.productName || opts.productName || productId,
      photo,
      photos: item.photos || opts.photos || [],
      size,
      frame: item.frame || opts.frame || null,
      paper: item.paper || opts.paper || null,
      border: item.border || opts.border || 'none',
      layout: item.layout || opts.layout || null,
      rotation: item.rotation || opts.rotation || 0,
      quantity,
      unitPrice,
      totalPrice: Number(item.totalPrice ?? unitPrice * quantity),
      options: {
        ...opts,
        productId,
        productName: item.productName || opts.productName || productId,
        photo,
        size,
        unitPrice,
      },
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

      // Filter only visible print products (digital downloads are sold via gallery, not Print Lab shop)
      const visibleProducts = (data || [])
        .filter((p) => p.is_visible && !['digital_download', 'digital_download_all'].includes(p.product_type))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setProducts(visibleProducts.map(mapProductRow));
    } catch (err) {
      console.error("Error loading print store products:", err);
      // Fallback to static mock products if db query fails
      setProducts(MOCK_PRODUCTS.filter((p) => !['digital_download', 'digital_download_all'].includes(p.id)));
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
              setProducts(
                data
                  .filter((p) => !['digital_download', 'digital_download_all'].includes(p.product_type))
                  .map(mapProductRow)
              );
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
            } catch (e) { }

            const row = payload.new || payload.old;
            if (!row) return;

            // Verify if the changed row belongs to our visitor session or logged in user
            const isOurItem = (sessionId)
              ? row.session_id === sessionId
              : (userId && row.user_id === userId);

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
                updated = updated.filter((item) => String(item.id) !== String(payload.old.id));
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
      const currentSessionId = activeSessionId || sessionId;
      let userId = null;

      // Only check auth user if we DO NOT have a visitor session ID
      if (!currentSessionId) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            userId = data.user.id;
          }
        } catch (e) {
          console.warn("Auth user query failed:", e);
        }
      }

      // Read current local cart items
      let localItems = [];
      const localCart = localStorage.getItem('pixnxt_printstore_cart');
      if (localCart) {
        try {
          localItems = (JSON.parse(localCart) || [])
            .map(normalizeLocalCartItem)
            .filter(Boolean);
        } catch (e) {}
      }

      // If we have either userId or currentSessionId, sync with Supabase
      if (userId || currentSessionId) {
        let dbCartData = [];

        // Load by user_id
        if (userId) {
          const { data: userCartData } = await supabase
            .from('printstore_cart_items')
            .select('*')
            .eq('user_id', userId);
          if (userCartData) {
            dbCartData = [...userCartData];
          }
        }

        // Also load by session_id
        if (currentSessionId) {
          const { data: sessionCartData } = await supabase
            .from('printstore_cart_items')
            .select('*')
            .eq('session_id', currentSessionId);
          if (sessionCartData) {
            const existingIds = new Set(dbCartData.map(i => i.id));
            for (const item of sessionCartData) {
              if (!existingIds.has(item.id)) {
                dbCartData.push(item);
              }
            }
          }
        }

        // If local items exist but are not in DB, insert them to DB instead of wiping them!
        if (localItems.length > 0) {
          // Check which local items aren't present in DB
          const missingLocals = localItems.filter(local => {
            return !dbCartData.some(dbItem => {
              const opts = dbItem.options || {};
              const localPhotoId = local.photo?.id || local.options?.photo?.id;
              const dbPhotoId = opts.photo?.id;
              return (
                (opts.productId === local.productId) &&
                (opts.photo?.id === localPhotoId || (!localPhotoId && !dbPhotoId)) &&
                ((opts.size?.id || opts.size?.label) === (local.size?.id || local.size?.label) || (!local.size && !opts.size)) &&
                opts.frame?.id === local.frame?.id &&
                opts.paper?.id === local.paper?.id &&
                opts.border === local.border
              );
            });
          });

          if (missingLocals.length > 0) {
            const inserts = [];
            for (const local of missingLocals) {
              let matchedProduct = products.find(p => p.id === local.productId);
              let productDbId = matchedProduct ? matchedProduct.db_id : null;

              // Ensure digital download products exist in printstore_products
              if (!productDbId && ['digital_download', 'digital_download_all', 'digital_package'].includes(local.productId)) {
                const { data: existingDigital } = await supabase
                  .from('printstore_products')
                  .select('id')
                  .eq('product_type', local.productId)
                  .limit(1);
                productDbId = existingDigital?.[0]?.id || null;
                if (!productDbId) {
                  const { data: created } = await supabase
                    .from('printstore_products')
                    .insert({
                      product_type: local.productId,
                      name: local.productName || local.productId,
                      base_price: local.unitPrice || 0,
                      is_active: true,
                      options: { selling_price: local.unitPrice || 0 },
                    })
                    .select('id')
                    .maybeSingle();
                  productDbId = created?.id || null;
                }
              }

              inserts.push({
                user_id: userId,
                session_id: userId ? null : (currentSessionId || null),
                product_id: productDbId,
                quantity: local.quantity,
                options: {
                  productId: local.productId,
                  productName: local.productName,
                  photo: local.photo || local.options?.photo || null,
                  photos: local.photos,
                  size: local.size || local.options?.size || null,
                  frame: local.frame,
                  paper: local.paper,
                  border: local.border,
                  layout: local.layout,
                  rotation: local.rotation || 0,
                  unitPrice: local.unitPrice
                }
              });
            }

            const { data: insertedData } = await supabase
              .from('printstore_cart_items')
              .insert(inserts)
              .select();

            if (insertedData) {
              dbCartData = [...dbCartData, ...insertedData];
            }
          }
        }

        if (dbCartData.length > 0) {
          const mappedCart = dbCartData.map(mapCartItemRow);
          // Keep any local-only digital items that failed DB insert (e.g. FK issues)
          const merged = [...mappedCart];
          for (const local of localItems) {
            const exists = merged.some(db =>
              db.productId === local.productId
              && (db.photo?.id || null) === (local.photo?.id || null)
              && (db.size?.label || db.size?.id || '') === (local.size?.label || local.size?.id || '')
            );
            if (!exists) merged.push(local);
          }
          setCartItems(merged);
          localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(merged));
          return;
        }

        // DB empty — keep local cart (do NOT wipe digital downloads)
        if (localItems.length > 0) {
          setCartItems(localItems);
          localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(localItems));
          return;
        }

        setCartItems([]);
        localStorage.setItem('pixnxt_printstore_cart', '[]');
        return;
      }

      // No session or user yet, just use local items
      setCartItems(localItems);
      if (localItems.length > 0) {
        localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(localItems));
      }
    } catch (err) {
      console.error("Error in loadCart:", err);
      const localCart = localStorage.getItem('pixnxt_printstore_cart');
      if (localCart) {
        try {
          setCartItems(JSON.parse(localCart));
        } catch (e) {}
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
    const photoObjects = photos.map(p => typeof p === 'string' ? getPhotosToDisplay().find(mock => mock.id === p) : p).filter(Boolean);
    const finalPhotos = photoObjects.length ? photoObjects : [getPhotosToDisplay()[0]];
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
    if (!sessionId) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (e) { }
    }

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
    // Came from inside printstore (shop → cart): restore that view
    if (previousViewState) {
      setSelectedProductForDetail(previousViewState.selectedProductForDetail);
      setViewMode(previousViewState.viewMode);
      setActiveTab(previousViewState.activeTab);
      setActiveCollection(previousViewState.activeCollection);
      setPreviousViewState(null);
      setCheckoutState('shopping');
      return;
    }

    // Came from gallery (package/digital add-to-cart opens /printstore?cart=open with no in-app previous state)
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || params.get('collection') || '';
    let returnPath = null;
    try {
      const raw = sessionStorage.getItem('pixnxt_printstore_return');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.path) returnPath = parsed.path;
    } catch (_) { /* ignore */ }

    if (!returnPath && slug) {
      returnPath = `/gallery/${slug}?socialSharing=1`;
    }

    if (returnPath) {
      try { sessionStorage.removeItem('pixnxt_printstore_return'); } catch (_) { /* ignore */ }
      // Drop cart=open from history intent — go back to social sharing gallery
      window.location.assign(returnPath);
      return;
    }

    setSelectedProductForDetail(null);
    setViewMode('landing');
    setActiveTab('shop');
    setActiveCollection('portraits');
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

  // Updates the photo inside a digital_download cart item (single photo picker)
  const handleUpdateItemPhoto = (itemId, newPhoto) => {
    const photo = toStoreCartPhoto(newPhoto) || newPhoto;
    setCartItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          photo,
          options: { ...(item.options || {}), photo },
        };
      });
      try { localStorage.setItem('pixnxt_printstore_cart', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
  };

  const handlePlaceOrder = async (shippingDetails) => {
    try {
      const DIGITAL = ['digital_download', 'digital_download_all', 'digital_package'];
      if (!cartItems.length) {
        throw new Error('Cart is empty. Please add items before paying.');
      }
      const allDigital = cartItems.length > 0 && cartItems.every(i => DIGITAL.includes(i.productId));

      const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
      if (subtotal <= 0) {
        throw new Error('Order total is ₹0. Please add a priced digital product before paying.');
      }
      const shipping = allDigital ? 0 : (subtotal > 100 ? 0 : 9.99);
      const tax = allDigital ? 0 : subtotal * 0.08;
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
          collection_id: collectionId || null,
          customer_name: shippingDetails.name,
          customer_email: shippingDetails.email,
          shipping_address: {
            address: shippingDetails.address,
            city: shippingDetails.city,
            zip: shippingDetails.zip,
            phone: shippingDetails.phone || '',
            country: 'India'
          },
          shipping_amount: shipping,
          tax_amount: tax,
          discount_amount: 0.00,
          subtotal: subtotal,
          total: total,
          status: allDigital ? 'completed' : 'pending',
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
          rotation: item.rotation,
          ...(item.options || {}),
        }
      }));

      const { error: itemsError } = await supabase
        .from('printstore_order_items')
        .insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      // Log digital downloads into collection Download Activity
      try {
        const digitalItems = cartItems.filter((i) => DIGITAL.includes(i.productId));
        for (const item of digitalItems) {
          const photo = item.photo || item.options?.photo || null;
          const isAll = item.productId === 'digital_download_all';
          const isPackage = item.productId === 'digital_package';
          await galleryService.logActivity(collectionId, 'download', {
            email: shippingDetails.email,
            photographerId,
            photoId: photo?.id || null,
            resolution: 'original',
            metadata: {
              type: isAll || isPackage ? 'gallery' : 'photo',
              resolution: 'Original',
              quality: 'Original',
              source: 'Digital Purchase',
              destination: 'email',
              photoCount: isPackage
                ? Number(item.options?.photo_count || item.size?.label?.match(/\d+/)?.[0] || item.quantity || 1)
                : isAll
                  ? null
                  : 1,
              filename: photo?.filename || photo?.name || null,
              setName: isAll ? 'All Photos' : isPackage ? 'Photo Package' : 'Digital Download',
              orderId: order.id,
            },
          });
        }
        try {
          const channel = new BroadcastChannel('pixnxt-gallery-update');
          channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId });
          channel.close();
        } catch (_) { /* ignore */ }
      } catch (logErr) {
        console.warn('Failed to log digital download activity:', logErr);
      }

      // Keep cartItems in React state until payment success UI finishes.
      // Clearing here (or deleting DB cart rows here) causes PaymentPage to
      // flash ₹0.00 / 0 items via realtime DELETE while still "Placing order…".

      const completedOrderData = {
        id: order.id,
        customer_name: shippingDetails.name,
        customer_email: shippingDetails.email,
        shipping_address: {
          address: shippingDetails.address,
          city: shippingDetails.city,
          zip: shippingDetails.zip,
          phone: shippingDetails.phone || '',
          country: 'India'
        },
        shipping_amount: shipping,
        tax_amount: tax,
        subtotal: subtotal,
        total: total,
        created_at: new Date().toISOString(),
        items: cartItems.map(item => ({
          productId: item.productId,
          product_type: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          frame: item.frame,
          paper: item.paper,
          border: item.border,
          layout: item.layout,
          photo: item.photo
        }))
      };
      setCompletedOrder(completedOrderData);
      // Update local shipping address state so it persists
      setSavedShippingAddress({
        recipientName: shippingDetails.name,
        accountName: shippingDetails.name,
        email: shippingDetails.email,
        street: shippingDetails.address,
        city: shippingDetails.city,
        zipCode: shippingDetails.zip,
        country: 'India',
        phoneNumber: shippingDetails.phone || '',
        phone: shippingDetails.phone || '',
        sameBilling: true
      });

      // Trigger order placed email (in try-catch to prevent breaking flow if local environment has no server secrets)
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const slugVal = searchParams.get('slug') || searchParams.get('collection') || '';

        await supabase.functions.invoke('send-order-placed-email', {
          body: {
            orderId: order.id,
            recipientEmail: shippingDetails.email,
            siteOrigin: window.location.origin,
            collectionSlug: slugVal
          }
        });
      } catch (emailErr) {
        console.error("Error sending order confirmation email:", emailErr);
      }

      setHasPlacedOrder(true);
      setCheckoutState('completed');
    } catch (err) {
      console.error("Failed to place print store order:", err);
      alert("Failed to place order: " + err.message);
      throw err;
    }
  };

  // ── Filter photos based on folder view ──
  const getPhotosToDisplay = () => {
    const list = collectionPhotos.length > 0 ? collectionPhotos : MOCK_PHOTOS;
    if (activeCollection === 'favorites') {
      return list.filter((p) => favorites.includes(p.id));
    }
    return list;
  };

  // ── Batch purchase action ──
  const handleBuySelection = () => {
    if (selectedPhotos.length === 0) return;
    const firstSelectedPhoto = getPhotosToDisplay().find((p) => p.id === selectedPhotos[0]);
    // Open customizer with first selected photo and default to Matted Frame
    handleOpenCustomizer(products.find(p => p.id === 'matted_frame') || MOCK_PRODUCTS[1], firstSelectedPhoto);
    setSelectedPhotos([]);
    setIsSelectionMode(false);
  };

  const showCover = false;

  const isHeaderThin = viewMode === 'all-products'
    ? (scrollDirection === 'down' && scrollY > 80)
    : (showCover ? scrollY > window.innerHeight + 336 : scrollY > 336);



  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#ffffff',
        fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontSize: '16px',
        fontWeight: '500',
        color: '#111111'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="animate-spin" style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(0,0,0,0.1)',
            borderTopColor: '#111111',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <span>Loading Store...</span>
        </div>
      </div>
    );
  }

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
            notificationCount={notifCount}
            onOpenNotifications={() => setViewMode('notifications')}
            selectedPhotoUrl={gallerySelectedPhotoUrl}
          />
        )}

        {/* 3. Main Views Merged Flow */}
        {checkoutState === 'cart' ? (
          <CartPage
            cartItems={cartItems}
            collectionPhotos={collectionPhotos}
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
            collectionPhotos={collectionPhotos}
            collectionId={collectionId}
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
            collectionPhotos={collectionPhotos}
            collectionId={collectionId}
            onBack={() => setCheckoutState('review')}
            onPlaceOrder={handlePlaceOrder}
            shippingAddress={savedShippingAddress}
            onPaymentSuccess={async () => {
              try {
                let userId = null;
                if (!sessionId) {
                  try {
                    const { data } = await supabase.auth.getUser();
                    if (data?.user) userId = data.user.id;
                  } catch (_) { /* ignore */ }
                }
                if (userId || sessionId) {
                  const query = supabase.from('printstore_cart_items').delete();
                  if (userId) await query.eq('user_id', userId);
                  else await query.eq('session_id', sessionId);
                }
              } catch (e) {
                console.warn('Cart cleanup after payment failed:', e);
              }
              setCartItems([]);
              localStorage.removeItem('pixnxt_printstore_cart');
              setCheckoutState('completed');
            }}
          />
        ) : checkoutState === 'shopping' ? (
          selectedProductForDetail ? (
            <ProductDetailPage
              product={selectedProductForDetail}
              selectedPhotoUrl={gallerySelectedPhotoUrl}
              onBack={() => {
                setSelectedProductForDetail(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              onSelectPhotosForProduct={handleSelectPhotosForProduct}
              onFinishAndPersonalize={(prod, options) => {
                // Go directly to customizer with the gallery photo
                const photoObj = gallerySelectedPhoto ?
                  getPhotosToDisplay().find(p => p.url === gallerySelectedPhoto.url) || gallerySelectedPhoto :
                  getPhotosToDisplay()[0];
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
          ) : viewMode === 'notifications' ? (
            <NotificationsPage sessionId={sessionId} photographer={photographer} onBack={() => setViewMode(previousViewState || 'landing')} />
          ) : viewMode === 'all-products' ? (
            /* All Products Full Grid Screen */
            <div className="store-shopping-flow all-products-view">
              <AllProducts
                products={products.length > 0 ? products : MOCK_PRODUCTS}
                selectedPhotoUrl={gallerySelectedPhotoUrl}
                photos={collectionPhotos}
                onSelectProduct={(prod) => {
                  setSelectedProductForDetail(prod);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
              />
            </div>
          ) : (
            <div className="store-shopping-flow">
              {/* Shop Section */}
              {activeTab === 'shop' && (
                <div ref={shopRef} className="shop-section-wrapper">
                  <ShopLanding
                    products={products.length > 0 ? products : MOCK_PRODUCTS}
                    selectedPhotoUrl={gallerySelectedPhotoUrl}
                    onSelectProduct={(prod) => {
                      setSelectedProductForDetail(prod);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    onExploreAll={() => {
                      setViewMode('all-products');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    photos={collectionPhotos}
                    collection={collection}
                    onUnlockVault={() => {
                      setVaultError('');
                      setShowVaultPaymentModal(true);
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
          /* Order Complete Success/Receipt Summary page */
          <div style={{
            maxWidth: '680px',
            margin: '40px auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #f2ede4',
            padding: '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            fontFamily: "'europa', 'Inter', sans-serif"
          }}>
            {/* Photographer Branding logo/name in top left corner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f2ede4' }}>
              {photographer?.logo_url ? (
                <img src={photographer.logo_url} alt="" style={{ height: '32px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                  {String(photographer?.display_name || 'P')[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {photographer?.display_name || 'PIXNXT PHOTOGRAPHY'}
              </span>
            </div>

            {/* Header Success info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '72px', height: '72px', flexShrink: 0 }}>
                  <Lottie
                    animationData={paymentSuccessAnimation}
                    loop={false}
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '26px', fontWeight: 600, color: '#111', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Thank you for your order!
                </h2>
              </div>
              <p style={{ fontSize: '14.5px', color: '#64748b', margin: '4px 0 0 88px' }}>
                Your order has been placed successfully. A receipt has been sent to your email.
              </p>
            </div>

            {completedOrder ? (
              <>
                {/* Meta details */}
                {(() => {
                  const allDigital = (completedOrder.items || []).every(i =>
                    ['digital_download', 'digital_download_all', 'digital_package'].includes(i.productId || i.product_type)
                  );
                  const shortId = completedOrder.id ? completedOrder.id.split('-')[0].toUpperCase() : 'MOCK';
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid #f2ede4', paddingBottom: '24px', marginBottom: '24px', fontSize: '13.5px' }}>
                      <div>
                        <span style={{ display: 'block', color: '#64748b', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                          {allDigital ? 'Download Summary' : 'Order Summary'}
                        </span>
                        <strong style={{ color: '#111', fontSize: '15px' }}>#{shortId}</strong>
                        <span style={{ display: 'block', color: '#94a3b8', marginTop: '4px' }}>Date: {new Date(completedOrder.created_at || new Date()).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', color: '#64748b', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Customer Info</span>
                        <strong style={{ color: '#111' }}>{completedOrder.customer_name}</strong>
                        <span style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>{completedOrder.customer_email}</span>
                        {completedOrder.shipping_address?.phone && (
                          <span style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>+91 {completedOrder.shipping_address.phone}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Shipping address OR email delivery notice */}
                {(() => {
                  const allDigital = (completedOrder.items || []).every(i =>
                    ['digital_download', 'digital_download_all', 'digital_package'].includes(i.productId || i.product_type)
                  );
                  if (allDigital) {
                    return (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '32px', fontSize: '13.5px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px' }}>📧</span>
                        <div>
                          <span style={{ display: 'block', color: '#059669', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Download Delivery</span>
                          <span style={{ display: 'block', color: '#111', lineHeight: 1.5 }}>
                            Your high-resolution files will be sent to <strong>{completedOrder.customer_email}</strong> within a few minutes.
                          </span>
                        </div>
                      </div>
                    );
                  }
                  if (completedOrder.shipping_address?.address) {
                    return (
                      <div style={{ backgroundColor: '#fcfbfa', padding: '16px', borderRadius: '8px', border: '1px solid #f2ede4', marginBottom: '32px', fontSize: '13.5px' }}>
                        <span style={{ display: 'block', color: '#64748b', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Shipping Destination</span>
                        <span style={{ display: 'block', color: '#111', lineHeight: 1.5 }}>
                          {completedOrder.customer_name}<br />
                          {completedOrder.shipping_address?.phone && (
                            <>+91 {completedOrder.shipping_address.phone}<br /></>
                          )}
                          {completedOrder.shipping_address?.address}, {completedOrder.shipping_address?.city}<br />
                          {completedOrder.shipping_address?.zip}, India
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Items listing table */}
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, borderBottom: '2px solid #111', paddingBottom: '8px', margin: '0 0 16px 0' }}>Order Items</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {(completedOrder.items || []).map((item, idx) => {
                    const unitP = item.unitPrice || item.unit_price || 0;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', borderBottom: '1px solid #f8fafc', paddingBottom: '12px' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#111' }}>{item.productName || item.product_name}</span>
                          <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {item.size?.label || item.options?.size?.label
                              || (item.productId === 'digital_download_all' || item.product_type === 'digital_download_all'
                                  ? 'All Photos'
                                  : (item.productId === 'digital_package' || item.product_type === 'digital_package'
                                      ? (`${item.options?.photo_count || ''} Photos`.trim() || 'Package')
                                      : 'High Resolution'))}
                            {item.frame?.label ? ` | Frame: ${item.frame.label}` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '13px' }}>Qty: {item.quantity}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{(unitP * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Costs breakdown — hide shipping/tax for all-digital */}
                {(() => {
                  const allDigital = (completedOrder.items || []).every(i =>
                    ['digital_download', 'digital_download_all', 'digital_package'].includes(i.productId || i.product_type)
                  );
                  return (
                    <div style={{ marginLeft: 'auto', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', borderBottom: '1px solid #f2ede4', paddingBottom: '16px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Subtotal:</span>
                        <span style={{ fontFamily: 'monospace' }}>₹{completedOrder.subtotal?.toFixed(2)}</span>
                      </div>
                      {!allDigital && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Tax (8%):</span>
                            <span style={{ fontFamily: 'monospace' }}>₹{completedOrder.tax_amount?.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Shipping:</span>
                            <span style={{ fontFamily: 'monospace' }}>₹{completedOrder.shipping_amount?.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #111', paddingTop: '10px', fontWeight: 'bold', fontSize: '16px' }}>
                        <span>Total Paid:</span>
                        <span style={{ fontFamily: 'monospace' }}>₹{completedOrder.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' }}>
                  <button
                    onClick={() => {
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                      script.onload = () => {
                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF();
                        const shortId = completedOrder.id ? completedOrder.id.split('-')[0].toUpperCase() : 'MOCK';
                        
                        const allDigital = (completedOrder.items || []).every(i =>
                          ['digital_download', 'digital_download_all', 'digital_package'].includes(i.productId || i.product_type)
                        );

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(22);
                        doc.text(allDigital ? "PIXNXT DOWNLOAD RECEIPT" : "PIXNXT PRINT LAB RECEIPT", 20, 25);

                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.text(allDigital ? `Download ID: #${shortId}` : `Order ID: #${shortId}`, 20, 35);
                        doc.text(`Date: ${new Date(completedOrder.created_at || new Date()).toLocaleDateString()}`, 20, 41);

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(12);
                        doc.text("Customer Details", 20, 55);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        const receiptPhone = completedOrder.shipping_address?.phone || '';
                        doc.text(`Name: ${completedOrder.customer_name || ''}`, 20, 62);
                        doc.text(`Email: ${completedOrder.customer_email || ''}`, 20, 68);
                        if (receiptPhone) {
                          doc.text(`Phone: +91 ${receiptPhone}`, 20, 74);
                        }

                        const sectionY = receiptPhone ? 86 : 80;
                        if (!allDigital) {
                          doc.setFont("helvetica", "bold");
                          doc.setFontSize(12);
                          doc.text("Shipping Address", 20, sectionY);
                          doc.setFont("helvetica", "normal");
                          doc.setFontSize(10);
                          doc.text(`${completedOrder.shipping_address?.address || ''}`, 20, sectionY + 7);
                          doc.text(`${completedOrder.shipping_address?.city || ''}, ${completedOrder.shipping_address?.zip || ''}`, 20, sectionY + 13);
                        } else {
                          doc.setFont("helvetica", "bold");
                          doc.setFontSize(12);
                          doc.text("Delivery Info", 20, sectionY);
                          doc.setFont("helvetica", "normal");
                          doc.setFontSize(10);
                          doc.text(`Digital files will be sent to email:`, 20, sectionY + 7);
                          doc.text(`${completedOrder.customer_email || ''}`, 20, sectionY + 13);
                        }

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(11);
                        doc.text("Product Item", 20, 115);
                        doc.text("Qty", 130, 115);
                        doc.text("Total Price", 160, 115);
                        doc.line(20, 118, 190, 118);

                        let y = 125;
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        (completedOrder.items || []).forEach(item => {
                          const nameLabel = item.productName || item.product_name || 'Product';
                          const sizeLabel = item.size?.label || item.options?.size?.label
                            || (item.productId === 'digital_download_all' || item.product_type === 'digital_download_all'
                                ? 'All Photos'
                                : (item.productId === 'digital_package' || item.product_type === 'digital_package'
                                    ? (item.size?.label || item.options?.size?.label || `${item.options?.photo_count || ''} Photos`.trim() || 'Package')
                                    : 'High Resolution'));
                          doc.text(`${nameLabel} (${sizeLabel})`, 20, y);
                          doc.text(`${item.quantity}`, 130, y);
                          const unitP = item.unitPrice || item.unit_price || 0;
                          doc.text(`INR ${(unitP * item.quantity).toFixed(2)}`, 160, y);
                          y += 8;
                        });

                        doc.line(20, y, 190, y);
                        y += 8;

                        doc.text(`Subtotal: INR ${(completedOrder.subtotal || 0).toFixed(2)}`, 130, y); y += 6;
                        if (!allDigital) {
                          doc.text(`Tax: INR ${(completedOrder.tax_amount || 0).toFixed(2)}`, 130, y); y += 6;
                          doc.text(`Shipping: INR ${(completedOrder.shipping_amount || 0).toFixed(2)}`, 130, y); y += 6;
                        }
                        doc.setFont("helvetica", "bold");
                        doc.text(`Total Paid: INR ${(completedOrder.total || 0).toFixed(2)}`, 130, y);

                        doc.save(`receipt-${shortId}.pdf`);
                      };
                      document.body.appendChild(script);
                    }}
                    style={{
                      padding: '12px 24px', fontSize: '13px', fontWeight: 700, border: '1px solid #111',
                      borderRadius: '4px', backgroundColor: '#fff', color: '#111', cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}
                  >
                    Download Receipt (PDF)
                  </button>

                  <button
                    onClick={() => {
                      const searchParams = new URLSearchParams(window.location.search);
                      const slugVal = searchParams.get('slug') || searchParams.get('collection');
                      if (slugVal) {
                        window.location.assign(`/gallery/${slugVal}?socialSharing=1`);
                      } else {
                        window.location.assign('/');
                      }
                    }}
                    style={{
                      padding: '12px 24px', fontSize: '13px', fontWeight: 700, border: 'none',
                      borderRadius: '4px', backgroundColor: '#111', color: '#fff', cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}
                  >
                    back to gallery
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading receipt details...</div>
            )}
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


      {/* 5. Product Options Configuration Modal */}
      {activeCustomizerProduct && (
        activeCustomizerProduct.id === 'matted_collages' ? (
          <MattedCollagesCustomizer
            product={activeCustomizerProduct}
            photos={getPhotosToDisplay()}
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
              setCheckoutState('cart');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBrowseGallery={null}
          />
        ) : (
          <ProductCustomizer
            product={activeCustomizerProduct}
            photos={getPhotosToDisplay()}
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
            onBrowseGallery={null}
          />
        )
      )}

      {/* 5.5 Left Navigation Sidebar Drawer */}
      <LeftSidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        photographer={photographer}
        sessionId={sessionId}
        onSeeGallery={() => {
          setActiveTab('shop');
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
        onGoToNotifications={() => {
          setCheckoutState('shopping');
          setPreviousViewState(viewMode);
          setViewMode('notifications');
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

      {/* Permanent Vault Payment Modal */}
      {showVaultPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0px',
            width: '100%',
            maxWidth: '440px',
            padding: '40px',
            boxSizing: 'border-box',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            color: '#111',
            fontFamily: "'europa', 'Inter', sans-serif",
            position: 'relative'
          }}>
            <button
              onClick={() => setShowVaultPaymentModal(false)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              marginBottom: '8px',
              color: '#111'
            }}>
              Unlock Permanent Vault
            </h2>
            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#666',
              marginBottom: '24px',
              lineHeight: 1.4
            }}>
              Store and access this gallery permanently, overriding auto expiry.
            </p>

            {/* Price Details */}
            <div style={{
              background: '#fcfbfa',
              border: '1px solid #f2ede4',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Plan Type</span>
                <strong style={{ color: '#111', fontSize: '14px' }}>Permanent Vault Add-on</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Amount Due</span>
                <strong style={{ color: '#111', fontSize: '18px', fontWeight: 700 }}>
                  ₹{parseFloat(localStorage.getItem(`pixnxt_vault_price_${collection?.id}`) || '499').toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Card Form */}
            <form onSubmit={handleVaultPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>Delivery Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={vaultEmail}
                  onChange={(e) => setVaultEmail(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    fontSize: '14px',
                    outline: 'none',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={vaultCardName}
                  onChange={(e) => setVaultCardName(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    fontSize: '14px',
                    outline: 'none',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>Card Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    value={vaultCardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                      setVaultCardNumber(formatted);
                    }}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      padding: '10px 12px 10px 40px',
                      fontSize: '14px',
                      outline: 'none',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={vaultCardExpiry}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                      setVaultCardExpiry(formatted);
                    }}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      padding: '10px 12px',
                      fontSize: '14px',
                      outline: 'none',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>CVC</label>
                  <input
                    type="password"
                    required
                    placeholder="***"
                    maxLength={3}
                    value={vaultCardCvc}
                    onChange={(e) => setVaultCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      padding: '10px 12px',
                      fontSize: '14px',
                      outline: 'none',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px dashed #e2e8f0', marginTop: '8px' }}>
                <ShieldCheck size={16} className="text-[#10b981]" style={{ flexShrink: 0 }} />
                <span>This is a secure simulated Stripe test payment. Any inputs will succeed.</span>
              </div>

              {vaultError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', justifyContent: 'center', marginTop: '8px' }}>
                  <AlertCircle size={14} />
                  <span>{vaultError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVaultPaying}
                style={{
                  width: '100%',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 0',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isVaultPaying ? 0.7 : 1
                }}
              >
                {isVaultPaying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay & Unlock Vault'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
            backgroundColor: '#111111',
            color: '#ffffff',
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
