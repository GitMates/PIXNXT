import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import CartItemPreview from '../components/CartItemPreview';
import { MOCK_PHOTOS } from '../data/mockStoreData';

const getPhotoThumbnail = (photoOption, photosOption) => {
  let photo = photoOption;
  if (!photo && photosOption && photosOption.length > 0) {
    photo = photosOption[0];
  }
  if (!photo) return '';
  if (typeof photo === 'string') {
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const mock = MOCK_PHOTOS.find(p => p.id === photo);
    if (mock) return mock.url;
    return '';
  }
  if (typeof photo === 'object') {
    if (photo.url) return photo.url;
    if (photo.id) {
      const mock = MOCK_PHOTOS.find(p => p.id === photo.id);
      if (mock) return mock.url;
    }
  }
  return '';
};


const KANBAN_COLUMNS = [
  { id: 'pending', label: 'New Orders' },
  { id: 'printing', label: 'Printing' },
  { id: 'printed', label: 'Printed (QC)' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'ready_to_ship', label: 'Ready To Ship' },
  { id: 'shipped', label: 'Shipped' }
];

const PRIORITY_COLORS = {
  low: { bg: '#f1f5f9', text: '#475569' },
  medium: { bg: '#e0f2fe', text: '#0369a1' },
  high: { bg: '#ffedd5', text: '#c2410c' },
  urgent: { bg: '#fee2e2', text: '#b91c1c' }
};

export default function LabProductionBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, setOrders, orderItems, employees } = useLabAuth();
  const [draggingId, setDraggingId] = useState(null);

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId);
    setDraggingId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;

    // Optimistic Update
    const previous = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: columnId } : o));

    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({ status: columnId })
        .eq('id', orderId);

      if (error) {
        // If constraint fails, try the fallback state
        // (For systems where DB constraints aren't migrated yet)
        let fallbackStatus = columnId;
        if (columnId === 'printing' || columnId === 'printed') {
          fallbackStatus = 'processing';
        } else if (columnId === 'packaging' || columnId === 'ready_to_ship') {
          fallbackStatus = 'packed';
        }

        const { error: fallbackError } = await supabase
          .from('printstore_orders')
          .update({ status: fallbackStatus })
          .eq('id', orderId);

        if (fallbackError) throw fallbackError;
      }
    } catch (err) {
      console.error('Failed to sync status drop with database:', err);
      setOrders(previous);
    }
  };

  const handleEmployeeAssign = async (orderId, employeeName) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assigned_employee: employeeName } : o));
    try {
      await supabase
        .from('printstore_orders')
        .update({ assigned_employee: employeeName })
        .eq('id', orderId);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePriorityChange = async (orderId, priority) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, priority } : o));
    try {
      await supabase
        .from('printstore_orders')
        .update({ priority })
        .eq('id', orderId);
    } catch (e) {
      console.error(e);
    }
  };

  // Group orders by column status mapping
  const columnsData = useMemo(() => {
    const data = {};
    KANBAN_COLUMNS.forEach(col => {
      data[col.id] = [];
    });

    orders.forEach(order => {
      let status = order.status || 'pending';
      // Normalize statuses that map to legacy db columns if needed
      if (status === 'processing') status = 'printing';
      if (status === 'packed') status = 'packaging';
      if (status === 'dispatching' || status === 'arrived') status = 'ready_to_ship';
      if (status === 'completed') status = 'shipped';

      if (data[status]) {
        data[status].push(order);
      } else {
        // Fallback for reprint or cancelled
        if (data['pending']) {
          data['pending'].push(order);
        }
      }
    });

    return data;
  }, [orders]);

  const getProductInfo = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    if (items.length === 0) return { name: 'Print Job', type: 'print', qty: 1, preview: null };
    const firstItem = items[0];
    const typeLabel = firstItem.product_type ? firstItem.product_type.replace(/_/g, ' ').toUpperCase() : 'PRINT';
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    return {
      name: firstItem.product_name || 'Custom Product',
      type: typeLabel,
      qty: totalQty,
      preview: {
        productId: firstItem.product_type || '',
        productName: firstItem.product_name || '',
        photo: firstItem.options?.photo || null,
        photos: firstItem.options?.photos || [],
        size: firstItem.options?.size || null,
        frame: firstItem.options?.frame || null,
        paper: firstItem.options?.paper || null,
        border: firstItem.options?.border || 'none',
        layout: firstItem.options?.layout || null,
        rotation: firstItem.options?.rotation || 0,
        quantity: firstItem.quantity,
        unitPrice: parseFloat(firstItem.unit_price || 0)
      }
    };
  };

  const getDueDate = (createdAt) => {
    const d = new Date(createdAt);
    d.setDate(d.getDate() + 3); // Due in 3 days
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Kanban Production Board
        </h1>
        <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Drag cards to update manufacturing workflow status in real-time</p>
      </div>

      {/* Columns Container */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', flex: 1, minHeight: '650px', paddingBottom: '20px' }}>
        {KANBAN_COLUMNS.map(col => {
          const colOrders = columnsData[col.id] || [];
          return (
            <div 
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{
                flex: '0 0 280px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 200px)'
              }}
            >
              {/* Column Title */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                <span style={{ backgroundColor: '#eefaf9', color: '#005c5a', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards Scroller */}
              <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colOrders.map(order => {
                  const prod = getProductInfo(order.id);
                  const orderNumber = `#PXNXT-${order.id.substring(0, 8).toUpperCase()}`;
                  const priority = order.priority || 'medium';
                  const pColors = PRIORITY_COLORS[priority];
                  const isDragging = draggingId === order.id;

                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '14px',
                        cursor: 'grab',
                        opacity: isDragging ? 0.4 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'box-shadow 0.15s, transform 0.15s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)'; }}
                    >
                      {/* Priority Label */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          backgroundColor: pColors.bg,
                          color: pColors.text
                        }}>
                          {priority}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          Due: {getDueDate(order.created_at)}
                        </span>
                      </div>

                      {/* Product Thumbnail & Details */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justify: 'center', backgroundColor: '#fafafa', borderRadius: '3px' }}>
                          {getPhotoThumbnail(prod.preview?.photo, prod.preview?.photos) ? (
                            <img src={getPhotoThumbnail(prod.preview?.photo, prod.preview?.photos)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: '9px', color: '#aaa', fontWeight: 'bold' }}>PXNXT</div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#111111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' }}>
                            {prod.type} • Qty: {prod.qty}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Order ID & Customer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '11px', color: '#005c5a' }}>{orderNumber}</span>
                          <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>{order.customer_name}</span>
                        </div>

                        {/* Assignee select */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Assign:</span>
                          <select
                            value={order.assigned_employee || ''}
                            onChange={(e) => handleEmployeeAssign(order.id, e.target.value)}
                            style={{
                              flex: 1,
                              fontSize: '11px',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Unassigned</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
