import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { Copy, Check } from 'lucide-react';

const STATUS_COLORS = {
  pending: '#f39c12',
  printing: '#9b59b6',
  printed: '#005c5a',
  packaging: '#1abc9c',
  ready_to_ship: '#3498db',
  shipped: '#2ecc71',
  completed: '#27ae60',
  reprint: '#e74c3c',
  cancelled: '#7f8c8d'
};

const STATUS_LABELS = {
  pending: 'New Order',
  printing: 'Printing',
  printed: 'Printed (QC)',
  packaging: 'Packaging',
  ready_to_ship: 'Ready To Ship',
  shipped: 'Shipped',
  completed: 'Delivered',
  reprint: 'Reprint Required',
  cancelled: 'Cancelled'
};

const STEP_NUMBERS = {
  pending: '1',
  printing: '1',
  printed: '2',
  packaging: '3',
  ready_to_ship: '4',
  reprint: 'R',
};

const getPhotoThumbnail = (item) => {
  const opts = item?.options || {};
  let photoOption = opts.photo;
  
  if (!photoOption && opts.photos && opts.photos.length > 0) {
    photoOption = opts.photos[0];
  }
  
  if (!photoOption) return '';
  if (typeof photoOption === 'string') {
    if (photoOption.startsWith('http://') || photoOption.startsWith('https://') || photoOption.startsWith('data:')) {
      return photoOption;
    }
    const mock = MOCK_PHOTOS.find(p => p.id === photoOption);
    if (mock) return mock.url;
    return '';
  }
  if (typeof photoOption === 'object') {
    if (photoOption.url) return photoOption.url;
    if (photoOption.id) {
      const mock = MOCK_PHOTOS.find(p => p.id === photoOption.id);
      if (mock) return mock.url;
    }
  }
  return '';
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        color: copied ? '#2ecc71' : '#94a3b8',
        marginLeft: '6px',
        verticalAlign: 'middle',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {copied ? <Check size={13} color="#2ecc71" strokeWidth={3} /> : <Copy size={12} />}
    </button>
  );
};


