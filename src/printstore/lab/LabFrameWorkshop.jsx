import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';

export default function LabFrameWorkshop() {
  const { orders, orderItems, setOrders, setOrderItems, initialLoaded, setInitialLoaded } = useLabAuth();
  const [loading, setLoading] = useState(!initialLoaded);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Fetch orders and order items from Supabase
  const fetchFrameData = async (showLoading = !initialLoaded) => {
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
      console.error('Error fetching frame workshop data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameData();
    const interval = setInterval(() => fetchFrameData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter only orders that contain frame-related products
  const frameOrders = useMemo(() => {
    const frameProductTypes = ['frames', 'matted_frames', 'float_frames', 'circular_frames', 'gallery_boards'];
    const result = [];

    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      const frameItems = items.filter(item => {
        const pType = (item.product_type || '').toLowerCase();
        return frameProductTypes.some(ft => pType.includes(ft.replace('_', ''))) ||
               pType.includes('frame') ||
               pType.includes('gallery') ||
               (item.options?.frame && item.options.frame.id !== 'frame_none');
      });

      if (frameItems.length > 0) {
        result.push({ order, items: frameItems });
      }
    });

    return result;
  }, [orders, orderItems]);

  // Selected order
  const selectedFrameOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return frameOrders.find(fo => fo.order.id === selectedOrderId) || null;
  }, [selectedOrderId, frameOrders]);

  // Parse dimensions from size label like "25x38cm"
  const parseSizeLabel = (label) => {
    if (!label) return { width: 25, height: 38 };
    const match = label.match(/(\d+)\s*[xX×]\s*(\d+)/);
    if (match) return { width: parseFloat(match[1]), height: parseFloat(match[2]) };
    return { width: 25, height: 38 };
  };

  // Frame color mapping
  const frameColorsMap = {
    'Black': '#111111', 'White': '#f7f7f7', 'Barnwood': '#8a7f75',
    'Dark Wood': '#3e2723', 'Light Wood': '#d2b48c', 'Graphite': '#53565b',
    'Classic Wood': '#8b5a2b', 'Charcoal Black': '#111111', 'Natural Oak': '#d7a15c',
    'Polar White': '#ffffff', 'Walnut': '#4b321a', 'Vintage Gold': '#d4af37'
  };

  const frameThickness = 2;

  if (loading) {
    return (
      <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100vh', boxSizing: 'border-box', fontFamily: "'europa', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading frame workshop data...</div>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  if (selectedFrameOrder) {
    const currentItem = selectedFrameOrder.items[0];
    const currentSize = currentItem?.options?.size;
    const currentFrame = currentItem?.options?.frame;
    const currentPaper = currentItem?.options?.paper;
    const dims = parseSizeLabel(currentSize?.label);
    const photoWidth = dims.width;
    const photoHeight = dims.height;

    const glassWidth = photoWidth + (2 * frameThickness);
    const glassHeight = photoHeight + (2 * frameThickness);
    const backingWidth = glassWidth;
    const backingHeight = glassHeight;
    const woodLength = 2 * (glassWidth + glassHeight);

    const activeFrameLabel = currentFrame?.label || 'No Frame';
    const activeColor = frameColorsMap[activeFrameLabel] || currentFrame?.color || '#111111';
    const productType = currentItem?.product_type?.replace(/_/g, ' ') || 'Frame';

    return (
      <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100vh', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>

        {/* Header */}
        <div style={{ paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSelectedOrderId(null)}
              style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}
            >
              ← Back
            </button>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Frame Workshop
            </h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>

          {/* Left: Order Frame Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '15px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Order Frame Specifications
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Order ID</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>#{selectedFrameOrder.order.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Customer</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedFrameOrder.order.customer_name || selectedFrameOrder.order.customer_email || 'Guest'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Product Type</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>{productType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Ordered Print Size</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{currentSize?.label || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '500', color: '#64748b' }}>Width</span>
                    <span style={{ fontWeight: '700', color: '#005c5a' }}>{photoWidth} cm</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '500', color: '#64748b' }}>Height</span>
                    <span style={{ fontWeight: '700', color: '#005c5a' }}>{photoHeight} cm</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Frame Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: activeColor, border: '1px solid #cbd5e1', display: 'inline-block' }} />
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{activeFrameLabel}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Paper Type</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{currentPaper?.label || 'Standard'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Quantity</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{currentItem?.quantity || 1}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '500', color: '#64748b' }}>Order Status</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                    backgroundColor: selectedFrameOrder.order.status === 'framing' ? '#dbeafe' : selectedFrameOrder.order.status === 'completed' ? '#d1fae5' : '#f1f5f9',
                    color: selectedFrameOrder.order.status === 'framing' ? '#1e40af' : selectedFrameOrder.order.status === 'completed' ? '#065f46' : '#475569'
                  }}>
                    {selectedFrameOrder.order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Automated Workshop Calculations */}
            <div style={{ padding: '24px', border: '1px solid #005c5a', borderRadius: '4px', backgroundColor: '#eefaf9' }}>
              <h3 style={{ fontSize: '15px', color: '#005c5a', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Automated Workshop Calculations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,92,90,0.1)', paddingBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: '500', color: '#333' }}>Base Photo size:</span>
                  <span style={{ fontWeight: '700', color: '#111' }}>{photoWidth} x {photoHeight} cm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,92,90,0.1)', paddingBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: '500', color: '#333' }}>Frame thickness:</span>
                  <span style={{ fontWeight: '700', color: '#111' }}>{frameThickness} cm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,92,90,0.1)', paddingBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: '500', color: '#333' }}>Glass cut dimension:</span>
                  <span style={{ fontWeight: '700', color: '#005c5a' }}>{glassWidth} x {glassHeight} cm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,92,90,0.1)', paddingBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: '500', color: '#333' }}>Backing Board dimension:</span>
                  <span style={{ fontWeight: '700', color: '#005c5a' }}>{backingWidth} x {backingHeight} cm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,92,90,0.1)', paddingBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: '500', color: '#333' }}>Overall Frame dimension:</span>
                  <span style={{ fontWeight: '700', color: '#005c5a' }}>{glassWidth} x {glassHeight} cm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 'bold', color: '#005c5a' }}>Wood Profile Lumber Cutting Length:</span>
                  <span style={{ fontWeight: '800', color: '#005c5a', fontSize: '16px' }}>{woodLength} cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual Frame Render */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', minHeight: '450px' }}>
            <h4 style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visual Frame Render</h4>

            <div style={{
              padding: `${frameThickness * 8}px`,
              backgroundColor: activeColor,
              border: '1px solid rgba(0,0,0,0.15)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', borderRadius: '2px'
            }}>
              <div style={{ backgroundColor: '#f8f4eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: `${photoWidth * 6}px`, height: `${photoHeight * 6}px`,
                  backgroundImage: 'linear-gradient(135deg, #eefaf9 0%, #cbd5e1 100%)',
                  border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', opacity: 0.7 }}>
                    {photoWidth} x {photoHeight} cm
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#64748b', maxWidth: '300px' }}>
              Preview showing <strong>{activeFrameLabel}</strong> {productType} with {currentPaper?.label || 'Standard'} paper.
            </div>

            {/* Dimension Scale Legend */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#64748b', width: '100%', maxWidth: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '4px' }}>
                <span>Photo</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{photoWidth} × {photoHeight} cm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '4px' }}>
                <span>Frame outer</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{glassWidth} × {glassHeight} cm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span>Wood thickness</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{frameThickness} cm</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ===== TABLE LIST VIEW =====
  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100vh', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>

      {/* Header */}
      <div style={{ paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Frame Workshop
        </h1>
        <button
          onClick={() => fetchFrameData(false)}
          style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: '#005c5a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}
        >
          Refresh
        </button>
      </div>

      {/* Frame Orders Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', ...(frameOrders.length > 0 ? { minWidth: '900px' } : {}) }}>
          <thead>
            <tr style={{ backgroundColor: '#005c5a', color: '#ffffff' }}>
              {frameOrders.length > 0 ? (
                <>
                  <th style={{ padding: '14px 16px' }}>Order ID</th>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Product Type</th>
                  <th style={{ padding: '14px 16px' }}>Print Size</th>
                  <th style={{ padding: '14px 16px' }}>Frame Color</th>
                  <th style={{ padding: '14px 16px' }}>Paper Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                </>
              ) : (
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Frame Orders</th>
              )}
            </tr>
          </thead>
          <tbody>
            {frameOrders.length === 0 ? (
              <tr>
                <td colSpan="1" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No frame orders found. Orders containing frame products will appear here.
                </td>
              </tr>
            ) : (
              frameOrders.map(fo => {
                const firstItem = fo.items[0];
                const sizeLabel = firstItem?.options?.size?.label || 'Custom';
                const frameLabel = firstItem?.options?.frame?.label || 'No Frame';
                const frameColor = frameColorsMap[frameLabel] || firstItem?.options?.frame?.color || '#111';
                const paperLabel = firstItem?.options?.paper?.label || 'Standard';
                const pType = firstItem?.product_type?.replace(/_/g, ' ').toUpperCase() || 'FRAME';
                const status = fo.order.status || 'pending';

                return (
                  <tr
                    key={fo.order.id}
                    onClick={() => setSelectedOrderId(fo.order.id)}
                    style={{ borderBottom: '1px solid #eaeaea', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>
                      #{fo.order.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#0f172a' }}>
                      <div style={{ fontWeight: 600 }}>{fo.order.customer_name || 'Guest'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{fo.order.customer_email || ''}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }}>{pType}</td>
                    <td style={{ padding: '14px 16px', color: '#0f172a' }}>{sizeLabel}</td>
                    <td style={{ padding: '14px 16px', color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: frameColor, border: '1px solid #cbd5e1', display: 'inline-block', flexShrink: 0 }} />
                        <span>{frameLabel}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#0f172a' }}>{paperLabel}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{firstItem?.quantity || 1}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                        backgroundColor: status === 'framing' ? '#dbeafe' : status === 'completed' ? '#d1fae5' : status === 'printing' ? '#fef3c7' : '#f1f5f9',
                        color: status === 'framing' ? '#1e40af' : status === 'completed' ? '#065f46' : status === 'printing' ? '#92400e' : '#475569'
                      }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
