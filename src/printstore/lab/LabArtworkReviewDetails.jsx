import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';
import { 
  ArrowLeft, Move, ZoomIn, ZoomOut, RotateCw, RefreshCw, Maximize2, Square, Circle, 
  ArrowUpRight, Edit3, Type, Check, Mail, Trash2, FileText, ChevronRight, History, Crop
} from 'lucide-react';
import { MOCK_PHOTOS, isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImageUtils';
import { storageService } from '../../services/storage.service';
import { getShortId } from '../utils/idFormat';

const resolvePhotoUrl = (url, id) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  const mock = MOCK_PHOTOS.find(mp => mp.id === url || mp.id === id);
  if (mock) {
    return mock.url;
  }

  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';
  if (r2PublicUrl) {
    const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl : `${r2PublicUrl}/`;
    return `${baseUrl}${url}`;
  }
  
  return url;
};

export default function LabArtworkReviewDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, orderItems, refreshOrders } = useLabAuth();
  const [freshOrderItem, setFreshOrderItem] = useState(null);

  // Find target order and item
  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);
  const orderItem = useMemo(() => {
    return freshOrderItem || orderItems.find(item => item.order_id === orderId);
  }, [orderItems, orderId, freshOrderItem]);

  // Options
  const opts = useMemo(() => orderItem?.options || {}, [orderItem]);
  
  const isFramedProduct = useMemo(() => {
    if (!orderItem) return false;
    const name = (orderItem.product_name || '').toLowerCase();
    const pid = (orderItem.product_id || '').toLowerCase();
    return name.includes('frame') || pid.includes('frame') || name.includes('collage');
  }, [orderItem]);

  const isPrintPack = useMemo(() => {
    if (!orderItem) return false;
    const pid = (orderItem.product_id || '').toLowerCase();
    const name = (orderItem.product_name || '').toLowerCase();
    return pid === 'print_pack' || name.includes('print pack');
  }, [orderItem]);

  const frameColor = opts.frameColor || (typeof opts.frame === 'object' ? opts.frame?.label : opts.frame) || (isFramedProduct ? 'Black Wood (1 inch)' : 'No Frame');
  const borderSize = opts.borderSize || (typeof opts.mat === 'object' ? opts.mat?.label : opts.mat) || (isFramedProduct ? '2 cm Mat' : 'No Mat');
  const glassType = opts.glassType || (typeof opts.glass === 'object' ? opts.glass?.label : opts.glass) || 'Anti-Glare Glass';
  const printSize = opts.printSize || (typeof opts.size === 'object' ? opts.size?.label : opts.size) || '13x18 cm (Portrait)';
  
  const isNoFrame = useMemo(() => {
    const lower = frameColor.toLowerCase();
    return lower.includes('no frame') || lower.includes('none') || lower === '';
  }, [frameColor]);

  const isNoMat = useMemo(() => {
    const lower = borderSize.toLowerCase();
    return lower.includes('no mat') || lower.includes('none') || lower === '';
  }, [borderSize]);

  const aspect = useMemo(() => {
    if (!printSize) return 1.0;
    const match = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!match) return 1.0;
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    return w / h;
  }, [printSize]);

  const frameDimensions = useMemo(() => {
    const maxWidth = 460;
    const maxHeight = 340;
    
    let width = maxWidth;
    let height = maxWidth / aspect;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspect;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }, [aspect]);

  const comparisonDimensions = useMemo(() => {
    const maxWidth = 280;
    const maxHeight = 190;
    
    let width = maxWidth;
    let height = maxWidth / aspect;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspect;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }, [aspect]);

  const frameBorderWidth = useMemo(() => {
    if (isNoFrame) return 0;
    let cm = 2.54;
    const match = frameColor.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const isInch = frameColor.toLowerCase().includes('inch') || frameColor.toLowerCase().includes('in');
      cm = isInch ? val * 2.54 : val;
    }
    const pmatch = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (pmatch) {
      const printW = parseFloat(pmatch[1]);
      const frameW = frameDimensions.width;
      const px = (cm / printW) * frameW;
      return Math.max(8, Math.round(px));
    }
    return 16;
  }, [frameColor, isNoFrame, printSize, frameDimensions]);

  const comparisonFrameBorderWidth = useMemo(() => {
    if (isNoFrame) return 0;
    let cm = 2.54;
    const match = frameColor.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const isInch = frameColor.toLowerCase().includes('inch') || frameColor.toLowerCase().includes('in');
      cm = isInch ? val * 2.54 : val;
    }
    const pmatch = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (pmatch) {
      const printW = parseFloat(pmatch[1]);
      const compW = comparisonDimensions.width;
      const px = (cm / printW) * compW;
      return Math.max(4, Math.round(px));
    }
    return 8;
  }, [frameColor, isNoFrame, printSize, comparisonDimensions]);

  const matBorderWidth = useMemo(() => {
    if (isNoMat || isNoFrame) return 0;
    const match = borderSize.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const cm = parseFloat(match[1]);
      const pmatch = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
      if (pmatch) {
        const printW = parseFloat(pmatch[1]);
        const frameW = frameDimensions.width;
        const px = (cm / printW) * frameW;
        return Math.max(4, Math.round(px));
      }
      return 16;
    }
    return 16;
  }, [borderSize, isNoMat, isNoFrame, printSize, frameDimensions]);

  const comparisonMatBorderWidth = useMemo(() => {
    if (isNoMat || isNoFrame) return 0;
    const match = borderSize.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const cm = parseFloat(match[1]);
      const pmatch = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
      if (pmatch) {
        const printW = parseFloat(pmatch[1]);
        const compW = comparisonDimensions.width;
        const px = (cm / printW) * compW;
        return Math.max(2, Math.round(px));
      }
      return 10;
    }
    return 10;
  }, [borderSize, isNoMat, isNoFrame, printSize, comparisonDimensions]);

  const { printW, printH } = useMemo(() => {
    const match = printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (match) {
      return { printW: parseFloat(match[1]), printH: parseFloat(match[2]) };
    }
    return { printW: 20, printH: 20 };
  }, [printSize]);

  const frameWidthCm = useMemo(() => {
    if (isNoFrame) return 0;
    const match = frameColor.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const isInch = frameColor.toLowerCase().includes('inch') || frameColor.toLowerCase().includes('in');
      return isInch ? val * 2.54 : val;
    }
    return 2.54;
  }, [frameColor, isNoFrame]);

  const matWidthCm = useMemo(() => {
    if (isNoMat || isNoFrame) return 0;
    const match = borderSize.match(/(\d+(?:\.\d+)?)\s*(?:cm|inch|in)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const isInch = borderSize.toLowerCase().includes('inch') || borderSize.toLowerCase().includes('in');
      return isInch ? val * 2.54 : val;
    }
    return 2.0;
  }, [borderSize, isNoMat, isNoFrame]);

  const renderMeasurementScales = (width, height, isMainWorkspace = false) => {
    const isFramed = !isNoFrame;
    const frameOuterW = printW + 2 * frameWidthCm + 2 * matWidthCm;
    const frameOuterH = printH + 2 * frameWidthCm + 2 * matWidthCm;

    const printW_Pct = (printW / frameOuterW) * 100;
    const printH_Pct = (printH / frameOuterH) * 100;
    const printLeft_Pct = (100 - printW_Pct) / 2;
    const printTop_Pct = (100 - printH_Pct) / 2;

    const lineStyle = {
      position: 'absolute',
      borderStyle: 'solid',
      borderColor: '#64748b',
      pointerEvents: 'none',
      zIndex: 10
    };

    const tickStyle = {
      position: 'absolute',
      background: '#64748b',
      pointerEvents: 'none',
      zIndex: 11
    };

    const labelStyle = {
      position: 'absolute',
      background: 'transparent',
      fontSize: isMainWorkspace ? '10px' : '8px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      letterSpacing: '0.5px',
      color: '#64748b',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 12,
      textTransform: 'uppercase'
    };

    const inConv = (cm) => (cm / 2.54).toFixed(1);

    const topLabel = `Image: ${printW} CM / ${inConv(printW)} IN`;
    const leftLabel = `Image: ${printH} CM / ${inConv(printH)} IN`;
    const bottomLabel = matWidthCm > 0
      ? `Frame: ${frameOuterW.toFixed(1)} CM | Border: ${matWidthCm.toFixed(1)} CM`
      : `Frame: ${frameOuterW.toFixed(1)} CM / ${inConv(frameOuterW)} IN`;
    const rightLabel = `Frame: ${frameOuterH.toFixed(1)} CM / ${inConv(frameOuterH)} IN`;

    const gap = isMainWorkspace ? 24 : 22;
    const textGap = isMainWorkspace ? 18 : 12;
    const lineWidth = 1;
    const tickLength = isMainWorkspace ? 8 : 5;

    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
        {/* TOP: Print/Image Width */}
        <div style={{
          position: 'absolute',
          top: `-${gap}px`,
          left: `${isFramed ? printLeft_Pct : 0}%`,
          width: `${isFramed ? printW_Pct : 100}%`,
          height: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, left: 0, right: 0, top: 0, borderTopWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, left: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, right: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          <div style={{ ...labelStyle, left: '50%', top: 0, transform: `translate(-50%, -50%) translateY(-${textGap}px)` }}>
            {topLabel}
          </div>
        </div>

        {/* LEFT: Print/Image Height */}
        <div style={{
          position: 'absolute',
          left: `-${gap}px`,
          top: `${isFramed ? printTop_Pct : 0}%`,
          height: `${isFramed ? printH_Pct : 100}%`,
          width: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, top: 0, bottom: 0, left: 0, borderLeftWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, top: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, bottom: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          <div style={{ ...labelStyle, left: 0, top: '50%', transform: `translate(-50%, -50%) translateX(-${textGap}px) rotate(-90deg)` }}>
            {leftLabel}
          </div>
        </div>

        {/* BOTTOM: Frame Width + Border */}
        {isFramed && (
          <div style={{
            position: 'absolute',
            bottom: `-${gap}px`,
            left: 0,
            width: '100%',
            height: 0,
            pointerEvents: 'none',
            overflow: 'visible'
          }}>
            <div style={{ ...lineStyle, left: 0, right: 0, top: 0, borderTopWidth: `${lineWidth}px` }}></div>
            <div style={{ ...tickStyle, left: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
            <div style={{ ...tickStyle, right: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
            <div style={{ ...labelStyle, left: '50%', top: 0, transform: `translate(-50%, -50%) translateY(${textGap}px)` }}>
              {bottomLabel}
            </div>
          </div>
        )}

        {/* RIGHT: Frame Height */}
        {isFramed && (
          <div style={{
            position: 'absolute',
            right: `-${gap}px`,
            top: 0,
            height: '100%',
            width: 0,
            pointerEvents: 'none',
            overflow: 'visible'
          }}>
            <div style={{ ...lineStyle, top: 0, bottom: 0, left: 0, borderLeftWidth: `${lineWidth}px` }}></div>
            <div style={{ ...tickStyle, top: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
            <div style={{ ...tickStyle, bottom: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
            <div style={{ ...labelStyle, right: 0, top: '50%', transform: `translate(50%, -50%) translateX(${textGap}px) rotate(90deg)` }}>
              {rightLabel}
            </div>
          </div>
        )}
      </div>
    );
  };
    // Photo
  const originalPhoto = useMemo(() => {
    let photoOption = opts.photo || (opts.photos && opts.photos[0]);
    let url = '';
    if (photoOption) {
      if (typeof photoOption === 'string') {
        url = resolvePhotoUrl(photoOption);
      } else if (typeof photoOption === 'object') {
        url = resolvePhotoUrl(photoOption.url, photoOption.id);
      }
    }
    return url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop';
  }, [opts]);

  // States
  const [dbReview, setDbReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState([]);
  
  // Local Photos list state for Frame Arranger
  const [localPhotos, setLocalPhotos] = useState([]);
  const [cropState, setCropState] = useState({
    isOpen: false,
    slotIndex: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
    aspect: 1
  });

  const [annotations, setAnnotations] = useState([]);

  // Issues Checklist
  const [issues, setIssues] = useState({
    faceCropped: false,
    headCut: false,
    handCut: false,
    subjectOutsideFrame: false,
    wrongOrientation: false,
    lowResolution: false,
    blurryImage: false,
    pixelatedImage: false,
    wrongAspectRatio: false,
    whiteBorderVisible: false,
    frameCoversSubject: false,
    imageTooDark: false,
    imageTooBright: false,
    colorProblem: false,
    other: false
  });
  const [customIssueText, setCustomIssueText] = useState('');

  // Customer Message
  const [customerMessage, setCustomerMessage] = useState(
    `Hello ${order?.customer_name || 'Customer'},\n\nWhile reviewing your order, we noticed that the selected image may not produce the best print quality.\n\nThe highlighted area shows the issue.\n\nPlease review the suggested adjustment and either approve it or upload a better image.\n\nOnce approved, production will begin immediately.\n\nThank you!`
  );



  // Fetch artwork review status
  const fetchReviewDetails = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      // Fetch fresh order item to bypass caching delay
      const { data: itemData } = await supabase
        .from('printstore_order_items')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (itemData) {
        setFreshOrderItem(itemData);
      }

      const { data: reviewsData, error } = await supabase
        .from('printstore_artwork_reviews')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        setDbError(true);
      } else if (reviewsData && reviewsData.length > 0) {
        const data = reviewsData[0];
        setDbReview(data);
        setCustomerMessage(data.customer_message || customerMessage);
        
        // Parse issue_types if available
        if (data.issue_types) {
          const parsed = typeof data.issue_types === 'string' ? JSON.parse(data.issue_types) : data.issue_types;
          const newIssues = { ...issues };
          Object.keys(newIssues).forEach(k => {
            newIssues[k] = !!parsed[k];
          });
          setIssues(newIssues);
        }

        // Parse annotations
        if (data.annotation_json) {
          const parsed = typeof data.annotation_json === 'string' ? JSON.parse(data.annotation_json) : data.annotation_json;
          setAnnotations(parsed || []);
        }

        // Fetch revision history
        const { data: histData } = await supabase
          .from('printstore_artwork_review_history')
          .select('*')
          .eq('review_id', data.id)
          .order('revision_number', { ascending: false });
        if (histData) {
          setRevisionHistory(histData);
        }
      }
    } catch (e) {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewDetails();
  }, [orderId]);

  useEffect(() => {
    if (orderItem) {
      const opts = orderItem.options || {};
      let photosList = [];
      if (opts.photos && opts.photos.length > 0) {
        // Collage
        photosList = opts.photos.map((p, idx) => {
          let url = '';
          let id = '';
          let rotation = p.rotation || 0;
          let crop = p.crop || { x: 0, y: 0 };
          let zoom = p.zoom || 1;
          let editedPhotoUrl = p.editedPhotoUrl || '';
          
          if (typeof p === 'string') {
            url = p;
          } else if (typeof p === 'object') {
            url = p.url || '';
            id = p.id || '';
            rotation = p.rotation || 0;
            crop = p.crop || { x: 0, y: 0 };
            zoom = p.zoom || 1;
            editedPhotoUrl = p.editedPhotoUrl || '';
          }
          
          url = resolvePhotoUrl(url, id);
          
          return {
            url,
            editedPhotoUrl: editedPhotoUrl ? resolvePhotoUrl(editedPhotoUrl) : '',
            rotation,
            crop,
            zoom
          };
        });
      } else {
        // Single Photo
        let url = '';
        let id = '';
        let photoOption = opts.photo;
        if (photoOption) {
          if (typeof photoOption === 'string') {
            url = photoOption;
          } else if (typeof photoOption === 'object') {
            url = photoOption.url || '';
            id = photoOption.id || '';
          }
        }
        if (!url && opts.photos && opts.photos[0]) {
          const firstPhoto = opts.photos[0];
          url = typeof firstPhoto === 'string' ? firstPhoto : firstPhoto.url;
          id = typeof firstPhoto === 'object' ? firstPhoto.id : '';
        }
        
        url = resolvePhotoUrl(url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop', id);
        
        photosList = [{
          url,
          editedPhotoUrl: opts.editedPhotoUrl ? resolvePhotoUrl(opts.editedPhotoUrl) : '',
          rotation: opts.rotation || 0,
          crop: opts.crop || { x: 0, y: 0 },
          zoom: opts.zoom || 1
        }];
      }
      setLocalPhotos(photosList);
    }
  }, [orderItem]);



  const getAspectFromLabel = (label) => {
    if (!label) return 1.0;
    const match = label.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!match) return 1.0;
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    return w / h;
  };

  const getSlotAspect = (idx) => {
    const layoutType = opts.layout?.type || (opts.photos && opts.photos.length > 1 ? 'grid_2x2' : null);
    if (layoutType) {
      return isSlotLandscape(layoutType, idx) ? 1.5 : 1.0;
    }
    return getAspectFromLabel(printSize);
  };

  const openCropModal = (slotIndex) => {
    const photo = localPhotos[slotIndex];
    if (!photo) return;
    const aspect = getSlotAspect(slotIndex);
    setCropState({
      isOpen: true,
      slotIndex,
      crop: photo.crop || { x: 0, y: 0 },
      zoom: photo.zoom || 1,
      croppedAreaPixels: null,
      aspect
    });
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCropState(prev => ({ ...prev, croppedAreaPixels }));
  }, []);

  const handleSaveCrop = async () => {
    const { slotIndex, croppedAreaPixels } = cropState;
    if (!croppedAreaPixels || slotIndex === null) {
      setCropState(prev => ({ ...prev, isOpen: false }));
      return;
    }
    try {
      const originalUrl = localPhotos[slotIndex]?.url || '';
      const croppedImage = await getCroppedImg(
        originalUrl,
        croppedAreaPixels,
        localPhotos[slotIndex]?.rotation || 0
      );
      setLocalPhotos(prev => prev.map((p, idx) => {
        if (idx === slotIndex) {
          return {
            ...p,
            editedPhotoUrl: croppedImage,
            crop: cropState.crop,
            zoom: cropState.zoom
          };
        }
        return p;
      }));
      setCropState(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      console.error("Cropping failed:", e);
      setCropState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRotateSlot = (slotIndex) => {
    setLocalPhotos(prev => prev.map((p, idx) => {
      if (idx === slotIndex) {
        return {
          ...p,
          rotation: (p.rotation + 90) % 360
        };
      }
      return p;
    }));
  };

  const handleResetSlot = (slotIndex) => {
    setLocalPhotos(prev => prev.map((p, idx) => {
      if (idx === slotIndex) {
        return {
          ...p,
          editedPhotoUrl: '',
          rotation: 0,
          crop: { x: 0, y: 0 },
          zoom: 1
        };
      }
      return p;
    }));
  };

  const saveLocalPhotosToOrderItem = async () => {
    if (!orderItem) return;

    // Helper to upload a cropped blob URL to Cloudflare R2
    const uploadCroppedImage = async (blobUrl, idx) => {
      try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const file = new File([blob], `cropped_${Date.now()}.jpeg`, { type: 'image/jpeg' });
        const path = `orders/${order.id}/crops/cropped_${Date.now()}_${idx}.jpeg`;
        const uploadRes = await storageService.upload(path, file);
        return uploadRes?.path || '';
      } catch (e) {
        console.error("Failed to upload cropped image:", e);
        return blobUrl; // fallback to original blob url if upload fails
      }
    };

    // First, upload all blob URLs in localPhotos to R2
    const uploadedPhotos = await Promise.all(localPhotos.map(async (lp, idx) => {
      if (lp.editedPhotoUrl && lp.editedPhotoUrl.startsWith('blob:')) {
        const r2Path = await uploadCroppedImage(lp.editedPhotoUrl, idx);
        return { ...lp, editedPhotoUrl: r2Path };
      }
      return lp;
    }));

    const updatedOptions = { ...orderItem.options };
    if (updatedOptions.photos && updatedOptions.photos.length > 0) {
      updatedOptions.photos = updatedOptions.photos.map((p, idx) => {
        const local = uploadedPhotos[idx];
        if (!local) return p;
        if (typeof p === 'string') {
          return {
            url: p,
            editedPhotoUrl: local.editedPhotoUrl,
            rotation: local.rotation,
            crop: local.crop,
            zoom: local.zoom
          };
        } else {
          return {
            ...p,
            editedPhotoUrl: local.editedPhotoUrl,
            rotation: local.rotation,
            crop: local.crop,
            zoom: local.zoom
          };
        }
      });
    } else {
      const local = uploadedPhotos[0];
      if (local) {
        updatedOptions.editedPhotoUrl = local.editedPhotoUrl;
        updatedOptions.rotation = local.rotation;
        updatedOptions.crop = local.crop;
        updatedOptions.zoom = local.zoom;
        if (typeof updatedOptions.photo === 'object') {
          updatedOptions.photo = {
            ...updatedOptions.photo,
            editedPhotoUrl: local.editedPhotoUrl,
            rotation: local.rotation
          };
        } else {
          updatedOptions.photo = {
            url: updatedOptions.photo,
            editedPhotoUrl: local.editedPhotoUrl,
            rotation: local.rotation
          };
        }
      }
    }

    const { error: itemErr } = await supabase
      .from('printstore_order_items')
      .update({ options: updatedOptions })
      .eq('id', orderItem.id);
    
    if (itemErr) {
      console.error("Error updating order item options:", itemErr);
      throw itemErr;
    }

    return updatedOptions;
  };

  // Actions
  const handleApproveArtwork = async () => {
    if (!order) return;
    try {
      // Save local photo adjustments to order item
      await saveLocalPhotosToOrderItem();

      // Update order status directly to print queue (printing)
      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ status: 'printing' })
        .eq('id', order.id);
      
      if (orderErr) throw orderErr;

      // Save review row as approved
      if (!dbError) {
        const upsertPayload = {
          order_id: order.id,
          order_item_id: orderItem.id,
          review_status: 'Ready For Print',
          approved_by: 'MANUFACTURING OPERATOR',
          approved_at: new Date().toISOString()
        };
        if (dbReview?.id) {
          upsertPayload.id = dbReview.id;
        }
        await supabase.from('printstore_artwork_reviews').upsert(upsertPayload);
      }

      // Timeline log
      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'printing',
        label: 'Artwork Approved',
        description: 'Artwork checks passed pre-production review. Moved to Print Queue.'
      });

      await refreshOrders();
      alert('Artwork approved successfully! Order moved to Print Production.');
      navigate('/lab/artwork-review');
    } catch (e) {
      alert('Error approving artwork: ' + e.message);
    }
  };

  const handleRequestConfirmation = async () => {
    if (!order) return;
    try {
      // Save local photo adjustments to order item
      const updatedOpts = await saveLocalPhotosToOrderItem() || {};

      // Update order status to artwork_review
      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ status: 'artwork_review' })
        .eq('id', order.id);
      
      if (orderErr) throw orderErr;

      // Upsert artwork review record
      if (!dbError) {
        const rawPhotoUrl = opts.photo?.url || opts.photos?.[0]?.url || opts.photo;
        const rawSuggestedUrl = updatedOpts.editedPhotoUrl || 
                                (updatedOpts.photos?.[0]?.editedPhotoUrl) || 
                                (updatedOpts.photo?.editedPhotoUrl) || 
                                localPhotos[0]?.editedPhotoUrl || '';
        
        const upsertPayload = {
          order_id: order.id,
          order_item_id: orderItem.id,
          review_status: 'Waiting Customer',
          issue_types: issues,
          reviewer_notes: customIssueText || 'Artwork alignment review details pending.',
          customer_message: customerMessage,
          annotation_json: annotations,
          revision_number: dbReview ? (dbReview.revision_number + 1) : 1,
          reviewed_by: 'REVIEWER ARUN',
          reviewed_at: new Date().toISOString(),
          original_image: resolvePhotoUrl(typeof rawPhotoUrl === 'object' ? rawPhotoUrl.url : rawPhotoUrl),
          suggested_image: resolvePhotoUrl(rawSuggestedUrl)
        };
        const { data: revData, error: revErr } = await supabase
          .from('printstore_artwork_reviews')
          .upsert(upsertPayload)
          .select('id')
          .maybeSingle();
        if (revErr) throw revErr;

        const finalReviewId = dbReview?.id || revData?.id;
        if (finalReviewId) {
          try {
            await supabase.functions.invoke('send-artwork-suggestion', {
              body: { reviewId: finalReviewId, siteOrigin: window.location.origin }
            });
            console.log("Triggered send-artwork-suggestion edge function for review:", finalReviewId);
          } catch (mailErr) {
            console.warn("Could not invoke send-artwork-suggestion edge function:", mailErr);
          }
        }
      }

      // Add timeline log
      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'artwork_review',
        label: 'Customer Review Required',
        description: 'Artwork issues detected. Notification sent to customer for review and alignment.'
      });

      await refreshOrders();
      alert('Notification sent to customer! Status updated to Waiting Customer.');
      navigate('/lab/artwork-review');
    } catch (e) {
      alert('Error requesting confirmation: ' + e.message);
    }
  };

  const handleApproveNewPhoto = async () => {
    if (!order) return;
    try {
      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ status: 'printing' })
        .eq('id', order.id);
      if (orderErr) throw orderErr;

      const upsertPayload = {
        order_id: order.id,
        order_item_id: orderItem.id,
        review_status: 'Ready For Print',
        approved_by: 'MANUFACTURING OPERATOR',
        approved_at: new Date().toISOString()
      };
      if (dbReview?.id) {
        upsertPayload.id = dbReview.id;
      }
      const { error: revErr } = await supabase
        .from('printstore_artwork_reviews')
        .upsert(upsertPayload);
      if (revErr) throw revErr;

      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'printing',
        label: 'New Photo Approved',
        description: 'Manufacturing operator approved the customer-uploaded replacement image. Moved to Print Queue.'
      });

      await refreshOrders();
      alert('Replacement photo approved! Order moved to Print Queue.');
      navigate('/lab/artwork-review');
    } catch (e) {
      alert('Error approving photo: ' + e.message);
    }
  };

  const handleRejectNewPhoto = async () => {
    if (!order) return;
    const msg = prompt("Enter the reason for rejecting the replacement image:", "The replacement image still has cropping or quality issues. Please select another image.");
    if (msg === null) return;

    try {
      const upsertPayload = {
        order_id: order.id,
        order_item_id: orderItem.id,
        review_status: 'Waiting Customer',
        customer_message: msg,
        reviewed_by: 'REVIEWER ARUN',
        reviewed_at: new Date().toISOString()
      };
      if (dbReview?.id) {
        upsertPayload.id = dbReview.id;
      }
      const { error: revErr } = await supabase
        .from('printstore_artwork_reviews')
        .upsert(upsertPayload);
      if (revErr) throw revErr;

      const { error: orderErr } = await supabase
        .from('printstore_orders')
        .update({ status: 'artwork_review' })
        .eq('id', order.id);
      if (orderErr) throw orderErr;

      await supabase.from('printstore_order_tracking').insert({
        order_id: order.id,
        status: 'artwork_review',
        label: 'Replacement Image Rejected',
        description: `Replacement image rejected: ${msg}`
      });

      await refreshOrders();
      alert('Replacement photo rejected. Notification sent back to customer.');
      navigate('/lab/artwork-review');
    } catch (e) {
      alert('Error rejecting photo: ' + e.message);
    }
  };

  const handleSaveDraft = async () => {
    if (!order) return;
    try {
      // Save local photo adjustments to order item
      await saveLocalPhotosToOrderItem();

      if (!dbError) {
        const { error } = await supabase.from('printstore_artwork_reviews').upsert({
          order_id: order.id,
          order_item_id: orderItem.id,
          review_status: 'Pending Review',
          issue_types: issues,
          customer_message: customerMessage,
          annotation_json: annotations,
          reviewer_notes: customIssueText
        });
        if (error) throw error;
        alert('Draft review workspace saved successfully.');
      } else {
        alert('Operating in local state mode. Draft automatically stored in memory.');
      }
    } catch (e) {
      alert('Error saving draft: ' + e.message);
    }
  };

  const handleCancelReview = () => {
    navigate('/lab/artwork-review');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <div className="lab-spinner" />
      </div>
    );
  }

  if (!order || !orderItem) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <h3>Order details not found.</h3>
        <button onClick={() => navigate('/lab/artwork-review')} style={{ padding: '8px 16px', background: '#0f766e', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Back to Queue
        </button>
      </div>
    );
  }

  const getFrameColorValue = (name) => {
    if (!name) return '#222222';
    const lower = name.toLowerCase();
    if (lower.includes('black')) return '#111111';
    if (lower.includes('white')) return '#f7f7f7';
    if (lower.includes('walnut')) return '#4b321a';
    if (lower.includes('light wood') || lower.includes('oak')) return '#d2b48c';
    if (lower.includes('dark wood') || lower.includes('classic')) return '#8b5a2b';
    return '#222222';
  };

  const getGridTemplate = () => {
    const layoutType = opts.layout?.type || (opts.photos && opts.photos.length > 1 ? 'grid_2x2' : null);
    if (!layoutType) return {};
    let gridTemplate = '1fr / 1fr';
    switch (layoutType) {
      case 'grid_1x2_horizontal':
        gridTemplate = '1fr / repeat(2, 1fr)';
        break;
      case 'grid_2x1_vertical':
        gridTemplate = 'repeat(2, 1fr) / 1fr';
        break;
      case 'grid_2x2':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_3x3':
        gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)';
        break;
      case 'grid_2x3':
        gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
        break;
      case 'grid_3x2':
        gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_1top_2bottom':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_2top_1bottom':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_1left_2right':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_2left_1right':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_asymmetric_4':
        gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_1left_3right':
        gridTemplate = 'repeat(3, 1fr) / repeat(4, 1fr)';
        break;
      case 'grid_3top_1bottom':
        gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)';
        break;
      case 'grid_4x2':
        gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_5x2':
        gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_2x2_landscape':
        gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
        break;
      case 'grid_2x4':
        gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)';
        break;
      case 'grid_2x5':
        gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)';
        break;
    }
    return {
      display: 'grid',
      gridTemplateRows: gridTemplate.split(' / ')[0],
      gridTemplateColumns: gridTemplate.split(' / ')[1] || '1fr',
      gap: '8px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box'
    };
  };

  const getSlotCustomStyle = (index) => {
    const layoutType = opts.layout?.type || (opts.photos && opts.photos.length > 1 ? 'grid_2x2' : null);
    if (!layoutType) return {};
    switch (layoutType) {
      case 'grid_1top_2bottom':
        if (index === 0) return { gridColumn: 'span 2' };
        break;
      case 'grid_2top_1bottom':
        if (index === 2) return { gridColumn: 'span 2' };
        break;
      case 'grid_1left_2right':
        if (index === 0) return { gridRow: 'span 2' };
        break;
      case 'grid_2left_1right':
        if (index === 1) return { gridRow: 'span 2' };
        break;
      case 'grid_asymmetric_4':
        if (index === 0) return { gridRow: '1 / 3', gridColumn: '1' };
        if (index === 1) return { gridRow: '3 / 4', gridColumn: '1' };
        if (index === 2) return { gridRow: '1 / 2', gridColumn: '2' };
        if (index === 3) return { gridRow: '2 / 4', gridColumn: '2' };
        break;
      case 'grid_1left_3right':
        if (index === 0) return { gridRow: 'span 3', gridColumn: 'span 2' };
        break;
      case 'grid_3top_1bottom':
        if (index === 3) return { gridColumn: 'span 3' };
        break;
    }
    return {};
  };

  const renderSlots = (isSuggested = true, isInteractive = false) => {
    const layoutType = opts.layout?.type || (opts.photos && opts.photos.length > 1 ? 'grid_2x2' : null);
    if (layoutType) {
      return (
        <div style={getGridTemplate()}>
          {localPhotos.map((slot, index) => {
            const displayUrl = isSuggested ? (slot.editedPhotoUrl || slot.url) : slot.url;
            const displayRotation = isSuggested ? (slot.rotation || 0) : 0;
            return (
              <div 
                key={index}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  ...getSlotCustomStyle(index)
                }}
              >
                {displayUrl ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <img 
                      src={displayUrl} 
                      alt={`Slot ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: `rotate(${displayRotation}deg)`,
                        transition: 'transform 0.2s ease'
                      }}
                    />
                    
                    {/* Hover controls inside Arrange Mode */}
                    {isSuggested && isInteractive && (
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          cursor: 'default',
                          zIndex: 20
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                      >
                        <button
                          onClick={() => openCropModal(index)}
                          style={{
                            padding: '6px 10px',
                            background: '#0f766e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Crop size={12} /> Crop
                        </button>
                        <button
                          onClick={() => handleRotateSlot(index)}
                          style={{
                            padding: '6px 10px',
                            background: '#475569',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCw size={12} /> Rotate
                        </button>
                        {(slot.editedPhotoUrl || slot.rotation !== 0) && (
                          <button
                            onClick={() => handleResetSlot(index)}
                            style={{
                              padding: '6px 10px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} /> Reset
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Empty Slot</span>
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      // Single photo
      const slot = localPhotos[0];
      if (!slot) return null;
      const displayUrl = isSuggested ? (slot.editedPhotoUrl || slot.url) : slot.url;
      const displayRotation = isSuggested ? (slot.rotation || 0) : 0;
      
      if (isPrintPack) {
        return (
          <div 
            style={{ 
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              background: 'transparent'
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <img 
                key={i} 
                src={displayUrl || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"} 
                alt="" 
                style={{
                  width: '65%',
                  height: '65%',
                  objectFit: 'cover',
                  position: 'absolute',
                  border: '1px solid rgba(0,0,0,0.05)',
                  backgroundColor: '#ffffff',
                  boxShadow: i === 3 ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transform: i === 0 ? `rotate(${-8 + displayRotation}deg) translate(-12px, -8px)` :
                             i === 1 ? `rotate(${-3 + displayRotation}deg) translate(-4px, -4px)` :
                             i === 2 ? `rotate(${2 + displayRotation}deg) translate(4px, 2px)` :
                                       `rotate(${6 + displayRotation}deg) translate(12px, 8px)`,
                  zIndex: i + 1,
                  filter: i === 0 ? 'brightness(0.92)' :
                          i === 1 ? 'brightness(0.95)' :
                          i === 2 ? 'brightness(0.98)' : 'none'
                }}
              />
            ))}

            {/* Hover controls inside Arrange Mode */}
            {isSuggested && isInteractive && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  cursor: 'default',
                  zIndex: 20
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                <button
                  onClick={() => openCropModal(0)}
                  style={{
                    padding: '6px 10px',
                    background: '#0f766e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Crop size={12} /> Crop
                </button>
                <button
                  onClick={() => handleRotateSlot(0)}
                  style={{
                    padding: '6px 10px',
                    background: '#475569',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCw size={12} /> Rotate
                </button>
                {(slot.editedPhotoUrl || slot.rotation !== 0) && (
                  <button
                    onClick={() => handleResetSlot(0)}
                    style={{
                      padding: '6px 10px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} /> Reset
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={displayUrl} 
            alt="Product Artwork"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `rotate(${displayRotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />

          {/* Hover controls inside Arrange Mode */}
          {isSuggested && isInteractive && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: 0,
                transition: 'opacity 0.2s',
                cursor: 'default',
                zIndex: 20
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
            >
              <button
                onClick={() => openCropModal(0)}
                style={{
                  padding: '8px 14px',
                  background: '#0f766e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Crop size={14} /> Arrange Image
              </button>
              <button
                onClick={() => handleRotateSlot(0)}
                style={{
                  padding: '8px 14px',
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCw size={14} /> Rotate 90°
              </button>
              {(slot.editedPhotoUrl || slot.rotation !== 0) && (
                <button
                  onClick={() => handleResetSlot(0)}
                  style={{
                    padding: '8px 14px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={14} /> Reset
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
  };

  const isProcessed = dbReview?.review_status === 'Ready For Print' || 
                      dbReview?.review_status === 'Customer Approved' || 
                      dbReview?.review_status === 'Approved' ||
                      dbReview?.review_status === 'New Image Uploaded';
                      
  const isNewUpload = false;

  const renderSimpleFramedImage = (imgUrl, label, isNew = false) => {
    const resolvedUrl = resolvePhotoUrl(imgUrl);
    return (
      <div style={{ backgroundColor: '#f8fafc', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ 
          padding: '5px 12px', 
          backgroundColor: isNew ? '#0f766e' : 'rgba(15, 23, 42, 0.75)', 
          color: '#fff', 
          fontSize: '11px', 
          fontWeight: 'bold', 
          borderRadius: '6px', 
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: '32px',
          zIndex: 10
        }}>
          {label}
        </span>
        
        <div style={{ position: 'relative', width: `${comparisonDimensions.width}px`, height: `${comparisonDimensions.height}px`, marginTop: '24px' }}>
          {renderMeasurementScales(comparisonDimensions.width, comparisonDimensions.height, false)}
          
          <div style={{ 
            position: 'absolute',
            inset: 0,
            border: isNoFrame ? 'none' : `${comparisonFrameBorderWidth}px solid ${getFrameColorValue(frameColor)}`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden',
            backgroundColor: isNoFrame ? 'transparent' : '#fff'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              border: (isNoFrame || isNoMat) ? 'none' : `${comparisonMatBorderWidth}px solid #f8f6f0`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              <img src={resolvedUrl} alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transform: `rotate(${isNew ? (opts.rotation || 0) : 0}deg)`
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleComparison = () => {
    const leftTitle = "Original Upload";
    const rightTitle = isNewUpload ? "Customer Replacement" : "Approved Alignment";
    
    const leftImg = dbReview?.original_image || originalPhoto;
    const rightImg = isNewUpload 
      ? (opts.photo?.url || opts.photos?.[0]?.url || opts.photo)
      : (opts.editedPhotoUrl || opts.photo?.url || opts.photos?.[0]?.url || opts.photo);

    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', backgroundColor: '#fff', width: '100%' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isNewUpload ? "Compare Original vs Customer Replacement Photo" : "Artwork Review Approved & Closed"}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          {renderSimpleFramedImage(leftImg, leftTitle, false)}
          {renderSimpleFramedImage(rightImg, rightTitle, true)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Back button and page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button 
          onClick={handleCancelReview}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: '#64748b' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
            Artwork Review: {order?.customer_name}
          </h1>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Flag pre-press errors and suggest frame crop alignments before printing
          </span>
        </div>
      </div>

      {/* Main Grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left column - Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {(isProcessed || isNewUpload) ? (
            renderSimpleComparison()
          ) : (
            <>
              {/* Main Workspace Frame container */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fafafa', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            {/* Editing Work area containing Image */}
                <div style={{ position: 'relative', width: '560px', height: '420px', backgroundColor: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                  
                  {/* Outer frame styling simulation based on order specification */}
                  {/* Scale Wrapper without overflow hidden */}
                  <div style={{ position: 'relative', width: `${frameDimensions.width}px`, height: `${frameDimensions.height}px` }}>
                    {renderMeasurementScales(frameDimensions.width, frameDimensions.height, true)}
                    
                    {/* Outer frame styling simulation based on order specification */}
                    <div style={{ 
                      position: 'absolute', 
                      inset: 0,
                      border: isNoFrame ? 'none' : `${frameBorderWidth}px solid ${getFrameColorValue(frameColor)}`, 
                      boxShadow: isNoFrame ? 'none' : '0 10px 25px rgba(0,0,0,0.15)',
                      overflow: 'hidden',
                      backgroundColor: isNoFrame ? 'transparent' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}>
                      
                      {/* Simulated mat board border (2cm equivalent Mat) */}
                      <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%', 
                        border: (isNoFrame || isNoMat) ? 'none' : `${matBorderWidth}px solid #f8f6f0`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}>

                        {renderSlots(true, true)}

                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Comparison Original vs Suggested placement bottom panel */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
                  Compare Original vs Suggested placement
                </h3>
                
                {/* Split Comparison Side-by-Side Container */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  
                  {/* Left Side: Original Image */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ marginBottom: '44px', padding: '4px 10px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', zIndex: 10 }}>Original (Customer Upload)</span>
                    
                    {/* Scale Wrapper without overflow hidden */}
                    <div style={{ position: 'relative', width: `${comparisonDimensions.width}px`, height: `${comparisonDimensions.height}px` }}>
                      {renderMeasurementScales(comparisonDimensions.width, comparisonDimensions.height, false)}
                      
                      <div style={{ 
                        position: 'absolute',
                        inset: 0,
                        border: isNoFrame ? 'none' : `${comparisonFrameBorderWidth}px solid ${getFrameColorValue(frameColor)}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        overflow: 'hidden',
                        backgroundColor: isNoFrame ? 'transparent' : '#fff'
                      }}>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          border: (isNoFrame || isNoMat) ? 'none' : `${comparisonMatBorderWidth}px solid #f8f6f0`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {renderSlots(false, false)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Suggested Image */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ marginBottom: '44px', padding: '4px 10px', backgroundColor: '#0f766e', color: '#fff', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', zIndex: 10 }}>Suggested Alignment</span>
                    
                    {/* Scale Wrapper without overflow hidden */}
                    <div style={{ position: 'relative', width: `${comparisonDimensions.width}px`, height: `${comparisonDimensions.height}px` }}>
                      {renderMeasurementScales(comparisonDimensions.width, comparisonDimensions.height, false)}
                      
                      <div style={{ 
                        position: 'absolute',
                        inset: 0,
                        border: isNoFrame ? 'none' : `${comparisonFrameBorderWidth}px solid ${getFrameColorValue(frameColor)}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        overflow: 'hidden',
                        backgroundColor: isNoFrame ? 'transparent' : '#fff'
                      }}>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          border: (isNoFrame || isNoMat) ? 'none' : `${comparisonMatBorderWidth}px solid #f8f6f0`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {renderSlots(true, false)}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

        </div>

        {/* Right column - Sidebar form controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Order Details box */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
              Order Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order ID</span>
                <strong style={{ color: '#0f172a', fontFamily: 'Courier New, monospace' }}>
                  {getShortId(order.id, 'order')}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Customer</span>
                <strong style={{ color: '#0f172a' }}>{order.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Photographer</span>
                <strong style={{ color: '#0f172a' }}>{opts.photographer || 'Ramesh Studio'}</strong>
              </div>
              <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Product</span>
                <strong style={{ color: '#0f172a' }}>{orderItem.product_name || 'Framed Photo'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Size</span>
                <strong style={{ color: '#0f172a' }}>{printSize}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Frame Color</span>
                <strong style={{ color: '#0f172a' }}>{frameColor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Border Mat</span>
                <strong style={{ color: '#0f172a' }}>{borderSize}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Paper Type</span>
                <strong style={{ color: '#0f172a' }}>{(typeof opts.paperType === 'object' ? opts.paperType?.label : opts.paperType) || (typeof opts.paper === 'object' ? opts.paper?.label : opts.paper) || 'Glossy Photo Paper'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Glass Type</span>
                <strong style={{ color: '#0f172a' }}>{glassType}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Quantity</span>
                <strong style={{ color: '#0f172a' }}>{orderItem.quantity}</strong>
              </div>
            </div>
          </div>

          {isProcessed ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 'bold', fontSize: '13.5px' }}>
                <Check size={18} /> Artwork Review Approved
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                This order has been approved and moved to the print/manufacturing queue. No further actions are required from pre-press.
              </p>
              <button
                onClick={handleCancelReview}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  backgroundColor: '#0f766e', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  fontSize: '12.5px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer' 
                }}
              >
                Back to Review Queue
              </button>
            </div>
          ) : isNewUpload ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                Customer Replacement Received
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                The customer uploaded a replacement image. Review the alignment and quality of the new image on the right.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={handleApproveNewPhoto}
                  style={{ 
                    width: '100%', 
                    padding: '11px', 
                    backgroundColor: '#16a34a', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> Approve & Print
                </button>

                <button
                  onClick={handleRejectNewPhoto}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#ef4444', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '12.5px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  Reject & Re-request
                </button>

                <button
                  onClick={handleCancelReview}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#fff', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    color: '#475569', 
                    fontSize: '12.5px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Issue checkboxes checklist */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
                  Detected Issues (Check all that apply)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {[
                    { id: 'faceCropped', label: 'Face slightly cropped' },
                    { id: 'headCut', label: 'Subject too close to top (Head Cut)' },
                    { id: 'handCut', label: 'Hand / Arm Cut' },
                    { id: 'subjectOutsideFrame', label: 'Subject outside crop safe area' },
                    { id: 'wrongOrientation', label: 'Wrong orientation (Landscape vs Portrait)' },
                    { id: 'lowResolution', label: 'Low resolution details' },
                    { id: 'blurryImage', label: 'Blurry Image' },
                    { id: 'pixelatedImage', label: 'Pixelated Details' },
                    { id: 'wrongAspectRatio', label: 'Wrong Aspect Ratio' },
                    { id: 'whiteBorderVisible', label: 'White border outline visible' },
                    { id: 'frameCoversSubject', label: 'Frame covers details' },
                    { id: 'imageTooDark', label: 'Image too dark / Underexposed' },
                    { id: 'imageTooBright', label: 'Image too bright / Overexposed' },
                    { id: 'colorProblem', label: 'Color mismatch / Balance problem' },
                    { id: 'other', label: 'Other (Specify below)' }
                  ].map(issue => (
                    <label key={issue.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#334155', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={issues[issue.id]} 
                        onChange={(e) => setIssues(prev => ({ ...prev, [issue.id]: e.target.checked }))} 
                      />
                      {issue.label}
                    </label>
                  ))}
                </div>

                {issues.other && (
                  <textarea
                    placeholder="Specify the issue details..."
                    value={customIssueText}
                    onChange={(e) => setCustomIssueText(e.target.value)}
                    style={{ width: '100%', minHeight: '60px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11.5px', marginTop: '10px', padding: '6px', outline: 'none' }}
                  />
                )}
              </div>

              {/* Customer message Rich text editor panel */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
                  Message to Customer
                </h3>
                <textarea
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  style={{ width: '100%', minHeight: '160px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', padding: '10px', outline: 'none', lineHeight: '1.4' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={handleRequestConfirmation}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    backgroundColor: '#ea580c', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Mail size={16} /> Request Customer Confirmation
                </button>

                <button
                  onClick={handleSaveDraft}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#fff', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    color: '#475569', 
                    fontSize: '12.5px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  Save Draft Review
                </button>

                <button
                  onClick={handleCancelReview}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#fff', 
                    border: 'none', 
                    color: '#94a3b8', 
                    fontSize: '12.5px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  Cancel Review
                </button>
              </div>
            </>
          )}

        </div>

      </div>

      {/* react-easy-crop Image Arranger Modal Overlay */}
      {cropState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
          <div style={{
            width: '90%',
            maxWidth: '800px',
            height: '75%',
            maxHeight: '600px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Crop & Arrange Image Placement</h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Drag photo to position & use slider to zoom</span>
            </div>

            <div style={{
              position: 'relative',
              flex: 1,
              background: '#0f172a',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <Cropper
                image={localPhotos[cropState.slotIndex]?.url || ''}
                crop={cropState.crop}
                zoom={cropState.zoom}
                aspect={cropState.aspect}
                onCropChange={(crop) => setCropState(prev => ({ ...prev, crop }))}
                onZoomChange={(zoom) => setCropState(prev => ({ ...prev, zoom }))}
                onCropComplete={onCropComplete}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#f8fafc', padding: '8px 0' }}>
              <button 
                onClick={() => setCropState(prev => ({ ...prev, zoom: Math.max(1, prev.zoom - 0.1) }))}
                style={{ background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '20px', padding: '0 8px', display: 'flex', alignItems: 'center' }}
              >
                -
              </button>
              <input 
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={cropState.zoom}
                onChange={(e) => setCropState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                style={{ flex: 1, accentColor: '#0f766e', cursor: 'pointer', height: '6px', borderRadius: '3px' }}
              />
              <button 
                onClick={() => setCropState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
                style={{ background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '20px', padding: '0 8px', display: 'flex', alignItems: 'center' }}
              >
                +
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setCropState(prev => ({ ...prev, isOpen: false }))}
                style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', borderRadius: '6px', border: '1px solid #475569', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCrop}
                style={{ padding: '8px 20px', background: '#0f766e', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                Save Placement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
