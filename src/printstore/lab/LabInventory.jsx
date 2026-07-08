import React, { useState, useEffect } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { History, ArrowLeft, Plus, CheckCircle, AlertTriangle, Trash2, Search, SlidersHorizontal } from 'lucide-react';

export default function LabInventory() {
  const { inventory, refreshInventory } = useLabAuth();
  
  // History log state - loaded dynamically from database
  const [history, setHistory] = useState([]);

  // Fetch packaging and quality check logs to dynamically build the stock ledger history
  useEffect(() => {
    async function fetchLedgerHistory() {
      try {
        const { data: packagingData, error: packErr } = await supabase
          .from('printstore_lab_packaging_logs')
          .select('id, created_at, packed_by, packaging_type, order_id')
          .order('created_at', { ascending: false });

        const { data: qcData, error: qcErr } = await supabase
          .from('printstore_lab_quality_checks')
          .select('id, created_at, checked_by, result, failure_reason, order_id')
          .order('created_at', { ascending: false });

        const merged = [];
        if (!packErr && packagingData) {
          packagingData.forEach(row => {
            merged.push({
              id: row.id,
              sku: 'PKG-BOX-MED',
              action: 'Used in Packaging',
              quantity: -1,
              user: row.packed_by || 'Packaging operator',
              timestamp: row.created_at
            });
          });
        }
        if (!qcErr && qcData) {
          qcData.forEach(row => {
            merged.push({
              id: row.id,
              sku: 'PAP-LUS-1620',
              action: row.result === 'pass' ? 'QC Passed' : `QC Failed: ${row.failure_reason}`,
              quantity: row.result === 'pass' ? -1 : 0,
              user: row.checked_by || 'QC Inspector',
              timestamp: row.created_at
            });
          });
        }
        // sort by timestamp descending
        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(merged);
      } catch (err) {
        console.error("Error loading ledger logs:", err);
      }
    }
    fetchLedgerHistory();
  }, [inventory]);

  // View state: toggle between inventory catalog list and full-page history ledger
  const [showHistoryView, setShowHistoryView] = useState(false);

  // Search & filter states for the history view
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState('All');

  // Modal or editing states
  const [editingItem, setEditingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustAction, setAdjustAction] = useState('add');

  // Form states to add new inventory
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Photo Paper');
  const [newQty, setNewQty] = useState(0);
  const [newMin, setNewMin] = useState(0);
  const [newSupplier, setNewSupplier] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem || !adjustQty) return;
    
    const qtyChange = parseFloat(adjustQty);
    const multiplier = adjustAction === 'add' ? 1 : -1;
    const finalChange = qtyChange * multiplier;
    const nextQty = Math.max(0, parseFloat(editingItem.available_qty) + finalChange);

    try {
      const { error } = await supabase
        .from('printstore_inventory')
        .update({
          available_qty: nextQty,
          last_updated: new Date().toISOString()
        })
        .eq('sku', editingItem.sku);

      if (error) throw error;

      // Append to the local history tracker
      setHistory(prev => [
        {
          id: `h_${Date.now()}`,
          sku: editingItem.sku,
          action: adjustAction === 'add' ? 'Manual Restock' : 'Manual Reduction',
          quantity: finalChange,
          user: 'Lab Manager',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

      setEditingItem(null);
      setAdjustQty('');
      await refreshInventory();
      alert('Stock adjustment successfully synchronized in Supabase.');
    } catch (err) {
      console.error(err);
      alert('Failed to update stock: ' + err.message);
    }
  };

  const handleCreateInventory = async (e) => {
    e.preventDefault();
    if (!newSku || !newName) return;

    try {
      const { error } = await supabase
        .from('printstore_inventory')
        .insert({
          sku: newSku,
          item_name: newName,
          category: newCategory,
          available_qty: parseFloat(newQty) || 0,
          minimum_qty: parseFloat(newMin) || 0,
          supplier: newSupplier,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      setHistory(prev => [
        {
          id: `h_${Date.now()}`,
          sku: newSku,
          action: 'Initial Creation',
          quantity: parseFloat(newQty) || 0,
          user: 'Lab Manager',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

      setNewSku('');
      setNewName('');
      setNewQty(0);
      setNewMin(0);
      setNewSupplier('');
      setShowAddForm(false);
      await refreshInventory();
      alert('New material registered in Supabase successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to register material: ' + err.message);
    }
  };

  // Filtered history records
  const filteredHistory = history.filter(log => {
    const matchesSearch = log.sku.toLowerCase().includes(historySearch.toLowerCase()) || 
                          log.action.toLowerCase().includes(historySearch.toLowerCase()) ||
                          log.user.toLowerCase().includes(historySearch.toLowerCase());
    
    // Category check (mapping SKU categories optionally or matching category string)
    const matchesCategory = historyCategory === 'All' || 
      (historyCategory === 'Restocks' && log.quantity > 0) || 
      (historyCategory === 'Reductions' && log.quantity < 0);

    return matchesSearch && matchesCategory;
  });

  // Render Full Page Stock Ledger History
  if (showHistoryView) {
    return (
      <div style={{ padding: '36px 40px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
        
        {/* Full-Page History Header */}
        <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              onClick={() => setShowHistoryView(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#005c5a',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '0 0 8px 0'
              }}
            >
              <ArrowLeft size={14} /> Back to Catalog
            </button>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Stock Ledger History
            </h1>
            <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Comprehensive audit logs of all manufacturing material movements and manual restocks.</p>
          </div>
        </div>

        {/* History Search and Filter Controls */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search by SKU, action, or authorized clerk..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <select
            value={historyCategory}
            onChange={(e) => setHistoryCategory(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
          >
            <option value="All">All Operations</option>
            <option value="Restocks">Restocks (+)</option>
            <option value="Reductions">Reductions (-)</option>
          </select>
        </div>

        {/* Audit Table */}
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #cbd5e1', borderRadius: '4px', color: '#64748b' }}>
            No transaction records matched the current search criteria.
          </div>
        ) : (
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflowX: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#005c5a', color: '#ffffff', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '14px 16px' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Material SKU</th>
                  <th style={{ padding: '14px 16px' }}>Operation / Event</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Adjustment Qty</th>
                  <th style={{ padding: '14px 16px' }}>Authorized Clerk</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(log => {
                  const isPositive = log.quantity > 0;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eaeaea', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{log.sku}</td>
                      <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold', color: isPositive ? '#16a34a' : '#ef4444' }}>
                        {isPositive ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{log.user}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    );
  }

  // Standard Catalog List Page View
  return (
    <div style={{ padding: '36px 40px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inventory Management
          </h1>
          <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Monitor materials catalog, thresholds, and suppliers</p>
        </div>
        
        {/* Top-Right Header Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          
          {/* Toggle History View Button */}
          <button
            onClick={() => setShowHistoryView(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              color: '#005c5a',
              border: '1px solid #005c5a',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background-color 0.15s'
            }}
          >
            <History size={15} /> Stock History
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              backgroundColor: '#005c5a',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            {showAddForm ? 'Close Form' : '+ Register Material'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateInventory} style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Register New Material</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>SKU Code</label>
              <input
                type="text"
                placeholder="e.g. WD-OAK-3CM"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Item Name</label>
              <input
                type="text"
                placeholder="e.g. Classic White Oak Moulding"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Photo Paper">Photo Paper</option>
                <option value="Frame Material">Frame Material</option>
                <option value="Glass Sheets">Glass Sheets</option>
                <option value="Mount Boards">Mount Boards</option>
                <option value="Packaging Materials">Packaging Materials</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Available Quantity</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Minimum Warning Level</label>
              <input
                type="number"
                value={newMin}
                onChange={(e) => setNewMin(parseFloat(e.target.value) || 0)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Supplier Company</label>
              <input
                type="text"
                placeholder="e.g. Metro Supplies"
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{ backgroundColor: '#005c5a', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', fontSize: '12.5px', cursor: 'pointer', borderRadius: '4px', marginTop: '16px' }}
          >
            Create Record
          </button>
        </form>
      )}

      {/* Full-width catalog and adjustment container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Adjustment details overlay inline */}
        {editingItem && (
          <div style={{ padding: '24px', border: '1px solid #005c5a', borderRadius: '4px', backgroundColor: '#eefaf9', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 'bold' }}>Adjust Stock Levels</h4>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ fontSize: '13.5px', color: '#333', marginBottom: '16px' }}>
              Material: <strong>{editingItem.item_name}</strong> (SKU: <code>{editingItem.sku}</code>) | Current Qty: <strong>{editingItem.available_qty}</strong>
            </div>
            <form onSubmit={handleAdjustStockSubmit} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', minWidth: '220px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustAction('add')}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '3px', backgroundColor: adjustAction === 'add' ? '#005c5a' : '#cbd5e1', color: '#fff', cursor: 'pointer', fontSize: '12.5px', fontWeight: 'bold' }}
                >
                  Restock (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustAction('remove')}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '3px', backgroundColor: adjustAction === 'remove' ? '#e74c3c' : '#cbd5e1', color: '#fff', cursor: 'pointer', fontSize: '12.5px', fontWeight: 'bold' }}
                >
                  Reduce (-)
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Quantity Adjusted</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }}
                  required
                />
              </div>

              <button
                type="submit"
                style={{ backgroundColor: '#111', color: '#fff', border: 'none', padding: '11px 24px', fontSize: '12.5px', cursor: 'pointer', borderRadius: '3px', fontWeight: 'bold', height: '40px' }}
              >
                Save Adjustment
              </button>
            </form>
          </div>
        )}

        {/* Catalog Table */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflowX: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#005c5a', color: '#ffffff', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '14px 16px' }}>SKU</th>
                <th style={{ padding: '14px 16px' }}>Item Name</th>
                <th style={{ padding: '14px 16px' }}>Category</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Available Qty</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Min Threshold</th>
                <th style={{ padding: '14px 16px' }}>Supplier</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isLow = parseFloat(item.available_qty) <= parseFloat(item.minimum_qty);
                return (
                  <tr key={item.sku} style={{ borderBottom: '1px solid #eaeaea', backgroundColor: '#ffffff' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{item.sku}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{item.category}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold', fontSize: '13.5px' }}>{item.available_qty}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b' }}>{item.minimum_qty}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{item.supplier || 'N/A'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {isLow ? (
                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Low Stock</span>
                      ) : (
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Healthy</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setEditingItem(item)}
                        style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#111', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px', fontWeight: 'bold' }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
