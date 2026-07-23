import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { Copy, Check, Eye } from 'lucide-react';
import { getShortId } from '../utils/idFormat';
import LabSearchField from './LabSearchField';
import { getLabItemPhotoUrl } from './labPhotoUrl';
import LabFramedThumb from './LabFramedThumb';
import {
  LAB_STATUS_COLORS as STATUS_COLORS,
  LAB_STATUS_LABELS as STATUS_LABELS,
} from './labOrderStatus';

const getPhotoThumbnail = (item) => getLabItemPhotoUrl(item);

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
        color: copied ? '#22c55e' : '#94a3b8',
        marginLeft: '6px',
        verticalAlign: 'middle',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {copied ? <Check size={12} color="#22c55e" strokeWidth={3} /> : <Copy size={11} />}
    </button>
  );
};

export default function LabOrdersTable({ title, fixedStatusFilter }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, orderItems, setOrders, employees } = useLabAuth();
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(fixedStatusFilter || 'all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter(fixedStatusFilter || 'all');
    setDateFilter('all');
    setPage(0);
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const orderNumber = getShortId(o.id, 'order');
        return orderNumber.toLowerCase().includes(q) ||
               o.id.toLowerCase().includes(q) || 
               (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
               (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
               (o.shipping_address?.phone && o.shipping_address.phone.toLowerCase().includes(q));
      });
    }

    if (fixedStatusFilter) {
      result = result.filter(o => o.status === fixedStatusFilter);
    } else if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(o => {
        const d = new Date(o.created_at);
        if (dateFilter === 'today') {
          return d.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo;
        } else if (dateFilter === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Default newest first
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result;
  }, [orders, search, statusFilter, fixedStatusFilter, dateFilter]);

  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  const getItemsCount = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F9F9F7', minHeight: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 500, color: '#1A1A1A', margin: 0, letterSpacing: '-0.02em' }}>
          {title || 'Incoming Orders'}
        </h1>
      </div>

      {/* Mockup filter bar row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        
        {/* Search input with search icon */}
        <LabSearchField
          placeholder="Search by Order ID, Customer, Email, Phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        
        {/* Status Dropdown */}
        {!fixedStatusFilter && (
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{ padding: '9px 32px 9px 14px', border: '1px solid #cbd5e1', borderRadius: 9999, backgroundColor: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '15px' }}
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        )}

        {/* Date filter dropdown */}
        <select 
          value={dateFilter} 
          onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
          style={{ padding: '9px 32px 9px 14px', border: '1px solid #cbd5e1', borderRadius: 9999, backgroundColor: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '15px' }}
        >
          <option value="all">Date Range</option>
          <option value="today">Today</option>
          <option value="week">Past 7 Days</option>
          <option value="month">This Month</option>
        </select>

        {/* Clear Filters Button */}
        <button 
          onClick={handleClearFilters}
          style={{ padding: '9px 16px', border: '1px solid #ECEAE6', borderRadius: 9999, backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          Clear
        </button>
      </div>

      {/* Main Table Container - Transparent Background */}
      <div style={{ backgroundColor: 'transparent', border: '1px solid #ECEAE6', borderRadius: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'none' }}>
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '1200px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1A1A1A', borderBottom: 'none', color: '#ffffff', fontWeight: 600, textTransform: 'none' }}>
                <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Image</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order ID</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Customer</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order Date</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Items</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Total Amount</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Priority</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Assigned To</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const orderNumber = getShortId(order.id, 'order');
                const currentOrderItems = orderItems.filter(item => item.order_id === order.id);
                
                // Format order date & time stacked into single line
                const dateObj = new Date(order.created_at);
                const orderDateString = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const orderTimeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr 
                    key={order.id} 
                    onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" style={{ cursor: 'pointer' }} />
                    </td>
                    
                    {/* Image Column */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {currentOrderItems.slice(0, 1).map((item) => (
                          <LabFramedThumb key={item.id} item={item} size={36} />
                        ))}
                      </div>
                    </td>

                    {/* Order ID */}
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 'bold', color: '#1A1A1A', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <span>{orderNumber}</span>
                      <CopyButton text={orderNumber} />
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2.5px', whiteSpace: 'nowrap' }}>
                        {order.shipping_address?.phone || order.shipping_address?.address || ''}
                      </div>
                    </td>

                    {/* Order Date (Single line format) */}
                    <td style={{ padding: '14px 16px', color: '#1e293b', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      <span>{orderDateString}</span>
                      <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                      <span style={{ color: '#64748b' }}>{orderTimeString}</span>
                    </td>

                    {/* Status Badge capsule */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: `${STATUS_COLORS[order.status]}15`,
                        color: STATUS_COLORS[order.status],
                        border: `1px solid ${STATUS_COLORS[order.status]}30`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>

                    {/* Items count */}
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {getItemsCount(order.id)}
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.total || 0)}
                    </td>

                    {/* Priority badge */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: order.priority === 'High' ? '#fee2e2' : order.priority === 'Medium' ? '#fef3c7' : '#ecfdf5',
                        color: order.priority === 'High' ? '#ef4444' : order.priority === 'Medium' ? '#d97706' : '#10b981',
                        border: `1px solid ${order.priority === 'High' ? '#fca5a5' : order.priority === 'Medium' ? '#fcd34d' : '#a7f3d0'}`,
                        whiteSpace: 'nowrap'
                      }}>{order.priority || 'Medium'}</span>
                    </td>

                    {/* Assigned To */}
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {order.assigned_employee ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          {order.assigned_employee}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', whiteSpace: 'nowrap' }}>—</span>
                      )}
                    </td>
                    
                    {/* Action buttons (removed three dots) */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                          title="Inspect Order"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ padding: '40px', textAlignment: 'center', color: '#64748b' }}>
                    No orders matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination row */}
        {filteredOrders.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', backgroundColor: '#ffffff' }}>
            <div>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Back Page */}
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: page === 0 ? 'not-allowed' : 'pointer', backgroundColor: '#fff', opacity: page === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold' }}
              >
                &lt;
              </button>

              {/* Page indices */}
              {Array.from({ length: totalPages }, (_, i) => {
                const isActive = page === i;
                return (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: isActive ? 'none' : '1px solid #cbd5e1',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#1A1A1A' : '#fff',
                      color: isActive ? '#fff' : '#475569',
                      fontWeight: 'bold'
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', backgroundColor: '#fff', opacity: page >= totalPages - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold' }}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
