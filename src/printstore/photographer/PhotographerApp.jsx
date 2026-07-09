import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { 
  Check, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Undo2, Download, History, AlertCircle, 
  TrendingUp, LogOut, Lock, Mail, ChevronDown, CheckCircle2, Eye, EyeOff,
  LayoutDashboard, DollarSign, Settings, X
} from 'lucide-react';
import { getShortId } from '../utils/idFormat';

const THEME_COLOR = '#005c5a'; // Noida Hub teal
const THEME_BG = '#eefaf9';

export default function PhotographerApp() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => {
    try {
      const cached = localStorage.getItem('pixnxt_photographer_session');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    if (email.trim().toLowerCase() === 'pg@gmail.com' && password === '123456') {
      const newSession = { email: 'pg@gmail.com', loggedInAt: new Date().toISOString() };
      localStorage.setItem('pixnxt_photographer_session', JSON.stringify(newSession));
      setSession(newSession);
      setLoginLoading(false);
    } else {
      setTimeout(() => {
        setLoginError('Invalid photographer email or password. Access denied.');
        setLoginLoading(false);
      }, 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pixnxt_photographer_session');
    setSession(null);
  };

  if (!session) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#fcfbf9',
        color: '#111111',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'europa', 'Inter', sans-serif"
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          padding: '48px 36px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04)',
          border: '1px solid #f2ede4',
          borderRadius: '4px'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              display: 'inline-flex',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: THEME_COLOR,
              color: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '16px',
              fontFamily: "'EB Garamond', serif"
            }}>
              P
            </div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 500, 
              margin: '0 0 8px 0', 
              color: '#111111',
              fontFamily: "'EB Garamond', 'Times New Roman', serif",
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Photographer Portal
            </h2>
            <p style={{ fontSize: '13px', color: '#777777', margin: 0, letterSpacing: '0.02em' }}>
              SIGN IN TO MANAGE BULK PRICING
            </p>
          </div>

          {loginError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#fff5f5',
              border: '1px solid #fed7d7',
              color: '#c53030',
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '24px',
              borderRadius: '3px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#111111', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.08em' }}>
                Photographer Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#777777" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="pg@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#111111',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#111111', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.08em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#777777" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#111111',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                backgroundColor: THEME_COLOR,
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: 'none',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                marginTop: '12px',
                borderRadius: '3px'
              }}
            >
              {loginLoading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <PhotographerPricingDashboard onLogout={handleLogout} photographerEmail={session.email} />;
}

