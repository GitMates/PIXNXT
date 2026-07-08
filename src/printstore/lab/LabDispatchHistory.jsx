import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Filter, Eye, ChevronRight, Copy, Share2, MapPin, Truck, Check, Calendar, Plus
} from 'lucide-react';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

export default function LabDispatchHistory() {
  const { orders, orderItems } = useLabAuth();
  const navigate = useNavigate();

  // Filters state
  const [timeFilter, setTimeFilter] = useState('all'); // all, today, yesterday, week, month
  const [courierFilter, setCourierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);

  // DB Data states
  const [worksheets, setWorksheets] = useState([]);
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: wsData } = await supabase.from('printstore_order_worksheets').select('*');
      if (wsData) setWorksheets(wsData);

      const { data: trackData } = await supabase
        .from('printstore_order_tracking')
        .select('*')
        .order('created_at', { ascending: false });
      if (trackData) setTrackingLogs(trackData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // Group Dispatch list dynamically
  const dispatchData = useMemo(() => {
    const list = [];
    const wsMap = new Map(worksheets.map(w => [w.order_id, w]));

    // Dispatch History shows orders with status shipped or completed
    const targetOrders = orders.filter(o => ['shipped', 'completed'].includes(o.status));

    targetOrders.forEach(order => {
      const ws = wsMap.get(order.id);
      const currentItems = getOrderItems(order.id);
      const itemsCount = currentItems.reduce((sum, i) => sum + i.quantity, 0);

      const dispatchDateObj = ws?.updated_at ? new Date(ws.updated_at) : new Date(order.updated_at || order.created_at);
      
      let deliveryDateStr = '';
      if (order.status === 'completed') {
        const delDate = new Date(order.updated_at);
        deliveryDateStr = delDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      list.push({
        id: order.id,
        orderNumber: getShortId(order.id, 'order'),
        order,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        itemsCount,
        total: order.total || 0,
        thumbnail: currentItems.length > 0 ? getPhotoThumbnail(currentItems[0]) : '',
        courier: ws?.carrier || order.courier_partner || 'Delhivery',
        trackingNo: ws?.tracking_number || order.tracking_number || '1234567890123',
        dispatchedAt: dispatchDateObj.toISOString(),
        status: order.status === 'completed' ? 'Delivered' : 'In Transit',
        deliveryInfo: order.status === 'completed' ? deliveryDateStr : 'Out for Delivery'
      });
    });

    return list;
  }, [orders, worksheets, orderItems]);

  // Dynamic filter processing
  const filteredDispatches = useMemo(() => {
    let result = [...dispatchData];

    // Time filter
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    if (timeFilter !== 'all') {
      result = result.filter(d => {
        const dispDate = new Date(d.dispatchedAt);
        if (timeFilter === 'today') return dispDate.toDateString() === today;
        if (timeFilter === 'yesterday') return dispDate.toDateString() === yesterdayStr;
        if (timeFilter === 'week') return dispDate >= startOfWeek;
        if (timeFilter === 'month') return dispDate >= startOfMonth;
        return true;
      });
    }

    // Courier filter
    if (courierFilter !== 'all') {
      result = result.filter(d => d.courier.toLowerCase() === courierFilter.toLowerCase());
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => 
        d.orderNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.trackingNo.toLowerCase().includes(q)
      );
    }

    return result;
  }, [dispatchData, timeFilter, courierFilter, statusFilter, search]);

  // Group filtered data by Date for the table listing layout
  const groupedDispatches = useMemo(() => {
    const groups = {};
    const visibleList = filteredDispatches.slice(0, visibleCount);

    visibleList.forEach(item => {
      const dateStr = new Date(item.dispatchedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(item);
    });

    return groups;
  }, [filteredDispatches, visibleCount]);

  // Metrics computation
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const dispatchedToday = dispatchData.filter(d => new Date(d.dispatchedAt).toDateString() === today).length;
    const deliveredToday = dispatchData.filter(d => d.status === 'Delivered' && new Date(d.order.updated_at).toDateString() === today).length;
    const inTransit = dispatchData.filter(d => d.status === 'In Transit').length;

    const deliveredThisMonth = dispatchData.filter(d => {
      const u = new Date(d.order.updated_at);
      return d.status === 'Delivered' && u.getMonth() === thisMonth && u.getFullYear() === thisYear;
    }).length;

    const successRate = dispatchData.length ? ((dispatchData.filter(d => d.status === 'Delivered').length / dispatchData.length) * 100).toFixed(1) : '100.0';

    return {
      dispatchedToday,
      deliveredToday,
      inTransit,
      deliveredThisMonth,
      successRate
    };
  }, [dispatchData]);

  // Analytics - Donut Chart shares calculation
  const donutShares = useMemo(() => {
    const total = dispatchData.length;
    if (!total) {
      return {
        delivered: { count: 0, pct: 0 },
        inTransit: { count: 0, pct: 0 },
        outForDelivery: { count: 0, pct: 0 },
        failed: { count: 0, pct: 0 }
      };
    }
    const delivered = dispatchData.filter(d => d.status === 'Delivered').length;
    const inTransit = dispatchData.filter(d => d.status === 'In Transit').length;
    
    // Out for delivery is subset of transit
    const outForDelivery = Math.round(inTransit * 0.35);
    const inTransitRemaining = inTransit - outForDelivery;
    const failed = 0; // standard default since this page shows successfully shipped/completed

    const delPct = Math.round((delivered / total) * 100);
    const transPct = Math.round((inTransitRemaining / total) * 100);
    const outPct = Math.round((outForDelivery / total) * 100);
    const failPct = Math.round((failed / total) * 100);

    return {
      delivered: { count: delivered, pct: delPct },
      inTransit: { count: inTransitRemaining, pct: transPct },
      outForDelivery: { count: outForDelivery, pct: outPct },
      failed: { count: failed, pct: failPct }
    };
  }, [dispatchData]);

  // Analytics - Courier Performance Card
  const courierPerf = useMemo(() => {
    const map = {};
    dispatchData.forEach(d => {
      if (!map[d.courier]) {
        map[d.courier] = { count: 0, delivered: 0 };
      }
      map[d.courier].count += 1;
      if (d.status === 'Delivered') {
        map[d.courier].delivered += 1;
      }
    });

    const list = Object.keys(map).map(c => {
      const perf = map[c];
      const rate = perf.count ? ((perf.delivered / perf.count) * 100).toFixed(1) : '100.0';
      return {
        name: c,
        count: perf.count,
        rate
      };
    });

    // Sort by count desc
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [dispatchData]);

  // Analytics - Top Customers Card
  const topCustomers = useMemo(() => {
    const map = {};
    dispatchData.forEach(d => {
      if (!map[d.customerName]) {
        map[d.customerName] = { count: 0, spend: 0 };
      }
      map[d.customerName].count += 1;
      map[d.customerName].spend += d.total;
    });

    const list = Object.keys(map).map(name => ({
      name,
      orders: map[name].count,
      spend: Math.round(map[name].spend)
    }));

    list.sort((a, b) => b.spend - a.spend);
    return list.slice(0, 3);
  }, [dispatchData]);

  // Analytics - Recent Activities Card
  const recentActivities = useMemo(() => {
    const list = trackingLogs.slice(0, 3).map(log => {
      let color = '#10b981'; // green default
      if (log.status === 'printing' || log.status === 'reprint') color = '#f59e0b'; // orange
      else if (log.status === 'shipped') color = '#2563eb'; // blue
      
      const date = new Date(log.created_at);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + `, ` + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: log.id,
        desc: log.description || `Order status updated to ${log.status}`,
        time: dateStr,
        color
      };
    });
    return list;
  }, [trackingLogs]);

  // Helper copy text
  const handleCopyText = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const exportCSV = () => {
    if (filteredDispatches.length === 0) return;
    const headers = 'Order Number,Customer Name,Courier,Tracking ID,Dispatched At,Status,Total Amount\n';
    const rows = filteredDispatches.map(d => 
      `"${d.orderNumber}","${d.customerName}","${d.courier}","${d.trackingNo}","${new Date(d.dispatchedAt).toLocaleString()}","${d.status}",${d.total}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `dispatch_history_${new Date().toISOString().substring(0,10)}.csv`);
    a.click();
  };

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
            Dispatch History
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Track all dispatched orders and delivery status in real-time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={exportCSV}
            style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Dispatched Today', value: metrics.dispatchedToday, sub: 'Orders left Noida', color: '#3b82f6', bg: '#eff6ff', icon: '📦' },
          { label: 'Delivered Today', value: metrics.deliveredToday, sub: 'Confirmed drops', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
          { label: 'In Transit', value: metrics.inTransit, sub: 'Currently en route', color: '#ea580c', bg: '#fff4e6', icon: '🚚' },
          { label: 'Delivered This Month', value: metrics.deliveredThisMonth, sub: 'Successful deliveries', color: '#8b5cf6', bg: '#f5f3ff', icon: '🏆' },
          { label: 'Success Rate', value: `${metrics.successRate}%`, sub: 'First-attempt success', color: '#10b981', bg: '#ecfdf5', icon: '📊' }
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

      {/* Date Filters pills row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' }
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => { setTimeFilter(pill.id); setVisibleCount(5); }}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 'bold',
                backgroundColor: timeFilter === pill.id ? '#0f766e' : '#fff',
                color: timeFilter === pill.id ? '#fff' : '#64748b',
                cursor: 'pointer',
                boxShadow: timeFilter === pill.id ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '13px' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by Order ID, Customer, Tracking No..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(5); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Couriers */}
        <select 
          value={courierFilter}
          onChange={(e) => { setCourierFilter(e.target.value); setVisibleCount(5); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '135px' }}
        >
          <option value="all">All Couriers</option>
          <option value="delhivery">Delhivery</option>
          <option value="bluedart">BlueDart</option>
          <option value="india post">India Post</option>
          <option value="dtdc">DTDC</option>
        </select>

        {/* Status */}
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(5); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '135px' }}
        >
          <option value="all">All Status</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {/* Full-width Timeline List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {Object.keys(groupedDispatches).map(dateStr => (
          <div key={dateStr}>
            
            {/* Date separator heading */}
            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {dateStr}
            </h4>

            {/* Dispatch cards under date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupedDispatches[dateStr].map(item => {
                const isDelivered = item.status === 'Delivered';
                const dispatchTime = new Date(item.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Estimate delivery (3 days from dispatch)
                const estDate = new Date(item.dispatchedAt);
                estDate.setDate(estDate.getDate() + 3);
                const estDeliveryStr = estDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <div 
                    key={item.id}
                    onClick={() => navigate(`/lab/orders/${item.id}`)}
                    style={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      padding: '16px', 
                      display: 'grid', 
                      gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.2fr 30px', 
                      gap: '16px', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)'}
                  >
                    {/* Order info & thumbnail */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#94a3b8' }}>📦</div>
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#0f766e', fontFamily: 'Courier New, Courier, monospace', fontSize: '13px' }}>
                            {item.orderNumber}
                          </span>
                          <Share2 size={11} color="#64748b" onClick={(e) => handleCopyText(e, item.orderNumber)} style={{ cursor: 'pointer' }} />
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {item.customerName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {item.order?.shipping_address?.phone || item.order?.shipping_address?.address || ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {item.itemsCount} Item &bull; ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Courier Partner & Tracking */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                        <Truck size={14} color="#0f766e" /> {item.courier}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap' }}>Tracking ID</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {item.trackingNo}
                        </span>
                        <Copy size={11} color="#64748b" onClick={(e) => handleCopyText(e, item.trackingNo)} style={{ cursor: 'pointer' }} />
                      </div>
                    </div>

                    {/* Dispatched At details */}
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>Dispatched At</span>
                      <strong style={{ display: 'block', fontSize: '12.5px', color: '#1e293b', marginTop: '2px', whiteSpace: 'nowrap' }}>{dispatchTime}</strong>
                    </div>

                    {/* Est. Delivery */}
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>Est. Delivery</span>
                      <strong style={{ display: 'block', fontSize: '11px', color: '#1e293b', marginTop: '2px', lineHeight: '1.3', whiteSpace: 'nowrap' }}>{estDeliveryStr}</strong>
                    </div>

                    {/* Delivery Status Badge */}
                    <div>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: isDelivered ? '#ecfdf5' : '#eff6ff',
                        color: isDelivered ? '#10b981' : '#2563eb',
                        border: `1px solid ${isDelivered ? '#a7f3d0' : '#bfdbfe'}`,
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.status}
                      </span>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                        {isDelivered && <Check size={10} color="#10b981" />}
                        <span style={{ whiteSpace: 'nowrap' }}>{item.deliveryInfo}</span>
                      </div>
                    </div>

                    {/* Right chevron button link */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ))}

        {filteredDispatches.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            No dispatched orders found matching filters.
          </div>
        )}

      </div>

      {/* Load More Button */}
      {visibleCount < filteredDispatches.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <button 
            onClick={() => setVisibleCount(prev => prev + 5)}
            style={{ 
              padding: '10px 24px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              backgroundColor: '#fff', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              color: '#475569', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Load More &bull; ({filteredDispatches.length - visibleCount} remaining)
          </button>
        </div>
      )}

    </div>
  );
}
