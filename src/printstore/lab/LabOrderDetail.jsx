import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, MapPin, CheckSquare, Square, AlertTriangle, Upload, X, ShieldAlert, Image, RefreshCw, CheckCircle2, History, Camera, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import CartItemPreview from '../components/CartItemPreview';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

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


const employees = [
  { id: 1, name: 'Hari Prasath', role: 'Production Operator' },
  { id: 2, name: 'Karthik', role: 'QC Inspector' },
  { id: 3, name: 'Seema', role: 'QC Specialist' },
  { id: 4, name: 'Ramesh', role: 'Packaging Specialist' },
  { id: 5, name: 'Vijay', role: 'Logistics Supervisor' }
];

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

  // Edit Order modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPriority, setEditPriority] = useState('');
  const [editAssigned, setEditAssigned] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editEstTime, setEditEstTime] = useState('');
  const [editLabNote, setEditLabNote] = useState('');

  // Change Address modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrPhone, setAddrPhone] = useState('');

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

      // Pre-fill edit fields
      setEditPriority(orderData.priority || 'Medium');
      setEditAssigned(orderData.assigned_employee || 'Unassigned');
      setEditDueDate(orderData.due_date ? orderData.due_date.substring(0, 10) : '');
      setEditEstTime(orderData.estimated_time || '2 Day(s)');
      setEditLabNote(orderData.lab_note || '');

      // Pre-fill address fields
      const addr = orderData.shipping_address || {};
      setAddrStreet(addr.street || addr.address || '');
      setAddrCity(addr.city || '');
      setAddrState(addr.state || '');
      setAddrZip(addr.postalCode || addr.zip || '');
      setAddrPhone(addr.phone || '');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <div className="lab-spinner" />
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

  const orderNumber = getShortId(order.id, 'order');
  const validOptions = getValidNextStatuses(order.status);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;

  // Section heading helper
  const SectionHeading = ({ children }) => (
    <h3 style={{ fontFamily: "'EB Garamond', serif", fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', fontWeight: 600, color: '#005c5a' }}>
      {children}
    </h3>
  );

  if (context === 'qc') {
    return (
      <LabQualityControlWorkspace 
        order={order}
        orderItems={orderItems}
        backPath={backPath}
        backLabel={backLabel}
        onActionSuccess={fetchOrderDetail}
      />
    );
  }

  const handleSaveOrderEdits = async () => {
    try {
      const { error } = await supabase
        .from('printstore_orders')
        .update({
          priority: editPriority,
          assigned_employee: editAssigned === 'Unassigned' ? null : editAssigned,
          due_date: editDueDate || null,
          estimated_time: editEstTime,
          lab_note: editLabNote
        })
        .eq('id', order.id);
      if (error) throw error;
      setShowEditModal(false);
      await fetchOrderDetail();
    } catch (err) {
      alert("Failed to save order edits: " + err.message);
    }
  };

  const handleSaveAddress = async () => {
    try {
      const newAddress = {
        ...order.shipping_address,
        street: addrStreet,
        city: addrCity,
        state: addrState,
        postalCode: addrZip,
        phone: addrPhone
      };
      const { error } = await supabase
        .from('printstore_orders')
        .update({ shipping_address: newAddress })
        .eq('id', order.id);
      if (error) throw error;
      setShowAddressModal(false);
      await fetchOrderDetail();
    } catch (err) {
      alert("Failed to save address: " + err.message);
    }
  };

  const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedUpdatedDate = order.updated_at 
    ? new Date(order.updated_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : formattedDate;

  return (
    <div style={{ padding: '32px 40px', backgroundColor: '#ffffff', minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: '#1f2937', boxSizing: 'border-box' }}>
      
      {/* Printable Invoice stylesheet injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-invoice-only, .printable-invoice-only * {
            visibility: visible;
          }
          .printable-invoice-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: #fff !important;
            color: #000 !important;
            padding: 24px !important;
          }
        }
      `}</style>

      {/* Hidden Tax Invoice for Print Trigger */}
      <div className="printable-invoice-only" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>PIXNXT MANUFACTURING LAB</h1>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#4b5563' }}>Noida Hub Production Facility, Sector 63, Noida, UP</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>TAX INVOICE</h2>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#4b5563' }}>Invoice No: INV-{order.id.substring(0, 8).toUpperCase()}</p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#4b5563' }}>Date: {formattedDate}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px', fontSize: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>BILLED TO:</h3>
            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{order.customer_name}</p>
            <p style={{ margin: '4px 0' }}>{formatAddress(order.shipping_address)}</p>
            <p style={{ margin: '4px 0' }}>Phone: {order.shipping_address?.phone || 'N/A'}</p>
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>TRANSACTION DETAILS:</h3>
            <p style={{ margin: '4px 0' }}>Order ID: <strong>{order.id}</strong></p>
            <p style={{ margin: '4px 0' }}>Payment Provider: {order.payment_provider || 'Razorpay'}</p>
            <p style={{ margin: '4px 0' }}>Status: <strong>PAID</strong></p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111827', textAlign: 'left', fontWeight: 'bold' }}>
              <th style={{ padding: '8px 0' }}>Item Name</th>
              <th style={{ padding: '8px 0' }}>Size / Paper</th>
              <th style={{ padding: '8px 0', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Price</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0' }}>{item.product_name}</td>
                <td style={{ padding: '8px 0' }}>{item.options?.size?.label || 'N/A'} / {item.options?.paper?.label || 'N/A'}</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatPrice(item.unit_price)}</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatPrice(item.unit_price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px' }}>
          <div style={{ width: '250px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span>Shipping</span><span>{formatPrice(order.shipping_amount || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span>Tax</span><span>{formatPrice(order.tax_amount || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 0 0', fontWeight: 'bold', borderTop: '2px solid #111827', paddingTop: '8px', fontSize: '14px' }}><span>Grand Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>

        <div style={{ marginTop: '64px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>
          Thank you for ordering with PIXNXT. This is an electronically generated invoice and does not require a physical signature.
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: '#64748b', marginBottom: '12px', alignItems: 'center' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/lab/dashboard')}>Orders</span>
        <span>&gt;</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Order Details</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '26px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              Order {orderNumber}
            </h1>
            <span style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: `${STATUS_COLORS[order.status]}15`,
              color: STATUS_COLORS[order.status],
              border: `1px solid ${STATUS_COLORS[order.status]}30`,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div style={{ height: '4px' }} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => navigate(backPath)}
            style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Orders
          </button>
          <button 
            onClick={() => window.print()}
            style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '14px' }}>🖨️</span> Print Invoice
          </button>
          <button 
            onClick={() => window.print()}
            style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '14px' }}>⬇️</span> Download Invoice
          </button>

        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Customer Info Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>👤</div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Information</span>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{order.customer_name}</div>
            <div style={{ color: '#6b7280' }}>{order.customer_email}</div>
            <div style={{ color: '#6b7280' }}>{order.shipping_address?.phone || 'No phone logged'}</div>
          </div>
          <button style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#4b5563', cursor: 'pointer', marginTop: '4px' }}>
            View Customer Profile
          </button>
        </div>

        {/* Order Info Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>📄</div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Order Information</span>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Order ID: <strong>{order.id.substring(0, 12)}...</strong></span>
              <span onClick={() => handleCopyToClipboard(order.id, 'Order ID')} style={{ cursor: 'pointer', fontSize: '11px' }} title="Copy ID">📋</span>
            </div>
            <div>Order Date: <strong>{new Date(order.created_at).toLocaleDateString('en-IN')}</strong></div>
            <div>Source: <strong>Print Store (Web)</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Payment:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '3px' }}>PAID</span>
            </div>
            <div>Type: <strong>Lab Production</strong></div>
          </div>
        </div>

        {/* Production Info Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>⚙️</div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Production Information</span>
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Priority:</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '1px 6px',
                borderRadius: '3px',
                backgroundColor: order.priority === 'High' ? '#fee2e2' : order.priority === 'Medium' ? '#fef3c7' : '#f3f4f6',
                color: order.priority === 'High' ? '#ef4444' : order.priority === 'Medium' ? '#d97706' : '#4b5563'
              }}>{order.priority || 'Medium'}</span>
            </div>
            <div>Assigned To: <strong>👤 {order.assigned_employee || 'Unassigned'}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Current Stage:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '3px' }}>{STATUS_LABELS[order.status]}</span>
            </div>
            <div>Due Date: <strong>{order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN') : 'TBD'}</strong></div>
            <div>Est. Time: <strong>{order.estimated_time || '2 Day(s)'}</strong></div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>₹</div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Order Summary</span>
          </div>
          <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Items Total</span><span>{formatPrice(order.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Shipping</span><span>{formatPrice(order.shipping_amount || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Tax</span><span>{formatPrice(order.tax_amount || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Discount</span><span>-{formatPrice(order.discount_amount || 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #f3f4f6', paddingTop: '6px', fontSize: '14px', color: '#111827', marginTop: '2px' }}>
              <span>Grand Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Two-Column Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Items, Address, Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Order Items Table Card */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Order Items ({orderItems.length} {orderItems.length === 1 ? 'Item' : 'Items'})
              </h2>

            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#000000', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 8px' }}>Item</th>
                    <th style={{ padding: '10px 8px' }}>Product</th>
                    <th style={{ padding: '10px 8px' }}>Size</th>
                    <th style={{ padding: '10px 8px' }}>Paper</th>
                    <th style={{ padding: '10px 8px' }}>Frame</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => {
                    const opts = item.options || {};
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div onClick={() => setPreviewItem(buildPreviewItem(item))} style={{ width: '56px', height: '56px', border: '1px solid #cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', cursor: 'zoom-in' }}>
                            <div style={{ transform: 'scale(0.18)', transformOrigin: 'center center', width: '307.25px', height: '307.25px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                              <CartItemPreview item={buildPreviewItem(item)} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 'bold', color: '#111827' }}>{item.product_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>PID: {item.product_type || 'PRD'}</div>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#4b5563' }}>{opts.size?.label || 'Custom'}</td>
                        <td style={{ padding: '12px 8px', color: '#4b5563' }}>{opts.paper?.label || 'Standard'}</td>
                        <td style={{ padding: '12px 8px', color: '#4b5563' }}>{opts.frame?.label || 'No Frame'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatPrice(item.unit_price)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatPrice(item.unit_price * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ background: 'none', border: 'none', color: '#005c5a', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                View All Items
              </button>
            </div>
          </div>

          {/* Payment, Shipping, and Notes Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            
            {/* Payment Details */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>💳 Payment Details</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '3px' }}>Paid</span>
              </div>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#6b7280' }}>Method:</span><strong>{order.payment_provider || 'Razorpay'}</strong></div>
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>Txn ID:</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <strong style={{ fontFamily: 'monospace' }}>{order.payment_intent_id ? order.payment_intent_id.substring(0, 10) + '...' : 'pay_Qwerty...'}</strong>
                    <span onClick={() => handleCopyToClipboard(order.payment_intent_id || 'pay_Qwerty12345', 'Transaction ID')} style={{ cursor: 'pointer', fontSize: '10px' }}>📋</span>
                  </span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#6b7280' }}>Date:</span><strong>{formattedDate}</strong></div>
                <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#6b7280' }}>Amount:</span><strong style={{ color: '#10b981' }}>{formatPrice(order.total)}</strong></div>
              </div>
              <button style={{ marginTop: 'auto', background: '#fff', border: '1px solid #e2e8f0', padding: '6px 0', width: '100%', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#4b5563', cursor: 'pointer' }}>
                View Payment Receipt
              </button>
            </div>

            {/* Shipping Address */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>📍 Shipping Address</span>

              </div>
              <div style={{ fontSize: '12.5px', color: '#4b5563', lineHeight: '1.4', flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>{order.customer_name}</div>
                <div>{formatAddress(order.shipping_address)}</div>
                <div style={{ marginTop: '6px' }}>Phone: {order.shipping_address?.phone || 'N/A'}</div>
              </div>
            </div>

            {/* Additional Notes */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>📝 Additional Notes</span>
              </div>
              <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>Customer Note</span>
                  <span style={{ color: '#374151' }}>{order.customer_note || 'Please pack carefully. This is a gift.'}</span>
                </div>
                {order.lab_note && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '4px', color: '#78350f' }}>
                    <span style={{ fontSize: '10px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Lab Note</span>
                    <span style={{ fontSize: '12px' }}>{order.lab_note}</span>
                  </div>
                )}
              </div>
            </div>

          </div>



        </div>

        {/* Right Column: Timeline & Tracking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Production Timeline checklist */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 20px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              Production Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', borderLeft: '2px solid #f1f5f9', marginLeft: '12px', paddingLeft: '20px' }}>
              {(() => {
                const stages = [
                  { key: 'placed', label: 'Order Placed', time: formattedDate, done: true },
                  { key: 'paid', label: 'Payment Received', time: formattedDate, done: true },
                  { key: 'assigned', label: 'Assigned to Production', time: order.assigned_employee ? formattedDate : 'Pending', done: !!order.assigned_employee, details: order.assigned_employee ? `Assigned to: ${order.assigned_employee}` : null },
                  { key: 'printing', label: 'Printing Completed', time: order.status !== 'pending' && order.status !== 'printing' ? formattedUpdatedDate : 'Pending', done: order.status !== 'pending' && order.status !== 'printing' },
                  { key: 'qc', label: 'Quality Check Passed', time: (order.status !== 'pending' && order.status !== 'printing' && order.status !== 'printed') ? formattedUpdatedDate : 'Pending', done: (order.status !== 'pending' && order.status !== 'printing' && order.status !== 'printed' && order.status !== 'reprint') },
                  { key: 'packed', label: 'Packed', time: (order.status === 'ready_to_ship' || order.status === 'shipped' || order.status === 'completed') ? formattedUpdatedDate : 'Pending', active: order.status === 'packaging', done: (order.status === 'ready_to_ship' || order.status === 'shipped' || order.status === 'completed') },
                  { key: 'shipped', label: 'Shipped', time: (order.status === 'shipped' || order.status === 'completed') ? formattedUpdatedDate : 'Pending', active: order.status === 'ready_to_ship', done: (order.status === 'shipped' || order.status === 'completed') },
                  { key: 'delivered', label: 'Delivered', time: order.status === 'completed' ? formattedUpdatedDate : 'Pending', active: order.status === 'shipped', done: order.status === 'completed' }
                ];

                return stages.map((stg) => {
                  const isDone = stg.done;
                  const isActive = stg.active;

                  return (
                    <div key={stg.key} style={{ position: 'relative', fontSize: '13px' }}>
                      {/* Timeline Dot Indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: isDone ? '#10b981' : isActive ? '#3b82f6' : '#cbd5e1',
                        border: '2px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isDone && <span style={{ color: '#fff', fontSize: '6px' }}>✓</span>}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: isDone ? '#1f2937' : isActive ? '#3b82f6' : '#6b7280' }}>
                          {stg.label}
                        </span>
                        {stg.details && <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{stg.details}</span>}
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{stg.time}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>



        </div>

      </div>

      {/* Edit Order Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justify: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '450px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Edit Production Parameters</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Priority Level</label>
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Assigned Employee</label>
                <select value={editAssigned} onChange={(e) => setEditAssigned(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="Unassigned">-- Unassigned --</option>
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Production Due Date</label>
                <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Estimated Lead Time</label>
                <input type="text" value={editEstTime} onChange={(e) => setEditEstTime(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Internal Lab Notes</label>
                <textarea value={editLabNote} onChange={(e) => setEditLabNote(e.target.value)} rows="3" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justify: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={handleSaveOrderEdits} style={{ padding: '8px 14px', backgroundColor: '#005c5a', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Address Modal */}
      {showAddressModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justify: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '450px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Change Shipping Address</h3>
              <button onClick={() => setShowAddressModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Phone Number</label>
                <input type="text" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Street / House No</label>
                <input type="text" value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>City</label>
                <input type="text" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>State</label>
                  <input type="text" value={addrState} onChange={(e) => setAddrState(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Zip Code</label>
                  <input type="text" value={addrZip} onChange={(e) => setAddrZip(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justify: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowAddressModal(false)} style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={handleSaveAddress} style={{ padding: '8px 14px', backgroundColor: '#005c5a', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Address</button>
            </div>
          </div>
        </div>
      )}

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

export function LabQualityControlWorkspace({ order, orderItems, backPath, backLabel, onActionSuccess, isInline }) {
  const navigate = useNavigate();
  const orderNumber = getShortId(order.id, 'order');
  const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const isFramed = useMemo(() => {
    return orderItems.some(item => {
      const pType = (item.product_type || '').toLowerCase();
      return pType.includes('frame') || pType.includes('collage') || (item.options?.frame && item.options.frame.id !== 'frame_none');
    });
  }, [orderItems]);

  const [printChecks, setPrintChecks] = useState({
    color_accuracy: false,
    image_sharpness: false,
    correct_cropping: false,
    correct_orientation: false,
    no_ink_streaks: false,
    no_dust: false,
    no_scratches: false,
    no_fingerprints: false,
    correct_border_alignment: false
  });

  const [frameChecks, setFrameChecks] = useState({
    frame_color_verification: false,
    frame_size_verification: false,
    glass_cleanliness: false,
    no_cracked_glass: false,
    proper_photo_alignment: false,
    mat_board_alignment: false,
    secure_backing_board: false,
    overall_frame_condition: false
  });

  const [generalCheck, setGeneralCheck] = useState(false);
  const [inspectorName, setInspectorName] = useState(() => {
    try {
      const cached = localStorage.getItem('pixnxt_lab_session');
      if (cached) {
        const session = JSON.parse(cached);
        return session.email ? session.email.split('@')[0].toUpperCase() : 'INSPECTOR SEEMA';
      }
    } catch (e) {}
    return 'INSPECTOR SEEMA';
  });

  const [inspectionNotes, setInspectionNotes] = useState('');
  
  // Rejection Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [failedReasons, setFailedReasons] = useState([]);
  const [severity, setSeverity] = useState('Minor');
  const [defectDescription, setDefectDescription] = useState('');
  const [evidencePreview, setEvidencePreview] = useState([]);
  const [destination, setDestination] = useState('print_queue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qcHistory, setQcHistory] = useState([]);
  const [completionTime, setCompletionTime] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  // History & Camera states
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const webcamVideoRef = useRef(null);

  const fetchQcHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('printstore_lab_quality_checks')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setQcHistory(data);
      }
    } catch (err) {
      console.error("Error loading QC log history:", err);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      // 1. QC History
      fetchQcHistory();

      // 2. Printing Completion Time
      try {
        const { data, error } = await supabase
          .from('printstore_print_jobs')
          .select('completed_at')
          .eq('order_id', order.id)
          .eq('status', 'printed')
          .order('completed_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0 && data[0].completed_at) {
          setCompletionTime(new Date(data[0].completed_at).toLocaleString('en-IN'));
        } else {
          setCompletionTime(new Date(order.updated_at).toLocaleString('en-IN'));
        }
      } catch (e) {
        setCompletionTime(new Date(order.updated_at).toLocaleString('en-IN'));
      }
    }
    loadMeta();
  }, [order.id]);

  // Intelligent defect auto-routing:
  useEffect(() => {
    const frameReasons = ['Wrong Frame', 'Frame Damage', 'Glass Damage', 'Dust Inside Frame', 'proper photo alignment', 'mat alignment issues', 'secure backing board'];
    const printReasons = ['Color Mismatch', 'Print Defect', 'Paper Damage', 'Wrong Size', 'Wrong Paper', 'Cropping Error', 'Orientation Error', 'Ink Issue'];
    
    const hasFrameReason = failedReasons.some(r => frameReasons.includes(r));
    const hasPrintReason = failedReasons.some(r => printReasons.includes(r));
    
    if (hasFrameReason && !hasPrintReason) {
      setDestination('frame_workshop');
    } else if (hasPrintReason) {
      setDestination('print_queue');
    }
  }, [failedReasons]);

  const handleTogglePrintCheck = (key) => {
    setPrintChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleFrameCheck = (key) => {
    setFrameChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setPrintChecks({
      color_accuracy: true,
      image_sharpness: true,
      correct_cropping: true,
      correct_orientation: true,
      no_ink_streaks: true,
      no_dust: true,
      no_scratches: true,
      no_fingerprints: true,
      correct_border_alignment: true
    });
    if (isFramed) {
      setFrameChecks({
        frame_color_verification: true,
        frame_size_verification: true,
        glass_cleanliness: true,
        no_cracked_glass: true,
        proper_photo_alignment: true,
        mat_board_alignment: true,
        secure_backing_board: true,
        overall_frame_condition: true
      });
    }
    setGeneralCheck(true);
  };

  const isChecklistComplete = useMemo(() => {
    const printComplete = Object.values(printChecks).every(Boolean);
    const frameComplete = !isFramed || Object.values(frameChecks).every(Boolean);
    return printComplete && frameComplete && generalCheck;
  }, [printChecks, frameChecks, isFramed, generalCheck]);

  const handleApprove = async () => {
    if (!isChecklistComplete) {
      alert("Please complete all checklist item inspections before approving.");
      return;
    }
    if (!inspectorName.trim()) {
      alert("Please enter the inspector name.");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update order status to packaging
      const { error: orderError } = await supabase
        .from('printstore_orders')
        .update({ status: 'packaging' })
        .eq('id', order.id);
      if (orderError) throw orderError;

      // 2. Log to quality checks table
      const qcLog = {
        order_id: order.id,
        checked_by: inspectorName.trim(),
        result: 'pass',
        notes: JSON.stringify({
          inspector_notes: inspectionNotes,
          timestamp: new Date().toISOString(),
          checklist: { printChecks, frameChecks }
        })
      };
      const { error: logError } = await supabase
        .from('printstore_lab_quality_checks')
        .insert(qcLog);
      if (logError) throw logError;

      // 3. Create timeline entry
      await supabase
        .from('printstore_order_tracking')
        .insert({
          order_id: order.id,
          status: 'packaging',
          label: 'Quality Control Passed',
          description: `Product passed Noida Hub Quality Control. Inspector: ${inspectorName.trim()}. Transferred to Noida Hub Packaging Center.`
        });

      alert("✓ Product approved and transferred to Noida Hub Packaging Center!");
      onActionSuccess();
      navigate('/lab/quality-control');
    } catch (err) {
      console.error("QC Approval error:", err);
      alert("Failed to approve product: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Webcam access error:", err);
      alert("Could not access camera: " + err.message);
      setShowWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const handleCapturePhoto = () => {
    if (webcamVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = webcamVideoRef.current.videoWidth || 640;
      canvas.height = webcamVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setEvidencePreview(prev => [...prev, dataUrl]);
      stopWebcam();
      setShowWebcam(false);
    }
  };

  const handleToggleReason = (reason) => {
    setFailedReasons(prev => 
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleReject = async () => {
    if (failedReasons.length === 0) {
      alert("Please select at least one failure reason for rejection.");
      return;
    }
    if (!inspectorName.trim()) {
      alert("Please enter the inspector name.");
      return;
    }
    setIsSubmitting(true);
    
    // Determine destination status based on department:
    // print_queue -> printing, frame_workshop -> framing, reprint -> reprint
    let destStatus = 'printing';
    let destLabel = 'Print Production Queue';
    if (destination === 'frame_workshop') {
      destStatus = 'framing';
      destLabel = 'Frame Workshop';
    } else if (destination === 'reprint') {
      destStatus = 'reprint';
      destLabel = 'Reprint run';
    }

    try {
      // 1. Update order status
      const { error: orderError } = await supabase
        .from('printstore_orders')
        .update({ status: destStatus })
        .eq('id', order.id);
      if (orderError) throw orderError;

      // 2. Map failedReasons[0] to the closest database check constraint
      const primaryReason = failedReasons[0];
      let mappedReason = 'Print Defect';
      if (['Wrong Frame', 'Frame Damage'].includes(primaryReason)) {
        mappedReason = 'Frame Damage';
      } else if (['Glass Damage'].includes(primaryReason)) {
        mappedReason = 'Glass Damage';
      } else if (['Dust Inside Frame'].includes(primaryReason)) {
        mappedReason = 'Dust Contamination';
      } else if (['Color Mismatch'].includes(primaryReason)) {
        mappedReason = 'Color Error';
      }

      // 3. Log to quality checks table
      const qcLog = {
        order_id: order.id,
        checked_by: inspectorName.trim(),
        result: 'fail',
        failure_reason: mappedReason,
        notes: JSON.stringify({
          exact_reasons: failedReasons,
          severity,
          description: defectDescription,
          evidence_photos: evidencePreview,
          destination: destLabel,
          timestamp: new Date().toISOString()
        })
      };
      const { error: logError } = await supabase
        .from('printstore_lab_quality_checks')
        .insert(qcLog);
      if (logError) throw logError;

      // 4. Create timeline entry
      await supabase
        .from('printstore_order_tracking')
        .insert({
          order_id: order.id,
          status: destStatus,
          label: `Quality Control Failed: ${destLabel}`,
          description: `Inspection rejected by ${inspectorName.trim()} (Severity: ${severity}). Failure: ${failedReasons.join(', ')}. Action: Route to ${destLabel}. Description: ${defectDescription}`
        });

      alert(`✓ Product rejected and successfully routed to ${destLabel}!`);
      setShowRejectDialog(false);
      onActionSuccess();
      navigate('/lab/quality-control');
    } catch (err) {
      console.error("QC Rejection error:", err);
      alert("Failed to reject product: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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

  const checklistItem = (checked, label, onClick) => (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        border: '1px solid #eaeaea',
        borderRadius: '3px',
        backgroundColor: checked ? '#eefaf9' : '#fff',
        cursor: 'pointer',
        fontSize: '13px',
        userSelect: 'none',
        transition: 'all 0.15s'
      }}
    >
      {checked ? <CheckSquare size={16} color="#005c5a" /> : <Square size={16} color="#cbd5e1" />}
      <span style={{ color: checked ? '#005c5a' : '#334155', fontWeight: checked ? 600 : 400 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ 
      padding: isInline ? '24px 0 48px 0' : '24px 32px', 
      backgroundColor: '#ffffff', 
      minHeight: isInline ? 'auto' : '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
      color: '#1e293b', 
      boxSizing: 'border-box' 
    }}>
      <style>{`
        .qc-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        .qc-details-bottom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1100px) {
          .qc-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .qc-details-bottom-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .qc-details-grid {
            grid-template-columns: 1fr;
          }
          .qc-details-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Combined Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px' }}>
        
        {/* Left Side: Back button + Details text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button 
            onClick={() => {
              if (backPath === '#') {
                if (onActionSuccess) onActionSuccess();
              } else {
                navigate(backPath);
              }
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              padding: '8px 14px', 
              backgroundColor: '#fff', 
              fontSize: '12.5px', 
              fontWeight: 'bold', 
              color: '#334155', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            ← Back to QC
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", letterSpacing: '0.04em' }}>
              QUALITY CONTROL DETAILS
            </h2>
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 'bold', 
              padding: '2px 8px', 
              backgroundColor: '#fef3c7', 
              color: '#d97706', 
              border: '1px solid #fcd34d', 
              borderRadius: '4px', 
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              Pending
            </span>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            👤 Assign Inspector
          </button>
          <button style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⏸️ Hold
          </button>
          <button 
            onClick={handleApprove}
            disabled={isSubmitting}
            style={{ padding: '8px 16px', backgroundColor: '#0f766e', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ✔️ Approve
          </button>
          <button 
            onClick={() => setShowRejectDialog(true)}
            disabled={isSubmitting}
            style={{ padding: '8px 16px', backgroundColor: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ❌ Reject
          </button>
        </div>
      </div>

      {/* Four Column Grid Layout */}
      <div className="qc-details-grid">
        
        {/* Card 1: Order Information & Workflow */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              Order Information
            </h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
              <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#64748b' }}>Customer</span><strong>{order.customer_name}</strong></div>
              <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#64748b' }}>Phone</span><strong>{order.shipping_address?.phone || '+91 96263 17966'}</strong></div>
              <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#64748b' }}>Email</span><strong style={{ fontSize: '11.5px' }}>{order.customer_email}</strong></div>
              <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#64748b' }}>Order Date</span><strong>{new Date(order.created_at).toLocaleDateString('en-IN')}</strong></div>
              <div style={{ display: 'flex', justify: 'space-between' }}><span style={{ color: '#64748b' }}>Source</span><strong>Print Store (Web)</strong></div>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Priority</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: order.priority === 'High' ? '#fee2e2' : '#ecfdf5',
                  color: order.priority === 'High' ? '#ef4444' : '#10b981'
                }}>{order.priority || 'Medium'}</span>
              </div>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Assigned Inspector</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>👤</span> <strong>{inspectorName}</strong>
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              Workflow History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', borderLeft: '2px solid #f1f5f9', marginLeft: '10px', paddingLeft: '16px' }}>
              <div style={{ position: 'relative', fontSize: '12px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order Placed</span>
                <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>{formattedDate}</div>
              </div>
              <div style={{ position: 'relative', fontSize: '12px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Payment Received</span>
                <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>{formattedDate}</div>
              </div>
              <div style={{ position: 'relative', fontSize: '12px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Printing Completed</span>
                <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>{completionTime || formattedDate}</div>
              </div>
              <div style={{ position: 'relative', fontSize: '12px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Quality Control (Pending)</span>
                <div style={{ fontSize: '10.5px', color: '#3b82f6' }}>{completionTime || formattedDate}</div>
              </div>
              <div style={{ position: 'relative', fontSize: '12px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                <span style={{ color: '#9ca3af' }}>Packaging</span>
                <div style={{ fontSize: '10.5px', color: '#cbd5e1' }}>Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Product Preview & Specs */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Product Preview
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '12px', minHeight: '260px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orderItems.map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => setPreviewItem(buildPreviewItem(item))}
                  style={{ width: '60px', height: '60px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justify: 'center' }}
                >
                  {getPhotoThumbnail(item) ? (
                    <img src={getPhotoThumbnail(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>Item {idx + 1}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', position: 'relative' }}>
              {orderItems[0] ? (
                <div style={{ transform: 'scale(1.2)', transformOrigin: 'center center', width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CartItemPreview item={buildPreviewItem(orderItems[0])} />
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>No preview available</span>
              )}
            </div>
          </div>

          {orderItems[0] && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12.5px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1e293b' }}>Print Specifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569' }}>
                <div>Product: <strong>{orderItems[0].product_name}</strong></div>
                <div>Size: <strong>{orderItems[0].options?.size?.label || '13x18 cm'}</strong></div>
                <div>Paper: <strong>{orderItems[0].options?.paper?.label || 'Glossy'}</strong></div>
                <div>Frame: <strong>{orderItems[0].options?.frame?.label || 'Black Wood'}</strong></div>
                <div>Frame Glass: <strong>Acrylic Glass</strong></div>
                <div>Quantity: <strong>{orderItems[0].quantity} pcs</strong></div>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <span onClick={() => navigate(`/lab/orders/${order.id}`)} style={{ color: '#0f766e', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  View Full Order Details →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Inspection Checklist */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>Inspection Checklist</span>
            <button 
              onClick={handleSelectAll}
              style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Pass All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: '#334155' }}>
            {[
              { key: 'color_accuracy', label: 'Color Accuracy', checked: printChecks.color_accuracy, setter: () => handleTogglePrintCheck('color_accuracy'), note: 'Good' },
              { key: 'image_sharpness', label: 'Sharpness & Clarity', checked: printChecks.image_sharpness, setter: () => handleTogglePrintCheck('image_sharpness'), note: 'Good' },
              { key: 'correct_cropping', label: 'Exposure & Brightness', checked: printChecks.correct_cropping, setter: () => handleTogglePrintCheck('correct_cropping'), note: 'Good' },
              { key: 'correct_orientation', label: 'Crop & Alignment', checked: printChecks.correct_orientation, setter: () => handleTogglePrintCheck('correct_orientation'), note: 'Good' },
              { key: 'no_dust', label: 'Dust / Spots', checked: printChecks.no_dust, setter: () => handleTogglePrintCheck('no_dust'), note: 'Clean' },
              { key: 'no_scratches', label: 'Scratches / Marks', checked: printChecks.no_scratches, setter: () => handleTogglePrintCheck('no_scratches'), note: 'None' },
              { key: 'correct_border_alignment', label: 'Border & Edges', checked: printChecks.correct_border_alignment, setter: () => handleTogglePrintCheck('correct_border_alignment'), note: 'Perfect' },
              { key: 'frame_fit', label: 'Frame Fit & Finish', checked: isFramed ? frameChecks.overall_frame_condition : generalCheck, setter: () => isFramed ? handleToggleFrameCheck('overall_frame_condition') : setGeneralCheck(!generalCheck), note: isFramed ? 'Good' : 'Not checked' }
            ].map(chk => (
              <div 
                key={chk.key} 
                onClick={chk.setter}
                style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '6px 8px', border: '1px solid #f1f5f9', borderRadius: '4px', cursor: 'pointer', backgroundColor: chk.checked ? '#f0fdf4' : '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: chk.checked ? '#22c55e' : '#cbd5e1' }}>
                    {chk.checked ? '✔️' : '➖'}
                  </span>
                  <span style={{ fontWeight: chk.checked ? 'bold' : 'normal' }}>{chk.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: chk.checked ? '#22c55e' : '#94a3b8' }}>{chk.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Inspector Notes */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            Inspector Notes
          </h3>
          <textarea 
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            placeholder="Add any notes about this inspection..."
            rows="8"
            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px', outline: 'none', resize: 'none', flex: 1 }}
          />
        </div>

      </div>

      {/* Row 2: Production Notes, Attachments & Guidelines */}
      <div className="qc-details-bottom-grid">
        
        {/* Bottom Card 1: Production Notes */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            Production Notes
          </h3>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#78350f', lineHeight: '1.5', flex: 1 }}>
            <strong>Noida Hub Production Directives:</strong>
            <div style={{ marginTop: '4px' }}>No production defects noted. Verify optical glass cleanliness before final assembly. Ensure correct calibration values are met.</div>
          </div>
        </div>

        {/* Bottom Card 2: Attachments */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            Attachments (Optional)
          </h3>
          
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: '6px', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8fafc', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowWebcam(true)}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>📷</span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>Drag & drop files here</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>or click to upload/take snapshot</span>
          </div>

          {evidencePreview.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {evidencePreview.map((url, i) => (
                <div key={i} style={{ width: '50px', height: '50px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => setEvidencePreview(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: '#fff', border: 'none', fontSize: '8px', cursor: 'pointer' }}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Card 3: QC Guidelines */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            QC Guidelines
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', flex: 1 }}>
            <strong>Actions Walkthrough:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Approve:</strong> Item passes all checks and moves automatically to Noida Hub Packaging Center.</li>
              <li><strong>Reject:</strong> Defect flagged, item routed immediately to Noida Reprint & Rework.</li>
              <li><strong>Hold:</strong> Suspends state for inspector transition or further lab analysis.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Rejection Reasons Dialog modal */}
      {showRejectDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '36px', boxSizing: 'border-box', position: 'relative' }}>
            
            <button 
              onClick={() => setShowRejectDialog(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}
            >
              ✕
            </button>
 
            <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '22px', color: '#b91c1c', margin: '0 0 24px 0', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} /> Rework Defect Logging Workspace
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Failure Reasons Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                  Failure Reason(s) (Select at least one)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Color Mismatch', 'Print Defect', 'Paper Damage', 'Wrong Size', 'Wrong Paper', 'Wrong Frame', 'Frame Damage', 'Glass Damage', 'Dust Inside Frame', 'Cropping Error', 'Orientation Error', 'Ink Issue', 'Customer Revision', 'Other'].map(reason => {
                    const isSelected = failedReasons.includes(reason);
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => handleToggleReason(reason)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: isSelected ? '1px solid #b91c1c' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#fee2e2' : '#ffffff',
                          color: isSelected ? '#b91c1c' : '#334155',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          borderRadius: '3px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                  Defect Severity level
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['Minor', 'Major', 'Critical'].map(level => {
                    const isSelected = severity === level;
                    const getColors = () => {
                      if (level === 'Minor') return isSelected ? { bg: '#fef3c7', text: '#d97706', border: '#d97706' } : { bg: '#fff', text: '#475569', border: '#cbd5e1' };
                      if (level === 'Major') return isSelected ? { bg: '#ffedd5', text: '#ea580c', border: '#ea580c' } : { bg: '#fff', text: '#475569', border: '#cbd5e1' };
                      return isSelected ? { bg: '#fee2e2', text: '#dc2626', border: '#dc2626' } : { bg: '#fff', text: '#475569', border: '#cbd5e1' };
                    };
                    const colors = getColors();
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSeverity(level)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          cursor: 'pointer',
                          borderRadius: '3px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Short Defect Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                  Issue Description
                </label>
                <textarea
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  placeholder="Explain the defect details for the workshop operator..."
                  required
                  style={{ width: '100%', height: '80px', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Evidence Photo/Video Media Upload & Camera Capture */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                  Upload Defect Evidence (Photo/Video Mandatory)
                </label>
                
                {/* File inputs for native capture overrides */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  id="camera-photo-input"
                />
                <input 
                  type="file" 
                  accept="video/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  id="camera-video-input"
                />

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      if (isMobile) {
                        document.getElementById('camera-photo-input').click();
                      } else {
                        setShowWebcam(true);
                        startWebcam();
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '3px'
                    }}
                  >
                    <Camera size={15} /> Take Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('camera-video-input').click();
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '3px'
                    }}
                  >
                    <Video size={15} /> Record Video
                  </button>
                </div>

                <div style={{
                  border: '2px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  <Upload size={24} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
                  <span style={{ fontSize: '13px', color: '#475569', display: 'block' }}>Drag and drop media files, or click to browse</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Supports photos & videos (Max 15MB)</span>
                </div>

                {evidencePreview.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {evidencePreview.map((url, i) => {
                      const isVideo = url.startsWith('data:video/') || url.includes('video') || url.includes('.mp4');
                      return (
                        <div key={i} style={{ position: 'relative', width: '70px', height: '70px' }}>
                          {isVideo ? (
                            <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          ) : (
                            <img src={url} alt="Evidence Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          )}
                          <button 
                            onClick={() => setEvidencePreview(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rework Router Destination */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                  Intelligent Rework Routing Destination
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="destination" 
                      value="print_queue" 
                      checked={destination === 'print_queue'}
                      onChange={() => setDestination('print_queue')}
                    />
                    <span>Print Production Queue (Sets status to printing)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="destination" 
                      value="frame_workshop" 
                      checked={destination === 'frame_workshop'}
                      onChange={() => setDestination('frame_workshop')}
                    />
                    <span>Frame Workshop (Sets status to framing)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="destination" 
                      value="reprint" 
                      checked={destination === 'reprint'}
                      onChange={() => setDestination('reprint')}
                    />
                    <span>Complete Reprint Run (Sets status to reprint required)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectDialog(false)}
                  style={{ padding: '10px 18px', fontSize: '12.5px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={failedReasons.length === 0 || evidencePreview.length === 0 || isSubmitting}
                  style={{
                    padding: '10px 24px',
                    fontSize: '12.5px',
                    border: 'none',
                    backgroundColor: (failedReasons.length > 0 && evidencePreview.length > 0) ? '#dc2626' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: (failedReasons.length > 0 && evidencePreview.length > 0 && !isSubmitting) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? 'ROUTING...' : 'Log Defect & Dispatch Rework'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* QC Attempts History Drawer */}
      {showHistoryDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1300, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowHistoryDrawer(false)}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '460px', height: '100vh', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', padding: '36px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea', paddingBottom: '16px' }}>
              <h3 style={{ fontFamily: "'EB Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} /> QC History Attempts
              </h3>
              <button 
                onClick={() => setShowHistoryDrawer(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {qcHistory.map((log) => {
                const parsedNotes = (() => {
                  try { return JSON.parse(log.notes); } catch (e) { return { notes: log.notes }; }
                })();
                const isPass = log.result === 'pass';
                
                return (
                  <div key={log.id} style={{ display: 'flex', gap: '14px', borderBottom: '1px solid #eee', paddingBottom: '14px' }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      {isPass ? (
                        <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, backgroundColor: '#d1fae5', color: '#065f46', textTransform: 'uppercase' }}>PASSED</span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b', textTransform: 'uppercase' }}>REJECTED</span>
                      )}
                    </div>
                    <div style={{ flex: 1, fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        Checked by {log.checked_by} on {new Date(log.created_at).toLocaleDateString('en-IN')}
                      </div>
                      
                      {!isPass && (
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>Failure Reason:</strong> <span style={{ color: '#b91c1c', fontWeight: 600 }}>{log.failure_reason}</span></div>
                          {parsedNotes.severity && <div><strong>Severity:</strong> <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#b91c1c' }}>{parsedNotes.severity}</span></div>}
                          {parsedNotes.destination && <div><strong>Rework Router:</strong> Sent to <span style={{ fontWeight: 600 }}>{parsedNotes.destination}</span></div>}
                          {parsedNotes.description && <div style={{ fontStyle: 'italic', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '3px', marginTop: '4px' }}>"{parsedNotes.description}"</div>}
                          
                          {parsedNotes.evidence_photos && parsedNotes.evidence_photos.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <strong>Defect Evidence:</strong>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {parsedNotes.evidence_photos.map((url, i) => {
                                  const isVideo = url.startsWith('data:video/') || url.includes('video') || url.includes('.mp4');
                                  if (isVideo) {
                                    return (
                                      <video key={i} src={url} controls style={{ width: '120px', height: '80px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                                    );
                                  }
                                  return (
                                    <img key={i} src={url} alt="Evidence" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {isPass && parsedNotes.inspector_notes && (
                        <div style={{ fontStyle: 'italic', color: '#475569', backgroundColor: '#e6f4f3', padding: '6px 10px', borderRadius: '3px', marginTop: '6px' }}>
                          "{parsedNotes.inspector_notes}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {qcHistory.length === 0 && (
                <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No previous attempts recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Camera Capture Modal */}
      {showWebcam && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Webcam Defect Capture</h3>
            <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: '#000' }}>
              <video 
                ref={webcamVideoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  stopWebcam();
                  setShowWebcam(false);
                }}
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapturePhoto}
                style={{ padding: '8px 20px', border: 'none', backgroundColor: '#005c5a', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

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
