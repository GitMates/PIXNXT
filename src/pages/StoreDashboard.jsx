import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { galleryService } from '../services/gallery.service';
import {
  ShoppingBag, Settings, ChevronDown, ChevronUp,
  LogOut, User, Gift, DollarSign, Package, ChevronLeft, ChevronRight, Eye, Mail, Phone,
  Search, Bell, Home, PanelLeftClose, PanelLeftOpen, Layers, ToggleLeft, ToggleRight
} from 'lucide-react';
import helpPng from '../assets/icons/help.png';
import notificationPng from '../assets/icons/notification.png';
import './Dashboard.css';
import '../printstore/PrintStore.css';
import '../styles/clientGalleryTheme.css';

// Module-level caching to prevent loading indicators when navigating routes
let cachedOrders = null;
let cachedOrderItems = null;
let cachedCollections = null;
let cachedPhotos = null;
let cachedProducts = null;

export default function StoreDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [orders, setOrders] = useState(() => cachedOrders || []);
  const [orderItems, setOrderItems] = useState(() => cachedOrderItems || []);
  const [collections, setCollections] = useState(() => cachedCollections || []);
  const [photos, setPhotos] = useState(() => cachedPhotos || []);
  const [loading, setLoading] = useState(() => !(cachedOrders && cachedOrderItems && cachedCollections && cachedPhotos));

  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // View tabs
  const [activeViewTab, setActiveViewTab] = useState('orders');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Pricing State
  const [products, setProducts] = useState(() => cachedProducts || []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [profitFilter, setProfitFilter] = useState('all');
  const [priceStatusFilter, setPriceStatusFilter] = useState('all');
  const [markupPercent, setMarkupPercent] = useState('');
  const [previewChanges, setPreviewChanges] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSavingProducts, setIsSavingProducts] = useState(false);
  const [notification, setNotification] = useState(null);

  // Bulk Profit Margin Modal
  const [showBulkProfitModal, setShowBulkProfitModal] = useState(false);
  const [bulkProfitPct, setBulkProfitPct] = useState('');

  // Individual Product pricing state
  const [setPriceProduct, setSetPriceProduct] = useState(null);
  const [individualBasePrice, setIndividualBasePrice] = useState('');
  const [individualPrice, setIndividualPrice] = useState('');
  const [individualProfitPct, setIndividualProfitPct] = useState('0');

  // Digital download toggle configuration state
  const [globalDigitalEnabled, setGlobalDigitalEnabled] = useState(false);
  const [globalDigitalPriceSingle, setGlobalDigitalPriceSingle] = useState('40');
  const [globalDigitalPriceAll, setGlobalDigitalPriceAll] = useState('199');
  const [savingGlobalDigital, setSavingGlobalDigital] = useState(false);

  // Permanent Vault state
  const [globalVaultEnabled, setGlobalVaultEnabled] = useState(false);
  const [globalVaultPrice1Month, setGlobalVaultPrice1Month] = useState('99');
  const [globalVaultPrice1Year, setGlobalVaultPrice1Year] = useState('299');
  const [globalVaultPriceLifetime, setGlobalVaultPriceLifetime] = useState('499');
  const [globalVaultDesc1Month, setGlobalVaultDesc1Month] = useState('Extends gallery access by 30 days.');
  const [globalVaultDesc1Year, setGlobalVaultDesc1Year] = useState('Extends gallery access by 1 year.');
  const [globalVaultDescLifetime, setGlobalVaultDescLifetime] = useState('Permanent lifetime storage access.');
  const [globalStoreEnabled, setGlobalStoreEnabled] = useState(true);
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);

  // Sales Automations — campaign-based state
  const [campaigns, setCampaigns] = useState([
    {
      id: 'anniversary',
      label: 'Anniversary Gift',
      description: 'Help your clients celebrate their anniversary with a special gift. Renew connections and remind them to print their favorite moments from your galleries.',
      icon: '💍',
      bg: '#f5f0e8',
      enabled: false,
      yearsRepeat: 3,
      startDays: 21,
      durationDays: 14,
      discount: '30',
      discountCode: 'HAPPYANI',
      banners: {
        text_banner: { enabled: true, text: 'Happy anniversary! Enjoy {discount-value} off print products, valid thru {exp-date}! Enter {code} at checkout', bg_color: '#4a5338', text_color: '#ffffff' },
        large_banner: { enabled: false, title: 'Relive It in Print', subtitle: 'Get these moments off the screen and into your hands with {discount-value} off, this {exp-date}.', cta: 'Visit Shop', bg_color: '#eae5d8', title_color: '#2c3e2d', subtitle_color: '#4a5a4b', cta_bg: '#3a4a38', cta_color: '#ffffff', font: 'Playfair Display', desktop_image: '', mobile_image: '' },
        photo_banner: { enabled: false, title: 'One Year Anniversary', subtitle: '20% off all prints', bg_color: '#d4c9b5', desktop_image: '', mobile_image: '' },
      }
    },
    {
      id: 'birthday',
      label: 'Birthday Special',
      description: 'Send birthday promotions to clients on their special day and encourage them to order prints as a gift to themselves.',
      icon: '🎂',
      bg: '#f0e8f5',
      enabled: false,
      yearsRepeat: 2,
      startDays: 14,
      durationDays: 7,
      discount: '20',
      discountCode: 'BIRTHDAY20',
      banners: {
        text_banner: { enabled: false, text: 'Happy Birthday! Enjoy {discount-value} off all prints today only!', bg_color: '#7c3aed', text_color: '#ffffff' },
        large_banner: { enabled: false, title: 'Happy Birthday!', subtitle: 'Celebrate with {discount-value} off all prints today only!', cta: 'Shop Now', bg_color: '#f0e8f5', title_color: '#4a1d96', subtitle_color: '#6d28d9', cta_bg: '#7c3aed', cta_color: '#ffffff', font: 'Playfair Display', desktop_image: '', mobile_image: '' },
        photo_banner: { enabled: false, title: 'Birthday Offer', subtitle: 'Celebrate with prints!', bg_color: '#e9d5ff', desktop_image: '', mobile_image: '' },
      }
    },
    {
      id: 'seasonal',
      label: 'Seasonal Promo',
      description: 'Run seasonal campaigns during holidays and key shopping periods to boost print sales.',
      icon: '🍂',
      bg: '#fef3e8',
      enabled: false,
      yearsRepeat: 1,
      startDays: 30,
      durationDays: 21,
      discount: '25',
      discountCode: 'SEASON25',
      banners: {
        text_banner: { enabled: false, text: 'Season sale! {discount-value} off all prints — limited time offer!', bg_color: '#92400e', text_color: '#ffffff' },
        large_banner: { enabled: false, title: 'Season Sale', subtitle: '{discount-value} off everything — limited time only!', cta: 'Shop Sale', bg_color: '#fef3e8', title_color: '#92400e', subtitle_color: '#b45309', cta_bg: '#d97706', cta_color: '#ffffff', font: 'Georgia', desktop_image: '', mobile_image: '' },
        photo_banner: { enabled: false, title: 'Season Sale', subtitle: 'Limited time offer!', bg_color: '#fde68a', desktop_image: '', mobile_image: '' },
      }
    },
  ]);
  const [selectedCampaign, setSelectedCampaign] = useState(null); // which campaign detail is open
  const [activeModal, setActiveModal] = useState(null);           // 'text_banner' | 'large_banner' | 'photo_banner'
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [automationModalTab, setAutomationModalTab] = useState('content');

  const handleIntegerChange = (val, setter) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  // Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  // Load profile
  useEffect(() => {
    // Clear page caching when user logs out or changes
    cachedOrders = null;
    cachedOrderItems = null;
    cachedCollections = null;
    cachedPhotos = null;
    cachedProducts = null;

    async function loadProfile() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setProfile(data);
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    }
    loadProfile();
  }, [user]);

  // Load all data from database
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      if (cachedOrders && cachedOrderItems && cachedCollections && cachedPhotos) {
        return; // Skip loading if already cached
      }
      setLoading(true);
      try {
        const { data: ordersData } = await supabase
          .from('printstore_orders')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: itemsData } = await supabase
          .from('printstore_order_items')
          .select('*');

        const { data: collectionsData } = await supabase
          .from('collections')
          .select('id, name, digital_download_enabled, digital_download_price_single, digital_download_price_all, cover_url, event_date')
          .eq('photographer_id', user.id);

        const { data: photosData } = await supabase
          .from('photos')
          .select('id, collection_id, web_url, thumbnail_url, full_url');

        const ords = ordersData || [];
        const items = itemsData || [];
        const cols = collectionsData || [];
        const phs = photosData || [];

        cachedOrders = ords;
        cachedOrderItems = items;
        cachedCollections = cols;
        cachedPhotos = phs;

        setOrders(ords);
        setOrderItems(items);
        setCollections(cols);
        setPhotos(phs);
      } catch (error) {
        console.error("Error loading store dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    const storedEnabled = localStorage.getItem('pixnxt_global_digital_enabled');
    const storedSingle = localStorage.getItem('pixnxt_global_digital_price_single');
    const storedAll = localStorage.getItem('pixnxt_global_digital_price_all');

    if (storedEnabled !== null) {
      setGlobalDigitalEnabled(storedEnabled === 'true');
    } else if (collections && collections.length > 0) {
      const anyEnabled = collections.some(col => col.digital_download_enabled);
      setGlobalDigitalEnabled(anyEnabled);
    }

    if (storedSingle !== null) {
      setGlobalDigitalPriceSingle(storedSingle);
    } else if (collections && collections.length > 0) {
      const firstSingle = collections.find(col => col.digital_download_price_single != null)?.digital_download_price_single;
      setGlobalDigitalPriceSingle(firstSingle !== undefined ? String(firstSingle) : '10');
    }

    if (storedAll !== null) {
      setGlobalDigitalPriceAll(storedAll);
    } else if (collections && collections.length > 0) {
      const firstAll = collections.find(col => col.digital_download_price_all != null)?.digital_download_price_all;
      setGlobalDigitalPriceAll(firstAll !== undefined ? String(firstAll) : '0');
    }

    // Load Vault Settings from vault_extension_plans table
    const loadVaultSettings = async () => {
      if (collections && collections.length > 0) {
        const vaultPlan = await galleryService.fetchVaultPlan(collections[0].id);
        if (vaultPlan) {
          setGlobalVaultEnabled(vaultPlan.vault_enabled === true);
          if (vaultPlan.price_1month != null) setGlobalVaultPrice1Month(String(vaultPlan.price_1month));
          if (vaultPlan.price_1year != null) setGlobalVaultPrice1Year(String(vaultPlan.price_1year));
          if (vaultPlan.price_lifetime != null) setGlobalVaultPriceLifetime(String(vaultPlan.price_lifetime));
          if (vaultPlan.desc_1month) setGlobalVaultDesc1Month(vaultPlan.desc_1month);
          if (vaultPlan.desc_1year) setGlobalVaultDesc1Year(vaultPlan.desc_1year);
          if (vaultPlan.desc_lifetime) setGlobalVaultDescLifetime(vaultPlan.desc_lifetime);
          return;
        }
      }
      // Fallback to localStorage global defaults
      const storedVaultEnabled = localStorage.getItem('pixnxt_global_vault_enabled');
      const storedVault1Month = localStorage.getItem('pixnxt_global_vault_price_1month');
      const storedVault1Year = localStorage.getItem('pixnxt_global_vault_price_1year');
      const storedVaultLifetime = localStorage.getItem('pixnxt_global_vault_price_lifetime');
      const storedVaultDesc1Month = localStorage.getItem('pixnxt_global_vault_desc_1month');
      const storedVaultDesc1Year = localStorage.getItem('pixnxt_global_vault_desc_1year');
      const storedVaultDescLifetime = localStorage.getItem('pixnxt_global_vault_desc_lifetime');

      if (storedVaultEnabled !== null) setGlobalVaultEnabled(storedVaultEnabled === 'true');
      if (storedVault1Month !== null) setGlobalVaultPrice1Month(storedVault1Month);
      if (storedVault1Year !== null) setGlobalVaultPrice1Year(storedVault1Year);
      if (storedVaultLifetime !== null) setGlobalVaultPriceLifetime(storedVaultLifetime);
      if (storedVaultDesc1Month !== null) setGlobalVaultDesc1Month(storedVaultDesc1Month);
      if (storedVaultDesc1Year !== null) setGlobalVaultDesc1Year(storedVaultDesc1Year);
      if (storedVaultDescLifetime !== null) setGlobalVaultDescLifetime(storedVaultDescLifetime);
    };
    loadVaultSettings();
  }, [collections]);

  const fetchProducts = async (force = false) => {
    if (cachedProducts && !force) {
      setProducts(cachedProducts);
      return;
    }
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('printstore_products')
        .select('*');
      if (error) throw error;
      const loaded = data || [];
      cachedProducts = loaded;
      setProducts(loaded);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };
  useEffect(() => {
    if (activeViewTab === 'pricing' || activeViewTab === 'products') {
      fetchProducts();
    }
  }, [activeViewTab]);

  const getPhotoUrlForProduct = (productId, originalUrl) => {
    if (photos && photos.length > 0) {
      // Exclude video extensions to prevent broken images
      const validPhotos = photos.filter(pObj => {
        const url = pObj.web_url || pObj.thumbnail_url || pObj.full_url;
        if (!url) return false;
        return !/\.(mp4|mov|webm|ogg|avi|flv|mkv|wmv)(\?.*)?$/i.test(url);
      });
      const activePhotos = validPhotos.length > 0 ? validPhotos : photos;
      let hash = 0;
      for (let i = 0; i < productId.length; i++) {
        hash = productId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % activePhotos.length;
      const pObj = activePhotos[index];
      return pObj.web_url || pObj.thumbnail_url || pObj.full_url || originalUrl;
    }
    return originalUrl;
  };


  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const frameId = p.id.substring(0, 10).toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.product_type || '').toLowerCase().includes(q) || frameId.includes(q);
      });
    }

    if (categoryFilter !== 'all') {
      list = list.filter(p => p.product_type === categoryFilter);
    }

    if (profitFilter === 'zero') {
      list = list.filter(p => {
        const profitPct = p.options?.profit_percentage || 0;
        return Number(profitPct) === 0;
      });
    } else if (profitFilter === 'custom') {
      list = list.filter(p => {
        const profitPct = p.options?.profit_percentage || 0;
        return Number(profitPct) > 0;
      });
    }

    if (priceStatusFilter === 'active') {
      list = list.filter(p => p.is_visible);
    } else if (priceStatusFilter === 'inactive') {
      list = list.filter(p => !p.is_visible);
    }

    return list;
  }, [products, searchQuery, categoryFilter, profitFilter, priceStatusFilter]);

  const categoriesList = useMemo(() => {
    const list = new Set(products.map(p => p.product_type).filter(Boolean));
    return Array.from(list);
  }, [products]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkApply = (method, value) => {
    if (selectedIds.length === 0) {
      alert("Please select at least one product.");
      return;
    }
    const val = parseFloat(value);
    if (method !== 'reset' && (isNaN(val) || val < 0)) {
      alert("Please enter a valid positive margin percentage.");
      return;
    }

    const changes = selectedIds.map(id => {
      const p = products.find(prod => prod.id === id);
      const cost = parseFloat(p.base_price);
      const oldPct = parseFloat(p.options?.profit_percentage || 0);
      const oldPrice = parseFloat(p.options?.selling_price || p.base_price);

      let newPct = oldPct;
      let newProfitAmount = parseFloat(p.options?.profit_amount || 0);
      let newPrice = oldPrice;

      if (method === 'increase_pct') {
        newPct = oldPct + val;
        newPrice = cost * (1 + newPct / 100);
        newProfitAmount = newPrice - cost;
      } else if (method === 'decrease_pct') {
        newPct = Math.max(0, oldPct - val);
        newPrice = cost * (1 + newPct / 100);
        newProfitAmount = newPrice - cost;
      } else if (method === 'set_pct') {
        newPct = val;
        newPrice = cost * (1 + newPct / 100);
        newProfitAmount = newPrice - cost;
      } else if (method === 'set_amount') {
        newProfitAmount = val;
        newPrice = cost + newProfitAmount;
        newPct = (newProfitAmount / cost) * 100;
      } else if (method === 'reset') {
        newPct = 0;
        newProfitAmount = 0;
        newPrice = cost;
      }

      return {
        product_id: p.id,
        name: p.name,
        cost,
        oldProfitPct: oldPct,
        newProfitPct: newPct,
        oldPrice,
        newPrice,
        newProfitAmount
      };
    });

    setPreviewChanges(changes);
    setShowConfirmDialog(true);
  };

  const handleSaveBulkPrices = async () => {
    if (!previewChanges) return;
    setIsSavingProducts(true);
    try {
      const timestamp = new Date().toISOString();
      for (const change of previewChanges) {
        const originalProduct = products.find(p => p.id === change.product_id);
        const newOptions = {
          ...(originalProduct.options || {}),
          selling_price: parseFloat(change.newPrice.toFixed(2)),
          profit_percentage: parseFloat(change.newProfitPct.toFixed(2)),
          profit_amount: parseFloat(change.newProfitAmount.toFixed(2)),
          last_updated: timestamp
        };

        const { error } = await supabase
          .from('printstore_products')
          .update({ options: newOptions })
          .eq('id', change.product_id);

        if (error) throw error;
      }

      setNotification({ type: 'success', text: `✓ Successfully updated ${previewChanges.length} products.` });
      setPreviewChanges(null);
      setShowConfirmDialog(false);
      setSelectedIds([]);
      setMarkupPercent('');

      await fetchProducts(true);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error saving bulk prices:", err);
      alert("Failed to save changes: " + err.message);
    } finally {
      setIsSavingProducts(false);
    }
  };

  const handleSaveIndividualPrice = async () => {
    if (!setPriceProduct) return;
    const basePrice = parseFloat(setPriceProduct.base_price);
    const pct = parseInt(individualProfitPct);

    if (isNaN(pct) || pct < 0) {
      alert("Please enter a valid profit percentage.");
      return;
    }

    const newSellingPrice = basePrice + (basePrice * pct / 100);
    const newProfitAmount = newSellingPrice - basePrice;

    setIsSavingProducts(true);
    try {
      const timestamp = new Date().toISOString();
      const newOptions = {
        ...(setPriceProduct.options || {}),
        selling_price: parseFloat(newSellingPrice.toFixed(2)),
        profit_percentage: pct,
        profit_amount: parseFloat(newProfitAmount.toFixed(2)),
        last_updated: timestamp
      };

      const { error } = await supabase
        .from('printstore_products')
        .update({ options: newOptions })
        .eq('id', setPriceProduct.id);

      if (error) throw error;

      // Local state update instead of full refetch to prevent page reload
      setProducts(prev => {
        const updated = prev.map(p => p.id === setPriceProduct.id ? { ...p, options: newOptions } : p);
        cachedProducts = updated;
        return updated;
      });
      setNotification({ type: 'success', text: `✓ Successfully set price for ${setPriceProduct.name}.` });
      setSetPriceProduct(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error setting individual price:", err);
      alert("Failed to save price: " + err.message);
    } finally {
      setIsSavingProducts(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Category', 'Cost Price (INR)', 'Profit Margin (%)', 'Selling Price (INR)', 'Status'];
    const rows = filteredProducts.map(p => {
      const profitPct = Number(p.options?.profit_percentage || 0);
      const sellingPrice = Number(p.options?.selling_price || p.base_price);
      return [
        p.id,
        p.name,
        p.product_type || p.id,
        p.base_price,
        profitPct,
        sellingPrice,
        p.is_visible ? 'Active' : 'Hidden'
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "price_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    const headers = ['Product ID', 'Product Name', 'Category', 'Cost Price (INR)', 'Profit Margin (%)', 'Selling Price (INR)', 'Status'];
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Price List</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body><table border="1" style="border-collapse:collapse; font-family:sans-serif; font-size:13px;"><thead><tr style="background-color:#f8fafc; height:32px;">`;

    headers.forEach(h => {
      html += `<th style="padding:4px 8px; font-weight:bold; border:1px solid #cbd5e1; text-align:left;">${h}</th>`;
    });
    html += `</tr></thead><tbody>`;

    filteredProducts.forEach(p => {
      const profitPct = Number(p.options?.profit_percentage || 0);
      const sellingPrice = Number(p.options?.selling_price || p.base_price);
      html += `<tr style="height:24px;">
        <td style="padding:4px 8px; border:1px solid #cbd5e1;">${p.id}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1;">${p.name}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1;">${p.product_type || p.id}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1; mso-number-format:'0\\.00'; text-align:right;">${p.base_price.toFixed(2)}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1; mso-number-format:'0'; text-align:right;">${profitPct}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1; mso-number-format:'0\\.00'; text-align:right;">${sellingPrice.toFixed(2)}</td>
        <td style="padding:4px 8px; border:1px solid #cbd5e1; text-align:center;">${p.is_visible ? 'Active' : 'Hidden'}</td>
      </tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "price_list.xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle product visibility (for Products module)
  const handleToggleProductVisibility = async (product) => {
    const newVisibility = !product.is_visible;
    try {
      const { error } = await supabase
        .from('printstore_products')
        .update({ is_visible: newVisibility })
        .eq('id', product.id);
      if (error) throw error;
      // Local state update
      setProducts(prev => {
        const updated = prev.map(p => p.id === product.id ? { ...p, is_visible: newVisibility } : p);
        cachedProducts = updated;
        return updated;
      });
    } catch (err) {
      console.error('Error toggling product visibility:', err);
      alert('Failed to toggle product: ' + err.message);
    }
  };

  const handleSaveGlobalDigitalSettings = async () => {
    const singlePrice = parseInt(globalDigitalPriceSingle);
    const allPrice = parseInt(globalDigitalPriceAll);

    if (isNaN(singlePrice) || singlePrice < 0) {
      alert("Please enter a valid price for single photo downloads.");
      return;
    }
    if (isNaN(allPrice) || allPrice < 0) {
      alert("Please enter a valid price for all photos downloads.");
      return;
    }

    setSavingGlobalDigital(true);
    try {
      const collectionIds = collections.map(c => c.id);
      if (collectionIds.length === 0) {
        setNotification({ type: 'success', text: `✓ No collections found to update.` });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      const { error } = await supabase
        .from('collections')
        .update({
          digital_download_enabled: globalDigitalEnabled,
          digital_download_price_single: singlePrice,
          digital_download_price_all: allPrice
        })
        .in('id', collectionIds);

      if (error) throw error;

      localStorage.setItem('pixnxt_global_digital_enabled', String(globalDigitalEnabled));
      localStorage.setItem('pixnxt_global_digital_price_single', String(singlePrice));
      localStorage.setItem('pixnxt_global_digital_price_all', String(allPrice));

      setCollections(prev => prev.map(c => ({
        ...c,
        digital_download_enabled: globalDigitalEnabled,
        digital_download_price_single: singlePrice,
        digital_download_price_all: allPrice
      })));

      setNotification({ type: 'success', text: `✓ Successfully saved digital download settings across all collections.` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error saving global digital settings:", err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setSavingGlobalDigital(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    if (globalVaultEnabled) {
      if (!globalVaultDescLifetime.trim()) {
        alert("Please enter a description for the Lifetime plan. It is compulsory to display on the social sharing view.");
        return;
      }
    }
    setSavingStoreSettings(true);
    try {
      const collectionIds = (collections || []).map(c => c.id).filter(Boolean);
      const vaultSettings = {
        vault_enabled: globalVaultEnabled,
        price_lifetime: parseInt(globalVaultPriceLifetime) || 499,
        desc_lifetime: globalVaultDescLifetime.trim()
      };

      if (collectionIds.length > 0) {
        await galleryService.upsertVaultPlanBatch(collectionIds, vaultSettings);
      }

      // Keep global defaults in localStorage for new collection creation
      localStorage.setItem('pixnxt_global_vault_enabled', String(globalVaultEnabled));
      localStorage.setItem('pixnxt_global_vault_price_1month', globalVaultPrice1Month);
      localStorage.setItem('pixnxt_global_vault_price_1year', globalVaultPrice1Year);
      localStorage.setItem('pixnxt_global_vault_price_lifetime', globalVaultPriceLifetime);
      localStorage.setItem('pixnxt_global_vault_desc_1month', globalVaultDesc1Month);
      localStorage.setItem('pixnxt_global_vault_desc_1year', globalVaultDesc1Year);
      localStorage.setItem('pixnxt_global_vault_desc_lifetime', globalVaultDescLifetime);

      setNotification({ type: 'success', text: `✓ Successfully saved Vault & Extension settings across all collections.` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error saving Vault:", err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setSavingStoreSettings(false);
    }
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map photo ID → Collection name
  const photoToCollectionMap = useMemo(() => {
    const map = {};
    const colMap = {};
    collections.forEach(c => { colMap[c.id] = c.name; });
    photos.forEach(p => {
      if (p.collection_id && colMap[p.collection_id]) {
        map[p.id] = colMap[p.collection_id];
      }
    });
    return map;
  }, [collections, photos]);

  // Resolve collection name per order
  const orderCollectionNames = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      let collectionName = '—';
      for (const item of items) {
        const opt = item.options || {};
        const photoId = opt.photo?.id || (opt.photos && opt.photos[0]?.id);
        if (photoId && photoToCollectionMap[photoId]) {
          collectionName = photoToCollectionMap[photoId];
          break;
        }
      }
      map[order.id] = collectionName;
    });
    return map;
  }, [orders, orderItems, photoToCollectionMap]);

  // Items count per order
  const orderItemsCount = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      map[order.id] = totalQty;
    });
    return map;
  }, [orders, orderItems]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!globalSearch.trim()) return true;

      const q = globalSearch.toLowerCase();

      const shortId = order.id ? `#${order.id.split('-')[0].toUpperCase()}` : '';
      const fullId = order.id ? order.id.toLowerCase() : '';
      const customerName = order.customer_name ? order.customer_name.toLowerCase() : '';
      const customerEmail = order.customer_email ? order.customer_email.toLowerCase() : '';
      const collectionName = (orderCollectionNames[order.id] || '').toLowerCase();
      const statusText = order.status ? order.status.replace('_', ' ').toLowerCase() : '';

      const orderDate = formatDate(order.created_at).toLowerCase();
      const orderTime = formatTime(order.created_at).toLowerCase();

      return (
        shortId.toLowerCase().includes(q) ||
        fullId.includes(q) ||
        customerName.includes(q) ||
        customerEmail.includes(q) ||
        collectionName.includes(q) ||
        statusText.includes(q) ||
        orderDate.includes(q) ||
        orderTime.includes(q)
      );
    });
  }, [orders, orderCollectionNames, globalSearch]);

  const toggleRow = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pixnxt_session');
    navigate('/auth');
  };

  // Format date and time from created_at
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  return (
    <div className="store-dashboard-wrapper theme-mono">
      {/* Top Navbar — same as client gallery / Dashboard */}
      <nav className="dash-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <div className="dash-navbar-left">
          <Link to="/dashboard" className="dash-logo">PIXNXT</Link>
        </div>

        <div className="dash-navbar-right">
          {/* Icons removed per user request: Help and Notifications */}

          <div className="dash-profile-wrapper" ref={profileRef}>
            <button
              className="dash-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              title="Profile"
            >
              {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </button>

            {profileOpen && (
              <div className="dash-profile-dropdown">
                <div className="dash-dropdown-header">
                  <div className="dash-dropdown-avatar">
                    {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="dash-dropdown-user-info">
                    <h4>{profile?.display_name || 'Photographer'}</h4>
                    <p>{user?.email || 'No email'}</p>
                  </div>
                </div>
                <div className="dash-dropdown-items">
                  <button className="dash-dropdown-item" style={{ borderRadius: '4px' }}>
                    <Gift size={16} style={{ marginRight: '8px' }} /> Invite Friends & Get $20
                  </button>
                  <div className="dash-dropdown-divider" />
                  <button className="dash-dropdown-item" onClick={() => navigate('/settings')} style={{ borderRadius: '4px' }}>
                    <User size={16} style={{ marginRight: '8px' }} /> Profile
                  </button>
                  <button className="dash-dropdown-item" onClick={handleLogout} style={{ borderRadius: '4px' }}>
                    <LogOut size={16} style={{ marginRight: '8px' }} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="store-dashboard-layout" style={{ marginTop: '76px' }}>
        {/* Sidebar — client gallery dark theme */}
        <aside className="store-dashboard-sidebar" style={{ width: isSidebarCollapsed ? '64px' : '240px', transition: 'width 0.25s ease', overflowX: 'hidden', position: 'relative' }}>
          {!isSidebarCollapsed && (
            <div className="sidebar-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #e0e0e0', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={18} />
                <span>Store Manager</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="neu-circle relative inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  title="Notifications"
                >
                  <Bell size={16} />
                  <span style={{ position: 'absolute', right: '8px', top: '8px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Home"
                >
                  <Home size={16} />
                </button>
              </div>
            </div>
          )}
          <ul className="sidebar-menu" style={isSidebarCollapsed ? { alignItems: 'center', paddingLeft: 0, paddingRight: 0 } : {}}>
            <li className={activeViewTab === 'orders' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('orders'); }} title="Orders" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <Package size={18} />
                {!isSidebarCollapsed && <span>Orders</span>}
              </Link>
            </li>
            <li className={activeViewTab === 'pricing' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('pricing'); }} title="Price List" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <DollarSign size={18} />
                {!isSidebarCollapsed && <span>Price List</span>}
              </Link>
            </li>
            <li className={activeViewTab === 'products' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('products'); }} title="Products" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <Layers size={18} />
                {!isSidebarCollapsed && <span>Products</span>}
              </Link>
            </li>
            <li className={activeViewTab === 'digital_downloads' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('digital_downloads'); }} title="Digital Downloads" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <ShoppingBag size={18} />
                {!isSidebarCollapsed && <span>Digital Download</span>}
              </Link>
            </li>
            <li className={activeViewTab === 'settings' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('settings'); }} title="Vault" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <Settings size={18} />
                {!isSidebarCollapsed && <span>Vault</span>}
              </Link>
            </li>
            <li className={activeViewTab === 'sales' ? 'active' : ''}>
              <Link to="#" onClick={(e) => { e.preventDefault(); setActiveViewTab('sales'); }} title="Sales" style={isSidebarCollapsed ? { justifyContent: 'center', paddingLeft: '0', paddingRight: '0' } : {}}>
                <Gift size={18} />
                {!isSidebarCollapsed && <span>Sales</span>}
              </Link>
            </li>
          </ul>
          {/* Sidebar collapse/expand toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </aside>

        {/* Content Area */}
        <main className="store-dashboard-main">
          {activeViewTab === 'orders' ? (
            <div className="store-dashboard-content">
              <div className="store-dashboard-header-row">
                <div>
                  <h1 className="store-dashboard-title">Orders</h1>
                  <p className="store-dashboard-subtitle">Manage, view, and track all incoming product orders from your galleries.</p>
                </div>
                <div className="results-count-label">
                  {filteredOrders.length > 0 ? `Displaying 1-${filteredOrders.length} of ${filteredOrders.length} results.` : 'No results.'}
                </div>
              </div>

              {/* Global Search Bar */}
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-start' }}>
                <div className="relative" style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#71717A', pointerEvents: 'none' }} />
                  <input
                    type="search"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="searcb for name, order id , time and etc.."
                    className="neu-inset h-10 w-full rounded-full border-0 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A]"
                    style={{
                      height: '40px',
                      width: '100%',
                      borderRadius: '9999px',
                      border: 'none',
                      paddingLeft: '42px',
                      paddingRight: '16px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div className="store-dashboard-table-container">
                <table className="store-dashboard-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Collection</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'center' }}>Items</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="no-records-row">
                          {loading ? 'Loading orders...' : 'No orders found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const shortId = order.id ? `#${order.id.split('-')[0].toUpperCase()}` : '';
                        const collectionName = orderCollectionNames[order.id] || '—';
                        const items = orderItems.filter(item => item.order_id === order.id);
                        const itemCount = orderItemsCount[order.id] || 0;

                        return (
                          <React.Fragment key={order.id}>
                            <tr className={`order-main-row ${isExpanded ? 'row-expanded' : ''}`} onClick={() => toggleRow(order.id)}>
                              <td className="font-semibold text-dark">{shortId}</td>
                              <td>
                                <span className={`order-status-badge status-${order.status}`}>
                                  {order.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td>{order.customer_name || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '13px', color: '#333' }}>{order.customer_email || '—'}</span>
                                </div>
                              </td>
                              <td>{collectionName}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(order.created_at)}</td>
                              <td style={{ whiteSpace: 'nowrap', color: '#666' }}>{formatTime(order.created_at)}</td>
                              <td style={{ textAlign: 'center' }}>{itemCount}</td>
                              <td className="font-semibold" style={{ textAlign: 'right' }}>₹{order.total?.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button className="order-view-toggle-btn" onClick={(e) => { e.stopPropagation(); toggleRow(order.id); }}>
                                  {isExpanded ? 'Hide' : 'View'}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="order-details-drawer-row">
                                <td colSpan={10} className="order-details-drawer-cell">
                                  <div className="order-details-wrapper animate-slide-down">
                                    {/* Shipping details */}
                                    <div className="shipping-details-box">
                                      <h3 className="details-box-title">Shipping Details</h3>
                                      <div className="shipping-details-card">
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Shipping Method</span>
                                          <span className="value-text">{order.shipping_method || 'India Ground Shipping (5-7 business days)'}</span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Tracking Info</span>
                                          <span className="value-text tracking-code">{order.payment_intent_id || '—'}</span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Delivery Address</span>
                                          <span className="value-text">
                                            {order.customer_name || '—'}<br />
                                            {order.shipping_address?.address || '—'}, {order.shipping_address?.city || ''}<br />
                                            {order.shipping_address?.zip || ''}, {order.shipping_address?.country || 'India'}
                                          </span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Contact Email</span>
                                          <span className="value-text">{order.customer_email || '—'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items details table */}
                                    <table className="order-items-detail-table">
                                      <thead>
                                        <tr>
                                          <th>Item ({items.length})</th>
                                          <th>Product</th>
                                          <th style={{ textAlign: 'center' }}>Qty</th>
                                          <th style={{ textAlign: 'right' }}>Price</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((item) => {
                                          const opt = item.options || {};
                                          const photoUrl = opt.photo?.url || (opt.photos && opt.photos[0]?.url) || '';
                                          const sizeLabel = opt.size?.label || '—';
                                          const paperLabel = opt.paper?.label || '—';
                                          const frameLabel = opt.frame?.label && opt.frame.id !== 'frame_none' ? opt.frame.label : null;

                                          return (
                                            <tr key={item.id}>
                                              <td className="item-thumbnail-cell">
                                                {photoUrl ? (
                                                  <div className="item-thumb-wrapper">
                                                    <img src={photoUrl} alt={item.product_name} className="item-thumbnail-img" />
                                                  </div>
                                                ) : (
                                                  <div className="item-thumb-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '11px' }}>No image</div>
                                                )}
                                              </td>
                                              <td>
                                                <div className="item-name-info">
                                                  <span className="item-product-name">{item.product_name}</span>
                                                  <span className="item-product-options">
                                                    Size: {sizeLabel} | Paper: {paperLabel}{frameLabel ? ` | Frame: ${frameLabel}` : ''}
                                                  </span>
                                                </div>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                              <td style={{ textAlign: 'right' }} className="font-semibold">₹{(item.unit_price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>

                                    {/* Cost breakdown */}
                                    <div className="order-cost-breakdown">
                                      <div className="breakdown-row">
                                        <span>Subtotal</span>
                                        <span>₹{order.subtotal?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      <div className="breakdown-row">
                                        <span>Shipping</span>
                                        <span>₹{order.shipping_amount?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      {(order.discount_amount > 0) && (
                                        <div className="breakdown-row" style={{ color: '#059669' }}>
                                          <span>Discount</span>
                                          <span>-₹{order.discount_amount?.toFixed(2)}</span>
                                        </div>
                                      )}
                                      <div className="breakdown-row">
                                        <span>Tax</span>
                                        <span>₹{order.tax_amount?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      <div className="breakdown-row order-total-row font-bold">
                                        <span>Order Total</span>
                                        <span>₹{order.total?.toFixed(2) || '0.00'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeViewTab === 'pricing' ? (
            <div className="store-dashboard-content">
              {notification && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: 'rgba(236, 253, 245, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#059669',
                  border: `1px solid rgba(167, 243, 208, 0.4)`,
                  marginBottom: '20px'
                }}>
                  {notification.text}
                </div>
              )}

              <div className="store-dashboard-header-row" style={{ marginBottom: '24px' }}>
                <div>
                  <h1 className="store-dashboard-title">Price List</h1>
                  <p className="store-dashboard-subtitle">Manage selling prices and markup margins for your print lab products.</p>
                </div>
              </div>

              {/* Glassy Search and Filters Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                width: '100%'
              }}>
                {/* Glassy Search input */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#71717A', pointerEvents: 'none' }} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name or ID..."
                    className="neu-inset"
                    style={{
                      height: '42px',
                      width: '100%',
                      borderRadius: '9999px',
                      border: 'none',
                      paddingLeft: '42px',
                      paddingRight: '16px',
                      fontSize: '13.5px',
                      color: '#1a1a1a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Bulk Update and Select controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="neu-inset"
                    style={{
                      padding: '10px 32px 10px 14px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '9999px',
                      outline: 'none',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      fontFamily: "'europa', sans-serif",
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                    }}
                  >
                    <option value="all">all products</option>
                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>)}
                  </select>

                  <select
                    value={profitFilter}
                    onChange={(e) => setProfitFilter(e.target.value)}
                    className="neu-inset"
                    style={{
                      padding: '10px 32px 10px 14px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '9999px',
                      outline: 'none',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      fontFamily: "'europa', sans-serif",
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                    }}
                  >
                    <option value="all">All Margins</option>
                    <option value="zero">Zero Profits</option>
                    <option value="custom">Custom Profits</option>
                  </select>

                  <select
                    value={priceStatusFilter}
                    onChange={(e) => setPriceStatusFilter(e.target.value)}
                    className="neu-inset"
                    style={{
                      padding: '10px 32px 10px 14px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '9999px',
                      outline: 'none',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      fontFamily: "'europa', sans-serif",
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>

                  <button
                    onClick={handleDownloadCSV}
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      color: '#1a1a1a',
                      cursor: 'pointer',
                      fontFamily: "'europa', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Download CSV
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      color: '#1a1a1a',
                      cursor: 'pointer',
                      fontFamily: "'europa', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Download Excel
                  </button>
                </div>
              </div>

              {/* Glassy Select All Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '24px',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 600 }}>Select All ({filteredProducts.length} products)</span>
                  {selectedIds.length > 0 && <span style={{ fontSize: '12px', color: '#111', fontWeight: 700, paddingLeft: '8px', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>{selectedIds.length} selected</span>}
                </div>

                {selectedIds.length > 0 && (
                  <button
                    onClick={() => {
                      setBulkProfitPct('');
                      setShowBulkProfitModal(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#111',
                      color: '#fff',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Apply Bulk Profit
                  </button>
                )}
              </div>

              {/* Product Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' }}>
                {loadingProducts ? (
                  <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No products found matching filters.</div>
                ) : (
                  filteredProducts.map((p) => {
                    const profitPct = Number(p.options?.profit_percentage || 0);
                    const sellingPrice = Number(p.options?.selling_price || p.base_price);
                    const isSelected = selectedIds.includes(p.id);
                    const frameId = p.id.substring(0, 10).toUpperCase();
                    // Retrieve collection photo randomly rather than mock placeholder images
                    const photoUrl = getPhotoUrlForProduct(p.id, p.image_url);
                    const pType = p.product_type || p.id || '';
                    const imgS = { width: '100%', height: '100%', objectFit: 'cover' };

                    // Render visual frame based on product type
                    const renderCardFrame = () => {
                      const imgErr = (e) => {
                        e.target.onerror = null;
                        e.target.src = p.image_url;
                      };
                      if (pType.includes('circular')) return (
                        <div style={{ width: '110px', height: '110px', border: '4.5px solid #5d4037', background: '#f9f9f9', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
                          <div style={{ width: '78%', height: '78%', borderRadius: '50%', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                        </div>
                      );
                      if (pType.includes('matted') && pType.includes('collage')) {
                        // Get 4 distinct random photos for collage preview
                        const getCollageUrls = () => {
                          if (photos && photos.length > 0) {
                            const validPhotos = photos.filter(pObj => {
                              const url = pObj.web_url || pObj.thumbnail_url || pObj.full_url;
                              if (!url) return false;
                              return !/\.(mp4|mov|webm|ogg|avi|flv|mkv|wmv)(\?.*)?$/i.test(url);
                            });
                            const activePhotos = validPhotos.length > 0 ? validPhotos : photos;
                            let hash = 0;
                            for (let i = 0; i < p.id.length; i++) {
                              hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const list = [];
                            for (let i = 0; i < 4; i++) {
                              const idx = (Math.abs(hash) + i) % activePhotos.length;
                              const pObj = activePhotos[idx];
                              list.push(pObj.web_url || pObj.thumbnail_url || pObj.full_url || p.image_url);
                            }
                            return list;
                          }
                          return [p.image_url, p.image_url, p.image_url, p.image_url];
                        };
                        const urls = getCollageUrls();
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2px', padding: '6px', background: '#fdfdfd', border: '3.5px solid #111', width: '110px', height: '110px', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
                            {urls.map((url, idx) => (
                              <img key={idx} src={url} alt="" style={imgS} onError={imgErr} />
                            ))}
                          </div>
                        );
                      }
                      if (pType.includes('matted') && !pType.includes('collage')) return (
                        <div style={{ width: '110px', height: '110px', background: '#fdfdfd', border: '4.5px solid #111', padding: '8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      if (pType.includes('float')) return (
                        <div style={{ width: '110px', height: '110px', border: '4.5px solid #111', padding: '8px', boxSizing: 'border-box', background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
                          <div style={{ width: '100%', height: '100%', background: '#fff', padding: '1px', boxShadow: '2px 4px 6px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                        </div>
                      );
                      if (pType === 'frames') return (
                        <div style={{ width: '110px', height: '110px', border: '4.5px solid #6d4c41', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.22)', background: '#fff' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      if (pType.includes('canvas')) return (
                        <div style={{ width: '108px', height: '108px', boxShadow: '2px 4px 8px rgba(0,0,0,0.25)', border: '1px solid #ccc', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRightWidth: '4px', borderBottomWidth: '4px', transform: 'perspective(100px) rotateY(-6deg)', background: '#fff' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      if (pType.includes('acrylic')) return (
                        <div style={{ width: '108px', height: '108px', boxShadow: '0 4px 12px rgba(0,0,0,0.22)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.4)', background: '#000' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)', zIndex: 1 }} />
                          <img src={photoUrl} alt="" style={imgS} onError={imgErr} />
                        </div>
                      );
                      if (pType.includes('deckled')) return (
                        <div style={{ width: '110px', height: '110px', background: '#f9f8f6', border: '1px solid #e5e5e0', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                          <div style={{ width: '78%', height: '78%', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', padding: '2px', boxSizing: 'border-box', clipPath: 'polygon(0% 1%, 12% 0%, 25% 1%, 38% 0%, 50% 1.5%, 62% 0%, 75% 1%, 88% 0.5%, 100% 0%, 99% 12%, 100% 25%, 98.5% 38%, 100% 50%, 99% 62%, 100% 75%, 99% 88%, 100% 100%, 88% 99%, 75% 100%, 62% 98.5%, 50% 100%, 38% 99%, 25% 100%, 12% 99%, 0% 100%, 1% 88%, 0% 75%, 1.5% 62%, 0% 50%, 1% 38%, 0% 25%, 1% 12%)' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                        </div>
                      );
                      if (pType.includes('panoramic')) return (
                        <div style={{ width: '120px', height: '72px', background: '#fff', border: '1px solid #ddd', padding: '3px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '1px 2px 4px rgba(0,0,0,0.1)' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      if (pType.includes('dibond')) return (
                        <div style={{ width: '108px', height: '108px', position: 'relative', boxShadow: '2px 4px 10px rgba(0,0,0,0.18)', border: '1px solid #ddd', background: '#fff' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      if (pType.includes('gallery')) return (
                        <div style={{ width: '108px', height: '108px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.12)', padding: '5px', boxSizing: 'border-box' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      // Print Pack — stacked fanned prints
                      if (pType.includes('print') && pType.includes('pack')) return (
                        <div style={{ width: '110px', height: '110px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ position: 'absolute', width: '72px', height: '90px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transform: 'rotate(-8deg)', top: '6px', left: '12px', overflow: 'hidden' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                          <div style={{ position: 'absolute', width: '72px', height: '90px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transform: 'rotate(-3deg)', top: '4px', left: '16px', overflow: 'hidden' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                          <div style={{ position: 'absolute', width: '72px', height: '90px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transform: 'rotate(2deg)', top: '2px', left: '20px', overflow: 'hidden' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                        </div>
                      );
                      // Default: prints
                      if (pType === 'prints' || pType.includes('print')) return (
                        <div style={{ width: '84px', height: '108px', background: '#fff', border: '1px solid #e2e8f0', padding: '3px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                      // Fallback
                      return (
                        <div style={{ width: '108px', height: '108px', background: '#fff', border: '1px solid #e2e8f0', padding: '4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}><img src={photoUrl} alt="" style={imgS} onError={imgErr} /></div>
                      );
                    };


                    return (
                      <div
                        key={p.id}
                        style={{
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.55)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: isSelected ? `2px solid #1a1a1a` : '1px solid rgba(0, 0, 0, 0.08)',
                          borderRadius: '12px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s',
                          cursor: 'default',
                          position: 'relative',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Header info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(p.id)} style={{ cursor: 'pointer' }} />
                            <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 600 }}>{frameId}</span>
                          </div>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: 'bold',
                            backgroundColor: p.is_visible ? '#d1fae5' : '#f1f5f9',
                            color: p.is_visible ? '#065f46' : '#475569'
                          }}>
                            {p.is_visible ? 'Active' : 'Hidden'}
                          </span>
                        </div>

                        {/* Visual Frame */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px', width: '100%' }}>
                          {renderCardFrame()}
                        </div>

                        {/* Product Title */}
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111', textAlign: 'center', lineHeight: 1.3 }}>{p.name}</div>

                        {/* Breakdown info */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Cost</span>
                            <span style={{ fontFamily: 'monospace', color: '#111' }}>₹{p.base_price.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Profit</span>
                            <span style={{ color: '#111' }}>{profitPct.toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#111' }}>Selling</span>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111', fontSize: '14.5px' }}>₹{sellingPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSetPriceProduct(p);
                            setIndividualBasePrice(String(p.base_price || ''));
                            setIndividualPrice('');
                            setIndividualProfitPct(String(profitPct || '0'));
                          }}
                          style={{
                            width: '100%', padding: '10px 12px', fontSize: '11px', fontWeight: 700,
                            border: `1px solid #111`, borderRadius: '6px',
                            backgroundColor: 'transparent', color: '#111',
                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                            transition: 'all 0.15s'
                          }}
                        >
                          Set Price
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bulk Edit Confirmation Dialog */}
              {showConfirmDialog && previewChanges && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '30px',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '440px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.08)',
                    fontFamily: "'europa', sans-serif"
                  }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: 700, color: '#111' }}>Confirm Bulk Price Changes</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '14.5px', color: '#64748b', lineHeight: 1.5 }}>
                      You are about to bulk update prices for <strong>{previewChanges.length} products</strong>. Selling prices will instantly update in the Print Lab.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        disabled={isSavingProducts}
                        onClick={() => setShowConfirmDialog(false)}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600, color: '#334155'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSavingProducts}
                        onClick={handleSaveBulkPrices}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: 'none', backgroundColor: '#111',
                          color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 600
                        }}
                      >
                        {isSavingProducts ? 'Saving...' : 'Apply Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Edit Set Price Dialog */}
              {setPriceProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '30px',
                    borderRadius: '24px',
                    width: '95%',
                    maxWidth: '420px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.08)',
                    fontFamily: "'europa', sans-serif"
                  }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#111' }}>Set Price: {setPriceProduct.name}</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>Configure the unit base price and profit percentage.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cost Price (INR)</label>
                        <input
                          type="number"
                          value={individualBasePrice}
                          disabled={true}
                          className="neu-inset"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '13.5px',
                            border: 'none',
                            borderRadius: '9999px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            color: '#64748b',
                            backgroundColor: 'rgba(0,0,0,0.03)',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Profit Margin Percentage (%)</label>
                        <input
                          type="text"
                          pattern="[0-9]*"
                          value={individualProfitPct}
                          onChange={(e) => handleIntegerChange(e.target.value, setIndividualProfitPct)}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') {
                              e.preventDefault();
                            }
                          }}
                          className="neu-inset"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '13.5px',
                            border: 'none',
                            borderRadius: '9999px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            color: '#111'
                          }}
                        />
                      </div>

                      <div style={{
                        backgroundColor: 'rgba(255,255,255,0.45)',
                        backdropFilter: 'blur(8px)',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        fontSize: '13.5px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#64748b' }}>
                          <span>Cost:</span>
                          <span style={{ fontWeight: 600, color: '#111' }}>₹{parseFloat(individualBasePrice || '0').toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '8px', color: '#111' }}>
                          <span>New Selling Price:</span>
                          <span>₹{(parseFloat(individualBasePrice || '0') * (1 + parseFloat(individualProfitPct || '0') / 100)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        disabled={isSavingProducts}
                        onClick={() => setSetPriceProduct(null)}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600, color: '#334155'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSavingProducts}
                        onClick={handleSaveIndividualPrice}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: 'none', backgroundColor: '#111',
                          color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 600
                        }}
                      >
                        {isSavingProducts ? 'Saving...' : 'Set Price'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Profit Modal */}
              {showBulkProfitModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifycontent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '30px',
                    borderRadius: '24px',
                    width: '95%',
                    maxWidth: '420px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.08)',
                    fontFamily: "'europa', sans-serif",
                    margin: 'auto'
                  }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#111' }}>Apply Bulk Profit Margin</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>
                      Set the profit percentage for all <strong>{selectedIds.length} selected products</strong>. Decimals are not allowed.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Profit Margin Percentage (%)</label>
                        <input
                          type="text"
                          pattern="[0-9]*"
                          value={bulkProfitPct}
                          onChange={(e) => handleIntegerChange(e.target.value, setBulkProfitPct)}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="e.g. 50"
                          className="neu-inset"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '13.5px',
                            border: 'none',
                            borderRadius: '9999px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            color: '#111'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        onClick={() => setShowBulkProfitModal(false)}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600, color: '#334155'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const pct = parseInt(bulkProfitPct);
                          if (isNaN(pct) || pct < 0) {
                            alert("Please enter a valid profit percentage.");
                            return;
                          }
                          setShowBulkProfitModal(false);
                          handleBulkApply('set_pct', bulkProfitPct);
                        }}
                        style={{
                          padding: '10px 18px', fontSize: '13px', border: 'none', backgroundColor: '#111',
                          color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 600
                        }}
                      >
                        Apply Bulk Profit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeViewTab === 'digital_downloads' ? (
            <div className="store-dashboard-content">
              {notification && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: 'rgba(236, 253, 245, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#059669',
                  border: `1px solid rgba(167, 243, 208, 0.4)`,
                  marginBottom: '20px'
                }}>
                  {notification.text}
                </div>
              )}

              <div className="store-dashboard-header-row" style={{ marginBottom: '24px' }}>
                <div>
                  <h1 className="store-dashboard-title">Digital Downloads</h1>
                  <p className="store-dashboard-subtitle">Configure download pricing and activation globally for all your photo collections.</p>
                </div>
              </div>

              {/* Global Settings Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading settings...</div>
                ) : (
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.55)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: '16px',
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                    }}
                  >
                    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '16px' }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#111' }}>Storewide Settings</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Configure download settings that automatically apply to all your photo collections.</p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center' }}>
                      {/* Toggle switch */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => setGlobalDigitalEnabled(prev => !prev)}
                          style={{
                            width: '50px',
                            height: '28px',
                            borderRadius: '14px',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            backgroundColor: globalDigitalEnabled ? '#059669' : '#cbd5e1',
                            transition: 'background-color 0.3s ease',
                            padding: 0,
                            flexShrink: 0
                          }}
                        >
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            position: 'absolute',
                            top: '3px',
                            left: globalDigitalEnabled ? '25px' : '3px',
                            transition: 'left 0.3s ease'
                          }} />
                        </button>
                        <div>
                          <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1a1a1a' }}>
                            {globalDigitalEnabled ? 'Digital Downloads Enabled' : 'Digital Downloads Disabled'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Applies storewide to all image downloads</span>
                        </div>
                      </div>

                      {/* Price inputs */}
                      {globalDigitalEnabled && (
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>Single Image Price</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <span style={{ position: 'absolute', left: '12px', fontSize: '13px', color: '#71717A' }}>₹</span>
                              <input
                                type="text"
                                pattern="[0-9]*"
                                value={globalDigitalPriceSingle}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  setGlobalDigitalPriceSingle(val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === '.' || e.key === ',') e.preventDefault();
                                }}
                                style={{
                                  width: '120px',
                                  padding: '10px 12px 10px 24px',
                                  fontSize: '13px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>All Images Price</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <span style={{ position: 'absolute', left: '12px', fontSize: '13px', color: '#71717A' }}>₹</span>
                              <input
                                type="text"
                                pattern="[0-9]*"
                                value={globalDigitalPriceAll}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  setGlobalDigitalPriceAll(val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === '.' || e.key === ',') e.preventDefault();
                                }}
                                style={{
                                  width: '120px',
                                  padding: '10px 12px 10px 24px',
                                  fontSize: '13px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={handleSaveGlobalDigitalSettings}
                        disabled={savingGlobalDigital}
                        style={{
                          padding: '12px 24px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#111',
                          color: '#fff',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          opacity: savingGlobalDigital ? 0.7 : 1,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        {savingGlobalDigital ? 'Saving Settings...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeViewTab === 'products' ? (
            <div className="store-dashboard-content">
              <div className="store-dashboard-header-row" style={{ marginBottom: '24px' }}>
                <div>
                  <h1 className="store-dashboard-title">Products</h1>
                  <p className="store-dashboard-subtitle">Toggle products on or off to control what appears in the Print Lab store.</p>
                </div>
              </div>

              {/* Product search & status filter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                  <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#71717A', pointerEvents: 'none' }} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="neu-inset"
                    style={{
                      height: '42px',
                      width: '100%',
                      borderRadius: '9999px',
                      border: 'none',
                      paddingLeft: '42px',
                      paddingRight: '16px',
                      fontSize: '13.5px',
                      color: '#1a1a1a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  className="neu-inset"
                  style={{
                    padding: '10px 32px 10px 14px',
                    fontSize: '13px',
                    border: 'none',
                    borderRadius: '9999px',
                    outline: 'none',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                    fontFamily: "'europa', sans-serif",
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* Summary stats bar */}
              <div style={{
                display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  flex: '1 1 140px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>{products.length}</div>
                </div>
                <div style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(209,250,229,0.5)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(167,243,208,0.3)',
                  flex: '1 1 140px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>{products.filter(p => p.is_visible).length}</div>
                </div>
                <div style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(241,245,249,0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  flex: '1 1 140px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Inactive</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#64748b' }}>{products.filter(p => !p.is_visible).length}</div>
                </div>
              </div>

              {/* Products list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loadingProducts ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Loading products...</div>
                ) : products.filter(p => {
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = (p.name || '').toLowerCase().includes(q) || (p.product_type || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
                    if (!matchesSearch) return false;
                  }
                  if (productStatusFilter === 'active') return p.is_visible;
                  if (productStatusFilter === 'inactive') return !p.is_visible;
                  return true;
                }).length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No products found.</div>
                ) : products.filter(p => {
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = (p.name || '').toLowerCase().includes(q) || (p.product_type || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
                    if (!matchesSearch) return false;
                  }
                  if (productStatusFilter === 'active') return p.is_visible;
                  if (productStatusFilter === 'inactive') return !p.is_visible;
                  return true;
                }).map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      backgroundColor: p.is_visible ? 'rgba(255,255,255,0.7)' : 'rgba(241,245,249,0.5)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: p.is_visible ? '1px solid rgba(167,243,208,0.3)' : '1px solid rgba(0,0,0,0.04)',
                      transition: 'all 0.25s ease',
                      opacity: p.is_visible ? 1 : 0.65
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      {/* Product thumbnail */}
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, background: '#f9f9f9'
                      }}>
                        <img
                          src={getPhotoUrlForProduct(p.id, p.image_url)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = p.image_url; }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {(p.product_type || 'product').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {p.base_price ? ` · ₹${Number(p.base_price).toFixed(2)}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggleProductVisibility(p)}
                      style={{
                        width: '50px',
                        height: '28px',
                        borderRadius: '14px',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: p.is_visible ? '#059669' : '#cbd5e1',
                        transition: 'background-color 0.3s ease',
                        padding: 0,
                        flexShrink: 0
                      }}
                      title={p.is_visible ? 'Click to hide from Print Lab' : 'Click to show in Print Lab'}
                    >
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        position: 'absolute',
                        top: '3px',
                        left: p.is_visible ? '25px' : '3px',
                        transition: 'left 0.3s ease'
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : activeViewTab === 'sales' ? (
            <div className="store-dashboard-content">

              {/* ── SCREEN 1: Campaign cards (when no campaign selected) ── */}
              {!selectedCampaign && (
                <>
                  <div className="store-dashboard-header-row" style={{ marginBottom: '8px' }}>
                    <div>
                      <h1 className="store-dashboard-title" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111', margin: 0 }}>Sales Automation</h1>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                    The Sales Automations are ready-to-go marketing strategies to help you save time and increase sales.<br />
                    Check out our best sellers recommended for you:
                  </p>

                  {/* Campaign cards grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                    {campaigns.map(campaign => (
                      <div
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign.id)}
                        style={{ cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', transition: 'box-shadow 0.2s', backgroundColor: '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                      >
                        {/* Card image area */}
                        <div style={{ width: '100%', height: '160px', backgroundColor: campaign.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px' }}>
                          {campaign.icon}
                        </div>
                        {/* Card label */}
                        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{campaign.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── SCREEN 2: Campaign detail page ── */}
              {selectedCampaign && (() => {
                const campaign = campaigns.find(c => c.id === selectedCampaign);
                if (!campaign) return null;
                return (
                  <div style={{ maxWidth: '960px', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#1a1a1a', padding: '0 12px 60px' }}>
                    
                    {/* Breadcrumb + Save */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedCampaign(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}
                        >AUTOMATION</button>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>/</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{campaign.label.toUpperCase()}</span>
                        <span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '6px', cursor: 'pointer' }}>···</span>
                      </div>
                      <button
                        onClick={() => {
                          setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...campaign } : c));
                          setSelectedCampaign(null);
                        }}
                        style={{ padding: '10px 32px', fontSize: '11px', fontWeight: 700, border: 'none', borderRadius: '2px', backgroundColor: '#e5e5e5', color: '#555', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#d8d8d8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                      >SAVE</button>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 36px 0', lineHeight: 1.7, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '36px' }}>
                      {campaign.description}
                    </p>

                    {/* Settings rows container */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>

                      {/* Row 1: Campaign Language */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Campaign Language</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Choose the language for the campaign emails and banners.</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                          <span style={{ fontSize: '14px', color: '#b5b5b5', cursor: 'pointer' }}>✎</span>
                          <div style={{ backgroundColor: '#f5eee6', padding: '16px 36px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.03)', color: '#2c2c2d', fontSize: '13px', fontWeight: 600, fontFamily: "'Georgia', 'Playfair Display', serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            English
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Number of Years App will Repeat */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #2c2c2d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2c2c2d' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Number of Years App will Repeat</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>The duration of time in which this app will be active for each project. The app will send out an anniversary promotion each year during this time.</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, color: '#2c2c2d', fontSize: '13px', fontWeight: 600 }}>
                          <span>✓ &nbsp;{campaign.yearsRepeat} years</span>
                          <span style={{ color: '#b5b5b5', cursor: 'pointer', fontSize: '14px', marginLeft: '6px' }}>✎</span>
                        </div>
                      </div>

                      {/* Row 3: Campaign Start Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Campaign Start Date</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Set the number of days/months the campaign will start <strong>before</strong> the one-year anniversary of the Gallery Date (configured in the "Name &amp; Cover" section of the gallery).</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, color: '#2c2c2d', fontSize: '13px', fontWeight: 600 }}>
                          <span style={{ color: '#b5b5b5', cursor: 'pointer', fontSize: '14px', marginRight: '6px' }}>✎</span>
                          <span>{campaign.startDays} days</span>
                        </div>
                      </div>

                      {/* Row 4: Campaign Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Campaign Duration</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Set the duration of the campaign from the campaign start date.</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, color: '#2c2c2d', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                          <span style={{ color: '#b5b5b5', cursor: 'pointer', fontSize: '14px', marginRight: '4px' }}>✎</span>
                          <div>
                            <div>{campaign.durationDays} days</div>
                            <div style={{ fontSize: '10.5px', color: '#888', fontWeight: 400, marginTop: '2px' }}>Adjust time to 11:59PM</div>
                          </div>
                        </div>
                      </div>

                      {/* Row 5: Discount */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Discount</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Set up the discount offered to gallery visitors while the campaign is active.</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, color: '#2c2c2d', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                          <span style={{ color: '#b5b5b5', cursor: 'pointer', fontSize: '14px', marginRight: '4px' }}>✎</span>
                          <div>
                            <div>{campaign.discount}% off</div>
                            <div style={{ fontSize: '11px', color: '#666', fontWeight: 400, marginTop: '2px' }}>Code: {campaign.discountCode}</div>
                            <div style={{ fontSize: '11px', color: '#666', fontWeight: 400 }}>{campaign.discount}% OFF</div>
                          </div>
                        </div>
                      </div>

                      {/* Row 6: Banners — Premium Thumbnail Cards */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: '0 0 240px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Banners</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Modify the banners that will be visible to gallery visitors once the campaign is live. Banners are only visible to the gallery visitors relevant to the campaign.</div>
                          </div>
                        </div>

                        {/* Banner preview grid */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                          {[
                            {
                              key: 'text_banner',
                              label: 'Text Banner',
                              enabled: campaign.banners.text_banner.enabled,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f2f2f2' }}>
                                  <div style={{ height: '12px', backgroundColor: campaign.banners.text_banner.bg_color || '#4a5338' }} />
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px', gap: '4px' }}>
                                    <div style={{ width: '35%', height: '4px', backgroundColor: '#e2e2e2', borderRadius: '1px' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                      {[1, 2, 3].map(i => <div key={i} style={{ height: '16px', backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />)}
                                    </div>
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'large_banner',
                              label: 'Large Banner',
                              enabled: campaign.banners.large_banner.enabled,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f2f2f2' }}>
                                  <div style={{ height: '24px', backgroundColor: campaign.banners.large_banner.bg_color || '#cbbca3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '40%', height: '4px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
                                  </div>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px', gap: '4px' }}>
                                    <div style={{ width: '35%', height: '4px', backgroundColor: '#e2e2e2', borderRadius: '1px' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                      {[1, 2, 3].map(i => <div key={i} style={{ height: '12px', backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />)}
                                    </div>
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'photo_banner',
                              label: 'Photo Banner',
                              enabled: campaign.banners.photo_banner.enabled,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f2f2f2' }}>
                                  <div style={{ height: '24px', backgroundColor: '#e4dec9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0 4px', backgroundImage: campaign.banners.photo_banner.desktop_image ? `url(${campaign.banners.photo_banner.desktop_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '1px' }} />
                                    <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '1px' }} />
                                  </div>
                                  <div style={{ flex: 1, display: 'flex', padding: '6px', gap: '4px' }}>
                                    <div style={{ flex: 1, backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />
                                    <div style={{ flex: 1, backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'product_row',
                              label: 'Product Row',
                              enabled: false,
                              isPlus: true,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', color: '#cccccc', fontSize: '22px', fontWeight: 300 }}>+</div>
                              )
                            },
                            {
                              key: 'store_rotator',
                              label: 'Store Rotator',
                              enabled: false,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f2f2f2' }}>
                                  <div style={{ height: '16px', backgroundColor: '#dfdcd6', borderRadius: '1px', margin: '4px 4px 0' }} />
                                  <div style={{ flex: 1, display: 'flex', padding: '4px 6px', gap: '4px' }}>
                                    <div style={{ flex: 1, backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />
                                    <div style={{ flex: 1, backgroundColor: '#e2e2e2', borderRadius: '1.5px' }} />
                                  </div>
                                </div>
                              )
                            }
                          ].map(item => (
                            <div
                              key={item.key}
                              onClick={() => {
                                if (item.isPlus) return;
                                setSelectedAutomation({ ...campaign.banners[item.key], _campaignId: campaign.id, _bannerKey: item.key });
                                setActiveModal(item.key);
                              }}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: item.isPlus ? 'default' : 'pointer' }}
                            >
                              <div style={{
                                width: '84px', height: '62px',
                                border: item.enabled ? '2.5px solid #2c2c2d' : '1px solid #e2e8f0',
                                borderRadius: '4px', overflow: 'hidden', position: 'relative',
                                opacity: item.enabled ? 1 : 0.65,
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                              }}>
                                {item.thumb}
                                {item.enabled && (
                                  <div style={{ position: 'absolute', top: '3px', left: '3px', width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#2c2c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900 }}>✓</span>
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: item.enabled ? '#2c2c2d' : '#888', fontWeight: item.enabled ? 600 : 400 }}>
                                {item.enabled && <span style={{ marginRight: '2px' }}>✓ </span>}{item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Row 7: Main Clients Emails */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 0', gap: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: '0 0 240px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', backgroundColor: '#fff' }}>
                            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700 }}>✓</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' }}>Main Clients Emails</div>
                            <div style={{ fontSize: '12px', color: '#747474', lineHeight: 1.5 }}>Modify the emails which will be sent to the main client during this campaign. The "Announcement" email will be sent on the start date of the campaign.</div>
                          </div>
                        </div>

                        {/* Email preview grid */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                          {[
                            {
                              key: 'announcement',
                              label: 'Announcement',
                              enabled: true,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', padding: '6px', boxSizing: 'border-box' }}>
                                  <div style={{ flex: 1, border: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '4px', gap: '4px' }}>
                                    <div style={{ height: '14px', backgroundColor: '#e6ded3', borderRadius: '1px' }} />
                                    <div style={{ width: '60%', height: '4px', backgroundColor: '#efefef', borderRadius: '0.5px' }} />
                                    <div style={{ width: '40%', height: '4px', backgroundColor: '#efefef', borderRadius: '0.5px' }} />
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'reminder_1',
                              label: 'Reminder 1 Week',
                              enabled: false,
                              isPlus: true,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', color: '#cccccc', fontSize: '22px', fontWeight: 300 }}>+</div>
                              )
                            },
                            {
                              key: 'reminder_3',
                              label: 'Reminder 3 Days',
                              enabled: true,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', padding: '6px', boxSizing: 'border-box' }}>
                                  <div style={{ flex: 1, border: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '4px', gap: '4px' }}>
                                    <div style={{ height: '14px', backgroundColor: '#e2dacf', borderRadius: '1px' }} />
                                    <div style={{ width: '50%', height: '4px', backgroundColor: '#efefef', borderRadius: '0.5px' }} />
                                    <div style={{ width: '30%', height: '4px', backgroundColor: '#efefef', borderRadius: '0.5px' }} />
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'reminder_1d',
                              label: 'Reminder 1 Day',
                              enabled: false,
                              isPlus: true,
                              thumb: (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', color: '#cccccc', fontSize: '22px', fontWeight: 300 }}>+</div>
                              )
                            }
                          ].map(item => (
                            <div
                              key={item.key}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                            >
                              <div style={{
                                width: '64px', height: '80px',
                                border: item.enabled ? '2.5px solid #2c2c2d' : '1px solid #e2e8f0',
                                borderRadius: '4px', overflow: 'hidden', position: 'relative',
                                opacity: item.enabled ? 1 : 0.65,
                                boxSizing: 'border-box',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}>
                                {item.thumb}
                                {item.enabled && (
                                  <div style={{ position: 'absolute', top: '3px', left: '3px', width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#2c2c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900 }}>✓</span>
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: item.enabled ? '#2c2c2d' : '#888', fontWeight: item.enabled ? 600 : 400 }}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
              {/* ─── AUTOMATION MODAL ─── */}
              {/* ─── AUTOMATION MODAL ─── */}
              {activeModal && selectedAutomation && (
                <div
                  style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px'
                  }}
                  onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                >
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '0px',
                    width: '100%',
                    maxWidth: '1024px',
                    height: '80vh',
                    maxHeight: '700px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    border: '1px solid #dcdcdc'
                  }}>
                    {/* Modal Header */}
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f1f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#2c2c2d', letterSpacing: '0.12em', fontFamily: "'Inter', sans-serif" }}>
                          {activeModal === 'text_banner' ? 'TEXT BANNER' : activeModal === 'large_banner' ? 'LARGE BANNER' : 'PHOTO BANNER'}
                        </span>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          border: '1px solid #d1d5db', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', color: '#94a3b8', cursor: 'pointer',
                          position: 'relative', top: '0px'
                        }}>?</div>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            const { _campaignId, _bannerKey, ...bannerData } = selectedAutomation;
                            setCampaigns(prev => prev.map(c => c.id === _campaignId
                              ? { ...c, banners: { ...c.banners, [_bannerKey]: { ...bannerData, enabled: true } } }
                              : c
                            ));
                            setActiveModal(null);
                          }}
                          style={{ padding: '10px 36px', fontSize: '11px', fontWeight: 700, border: 'none', borderRadius: '2px', backgroundColor: '#efefef', color: '#2c2c2d', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'background-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#efefef'}
                        >APPLY</button>
                      </div>
                    </div>

                    {/* Body: left fields + right preview side by side */}
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                      {/* LEFT PANEL */}
                      <div style={{ width: '380px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #eaeaea', padding: '32px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

                        {/* TEXT BANNER fields */}
                        {activeModal === 'text_banner' && (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#a0a0a0', letterSpacing: '0.1em', marginBottom: '8px' }}>BANNER TITLE</label>
                            <textarea
                              value={selectedAutomation.text || ''}
                              onChange={e => setSelectedAutomation(prev => ({ ...prev, text: e.target.value }))}
                              rows={2}
                              style={{ width: '100%', padding: '12px 14px', border: '1px solid #dcdcdc', borderRadius: '2px', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#2c2c2d', lineHeight: 1.5 }}
                            />

                            {/* Background color swatch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px' }}>
                              <div style={{ position: 'relative', width: '26px', height: '26px', border: '1px solid #c8c8c8', cursor: 'pointer', backgroundColor: selectedAutomation.bg_color || '#4a5338', flexShrink: 0 }}>
                                <input
                                  type="color"
                                  value={selectedAutomation.bg_color || '#4a5338'}
                                  onChange={e => setSelectedAutomation(prev => ({ ...prev, bg_color: e.target.value }))}
                                  style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                />
                              </div>
                              <span style={{ fontSize: '13px', color: '#4a4a4a' }}>Background color</span>
                            </div>

                            {/* Text color swatch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                              <div style={{ position: 'relative', width: '26px', height: '26px', border: '1px solid #c8c8c8', cursor: 'pointer', backgroundColor: selectedAutomation.text_color || '#ffffff', flexShrink: 0 }}>
                                <input
                                  type="color"
                                  value={selectedAutomation.text_color || '#ffffff'}
                                  onChange={e => setSelectedAutomation(prev => ({ ...prev, text_color: e.target.value }))}
                                  style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                />
                              </div>
                              <span style={{ fontSize: '13px', color: '#4a4a4a' }}>Text color</span>
                            </div>
                          </div>
                        )}

                        {/* LARGE BANNER fields */}
                        {activeModal === 'large_banner' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Change Design button */}
                            <button style={{ width: '100%', padding: '12px', fontSize: '11px', fontWeight: 700, border: 'none', borderRadius: '2px', backgroundColor: '#efefef', color: '#2c2c2d', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              CHANGE DESIGN
                            </button>

                            {/* Content / Style tabs inside left panel */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #eaeaea', marginBottom: '10px' }}>
                              <button
                                onClick={() => setAutomationModalTab('content')}
                                style={{
                                  flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 600,
                                  color: automationModalTab === 'content' ? '#111' : '#b5b5b5',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  borderBottom: automationModalTab === 'content' ? '2.5px solid #111' : '2.5px solid transparent',
                                  transition: 'all 0.2s'
                                }}
                              >Content</button>
                              <button
                                onClick={() => setAutomationModalTab('style')}
                                style={{
                                  flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 600,
                                  color: automationModalTab === 'style' ? '#111' : '#b5b5b5',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  borderBottom: automationModalTab === 'style' ? '2.5px solid #111' : '2.5px solid transparent',
                                  transition: 'all 0.2s'
                                }}
                              >Style</button>
                            </div>

                            {/* TAB: CONTENT */}
                            {automationModalTab === 'content' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                  { key: 'title', label: 'HEADER TEXT', placeholder: 'Relive It in Print' },
                                  { key: 'subtitle', label: 'BODY TEXT', placeholder: 'Get these moments off the screen...' },
                                  { key: 'code', label: 'CODE', placeholder: 'Code: {code}' },
                                  { key: 'cta', label: 'BUTTON TEXT', placeholder: 'VISIT SHOP' }
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key}>
                                    <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#a0a0a0', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</label>
                                    <input
                                      type="text"
                                      value={selectedAutomation[key] || ''}
                                      onChange={e => setSelectedAutomation(prev => ({ ...prev, [key]: e.target.value }))}
                                      placeholder={placeholder}
                                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #dcdcdc', borderRadius: '2px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#2c2c2d' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* TAB: STYLE */}
                            {automationModalTab === 'style' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                
                                {/* Custom Desktop image box */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '2px', backgroundColor: '#fafafa' }}>
                                    <div>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>Custom Desktop image</div>
                                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>3000x705px</div>
                                      <div style={{ fontSize: '12px', color: '#b5b5b5', cursor: 'pointer', marginTop: '6px' }} onClick={() => { const u = prompt('Enter Desktop Image URL:', selectedAutomation.desktop_image); if (u !== null) setSelectedAutomation(prev => ({ ...prev, desktop_image: u.trim() })); }}>✎</div>
                                    </div>
                                    <div
                                      onClick={() => { const u = prompt('Enter Desktop Image URL:'); if (u) setSelectedAutomation(prev => ({ ...prev, desktop_image: u.trim() })); }}
                                      style={{ width: '80px', height: '60px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', backgroundColor: '#fff', backgroundImage: selectedAutomation.desktop_image ? `url(${selectedAutomation.desktop_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    >
                                      {!selectedAutomation.desktop_image && '+'}
                                    </div>
                                  </div>
                                </div>

                                {/* Custom Mobile image box */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '2px', backgroundColor: '#fafafa' }}>
                                    <div>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>Custom Mobile image</div>
                                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>1000x1065px</div>
                                      <div style={{ fontSize: '12px', color: '#b5b5b5', cursor: 'pointer', marginTop: '6px' }} onClick={() => { const u = prompt('Enter Mobile Image URL:', selectedAutomation.mobile_image); if (u !== null) setSelectedAutomation(prev => ({ ...prev, mobile_image: u.trim() })); }}>✎</div>
                                    </div>
                                    <div
                                      onClick={() => { const u = prompt('Enter Mobile Image URL:'); if (u) setSelectedAutomation(prev => ({ ...prev, mobile_image: u.trim() })); }}
                                      style={{ width: '80px', height: '60px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', backgroundColor: '#fff', backgroundImage: selectedAutomation.mobile_image ? `url(${selectedAutomation.mobile_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    >
                                      {!selectedAutomation.mobile_image && '+'}
                                    </div>
                                  </div>
                                </div>

                                {/* Font Selector dropdown */}
                                <div>
                                  <select
                                    value={selectedAutomation.font || 'Playfair Display'}
                                    onChange={e => setSelectedAutomation(prev => ({ ...prev, font: e.target.value }))}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #dcdcdc', borderRadius: '2px', fontSize: '13px', backgroundColor: '#fff', color: '#2c2c2d', outline: 'none' }}
                                  >
                                    <option value="Playfair Display">Serif New</option>
                                    <option value="Inter">Sans Modern</option>
                                    <option value="Georgia">Georgia (Classic)</option>
                                  </select>
                                </div>

                                {/* Color Swatches */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                                  {/* Swatch 1: Background + Button text */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ position: 'relative', width: '26px', height: '26px', border: '1px solid #c8c8c8', cursor: 'pointer', backgroundColor: selectedAutomation.bg_color || '#eae5d8', flexShrink: 0 }}>
                                      <input
                                        type="color"
                                        value={selectedAutomation.bg_color || '#eae5d8'}
                                        onChange={e => setSelectedAutomation(prev => ({ ...prev, bg_color: e.target.value }))}
                                        style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#4a4a4a' }}>Background + Button text</span>
                                  </div>

                                  {/* Swatch 2: Body */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ position: 'relative', width: '26px', height: '26px', border: '1px solid #c8c8c8', cursor: 'pointer', backgroundColor: selectedAutomation.subtitle_color || '#4a5a4b', flexShrink: 0 }}>
                                      <input
                                        type="color"
                                        value={selectedAutomation.subtitle_color || '#4a5a4b'}
                                        onChange={e => setSelectedAutomation(prev => ({ ...prev, subtitle_color: e.target.value }))}
                                        style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#4a4a4a' }}>Body</span>
                                  </div>

                                  {/* Swatch 3: Title + Button */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ position: 'relative', width: '26px', height: '26px', border: '1px solid #c8c8c8', cursor: 'pointer', backgroundColor: selectedAutomation.cta_bg || '#3a4a38', flexShrink: 0 }}>
                                      <input
                                        type="color"
                                        value={selectedAutomation.cta_bg || '#3a4a38'}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setSelectedAutomation(prev => ({ ...prev, cta_bg: val, title_color: val }));
                                        }}
                                        style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#4a4a4a' }}>Title + Button</span>
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        )}

                        {/* PHOTO BANNER fields */}
                        {activeModal === 'photo_banner' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>HEADER TEXT</label>
                              <input type="text" value={selectedAutomation.title || ''} onChange={e => setSelectedAutomation(prev => ({ ...prev, title: e.target.value }))} placeholder="One Year Anniversary" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>DESKTOP PHOTO URL</label>
                              <input type="text" value={selectedAutomation.desktop_image || ''} onChange={e => setSelectedAutomation(prev => ({ ...prev, desktop_image: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>MOBILE PHOTO URL</label>
                              <input type="text" value={selectedAutomation.mobile_image || ''} onChange={e => setSelectedAutomation(prev => ({ ...prev, mobile_image: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                        )}

                      </div>{/* /left panel */}

                      {/* RIGHT PANEL — live previews */}
                      <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
                        
                        {/* Desktop mockup */}
                        <div style={{ width: '100%', maxWidth: '520px', border: '1px solid #dcdcdc', borderRadius: '2px', overflow: 'hidden', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          {/* Browser bar */}
                          <div style={{ height: '32px', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <div style={{ width: '14px', height: '4px', backgroundColor: '#e2e2e2' }} />
                              <div style={{ width: '24px', height: '4px', backgroundColor: '#e2e2e2' }} />
                              <div style={{ width: '24px', height: '4px', backgroundColor: '#e2e2e2' }} />
                            </div>
                            <div style={{ width: '42px', height: '4px', backgroundColor: '#333' }} />
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <div style={{ width: '8px', height: '8px', border: '1px solid #c8c8c8', borderRadius: '50%' }} />
                              <div style={{ width: '8px', height: '8px', border: '1px solid #c8c8c8', borderRadius: '50%' }} />
                            </div>
                          </div>

                          {/* Desktop Banner area */}
                          {activeModal === 'text_banner' && (
                            <div style={{ backgroundColor: selectedAutomation.bg_color || '#4a5338', color: selectedAutomation.text_color || '#ffffff', padding: '14px 20px', fontSize: '10px', textAlign: 'center', fontWeight: 500, fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em', lineHeight: 1.4 }}>
                              {selectedAutomation.text || 'Happy anniversary! Enjoy {discount-value} off print products, valid thru {exp-date} | Enter {code} at checkout'}
                            </div>
                          )}
                          {activeModal === 'large_banner' && (
                            <div style={{
                              height: '110px',
                              backgroundColor: selectedAutomation.bg_color || '#eae5d8',
                              backgroundImage: selectedAutomation.desktop_image ? `url(${selectedAutomation.desktop_image})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '16px 24px',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: selectedAutomation.title_color || '#2c3e2d',
                                  fontFamily: selectedAutomation.font === 'Inter' ? "'Inter', sans-serif" : selectedAutomation.font === 'Georgia' ? "'Georgia', serif" : "'Playfair Display', serif"
                                }}>{selectedAutomation.title || 'Relive It in Print'}</div>
                                <div style={{ fontSize: '8px', color: selectedAutomation.subtitle_color || '#4a5a4b', maxWidth: '170px', lineHeight: 1.3 }}>{selectedAutomation.subtitle || 'Get these moments off the screen and into your hands with {discount-value} off, thru {exp-date}.'}</div>
                                <div style={{ fontSize: '8px', color: selectedAutomation.subtitle_color || '#4a5a4b', fontWeight: 600 }}>{selectedAutomation.code || 'Code: {code}'}</div>
                                {selectedAutomation.cta && (
                                  <button style={{
                                    marginTop: '4px', padding: '4px 14px', fontSize: '8.5px', fontWeight: 700,
                                    backgroundColor: selectedAutomation.cta_bg || '#3a4a38',
                                    color: selectedAutomation.bg_color || '#ffffff',
                                    border: 'none', borderRadius: '1px', cursor: 'default', textTransform: 'uppercase', letterSpacing: '0.06em'
                                  }}>{selectedAutomation.cta}</button>
                                )}
                              </div>
                              {/* Bouquet illustration */}
                              <svg viewBox="0 0 100 100" style={{ width: '48px', height: '48px', marginRight: '16px', flexShrink: 0 }}>
                                <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="2" strokeLinecap="round" />
                                <path d="M48 66 L50 44" stroke="#5d6050" strokeWidth="2" strokeLinecap="round" />
                                <path d="M54 66 L50 46" stroke="#5d6050" strokeWidth="2" strokeLinecap="round" />
                                <path d="M44 58 Q48 60 52 58" fill="none" stroke="#8c8d82" strokeWidth="1.5" />
                                <path d="M45 59 L40 70" stroke="#8c8d82" strokeWidth="1" />
                                <path d="M51 59 L56 70" stroke="#8c8d82" strokeWidth="1" />
                                <path d="M35 44 Q42 42 43 36 Q38 39 35 44" fill="#7a806c" />
                                <path d="M61 44 Q54 42 53 36 Q58 39 61 44" fill="#7a806c" />
                                <circle cx="48" cy="32" r="6" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="48" cy="32" r="2" fill="#e5ded3" />
                                <circle cx="40" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="40" cy="39" r="1.5" fill="#e5ded3" />
                                <circle cx="56" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="56" cy="39" r="1.5" fill="#e5ded3" />
                                <circle cx="48" cy="42" r="4.5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="48" cy="42" r="1.2" fill="#e5ded3" />
                                <circle cx="34" cy="33" r="2" fill="#ffffff" />
                                <circle cx="62" cy="33" r="2" fill="#ffffff" />
                                <circle cx="44" cy="26" r="1.5" fill="#ffffff" />
                                <circle cx="52" cy="26" r="1.5" fill="#ffffff" />
                              </svg>
                            </div>
                          )}
                          {activeModal === 'photo_banner' && (
                            <div style={{ height: '90px', backgroundColor: selectedAutomation.bg_color || '#d4c9b5', backgroundImage: selectedAutomation.desktop_image ? `url(${selectedAutomation.desktop_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{selectedAutomation.title || 'One Year Anniversary'}</div>
                            </div>
                          )}

                          {/* Desktop Scene Label */}
                          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, fontFamily: "'Georgia', 'Playfair Display', serif", color: '#2c2c2d', letterSpacing: '0.12em' }}>SCENE NAME</div>
                          </div>

                          {/* Desktop Mock grids */}
                          <div style={{ padding: '0 16px 24px', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px' }}>
                            <div style={{ gridColumn: 'span 8', height: '110px', backgroundColor: '#f0f0f0' }} />
                            <div style={{ gridColumn: 'span 4', height: '110px', backgroundColor: '#f0f0f0' }} />
                            <div style={{ gridColumn: 'span 12', height: '36px', backgroundColor: '#f5f5f5', marginTop: '4px' }} />
                          </div>
                        </div>

                        {/* Mobile mockup overlapping */}
                        <div style={{
                          position: 'absolute',
                          right: '60px',
                          bottom: '30px',
                          width: '180px',
                          border: '1px solid #a0a0a0',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                          zIndex: 10,
                          boxSizing: 'border-box'
                        }}>
                          {/* Mobile header */}
                          <div style={{ height: '28px', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea' }}>
                            {/* Menu icon (3 lines) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '10px' }}>
                              <div style={{ height: '1px', backgroundColor: '#c8c8c8' }} />
                              <div style={{ height: '1px', backgroundColor: '#c8c8c8' }} />
                              <div style={{ height: '1px', backgroundColor: '#c8c8c8' }} />
                            </div>
                            <div style={{ width: '6px', height: '6px', border: '1px solid #c8c8c8', borderRadius: '50%' }} />
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <div style={{ width: '12px', height: '3px', backgroundColor: '#e2e2e2' }} />
                              <div style={{ width: '12px', height: '3px', backgroundColor: '#e2e2e2' }} />
                            </div>
                          </div>

                          {/* Mobile Banner area */}
                          {activeModal === 'text_banner' && (
                            <div style={{ backgroundColor: selectedAutomation.bg_color || '#4a5338', color: selectedAutomation.text_color || '#ffffff', padding: '12px 14px', fontSize: '9px', textAlign: 'center', fontWeight: 500, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em', lineHeight: 1.4 }}>
                              {selectedAutomation.text || 'Happy anniversary! Enjoy {discount-value} off print products, valid thru {exp-date} | Enter {code} at checkout'}
                            </div>
                          )}
                          {activeModal === 'large_banner' && (
                            <div style={{
                              backgroundColor: selectedAutomation.bg_color || '#eae5d8',
                              backgroundImage: selectedAutomation.mobile_image ? `url(${selectedAutomation.mobile_image})` : selectedAutomation.desktop_image ? `url(${selectedAutomation.desktop_image})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '12px 10px',
                              gap: '3px',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: selectedAutomation.title_color || '#2c3e2d',
                                fontFamily: selectedAutomation.font === 'Inter' ? "'Inter', sans-serif" : selectedAutomation.font === 'Georgia' ? "'Georgia', serif" : "'Playfair Display', serif",
                                textAlign: 'center'
                              }}>{selectedAutomation.title || 'Relive It in Print'}</div>
                              <div style={{ fontSize: '6.5px', color: selectedAutomation.subtitle_color || '#4a5a4b', textAlign: 'center', lineHeight: 1.3, maxWidth: '140px' }}>{selectedAutomation.subtitle || 'Get these moments off the screen and into your hands with {discount-value} off, thru {exp-date}.'}</div>
                              <div style={{ fontSize: '6.5px', color: selectedAutomation.subtitle_color || '#4a5a4b', fontWeight: 600, textAlign: 'center' }}>{selectedAutomation.code || 'Code: {code}'}</div>
                              {selectedAutomation.cta && (
                                <button style={{
                                  marginTop: '2px', padding: '3px 12px', fontSize: '6.5px', fontWeight: 700,
                                  backgroundColor: selectedAutomation.cta_bg || '#3a4a38',
                                  color: selectedAutomation.bg_color || '#ffffff',
                                  border: 'none', borderRadius: '1px', cursor: 'default', textTransform: 'uppercase', letterSpacing: '0.06em'
                                }}>{selectedAutomation.cta}</button>
                              )}
                              {/* Bouquet centered below button in mobile */}
                              <svg viewBox="0 0 100 100" style={{ width: '28px', height: '28px', marginTop: '2px' }}>
                                <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M48 66 L50 44" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M54 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M44 58 Q48 60 52 58" fill="none" stroke="#8c8d82" strokeWidth="1.5" />
                                <circle cx="48" cy="32" r="6" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="48" cy="32" r="2" fill="#e5ded3" />
                                <circle cx="40" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="40" cy="39" r="1.5" fill="#e5ded3" />
                                <circle cx="56" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
                                <circle cx="56" cy="39" r="1.5" fill="#e5ded3" />
                              </svg>
                            </div>
                          )}
                          {activeModal === 'photo_banner' && (
                            <div style={{ height: '60px', backgroundColor: selectedAutomation.bg_color || '#d4c9b5', backgroundImage: selectedAutomation.mobile_image ? `url(${selectedAutomation.mobile_image})` : selectedAutomation.desktop_image ? `url(${selectedAutomation.desktop_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: '8px', fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{selectedAutomation.title || 'One Year Anniversary'}</div>
                            </div>
                          )}

                          {/* Mobile Scene Label */}
                          <div style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 500, fontFamily: "'Georgia', 'Playfair Display', serif", color: '#2c2c2d', letterSpacing: '0.12em' }}>Scene Name</div>
                          </div>

                          {/* Mobile Mock Grids */}
                          <div style={{ padding: '0 10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ height: '54px', backgroundColor: '#f0f0f0' }} />
                            <div style={{ height: '54px', backgroundColor: '#f0f0f0' }} />
                            <div style={{ height: '54px', backgroundColor: '#f0f0f0' }} />
                            <div style={{ height: '54px', backgroundColor: '#f0f0f0' }} />
                          </div>
                        </div>

                      </div>{/* /right panel */}

                    </div>{/* /body */}
                  </div>{/* /modal card */}
                </div>
              )}{/* /modal overlay */}




            </div>
          ) : (
            <div className="store-dashboard-content">
              <div className="store-dashboard-header-row" style={{ marginBottom: '24px' }}>
                <div>
                  <h1 className="store-dashboard-title">Vault</h1>
                  <p className="store-dashboard-subtitle">Manage toggle states, gallery expiration, and storage extension plans.</p>
                </div>
              </div>

              {notification && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: 'rgba(236, 253, 245, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#059669',
                  border: `1px solid rgba(167, 243, 208, 0.4)`,
                  marginBottom: '20px'
                }}>
                  {notification.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Permanent Vault Plans Card */}
                <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                  <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#111' }}>Permanent Vault & Extension Plans</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Allow gallery visitors to pay to extend gallery access or unlock permanent lifetime storage (inspired by Pic-Time).</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => setGlobalVaultEnabled(prev => !prev)}
                        style={{
                          width: '50px',
                          height: '28px',
                          borderRadius: '14px',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          backgroundColor: globalVaultEnabled ? '#059669' : '#cbd5e1',
                          transition: 'background-color 0.3s ease',
                          padding: 0,
                          flexShrink: 0
                        }}
                      >
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          position: 'absolute',
                          top: '3px',
                          left: globalVaultEnabled ? '25px' : '3px',
                          transition: 'left 0.3s ease'
                        }} />
                      </button>
                      <div>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#111' }}>Enable Extension Plans</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Show purchase options to clients when their gallery is nearing expiration.</span>
                      </div>
                    </div>

                    {globalVaultEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#fcfbfa', border: '1px solid #f2ede4', borderRadius: '8px' }}>
                        {/* Price Inputs Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Lifetime Vault Price (₹) *
                            </label>
                            <input
                              type="text"
                              value={globalVaultPriceLifetime}
                              onChange={(e) => handleIntegerChange(e.target.value, setGlobalVaultPriceLifetime)}
                              placeholder="499"
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                            />
                          </div>
                        </div>

                        {/* Description Inputs Row (Compulsory) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #f2ede4', paddingTop: '16px', marginTop: '4px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Lifetime Vault Description (Compulsory) *
                            </label>
                            <input
                              type="text"
                              required
                              value={globalVaultDescLifetime}
                              onChange={(e) => setGlobalVaultDescLifetime(e.target.value)}
                              placeholder="Permanent lifetime storage access."
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={handleSaveStoreSettings}
                        disabled={savingStoreSettings}
                        style={{
                          padding: '12px 24px',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#111',
                          color: '#fff',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          opacity: savingStoreSettings ? 0.7 : 1,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        {savingStoreSettings ? 'Saving Settings...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