function PhotographerPricingDashboard({ onLogout, photographerEmail }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [profitFilter, setProfitFilter] = useState('all');
  // Get initial tab from query parameter: 'pricing' by default, or 'dashboard', 'settings'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'pricing', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    return 'pricing';
  });
  
  // Bulk update options state
  const [updateMethod, setUpdateMethod] = useState('increase_pct');
  const [updateValue, setUpdateValue] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Individual price popup
  const [setPriceProduct, setSetPriceProduct] = useState(null);
  const [individualBasePrice, setIndividualBasePrice] = useState('');
  const [individualPrice, setIndividualPrice] = useState('');
  const [individualProfitPct, setIndividualProfitPct] = useState('');
  const [lastEditedField, setLastEditedField] = useState(null);

  // Live preview & confirmation states
  const [previewChanges, setPreviewChanges] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('printstore_products')
        .select('*');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = () => {
    try {
      const cached = localStorage.getItem('pixnxt_bulk_pricing_audit_logs');
      if (cached) {
        setAuditLogs(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Failed to load audit logs:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAuditLogs();
  }, []);

  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.product_type));
    return ['all', ...Array.from(list)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const frameId = getShortId(p.id, 'frame').toLowerCase();
        return p.name.toLowerCase().includes(q) || p.product_type.toLowerCase().includes(q) || frameId.includes(q);
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

    return list;
  }, [products, searchQuery, categoryFilter, profitFilter]);

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

  const handlePreview = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one product to perform a pricing update.");
      return;
    }

    let val = parseFloat(updateValue);
    if (updateMethod !== 'reset' && (isNaN(val) || val < 0)) {
      alert("Please enter a valid positive update number.");
      return;
    }

    const changes = selectedIds.map(id => {
      const p = products.find(prod => prod.id === id);
      const manufacturingCost = parseFloat(p.base_price);
      const oldProfitPct = parseFloat(p.options?.profit_percentage || 0);
      const oldSellingPrice = parseFloat(p.options?.selling_price || p.base_price);
      
      let newProfitPct = oldProfitPct;
      let newProfitAmount = parseFloat(p.options?.profit_amount || 0);
      let newSellingPrice = oldSellingPrice;

      if (updateMethod === 'increase_pct') {
        newProfitPct = oldProfitPct + val;
        newSellingPrice = manufacturingCost * (1 + newProfitPct / 100);
        newProfitAmount = newSellingPrice - manufacturingCost;
      } else if (updateMethod === 'decrease_pct') {
        newProfitPct = Math.max(0, oldProfitPct - val);
        newSellingPrice = manufacturingCost * (1 + newProfitPct / 100);
        newProfitAmount = newSellingPrice - manufacturingCost;
      } else if (updateMethod === 'set_pct') {
        newProfitPct = val;
        newSellingPrice = manufacturingCost * (1 + newProfitPct / 100);
        newProfitAmount = newSellingPrice - manufacturingCost;
      } else if (updateMethod === 'set_amount') {
        newProfitAmount = val;
        newSellingPrice = manufacturingCost + newProfitAmount;
        newProfitPct = (newProfitAmount / manufacturingCost) * 100;
      } else if (updateMethod === 'reset') {
        newProfitPct = 0;
        newProfitAmount = 0;
        newSellingPrice = manufacturingCost;
      }

      return {
        product_id: p.id,
        name: p.name,
        cost: manufacturingCost,
        oldProfitPct,
        newProfitPct,
        oldPrice: oldSellingPrice,
        newPrice: newSellingPrice,
        newProfitAmount,
        diff: newSellingPrice - oldSellingPrice
      };
    });

    setPreviewChanges(changes);
    setShowBulkModal(false);
  };

  const handleSaveChanges = async () => {
    if (!previewChanges) return;
    setIsSaving(true);
    
    try {
      const timestamp = new Date().toISOString();
      const updatedProductsLogs = [];

      for (const change of previewChanges) {
        const originalProduct = products.find(p => p.id === change.product_id);
        const newOptions = {
          ...(originalProduct.options || {}),
          selling_price: parseFloat(change.newPrice.toFixed(2)),
          profit_percentage: parseFloat(change.newProfitPct.toFixed(2)),
          profit_amount: parseFloat(change.newProfitAmount.toFixed(2)),
          last_updated: timestamp,
          updated_by: photographerEmail
        };

        const { error } = await supabase
          .from('printstore_products')
          .update({ options: newOptions })
          .eq('id', change.product_id);

        if (error) throw error;

        updatedProductsLogs.push({
          id: change.product_id,
          name: change.name,
          old_profit_pct: change.oldProfitPct,
          new_profit_pct: change.newProfitPct,
          old_selling_price: change.oldPrice,
          new_selling_price: change.newPrice
        });
      }

      const auditLog = {
        photographer_id: photographerEmail,
        updated_products: updatedProductsLogs,
        previous_profit_pct: parseFloat(previewChanges[0].oldProfitPct.toFixed(2)),
        new_profit_pct: parseFloat(previewChanges[0].newProfitPct.toFixed(2)),
        previous_selling_price: parseFloat(previewChanges[0].oldPrice.toFixed(2)),
        new_selling_price: parseFloat(previewChanges[0].newPrice.toFixed(2)),
        updated_by: photographerEmail,
        created_at: timestamp
      };

      // Save audit log to localStorage
      {
        const localLog = { id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6), ...auditLog };
        const currentLogs = JSON.parse(localStorage.getItem('pixnxt_bulk_pricing_audit_logs') || '[]');
        const updatedLogs = [localLog, ...currentLogs];
        localStorage.setItem('pixnxt_bulk_pricing_audit_logs', JSON.stringify(updatedLogs));
        setAuditLogs(updatedLogs);
      }

      setNotification({ type: 'success', text: `✓ ${previewChanges.length} Products Updated Successfully` });
      setPreviewChanges(null);
      setShowConfirmDialog(false);
      setSelectedIds([]);
      setUpdateValue('');
      
      await fetchProducts();
      await fetchAuditLogs();
      
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error saving bulk price edits:", err);
      setNotification({ type: 'error', text: 'Unable to update products. Please try again.' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndoLast = async () => {
    if (auditLogs.length === 0) {
      alert("No pricing updates found in the history to undo.");
      return;
    }
    const lastLog = auditLogs[0];
    const confirmUndo = window.confirm(`Are you sure you want to undo the last pricing update completed on ${new Date(lastLog.created_at).toLocaleDateString()}? This will restore previous prices for ${lastLog.updated_products.length} products.`);
    if (!confirmUndo) return;

    setLoading(true);
    try {
      const timestamp = new Date().toISOString();
      for (const logItem of lastLog.updated_products) {
        const prod = products.find(p => p.id === logItem.id);
        if (!prod) continue;
        
        const manufacturingCost = parseFloat(prod.base_price);
        const restoredPrice = parseFloat(logItem.old_selling_price);
        const restoredPct = parseFloat(logItem.old_profit_pct);
        const restoredProfitAmount = restoredPrice - manufacturingCost;

        const restoredOptions = {
          ...(prod.options || {}),
          selling_price: restoredPrice,
          profit_percentage: restoredPct,
          profit_amount: restoredProfitAmount,
          last_updated: timestamp,
          updated_by: photographerEmail
        };

        await supabase
          .from('printstore_products')
          .update({ options: restoredOptions })
          .eq('id', logItem.id);
      }

      try {
        if (lastLog.id && !lastLog.id.startsWith('audit_')) {
          await supabase.from('printstore_pricing_audit_logs').delete().eq('id', lastLog.id);
        }
      } catch (e) {}
      
      const updatedLocalLogs = auditLogs.filter(log => log.id !== lastLog.id);
      localStorage.setItem('pixnxt_bulk_pricing_audit_logs', JSON.stringify(updatedLocalLogs));
      setAuditLogs(updatedLocalLogs);

      setNotification({ type: 'success', text: '✓ Last pricing update successfully reverted!' });
      await fetchProducts();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert("Undo failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromLog = async (logEntry) => {
    const confirmRestore = window.confirm(`Restore pricing setup from history completed by ${logEntry.updated_by}?`);
    if (!confirmRestore) return;

    setLoading(true);
    try {
      const timestamp = new Date().toISOString();
      for (const logItem of logEntry.updated_products) {
        const prod = products.find(p => p.id === logItem.id);
        if (!prod) continue;

        const restoredPrice = parseFloat(logItem.new_selling_price);
        const restoredPct = parseFloat(logItem.new_profit_pct);
        const restoredProfitAmount = restoredPrice - parseFloat(prod.base_price);

        const restoredOptions = {
          ...(prod.options || {}),
          selling_price: restoredPrice,
          profit_percentage: restoredPct,
          profit_amount: restoredProfitAmount,
          last_updated: timestamp,
          updated_by: photographerEmail
        };

        await supabase
          .from('printstore_products')
          .update({ options: restoredOptions })
          .eq('id', logItem.id);
      }
      
      setShowHistoryModal(false);
      setNotification({ type: 'success', text: '✓ Reverted pricing setup to historical version!' });
      await fetchProducts();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert("Restore failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let headers = ['Frame ID', 'Product Name', 'Manufacturing Cost (INR)', 'Profit Percentage (%)', 'Profit Amount (INR)', 'Selling Price (INR)', 'Visibility', 'Last Updated'];
    let rows = products.map(p => [
      getShortId(p.id, 'frame'),
      p.name,
      p.base_price,
      p.options?.profit_percentage || 0,
      p.options?.profit_amount || 0,
      p.options?.selling_price || p.base_price,
      p.is_visible ? 'Visible' : 'Hidden',
      p.options?.last_updated ? new Date(p.options.last_updated).toLocaleString('en-IN') : 'Never'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pixnxt_pricing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute the final selling price from inputs
  const computedSellingPrice = useMemo(() => {
    if (!setPriceProduct) return null;
    const cost = parseFloat(setPriceProduct.base_price);
    const price = parseFloat(individualPrice);
    const pct = parseFloat(individualProfitPct);
    if (lastEditedField === 'pct' && !isNaN(pct) && pct >= 0) {
      return cost + (cost * pct / 100);
    }
    if (lastEditedField === 'price' && !isNaN(price) && price > 0) {
      return price;
    }
    // fallback
    if (!isNaN(price) && price > 0) return price;
    if (!isNaN(pct) && pct >= 0) return cost + (cost * pct / 100);
    return cost;
  }, [setPriceProduct, individualPrice, individualProfitPct, lastEditedField]);

  // Individual price set handler
  const handleSetIndividualPrice = async () => {
    if (!setPriceProduct) return;
    const basePrice = parseFloat(individualBasePrice);
    const pct = parseFloat(individualProfitPct);

    if (isNaN(basePrice) || basePrice <= 0) {
      alert("Please enter a valid base price (greater than 0).");
      return;
    }
    if (isNaN(pct) || pct < 0) {
      alert("Please enter a valid profit percentage (0 or above).");
      return;
    }

    const newSellingPrice = basePrice + (basePrice * pct / 100);
    const newProfitAmount = newSellingPrice - basePrice;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const newOptions = {
        ...(setPriceProduct.options || {}),
        selling_price: parseFloat(newSellingPrice.toFixed(2)),
        profit_percentage: parseFloat(pct.toFixed(2)),
        profit_amount: parseFloat(newProfitAmount.toFixed(2)),
        last_updated: timestamp,
        updated_by: photographerEmail
      };

      const { error } = await supabase
        .from('printstore_products')
        .update({ base_price: parseFloat(basePrice.toFixed(2)), options: newOptions })
        .eq('id', setPriceProduct.id);

      if (error) throw error;

      // Save audit log to localStorage
      const auditLog = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        photographer_id: photographerEmail,
        updated_products: [{
          id: setPriceProduct.id,
          name: setPriceProduct.name,
          old_base_price: setPriceProduct.base_price,
          new_base_price: basePrice,
          old_profit_pct: parseFloat(setPriceProduct.options?.profit_percentage || 0),
          new_profit_pct: pct,
          old_selling_price: parseFloat(setPriceProduct.options?.selling_price || setPriceProduct.base_price),
          new_selling_price: newSellingPrice
        }],
        previous_profit_pct: parseFloat(setPriceProduct.options?.profit_percentage || 0),
        new_profit_pct: parseFloat(pct.toFixed(2)),
        previous_selling_price: parseFloat(setPriceProduct.options?.selling_price || setPriceProduct.base_price),
        new_selling_price: parseFloat(newSellingPrice.toFixed(2)),
        updated_by: photographerEmail,
        created_at: timestamp
      };
      const currentLogs = JSON.parse(localStorage.getItem('pixnxt_bulk_pricing_audit_logs') || '[]');
      const updatedLogs = [auditLog, ...currentLogs];
      localStorage.setItem('pixnxt_bulk_pricing_audit_logs', JSON.stringify(updatedLogs));
      setAuditLogs(updatedLogs);

      setNotification({ type: 'success', text: `✓ Price updated for ${setPriceProduct.name} → ₹${newSellingPrice.toFixed(2)}` });
      setSetPriceProduct(null);
      setIndividualBasePrice('');
      setIndividualPrice('');
      setIndividualProfitPct('');
      setLastEditedField(null);
      await fetchProducts();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('DB update error:', err);
      alert("Failed to update price: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'pricing', label: 'Alter Price', icon: <DollarSign size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#fcfbf9',
      color: '#111111',
      fontFamily: "'europa', 'Inter', sans-serif",
      boxSizing: 'border-box'
    }}>
      
      {/* Sidebar */}
      <div style={{
        width: '220px',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #f2ede4',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #f2ede4',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: THEME_COLOR,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: "'EB Garamond', serif"
          }}>P</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', letterSpacing: '0.02em' }}>PIXNXT</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Photographer</div>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sidebarItems.map(item => (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === item.id ? THEME_BG : 'transparent',
                color: activeTab === item.id ? THEME_COLOR : '#475569',
                fontWeight: activeTab === item.id ? 600 : 400,
                fontSize: '13.5px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { if (activeTab !== item.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { if (activeTab !== item.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* Logout at Bottom */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #f2ede4' }}>
          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: '13.5px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            Log Out
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        
        {notification && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: notification.type === 'success' ? '#e6f4f3' : '#fff5f5',
            border: `1px solid ${notification.type === 'success' ? '#005c5a' : '#fed7d7'}`,
            color: notification.type === 'success' ? '#005c5a' : '#c53030',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '3px',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={16} />
            <span>{notification.text}</span>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '24px', color: THEME_COLOR, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              Welcome back, <strong>{photographerEmail}</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #f2ede4', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Products</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: THEME_COLOR, marginTop: '6px' }}>{products.length}</div>
              </div>
              <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #f2ede4', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Products</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a', marginTop: '6px' }}>{products.filter(p => p.is_visible).length}</div>
              </div>
              <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #f2ede4', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price Updates</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#7c3aed', marginTop: '6px' }}>{auditLogs.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '24px', color: THEME_COLOR, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Settings
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              Account and preferences
            </p>
            <div style={{ backgroundColor: '#fff', border: '1px solid #f2ede4', borderRadius: '6px', padding: '24px', maxWidth: '500px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Email</div>
                <div style={{ fontSize: '14px', color: '#111' }}>{photographerEmail}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Role</div>
                <div style={{ fontSize: '14px', color: '#111' }}>Photographer</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Session</div>
                <div style={{ fontSize: '14px', color: '#111' }}>Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Alter Price Tab */}
        {activeTab === 'pricing' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '24px', color: THEME_COLOR, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Alter Price
                </h1>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Manage selling prices for all frame products</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowHistoryModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1px solid #cbd5e1', borderRadius: '3px', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                  <History size={14} /> History
                </button>
                <button onClick={handleUndoLast} disabled={auditLogs.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1px solid #cbd5e1', borderRadius: '3px', backgroundColor: auditLogs.length > 0 ? '#ffffff' : '#f8fafc', color: auditLogs.length > 0 ? '#334155' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: auditLogs.length > 0 ? 'pointer' : 'not-allowed' }}>
                  <Undo2 size={14} /> Undo
                </button>
                <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1px solid #cbd5e1', borderRadius: '3px', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                  <Download size={14} /> Export
                </button>

              </div>
            </div>

            {/* Filter Row + Bulk Update Button */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or Frame ID..."
                  style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '13px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
                />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', backgroundColor: '#fff', borderRadius: '3px' }}>
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat.replace(/_/g, ' ').toUpperCase()}</option>
                ))}
              </select>
              <select value={profitFilter} onChange={(e) => setProfitFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', backgroundColor: '#fff', borderRadius: '3px' }}>
                <option value="all">All Margins</option>
                <option value="zero">Zero Profit Only</option>
                <option value="custom">Custom Profit Only</option>
              </select>
              <button
                onClick={() => setShowBulkModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', border: 'none', borderRadius: '3px',
                  backgroundColor: THEME_COLOR, color: '#ffffff',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}
              >
                Bulk Update Options
              </button>
            </div>

            {/* Select All + Count Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #f2ede4', borderRadius: '4px' }}>
              <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length} />
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Select All ({filteredProducts.length} products)</span>
              {selectedIds.length > 0 && <span style={{ fontSize: '11px', color: THEME_COLOR, fontWeight: 700 }}>{selectedIds.length} selected</span>}
            </div>

            {/* Products Visual Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {loading ? (
                <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No products found matching filters.</div>
              ) : (
                filteredProducts.map((p, idx) => {
                  const profitPct = Number(p.options?.profit_percentage || 0);
                  const sellingPrice = Number(p.options?.selling_price || p.base_price);
                  const isZeroProfit = profitPct === 0;
                  const isSelected = selectedIds.includes(p.id);
                  const frameId = getShortId(p.id, 'frame');
                  const photoUrl = p.image_url;
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
                    if (pType.includes('matted') && pType.includes('collage')) return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', padding: '6px', background: '#fdfdfd', border: '3.5px solid #111', width: '110px', height: '110px', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
                        <img src={photoUrl} alt="" style={imgS} onError={imgErr} /><img src={photoUrl} alt="" style={imgS} onError={imgErr} /><img src={photoUrl} alt="" style={imgS} onError={imgErr} /><img src={photoUrl} alt="" style={imgS} onError={imgErr} />
                      </div>
                    );
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
                        backgroundColor: isSelected ? '#f0fdfa' : isZeroProfit ? '#fffbeb' : '#ffffff',
                        border: isSelected ? `2px solid ${THEME_COLOR}` : '1px solid #f2ede4',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s',
                        cursor: 'default',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* Checkbox + Frame ID header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(p.id)} onClick={(e) => e.stopPropagation()} />
                          <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 600, color: THEME_COLOR }}>{frameId}</span>
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

                      {/* Product Name */}
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', textAlign: 'center', lineHeight: 1.3 }}>{p.name}</div>

                      {/* Price Info */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Cost</span>
                          <span style={{ fontFamily: 'monospace', color: '#111' }}>₹{p.base_price.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Profit</span>
                          <span style={{ fontWeight: isZeroProfit ? 'bold' : 'normal', color: isZeroProfit ? '#d97706' : '#111' }}>{profitPct.toFixed(1)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f2ede4', paddingTop: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#111' }}>Selling</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: THEME_COLOR, fontSize: '14px' }}>₹{sellingPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Last Updated */}
                      <div style={{ fontSize: '10px', color: '#94a3b8', width: '100%', textAlign: 'center' }}>
                        Updated: {p.options?.last_updated ? new Date(p.options.last_updated).toLocaleDateString('en-IN') : 'Never'}
                      </div>

                      {/* Set Price Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSetPriceProduct(p);
                          setIndividualBasePrice(String(p.base_price || ''));
                          setIndividualPrice('');
                          setIndividualProfitPct(String(profitPct || '0'));
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '11px', fontWeight: 700,
                          border: `1px solid ${THEME_COLOR}`, borderRadius: '4px',
                          backgroundColor: 'transparent', color: THEME_COLOR,
                          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME_COLOR; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = THEME_COLOR; }}
                      >
                        Set Price
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== SET PRICE POPUP (Individual) ========== */}
      {setPriceProduct && (() => {
        const bp = parseFloat(individualBasePrice) || 0;
        const pct = parseFloat(individualProfitPct) || 0;
        const finalPrice = bp > 0 ? bp + (bp * pct / 100) : 0;
        const profitAmount = finalPrice - bp;
        const isValid = bp > 0 && pct >= 0;
        return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', width: '100%', maxWidth: '440px', padding: '28px', boxSizing: 'border-box', position: 'relative', borderRadius: '6px' }}>
            <button onClick={() => { setSetPriceProduct(null); setLastEditedField(null); }} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
              <img src={setPriceProduct.image_url} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eaeaea' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{setPriceProduct.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{getShortId(setPriceProduct.id, 'frame')}</div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '6px' }}>
                Base Price of Frame (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={individualBasePrice}
                onChange={(e) => setIndividualBasePrice(e.target.value)}
                placeholder="e.g. 70.00"
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '6px' }}>
                Profit Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={individualProfitPct}
                onChange={(e) => setIndividualProfitPct(e.target.value)}
                placeholder="e.g. 15"
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
              />
            </div>

            {/* Computed Price Display */}
            <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#eefaf9', borderRadius: '6px', border: `1px solid ${THEME_COLOR}22` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Final Selling Price</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: THEME_COLOR, fontFamily: 'monospace' }}>₹{finalPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Profit per unit</span>
                <span style={{ fontWeight: 600, color: profitAmount > 0 ? '#16a34a' : '#94a3b8' }}>₹{profitAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSetPriceProduct(null); setLastEditedField(null); }} style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}>Cancel</button>
              <button
                onClick={handleSetIndividualPrice}
                disabled={isSaving || !isValid}
                style={{ padding: '8px 20px', fontSize: '12px', border: 'none', backgroundColor: (isSaving || !isValid) ? '#94a3b8' : THEME_COLOR, color: '#fff', cursor: (isSaving || !isValid) ? 'not-allowed' : 'pointer', borderRadius: '3px', fontWeight: 700 }}
              >
                {isSaving ? 'Saving...' : 'Update Price'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========== BULK UPDATE OPTIONS POPUP ========== */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', width: '100%', maxWidth: '460px', padding: '32px', boxSizing: 'border-box', position: 'relative', borderRadius: '6px' }}>
            <button onClick={() => setShowBulkModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
              <X size={18} />
            </button>

            <h3 style={{ fontFamily: "'EB Garamond', serif", fontSize: '20px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: THEME_COLOR, margin: '0 0 16px 0' }}>
              Bulk Update Options
            </h3>

            {selectedIds.length === 0 && (
              <div style={{ padding: '12px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '13px', color: '#b45309', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} />
                <span>Select products from the table using checkboxes first, then open Bulk Update.</span>
              </div>
            )}

            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748b' }}>
              Selected: <strong style={{ color: selectedIds.length > 0 ? THEME_COLOR : '#ef4444' }}>{selectedIds.length}</strong> of {filteredProducts.length} products
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { value: 'increase_pct', label: 'Increase Profit %' },
                { value: 'decrease_pct', label: 'Decrease Profit %' },
                { value: 'set_pct', label: 'Set Exact Profit %' },
                { value: 'set_amount', label: 'Set Fixed Profit Amount (₹)' },
                { value: 'reset', label: 'Reset Profit (0% Margin)' }
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="update_method" value={opt.value}
                    checked={updateMethod === opt.value}
                    onChange={() => { setUpdateMethod(opt.value); if (opt.value === 'reset') setUpdateValue('0'); }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {updateMethod !== 'reset' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '6px' }}>
                  {updateMethod === 'set_amount' ? 'Enter Profit Amount (INR)' : 'Enter Percentage (%)'}
                </label>
                <input 
                  type="number" min="0" step="any"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder={updateMethod === 'set_amount' ? '200' : '15'}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
                />
              </div>
            )}

            <button 
              onClick={handlePreview}
              disabled={selectedIds.length === 0}
              style={{
                width: '100%', padding: '11px',
                backgroundColor: selectedIds.length > 0 ? THEME_COLOR : '#94a3b8',
                color: '#ffffff', border: 'none',
                fontWeight: 700, fontSize: '12px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                borderRadius: '3px'
              }}
            >
              Review Price Changes ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* ========== LIVE PREVIEW CHANGE LOG & CONFIRM ========== */}
      {previewChanges && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '36px', boxSizing: 'border-box', position: 'relative' }}>
            <button onClick={() => setPreviewChanges(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>✕</button>

            <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '22px', color: THEME_COLOR, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pricing Update Preview
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
              Review the calculated customer selling prices before committing updates to the live database.
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '24px', maxHeight: '40vh', border: '1px solid #eaeaea' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #eaeaea' }}>
                    <th style={{ padding: '10px 12px' }}>Product</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Mfg Cost</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Old Profit %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>New Profit %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Old Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>New Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {previewChanges.map(change => {
                    const isIncrease = change.diff > 0;
                    const isDecrease = change.diff < 0;
                    return (
                      <tr key={change.product_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{change.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>₹{change.cost.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{change.oldProfitPct.toFixed(2)}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: THEME_COLOR }}>{change.newProfitPct.toFixed(2)}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>₹{change.oldPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: THEME_COLOR }}>₹{change.newPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: isIncrease ? '#16a34a' : isDecrease ? '#dc2626' : '#475569' }}>
                          {isIncrease ? `+₹${change.diff.toFixed(2)}` : isDecrease ? `-₹${Math.abs(change.diff).toFixed(2)}` : '₹0.00'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!showConfirmDialog ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setPreviewChanges(null)} style={{ padding: '10px 18px', fontSize: '12.5px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}>Cancel</button>
                <button onClick={() => setShowConfirmDialog(true)} style={{ padding: '10px 24px', fontSize: '12.5px', border: 'none', backgroundColor: THEME_COLOR, color: '#ffffff', cursor: 'pointer', borderRadius: '3px', fontWeight: 700 }}>Apply Changes</button>
              </div>
            ) : (
              <div style={{ padding: '20px', backgroundColor: '#fffdf5', border: '1px solid #fbeebc', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <AlertCircle size={18} color="#d97706" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>Final Confirmation Required</span>
                </div>
                <div style={{ fontSize: '13.5px', color: '#666' }}>
                  You are about to update <strong>{previewChanges.length} Products</strong>. Selling prices will instantly update in Customer Print Lab.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button disabled={isSaving} onClick={() => setShowConfirmDialog(false)} style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}>Go Back</button>
                  <button disabled={isSaving} onClick={handleSaveChanges} style={{ padding: '8px 20px', fontSize: '12px', border: 'none', backgroundColor: THEME_COLOR, color: '#ffffff', cursor: 'pointer', borderRadius: '3px', fontWeight: 700 }}>
                    {isSaving ? 'UPDATING DB...' : 'Yes, Apply Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== UPDATE HISTORY MODAL ========== */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '36px', boxSizing: 'border-box', position: 'relative' }}>
            <button onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>✕</button>

            <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '22px', color: THEME_COLOR, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pricing Update History
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {auditLogs.map((log, idx) => {
                const logDate = new Date(log.created_at);
                const dateStr = logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                return (
                <div key={log.id || idx} style={{ padding: '16px', border: '1px solid #eaeaea', backgroundColor: '#fafafa', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{log.updated_by}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{dateStr}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{timeStr}</div>
                    </div>
                  </div>
                  <div style={{ color: '#475569', marginBottom: '10px' }}>
                    Updated <strong>{log.updated_products?.length || 0} product(s)</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Old Price: </span>
                      <span style={{ fontWeight: 600 }}>₹{Number(log.previous_selling_price || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ color: '#94a3b8' }}>→</div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>New Price: </span>
                      <span style={{ fontWeight: 600, color: THEME_COLOR }}>₹{Number(log.new_selling_price || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Profit: </span>
                      <span style={{ fontWeight: 600 }}>{Number(log.previous_profit_pct || 0).toFixed(1)}% → {Number(log.new_profit_pct || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => handleRestoreFromLog(log)} style={{ padding: '4px 10px', border: `1px solid ${THEME_COLOR}`, borderRadius: '3px', backgroundColor: 'transparent', color: THEME_COLOR, fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                      Restore These Prices
                    </button>
                  </div>
                </div>
                );
              })}
              {auditLogs.length === 0 && (
                <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '30px' }}>No price updates have been made yet.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowHistoryModal(false)} style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
