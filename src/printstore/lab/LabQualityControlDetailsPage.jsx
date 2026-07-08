import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { 
  ArrowLeft, User, Calendar, Tag, ShieldAlert, CheckCircle, AlertTriangle, 
  Trash2, Camera, Upload, AlertCircle, Info, ExternalLink, Edit2, Play, Pause, Check, X
} from 'lucide-react';
import CartItemPreview from '../components/CartItemPreview';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

export default function LabQualityControlDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, orderItems, refreshOrders } = useLabAuth();
  
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Checklist state
  const [checklist, setChecklist] = useState({
    color_accuracy: false,
    sharpness_clarity: false,
    exposure_brightness: false,
    crop_alignment: false,
    dust_spots: false,
    scratches_marks: false,
    border_edges: false,
    frame_fit_finish: false,
    glass_quality: false,
    packaging_readiness: false
  });
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionSeverity, setRejectionSeverity] = useState('');
  const [rejectionDepartment, setRejectionDepartment] = useState('');
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [evidencePreview, setEvidencePreview] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const webcamVideoRef = useRef(null);
  
  // Selected thumbnail index for preview
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  // Rejection modal visibility state
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Fetch order data if not already present or to ensure freshness
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Try to find in context first
      let currentOrder = orders.find(o => o.id === orderId);
      let currentItems = orderItems.filter(item => item.order_id === orderId);
      
      if (!currentOrder) {
        // Fetch from DB
        const { data: dbOrder, error: orderErr } = await supabase
          .from('printstore_orders')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (dbOrder) {
          currentOrder = dbOrder;
          const { data: dbItems } = await supabase
            .from('printstore_order_items')
            .select('*')
            .eq('order_id', orderId);
          if (dbItems) {
            currentItems = dbItems;
          }
        }
      }
      
      if (currentOrder) {
        setOrder(currentOrder);
        setItems(currentItems);
      }
      setLoading(false);
    }
    loadData();
  }, [orderId, orders, orderItems]);

  const activeItem = items[selectedItemIdx] || null;

  const buildPreviewItem = (item) => {
    if (!item) return null;
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

  // Toggle checklist item
  const handleToggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if checklist is complete
  const isChecklistComplete = useMemo(() => {
    return Object.values(checklist).every(Boolean);
  }, [checklist]);

  // Actions
  const handleApprove = async () => {
    if (!isChecklistComplete) {
      alert('Please verify all checklist items before approving.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Update order status to packaging
      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ status: 'packaging' })
        .eq('id', order.id);

      if (orderErr) throw orderErr;

      // Log successful QC Check
      await supabase.from('printstore_lab_quality_checks').insert({
        order_id: order.id,
        checked_by: 'INSPECTOR KARTHIK',
        result: 'pass',
        notes: JSON.stringify({
          checklist,
          timestamp: new Date().toISOString()
        })
      });

      // Insert timeline tracking
      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'packaging',
        label: 'Quality Control Passed',
        description: 'Order successfully passed QC inspection checklist and was routed to Packaging.'
      });

      await refreshOrders();
      navigate('/lab/quality-control');
    } catch (err) {
      console.error(err);
      alert('Failed to approve QC inspection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHold = async () => {
    setIsSubmitting(true);
    try {
      // Hold doesn't change status but logs check
      await supabase.from('printstore_lab_quality_checks').insert({
        order_id: order.id,
        checked_by: 'INSPECTOR KARTHIK',
        result: 'fail',
        notes: JSON.stringify({
          hold: true,
          checklist,
          timestamp: new Date().toISOString()
        })
      });

      await refreshOrders();
      alert('Inspection state saved on Hold.');
      navigate('/lab/quality-control');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEvidencePreview(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(files[i]);
    }
  };
  const handleSubmitRejection = async () => {
    if (!rejectionReason || !rejectionSeverity || !rejectionDepartment || !rejectionDescription) {
      alert('Please fill out all rejection form fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Update order status to reprint
      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ 
          status: 'reprint',
          assigned_employee: '' // unassign to allow re-assignment
        })
        .eq('id', order.id);

      if (orderErr) throw orderErr;

      // Map UI rejection reason to database check constraint allowed options
      const mapReasonToDB = (uiReason) => {
        const mapping = {
          'Color Mismatch': 'Color Error',
          'Print Defect': 'Print Defect',
          'Paper Damage': 'Print Defect',
          'Wrong Size': 'Print Defect',
          'Wrong Paper': 'Print Defect',
          'Wrong Frame': 'Frame Damage',
          'Frame Damage': 'Frame Damage',
          'Glass Damage': 'Glass Damage',
          'Dust Inside Frame': 'Dust Contamination',
          'Cropping Error': 'Print Defect',
          'Orientation Error': 'Print Defect',
          'Ink Issue': 'Print Defect',
          'Customer Revision': 'Print Defect',
          'Other': 'Print Defect'
        };
        return mapping[uiReason] || 'Print Defect';
      };

      const dbReason = mapReasonToDB(rejectionReason);

      // Log QC Failure Check
      const { error: qcErr } = await supabase.from('printstore_lab_quality_checks').insert({
        order_id: order.id,
        checked_by: 'INSPECTOR KARTHIK',
        result: 'fail',
        failure_reason: dbReason,
        notes: JSON.stringify({
          checklist,
          rejection: {
            reason: rejectionReason,
            severity: rejectionSeverity,
            department: rejectionDepartment,
            description: rejectionDescription,
            evidence: evidencePreview
          },
          timestamp: new Date().toISOString()
        })
      });

      if (qcErr) throw qcErr;

      // Insert timeline tracking
      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'reprint',
        label: 'Quality Control Rejected',
        description: `QC Failed: ${rejectionReason} (${rejectionSeverity} severity). Routed to reprint queue.`
      });

      await refreshOrders();
      navigate('/lab/quality-control');
    } catch (err) {
      console.error(err);
      alert('Failed to log rejection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startWebcam = async () => {
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }
    setWebcamStream(null);
    setShowWebcam(false);
  };

  const handleCapturePhoto = () => {
    if (!webcamVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = webcamVideoRef.current.videoWidth;
    canvas.height = webcamVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg');
      setEvidencePreview(prev => [...prev, url]);
    }
    stopWebcam();
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
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Order Not Found</h2>
        <button onClick={() => navigate('/lab/quality-control')} style={{ marginTop: '16px', padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px' }}>
          Back to QC Center
        </button>
      </div>
    );
  }

  const orderNumber = getShortId(order.id, 'order');

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', boxSizing: 'border-box', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0, letterSpacing: '0.01em', textTransform: 'uppercase' }}>
              Quality Control Details
            </h1>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => navigate('/lab/quality-control')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 14px', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', color: '#334155', cursor: 'pointer' }}
          >
            ← Back to QC Center
          </button>
          <button 
            onClick={handleHold}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 14px', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', color: '#334155', cursor: 'pointer' }}
          >
            <Pause size={14} /> Hold
          </button>
          {isChecklistComplete && (
            <button 
              onClick={handleApprove}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '6px', padding: '8px 16px', backgroundColor: '#0f766e', fontSize: '13px', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
            >
              <Check size={14} /> Approve
            </button>
          )}
          <button 
            onClick={() => setShowRejectionModal(true)}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '6px', padding: '8px 16px', backgroundColor: '#b91c1c', fontSize: '13px', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
          >
            <X size={14} /> Reject
          </button>
        </div>
      </div>

      {/* Balanced 3-Column Grid layout in neat sizes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Column 1: Order Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Order Info */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', textTransform: 'uppercase' }}>
              Order Information
            </h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Customer</span>
                <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phone</span>
                <span style={{ fontWeight: '600' }}>{order.shipping_address?.phone || '+91 96263 17966'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Email</span>
                <span style={{ fontWeight: '600', fontSize: '12px' }}>{order.customer_email || 'nandhaprabhu95@gmail.com'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order Date</span>
                <span style={{ fontWeight: '600' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Source</span>
                <span style={{ fontWeight: '600' }}>Print Store (Web)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Priority</span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  padding: '2px 8px', 
                  backgroundColor: order.priority === 'High' ? '#fee2e2' : '#fef3c7', 
                  color: order.priority === 'High' ? '#ef4444' : '#d97706', 
                  borderRadius: '4px' 
                }}>
                  {order.priority || 'High'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Inspector</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <span>👤</span> Karthik
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Product Preview & Specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Product Preview */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
              Product Preview
            </h3>
            
            {/* Large Preview Only - Removed Thumbnail strip entirely */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '10px', minHeight: '220px' }}>
              {activeItem ? (
                <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CartItemPreview item={buildPreviewItem(activeItem)} />
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>No preview available</span>
              )}
            </div>

            {activeItem && (
              <button 
                onClick={() => {
                  const url = getPhotoThumbnail(activeItem);
                  if (url) window.open(url, '_blank');
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: '#fff', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  color: '#475569', 
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                View Original File <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Card: Specifications */}
          {activeItem && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px 0', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Print Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Product</span><strong style={{ color: '#1e293b' }}>{activeItem.product_name}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Size</span><strong style={{ color: '#1e293b' }}>{activeItem.options?.size?.label || '13x18 cm (Portrait)'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Paper</span><strong style={{ color: '#1e293b' }}>{activeItem.options?.paper?.label || 'Glossy Photo Paper'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Frame</span><strong style={{ color: '#1e293b' }}>{activeItem.options?.frame?.label || 'No Frame'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Quantity</span><strong style={{ color: '#1e293b' }}>{activeItem.quantity}</strong></div>
              </div>
              <button 
                onClick={() => navigate(`/lab/orders/${order.id}`)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: '#fff', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  color: '#475569', 
                  cursor: 'pointer',
                  marginTop: '12px'
                }}
              >
                View Full Order Details <ExternalLink size={12} />
              </button>
            </div>
          )}

        </div>

        {/* Column 3: Inspection Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>Inspection Checklist</span>
              <button 
                onClick={() => {
                  setChecklist({
                    color_accuracy: true,
                    sharpness_clarity: true,
                    exposure_brightness: true,
                    crop_alignment: true,
                    dust_spots: true,
                    scratches_marks: true,
                    border_edges: true,
                    frame_fit_finish: true,
                    glass_quality: true,
                    packaging_readiness: true
                  });
                }}
                style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Pass All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'color_accuracy', label: 'Color Accuracy', passNote: 'Good' },
                { key: 'sharpness_clarity', label: 'Sharpness & Clarity', passNote: 'Good' },
                { key: 'exposure_brightness', label: 'Exposure & Brightness', passNote: 'Good' },
                { key: 'crop_alignment', label: 'Crop & Alignment', passNote: 'Good' },
                { key: 'dust_spots', label: 'Dust / Spots', passNote: 'Clean' },
                { key: 'scratches_marks', label: 'Scratches / Marks', passNote: 'None' },
                { key: 'border_edges', label: 'Border & Edges', passNote: 'Perfect' },
                { key: 'frame_fit_finish', label: 'Frame Fit & Finish', passNote: 'Good' },
                { key: 'glass_quality', label: 'Glass Quality', passNote: 'Good' },
                { key: 'packaging_readiness', label: 'Packaging Readiness', passNote: 'Ready' }
              ].map((chk) => (
                <div 
                  key={chk.key} 
                  onClick={() => handleToggleCheck(chk.key)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 10px', 
                    border: '1px solid #f1f5f9', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    backgroundColor: checklist[chk.key] ? '#f0fdf4' : '#fff',
                    transition: 'all 0.1s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checklist[chk.key] ? (
                        <CheckCircle size={15} color="#22c55e" style={{ fill: '#f0fdf4' }} />
                      ) : (
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      )}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: checklist[chk.key] ? '600' : '500', color: checklist[chk.key] ? '#15803d' : '#334155' }}>
                      {chk.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: checklist[chk.key] ? '#16a34a' : '#94a3b8' }}>
                    {checklist[chk.key] ? chk.passNote : 'Not checked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Rejection Details Popup Modal (Fully Centered, Neatly Aligned) */}
      {showRejectionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Rejection Details
              </h3>
              <button onClick={() => setShowRejectionModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Reason</label>
                <select 
                  value={rejectionReason} 
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12.5px', boxSizing: 'border-box' }}
                >
                  <option value="">Select reason</option>
                  {['Color Mismatch', 'Print Defect', 'Paper Damage', 'Wrong Size', 'Wrong Paper', 'Wrong Frame', 'Frame Damage', 'Glass Damage', 'Dust Inside Frame', 'Cropping Error', 'Orientation Error', 'Ink Issue', 'Customer Revision', 'Other'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Severity</label>
                  <select 
                    value={rejectionSeverity} 
                    onChange={(e) => setRejectionSeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12.5px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select severity</option>
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Department</label>
                  <select 
                    value={rejectionDepartment} 
                    onChange={(e) => setRejectionDepartment(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12.5px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select department</option>
                    <option value="Printing">Printing (Reprint)</option>
                    <option value="Framing">Framing (Rework)</option>
                    <option value="Quality Control">Quality Control</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Description</label>
                <textarea 
                  value={rejectionDescription}
                  onChange={(e) => setRejectionDescription(e.target.value)}
                  placeholder="Enter details about the issue..."
                  style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '12.5px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Evidence (Optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={startWebcam}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                  >
                    📷 Take Photo
                  </button>

                  <label 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                  >
                    📁 Choose File
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {evidencePreview.length} images captured
                  </span>
                </div>

                {evidencePreview.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {evidencePreview.map((url, i) => (
                      <div key={i} style={{ width: '40px', height: '40px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button"
                          onClick={() => setEvidencePreview(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            background: '#dc2626', 
                            color: '#fff', 
                            border: 'none', 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%',
                            fontSize: '8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                    setRejectionSeverity('');
                    setRejectionDepartment('');
                    setRejectionDescription('');
                    setEvidencePreview([]);
                  }}
                  style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await handleSubmitRejection();
                    setShowRejectionModal(false);
                  }}
                  disabled={isSubmitting || !rejectionReason || !rejectionSeverity || !rejectionDepartment || !rejectionDescription}
                  style={{ 
                    border: 'none', 
                    background: (!rejectionReason || !rejectionSeverity || !rejectionDepartment || !rejectionDescription) ? '#cbd5e1' : '#b91c1c', 
                    color: '#fff', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    cursor: (!rejectionReason || !rejectionSeverity || !rejectionDepartment || !rejectionDescription) ? 'not-allowed' : 'pointer' 
                  }}
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webcam Modal Backdrop */}
      {showWebcam && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Capture Defect Evidence</h3>
            <div style={{ width: '100%', height: '240px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden' }}>
              <video ref={webcamVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={stopWebcam} style={{ border: 'none', padding: '8px 16px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCapturePhoto} style={{ border: 'none', padding: '8px 16px', borderRadius: '6px', background: '#0f766e', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
