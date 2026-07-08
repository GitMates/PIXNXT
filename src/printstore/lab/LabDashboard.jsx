import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { orders, orderItems, initialLoaded, refreshOrders } = useLabAuth();
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeFilter, setActiveFilter] = useState('this_month'); // this_month, last_month, this_week, today

  useEffect(() => {
    if (refreshOrders) {
      refreshOrders();
    }
    const interval = setInterval(() => {
      if (refreshOrders) refreshOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  // Retrieve logged-in employee from localStorage session
  const operatorName = useMemo(() => {
    try {
      const cached = localStorage.getItem('pixnxt_lab_session');
      if (cached) {
        const session = JSON.parse(cached);
        const namePart = session.email ? session.email.split('@')[0] : 'Lab';
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
      }
    } catch (e) {}
    return 'Lab';
  }, []);

  // Format today's date
  const todayFormatted = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  // ── Date range helpers ──
  const getDateRange = (filter) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    switch (filter) {
      case 'today':
        return { start: todayStart, end: todayEnd };
      case 'this_week': {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday start
        return { start: weekStart, end: todayEnd };
      }
      case 'last_month': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start: lastMonthStart, end: lastMonthEnd };
      }
      case 'this_month':
      default: {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: todayEnd };
      }
    }
  };

  // ── Filtered orders based on activeFilter ──
  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRange(activeFilter);
    return orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });
  }, [orders, activeFilter]);

  // ── Comparison period orders (previous equivalent period) ──
  const comparisonOrders = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (activeFilter) {
      case 'today': {
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start = yesterday;
        end = new Date(yesterday.getTime() + 86400000);
        break;
      }
      case 'this_week': {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const prevWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
        start = prevWeekStart;
        end = weekStart;
        break;
      }
      case 'last_month': {
        const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        start = twoMonthsAgoStart;
        end = twoMonthsAgoEnd;
        break;
      }
      case 'this_month':
      default: {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        start = lastMonthStart;
        end = lastMonthEnd;
        break;
      }
    }

    return orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });
  }, [orders, activeFilter]);

  // ── TOP ROW: Operational KPIs (always today-based) ──
  const operationalStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const todaysOrders = orders.filter(o => {
      if (!o.created_at) return false;
      return new Date(o.created_at).toDateString() === todayStr;
    });

    const todaysRevenue = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const packedOrders = orders.filter(o => ['packaging', 'ready_to_ship'].includes(o.status)).length;
    const printedOrders = orders.filter(o => o.status === 'printed').length;
    const dispatchedOrders = orders.filter(o => ['shipped', 'completed'].includes(o.status)).length;

    return {
      todaysOrders: todaysOrders.length,
      todaysRevenue,
      packedOrders,
      printedOrders,
      dispatchedOrders
    };
  }, [orders]);

  // ── BOTTOM ROW: Analytics KPIs (filter-dependent) ──
  const analyticsStats = useMemo(() => {
    const curRev = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevRev = comparisonOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const revChange = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;

    const curCount = filteredOrders.length;
    const prevCount = comparisonOrders.length;
    const countChange = prevCount > 0 ? ((curCount - prevCount) / prevCount) * 100 : 0;

    const curAov = curCount > 0 ? curRev / curCount : 0;
    const prevAov = prevCount > 0 ? prevRev / prevCount : 0;
    const aovChange = prevAov > 0 ? ((curAov - prevAov) / prevAov) * 100 : 0;

    // Average items count per order
    const curItemIds = filteredOrders.map(o => o.id);
    const curItems = orderItems.filter(item => curItemIds.includes(item.order_id));
    const curTotalItems = curItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const averageOrderItems = curCount > 0 ? (curTotalItems / curCount) : 0;

    const prevItemIds = comparisonOrders.map(o => o.id);
    const prevItems = orderItems.filter(item => prevItemIds.includes(item.order_id));
    const prevTotalItems = prevItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const averageOrderItemsPrev = prevCount > 0 ? (prevTotalItems / prevCount) : 0;
    const itemsChange = averageOrderItemsPrev > 0 ? ((averageOrderItems - averageOrderItemsPrev) / averageOrderItemsPrev) * 100 : 0;

    return {
      salesPerformance: curRev,
      revChange,
      totalSales: curCount,
      countChange,
      averageRevenue: curAov,
      aovChange,
      averageOrderItems,
      itemsChange
    };
  }, [filteredOrders, comparisonOrders, orderItems]);

  // ── Chart: Total Revenue line chart (28 days) ──
  const chartDays = Array.from({ length: 28 }, (_, i) => i + 1);

  const thisMonthLineData = useMemo(() => {
    const now = new Date();
    const dayTotals = Array(28).fill(0);
    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        const day = d.getDate();
        if (day >= 1 && day <= 28) {
          dayTotals[day - 1] += (o.total || 0);
        }
      }
    });
    return dayTotals;
  }, [orders]);

  const lastMonthLineData = useMemo(() => {
    const now = new Date();
    const dayTotals = Array(28).fill(0);
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() - 1;
    if (targetMonth < 0) { targetMonth = 11; targetYear -= 1; }
    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        const day = d.getDate();
        if (day >= 1 && day <= 28) {
          dayTotals[day - 1] += (o.total || 0);
        }
      }
    });
    return dayTotals;
  }, [orders]);

  // SVG scaling
  const svgWidth = 700;
  const svgHeight = 180;
  const allVals = [...thisMonthLineData, ...lastMonthLineData];
  const maxVal = Math.max(...allVals, 1) * 1.15;
  const minVal = Math.min(...allVals.filter(v => v > 0), 0) * 0.9;

  const pointsThisMonth = thisMonthLineData.map((val, i) => {
    const x = (i / 27) * svgWidth;
    const range = maxVal - minVal || 1;
    const y = svgHeight - 20 - ((val - minVal) / range) * (svgHeight - 40);
    return { x, y: isNaN(y) ? svgHeight - 20 : y, day: i + 1, val };
  });

  const pointsLastMonth = lastMonthLineData.map((val, i) => {
    const x = (i / 27) * svgWidth;
    const range = maxVal - minVal || 1;
    const y = svgHeight - 20 - ((val - minVal) / range) * (svgHeight - 40);
    return { x, y: isNaN(y) ? svgHeight - 20 : y, day: i + 1, val };
  });

  const pathThisMonth = `M ${pointsThisMonth.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const pathLastMonth = `M ${pointsLastMonth.map(p => `${p.x},${p.y}`).join(' L ')}`;

  const totalRevenue = analyticsStats.salesPerformance + comparisonOrders.reduce((s, o) => s + (o.total || 0), 0);

  // ── Popular Products ──
  const popularProductsList = useMemo(() => {
    const targetIds = filteredOrders.map(o => o.id);
    const relevantItems = orderItems.filter(item => targetIds.includes(item.order_id));
    const counts = {};
    relevantItems.forEach(item => {
      const opts = item.options || {};
      const key = opts.size?.label 
        ? `${opts.size.label} ${item.product_name}` 
        : item.product_name;
      counts[key] = (counts[key] || 0) + (item.quantity || 1);
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
      return [{ name: 'No products yet', count: 0, pct: 0 }];
    }

    const maxCount = sorted[0].count || 1;
    return sorted.slice(0, 6).map((item) => ({
      name: item.name,
      count: item.count,
      pct: Math.round((item.count / maxCount) * 100)
    }));
  }, [filteredOrders, orderItems]);

  const colorsProgress = ['#f97316', '#a855f7', '#3b82f6', '#22c55e', '#ec4899', '#06b6d4'];

  // ── Dynamic Bottom Charts Data ──

  // Average Order Value bar chart - daily AOV for filtered period
  const aovBarData = useMemo(() => {
    const bars = Array(15).fill(0);
    const counts = Array(15).fill(0);
    const { start } = getDateRange(activeFilter);
    
    filteredOrders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const daysSinceStart = Math.floor((d - start) / 86400000);
      const idx = Math.min(Math.max(0, daysSinceStart), 14);
      bars[idx] += (o.total || 0);
      counts[idx] += 1;
    });

    return bars.map((total, i) => counts[i] > 0 ? Math.round(total / counts[i]) : 0);
  }, [filteredOrders, activeFilter]);

  // Average Daily Sales line chart
  const dailySalesData = useMemo(() => {
    const points = Array(15).fill(0);
    const { start } = getDateRange(activeFilter);

    filteredOrders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const daysSinceStart = Math.floor((d - start) / 86400000);
      const idx = Math.min(Math.max(0, daysSinceStart), 14);
      points[idx] += 1;
    });

    return points;
  }, [filteredOrders, activeFilter]);

  // Total Items bar chart - daily items count
  const totalItemsBarData = useMemo(() => {
    const bars = Array(15).fill(0);
    const targetIds = filteredOrders.map(o => o.id);
    const relevantItems = orderItems.filter(item => targetIds.includes(item.order_id));
    const { start } = getDateRange(activeFilter);

    filteredOrders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const daysSinceStart = Math.floor((d - start) / 86400000);
      const idx = Math.min(Math.max(0, daysSinceStart), 14);
      const oItems = relevantItems.filter(item => item.order_id === o.id);
      const qty = oItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      bars[idx] += qty;
    });

    return bars;
  }, [filteredOrders, orderItems, activeFilter]);

  // Mouse interaction for main chart
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgMouseX = mouseX * scaleX;

    let closestIdx = 0;
    let minDiff = Infinity;
    pointsThisMonth.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgMouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const ptThis = pointsThisMonth[closestIdx];
    const ptLast = pointsLastMonth[closestIdx];
    const change = ptLast.val > 0 ? ((ptThis.val - ptLast.val) / ptLast.val * 100) : 0;
    setHoveredPoint({
      day: ptThis.day,
      thisMonthVal: ptThis.val,
      lastMonthVal: ptLast.val,
      change,
      x: ptThis.x,
      y: ptThis.y
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // INR formatter
  const fmtINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const compLabel = activeFilter === 'today' ? 'vs yesterday' 
    : activeFilter === 'this_week' ? 'vs last week' 
    : activeFilter === 'last_month' ? 'vs prev month' 
    : 'vs last month';

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'short' });

  // Dynamic bottom widget values
  const avgDailySales = filteredOrders.length > 0 ? Math.max(1, Math.round(filteredOrders.length / Math.max(1, new Date().getDate()))) : 0;
  const totalItems = orderItems.filter(item => filteredOrders.map(o => o.id).includes(item.order_id)).reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Filter button config
  const filterButtons = [
    { key: 'this_month', label: '📅 This Month' },
    { key: 'this_week', label: '📊 This Week' },
    { key: 'today', label: '🕐 Today' },
    { key: 'last_month', label: '📋 Last Month' }
  ];

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Greeting and Filter Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a' }}>
            Hey, {operatorName}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{todayFormatted}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {filterButtons.map(btn => (
            <button 
              key={btn.key}
              onClick={() => setActiveFilter(btn.key)}
              style={{ 
                padding: '8px 14px', 
                backgroundColor: activeFilter === btn.key ? '#0f172a' : '#fff', 
                color: activeFilter === btn.key ? '#fff' : '#334155', 
                border: activeFilter === btn.key ? 'none' : '1px solid #e2e8f0', 
                borderRadius: '6px', 
                fontSize: '12.5px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 1: Operational KPI Cards (5 Columns) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '16px' }}>
        
        {/* Today's Orders */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📦</div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Today's Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.todaysOrders}</span>
        </div>

        {/* Today's Revenue */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>💰</div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Today's Revenue</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(operationalStats.todaysRevenue)}</span>
        </div>

        {/* Packed Orders */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Packed Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.packedOrders}</span>
        </div>

        {/* Printed Orders */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🖨️</div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Printed Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.printedOrders}</span>
        </div>

        {/* Dispatched */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚚</div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Dispatched</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.dispatchedOrders}</span>
        </div>
      </div>

      {/* ── ROW 2: Analytics KPI Cards (4 Columns) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        
        {/* Sales Performance */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>📈 Sales Performance</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.salesPerformance)}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.revChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.revChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.revChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.revChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Total Sales */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>🏷️ Total Sales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{analyticsStats.totalSales.toLocaleString('en-IN')}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.countChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.countChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.countChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.countChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Average Revenue */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>💸 Average Revenue</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.averageRevenue)}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.aovChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.aovChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.aovChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.aovChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Average Order */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>🛍️ Average Order</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{analyticsStats.averageOrderItems.toFixed(1)} Items</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.itemsChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.itemsChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.itemsChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.itemsChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Charts Row: Revenue + Popular Products ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Total Revenue Double Line Chart */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>Total Revenue</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8', cursor: 'help' }}>❓</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              {fmtINR(totalRevenue)}
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: analyticsStats.revChange >= 0 ? '#10b981' : '#ef4444' }}>
              {analyticsStats.revChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.revChange).toFixed(1)}% {compLabel}
            </span>

            {/* Chart legends */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '11.5px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f172a' }} /> This month
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} /> Last month
              </span>
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div 
            style={{ width: '100%', height: '200px', position: 'relative', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="70" x2={svgWidth} y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="110" x2={svgWidth} y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#f1f5f9" strokeWidth="1" />

              {/* Last Month line */}
              <path d={pathLastMonth} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* This Month line */}
              <path d={pathThisMonth} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Bottom reference */}
              <line x1="0" y1={svgHeight - 15} x2={svgWidth} y2={svgHeight - 15} stroke="#cbd5e1" strokeWidth="1" />

              {/* Tooltip cursor */}
              {hoveredPoint && (
                <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2={svgHeight - 15} stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" />
              )}

              {/* X Axis Labels */}
              <text x="5" y={svgHeight} fill="#94a3b8" fontSize="9">{currentMonthName} 01</text>
              <text x="90" y={svgHeight} fill="#94a3b8" fontSize="9">03</text>
              <text x="180" y={svgHeight} fill="#94a3b8" fontSize="9">07</text>
              <text x="270" y={svgHeight} fill="#94a3b8" fontSize="9">11</text>
              <text x="360" y={svgHeight} fill="#94a3b8" fontSize="9">15</text>
              <text x="450" y={svgHeight} fill="#94a3b8" fontSize="9">19</text>
              <text x="540" y={svgHeight} fill="#94a3b8" fontSize="9">23</text>
              <text x="630" y={svgHeight} fill="#94a3b8" fontSize="9">28</text>
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
              <div style={{
                position: 'absolute',
                left: `${Math.min((hoveredPoint.x / svgWidth) * 90, 80)}%`,
                top: `${Math.max(hoveredPoint.y - 65, 5)}px`,
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                pointerEvents: 'none',
                zIndex: 100,
                fontSize: '11px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                  Day {hoveredPoint.day} 
                  <span style={{ color: hoveredPoint.change >= 0 ? '#22c55e' : '#ef4444', marginLeft: '6px' }}>
                    {hoveredPoint.change >= 0 ? '↑' : '↓'} {Math.abs(hoveredPoint.change).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1f2937' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
                  <span>This Month: <strong>{fmtINR(hoveredPoint.thisMonthVal)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                  <span>Last Month: <strong>{fmtINR(hoveredPoint.lastMonthVal)}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popular Product Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Popular Product</strong>
            <span style={{ fontSize: '11px', color: '#94a3b8', cursor: 'help' }}>❓</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {popularProductsList.map((prod, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {prod.name}
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 'bold' }}>
                    {prod.count.toLocaleString()} Sales
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${prod.pct}%`, 
                      height: '100%', 
                      backgroundColor: colorsProgress[idx % colorsProgress.length], 
                      borderRadius: '4px',
                      transition: 'width 0.4s ease-out'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Labeled Charts Row (3 Columns) - Fully Connected with Axis Numbers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        
        {/* Card 1: Average Order Value - Bar Chart with Axes & Data Labels */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Average Order Value</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.salesPerformance / Math.max(analyticsStats.totalSales, 1))}</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.aovChange >= 0 ? '#10b981' : '#ef4444' }}>
                {analyticsStats.aovChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.aovChange).toFixed(1)}% {compLabel}
              </span>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '100px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 100" style={{ overflow: 'visible' }}>
              {(() => {
                const maxVal = Math.max(...aovBarData, 100);
                const xStart = 45;
                const xEnd = 290;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;
                
                // Y-Axis grid lines & labels
                return (
                  <>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{fmtINR(maxVal)}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{fmtINR(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">₹0</text>

                    {/* Bars rendering */}
                    {aovBarData.map((val, i) => {
                      const barW = Math.max(2, Math.floor((xEnd - xStart) / 15) - 4);
                      const barX = xStart + i * ((xEnd - xStart) / 15) + 2;
                      const barH = (val / maxVal) * heightRange;
                      const barY = yEnd - barH;

                      return (
                        <g key={i}>
                          <rect x={barX} y={barY} width={barW} height={Math.max(barH, 1)} fill="#f97316" rx="1" />
                          {val > 0 && (
                            <text x={barX + barW / 2} y={barY - 3} textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">
                              {Math.round(val)}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* X-Axis labels */}
                    <text x={xStart + 5} y="94" fill="#94a3b8" fontSize="8">Day 1</text>
                    <text x={(xStart + xEnd) / 2} y="94" textAnchor="middle" fill="#94a3b8" fontSize="8">Day 8</text>
                    <text x={xEnd - 20} y="94" fill="#94a3b8" fontSize="8">Day 15</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Card 2: Average Sales - Line Chart with Axes & Data Labels */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Average Sales</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{avgDailySales.toLocaleString('en-IN')} Orders</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.countChange >= 0 ? '#10b981' : '#ef4444' }}>
                {analyticsStats.countChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.countChange).toFixed(1)}% {compLabel}
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '100px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 100" style={{ overflow: 'visible' }}>
              {(() => {
                const maxVal = Math.max(...dailySalesData, 5);
                const xStart = 35;
                const xEnd = 290;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;

                const points = dailySalesData.map((val, i) => {
                  const x = xStart + (i / (dailySalesData.length - 1)) * (xEnd - xStart);
                  const y = yEnd - (val / maxVal) * heightRange;
                  return { x, y, val };
                });

                const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
                const areaPath = `${linePath} L ${xEnd},${yEnd} L ${xStart},${yEnd} Z`;

                return (
                  <>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{maxVal}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{Math.round(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">0</text>

                    <path d={areaPath} fill="url(#orangeGrad)" />
                    <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2" />

                    {/* Data labels on vertices */}
                    {points.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="3" fill="#f97316" stroke="#fff" strokeWidth="1" />
                        {pt.val > 0 && (
                          <text x={pt.x} y={pt.y - 6} textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">
                            {pt.val}
                          </text>
                        )}
                      </g>
                    ))}

                    <text x={xStart + 5} y="94" fill="#94a3b8" fontSize="8">Day 1</text>
                    <text x={(xStart + xEnd) / 2} y="94" textAnchor="middle" fill="#94a3b8" fontSize="8">Day 8</text>
                    <text x={xEnd - 20} y="94" fill="#94a3b8" fontSize="8">Day 15</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Card 3: Total Items - Bar Chart with Axes & Data Labels */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Total Items</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{totalItems.toLocaleString('en-IN')} Items</span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Total tracked items</span>
            </div>
          </div>

          <div style={{ width: '100%', height: '100px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 100" style={{ overflow: 'visible' }}>
              {(() => {
                const maxVal = Math.max(...totalItemsBarData, 5);
                const xStart = 35;
                const xEnd = 290;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;

                return (
                  <>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{maxVal}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{Math.round(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">0</text>

                    {totalItemsBarData.map((val, i) => {
                      const barW = Math.max(2, Math.floor((xEnd - xStart) / 15) - 4);
                      const barX = xStart + i * ((xEnd - xStart) / 15) + 2;
                      const barH = (val / maxVal) * heightRange;
                      const barY = yEnd - barH;

                      return (
                        <g key={i}>
                          <rect x={barX} y={barY} width={barW} height={Math.max(barH, 1)} fill="#475569" rx="1" />
                          {val > 0 && (
                            <text x={barX + barW / 2} y={barY - 3} textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">
                              {val}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    <text x={xStart + 5} y="94" fill="#94a3b8" fontSize="8">Day 1</text>
                    <text x={(xStart + xEnd) / 2} y="94" textAnchor="middle" fill="#94a3b8" fontSize="8">Day 8</text>
                    <text x={xEnd - 20} y="94" fill="#94a3b8" fontSize="8">Day 15</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
