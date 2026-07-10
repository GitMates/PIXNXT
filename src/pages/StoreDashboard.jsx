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
