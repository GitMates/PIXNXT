import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabAuth } from './LabApp';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { orders, orderItems, initialLoaded, refreshOrders } = useLabAuth();
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredMini, setHoveredMini] = useState(null); // { chart, idx, label, value, sub, xPct, y }
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

  // ── Build calendar-day buckets for a date range (no fixed mock-length arrays) ──
  const buildDayBuckets = (rangeStart, rangeEnd) => {
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
    const buckets = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      buckets.push({
        key: d.toDateString(),
        day: d.getDate(),
        label: `${d.toLocaleString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}`,
        revenue: 0,
        orders: 0,
        items: 0,
        aov: 0,
      });
    }
    return buckets;
  };

  const dayIndexMap = (buckets) => {
    const map = new Map();
    buckets.forEach((b, i) => map.set(b.key, i));
    return map;
  };

  // ── Revenue chart: this month vs last month (real calendar days through today) ──
  const revenueSeries = useMemo(() => {
    const now = new Date();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    // Align last-month series length to this month's days-so-far for fair comparison
    const alignEndDay = Math.min(now.getDate(), lastEnd.getDate());
    const lastAlignEnd = new Date(lastStart.getFullYear(), lastStart.getMonth(), alignEndDay);

    const thisBuckets = buildDayBuckets(thisStart, thisEnd);
    const lastBuckets = buildDayBuckets(lastStart, lastAlignEnd);
    const thisMap = dayIndexMap(thisBuckets);
    const lastMap = dayIndexMap(lastBuckets);

    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const key = d.toDateString();
      const total = Number(o.total) || 0;
      if (thisMap.has(key)) thisBuckets[thisMap.get(key)].revenue += total;
      if (lastMap.has(key)) lastBuckets[lastMap.get(key)].revenue += total;
    });

    return { thisBuckets, lastBuckets };
  }, [orders]);

  // Dynamic chart widths — one readable slot per calendar day; overflow scrolls
  const DAY_SLOT_PX = 36;
  const MINI_DAY_SLOT = 34;
  const svgHeight = 180;
  const revDayCount = Math.max(revenueSeries.thisBuckets.length, 1);
  const svgWidth = Math.max(560, revDayCount * DAY_SLOT_PX);

  const pointsThisMonth = useMemo(() => {
    const vals = revenueSeries.thisBuckets.map(b => b.revenue);
    const lastVals = revenueSeries.lastBuckets.map(b => b.revenue);
    const maxVal = Math.max(...vals, ...lastVals, 1);
    const n = Math.max(vals.length - 1, 1);
    const w = Math.max(560, vals.length * DAY_SLOT_PX);
    return revenueSeries.thisBuckets.map((b, i) => ({
      x: (i / n) * w,
      y: svgHeight - 20 - (b.revenue / maxVal) * (svgHeight - 40),
      day: b.day,
      label: b.label,
      val: b.revenue,
    }));
  }, [revenueSeries]);

  const pointsLastMonth = useMemo(() => {
    const vals = revenueSeries.thisBuckets.map(b => b.revenue);
    const lastVals = revenueSeries.lastBuckets.map(b => b.revenue);
    const maxVal = Math.max(...vals, ...lastVals, 1);
    const len = Math.max(vals.length, lastVals.length, 1);
    const n = Math.max(len - 1, 1);
    const w = Math.max(560, len * DAY_SLOT_PX);
    return revenueSeries.lastBuckets.map((b, i) => ({
      x: (i / n) * w,
      y: svgHeight - 20 - (b.revenue / maxVal) * (svgHeight - 40),
      day: b.day,
      label: b.label,
      val: b.revenue,
    }));
  }, [revenueSeries]);

  // Only connect days that have revenue (or keep continuous baseline for empty stretches via polyline of all days — sparse dots look honest)
  const pathFromPoints = (pts) => {
    if (!pts.length) return '';
    return `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  };
  const pathThisMonth = pathFromPoints(pointsThisMonth);
  const pathLastMonth = pathFromPoints(pointsLastMonth);

  // Headline = filtered-period revenue only (never this+last month)
  const totalRevenue = analyticsStats.salesPerformance;

  // ── Popular Products (only items belonging to filtered orders) ──
  const popularProductsList = useMemo(() => {
    const targetIds = new Set(filteredOrders.map(o => o.id));
    const counts = {};
    orderItems.forEach(item => {
      if (!targetIds.has(item.order_id)) return;
      const opts = item.options || {};
      const key = (opts.size?.label
        ? `${opts.size.label} ${item.product_name || ''}`.trim()
        : (item.product_name || 'Untitled product')).trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + (Number(item.quantity) || 1);
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length === 0) return [];

    const maxCount = sorted[0].count || 1;
    return sorted.slice(0, 6).map((item) => ({
      name: item.name,
      count: item.count,
      pct: Math.round((item.count / maxCount) * 100),
    }));
  }, [filteredOrders, orderItems]);

  const colorsProgress = ['#f97316', '#a855f7', '#3b82f6', '#22c55e', '#ec4899', '#06b6d4'];

  // ── Bottom charts: one bucket per real calendar day in the active filter ──
  const periodDaily = useMemo(() => {
    const { start, end } = getDateRange(activeFilter);
    const buckets = buildDayBuckets(start, new Date(end.getTime() - 1)); // end is exclusive midnight+1d
    const map = dayIndexMap(buckets);
    const targetIds = new Set(filteredOrders.map(o => o.id));
    const itemsByOrder = {};
    orderItems.forEach(item => {
      if (!targetIds.has(item.order_id)) return;
      itemsByOrder[item.order_id] = (itemsByOrder[item.order_id] || 0) + (Number(item.quantity) || 1);
    });

    filteredOrders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const idx = map.get(d.toDateString());
      if (idx == null) return;
      buckets[idx].orders += 1;
      buckets[idx].revenue += Number(o.total) || 0;
      buckets[idx].items += itemsByOrder[o.id] || 0;
    });

    buckets.forEach(b => {
      b.aov = b.orders > 0 ? Math.round(b.revenue / b.orders) : 0;
    });

    return buckets;
  }, [filteredOrders, orderItems, activeFilter]);

  const aovBarData = periodDaily.map(b => b.aov);
  const dailySalesData = periodDaily.map(b => b.orders);
  const totalItemsBarData = periodDaily.map(b => b.items);
  const periodDayLabels = periodDaily.map(b => b.label);
  const miniDayCount = Math.max(periodDaily.length, 1);
  const miniChartWidth = Math.max(280, miniDayCount * MINI_DAY_SLOT + 48);

  const handleMouseMove = (e) => {
    if (!pointsThisMonth.length) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + (el.scrollLeft || 0);

    let closestIdx = 0;
    let minDiff = Infinity;
    pointsThisMonth.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const ptThis = pointsThisMonth[closestIdx];
    const ptLast = pointsLastMonth[closestIdx] || { val: 0 };
    const change = ptLast.val > 0 ? ((ptThis.val - ptLast.val) / ptLast.val * 100) : 0;
    setHoveredPoint({
      day: ptThis.day,
      label: ptThis.label,
      thisMonthVal: ptThis.val,
      lastMonthVal: ptLast.val,
      change,
      x: ptThis.x,
      viewportX: ptThis.x - (el.scrollLeft || 0),
      y: ptThis.y,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const fmtINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const compLabel = activeFilter === 'today' ? 'vs yesterday'
    : activeFilter === 'this_week' ? 'vs last week'
    : activeFilter === 'last_month' ? 'vs prev month'
    : 'vs last month';

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'short' });
  const totalItems = periodDaily.reduce((sum, b) => sum + b.items, 0);
  const totalOrdersInPeriod = filteredOrders.length;

  const axisLabelIndexes = (len) => {
    if (len <= 1) return [0];
    if (len <= 3) return Array.from({ length: len }, (_, i) => i);
    return [0, Math.floor((len - 1) / 2), len - 1];
  };

  const pickMiniHover = (e, chart, values, formatValue) => {
    const n = periodDaily.length;
    if (!n) {
      setHoveredMini(null);
      return;
    }
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + (el.scrollLeft || 0);
    const xStart = chart === 'aov' ? 45 : 35;
    const plotWidth = Math.max(miniChartWidth - xStart - 10, 1);
    const rel = Math.min(Math.max((x - xStart) / plotWidth, 0), 1);
    const idx = Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1))));
    const bucket = periodDaily[idx];
    const val = values[idx] ?? 0;
    const visibleX = e.clientX - rect.left;
    setHoveredMini({
      chart,
      idx,
      label: bucket?.label || periodDayLabels[idx] || `Day ${idx + 1}`,
      value: formatValue(val),
      raw: val,
      orders: bucket?.orders || 0,
      revenue: bucket?.revenue || 0,
      items: bucket?.items || 0,
      xPct: Math.min(88, Math.max(12, (visibleX / Math.max(rect.width, 1)) * 100)),
    });
  };

  const clearMiniHover = () => setHoveredMini(null);

  // Sits BELOW the plot (under axis labels) so bars/line stay fully visible
  const MiniTooltip = ({ tip }) => {
    if (!tip) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: `${tip.xPct}%`,
          top: '100%',
          marginTop: 4,
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255,255,255,0.98)',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '6px 10px',
          boxShadow: '0 6px 16px rgba(15,23,42,0.10)',
          pointerEvents: 'none',
          zIndex: 60,
          whiteSpace: 'nowrap',
          fontSize: 11,
          lineHeight: 1.35,
          color: '#0f172a',
        }}
      >
        <div style={{ fontWeight: 700 }}>{tip.label} · {tip.value}</div>
        {tip.chart === 'aov' && (
          <div style={{ color: '#64748b' }}>
            {fmtINR(tip.revenue)} · {tip.orders} order{tip.orders === 1 ? '' : 's'}
          </div>
        )}
        {tip.chart === 'orders' && (
          <div style={{ color: '#64748b' }}>{fmtINR(tip.revenue)} revenue</div>
        )}
        {tip.chart === 'items' && (
          <div style={{ color: '#64748b' }}>{tip.orders} order{tip.orders === 1 ? '' : 's'}</div>
        )}
      </div>
    );
  };

  // Filter button config
  const filterButtons = [
    { key: 'this_month', label: 'This Month' },
    { key: 'this_week', label: 'This Week' },
    { key: 'today', label: 'Today' },
    { key: 'last_month', label: 'Last Month' }
  ];

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F9F9F7', minHeight: '100%', fontFamily: "var(--font-sans)", color: '#1A1A1A', boxSizing: 'border-box' }}>
      
      {/* Greeting and Filter Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500, margin: '0 0 4px 0', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            Hey, {operatorName}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#71717A' }}>{todayFormatted}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {filterButtons.map(btn => (
            <button 
              key={btn.key}
              onClick={() => setActiveFilter(btn.key)}
              style={{ 
                padding: '8px 16px', 
                backgroundImage: activeFilter === btn.key ? 'linear-gradient(180deg, #4D4D4D, #333333)' : 'none',
                backgroundColor: activeFilter === btn.key ? undefined : '#fff', 
                color: activeFilter === btn.key ? '#fff' : '#71717A', 
                border: activeFilter === btn.key ? 'none' : '1px solid #ECEAE6', 
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: 500, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: activeFilter === btn.key ? '0 1px 0 0 rgba(255,255,255,0.15) inset, 0 12px 24px -10px rgba(0,0,0,0.45)' : 'none',
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
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}><span style={{ width: 7, height: 7, borderRadius: 9999, background: '#1A1A1A', display: 'block', opacity: 0.35 }} /></div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Today's Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.todaysOrders}</span>
        </div>

        {/* Today's Revenue */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}><span style={{ width: 7, height: 7, borderRadius: 9999, background: '#1A1A1A', display: 'block', opacity: 0.35 }} /></div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Today's Revenue</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(operationalStats.todaysRevenue)}</span>
        </div>

        {/* Packed Orders */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}><span style={{ width: 7, height: 7, borderRadius: 9999, background: '#1A1A1A', display: 'block', opacity: 0.35 }} /></div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Packed Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.packedOrders}</span>
        </div>

        {/* Printed Orders */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}><span style={{ width: 7, height: 7, borderRadius: 9999, background: '#1A1A1A', display: 'block', opacity: 0.35 }} /></div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Printed Orders</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.printedOrders}</span>
        </div>

        {/* Dispatched */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}><span style={{ width: 7, height: 7, borderRadius: 9999, background: '#1A1A1A', display: 'block', opacity: 0.35 }} /></div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Dispatched</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>{operationalStats.dispatchedOrders}</span>
        </div>
      </div>

      {/* ── ROW 2: Analytics KPI Cards (4 Columns) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        
        {/* Sales Performance */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Sales Performance</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.salesPerformance)}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.revChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.revChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.revChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.revChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Total Sales */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Sales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{analyticsStats.totalSales.toLocaleString('en-IN')}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.countChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.countChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.countChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.countChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Average Revenue */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Average Revenue</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.averageRevenue)}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.aovChange >= 0 ? '#10b981' : '#ef4444', backgroundColor: analyticsStats.aovChange >= 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
              {analyticsStats.aovChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.aovChange).toFixed(1)}% {compLabel}
            </span>
          </div>
        </div>

        {/* Average Order */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Average Order</span>
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
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>Total Revenue</strong>
              
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

          {/* SVG Multi-Line Chart — horizontal scroll for full month */}
          <div 
            style={{ width: '100%', height: '200px', position: 'relative', cursor: 'crosshair', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width={svgWidth} height="100%" style={{ display: 'block', minWidth: '100%' }}>
              <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="70" x2={svgWidth} y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="110" x2={svgWidth} y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#f1f5f9" strokeWidth="1" />

              {pathLastMonth && (
                <path d={pathLastMonth} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {pathThisMonth && (
                <path d={pathThisMonth} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {pointsThisMonth.filter(p => p.val > 0).map((p) => (
                <circle key={`tm-${p.day}`} cx={p.x} cy={p.y} r="3.5" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
              ))}

              <line x1="0" y1={svgHeight - 15} x2={svgWidth} y2={svgHeight - 15} stroke="#cbd5e1" strokeWidth="1" />

              {hoveredPoint && (
                <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2={svgHeight - 15} stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" />
              )}

              {/* Show more labels when scrolled — every ~5 days + ends */}
              {pointsThisMonth.map((p, idx) => {
                const show = idx === 0 || idx === pointsThisMonth.length - 1 || idx % 5 === 0;
                if (!show) return null;
                const anchor = idx === 0 ? 'start' : idx === pointsThisMonth.length - 1 ? 'end' : 'middle';
                return (
                  <text key={`xl-${idx}`} x={p.x} y={svgHeight} fill="#94a3b8" fontSize="9" textAnchor={anchor}>
                    {p.label || `${currentMonthName} ${String(p.day).padStart(2, '0')}`}
                  </text>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div style={{
                position: 'absolute',
                left: Math.min(Math.max(hoveredPoint.viewportX ?? hoveredPoint.x, 72), 520),
                top: `${Math.max(hoveredPoint.y - 65, 5)}px`,
                transform: 'translateX(-50%)',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                pointerEvents: 'none',
                zIndex: 100,
                fontSize: '11px',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                  {hoveredPoint.label || `Day ${hoveredPoint.day}`}
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
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Popular Product</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {popularProductsList.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>No products in this period</span>
            ) : popularProductsList.map((prod, idx) => (
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

      {/* ── Bottom Labeled Charts Row (3 Columns) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
        
        {/* Card 1: Average Order Value */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'visible' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Average Order Value</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{fmtINR(analyticsStats.averageRevenue)}</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.aovChange >= 0 ? '#10b981' : '#ef4444' }}>
                {analyticsStats.aovChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.aovChange).toFixed(1)}% {compLabel}
              </span>
            </div>
          </div>
          
          <div
            style={{ width: '100%', height: '100px', position: 'relative', cursor: 'crosshair', marginBottom: 44, overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}
            onMouseMove={(e) => pickMiniHover(e, 'aov', aovBarData, (v) => `AOV ${fmtINR(v)}`)}
            onMouseLeave={clearMiniHover}
          >
            <svg width={miniChartWidth} height="100%" viewBox={`0 0 ${miniChartWidth} 100`} style={{ display: 'block', overflow: 'visible' }}>
              {(() => {
                const n = Math.max(aovBarData.length, 1);
                const maxVal = Math.max(...aovBarData, 1);
                const xStart = 45;
                const xEnd = miniChartWidth - 10;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;
                const slot = (xEnd - xStart) / n;
                const barW = Math.max(3, Math.min(18, slot - 4));
                const hoverIdx = hoveredMini?.chart === 'aov' ? hoveredMini.idx : -1;
                
                return (
                  <>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{fmtINR(maxVal)}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{fmtINR(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">₹0</text>

                    {hoverIdx >= 0 && (
                      <line
                        x1={xStart + hoverIdx * slot + slot / 2}
                        y1={yStart}
                        x2={xStart + hoverIdx * slot + slot / 2}
                        y2={yEnd}
                        stroke="#94a3b8"
                        strokeDasharray="3,3"
                        strokeWidth="1"
                      />
                    )}

                    {aovBarData.map((val, i) => {
                      const barX = xStart + i * slot + (slot - barW) / 2;
                      const barH = val > 0 ? (val / maxVal) * heightRange : 0;
                      const barY = yEnd - barH;
                      const active = i === hoverIdx;
                      return (
                        <g key={i}>
                          <rect x={xStart + i * slot} y={yStart} width={slot} height={yEnd - yStart} fill="transparent" />
                          {val > 0 && (
                            <rect x={barX} y={barY} width={barW} height={barH} fill={active ? '#ea580c' : '#f97316'} rx="2" />
                          )}
                        </g>
                      );
                    })}

                    {aovBarData.map((_, idx) => {
                      if (!(idx === 0 || idx === n - 1 || idx % 5 === 0)) return null;
                      const x = xStart + idx * slot + slot / 2;
                      const anchor = idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle';
                      return (
                        <text key={`aov-x-${idx}`} x={x} y="94" fill="#94a3b8" fontSize="8" textAnchor={anchor}>
                          {periodDayLabels[idx] || `Day ${idx + 1}`}
                        </text>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            {hoveredMini?.chart === 'aov' && <MiniTooltip tip={hoveredMini} />}
          </div>
        </div>

        {/* Card 2: Orders (daily) */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'visible' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Orders</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{totalOrdersInPeriod.toLocaleString('en-IN')} Orders</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: analyticsStats.countChange >= 0 ? '#10b981' : '#ef4444' }}>
                {analyticsStats.countChange >= 0 ? '↑' : '↓'} {Math.abs(analyticsStats.countChange).toFixed(1)}% {compLabel}
              </span>
            </div>
          </div>

          <div
            style={{ width: '100%', height: '100px', position: 'relative', cursor: 'crosshair', marginBottom: 44, overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}
            onMouseMove={(e) => pickMiniHover(e, 'orders', dailySalesData, (v) => `${v} order${v === 1 ? '' : 's'}`)}
            onMouseLeave={clearMiniHover}
          >
            <svg width={miniChartWidth} height="100%" viewBox={`0 0 ${miniChartWidth} 100`} style={{ display: 'block', overflow: 'visible' }}>
              {(() => {
                const n = Math.max(dailySalesData.length, 1);
                const maxVal = Math.max(...dailySalesData, 1);
                const xStart = 35;
                const xEnd = miniChartWidth - 10;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;
                const hoverIdx = hoveredMini?.chart === 'orders' ? hoveredMini.idx : -1;

                const points = dailySalesData.map((val, i) => {
                  const x = n === 1 ? (xStart + xEnd) / 2 : xStart + (i / (n - 1)) * (xEnd - xStart);
                  const y = yEnd - (val / maxVal) * heightRange;
                  return { x, y, val };
                });

                const linePath = points.length ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';

                return (
                  <>
                    <defs>
                      <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{maxVal}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{Math.round(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">0</text>

                    {linePath && (
                      <>
                        <path d={`${linePath} L ${points[points.length - 1].x},${yEnd} L ${points[0].x},${yEnd} Z`} fill="url(#orangeGrad)" />
                        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2" />
                      </>
                    )}

                    {hoverIdx >= 0 && points[hoverIdx] && (
                      <>
                        <line x1={points[hoverIdx].x} y1={yStart} x2={points[hoverIdx].x} y2={yEnd} stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="1" />
                        <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="5" fill="#ea580c" stroke="#fff" strokeWidth="2" />
                      </>
                    )}

                    {points.filter(pt => pt.val > 0).map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#f97316" stroke="#fff" strokeWidth="1" />
                    ))}

                    {dailySalesData.map((_, idx) => {
                      if (!(idx === 0 || idx === n - 1 || idx % 5 === 0)) return null;
                      const x = n === 1 ? (xStart + xEnd) / 2 : xStart + (idx / (n - 1)) * (xEnd - xStart);
                      const anchor = idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle';
                      return (
                        <text key={`ord-x-${idx}`} x={x} y="94" fill="#94a3b8" fontSize="8" textAnchor={anchor}>
                          {periodDayLabels[idx] || `Day ${idx + 1}`}
                        </text>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            {hoveredMini?.chart === 'orders' && <MiniTooltip tip={hoveredMini} />}
          </div>
        </div>

        {/* Card 3: Total Items */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'visible' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Total Items</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{totalItems.toLocaleString('en-IN')} Items</span>
            </div>
          </div>

          <div
            style={{ width: '100%', height: '100px', position: 'relative', cursor: 'crosshair', marginBottom: 44, overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}
            onMouseMove={(e) => pickMiniHover(e, 'items', totalItemsBarData, (v) => `${v} item${v === 1 ? '' : 's'}`)}
            onMouseLeave={clearMiniHover}
          >
            <svg width={miniChartWidth} height="100%" viewBox={`0 0 ${miniChartWidth} 100`} style={{ display: 'block', overflow: 'visible' }}>
              {(() => {
                const n = Math.max(totalItemsBarData.length, 1);
                const maxVal = Math.max(...totalItemsBarData, 1);
                const xStart = 35;
                const xEnd = miniChartWidth - 10;
                const yStart = 10;
                const yEnd = 80;
                const heightRange = yEnd - yStart;
                const slot = (xEnd - xStart) / n;
                const barW = Math.max(3, Math.min(18, slot - 4));
                const hoverIdx = hoveredMini?.chart === 'items' ? hoveredMini.idx : -1;

                return (
                  <>
                    <line x1={xStart} y1={yStart} x2={xEnd} y2={yStart} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={(yStart + yEnd) / 2} x2={xEnd} y2={(yStart + yEnd) / 2} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={xStart} y1={yEnd} x2={xEnd} y2={yEnd} stroke="#cbd5e1" strokeWidth="1" />

                    <text x="5" y={yStart + 4} fill="#64748b" fontSize="8" fontWeight="bold">{maxVal}</text>
                    <text x="5" y={(yStart + yEnd) / 2 + 3} fill="#64748b" fontSize="8">{Math.round(maxVal / 2)}</text>
                    <text x="5" y={yEnd + 3} fill="#94a3b8" fontSize="8">0</text>

                    {hoverIdx >= 0 && (
                      <line
                        x1={xStart + hoverIdx * slot + slot / 2}
                        y1={yStart}
                        x2={xStart + hoverIdx * slot + slot / 2}
                        y2={yEnd}
                        stroke="#94a3b8"
                        strokeDasharray="3,3"
                        strokeWidth="1"
                      />
                    )}

                    {totalItemsBarData.map((val, i) => {
                      const barX = xStart + i * slot + (slot - barW) / 2;
                      const barH = val > 0 ? (val / maxVal) * heightRange : 0;
                      const barY = yEnd - barH;
                      const active = i === hoverIdx;
                      return (
                        <g key={i}>
                          <rect x={xStart + i * slot} y={yStart} width={slot} height={yEnd - yStart} fill="transparent" />
                          {val > 0 && (
                            <rect x={barX} y={barY} width={barW} height={barH} fill={active ? '#1e293b' : '#475569'} rx="2" />
                          )}
                        </g>
                      );
                    })}

                    {totalItemsBarData.map((_, idx) => {
                      if (!(idx === 0 || idx === n - 1 || idx % 5 === 0)) return null;
                      const x = xStart + idx * slot + slot / 2;
                      const anchor = idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle';
                      return (
                        <text key={`items-x-${idx}`} x={x} y="94" fill="#94a3b8" fontSize="8" textAnchor={anchor}>
                          {periodDayLabels[idx] || `Day ${idx + 1}`}
                        </text>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            {hoveredMini?.chart === 'items' && <MiniTooltip tip={hoveredMini} />}
          </div>
        </div>
      </div>

    </div>
  );
}