export default function LabOrdersTable({ title, fixedStatusFilter, showQuickActions = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, orderItems, setOrders, employees } = useLabAuth();
  
  const stepNumber = fixedStatusFilter ? STEP_NUMBERS[fixedStatusFilter] : null;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(fixedStatusFilter || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const handleStatusChange = async (orderId, newStatus, e) => {
    e.stopPropagation();
    const isConfirmed = window.confirm(`Are you sure you want to change the status of this order to "${STATUS_LABELS[newStatus]}"?`);
    if (!isConfirmed) {
      e.target.value = orders.find(o => o.id === orderId)?.status || 'pending';
      return;
    }
    const previous = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating status:', err);
      setOrders(previous);
      alert('Failed to update status in DB: ' + err.message);
    }
  };

  const handleAssignEmployee = async (orderId, employeeName, e) => {
    e.stopPropagation();
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assigned_employee: employeeName } : o));
    
    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({ assigned_employee: employeeName })
        .eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update assigned employee in DB.');
    }
  };

  const handlePriorityChange = async (orderId, priority, e) => {
    e.stopPropagation();
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, priority } : o));
    
    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({ priority })
        .eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update priority in DB.');
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) || 
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      );
    }

    if (fixedStatusFilter) {
      if (Array.isArray(fixedStatusFilter)) {
        result = result.filter(o => fixedStatusFilter.includes(o.status));
      } else {
        result = result.filter(o => o.status === fixedStatusFilter);
      }
    } else if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(o => {
        const itemsForOrder = orderItems.filter(item => item.order_id === o.id);
        return itemsForOrder.some(item => item.product_type === typeFilter);
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'amount_desc') return (b.total || 0) - (a.total || 0);
      if (sortBy === 'amount_asc') return (a.total || 0) - (b.total || 0);
      return 0;
    });

    return result;
  }, [orders, orderItems, search, statusFilter, fixedStatusFilter, typeFilter, sortBy]);

  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const getProductTypeLabel = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    if (items.length === 0) return 'N/A';
    const types = [...new Set(items.map(item => item.product_type || 'print'))];
    return types.map(t => t.replace(/_/g, ' ').toUpperCase()).join(', ');
  };

  const getQuantitySum = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  return (
    <div style={{ padding: '16px 32px 12px 32px', backgroundColor: 'transparent', minHeight: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      <div style={{ borderBottom: 'none', paddingBottom: '0px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {title}
            {stepNumber && (
              <span style={{ 
                color: '#0d9488', 
                fontSize: '24px', 
                fontWeight: 700, 
                fontFamily: 'sans-serif',
                backgroundColor: '#e6f4f3', 
                borderRadius: '50%', 
                width: '36px', 
                height: '36px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                {stepNumber}
              </span>
            )}
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '4px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
        <input
          type="search"
          placeholder="Search by ID, name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1, minWidth: '240px', padding: '10px 14px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13.5px' }}
        />
        
        {!fixedStatusFilter && (
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{ padding: '10px 28px 10px 14px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        )}

        <select 
          value={typeFilter} 
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          style={{ padding: '10px 28px 10px 14px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">All Products</option>
          <option value="print_pack">Print Pack</option>
          <option value="frames">Frames</option>
          <option value="float_frames">Float Frames</option>
          <option value="matted_collages">Matted Collages</option>
        </select>

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '10px 28px 10px 14px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="date_desc">Placed: Newest first</option>
          <option value="date_asc">Placed: Oldest first</option>
          <option value="amount_desc">Amount: High to Low</option>
          <option value="amount_asc">Amount: Low to High</option>
        </select>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '1800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#005c5a', color: '#ffffff', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '14px 16px', width: '50px' }}>No.</th>
              <th style={{ padding: '14px 16px', width: '100px' }}>Product</th>
              <th style={{ padding: '14px 16px', width: '240px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', width: '200px', whiteSpace: 'nowrap' }}>Photographer UID</th>
              <th style={{ padding: '14px 16px', width: '180px' }}>Customer Name</th>
              <th style={{ padding: '14px 16px', width: '220px' }}>Customer Email</th>
              <th style={{ padding: '14px 16px', width: '120px' }}>Date</th>
              <th style={{ padding: '14px 16px', width: '140px' }}>Product Type</th>
              <th style={{ padding: '14px 16px', width: '80px', textAlign: 'center' }}>Qty</th>
              {showQuickActions && (
                <>
                  <th style={{ padding: '14px 16px', width: '120px' }}>Priority</th>
                  <th style={{ padding: '14px 16px', width: '180px' }}>Assigned Employee</th>
                  <th style={{ padding: '14px 16px', width: '180px' }}>Status</th>
                </>
              )}
              <th style={{ padding: '14px 16px', width: '100px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '14px 16px', width: '120px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order, idx) => {
              const orderNumber = `#PXNXT-${order.id.toUpperCase()}`;
              const photographerUid = order.photographer_id || 'N/A';
              const currentOrderItems = orderItems.filter(item => item.order_id === order.id);
              
              return (
                <tr 
                  key={order.id} 
                  onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                  style={{ borderBottom: '1px solid #eaeaea', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }} onClick={(e) => e.stopPropagation()}>
                    {page * pageSize + idx + 1}
                  </td>
                  
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {currentOrderItems.map((item, itemIdx) => (
                        <div 
                          key={item.id} 
                          style={{
                            width: '32px',
                            height: '32px',
                            border: '1px solid #cbd5e1',
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '2px'
                          }}
                        >
                          {getPhotoThumbnail(item) ? (
                            <img src={getPhotoThumbnail(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: '8px', color: '#aaa', fontWeight: 'bold' }}>IMG</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'semibold', color: '#0f172a', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <span>{orderNumber}</span>
                    <CopyButton text={orderNumber} />
                  </td>

                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <span title={order.photographer_id}>{photographerUid}</span>
                    {order.photographer_id && <CopyButton text={order.photographer_id} />}
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{order.customer_name}</td>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>{order.customer_email}</td>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>{getProductTypeLabel(order.id)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{getQuantitySum(order.id)}</td>
                  
                  {showQuickActions && (
                    <>
                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <select
                           value={order.priority || 'medium'}
                           onChange={(e) => handlePriorityChange(order.id, e.target.value, e)}
                           style={{
                             padding: '3px 20px 3px 6px',
                             borderRadius: '3px',
                             border: '1px solid #cbd5e1',
                             fontSize: '11px',
                             fontWeight: '600',
                             color: order.priority === 'urgent' ? '#e74c3c' : order.priority === 'high' ? '#e67e22' : '#0f172a',
                             outline: 'none',
                             cursor: 'pointer',
                             backgroundColor: '#ffffff'
                           }}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.assigned_employee || ''}
                          onChange={(e) => handleAssignEmployee(order.id, e.target.value, e)}
                          style={{
                            padding: '3px 24px 3px 6px',
                            borderRadius: '3px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            outline: 'none',
                            width: '100%',
                            minWidth: '180px',
                            color: '#0f172a',
                            cursor: 'pointer',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <option value="">Unassigned</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value, e)}
                          disabled={order.status === 'completed' || order.status === 'cancelled'}
                          style={{
                            backgroundColor: `${STATUS_COLORS[order.status]}15`,
                            color: STATUS_COLORS[order.status],
                            border: `1px solid ${STATUS_COLORS[order.status]}30`,
                            borderRadius: '20px',
                            padding: '3px 20px 3px 8px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: (order.status === 'completed' || order.status === 'cancelled') ? 'not-allowed' : 'pointer',
                            outline: 'none',
                            minWidth: '145px'
                          }}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => {
                            const orderSteps = ['pending', 'printing', 'printed', 'packaging', 'ready_to_ship', 'shipped', 'completed'];
                            const currentIndex = orderSteps.indexOf(order.status);
                            const optionIndex = orderSteps.indexOf(value);
                            
                            const isNonSequential = value === 'cancelled' || value === 'reprint';
                            const isDisabled = !isNonSequential && currentIndex !== -1 && optionIndex !== -1 && optionIndex < currentIndex;
                            
                            return (
                              <option 
                                key={value} 
                                value={value} 
                                disabled={isDisabled} 
                                style={{ backgroundColor: '#ffffff', color: isDisabled ? '#cbd5e1' : '#333' }}
                              >
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </>
                  )}

                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total || 0)}
                  </td>
                  
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                      style={{
                        padding: '4px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '3px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#005c5a'; e.currentTarget.style.color = '#005c5a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: '1px solid #eaeaea', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
          <div>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid #cbd5e1', fontSize: '10.5px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 4px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}
              >
                ◀
              </button>
              <span style={{ fontWeight: '600' }}>Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px 4px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
