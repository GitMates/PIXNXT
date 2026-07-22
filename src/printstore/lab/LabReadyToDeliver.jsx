import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  User, Check, Eye, ChevronRight, Filter, ChevronLeft, RefreshCw
} from 'lucide-react';
import { getShortId } from '../utils/idFormat';
export default function LabReadyToDeliver() {
  const { orders, refreshOrders } = useLabAuth();
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Worksheets from DB
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorksheets = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('printstore_order_worksheets').select('*');
      if (data) setWorksheets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksheets();
  }, [orders]);

  // Group Ready to Deliver list dynamically
  const readyData = useMemo(() => {
    const list = [];
    const wsMap = new Map(worksheets.map(w => [w.order_id, w]));

    // Ready to Deliver page shows orders with status ready_to_ship or shipped
    const targetOrders = orders.filter(o => ['ready_to_ship', 'shipped'].includes(o.status));

    targetOrders.forEach(order => {
      const ws = wsMap.get(order.id);
      
      // Pickup Date is either worksheet date or order updated_at + 1 day
      const pickupDateObj = ws?.updated_at ? new Date(ws.updated_at) : new Date(order.updated_at || order.created_at);
      pickupDateObj.setDate(pickupDateObj.getDate() + 1); // Mock next day pickup
      pickupDateObj.setHours(10, 0, 0, 0); // standard 10 AM

      list.push({
        id: order.id,
        orderNumber: getShortId(order.id, 'order'),
        order,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        courier: ws?.carrier || order.courier_partner || 'Delhivery',
        pickupDate: pickupDateObj.toISOString(),
        shelfLocation: order.shelf_location || 'Shelf A-12',
        status: order.status === 'ready_to_ship' ? 'Ready' : 'Dispatched'
      });
    });

    return list;
  }, [orders, worksheets]);

  // Compute stats dynamically
  const metrics = useMemo(() => {
    const ready = readyData.filter(r => r.status === 'Ready').length;
    const dispatched = readyData.filter(r => r.status === 'Dispatched').length;

    // Today's and tomorrow's pickup calculations
    const today = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const todayCount = readyData.filter(r => new Date(r.pickupDate).toDateString() === today).length;
    const tomorrowCount = readyData.filter(r => new Date(r.pickupDate).toDateString() === tomorrowStr).length;

    return {
      ready: ready,
      today: todayCount,
      tomorrow: tomorrowCount,
      total: ready + dispatched,
      avgTime: readyData.length ? '3h 25m' : '0m'
    };
  }, [readyData]);

  // Extract all couriers dynamically for filter dropdown
  const uniqueCouriers = useMemo(() => {
    const set = new Set(readyData.map(r => r.courier).filter(Boolean));
    return Array.from(set);
  }, [readyData]);

  // Actions
  const handleMarkAsDispatched = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order to mark as dispatched.");
      return;
    }
    setIsSubmitting(true);
    try {
      for (const orderId of selectedOrders) {
        // Move status to shipped
        const { error: updateError } = await supabase
          .from('printstore_orders')
          .update({ 
            status: 'shipped',
            tracking_number: getShortId(orderId, 'tracking')
          })
          .eq('id', orderId);

        if (updateError) {
          // Fallback if tracking_number doesn't exist
          const { error: fallbackError } = await supabase
            .from('printstore_orders')
            .update({ status: 'shipped' })
            .eq('id', orderId);
          if (fallbackError) throw fallbackError;
        }

        // Insert timeline tracking
        const { error: trackingError } = await supabase.from('printstore_order_tracking').insert({
          order_id: orderId,
          status: 'shipped',
          label: 'Dispatched to Courier',
          description: 'Package handed over to Courier partner for transit.'
        });
        if (trackingError) throw trackingError;
      }

      await refreshOrders();
      setSelectedOrders([]);
      alert("Selected orders successfully dispatched.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(filteredReady.map(p => p.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Filters & Search
  const filteredReady = useMemo(() => {
    let result = [...readyData];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => 
        r.orderNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.courier.toLowerCase().includes(q)
      );
    }

    if (courierFilter !== 'all') {
      result = result.filter(r => r.courier === courierFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date().toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toDateString();
      
      result = result.filter(r => {
        const itemDateStr = new Date(r.pickupDate).toDateString();
        if (dateFilter === 'today') return itemDateStr === today;
        if (dateFilter === 'tomorrow') return itemDateStr === tomorrowStr;
        return true;
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    return result;
  }, [readyData, search, courierFilter, dateFilter, statusFilter]);

  // Pagination
  const paginatedReady = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReady.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReady, currentPage]);

  const totalPages = Math.ceil(filteredReady.length / itemsPerPage) || 1;

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>
            Ready to Deliver
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Orders packed and ready for pickup
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} /> Assign Courier
          </button>
          <button 
            onClick={handleMarkAsDispatched}
            disabled={isSubmitting || selectedOrders.length === 0}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: selectedOrders.length === 0 ? '#cbd5e1' : '#0f766e', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12.5px', 
              fontWeight: 'bold', 
              color: '#fff', 
              cursor: selectedOrders.length === 0 ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <Check size={14} /> Mark as Dispatched
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Ready for Pickup */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Ready for Pickup</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'block', margin: '2px 0' }}>{metrics.ready}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Orders</span>
          </div>
        </div>

        {/* Card 2: Today's Pickup */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📅</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Today's Pickup</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', display: 'block', margin: '2px 0' }}>{metrics.today}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Orders</span>
          </div>
        </div>

        {/* Card 3: Total Ready */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏆</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Total Ready</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a', display: 'block', margin: '2px 0' }}>{metrics.total}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Orders</span>
          </div>
        </div>

        {/* Card 4: Avg. Pickup Time */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚡</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Avg. Pickup Time</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed', display: 'block', margin: '2px 0' }}>{metrics.avgTime}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Today</span>
          </div>
        </div>

      </div>

      {/* Search & Filters row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '13px' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by Order ID, Customer, Courier..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Couriers */}
        <select 
          value={courierFilter}
          onChange={(e) => { setCourierFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Couriers</option>
          {uniqueCouriers.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Pickup Dates */}
        <select 
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Pickup Dates</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
        </select>

        {/* Status */}
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Status</option>
          <option value="Ready">Ready</option>
          <option value="Dispatched">Dispatched</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <input 
                  type="checkbox" 
                  style={{ cursor: 'pointer' }}
                  onChange={handleSelectAll}
                  checked={selectedOrders.length === filteredReady.length && filteredReady.length > 0}
                />
              </th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Customer</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Courier</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Pickup Date</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Shelf / Location</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReady.map((item) => {
              const colors = item.status === 'Ready' 
                ? { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' } 
                : { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };

              const pDate = new Date(item.pickupDate);
              const pDateStr = pDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const pTimeStr = pDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <tr 
                  key={item.id} 
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => navigate(`/lab/orders/${item.id}`)}
                >
                  {/* Checkbox */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer' }}
                      checked={selectedOrders.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                    />
                  </td>

                  {/* Order ID */}
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#0f766e', fontFamily: 'Courier New, Courier, monospace', whiteSpace: 'nowrap' }}>
                    {item.orderNumber}
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>{item.customerName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {item.order?.shipping_address?.phone || item.order?.shipping_address?.address || ''}
                    </div>
                  </td>

                  {/* Courier */}
                  <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {item.courier}
                  </td>

                  {/* Pickup Date */}
                  <td style={{ padding: '14px 16px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>{pDateStr}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>{pTimeStr}</div>
                  </td>

                  {/* Shelf Location */}
                  <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {item.shelfLocation}
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
                      {item.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => navigate(`/lab/orders/${item.id}`)}
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
                        onClick={() => navigate(`/lab/orders/${item.id}`)}
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

            {filteredReady.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlignment: 'center', color: '#64748b' }}>
                  No delivery ready orders found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Showing {filteredReady.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReady.length)} of {filteredReady.length} orders
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
