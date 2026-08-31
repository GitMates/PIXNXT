import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, Bell, Info, Check, X, Upload, MessageSquare, AlertCircle, ArrowLeft, Image, CheckCircle2, Crop, RotateCw, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { storageService } from '../../services/storage.service';
import { resolveMediaUrl } from '../../lib/photoDisplayUrl';
import { resolveCrossOriginMediaUrl } from '../../lib/r2MediaProxy';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImageUtils';
import '../PrintStore.css';

export default function NotificationsPage({ sessionId, photographer, onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'accept' | 'original' | 'new' | null
  const [newUploadPreview, setNewUploadPreview] = useState(null); // { file, previewUrl }
  const [submitting, setSubmitting] = useState(false);
  const [reviewResolved, setReviewResolved] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null); // 'original' | 'suggested' | 'new'

  // Suggested Crop State
  const [sugPhotoState, setSugPhotoState] = useState({
    url: '',
    editedPhotoUrl: '',
    rotation: 0,
    crop: { x: 0, y: 0 },
    zoom: 1
  });

  // New Upload Crop State
  const [newPhotoState, setNewPhotoState] = useState({
    file: null,
    url: '',
    editedPhotoUrl: '',
    rotation: 0,
    crop: { x: 0, y: 0 },
    zoom: 1
  });

  // Cropper Modal Overlay State
  const [cropState, setCropState] = useState({
    isOpen: false,
    type: null, // 'suggested' | 'new'
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    aspect: 1,
    imageSrc: '',
    croppedAreaPixels: null
  });

  // Load pending artwork reviews for client session / orders
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const reviewId = urlParams.get('review_id');

      if (reviewId) {
        const { data: review, error: reviewErr } = await supabase
          .from('printstore_artwork_reviews')
          .select(`*, orderItem:printstore_order_items(*)`)
          .eq('id', reviewId)
          .maybeSingle();

        if (!reviewErr && review) {
          setNotifications([review]);
          if (review.review_status !== 'Waiting Customer') {
            setReviewResolved(true);
            setSelectedReview(null);
            setLoading(false);
            return;
          }
          // Open the review workspace directly
          setSelectedReview(review);
          const item = review.orderItem;
          const opts = item?.options || {};
          const rawUrl = resolvePhotoUrl(opts.photo?.url || opts.photos?.[0]?.url || opts.photo);

          setSugPhotoState({
            url: rawUrl,
            editedPhotoUrl: resolvePhotoUrl(opts.editedPhotoUrl || rawUrl),
            rotation: opts.rotation || 0,
            crop: opts.crop || { x: 0, y: 0 },
            zoom: opts.zoom || 1
          });
          setNewUploadPreview(null);
          setNewPhotoState({
            file: null,
            url: '',
            editedPhotoUrl: '',
            rotation: 0,
            crop: { x: 0, y: 0 },
            zoom: 1
          });
          setSelectedChoice(null);
          setLoading(false);
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      const orFilters = [];
      if (sessionId) orFilters.push(`session_id.eq.${sessionId}`);
      if (userEmail) orFilters.push(`customer_email.eq.${userEmail}`);

      if (orFilters.length === 0) { setNotifications([]); setLoading(false); return; }

      const { data: orders, error: ordersErr } = await supabase
        .from('printstore_orders')
        .select('id, customer_name, customer_email, created_at')
        .or(orFilters.join(','));
      if (ordersErr) throw ordersErr;
      if (!orders || orders.length === 0) { setNotifications([]); setLoading(false); return; }

      const orderIds = orders.map(o => o.id);
      const { data: reviews, error: reviewsErr } = await supabase
        .from('printstore_artwork_reviews')
        .select(`*, orderItem:printstore_order_items(*)`)
        .in('order_id', orderIds)
        .eq('review_status', 'Waiting Customer');
      if (reviewsErr) throw reviewsErr;
      setNotifications(reviews || []);
    } catch (e) {
      console.error('Error fetching storefront notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [sessionId, photographer?.id]);

  const handleOpenReview = (review) => {
    setSelectedReview(review);
    const item = review.orderItem;
    const opts = item?.options || {};
    const rawUrl = resolvePhotoUrl(opts.photo?.url || opts.photos?.[0]?.url || opts.photo);

    setSugPhotoState({
      url: rawUrl,
      editedPhotoUrl: resolvePhotoUrl(opts.editedPhotoUrl || rawUrl),
      rotation: opts.rotation || 0,
      crop: opts.crop || { x: 0, y: 0 },
      zoom: opts.zoom || 1
    });

    setNewUploadPreview(null);
    setNewPhotoState({
      file: null,
      url: '',
      editedPhotoUrl: '',
      rotation: 0,
      crop: { x: 0, y: 0 },
      zoom: 1
    });
    setSelectedChoice(null);
  };

  const handleCloseReview = () => {
    setSelectedReview(null);
    setConfirmAction(null);
    setNewUploadPreview(null);
    setSelectedChoice(null);
  };

  const resolvePhotoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    return resolveCrossOriginMediaUrl(resolveMediaUrl(url));
  };

  const getAspect = (printSize) => {
    if (!printSize) return 1.0;
    const match = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!match) return 1.0;
    return parseFloat(match[1]) / parseFloat(match[2]);
  };

  // Helper to upload a cropped blob URL to Cloudflare R2
  const uploadCroppedImage = async (blobUrl, orderId) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped_${Date.now()}.jpeg`, { type: 'image/jpeg' });
      const path = `orders/${orderId}/crops/cropped_${Date.now()}.jpeg`;
      const uploadRes = await storageService.upload(path, file);
      return uploadRes?.path || '';
    } catch (e) {
      console.error("Failed to upload cropped image:", e);
      throw e;
    }
  };

  // ── Accept Suggestion ──
  const handleAcceptSuggestion = async () => {
    if (!selectedReview) return;
    try {
      setSubmitting(true);
      const { order_id, order_item_id, id, orderItem } = selectedReview;

      let r2Path = sugPhotoState.editedPhotoUrl;
      if (r2Path && r2Path.startsWith('blob:')) {
        r2Path = await uploadCroppedImage(r2Path, order_id);
      }

      const currentOpts = orderItem.options || {};
      const updatedOpts = {
        ...currentOpts,
        editedPhotoUrl: r2Path,
        crop: sugPhotoState.crop,
        zoom: sugPhotoState.zoom,
        rotation: sugPhotoState.rotation
      };

      const { error: itemErr } = await supabase
        .from('printstore_order_items')
        .update({ options: updatedOpts })
        .eq('id', order_item_id);
      if (itemErr) throw itemErr;

      const { error: revErr } = await supabase.from('printstore_artwork_reviews').update({
        review_status: 'Ready For Print', customer_choice: 'Accept suggested crop',
        customer_replied_at: new Date().toISOString(), resolved_at: new Date().toISOString()
      }).eq('id', id);
      if (revErr) throw revErr;

      const { error: orderErr } = await supabase.from('printstore_orders').update({ status: 'printing' }).eq('id', order_id);
      if (orderErr) throw orderErr;

      const { error: trackErr } = await supabase.from('printstore_order_tracking').insert({
        order_id, status: 'printing', label: 'Artwork Approved',
        description: 'Customer approved suggested alignment. Order moved to Print Queue.'
      });
      if (trackErr) throw trackErr;

      setConfirmAction(null); handleCloseReview(); fetchNotifications();
    } catch (e) { console.error('Accept failed:', e); alert('Action failed: ' + e.message); }
    finally { setSubmitting(false); }
  };

  // ── Keep Original ──
  const handleKeepOriginal = async () => {
    if (!selectedReview) return;
    try {
      setSubmitting(true);
      const { order_id, order_item_id, id, orderItem } = selectedReview;
      const currentOpts = orderItem.options || {};
      const updatedOpts = { ...currentOpts, editedPhotoUrl: null, crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 };

      const { error: itemErr } = await supabase.from('printstore_order_items').update({ options: updatedOpts }).eq('id', order_item_id);
      if (itemErr) throw itemErr;

      const { error: revErr } = await supabase.from('printstore_artwork_reviews').update({
        review_status: 'Ready For Print', customer_choice: 'Keep original crop',
        customer_replied_at: new Date().toISOString(), resolved_at: new Date().toISOString()
      }).eq('id', id);
      if (revErr) throw revErr;

      const { error: orderErr } = await supabase.from('printstore_orders').update({ status: 'printing' }).eq('id', order_id);
      if (orderErr) throw orderErr;

      const { error: trackErr } = await supabase.from('printstore_order_tracking').insert({
        order_id, status: 'printing', label: 'Original Photo Kept',
        description: 'Customer preferred original uploaded photo. Order moved to Print Queue.'
      });
      if (trackErr) throw trackErr;

      setConfirmAction(null); handleCloseReview(); fetchNotifications();
    } catch (e) { console.error('Reset failed:', e); alert('Action failed: ' + e.message); }
    finally { setSubmitting(false); }
  };

  // ── Handle file selection ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setNewUploadPreview({ file, previewUrl });
    setNewPhotoState({
      file,
      url: previewUrl,
      editedPhotoUrl: previewUrl,
      rotation: 0,
      crop: { x: 0, y: 0 },
      zoom: 1
    });
    setSelectedChoice(null);
    e.target.value = '';
  };

  // ── Submit selected new photo ──
  const handleSubmitNewPhoto = async () => {
    if (!newUploadPreview || !selectedReview) return;
    try {
      setUploading(true);
      const { order_id, order_item_id, id, orderItem } = selectedReview;

      // 1. Upload original replacement
      const cleanFileName = `${Date.now()}_${newPhotoState.file.name.replace(/\s+/g, '_')}`;
      const origPath = `orders/${order_id}/replacements/${cleanFileName}`;
      const uploadRes = await storageService.upload(origPath, newPhotoState.file);
      if (!uploadRes?.path) throw new Error('R2 Upload failed');

      // 2. Upload cropped replacement if customized
      let r2CroppedPath = newPhotoState.editedPhotoUrl;
      if (r2CroppedPath && r2CroppedPath.startsWith('blob:')) {
        r2CroppedPath = await uploadCroppedImage(r2CroppedPath, order_id);
      }

      const currentOpts = orderItem.options || {};
      const updatedOpts = {
        ...currentOpts,
        photo: { id: `replaced_${Date.now()}`, url: uploadRes.path },
        photos: [{ id: `replaced_${Date.now()}`, url: uploadRes.path }],
        editedPhotoUrl: r2CroppedPath || null,
        crop: newPhotoState.crop,
        zoom: newPhotoState.zoom,
        rotation: newPhotoState.rotation
      };

      const { error: itemErr } = await supabase.from('printstore_order_items').update({ options: updatedOpts }).eq('id', order_item_id);
      if (itemErr) throw itemErr;

      const { error: revErr } = await supabase.from('printstore_artwork_reviews').update({
        review_status: 'New Image Uploaded', customer_choice: 'Upload new photo',
        customer_replied_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
        new_uploaded_photo_url: uploadRes.path
      }).eq('id', id);
      if (revErr) throw revErr;

      const { error: orderErr } = await supabase.from('printstore_orders').update({ status: 'printing' }).eq('id', order_id);
      if (orderErr) throw orderErr;

      const { error: trackErr } = await supabase.from('printstore_order_tracking').insert({
        order_id, status: 'printing', label: 'Replacement Photo Received',
        description: 'Customer uploaded a replacement image. Order moved to Print Queue.'
      });
      if (trackErr) throw trackErr;

      handleCloseReview(); fetchNotifications();
    } catch (err) { console.error('Upload failed:', err); alert('Upload failed: ' + err.message); }
    finally { setUploading(false); }
  };

  // ── Crop/Zoom adjustor handlers ──
  const openCropModal = (type) => {
    const isSug = type === 'suggested';
    const state = isSug ? sugPhotoState : newPhotoState;
    if (!state.url) return;

    setCropState({
      isOpen: true,
      type,
      crop: state.crop,
      zoom: state.zoom,
      rotation: state.rotation,
      aspect: getAspect(selectedReview.orderItem?.options?.printSize),
      imageSrc: state.url,
      croppedAreaPixels: null
    });
  };

  const handleSaveCrop = async () => {
    const { type, croppedAreaPixels } = cropState;
    if (!croppedAreaPixels) {
      setCropState(prev => ({ ...prev, isOpen: false }));
      return;
    }
    try {
      if (type === 'suggested') {
        const croppedImage = await getCroppedImg(sugPhotoState.url, croppedAreaPixels, sugPhotoState.rotation);
        setSugPhotoState(prev => ({
          ...prev,
          editedPhotoUrl: croppedImage,
          crop: cropState.crop,
          zoom: cropState.zoom
        }));
      } else if (type === 'new') {
        const croppedImage = await getCroppedImg(newPhotoState.url, croppedAreaPixels, newPhotoState.rotation);
        setNewPhotoState(prev => ({
          ...prev,
          editedPhotoUrl: croppedImage,
          crop: cropState.crop,
          zoom: cropState.zoom
        }));
      }
      setCropState(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error("Cropping failed:", e);
      setCropState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRotateType = (type) => {
    const isSug = type === 'suggested';
    const setter = isSug ? setSugPhotoState : setNewPhotoState;
    setter(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
      crop: { x: 0, y: 0 },
      zoom: 1,
      editedPhotoUrl: prev.url
    }));
  };

  const handleResetType = (type) => {
    const isSug = type === 'suggested';
    const setter = isSug ? setSugPhotoState : setNewPhotoState;
    setter(prev => ({
      ...prev,
      editedPhotoUrl: prev.url,
      rotation: 0,
      crop: { x: 0, y: 0 },
      zoom: 1
    }));
  };

  /* ═══════════════════════ FULL-SCREEN REVIEW PAGE ═══════════════════════ */
  if (selectedReview) {
    const item = selectedReview.orderItem;
    const opts = item?.options || {};
    const frameColor = opts.frameColor || (typeof opts.frame === 'object' ? opts.frame?.label : opts.frame) || 'No Frame';
    const borderSize = opts.borderSize || (typeof opts.mat === 'object' ? opts.mat?.label : opts.mat) || 'No Mat';
    const isNoFrame = frameColor.toLowerCase().includes('no frame') || frameColor.toLowerCase().includes('none') || frameColor === '';
    const isNoMat = borderSize.toLowerCase().includes('no mat') || borderSize.toLowerCase().includes('none') || borderSize === '';
    const isPrintPack = item?.product_id === 'print_pack' || (item?.product_name || '').toLowerCase().includes('print pack');
    const printSizeStr = opts.printSize || (typeof opts.size === 'object' ? opts.size?.label : opts.size) || '20x20cm';
    const aspect = getAspect(printSizeStr);

    const hasNewUpload = !!newUploadPreview;
    const containerW = hasNewUpload ? 220 : 280;
    const containerH = containerW / aspect;

    const displayOrig = resolvePhotoUrl(opts.photo?.url || opts.photos?.[0]?.url || opts.photo);

    const pMatch = printSizeStr.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    const printW = pMatch ? parseFloat(pMatch[1]) : 20;
    const printH = pMatch ? parseFloat(pMatch[2]) : 20;

    let frameWidthCm = 0;
    if (!isNoFrame) {
      const m = frameColor.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
      frameWidthCm = m ? (frameColor.toLowerCase().includes('inch') || frameColor.toLowerCase().includes('in') ? parseFloat(m[1]) * 2.54 : parseFloat(m[1])) : 2.54;
    }
    let matWidthCm = 0;
    if (!isNoMat && !isNoFrame) {
      const m = borderSize.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
      matWidthCm = m ? (borderSize.toLowerCase().includes('inch') || borderSize.toLowerCase().includes('in') ? parseFloat(m[1]) * 2.54 : parseFloat(m[1])) : 2.0;
    }

    const inConv = (cm) => (cm / 2.54).toFixed(1);

    const renderScales = () => {
      const isFramed = !isNoFrame;
      const fOW = printW + 2 * frameWidthCm + 2 * matWidthCm;
      const fOH = printH + 2 * frameWidthCm + 2 * matWidthCm;
      const pW = (printW / fOW) * 100, pH = (printH / fOH) * 100;
      const pL = (100 - pW) / 2, pT = (100 - pH) / 2;
      const ls = { position: 'absolute', borderStyle: 'solid', borderColor: '#bbb', pointerEvents: 'none', zIndex: 10 };
      const ts = { position: 'absolute', background: '#bbb', pointerEvents: 'none', zIndex: 11 };
      const lbs = { position: 'absolute', background: 'transparent', fontSize: '8px', fontFamily: "'Georgia', serif", fontWeight: '600', letterSpacing: '0.3px', color: '#999', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 12, textTransform: 'uppercase' };
      const g = 14, tg = 10;
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
          <div style={{ position: 'absolute', top: `-${g}px`, left: `${isFramed ? pL : 0}%`, width: `${isFramed ? pW : 100}%`, height: 0, overflow: 'visible' }}>
            <div style={{ ...ls, left: 0, right: 0, top: 0, borderTopWidth: '1px' }} />
            <div style={{ ...ts, left: 0, top: '-3px', width: '1px', height: '6px' }} />
            <div style={{ ...ts, right: 0, top: '-3px', width: '1px', height: '6px' }} />
            <div style={{ ...lbs, left: '50%', top: 0, transform: `translate(-50%, -50%) translateY(-${tg}px)` }}>{printW} cm / {inConv(printW)} in</div>
          </div>
          <div style={{ position: 'absolute', left: `-${g}px`, top: `${isFramed ? pT : 0}%`, height: `${isFramed ? pH : 100}%`, width: 0, overflow: 'visible' }}>
            <div style={{ ...ls, top: 0, bottom: 0, left: 0, borderLeftWidth: '1px' }} />
            <div style={{ ...ts, top: 0, left: '-3px', height: '1px', width: '6px' }} />
            <div style={{ ...ts, bottom: 0, left: '-3px', height: '1px', width: '6px' }} />
            <div style={{ ...lbs, left: 0, top: '50%', transform: `translate(-50%, -50%) translateX(-${tg}px) rotate(-90deg)` }}>{printH} cm / {inConv(printH)} in</div>
          </div>
        </div>
      );
    };

    const renderPrintPackStack = (imgSrc, rotation = 0) => (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', background: 'transparent' }}>
        {[0, 1, 2, 3].map(i => (
          <img key={i} src={imgSrc} alt="" style={{
            width: '65%', height: '65%', objectFit: 'cover', position: 'absolute',
            border: '1px solid rgba(0,0,0,0.05)', backgroundColor: '#fff',
            boxShadow: i === 3 ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.15)',
            transform: i === 0 ? `rotate(${-8 + rotation}deg) translate(-12px,-8px)` : 
                       i === 1 ? `rotate(${-3 + rotation}deg) translate(-4px,-4px)` : 
                       i === 2 ? `rotate(${2 + rotation}deg) translate(4px,2px)` : 
                                 `rotate(${6 + rotation}deg) translate(12px,8px)`,
            zIndex: i + 1, filter: i < 3 ? `brightness(${0.92 + i * 0.03})` : 'none',
            transition: 'transform 0.2s ease'
          }} />
        ))}
      </div>
    );

    const renderFramedImage = (imgSrc, altText, rotation = 0) => (
      <div style={{
        width: '100%', height: '100%',
        border: (isNoFrame || isNoMat) ? 'none' : '12px solid #f8f6f0',
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
      }}>
        <img src={imgSrc} alt={altText} style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.2s ease'
        }} />
      </div>
    );

    const renderPhotoFrame = (imgSrc, altText, rotation = 0) => (
      <div style={{ position: 'relative', width: `${containerW}px`, height: `${containerH}px`, margin: '0 auto' }}>
        {renderScales()}
        <div style={{
          position: 'absolute', inset: 0,
          border: isNoFrame ? 'none' : '10px solid #222',
          backgroundColor: 'transparent',
          boxShadow: isNoFrame ? 'none' : '0 8px 20px rgba(0,0,0,0.06)',
          boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          {isPrintPack ? renderPrintPackStack(imgSrc, rotation) : renderFramedImage(imgSrc, altText, rotation)}
        </div>
      </div>
    );

    const renderAdjusterControls = (type) => (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={() => openCropModal(type)}
          style={{
            padding: '6px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: '0',
            fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Crop size={12} /> Crop
        </button>
        <button
          onClick={() => handleRotateType(type)}
          style={{
            padding: '6px 12px', background: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: '0',
            fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}
        >
          <RotateCw size={12} /> Rotate
        </button>
        <button
          onClick={() => handleResetType(type)}
          style={{
            padding: '6px 12px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '0',
            fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}
        >
          <RefreshCw size={12} /> Reset
        </button>
      </div>
    );

    const gridCols = hasNewUpload ? '1fr 1fr 1fr' : '1fr 1fr';

    const selectBtnStyle = (isSelected) => ({
      marginTop: '16px', width: '100%', padding: '12px 0',
      background: isSelected ? '#111' : '#fff', color: isSelected ? '#fff' : '#333',
      border: isSelected ? '2px solid #111' : '1px solid #ccc', borderRadius: '0',
      fontSize: '12px', fontWeight: 500, cursor: 'pointer',
      fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      transition: 'all 0.2s'
    });

    const boxWrapperStyle = {
      width: '100%',
      padding: isNoFrame ? '0' : '32px 24px',
      background: isNoFrame ? 'transparent' : '#fafafa',
      border: isNoFrame ? 'none' : '1px solid #eee',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: hasNewUpload ? '280px' : '340px'
    };

    return (
      <div className="cart-page-container" style={{ minHeight: '80vh', padding: '40px 0', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
          {/* Main review workspace starting directly with details */}
          <div style={{ height: '24px' }} />

          {/* Info Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '36px' }}>
            <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '10px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Image size={16} style={{ color: '#999' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Photo Details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Product', item?.product_name || 'Print Item'],
                  ['Print Size', printSizeStr],
                  ['Frame', frameColor],
                  ['Order', `#${selectedReview.order_id?.slice(0, 8).toUpperCase()}`],
                  ['Uploaded by', photographer?.display_name || 'Customer']
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#888' }}>{k}</span>
                    <span style={{ color: '#333', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#faf8f5', border: '1px solid #f0e8dd', borderRadius: '10px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <MessageSquare size={16} style={{ color: '#c68e54' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#c68e54', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note from Pre-Press Reviewer</span>
              </div>
              <p style={{ fontSize: '14px', color: '#555', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
                "{selectedReview.customer_message || selectedReview.reviewer_notes || 'We adjusted the framing to center the main subject and prevent crucial elements from being cut off during cutting.'}"
              </p>
              {selectedReview.reviewed_by && (
                <p style={{ fontSize: '12px', color: '#aaa', margin: '12px 0 0 0' }}>— {selectedReview.reviewed_by}</p>
              )}
            </div>
          </div>

          {/* Grid Side-by-Side Area */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '24px', marginBottom: '40px' }}>
            
            {/* Original Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 400, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '40px', textAlign: 'center' }}>
                Original Upload
              </span>
              <div style={boxWrapperStyle}>
                {renderPhotoFrame(displayOrig, 'Original', 0)}
                {/* No cropper controls for raw original */}
                <div style={{ height: '35px', marginTop: '12px' }} />
              </div>
              {hasNewUpload && (
                <button onClick={() => setSelectedChoice('original')} style={selectBtnStyle(selectedChoice === 'original')}>
                  {selectedChoice === 'original' && <CheckCircle2 size={14} />} Select This Photo
                </button>
              )}
            </div>

            {/* Suggested Alignment */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 400, color: '#111', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '40px', textAlign: 'center' }}>
                Suggested Alignment
              </span>
              <div style={boxWrapperStyle}>
                {renderPhotoFrame(sugPhotoState.editedPhotoUrl, 'Suggested', sugPhotoState.rotation)}
                {renderAdjusterControls('suggested')}
              </div>
              {hasNewUpload && (
                <button onClick={() => setSelectedChoice('suggested')} style={selectBtnStyle(selectedChoice === 'suggested')}>
                  {selectedChoice === 'suggested' && <CheckCircle2 size={14} />} Select This Photo
                </button>
              )}
            </div>

            {/* New Upload */}
            {hasNewUpload && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 400, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '40px', textAlign: 'center' }}>
                  Your New Upload
                </span>
                <div style={{
                  ...boxWrapperStyle,
                  background: isNoFrame ? 'transparent' : '#f0fdf4',
                  border: isNoFrame ? 'none' : '1px solid #bbf7d0'
                }}>
                  {renderPhotoFrame(newPhotoState.editedPhotoUrl, 'New Upload', newPhotoState.rotation)}
                  {renderAdjusterControls('new')}
                </div>
                <button onClick={() => setSelectedChoice('new')} style={selectBtnStyle(selectedChoice === 'new')}>
                  {selectedChoice === 'new' && <CheckCircle2 size={14} />} Select This Photo
                </button>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div style={{ borderTop: '1px solid #eaeaea', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {!hasNewUpload ? (
              <>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={() => setConfirmAction('accept')} disabled={submitting}
                    style={{ background: '#111', color: 'white', border: 'none', borderRadius: '0', padding: '14px 32px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '10px', opacity: submitting ? 0.5 : 1 }}
                  >
                    <Check size={16} /> Accept Suggestion
                  </button>
                  <button onClick={() => setConfirmAction('original')} disabled={submitting}
                    style={{ background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '0', padding: '14px 32px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: submitting ? 0.5 : 1 }}
                  >
                    Use Original Upload Anyway
                  </button>
                </div>
                <div>
                  <input type="file" id="client-file-replacement" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                  <label htmlFor="client-file-replacement"
                    style={{ background: 'transparent', color: '#111', border: '1px solid #111', borderRadius: '0', padding: '14px 28px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Upload size={16} /> Upload New Photo
                  </label>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      if (selectedChoice === 'original') setConfirmAction('original');
                      else if (selectedChoice === 'suggested') setConfirmAction('accept');
                      else if (selectedChoice === 'new') setConfirmAction('new');
                    }}
                    disabled={!selectedChoice || uploading}
                    style={{
                      background: selectedChoice ? '#111' : '#ccc', color: 'white', border: 'none', borderRadius: '0',
                      padding: '14px 36px', fontSize: '12px', fontWeight: 500,
                      cursor: selectedChoice ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em',
                      display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <Check size={16} /> {uploading ? 'Submitting...' : 'Confirm Selection'}
                  </button>
                  <button
                    onClick={() => { setNewUploadPreview(null); setSelectedChoice(null); }}
                    style={{ background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: '0', padding: '14px 24px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <input type="file" id="client-file-replacement-2" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                  <label htmlFor="client-file-replacement-2"
                    style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '0', padding: '14px 24px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Upload size={16} /> Change Photo
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Confirmation Overlay Dialog */}
          {confirmAction && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
              <div style={{ background: 'white', width: '440px', maxWidth: '100%', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: confirmAction === 'accept' ? '#f0fdf4' : confirmAction === 'new' ? '#eff6ff' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                  {confirmAction === 'accept' ? <Check size={24} style={{ color: '#16a34a' }} /> : confirmAction === 'new' ? <Upload size={24} style={{ color: '#2563eb' }} /> : <Info size={24} style={{ color: '#d97706' }} />}
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 400, color: '#111', margin: '0 0 12px 0' }}>
                  {confirmAction === 'accept' ? 'Accept Suggested Placement?' : confirmAction === 'new' ? 'Use Your New Photo?' : 'Use Original Upload?'}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                  {confirmAction === 'accept'
                    ? 'The lab\'s suggested crop alignment will be used for printing. This action cannot be undone.'
                    : confirmAction === 'new'
                    ? 'Your newly uploaded photo will replace the current image. The lab will review the new placement before printing.'
                    : 'Your original photo placement will be used as-is for printing, ignoring the lab\'s suggested adjustments.'
                  }
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => setConfirmAction(null)}
                    style={{ background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: '0', padding: '12px 28px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >Cancel</button>
                  <button
                    onClick={confirmAction === 'accept' ? handleAcceptSuggestion : confirmAction === 'new' ? handleSubmitNewPhoto : handleKeepOriginal}
                    disabled={submitting || uploading}
                    style={{ background: '#111', color: 'white', border: 'none', borderRadius: '0', padding: '12px 28px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: (submitting || uploading) ? 0.5 : 1 }}
                  >
                    {(submitting || uploading) ? 'Processing...' : confirmAction === 'accept' ? 'Yes, Accept' : confirmAction === 'new' ? 'Yes, Use New Photo' : 'Yes, Use Original'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive easy-crop modal overlay */}
          {cropState.isOpen && (
            <div style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(3px)',
              zIndex: 99999,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
            }}>
              <div style={{
                width: '90%', maxWidth: '800px', height: '75%', maxHeight: '600px',
                background: 'white', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column', gap: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '18px', fontWeight: 400, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Crop & Arrange Image Placement
                  </h3>
                  <span style={{ fontSize: '12px', color: '#666' }}>Drag photo to position & use slider to zoom</span>
                </div>

                <div style={{ position: 'relative', flex: 1, background: '#111', overflow: 'hidden' }}>
                  <Cropper
                    image={cropState.imageSrc}
                    crop={cropState.crop}
                    zoom={cropState.zoom}
                    aspect={cropState.aspect}
                    rotation={cropState.rotation}
                    onCropChange={(crop) => setCropState(prev => ({ ...prev, crop }))}
                    onZoomChange={(zoom) => setCropState(prev => ({ ...prev, zoom }))}
                    onCropComplete={(croppedArea, croppedAreaPixels) => setCropState(prev => ({ ...prev, croppedAreaPixels }))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  <button 
                    onClick={() => setCropState(prev => ({ ...prev, zoom: Math.max(1, prev.zoom - 0.1) }))}
                    style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '20px', padding: '0 8px' }}
                  >
                    -
                  </button>
                  <input 
                    type="range" min={1} max={3} step={0.05}
                    value={cropState.zoom}
                    onChange={(e) => setCropState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#111', cursor: 'pointer', height: '4px' }}
                  />
                  <button 
                    onClick={() => setCropState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
                    style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '20px', padding: '0 8px' }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    onClick={() => setCropState(prev => ({ ...prev, isOpen: false }))}
                    style={{
                      background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: '0',
                      padding: '10px 24px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveCrop}
                    style={{
                      background: '#111', color: 'white', border: 'none', borderRadius: '0',
                      padding: '10px 24px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}
                  >
                    Save Placement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════ NOTIFICATIONS LIST (default view) ═══════════════════════ */
  if (reviewResolved) {
    return (
      <div className="cart-page-container" style={{ minHeight: '80vh', padding: '60px 0', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', padding: '40px', textAlign: 'center', border: '1px solid #eaeaea', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <CheckCircle2 size={32} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, color: '#111', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Submission Confirmed
          </h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 32px 0', lineHeight: 1.6 }}>
            Your response has been successfully submitted to the lab. We have updated your photo alignment, and printing of your order will resume immediately.
          </p>
          <button
            onClick={() => {
              // Clear search params to clean the URL
              window.history.pushState({}, '', window.location.pathname);
              if (onBack) onBack();
            }}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: '#111', color: '#ffffff', border: 'none',
              fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              cursor: 'pointer', transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#333'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; }}
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container" style={{ minHeight: '80vh', padding: '40px 0', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ height: '24px' }} />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
            <div className="lab-spinner" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: '#222' }}>
            <Bell size={32} strokeWidth={1.2} style={{ marginBottom: '12px', color: '#555' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>All caught up!</span>
            <span style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>No action is required for your current orders.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notifications.map((notif) => {
              const nItem = notif.orderItem;
              return (
                <div 
                  key={notif.id}
                  style={{
                    background: 'white', border: '1px solid #eaeaea', borderRadius: '12px',
                    padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '24px', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '8px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px 0' }}>
                        Artwork Alignment Review
                      </h4>
                      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                        Our lab identified crop placement adjustments for your photo on <strong>{nItem?.product_name || 'Print Item'}</strong> (ordered size: {nItem?.options?.size?.label || nItem?.options?.printSize || 'Custom size'}). Review suggestions to resume printing.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888' }}>
                        <span>Order: #{notif.order_id?.slice(0, 8).toUpperCase()}</span>
                        <span>•</span>
                        <span>Received: {new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenReview(notif)}
                    style={{
                      backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '0',
                      padding: '12px 28px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      whiteSpace: 'nowrap', fontFamily: 'var(--font-heading)',
                      textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#333'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; }}
                  >
                    Review Adjustments
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
