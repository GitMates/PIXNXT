import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import CartItemPreview from '../components/CartItemPreview';

const STATUS_COLORS = {
  pending: '#3498db',
  printing: '#9b59b6',
  printed: '#005c5a',
  packaging: '#d35400',
  ready_to_ship: '#1abc9c',
  shipped: '#2ecc71',
  completed: '#27ae60',
  reprint: '#e74c3c',
  cancelled: '#95a5a6'
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

// Map referrer paths to context keys
const getContextFromReferrer = (pathname) => {
  if (!pathname) return null;
  if (pathname.includes('/print-queue')) return 'print';
  if (pathname.includes('/quality-control')) return 'qc';
  if (pathname.includes('/reprints')) return 'reprint';
  if (pathname.includes('/packaging')) return 'packaging';
  if (pathname.includes('/ready-to-deliver')) return 'delivery';
  if (pathname.includes('/dispatch-history')) return 'dispatch';
  if (pathname.includes('/queue') || pathname.includes('/dashboard')) return 'full';
  return null;
};

// Map order statuses to context keys (as fallback for direct page reload)
const getContextFromStatus = (status) => {
  if (status === 'pending' || status === 'printing') return 'print';
  if (status === 'printed') return 'qc';
  if (status === 'reprint') return 'reprint';
  if (status === 'packaging') return 'packaging';
  if (status === 'ready_to_ship') return 'delivery';
  if (status === 'shipped' || status === 'completed') return 'dispatch';
  return 'full';
};

// What each context should display
const CONTEXT_CONFIG = {
  print: {
    title: 'Print Job Details',
    backLabel: 'Back to Print Queue',
    backPath: '/lab/print-queue',
    showCustomer: false,
    showShipping: false,
    showFinancials: false,
    showPaymentInfo: false,
    showProducts: true,
    showNotes: true,
    showTimeline: true,
    showStatusControl: true,
  },
  qc: {
    title: 'Quality Control Inspection',
    backLabel: 'Back to Quality Control',
    backPath: '/lab/quality-control',
    showCustomer: false,
    showShipping: false,
    showFinancials: false,
    showPaymentInfo: false,
    showProducts: true,
    showNotes: true,
    showTimeline: true,
    showStatusControl: true,
  },
  reprint: {
    title: 'Reprint Job Details',
    backLabel: 'Back to Reprints',
    backPath: '/lab/reprints',
    showCustomer: false,
    showShipping: false,
    showFinancials: false,
    showPaymentInfo: false,
    showProducts: true,
    showNotes: true,
    showTimeline: true,
    showStatusControl: true,
  },
  packaging: {
    title: 'Packaging Details',
    backLabel: 'Back to Packaging Center',
    backPath: '/lab/packaging',
    showCustomer: true,
    showShipping: true,
    showFinancials: false,
    showPaymentInfo: false,
    showProducts: true,
    showNotes: true,
    showTimeline: false,
    showStatusControl: true,
  },
  delivery: {
    title: 'Delivery Details',
    backLabel: 'Back to Ready to Deliver',
    backPath: '/lab/ready-to-deliver',
    showCustomer: true,
    showShipping: true,
    showFinancials: false,
    showPaymentInfo: false,
    showProducts: false,
    showNotes: false,
    showTimeline: true,
    showStatusControl: true,
  },
  dispatch: {
    title: 'Dispatch Record',
    backLabel: 'Back to Dispatch History',
    backPath: '/lab/dispatch-history',
    showCustomer: true,
    showShipping: true,
    showFinancials: true,
    showPaymentInfo: true,
    showProducts: true,
    showNotes: false,
    showTimeline: true,
    showStatusControl: false,
  },
  full: {
    title: 'Full Details of Order',
    backLabel: 'Back to Queue',
    backPath: '/lab/queue',
    showCustomer: true,
    showShipping: true,
    showFinancials: true,
    showPaymentInfo: true,
    showProducts: true,
    showNotes: true,
    showTimeline: true,
    showStatusControl: true,
  }
};

export default function LabOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Determine context from the referrer stored in location state, or fallback to status-based context
  const referrerPath = location.state?.from || '';
  const context = useMemo(() => {
    const fromReferrer = getContextFromReferrer(referrerPath);
    if (fromReferrer) return fromReferrer;
    if (order) return getContextFromStatus(order.status);
    return 'full'; // default fallback while loading
  }, [referrerPath, order]);
  
  const cfg = CONTEXT_CONFIG[context];

  const backPath = useMemo(() => {
    return referrerPath || cfg.backPath;
  }, [referrerPath, cfg.backPath]);

  const backLabel = useMemo(() => {
    if (referrerPath) {
      if (referrerPath.includes('/production')) return 'Back to Production Board';
      if (referrerPath.includes('/dashboard')) return 'Back to Dashboard';
      if (referrerPath.includes('/queue')) return 'Back to Orders Queue';
      if (referrerPath.includes('/print-queue')) return 'Back to Print Queue';
      if (referrerPath.includes('/quality-control')) return 'Back to Quality Control';
      if (referrerPath.includes('/reprints')) return 'Back to Reprints';
      if (referrerPath.includes('/packaging')) return 'Back to Packaging Center';
      if (referrerPath.includes('/ready-to-deliver')) return 'Back to Ready to Deliver';
      if (referrerPath.includes('/dispatch-history')) return 'Back to Dispatch History';
    }
    return cfg.backLabel;
  }, [referrerPath, cfg.backLabel]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      
      const { data: orderData, error: orderError } = await supabase
        .from('printstore_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('printstore_order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const { data: trackingData, error: trackingError } = await supabase
        .from('printstore_order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (trackingError) throw trackingError;

      setOrder(orderData);
      setOrderItems(itemsData || []);
      setTrackingLogs(trackingData || []);
    } catch (err) {
      console.error('Error loading order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const handleStatusChange = async (newStatus) => {
    if (!order) return;
    const isConfirmed = window.confirm(`Are you sure you want to change status to "${STATUS_LABELS[newStatus]}"?`);
    if (!isConfirmed) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) {
        let fallbackStatus = newStatus;
        if (newStatus === 'printing' || newStatus === 'printed') {
          fallbackStatus = 'processing';
        } else if (newStatus === 'packaging' || newStatus === 'ready_to_ship') {
          fallbackStatus = 'packed';
        }
        const { error: fallbackError } = await supabase
          .from('printstore_orders')
          .update({ status: fallbackStatus })
          .eq('id', order.id);
        if (fallbackError) throw fallbackError;
      }
      
      await fetchOrderDetail();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getValidNextStatuses = (current) => {
    const steps = {
      'pending': ['pending', 'printing', 'cancelled'],
      'printing': ['printing', 'printed', 'reprint', 'cancelled'],
      'printed': ['printed', 'packaging', 'reprint', 'cancelled'],
      'packaging': ['packaging', 'ready_to_ship', 'cancelled'],
      'ready_to_ship': ['ready_to_ship', 'shipped', 'cancelled'],
      'shipped': ['shipped', 'completed'],
      'reprint': ['reprint', 'printing', 'cancelled'],
      'completed': ['completed'],
      'cancelled': ['cancelled']
    };
    return steps[current] || [current];
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);
  };

  const formatAddress = (addressObj) => {
    if (!addressObj) return 'No address details provided.';
    const parts = [];
    if (addressObj.street || addressObj.address) parts.push(addressObj.street || addressObj.address);
    if (addressObj.city) parts.push(addressObj.city);
    if (addressObj.state) parts.push(addressObj.state);
    if (addressObj.postalCode || addressObj.zip) parts.push(addressObj.postalCode || addressObj.zip);
    if (addressObj.country) parts.push(addressObj.country);
    return parts.join(', ');
  };

  const buildPreviewItem = (item) => {
    const opts = item.options || {};
    return {
      productId: item.product_type || '',
      productName: item.product_name || '',
      photo: opts.photo || null,
      photos: opts.photos || [],
      size: opts.size || null,
      frame: opts.frame || null,
      paper: opts.paper || null,
      border: opts.border || 'none',
      layout: opts.layout || null,
      rotation: opts.rotation || 0,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price || 0),
    };
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', backgroundColor: '#ffffff', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#777777', fontSize: '15px' }}>Loading order spec ledger...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '60px', backgroundColor: '#ffffff', minHeight: '100%' }}>
        <button onClick={() => navigate(backPath)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Order Not Found</h2>
        </div>
      </div>
    );
  }

  const orderNumber = `#PXNXT-${order.id.substring(0, 8).toUpperCase()}`;
  const validOptions = getValidNextStatuses(order.status);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;

  // Section heading helper
  const SectionHeading = ({ children }) => (
    <h3 style={{ fontFamily: "'EB Garamond', serif", fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', fontWeight: 600, color: '#005c5a' }}>
      {children}
    </h3>
  );

  return (
    <div style={{ padding: '48px 60px', backgroundColor: '#ffffff', minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'europa', sans-serif", color: '#111111', boxSizing: 'border-box' }}>
      
      {/* Back button */}
      <button 
        onClick={() => navigate(backPath)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '28px' }}
      >
        <ArrowLeft size={16} /> {backLabel}
      </button>

      {/* Title + Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eaeaea', paddingBottom: '24px', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', fontWeight: 500, margin: '0', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#005c5a' }}>
              {cfg.title}: {orderNumber}
            </h1>
            <span style={{
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: `${STATUS_COLORS[order.status]}15`,
              color: STATUS_COLORS[order.status],
              border: `1px solid ${STATUS_COLORS[order.status]}30`,
            }}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <p style={{ color: '#777777', fontSize: '12px', margin: '6px 0 0 0', fontFamily: 'monospace' }}>
            ID: {order.id}
          </p>
        </div>
        {context === 'full' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
            <img src={qrUrl} alt="Order QR Tracking" style={{ width: '60px', height: '60px' }} />
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              <strong>QR Code Tracking</strong><br />
              Scan to inspect specs<br />
              and production logs.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Customer Info & Shipping — shown for packaging, delivery, dispatch, full */}
        {(cfg.showCustomer || cfg.showShipping) && (
          <div style={{ display: 'grid', gridTemplateColumns: cfg.showCustomer && cfg.showShipping ? '1fr 1fr' : '1fr', gap: '40px', borderBottom: '1px solid #eaeaea', paddingBottom: '28px' }}>
            {cfg.showCustomer && (
              <div>
                <SectionHeading>Customer Information</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}><User size={15} color="#777" /> <span><strong>Customer Name:</strong> {order.customer_name}</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><Mail size={15} color="#777" /> <span><strong>Customer Email:</strong> {order.customer_email}</span></div>
                  <div><strong>Phone:</strong> {order.shipping_address?.phone || 'N/A'}</div>
                </div>
              </div>
            )}
            {cfg.showShipping && (
              <div>
                <SectionHeading>Shipping Address</SectionHeading>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13.5px', lineHeight: '1.5' }}>
                  <MapPin size={16} color="#777" style={{ marginTop: '2px' }} />
                  <div>{formatAddress(order.shipping_address)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Info & Financials — shown for dispatch, full */}
        {(cfg.showPaymentInfo || cfg.showFinancials) && (
          <div style={{ display: 'grid', gridTemplateColumns: cfg.showPaymentInfo && cfg.showFinancials ? '1fr 1fr' : '1fr', gap: '40px', borderBottom: '1px solid #eaeaea', paddingBottom: '28px' }}>
            {cfg.showPaymentInfo && (
              <div>
                <SectionHeading>Order Information</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <div><strong>Photographer UID:</strong> <span style={{ fontFamily: 'monospace' }}>{order.photographer_id}</span></div>
                  {order.payment_intent_id && <div><strong>Payment Intent ID:</strong> <span style={{ fontFamily: 'monospace' }}>{order.payment_intent_id}</span></div>}
                  <div><strong>Payment Engine Provider:</strong> <span style={{ textTransform: 'uppercase' }}>{order.payment_provider || 'Stripe'}</span></div>
                  <div><strong>Order Placement Date:</strong> {new Date(order.created_at).toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
            {cfg.showFinancials && (
              <div>
                <SectionHeading>Order Financials</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}><span>Shipping Amount</span><span>{Number(order.shipping_amount) === 0 ? 'Free' : formatPrice(order.shipping_amount)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}><span>Tax (8%)</span><span>{formatPrice(order.tax_amount)}</span></div>
                  {Number(order.discount_amount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c53030' }}><span>Discount</span><span>-{formatPrice(order.discount_amount)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #eaeaea', paddingTop: '8px', fontSize: '15px' }}><span>Total Amount</span><span>{formatPrice(order.total)}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Specifications — shown for print, qc, reprint, packaging, dispatch, full */}
        {cfg.showProducts && (
          <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '28px' }}>
            <SectionHeading>Product Specifications ({orderItems.length} items)</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {orderItems.map((item, idx) => {
                const opts = item.options || {};
                return (
                  <div key={item.id} style={{ display: 'flex', gap: '24px', paddingBottom: '20px', borderBottom: idx === orderItems.length - 1 ? 'none' : '1px dashed #eaeaea' }}>
                    <div onClick={() => setPreviewItem(buildPreviewItem(item))} style={{ width: '80px', height: '80px', border: '1px solid #cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', cursor: 'zoom-in', flexShrink: 0 }}>
                      <div style={{ transform: 'scale(0.26)', transformOrigin: 'center center', width: '307.25px', height: '307.25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CartItemPreview item={buildPreviewItem(item)} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>{item.product_name} (x{item.quantity})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', fontSize: '12.5px', color: '#475569' }}>
                        <div><strong>Product Type:</strong> <span style={{ textTransform: 'uppercase' }}>{item.product_type}</span></div>
                        {opts.size?.label && <div><strong>Print Size:</strong> {opts.size.label}</div>}
                        {opts.paper?.label && <div><strong>Paper Type:</strong> {opts.paper.label}</div>}
                        {opts.border && <div><strong>Border Size:</strong> {opts.border}</div>}
                        {opts.frame?.label && <div><strong>Frame Type:</strong> {opts.frame.label}</div>}
                        {opts.frame?.color && <div><strong>Frame Color:</strong> {opts.frame.color}</div>}
                        {opts.rotation !== undefined && <div><strong>Rotation:</strong> {opts.rotation}°</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manufacturing Notes — shown for print, qc, reprint, packaging, full */}
        {cfg.showNotes && (
          <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '28px' }}>
            <SectionHeading>Manufacturing Notes</SectionHeading>
            <div style={{ padding: '16px', backgroundColor: '#fafafa', borderLeft: '4px solid #005c5a', fontSize: '13px', color: '#475569' }}>
              <strong>Internal Notes:</strong> Handle optical glass with powder-free gloves. Avoid scratching frames during miter cuts. Wrap with corner protectors before boxing.
            </div>
          </div>
        )}

        {/* Timeline & Status Controls — conditionally shown */}
        {(cfg.showTimeline || cfg.showStatusControl) && (
          <div>
            <SectionHeading>Timeline & Status Controls</SectionHeading>

            <div style={{ display: 'grid', gridTemplateColumns: cfg.showStatusControl ? '300px 1fr' : '1fr', gap: '40px', alignItems: 'start' }}>
              
              {/* Status Change Dropdown */}
              {cfg.showStatusControl && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', color: '#64748b' }}>
                    Manufacturer Progress State
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updatingStatus || order.status === 'completed' || order.status === 'cancelled'}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: STATUS_COLORS[order.status],
                      fontSize: '13px',
                      fontWeight: 'bold',
                      outline: 'none',
                      cursor: (updatingStatus || order.status === 'completed' || order.status === 'cancelled') ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => {
                      const isSelectable = validOptions.includes(value);
                      return (
                        <option 
                          key={value} 
                          value={value} 
                          disabled={!isSelectable} 
                          style={{ backgroundColor: '#ffffff', color: isSelectable ? '#333' : '#cbd5e1' }}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Timeline Events */}
              {cfg.showTimeline && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '1px solid #cbd5e1', paddingLeft: '24px', position: 'relative' }}>
                  {trackingLogs.map((log, index) => (
                    <div key={log.id} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-29px',
                        top: '3px',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: index === trackingLogs.length - 1 ? STATUS_COLORS[order.status] : '#cbd5e1',
                        border: '2px solid #ffffff'
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '13px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#111' }}>{log.label}</div>
                          {log.description && <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{log.description}</div>}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(log.created_at).toLocaleDateString('en-IN')} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {trackingLogs.length === 0 && (
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No tracking events recorded yet.</div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Lightbox Preview */}
      {previewItem && (
        <div onClick={() => setPreviewItem(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '80vh', height: '80vh', maxWidth: '600px', maxHeight: '600px', background: '#fff', padding: '24px', position: 'relative', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setPreviewItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            <div style={{ transform: 'scale(1.8)', transformOrigin: 'center center', width: '307.25px', height: '307.25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CartItemPreview item={previewItem} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
