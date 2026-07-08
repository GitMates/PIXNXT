import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, ChevronRight, Filter, Plus, RefreshCw, ChevronLeft, AlertCircle, CheckCircle, RotateCw
} from 'lucide-react';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

export default function LabReprintManager() {
  const { orders, orderItems, refreshOrders } = useLabAuth();
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // QC fail logs from DB
  const [failLogs, setFailLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFailLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('printstore_lab_quality_checks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFailLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailLogs();
  }, [orders]);

  const getOrderItems = (orderId) => orderItems.filter(item => item.order_id === orderId);

  const getPhotoThumbnail = (item) => {
    if (!item) return '';
    const opts = item.options || {};
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
    if (typeof photoOption === 'object' && photoOption.url) {
      return photoOption.url;
    }
    return '';
  };

  // Group quality checks to identify reprints dynamically
  const reprintData = useMemo(() => {
    const list = [];
    const ordersMap = new Map(orders.map(o => [o.id, o]));
    
    // Group fail checks by order_id
    const orderFailures = {};
    failLogs.forEach(log => {
      if (log.result === 'fail') {
        if (!orderFailures[log.order_id]) {
          orderFailures[log.order_id] = [];
        }
        orderFailures[log.order_id].push(log);
      }
    });

    Object.keys(orderFailures).forEach(orderId => {
      const logs = orderFailures[orderId];
      // Sort logs by date descending to find the latest
      logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestLog = logs[0];
      const order = ordersMap.get(orderId);
      
      if (order) {
        // Determine status based on current order status
        let reprintStatus = 'Pending Approval';
        if (order.status === 'printing') {
          reprintStatus = 'In Progress';
        } else if (['printed', 'packaging', 'ready_to_ship', 'shipped', 'completed'].includes(order.status)) {
          reprintStatus = 'Completed';
        }

        // Try to parse detailed description and reason from notes json
        let description = latestLog.notes;
        let originalReason = latestLog.failure_reason || 'Color Issue';
        try {
          const parsed = JSON.parse(latestLog.notes);
          if (parsed?.rejection?.description) {
            description = parsed.rejection.description;
          }
          if (parsed?.rejection?.reason) {
            originalReason = parsed.rejection.reason;
          }
        } catch (e) {
          // fallback to notes string
        }

        list.push({
          id: order.id,
          orderNumber: getShortId(order.id, 'order'),
          order,
          failedAt: latestLog.created_at,
          reason: originalReason,
          description: description || 'Color mismatch in print',
          reprintCount: logs.length,
          status: reprintStatus
        });
      }
    });

    return list;
  }, [orders, failLogs]);

  // Compute metrics dynamically from reprintData
  const metrics = useMemo(() => {
    const total = reprintData.length;
    const pending = reprintData.filter(r => r.status === 'Pending Approval').length;
    const inProgress = reprintData.filter(r => r.status === 'In Progress').length;
    const completed = reprintData.filter(r => r.status === 'Completed').length;
    
    // Reprint rate calculation based on total printstore orders
    const totalOrdersCount = orders.length || 1;
    const rate = ((total / totalOrdersCount) * 100).toFixed(1);

    return {
      total: total,
      pending: pending,
      inProgress: inProgress,
      completed: completed,
      rate: rate
    };
  }, [reprintData, orders]);

  // Filters & Search
  const filteredReprints = useMemo(() => {
    let result = [...reprintData];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => 
        r.orderNumber.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.order?.customer_name && r.order.customer_name.toLowerCase().includes(q))
      );
    }

    if (reasonFilter !== 'all') {
      result = result.filter(r => r.reason === reasonFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Sort
    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.failedAt) - new Date(a.failedAt));
    } else {
      result.sort((a, b) => new Date(a.failedAt) - new Date(b.failedAt));
    }

    return result;
  }, [reprintData, search, reasonFilter, statusFilter, sortBy]);

  // Pagination
  const paginatedReprints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReprints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReprints, currentPage]);

  const totalPages = Math.ceil(filteredReprints.length / itemsPerPage) || 1;

  // Extract all reasons dynamically for filter dropdown
  const uniqueReasons = useMemo(() => {
    const set = new Set(reprintData.map(r => r.reason));
    return Array.from(set);
  }, [reprintData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <div className="lab-spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>
            Reprints
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Manage failed items and reprints
          </p>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Reprints', value: metrics.total, sub: 'This month', color: '#3b82f6', bg: '#eff6ff', icon: '📋' },
          { label: 'Pending Reprints', value: metrics.pending, sub: 'Awaiting approval', color: '#f59e0b', bg: '#fffbeb', icon: '⏱️' },
          { label: 'In Progress', value: metrics.inProgress, sub: 'Being reprinted', color: '#8b5cf6', bg: '#f5f3ff', icon: '🔄' },
          { label: 'Completed', value: metrics.completed, sub: 'This month', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
          { label: 'Reprint Rate', value: `${metrics.rate}%`, sub: 'Of total orders', color: '#ef4444', bg: '#fee2e2', icon: '📊' }
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              {card.icon}
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>{card.label}</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'block', margin: '2px 0' }}>{card.value}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '13px' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by Order ID, Customer, Product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Reasons */}
        <select 
          value={reasonFilter}
          onChange={(e) => { setReasonFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Reasons</option>
          {uniqueReasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Status */}
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Status</option>
          <option value="Pending Approval">Pending Approval</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Sorting */}
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '150px' }}
        >
          <option value="latest">Sort: Latest First</option>
          <option value="oldest">Sort: Oldest First</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Customer</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Product & Issue</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Failed At</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Reason</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Reprint Count</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReprints.map((reprint) => {
              const currentOrderItems = getOrderItems(reprint.id);
              const primaryItem = currentOrderItems[0] || {};
              const failedDate = new Date(reprint.failedAt);
              const failedDateStr = failedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const failedTimeStr = failedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const getStatusColors = (status) => {
                if (status === 'Pending Approval') return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
                if (status === 'In Progress') return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' };
                return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' };
              };

              const colors = getStatusColors(reprint.status);

              return (
                <tr 
                  key={reprint.id} 
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => navigate(`/lab/orders/${reprint.id}`)}
                >
                  {/* Order ID */}
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#0f766e', fontFamily: 'Courier New, Courier, monospace', whiteSpace: 'nowrap' }}>
                    {reprint.orderNumber}
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>{reprint.order?.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {reprint.order?.shipping_address?.phone || reprint.order?.shipping_address?.address || ''}
                    </div>
                  </td>

                  {/* Product & Issue */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {primaryItem.product_name || 'Canvas Print'} ({primaryItem.options?.size?.label || '20x30 cm'})
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
                      {reprint.description}
                    </div>
                  </td>

                  {/* Failed At */}
                  <td style={{ padding: '14px 16px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>{failedDateStr}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>{failedTimeStr}</div>
                  </td>

                  {/* Reason */}
                  <td style={{ padding: '14px 16px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {reprint.reason}
                  </td>

                  {/* Reprint Count */}
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: '#475569', whiteSpace: 'nowrap' }}>
                    {reprint.reprintCount}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }} onClick={(e) => e.stopPropagation()}>
                      {reprint.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => navigate(`/lab/orders/${reprint.id}`)}
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
                          color: '#475569'
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/lab/orders/${reprint.id}`)}
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
                          color: '#475569'
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredReprints.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlignment: 'center', color: '#64748b' }}>
                  No reprint items found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Showing {filteredReprints.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReprints.length)} of {filteredReprints.length} reprints
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{ 
              padding: '6px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff', 
              color: '#475569', 
              fontSize: '12px', 
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer' 
            }}
          >
            &lt;
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => (
            <button 
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              style={{ 
                padding: '6px 12px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                backgroundColor: currentPage === idx + 1 ? '#0f766e' : '#fff', 
                color: currentPage === idx + 1 ? '#fff' : '#475569', 
                fontSize: '12px', 
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {idx + 1}
            </button>
          ))}

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            style={{ 
              padding: '6px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff', 
              color: '#475569', 
              fontSize: '12px', 
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' 
            }}
          >
            &gt;
          </button>
        </div>
      </div>

    </div>
  );
}
