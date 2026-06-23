import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';
import './LabDashboard.css';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { orders, setOrders, orderItems, setOrderItems, initialLoaded, setInitialLoaded } = useLabAuth();
  const [loading, setLoading] = useState(!initialLoaded);
  const [selectedMetric, setSelectedMetric] = useState('orders'); // 'orders' or 'revenue'
  const [hoveredBar, setHoveredBar] = useState(null); // { label, orders, revenue, x, y }

  const fetchOrdersData = async (showLoading = !initialLoaded) => {
    try {
      if (showLoading) setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('printstore_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('printstore_order_items')
        .select('*');

      if (itemsError) throw itemsError;

      setOrders(ordersData || []);
      setOrderItems(itemsData || []);
      setInitialLoaded(true);
    } catch (err) {
      console.error('Error fetching lab dashboard data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
    const interval = setInterval(() => {
      fetchOrdersData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute metrics
  const metrics = useMemo(() => {
    const today = new Date();
    const todayOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    });
    
    const totalToday = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const pending = orders.filter(o => o.status === 'pending').length;
    const printing = orders.filter(o => o.status === 'printing' || o.status === 'processing').length;
    const qc = orders.filter(o => o.status === 'printed').length;
    const packed = orders.filter(o => o.status === 'packaging' || o.status === 'packed' || o.status === 'ready_to_ship').length;
    const shipped = orders.filter(o => o.status === 'shipped' || o.status === 'completed').length;

    return {
      totalToday,
      todayRevenue,
      pending,
      printing,
      qc,
      packed,
      shipped
    };
  }, [orders]);

  // Compute weekly stats dynamically from orders for both metrics (Orders and Revenue)!
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const ordersCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
    const revenueSums = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };

    orders.forEach(order => {
      const dayName = days[new Date(order.created_at).getDay()];
      ordersCounts[dayName] = (ordersCounts[dayName] || 0) + 1;
      revenueSums[dayName] = (revenueSums[dayName] || 0) + (order.total || 0);
    });

    return days.map(day => ({
      label: day,
      orders: ordersCounts[day],
      revenue: Math.round(revenueSums[day])
    }));
  }, [orders]);

  // Analytics derivations
  const popularStats = useMemo(() => {
    const sizes = {};
    const frames = {};

    orderItems.forEach(item => {
      const opts = item.options || {};
      const sizeLabel = opts.size?.label || 'Custom Size';
      const frameColor = opts.frame?.label || 'No Frame';

      sizes[sizeLabel] = (sizes[sizeLabel] || 0) + item.quantity;
      frames[frameColor] = (frames[frameColor] || 0) + item.quantity;
    });

    const getSortedArray = (obj) => 
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

    return {
      sizes: getSortedArray(sizes),
      frames: getSortedArray(frames)
    };
  }, [orderItems]);

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Lab Overview Dashboard
          </h1>
        </div>
        <button 
          onClick={() => fetchOrdersData(true)} 
          style={{
            backgroundColor: '#111',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}
        >
          🔄 Force Sync
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <p>Syncing lab parameters...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Metrics Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Today's Orders</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#005c5a', marginTop: '8px' }}>{metrics.totalToday}</div>
            </div>
            
            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111111', marginTop: '8px' }}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(metrics.todayRevenue)}
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '4px', fontWeight: 'bold' }}>Today's Revenue</div>
            </div>

            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Pending Queue</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e67e22', marginTop: '8px' }}>{metrics.pending}</div>
            </div>

            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Printing Runs</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9b59b6', marginTop: '8px' }}>{metrics.printing}</div>
            </div>

            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Printed (QC)</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f1c40f', marginTop: '8px' }}>{metrics.qc}</div>
            </div>

            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Packed Packages</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1abc9c', marginTop: '8px' }}>{metrics.packed}</div>
            </div>

            <div className="lab-metric-card" style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Dispatched Runs</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71', marginTop: '8px' }}>{metrics.shipped}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Production Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <button onClick={() => navigate('/lab/queue')} style={{ padding: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#005c5a', fontSize: '13.5px', transition: 'all 0.15s' }}>
                View Queue
              </button>
              <button onClick={() => navigate('/lab/production')} style={{ padding: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#005c5a', fontSize: '13.5px', transition: 'all 0.15s' }}>
                Production Board
              </button>
              <button onClick={() => navigate('/lab/inventory')} style={{ padding: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#005c5a', fontSize: '13.5px', transition: 'all 0.15s' }}>
                Manage Inventory
              </button>
              <button onClick={() => navigate('/lab/quality-control')} style={{ padding: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#005c5a', fontSize: '13.5px', transition: 'all 0.15s' }}>
                Enter QC Center
              </button>
            </div>
          </div>

          {/* Analytics grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Orders per day chart */}
            <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fff', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#111', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Weekly Throughput Chart
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedMetric('orders')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      backgroundColor: selectedMetric === 'orders' ? '#005c5a' : '#ffffff',
                      color: selectedMetric === 'orders' ? '#ffffff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => setSelectedMetric('revenue')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      backgroundColor: selectedMetric === 'revenue' ? '#005c5a' : '#ffffff',
                      color: selectedMetric === 'revenue' ? '#ffffff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    Revenue
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                {(() => {
                  const maxVal = Math.max(...weeklyData.map(d => d[selectedMetric]), 1);
                  return (
                    <svg viewBox="0 0 500 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#005c5a" />
                          <stop offset="100%" stopColor="#029e9b" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines & Labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = 170 - ratio * 140;
                        const val = Math.round(ratio * maxVal);
                        const labelVal = selectedMetric === 'revenue' 
                          ? `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}` 
                          : val;
                        return (
                          <g key={idx}>
                            <line x1="40" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={idx === 4 ? '0' : '4 4'} />
                            <text x="32" y={y + 4} textAnchor="end" fontSize="10px" fill="#94a3b8" fontFamily="sans-serif">{labelVal}</text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {weeklyData.map((d, index) => {
                        const barWidth = 36;
                        const spacing = (440 - barWidth * 7) / 6;
                        const x = 40 + index * (barWidth + spacing);
                        const val = d[selectedMetric];
                        const height = (val / maxVal) * 140;
                        const y = 170 - height;

                        return (
                          <g
                            key={d.label}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const containerRect = e.currentTarget.ownerSVGElement.parentNode.getBoundingClientRect();
                              setHoveredBar({
                                label: d.label,
                                orders: d.orders,
                                revenue: d.revenue,
                                x: rect.left - containerRect.left + rect.width / 2,
                                y: rect.top - containerRect.top - 45
                              });
                            }}
                            onMouseLeave={() => setHoveredBar(null)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Interactive Invisible Overlay Rect */}
                            <rect
                              x={x - 8}
                              y="20"
                              width={barWidth + 16}
                              height="150"
                              fill="transparent"
                            />
                            {/* Actual Bar with rounded top */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(2, height)}
                              rx="4"
                              ry="4"
                              fill="url(#barGrad)"
                              style={{
                                transition: 'y 0.4s ease-in-out, height 0.4s ease-in-out',
                              }}
                            />
                            {/* Label */}
                            <text
                              x={x + barWidth / 2}
                              y="190"
                              textAnchor="middle"
                              fontSize="11px"
                              fill="#64748b"
                              fontWeight="500"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}

                {/* Floating Tooltip */}
                {hoveredBar && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${hoveredBar.x}px`,
                      top: `${hoveredBar.y}px`,
                      transform: 'translateX(-50%)',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      transition: 'left 0.1s ease, top 0.1s ease',
                      border: '1px solid #475569'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '2px' }}>{hoveredBar.label}day</div>
                    <div>Orders: <strong style={{ color: '#ffffff' }}>{hoveredBar.orders}</strong></div>
                    <div>Revenue: <strong style={{ color: '#34d399' }}>₹{new Intl.NumberFormat('en-IN').format(hoveredBar.revenue)}</strong></div>
                  </div>
                )}
              </div>
            </div>

            {/* Popular configs summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Popular Print Sizes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {popularStats.sizes.length === 0 ? (
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>No data logged.</span>
                  ) : (
                    popularStats.sizes.map((stat, idx) => (
                      <div key={idx} style={{ display: 'flex', justify: 'space-between', fontSize: '12.5px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span>{stat.name}</span>
                        <span style={{ fontWeight: 'bold' }}>{stat.count} orders</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Popular Frame Styles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {popularStats.frames.length === 0 ? (
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>No data logged.</span>
                  ) : (
                    popularStats.frames.map((stat, idx) => (
                      <div key={idx} style={{ display: 'flex', justify: 'space-between', fontSize: '12.5px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span>{stat.name}</span>
                        <span style={{ fontWeight: 'bold' }}>{stat.count} units</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
