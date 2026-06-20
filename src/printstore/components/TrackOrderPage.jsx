import React, { useState, useEffect } from 'react';
import { Check, Package, MapPin, User, Mail, CreditCard, Clock, Hash, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import CartItemPreview from './CartItemPreview';

const STATUS_TO_STEP = {
  pending: 0,
  processing: 2,
  shipped: 5,
  completed: 7,
  cancelled: 0,
};

const STATUS_LABELS = {
  pending: 'Order Placed',
  processing: 'Processing',
  shipped: 'Shipped',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

const TABS = ['Live orders', 'Cancelled', 'Completed'];

export default function TrackOrderPage({ sessionId, photographer }) {
  const [orders, setOrders] = useState([]);
  const [allOrderItems, setAllOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [expandedItemIds, setExpandedItemIds] = useState({}); // item ID -> bool

  const handleCopyOrderId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const toggleItemExpansion = (itemId, e) => {
    e.stopPropagation();
    setExpandedItemIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSubmitLoading, setCancelSubmitLoading] = useState(false);

  const handleOpenCancelModal = (order, e) => {
    e.stopPropagation();
    setCancellingOrder(order);
    setCancelReason('');
    setOtherReason('');
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    if (cancelSubmitLoading) return;
    setCancellingOrder(null);
  };

  const handleSubmitCancellation = async () => {
    if (!cancellingOrder || !cancelReason) return;
    if (cancelReason === 'Other' && !otherReason.trim()) return;

    setCancelSubmitLoading(true);
    setCancelError('');

    const finalReason = cancelReason === 'Other' ? otherReason.trim() : cancelReason;

    try {
      const { error: insertError } = await supabase
        .from('printstore_cancelled_orders')
        .insert({
          order_id: cancellingOrder.id,
          photographer_id: cancellingOrder.photographer_id,
          session_id: cancellingOrder.session_id || null,
          customer_name: cancellingOrder.customer_name,
          customer_email: cancellingOrder.customer_email,
          cancel_reason: finalReason,
          cancelled_by: 'customer',
          refund_status: 'pending',
          refund_amount: 0.00,
          original_total: cancellingOrder.total,
          original_status: cancellingOrder.status
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('printstore_orders')
        .update({ status: 'cancelled' })
        .eq('id', cancellingOrder.id);

      if (updateError) throw updateError;

      setOrders(prev => prev.map(o => {
        if (o.id === cancellingOrder.id) {
          return { ...o, status: 'cancelled', cancel_reason: finalReason };
        }
        return o;
      }));

      setCancellingOrder(null);
    } catch (err) {
      console.error('Error submitting cancellation:', err);
      setCancelError(err.message || 'An unexpected error occurred during cancellation.');
    } finally {
      setCancelSubmitLoading(false);
    }
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        let localEmail = '';
        try {
          const cachedAddr = localStorage.getItem('pixnxt_printstore_address');
          if (cachedAddr) {
            const parsed = JSON.parse(cachedAddr);
            if (parsed && parsed.email) {
              localEmail = parsed.email;
            }
          }
        } catch (e) {
          console.error('Error reading address from localStorage:', e);
        }

        let query = supabase
          .from('printstore_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (sessionId && localEmail) {
          query = query.or(`session_id.eq.${sessionId},customer_email.eq.${localEmail}`);
        } else if (sessionId) {
          query = query.eq('session_id', sessionId);
        } else if (localEmail) {
          query = query.eq('customer_email', localEmail);
        } else {
          setOrders([]);
          setLoading(false);
          return;
        }

        const { data: ordersData, error } = await query;

        if (error) {
          console.error('Error fetching orders:', error);
          setOrders([]);
          setLoading(false);
          return;
        }

        if (!ordersData || ordersData.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const orderIds = ordersData.map(o => o.id);
        const { data: items, error: itemsError } = await supabase
          .from('printstore_order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        }
        setAllOrderItems(items || []);

        // Fetch cancellation reasons
        const cancelledOrderIds = ordersData.filter(o => o.status === 'cancelled').map(o => o.id);
        let cancellationReasons = {};
        if (cancelledOrderIds.length > 0) {
          const { data: cancelData, error: cancelError } = await supabase
            .from('printstore_cancelled_orders')
            .select('order_id, cancel_reason')
            .in('order_id', cancelledOrderIds);
          
          if (!cancelError && cancelData) {
            cancelData.forEach(c => {
              cancellationReasons[c.order_id] = c.cancel_reason;
            });
          }
        }

        const enrichedOrders = ordersData.map(o => {
          if (o.status === 'cancelled' && cancellationReasons[o.id]) {
            return { ...o, cancel_reason: cancellationReasons[o.id] };
          }
          return o;
        });

        setOrders(enrichedOrders);
      } catch (err) {
        console.error('Unexpected error fetching orders:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [sessionId]);

  const getFilteredOrders = () => {
    return orders.filter(o => {
      if (activeTabIdx === 0) {
        return o.status !== 'cancelled' && o.status !== 'completed';
      } else if (activeTabIdx === 1) {
        return o.status === 'cancelled';
      } else {
        return o.status === 'completed';
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  useEffect(() => {
    if (filteredOrders.length > 0) {
      setExpandedOrderId(filteredOrders[0].id);
    } else {
      setExpandedOrderId(null);
    }
  }, [activeTabIdx, orders]);

  // Build preview item for CartItemPreview
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
      <div className="track-order-page-container pdp-products-page cart-page-container">
        <div className="track-order-header-page">
          <h2>TRACK YOUR ORDER</h2>
        </div>
        <div className="track-order-content">
          <p style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-order-page-container pdp-products-page cart-page-container">
      <div className="track-order-header-page">
        <h2>TRACK YOUR ORDER</h2>
      </div>

      <div className="track-order-content">
        {/* Sliding Segments Tab Bar */}
        <div className="segmented-control-container">
          <div className="segmented-control">
            <div
              className="segmented-control-slider"
              style={{
                left: `${(activeTabIdx * 100) / 3}%`,
                width: '33.333%',
              }}
            />
            {TABS.map((tab, idx) => (
              <button
                key={tab}
                className={`segmented-control-tab ${activeTabIdx === idx ? 'active' : ''}`}
                onClick={() => setActiveTabIdx(idx)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Listing */}
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: '#888', fontSize: '1rem' }}>No {TABS[activeTabIdx].toLowerCase()} found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredOrders.map((order) => {
              const orderItems = allOrderItems.filter(item => item.order_id === order.id);
              const orderNumber = `#PXNXT-${order.id.substring(0, 8).toUpperCase()}`;
              const isExpanded = expandedOrderId === order.id;
              const isCancelled = order.status === 'cancelled';
              const currentStepIndex = STATUS_TO_STEP[order.status] ?? 0;
              const shippingAddr = order.shipping_address || {};
              const orderDate = new Date(order.created_at);
              const formattedDate = orderDate.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
              const formattedTime = orderDate.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true
              });

              const steps = [
                { label: 'Order placed', date: formattedDate + ', ' + formattedTime },
                { label: 'Sent to making lab', date: currentStepIndex >= 1 ? '' : 'Pending' },
                { label: 'Product made', date: currentStepIndex >= 2 ? '' : 'Pending' },
                { label: 'Packed', date: currentStepIndex >= 3 ? '' : 'Pending' },
                { label: 'Dispatching', date: currentStepIndex >= 4 ? '' : 'Pending' },
                { label: 'Dispatched', date: currentStepIndex >= 5 ? '' : 'Pending' },
                { label: 'Arrived', date: currentStepIndex >= 6 ? '' : 'Pending' },
                { label: 'Delivered', date: currentStepIndex >= 7 ? 'Delivered' : 'Pending' },
              ];

              return (
                <div key={order.id} className="order-collapsible-card">
                  {/* Card Header */}
                  <div
                    className="order-collapsible-header"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <div className="order-collapsible-header-left">
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Order Number</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>{orderNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Date</div>
                        <div style={{ fontSize: '0.9rem', color: '#333', fontWeight: 500 }}>{formattedDate}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Total</div>
                        <div style={{ fontSize: '0.9rem', color: '#111', fontWeight: 600 }}>₹{Number(order.total).toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="order-collapsible-header-right">
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: isCancelled ? '#fce4ec' : order.status === 'completed' ? '#e8f5e9' : order.status === 'shipped' ? '#e3f2fd' : '#fff8e1',
                        color: isCancelled ? '#c62828' : order.status === 'completed' ? '#2e7d32' : order.status === 'shipped' ? '#1565c0' : '#f57f17',
                      }}>
                        {isCancelled ? '✕' : order.status === 'completed' ? '✓' : '●'} {STATUS_LABELS[order.status] || order.status}
                      </div>
                      {isExpanded ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
                    </div>
                  </div>

                  {/* Card Body */}
                  {isExpanded && (
                    <div style={{ padding: '1.5rem', background: '#ffffff', borderTop: '1px solid #eaeaea' }}>
                      
                      {/* Ordered Products list */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '12px', fontWeight: 600 }}>
                          <Package size={14} style={{ flexShrink: 0 }} />Ordered Items ({orderItems.length})
                        </div>

                        {orderItems.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#aaa', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            No items found for this order.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {orderItems.map((item) => {
                              const opts = item.options || {};
                              const previewItem = buildPreviewItem(item);
                              const isItemExpanded = expandedItemIds[item.id];

                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    background: '#ffffff',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid #eaeaea',
                                  }}
                                >
                                  {/* Item Row */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '1rem',
                                      padding: '0.75rem 1rem',
                                      cursor: 'pointer',
                                    }}
                                    onClick={(e) => toggleItemExpansion(item.id, e)}
                                  >
                                    {/* Product Image Preview */}
                                    <div style={{
                                      width: '80px',
                                      height: '80px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      overflow: 'hidden',
                                      background: '#fff',
                                      border: '1px solid #eaeaea',
                                      borderRadius: '6px',
                                      flexShrink: 0,
                                    }}>
                                      <div style={{
                                        transform: 'scale(0.26)',
                                        transformOrigin: 'center center',
                                        width: '307.25px',
                                        height: '307.25px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}>
                                        <CartItemPreview item={previewItem} />
                                      </div>
                                    </div>

                                    {/* Product Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111', marginBottom: '2px' }}>
                                        {item.product_name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                                        {opts.size?.label && <span>{opts.size.label}</span>}
                                        {opts.frame?.label && opts.frame.label !== 'No Frame' && opts.frame.label !== 'No Frame (Print Only)' && <span>• {opts.frame.label}</span>}
                                        {opts.paper?.label && <span>• {opts.paper.label}</span>}
                                        <span>• Qty: {item.quantity}</span>
                                      </div>
                                    </div>

                                    {/* Price & Expand Chevron */}
                                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111' }}>
                                          ₹{Number(item.subtotal).toFixed(2)}
                                        </div>
                                        {item.quantity > 1 && (
                                          <div style={{ fontSize: '0.65rem', color: '#888' }}>
                                            ₹{Number(item.unit_price).toFixed(2)} each
                                          </div>
                                        )}
                                      </div>
                                      {isItemExpanded ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                                    </div>
                                  </div>

                                  {/* Expanded Item Details */}
                                  {isItemExpanded && (
                                    <div style={{
                                      borderTop: '1px solid #eaeaea',
                                      padding: '0.75rem 1rem',
                                      background: '#fafafa',
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: '6px 2rem',
                                      fontSize: '0.75rem',
                                    }}>
                                      <div style={{ color: '#888' }}>Product Type</div>
                                      <div style={{ color: '#333', fontWeight: 500, textTransform: 'capitalize' }}>{item.product_type?.replace(/_/g, ' ')}</div>

                                      <div style={{ color: '#888' }}>Product ID</div>
                                      <div style={{ color: '#333', fontFamily: 'monospace', fontSize: '0.7rem' }}>{item.product_id || '—'}</div>

                                      <div style={{ color: '#888' }}>Item ID</div>
                                      <div style={{ color: '#333', fontFamily: 'monospace', fontSize: '0.7rem' }}>{item.id}</div>

                                      {opts.size?.label && <>
                                        <div style={{ color: '#888' }}>Size</div>
                                        <div style={{ color: '#333', fontWeight: 500 }}>{opts.size.label}{opts.size.printSize ? ` (Print: ${opts.size.printSize})` : ''}</div>
                                      </>}

                                      {opts.frame && opts.frame.label !== 'No Frame' && opts.frame.label !== 'No Frame (Print Only)' && <>
                                        <div style={{ color: '#888' }}>Frame</div>
                                        <div style={{ color: '#333', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {opts.frame.color && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: opts.frame.color, border: '1px solid #ddd', verticalAlign: 'middle' }} />}
                                          {opts.frame.label}
                                        </div>
                                      </>}

                                      {opts.paper?.label && <>
                                        <div style={{ color: '#888' }}>Paper</div>
                                        <div style={{ color: '#333', fontWeight: 500 }}>{opts.paper.label}</div>
                                      </>}

                                      {opts.border && opts.border !== 'none' && <>
                                        <div style={{ color: '#888' }}>Border</div>
                                        <div style={{ color: '#333', fontWeight: 500, textTransform: 'capitalize' }}>{opts.border}</div>
                                      </>}

                                      {opts.layout && <>
                                        <div style={{ color: '#888' }}>Layout</div>
                                        <div style={{ color: '#333', fontWeight: 500 }}>{opts.layout.icon?.replace(/_/g, ' ')} ({opts.layout.photos} photos)</div>
                                      </>}

                                      <div style={{ color: '#888' }}>Unit Price</div>
                                      <div style={{ color: '#333', fontWeight: 500 }}>₹{Number(item.unit_price).toFixed(2)}</div>

                                      <div style={{ color: '#888' }}>Quantity</div>
                                      <div style={{ color: '#333', fontWeight: 500 }}>{item.quantity}</div>

                                      <div style={{ color: '#888' }}>Subtotal</div>
                                      <div style={{ color: '#111', fontWeight: 600 }}>₹{Number(item.subtotal).toFixed(2)}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Info Row Grid: Details + Address side-by-side */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.25rem',
                        marginBottom: '2rem',
                      }}>
                        {/* Customer Info */}
                        <div className="order-details-box" style={{ margin: 0, background: '#fafafa', border: '1px solid #eaeaea', padding: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '12px', fontWeight: 600 }}>
                            <User size={13} style={{ flexShrink: 0 }} />Customer Details
                          </div>
                          <div className="order-info-row" style={{ fontSize: '0.85rem' }}>
                            <span className="order-label" style={{ minWidth: '100px' }}>Name:</span>
                            <span className="order-value" style={{ color: '#333' }}>{order.customer_name}</span>
                          </div>
                          <div className="order-info-row" style={{ fontSize: '0.85rem' }}>
                            <span className="order-label" style={{ minWidth: '100px' }}>Email:</span>
                            <span className="order-value" style={{ wordBreak: 'break-all', color: '#333' }}>{order.customer_email}</span>
                          </div>
                          <div className="order-info-row" style={{ fontSize: '0.85rem' }}>
                            <span className="order-label" style={{ minWidth: '100px' }}>Order Date:</span>
                            <span className="order-value" style={{ color: '#333' }}>{formattedDate}, {formattedTime}</span>
                          </div>
                          <div className="order-info-row" style={{ fontSize: '0.85rem' }}>
                            <span className="order-label" style={{ minWidth: '100px' }}>Payment:</span>
                            <span className="order-value" style={{ textTransform: 'capitalize', color: '#333' }}>{order.payment_provider || 'Card'}</span>
                          </div>
                          <div className="order-info-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span className="order-label" style={{ minWidth: '100px' }}>Order ID:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="order-value" style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#666' }}>{order.id}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyOrderId(order.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#888',
                                  borderRadius: '4px',
                                }}
                                title="Copy Order ID"
                              >
                                {copiedOrderId === order.id ? <Check size={12} color="#2e7d32" strokeWidth={3} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Shipping Address & Summary */}
                        <div className="order-details-box" style={{ margin: 0, background: '#fafafa', border: '1px solid #eaeaea', padding: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '12px', fontWeight: 600 }}>
                            <MapPin size={13} style={{ flexShrink: 0 }} />Shipping Address
                          </div>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#333' }}>
                            {shippingAddr.address && <div>{shippingAddr.address}</div>}
                            {shippingAddr.city && <div>{shippingAddr.city}{shippingAddr.zip ? ` — ${shippingAddr.zip}` : ''}</div>}
                            {shippingAddr.country && <div>{shippingAddr.country}</div>}
                            {!shippingAddr.address && !shippingAddr.city && <div style={{ color: '#aaa' }}>No address provided</div>}
                          </div>

                          <div style={{ marginTop: '1rem', borderTop: '1px solid #eaeaea', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                              <span>Subtotal</span>
                              <span>₹{Number(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                              <span>Shipping</span>
                              <span>{Number(order.shipping_amount) === 0 ? 'Free' : `₹${Number(order.shipping_amount).toFixed(2)}`}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                              <span>Tax</span>
                              <span>₹{Number(order.tax_amount).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, color: '#111', borderTop: '1px solid #eaeaea', paddingTop: '6px', marginTop: '4px' }}>
                              <span>Total</span>
                              <span>₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Timeline */}
                      <div className="timeline-container-wrapper" style={{ margin: 0, padding: '1.25rem', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                        <h3 className="timeline-title" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>DELIVERY STATUS</h3>
                        
                        {isCancelled && (
                          <div style={{
                            background: '#fce4ec',
                            color: '#c62828',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ✕ This order has been cancelled.
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, paddingLeft: '18px', color: '#b71c1c' }}>
                              <strong>Reason:</strong> {order.cancel_reason || 'Customer requested cancellation'}
                            </div>
                          </div>
                        )}

                        <div className="horizontal-timeline">
                          {steps.map((step, index) => {
                            const isCompleted = !isCancelled && index <= currentStepIndex;
                            const isCurrent = !isCancelled && index === currentStepIndex;

                            return (
                              <div
                                key={index}
                                className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isCancelled ? 'cancelled' : ''}`}
                              >
                                <div className="step-indicator-wrapper">
                                  <div className="step-indicator">
                                    {isCompleted ? <Check size={12} color="#fff" strokeWidth={3} /> : <div className="step-dot" />}
                                  </div>
                                  {index < steps.length - 1 && (
                                    <div className={`step-line ${!isCancelled && index < currentStepIndex ? 'completed-line' : ''}`}></div>
                                  )}
                                </div>
                                <div className="step-content">
                                  <div className="step-label" style={{ fontSize: '0.72rem' }}>{step.label}</div>
                                  <div className="step-date" style={{ fontSize: '0.62rem' }}>{step.date}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cancel Order Action */}
                      {!isCancelled && order.status !== 'completed' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenCancelModal(order, e)}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: '#fff',
                              border: '1px solid #dc2626',
                              color: '#dc2626',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#fef2f2';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#fff';
                            }}
                          >
                            Cancel Order
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Modal Overlay */}
      {cancellingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 600, color: '#111' }}>Cancel Order</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#666', lineHeight: 1.5 }}>
              Are you sure you want to cancel order <strong style={{ fontFamily: 'monospace' }}>#PXNXT-{cancellingOrder.id.substring(0, 8).toUpperCase()}</strong>? This action cannot be undone.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>
                Reason for Cancellation *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  color: '#111',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  background: '#ffffff',
                }}
              >
                <option value="" style={{ backgroundColor: '#ffffff', color: '#111' }}>Select a reason...</option>
                <option value="Changed my mind" style={{ backgroundColor: '#ffffff', color: '#111' }}>Changed my mind</option>
                <option value="Incorrect item selected" style={{ backgroundColor: '#ffffff', color: '#111' }}>Incorrect item selected</option>
                <option value="Ordered by mistake" style={{ backgroundColor: '#ffffff', color: '#111' }}>Ordered by mistake</option>
                <option value="Delivery time is too long" style={{ backgroundColor: '#ffffff', color: '#111' }}>Delivery time is too long</option>
                <option value="Other" style={{ backgroundColor: '#ffffff', color: '#111' }}>Other reason...</option>
              </select>
            </div>

            {cancelReason === 'Other' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Please specify *
                </label>
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us why you are cancelling..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    color: '#111',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            )}

            {cancelError && (
              <div style={{ color: '#e11d48', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 500 }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseCancelModal}
                disabled={cancelSubmitLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleSubmitCancellation}
                disabled={cancelSubmitLoading || !cancelReason || (cancelReason === 'Other' && !otherReason.trim())}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: (cancelSubmitLoading || !cancelReason || (cancelReason === 'Other' && !otherReason.trim())) ? 0.6 : 1,
                }}
              >
                {cancelSubmitLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
