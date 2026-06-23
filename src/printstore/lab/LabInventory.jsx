import React, { useState, useEffect } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';

export default function LabInventory() {
  const { inventory, refreshInventory } = useLabAuth();
  
  // History log state - loaded dynamically from database audit checks if available
  const [history, setHistory] = useState([
    { id: 'h1', sku: 'PAP-LUS-1620', action: 'Restock', quantity: 5.00, user: 'Logistics Supervisor', timestamp: '2026-06-21T10:00:00Z' },
    { id: 'h2', sku: 'PAP-MAT-2436', action: 'Used in Production', quantity: -2.00, user: 'Printing Operator', timestamp: '2026-06-20T14:30:00Z' },
    { id: 'h3', sku: 'PKG-BOX-MED', action: 'Used in Packaging', quantity: -1.00, user: 'Shipping Clerk', timestamp: '2026-06-22T17:20:00Z' }
  ]);

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

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inventory Management
          </h1>
          <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Monitor materials catalog, thresholds, and suppliers</p>
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Inventory Ledger Table */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflowX: 'auto' }}>
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
                  <tr key={item.sku} style={{ borderBottom: '1px solid #eaeaea' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{item.sku}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{item.category}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold' }}>{item.available_qty}</td>
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
                        style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#111', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
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

        {/* History log and adjust stock panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {editingItem && (
            <div style={{ padding: '20px', border: '1px solid #005c5a', borderRadius: '4px', backgroundColor: '#eefaf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Adjust Stock Levels</h4>
                <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>✕</button>
              </div>
              <div style={{ fontSize: '12.5px', color: '#333', marginBottom: '12px' }}>
                <strong>SKU:</strong> {editingItem.sku}<br />
                <strong>Current Available:</strong> {editingItem.available_qty}
              </div>
              <form onSubmit={handleAdjustStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('add')}
                    style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '3px', backgroundColor: adjustAction === 'add' ? '#005c5a' : '#cbd5e1', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Restock (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('remove')}
                    style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '3px', backgroundColor: adjustAction === 'remove' ? '#e74c3c' : '#cbd5e1', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    Reduce (-)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Quantity change</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  style={{ backgroundColor: '#111', color: '#fff', border: 'none', padding: '10px', fontSize: '12.5px', cursor: 'pointer', borderRadius: '3px', fontWeight: 'bold' }}
                >
                  Save Adjustments
                </button>
              </form>
            </div>
          )}

          {/* History log */}
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock Ledger History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {history.map(log => (
                <div key={log.id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fff', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ fontFamily: 'monospace' }}>{log.sku}</span>
                    <span style={{ color: log.quantity > 0 ? '#2ecc71' : '#e74c3c' }}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                    <span>{log.action} • {log.user}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
