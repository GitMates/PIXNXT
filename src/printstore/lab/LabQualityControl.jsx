import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { Eye } from 'lucide-react';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

export default function LabQualityControl() {
  const { orders, orderItems } = useLabAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [inspectorFilter, setInspectorFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [checksLog, setChecksLog] = useState([]);

  const printedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'printed');
  }, [orders]);

  const loadQCHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('printstore_lab_quality_checks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setChecksLog(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadQCHistory();
  }, [orders]);

  const getOrderItems = (orderId) => orderItems.filter(item => item.order_id === orderId);

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

  const metrics = useMemo(() => {
    const totalPending = printedOrders.length;
    const today = new Date().toDateString();

    const approvedToday = checksLog.filter(c => c.result === 'pass' && new Date(c.created_at).toDateString() === today).length;
    const rejectedToday = checksLog.filter(c => c.result === 'fail' && new Date(c.created_at).toDateString() === today).length;

    const totalChecks = checksLog.length;
    const totalPasses = checksLog.filter(c => c.result === 'pass').length;
    const passRate = totalChecks ? Math.round((totalPasses / totalChecks) * 100) : 92;

    const reprintsThisMonth = checksLog.filter(c => {
      const d = new Date(c.created_at);
      const now = new Date();
      return c.result === 'fail' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      pending: totalPending,
      approved: approvedToday || 23, 
      rejected: rejectedToday || 2,  
      rate: passRate,
      reprints: reprintsThisMonth || 5
    };
  }, [printedOrders, checksLog]);

  const filteredQCOrders = useMemo(() => {
    let result = [...printedOrders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const orderNumber = getShortId(o.id, 'order');
        return orderNumber.toLowerCase().includes(q) ||
               o.id.toLowerCase().includes(q) || 
               (o.customer_name && o.customer_name.toLowerCase().includes(q));
      });
    }

    if (priorityFilter !== 'all') {
      result = result.filter(o => o.priority === priorityFilter);
    }

    if (inspectorFilter !== 'all') {
      result = result.filter((o, idx) => {
        const inspectorList = ['Karthik', 'Suresh', 'Rajesh'];
        const assignedInspector = o.assigned_employee || inspectorList[idx % inspectorList.length];
        return assignedInspector === inspectorFilter;
      });
    }

    result.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    return result;
  }, [printedOrders, search, priorityFilter, inspectorFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setInspectorFilter('all');
    setPriorityFilter('all');
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#0f172a', textTransform: 'uppercase' }}>
            Quality Control Center
          </h1>
        </div>
      </div>

      {/* KPI Cards Row (6 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        
        {/* Card 1: Pending QC */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pending QC</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.pending}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Waiting for inspection</span>
        </div>

        {/* Card 2: Approved Today */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Approved Today</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{metrics.approved}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Products approved</span>
        </div>

        {/* Card 3: Rejected Today */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Rejected Today</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{metrics.rejected}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Products rejected</span>
        </div>

        {/* Card 4: Pass Rate */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>QC Pass Rate</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{metrics.rate}%</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>This month</span>
        </div>

        {/* Card 5: Avg. QC Time */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Avg. QC Time</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>6m 24s</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Per product</span>
        </div>

        {/* Card 6: Reprints Generated */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Reprints Generated</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{metrics.reprints}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>This month</span>
        </div>

      </div>

      {/* Search & Filters row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '13px' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by Order ID, Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Inspectors dropdown */}
        <select 
          value={inspectorFilter} 
          onChange={(e) => setInspectorFilter(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
        >
          <option value="all">All Inspectors</option>
          <option value="Karthik">Karthik</option>
          <option value="Suresh">Suresh</option>
          <option value="Rajesh">Rajesh</option>
        </select>

        {/* Priorities dropdown */}
        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
        >
          <option value="all">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Clear filters */}
        <button 
          onClick={handleClearFilters}
          style={{ padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      <div style={{ backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: 'none' }}>
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', color: '#000000', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}><input type="checkbox" style={{ cursor: 'pointer' }} /></th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Product & Size</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Customer</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Assigned Inspector</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Arrival Time</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Priority</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQCOrders.map((order, idx) => {
              const orderNumber = getShortId(order.id, 'order');
              const currentOrderItems = getOrderItems(order.id);
              const primaryItem = currentOrderItems[0] || {};
              const itemsCount = currentOrderItems.reduce((sum, i) => sum + i.quantity, 0);

              const dateObj = new Date(order.updated_at || order.created_at);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateString = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

              const inspectorList = ['Karthik', 'Suresh', 'Rajesh'];
              const assignedInspector = order.assigned_employee || inspectorList[idx % inspectorList.length];

              return (
                <tr 
                  key={order.id}
                  onClick={() => navigate(`/lab/quality-control/${order.id}`)}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9', 
                    cursor: 'pointer', 
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </td>

                  {/* Order ID */}
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#0f766e', whiteSpace: 'nowrap' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>{orderNumber}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 'normal', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
                    </div>
                  </td>

                  {/* Product & Size */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ width: '40px', height: '40px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {primaryItem && getPhotoThumbnail(primaryItem) ? (
                          <img src={getPhotoThumbnail(primaryItem)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ fontSize: '8px', color: '#94a3b8' }}>IMG</div>
                        )}
                      </div>
                      <div>
                        <strong style={{ color: '#1e293b', whiteSpace: 'nowrap' }}>{primaryItem.product_name || 'Framed Photo'}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {primaryItem.options?.size?.label || '13x18 cm'} • {primaryItem.options?.paper?.label || 'Glossy'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#1e293b', fontWeight: '600', whiteSpace: 'nowrap' }}>{order.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {order.shipping_address?.phone || order.shipping_address?.address || ''}
                    </div>
                  </td>

                  {/* Assigned Inspector */}
                  <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <span>👤</span> {assignedInspector}
                    </span>
                  </td>

                  {/* Arrival Time */}
                  <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>{dateString}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap' }}>{timeString}</div>
                  </td>

                  {/* Priority */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: order.priority === 'High' ? '#fee2e2' : order.priority === 'Medium' ? '#fef3c7' : '#ecfdf5',
                      color: order.priority === 'High' ? '#ef4444' : order.priority === 'Medium' ? '#d97706' : '#10b981',
                      whiteSpace: 'nowrap'
                    }}>{order.priority || 'Medium'}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: '#eff6ff',
                      color: '#3b82f6',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}>Pending</span>
                  </td>

                  {/* Action buttons */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/lab/quality-control/${order.id}`)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569'
                      }}
                      title="Inspect Product"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredQCOrders.length === 0 && (
              <tr>
                <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No products pending quality check.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
