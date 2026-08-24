import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, AlertCircle, Monitor, Cloud, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import {
  downloadPhotosToZip,
  downloadSinglePhotoFile,
  generateZipBlob,
  resolveDownloadConcurrency,
} from '@/lib/downloadPhoto';
import { galleryService } from '@/services/gallery.service';
import { knownGalleryVisitorEmail } from '@/lib/galleryEmailRegistration';
import {
  isGoogleDriveConfigured,
  getGoogleDriveSetupMessage,
  isGoogleDriveSignInRestrictedError,
  saveGalleryToGoogleDrive,
} from '@/lib/googleDriveUpload';
import { getPhotoVideoSrc, isVideoMedia } from '@/lib/photoDisplayUrl';
import './DownloadModal.css';

const LARGE_ZIP_BYTES = 4 * 1024 ** 3;

function formatByteSize(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return null;
  const gb = n / 1024 ** 3;
  if (gb >= 0.95) return `${gb.toFixed(1)} GB`;
  const mb = n / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = n / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

function photoByteSize(photo, resolution = 'full') {
  const raw = Number(photo?.size_bytes) || 0;
  if (raw > 0) {
    if (resolution === 'web') return Math.max(1, Math.round(raw * 0.12));
    return raw;
  }
  const w = Number(photo?.width) || 4000;
  const h = Number(photo?.height) || 3000;
  const px = w * h;
  if (resolution === 'web') return Math.round(Math.min(px * 0.12, 450_000));
  if (resolution === 'original') return Math.round(px * 0.5);
  return Math.round(px * 0.28);
}

function statsForPhotos(list, { includeFilesLabel = false, resolution = 'full' } = {}) {
  const count = list.length;
  const bytes = list.reduce((sum, photo) => sum + photoByteSize(photo, resolution), 0);
  const sizeLabel = formatByteSize(bytes);
  const countLabel = count.toLocaleString();
  return {
    count,
    bytes,
    meta: sizeLabel
      ? `${countLabel}${includeFilesLabel ? (count === 1 ? ' file' : ' files') : ''} · ${sizeLabel}`
      : `${countLabel}${includeFilesLabel ? (count === 1 ? ' file' : ' files') : ''} · 0 KB`,
  };
}

function englishCount(n) {
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  ];
  return words[n] || String(n);
}

function viewingSetKey(initialSetId, initialPhoto) {
  if (initialPhoto) {
    return initialPhoto.set_id ? String(initialPhoto.set_id) : 'highlights';
  }
  if (!initialSetId || initialSetId === 'all') return 'highlights';
  if (initialSetId === 'highlights') return 'highlights';
  return String(initialSetId);
}

function buildInitialCheckedSets({
  initialSetId,
  initialPhoto,
  downloadableNamedSets,
  highlightsDownloadAllowed,
  allowedHighlightsCount,
}) {
  const checked = new Set();
  const preferred = viewingSetKey(initialSetId, initialPhoto);

  if (preferred === 'highlights') {
    if (highlightsDownloadAllowed && allowedHighlightsCount > 0) checked.add('highlights');
  } else if (downloadableNamedSets.some((set) => String(set.id) === preferred)) {
    checked.add(preferred);
  }

  if (checked.size === 0) {
    if (downloadableNamedSets.length > 0) {
      checked.add(String(downloadableNamedSets[0].id));
    } else if (highlightsDownloadAllowed && allowedHighlightsCount > 0) {
      checked.add('highlights');
    }
  }
  return checked;
}

/** Empty/null = all sets allowed. Legacy `['Highlights']` with named sets = all (old default omitted new sets). */
function resolveDownloadSetAllowlist(selectedDownloadSets, namedSets = []) {
  if (!selectedDownloadSets?.length) return null;
  const hasNamedSets = namedSets.some((s) => s.name?.toLowerCase() !== 'highlights');
  const isLegacyHighlightsOnly =
    selectedDownloadSets.length === 1 &&
    String(selectedDownloadSets[0]).toLowerCase() === 'highlights' &&
    hasNamedSets;
  if (isLegacyHighlightsOnly) return null;
  return selectedDownloadSets;
}

function isDownloadSetAllowed(allowlist, key) {
  if (!allowlist) return true;
  const k = String(key).toLowerCase().trim();
  return allowlist.some((item) => {
    const it = String(item).toLowerCase().trim();
    if (it === k) return true;
    if ((it === 'ben' && k === 'benn') || (it === 'benn' && k === 'ben')) return true;
    return false;
  });
}

function isPhotoInAllowedDownloadSet(photo, allowlist, sets = [], highlightsName = 'Highlights') {
  if (!allowlist) return true;
  if (!photo?.set_id) {
    return isDownloadSetAllowed(allowlist, 'Highlights') || isDownloadSetAllowed(allowlist, highlightsName);
  }
  const matchedSet = sets.find((set) => String(set.id) === String(photo.set_id));
  return (
    isDownloadSetAllowed(allowlist, photo.set_id) ||
    isDownloadSetAllowed(allowlist, matchedSet?.name)
  );
}

function collectionHasDownloadPin(collection) {
  const pin = collection?.download_pin ?? collection?.download_pin_hash ?? collection?.pin_value ?? collection?.pinValue;
  return pin != null && String(pin).trim().length > 0;
}

function preparingStatusText(done, total, phase = 'download') {
  if (total <= 1) {
    if (phase === 'save') return 'Saving your photo…';
    if (phase === 'zip') return 'Almost done…';
    return 'Downloading your photo…';
  }
  if (phase === 'zip') return `Packaging ${total} photos into one file…`;
  if (phase === 'upload') return `Uploading ${done} of ${total} photos to Google Drive…`;
  if (phase === 'save') return 'Saving to your device…';
  if (done >= total) return 'Finishing up…';
  return `Downloading ${done} of ${total} photos…`;
}

export const DownloadModal = ({
  isOpen,
  onClose,
  collection,
  photos = [],
  sets = [],
  initialPhoto = null,
  watermarkOptions = null,
  initialSetId = 'all',
  visitorEmail = '',
  onOpenMedia,
}) => {
  const [step, setStep] = useState('auth'); // auth -> selection -> preparing -> complete
  const [email, setEmail] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [whatScope, setWhatScope] = useState(() => (initialPhoto ? 'single' : 'sets'));
  const [checkedSetKeys, setCheckedSetKeys] = useState(() => new Set());
  // Resolution choice for photographs (films use `video_download_resolution` on the delivery; not selectable here yet).
  const offeredPhotoResolutions = useMemo(() => {
    const raw = collection?.download_resolutions;
    if (!Array.isArray(raw) || raw.length === 0) return ['web', 'full'];
    const mapped = raw
      .map((s) => (s === 'high' ? 'full' : s))
      .filter((s) => s === 'web' || s === 'full' || s === 'original');
    const unique = Array.from(new Set(mapped.length ? mapped : ['web', 'full']));
    if (!unique.includes('web')) unique.unshift('web');
    if (!unique.includes('full')) unique.splice(unique.includes('web') ? 1 : 0, 0, 'full');
    return unique;
  }, [collection?.download_resolutions]);
  const [resolutionChoice, setResolutionChoice] = useState('full'); // web | full | original
  const [downloadDestination, setDownloadDestination] = useState('local'); // local | google_drive
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const [error, setError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const downloadRunIdRef = useRef(0);
  const completedCountRef = useRef(0);
  const googleLocalFallbackRef = useRef(false);
  const [downloadCompleteMeta, setDownloadCompleteMeta] = useState({
    isZip: false,
    total: 0,
    destination: 'local',
    driveFileUrl: null,
    downloadToken: null,
    visitorEmail: '',
  });
  /** True while Google OAuth popup is open — hide % progress until sign-in finishes */
  const [googleSignInPending, setGoogleSignInPending] = useState(false);

  const googleDriveAvailable = isGoogleDriveConfigured();

  const pin = pinDigits.join('');

  /** Never decrease % — parallel fetches used to race on a shared counter and flash lower values. */
  const setProgressMonotonic = (nextPct) => {
    const clamped = Math.min(100, Math.max(0, Math.round(nextPct)));
    setProgress((prev) => Math.max(prev, clamped));
  };

  const prevIsOpen = useRef(false);

  const downloadSetAllowlist = useMemo(
    () => resolveDownloadSetAllowlist(collection?.selected_download_sets, sets),
    [collection?.selected_download_sets, sets]
  );

  const highlightsDownloadAllowed = isDownloadSetAllowed(downloadSetAllowlist, 'Highlights');

  const downloadableNamedSets = useMemo(
    () =>
      sets
        .filter((s) => s.name?.toLowerCase() !== 'highlights')
        .filter(
          (s) =>
            isDownloadSetAllowed(downloadSetAllowlist, s.name) ||
            isDownloadSetAllowed(downloadSetAllowlist, s.id)
        ),
    [sets, downloadSetAllowlist]
  );
  const allowedPhotos = useMemo(
    () =>
      photos.filter((photo) =>
        isPhotoInAllowedDownloadSet(photo, downloadSetAllowlist, sets, collection?.highlights_name || 'Highlights')
      ),
    [photos, downloadSetAllowlist, sets, collection?.highlights_name]
  );
  const allowedHighlightsCount = useMemo(
    () => allowedPhotos.filter((p) => !p.set_id).length,
    [allowedPhotos]
  );

  const setRows = useMemo(() => {
    const rows = [];
    const highlightsName = collection?.highlights_name || 'Highlights';
    if (allowedHighlightsCount > 0 && highlightsDownloadAllowed) {
      const setPhotos = allowedPhotos.filter((p) => !p.set_id);
      rows.push({
        key: 'highlights',
        name: highlightsName,
        ...statsForPhotos(setPhotos, { resolution: resolutionChoice }),
      });
    }
    for (const set of downloadableNamedSets) {
      const setPhotos = allowedPhotos.filter((p) => String(p.set_id) === String(set.id));
      rows.push({
        key: String(set.id),
        name: set.name,
        ...statsForPhotos(setPhotos, { resolution: resolutionChoice }),
      });
    }
    return rows;
  }, [
    allowedPhotos,
    downloadableNamedSets,
    allowedHighlightsCount,
    highlightsDownloadAllowed,
    collection?.highlights_name,
    resolutionChoice,
  ]);

  const currentViewKey = viewingSetKey(initialSetId, initialPhoto);

  const viewingSetPhotos = useMemo(() => {
    if (currentViewKey === 'highlights') return allowedPhotos.filter((p) => !p.set_id);
    return allowedPhotos.filter((p) => String(p.set_id) === currentViewKey);
  }, [allowedPhotos, currentViewKey]);

  const viewingSetName =
    currentViewKey === 'highlights'
      ? collection?.highlights_name || 'Highlights'
      : downloadableNamedSets.find((set) => String(set.id) === currentViewKey)?.name || 'This set';

  const thisPhotographPhotos = useMemo(() => {
    if (initialPhoto) {
      return isPhotoInAllowedDownloadSet(
        initialPhoto,
        downloadSetAllowlist,
        sets,
        collection?.highlights_name || 'Highlights'
      )
        ? [initialPhoto]
        : [];
    }
    return viewingSetPhotos;
  }, [
    initialPhoto,
    viewingSetPhotos,
    downloadSetAllowlist,
    sets,
    collection?.highlights_name,
  ]);

  const resolvedSelectionPhotos = useMemo(() => {
    if (whatScope === 'single') return thisPhotographPhotos;
    if (whatScope === 'all') return allowedPhotos;
    return allowedPhotos.filter((p) => {
      if (!p.set_id) return checkedSetKeys.has('highlights');
      return checkedSetKeys.has(String(p.set_id));
    });
  }, [whatScope, thisPhotographPhotos, allowedPhotos, checkedSetKeys]);

  const singleMedia = thisPhotographPhotos[0] || null;
  const isSingleVideo = Boolean(singleMedia && isVideoMedia(singleMedia));

  const handleOpenSingleVideo = () => {
    if (!singleMedia) return;
    if (typeof onOpenMedia === 'function') {
      onOpenMedia(singleMedia);
      onClose();
      return;
    }
    const src = getPhotoVideoSrc(singleMedia);
    if (src) window.open(src, '_blank', 'noopener,noreferrer');
  };

  const selectionSummary = useMemo(
    () => statsForPhotos(resolvedSelectionPhotos, { includeFilesLabel: true, resolution: resolutionChoice }),
    [resolvedSelectionPhotos, resolutionChoice]
  );

  const folderPreviewNames = useMemo(() => {
    if (whatScope === 'all') return setRows.map((row) => row.name);
    if (whatScope === 'sets') {
      return setRows.filter((row) => checkedSetKeys.has(row.key)).map((row) => row.name);
    }
    return [];
  }, [whatScope, setRows, checkedSetKeys]);

  useEffect(() => {
    if (isOpen && collection) {
      const knownEmail = knownGalleryVisitorEmail(collection?.id, visitorEmail);
      const needsEmailField =
        (!!collection?.email_capture_enabled || !!collection?.restrict_to_emails) && !knownEmail;
      const isSingle = !!initialPhoto;
      const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
      const hasPin = collectionHasDownloadPin(collection);
      const needsPin = hasPin && (!isSingle || pinRequiredForSingle);
      const hasPinUsageLimit = !!(needsPin && collection?.pin_usage_limit);

      if (prevIsOpen.current === false) {
        googleLocalFallbackRef.current = false;
        setError('');
        setProgress(0);
        setIsProcessing(false);
        setPinDigits(['', '', '', '']);
        setEmail(knownEmail);
        setWhatScope(initialPhoto ? 'single' : 'sets');
        setCheckedSetKeys(
          buildInitialCheckedSets({
            initialSetId,
            initialPhoto,
            downloadableNamedSets,
            highlightsDownloadAllowed,
            allowedHighlightsCount,
          })
        );
        setResolutionChoice(offeredPhotoResolutions.includes('full') ? 'full' : offeredPhotoResolutions[0] || 'full');
        setDownloadDestination('local');

        if (needsEmailField || needsPin || hasPinUsageLimit) {
          setStep('auth');
        } else {
          setStep('selection');
        }
      }
    }
    prevIsOpen.current = isOpen;
  }, [
    isOpen,
    collection,
    initialPhoto,
    initialSetId,
    downloadableNamedSets,
    highlightsDownloadAllowed,
    allowedHighlightsCount,
    offeredPhotoResolutions,
    visitorEmail,
  ]);

  const toggleSetKey = (key) => {
    setCheckedSetKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const destinationHint =
    downloadDestination === 'google_drive'
      ? 'Prepared, then saved to Google Drive'
      : 'Prepared, then downloaded to this device';

  const localWhereDesc =
    whatScope === 'all' && selectionSummary.bytes >= LARGE_ZIP_BYTES
      ? `${formatByteSize(selectionSummary.bytes)} as one zip — most browsers will struggle`
      : 'Downloads as a zip';

  const everythingHint =
    setRows.length === 1
      ? 'This set, every photograph in the delivery.'
      : `All ${englishCount(setRows.length)} sets, every photograph in the delivery.`;

  const setFolderName = (photo) => {
    if (!photo?.set_id) return collection?.highlights_name || 'Highlights';
    return sets.find((set) => String(set.id) === String(photo.set_id))?.name || 'Set';
  };

  const handlePinInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value.slice(-1);
    setPinDigits(newDigits);
    setError('');
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') handleAuth();
  };

  const handleAuth = async () => {
    const knownEmail = knownGalleryVisitorEmail(collection?.id, visitorEmail || email);
    const resolvedEmail = (email.trim() || knownEmail).trim();

    if ((collection?.email_capture_enabled || collection?.restrict_to_emails) && !resolvedEmail.includes('@')) {
      setError('Please enter your email address.');
      return;
    }

    const validPin = collection?.download_pin ?? collection?.download_pin_hash ?? collection?.pin_value ?? collection?.pinValue;
    const needsPin = collectionHasDownloadPin(collection);

    if (needsPin && pin !== String(validPin ?? '').trim()) {
      setError('Incorrect PIN. Please check with your photographer.');
      setPinDigits(['', '', '', '']);
      setTimeout(() => pinRefs[0].current?.focus(), 50);
      return;
    }

    // Check email restriction
    if (collection?.restrict_to_emails) {
      const allowedEmails = collection.restrict_to_emails.split(',').map(e => e.trim().toLowerCase());
      if (!allowedEmails.includes(resolvedEmail.toLowerCase())) {
        setError('Your email is not authorized to download this delivery.');
        return;
      }
    }

    setIsProcessing(true);
    setError('');
    if (resolvedEmail && resolvedEmail !== email) setEmail(resolvedEmail);

    try {
      // ── Check PIN Usage Limit ─────────────────────────────
      if (needsPin && collection?.pin_usage_limit) {
        const pinUseCount = await galleryService.getPinUsageCount(collection.id);
        if (pinUseCount >= collection.pin_usage_limit) {
          setError(`PIN usage limit reached. This PIN can only be used ${collection.pin_usage_limit} time${collection.pin_usage_limit !== 1 ? 's' : ''}.`);
          setIsProcessing(false);
          return;
        }
        // Log successful PIN use
        await galleryService.logActivity(collection.id, 'password_attempt', {
          email: resolvedEmail,
          photographerId: collection.user_id,
          metadata: { success: true, type: 'download_pin' }
        });
      }

      // ── Check Download Limit ──────────────────────────────
      if (collection?.download_limit_gallery) {
        const downloadCount = await galleryService.getDownloadCount(collection.id);
        if (downloadCount >= collection.download_limit_gallery) {
          setError(`Download limit reached. This delivery can only be downloaded ${collection.download_limit_gallery} time${collection.download_limit_gallery !== 1 ? 's' : ''}.`);
          setIsProcessing(false);
          return;
        }
      }

      // All checks passed
      setIsProcessing(false);
      proceedToNextStep();
    } catch (err) {
      console.error('Error during auth checks:', err);
      setIsProcessing(false);
      setError('Verification failed. Please try again.');
    }
  };

  const proceedToNextStep = () => {
    setError('');
    setStep('selection');
  };

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState('');

  useEffect(() => {
    if (email && !paymentEmail) {
      setPaymentEmail(email);
    }
  }, [email]);

  const handleStartDownloadClick = () => {
    if (collection?.digital_download_enabled === true) {
      // Check if already paid
      const isSingle = whatScope === 'single';
      const paidAll = localStorage.getItem(`pixnxt_digital_paid_${collection.id}_all`) === 'true';
      const paidSingle = isSingle && localStorage.getItem(`pixnxt_digital_paid_${collection.id}_single_${initialPhoto?.id}`) === 'true';
      
      if (!paidAll && !paidSingle) {
        setError('');
        setStep('payment');
        return;
      }
    }
    
    startDownload();
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsPaying(true);
    
    try {
      const targetEmail = paymentEmail || email;
      if (!targetEmail) {
        throw new Error('Please enter your email address for delivery confirmation.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isSingle = whatScope === 'single';
      const price = isSingle 
        ? (collection.digital_download_price_single || 40)
        : (collection.digital_download_price_all || 199);
      
      const { data: order, error: orderError } = await supabase
        .from('printstore_orders')
        .insert({
          collection_id: collection.id,
          photographer_id: collection.photographer_id || collection.user_id,
          customer_name: cardName || 'Client Visitor',
          customer_email: targetEmail,
          shipping_address: null,
          shipping_amount: 0,
          tax_amount: 0,
          discount_amount: 0,
          subtotal: price,
          total: price,
          status: 'completed',
          payment_provider: 'stripe',
          payment_intent_id: 'mock_pi_digital_' + Math.random().toString(36).substr(2, 9)
        })
        .select()
        .single();
        
      if (orderError) throw orderError;
      
      const { error: itemError } = await supabase
        .from('printstore_order_items')
        .insert({
          order_id: order.id,
          product_name: isSingle ? 'Digital Download - Single Photo' : 'Digital Download - All Photos',
          product_type: isSingle ? 'digital_download' : 'digital_download_all',
          quantity: 1,
          unit_price: price,
          subtotal: price,
          options: {
            photo: isSingle ? initialPhoto : null
          }
        });
        
      if (itemError) throw itemError;
      
      if (isSingle) {
        localStorage.setItem(`pixnxt_digital_paid_${collection.id}_single_${initialPhoto?.id}`, 'true');
      } else {
        localStorage.setItem(`pixnxt_digital_paid_${collection.id}_all`, 'true');
      }
      
      try {
        await fetch(`${supabase.supabaseUrl}/functions/v1/send-order-placed-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({
            orderId: order.id,
            recipientEmail: targetEmail,
            siteOrigin: window.location.origin
          })
        });
      } catch (emailErr) {
        console.warn('Could not trigger order placing email:', emailErr);
      }
      
      setIsPaying(false);
      startDownload();
    } catch (err) {
      console.error('Mock payment error:', err);
      setIsPaying(false);
      setError(err.message || 'Payment failed. Please check your card details.');
    }
  };

  const startDownload = async (options = {}) => {
    const runId = options.preserveRunId ?? ++downloadRunIdRef.current;
    const effectiveDestination = options.forceLocal ? 'local' : downloadDestination;
    if (!options.preserveRunId) {
      completedCountRef.current = 0;
      setIsProcessing(true);
      setStep('preparing');
      setProgress(0);
      setGoogleSignInPending(false);
    }
    setDownloadCompleteMeta({
      isZip: false,
      total: 0,
      destination: effectiveDestination,
      driveFileUrl: null,
    });
    setStatusText('Gathering photos...');

    const isStale = () => runId !== downloadRunIdRef.current;

    try {
      if (collection?.download_limit_gallery) {
        const downloadCount = await galleryService.getDownloadCount(collection.id);
        if (downloadCount >= collection.download_limit_gallery) {
          throw new Error(
            `Download limit reached. This delivery can only be downloaded ${collection.download_limit_gallery} time${collection.download_limit_gallery !== 1 ? 's' : ''}.`
          );
        }
      }
      const zip = new JSZip();
      let photosToDownload = resolvedSelectionPhotos.filter(Boolean);

      // Films can be configured as watch-only. If so, remove them from the downloadable set.
      const videoAllowed = collection?.video_downloads_enabled !== false;
      if (!videoAllowed) {
        if (initialPhoto?.media_type === 'video') {
          throw new Error('This film is watch-only for this delivery.');
        }
        photosToDownload = photosToDownload.filter((p) => p?.media_type !== 'video');
      }

      if (photosToDownload.length === 0) {
        throw new Error('This set is not available for download.');
      }

      const setName =
        whatScope === 'single'
          ? initialPhoto
            ? 'Single Photo'
            : viewingSetName
          : whatScope === 'all'
            ? 'All Photos'
            : folderPreviewNames.join(', ') || 'Selected sets';

      const isVideo = whatScope === 'single' && photosToDownload.length === 1 && photosToDownload[0]?.media_type === 'video';
      const itemType = isVideo ? 'video' : (photosToDownload.length === 1 && !initialPhoto ? 'item' : (photosToDownload.length === 1 ? 'photo' : 'items'));
      
      setStatusText(`Downloading ${photosToDownload.length} ${photosToDownload.length === 1 ? (isVideo ? 'video' : 'photo') : 'items'} from ${setName}...`);

      let downloadSize = null;

      const total = photosToDownload.length;
      const reportDownloadProgress = (phase = 'download') => {
        if (isStale()) return;
        const done = completedCountRef.current;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        setProgressMonotonic(pct);
        setStatusText(preparingStatusText(done, total, phase));
      };

      if (effectiveDestination === 'google_drive') {
        if (!googleDriveAvailable) {
          throw new Error(getGoogleDriveSetupMessage());
        }

        setGoogleSignInPending(true);
        setProgress(0);
        setStatusText(
          'Sign in with Google in the popup window. Anyone can download using “Local” without signing in.'
        );

        const driveResult = await saveGalleryToGoogleDrive(photosToDownload, {
          collectionName: collection.name || 'gallery',
          concurrency: resolveDownloadConcurrency(photosToDownload.length),
          isStale,
          onAuthStart: () => {
            if (!isStale()) {
              setGoogleSignInPending(true);
              setProgress(0);
              setStatusText(
                'Waiting for Google sign-in… Complete the popup, then choose your account.'
              );
            }
          },
          onAuthComplete: () => {
            if (!isStale()) {
              setGoogleSignInPending(false);
              setProgress(0);
              completedCountRef.current = 0;
              setStatusText(`Preparing ${total} photos for Google Drive…`);
            }
          },
          onUploadPhase: (message) => {
            if (!isStale()) setStatusText(message);
          },
          onProgress: (done) => {
            completedCountRef.current = done;
            reportDownloadProgress('upload');
          },
        });

        setGoogleSignInPending(false);

        if (isStale()) return;

        setProgressMonotonic(100);
        setStatusText('Saved to Google Drive');
        const openUrl = driveResult.folderUrl || driveResult.webViewLink;
        if (driveResult.photoCount < photosToDownload.length) {
          throw new Error(
            `Only ${driveResult.photoCount} of ${photosToDownload.length} photos were uploaded. Some files could not be fetched from storage. Try again in a few minutes.`
          );
        }

        setDownloadCompleteMeta({
          isZip: driveResult.isZip,
          total: driveResult.photoCount,
          destination: 'google_drive',
          driveFileUrl: openUrl,
        });

        window.open(openUrl, '_blank', 'noopener,noreferrer');
      } else if (total === 1) {
        const photo = photosToDownload[0];
        setProgressMonotonic(50);
        setStatusText(preparingStatusText(0, 1));
        await downloadSinglePhotoFile(photo, {
          resolution: resolutionChoice,
          videoResolution: collection?.video_download_resolution,
          watermarkOptions,
        });
        if (isStale()) return;
        setProgressMonotonic(100);
        setStatusText(preparingStatusText(1, 1, 'save'));
        setDownloadCompleteMeta({ isZip: false, total: 1, destination: 'local', driveFileUrl: null });
      } else {
        const zipResult = await downloadPhotosToZip(zip, photosToDownload, {
          concurrency: resolveDownloadConcurrency(photosToDownload.length),
          resolution: resolutionChoice,
          videoResolution: collection?.video_download_resolution,
          isStale,
          watermarkOptions,
          getZipFolder: whatScope === 'single' && photosToDownload.length <= 1 ? undefined : setFolderName,
          onProgress: (done) => {
            completedCountRef.current = done;
            reportDownloadProgress();
          },
        });

        if (isStale()) return;

        if (zipResult.fileCount === 0) {
          throw new Error(
            'Could not download any photos. They may still be processing — try again in a moment.'
          );
        }

        if (zipResult.failed > 0) {
          throw new Error(
            `Only ${zipResult.fileCount} of ${zipResult.requested} photos could be downloaded. Some files may still be processing. Wait a few minutes and try again.`
          );
        }

        const savedCount = zipResult.fileCount;
        setProgressMonotonic(100);
        setStatusText(preparingStatusText(savedCount, savedCount, 'zip'));
        setProgressMonotonic(90);
        const zipBlob = await generateZipBlob(zip, (zipPct) => {
          if (isStale()) return;
          const pct = Math.min(99, 90 + Math.round((zipPct / 100) * 9));
          setProgressMonotonic(pct);
          setStatusText(preparingStatusText(savedCount, savedCount, 'zip'));
        });
        const zipFilename = `${(collection.name || 'gallery').replace(/[/\\:*?"<>|]/g, '_')}.zip`;
        downloadSize = zipBlob.size;

        if (isStale()) return;

        setProgressMonotonic(99);
        setStatusText(preparingStatusText(savedCount, savedCount, 'save'));
        saveAs(zipBlob, zipFilename);
        setProgressMonotonic(100);
        setDownloadCompleteMeta({
          isZip: true,
          total: savedCount,
          destination: 'local',
          driveFileUrl: null,
        });
      }

      if (isStale()) return;

      const loggedPhoto = total === 1 ? photosToDownload[0] : initialPhoto;
      try {
        await galleryService.logActivity(collection.id, 'download', {
          email: (email.trim() || knownGalleryVisitorEmail(collection?.id, visitorEmail) || 'Visitor'),
          photographerId: collection.user_id || collection.photographer_id,
          photoId: loggedPhoto?.id,
          resolution: 'original',
          metadata: {
            type:
              total === 1
                ? loggedPhoto?.media_type === 'video'
                  ? 'video'
                  : 'photo'
                : 'gallery',
            resolution: 'Original',
            quality: 'Original',
            destination: effectiveDestination,
            source:
              effectiveDestination === 'google_drive'
                ? 'Google Drive'
                : total === 1
                  ? 'Social / Gallery'
                  : 'Gallery Download',
            pinUsed: !!(collection?.download_pin && pin.length > 0),
            pin: pin.length > 0 ? pin : null,
            size: downloadSize,
            photoCount: photosToDownload.length,
            filename: loggedPhoto?.filename || null,
            setName:
              whatScope === 'all'
                ? 'All Photos'
                : whatScope === 'single'
                  ? sets.find((s) => s.id === initialPhoto?.set_id)?.name || 'Highlights'
                  : folderPreviewNames.join(', ') || 'Selected sets',
          },
        });
      } catch (logErr) {
        console.warn('Download activity log failed:', logErr);
      }

      try {
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
        channel.close();
      } catch {
        /* BroadcastChannel optional */
      }

      if (!isStale()) setStep('complete');
    } catch (err) {
      if (isStale()) return;
      console.error('Download failed:', err);
      setGoogleSignInPending(false);

      if (
        effectiveDestination === 'google_drive' &&
        isGoogleDriveSignInRestrictedError(err) &&
        !googleLocalFallbackRef.current
      ) {
        googleLocalFallbackRef.current = true;
        setDownloadDestination('local');
        setError('');
        setStatusText('Google Drive is not available for this account. Saving to your device instead…');
        await startDownload({ forceLocal: true, preserveRunId: runId });
        return;
      }

      setError(err.message || 'Download failed. Please try again.');
      setStep('selection');
    } finally {
      if (!isStale()) setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const knownEmail = knownGalleryVisitorEmail(collection?.id, visitorEmail || email);
  const needsEmail = (!!collection?.email_capture_enabled || !!collection?.restrict_to_emails) && !knownEmail;
  const hasPin = collectionHasDownloadPin(collection);
  const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
  const needsPin = hasPin && (!initialPhoto || pinRequiredForSingle);
  const hasDownloadLimit = !!collection?.download_limit_gallery;
  const hasPinUsageLimit = !!(needsPin && collection?.pin_usage_limit);
  const limitOnly = !needsEmail && !needsPin && (hasDownloadLimit || hasPinUsageLimit);

  return (
    <>
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
        className={cn(
          step === 'selection' ? 'dl-modal-shell' : 'relative w-full max-w-md overflow-hidden bg-white shadow-2xl'
        )}
        style={step === 'selection' ? undefined : { borderRadius: '4px' }}
      >
        {step === 'preparing' && (
          <div className={step === 'selection' ? 'dl-modal-shell__progress' : 'absolute top-0 left-0 right-0 h-[2px] bg-zinc-100'}>
            <motion.div
              className={step === 'selection' ? 'dl-modal-shell__progress-bar' : 'h-full bg-zinc-900'}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
          </div>
        )}

        {step === 'selection' ? (
          <>
            <header className="dl-modal-head">
              <h2 className="dl-modal-head__title">Download</h2>
              <p className="dl-modal-head__sub">
                Take the photographs with you. Nothing is watermarked.
              </p>
              <button type="button" onClick={onClose} className="dl-modal-close" aria-label="Close">
                <X size={18} strokeWidth={1.5} />
              </button>
            </header>

            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="dl-modal-body"
            >
              <section className="dl-section">
                <span className="dl-section-label">What</span>
                <div className="dl-what-tabs">
                  <button
                    type="button"
                    className={cn('dl-what-tab', whatScope === 'single' && 'is-active')}
                    onClick={() => setWhatScope('single')}
                  >
                    <span className="dl-what-tab__title">
                      {initialPhoto ? 'This photograph' : 'This set'}
                    </span>
                    <span className="dl-what-tab__meta">
                      {initialPhoto
                        ? '1 file'
                        : viewingSetPhotos.length === 1
                          ? '1 file'
                          : `${viewingSetPhotos.length.toLocaleString()} files`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cn('dl-what-tab', whatScope === 'sets' && 'is-active')}
                    disabled={setRows.length === 0}
                    onClick={() => setWhatScope('sets')}
                  >
                    <span className="dl-what-tab__title">Chosen sets</span>
                    <span className="dl-what-tab__meta">
                      {checkedSetKeys.size} of {setRows.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cn('dl-what-tab', whatScope === 'all' && 'is-active')}
                    onClick={() => setWhatScope('all')}
                  >
                    <span className="dl-what-tab__title">Everything</span>
                    <span className="dl-what-tab__meta">
                      {allowedPhotos.length.toLocaleString()} files
                    </span>
                  </button>
                </div>

                {whatScope === 'single' ? (
                  <div className="dl-scope-panel">
                    {isSingleVideo ? (
                      <>
                        <p className="dl-scope-panel__text">Just this film.</p>
                        <button
                          type="button"
                          className="dl-open-film-btn"
                          onClick={handleOpenSingleVideo}
                        >
                          Open
                        </button>
                      </>
                    ) : initialPhoto ? (
                      'Just the photograph you are looking at.'
                    ) : (
                      'Just the set you are looking at.'
                    )}
                  </div>
                ) : null}

                {whatScope === 'sets' && setRows.length > 0 ? (
                  <div className="dl-set-list">
                    {setRows.map((row) => (
                      <button
                        key={row.key}
                        type="button"
                        className={cn('dl-set-row', checkedSetKeys.has(row.key) && 'is-checked')}
                        onClick={() => toggleSetKey(row.key)}
                      >
                        <span className="dl-set-row__check" aria-hidden>
                          {checkedSetKeys.has(row.key) ? (
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                              <path d="M3 8.2 6.4 12 13 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="dl-set-row__name">{row.name}</span>
                        <span className="dl-set-row__meta">{row.meta}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {whatScope === 'all' ? (
                  <div className="dl-scope-panel">{everythingHint}</div>
                ) : null}
              </section>

              {offeredPhotoResolutions.length > 0 && !(whatScope === 'single' && isSingleVideo) ? (
                <section className="dl-section">
                  <span className="dl-section-label">Size</span>
                  <div className={cn(
                    'dl-size-grid',
                    offeredPhotoResolutions.length === 1 && 'dl-size-grid--one',
                    offeredPhotoResolutions.length === 2 && 'dl-size-grid--two',
                  )}>
                    {offeredPhotoResolutions.includes('web') ? (
                      <button
                        type="button"
                        className={cn('dl-choice-card', resolutionChoice === 'web' && 'is-active')}
                        onClick={() => setResolutionChoice('web')}
                      >
                        <span className="dl-choice-card__title">Web size</span>
                        <span className="dl-choice-card__desc">fast, good for phones</span>
                      </button>
                    ) : null}
                    {offeredPhotoResolutions.includes('full') ? (
                      <button
                        type="button"
                        className={cn('dl-choice-card', resolutionChoice === 'full' && 'is-active')}
                        onClick={() => setResolutionChoice('full')}
                      >
                        <span className="dl-choice-card__title">Full resolution</span>
                        <span className="dl-choice-card__desc">print-ready originals</span>
                      </button>
                    ) : null}
                    {offeredPhotoResolutions.includes('original') ? (
                      <button
                        type="button"
                        className={cn('dl-choice-card', resolutionChoice === 'original' && 'is-active')}
                        onClick={() => setResolutionChoice('original')}
                      >
                        <span className="dl-choice-card__title">Original file</span>
                        <span className="dl-choice-card__desc">camera file, largest size</span>
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="dl-section">
                <span className="dl-section-label">Where</span>
                <div className="dl-where-list">
                  <button
                    type="button"
                    className={cn('dl-where-row', downloadDestination === 'local' && 'is-active')}
                    onClick={() => {
                      setDownloadDestination('local');
                      setError('');
                    }}
                  >
                    <Monitor size={16} strokeWidth={1.5} className="dl-where-row__icon" />
                    <span className="dl-where-row__copy">
                      <span className="dl-where-row__title">Save to this device</span>
                      <span className="dl-where-row__desc">{localWhereDesc}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={cn('dl-where-row', downloadDestination === 'google_drive' && 'is-active')}
                    onClick={() => {
                      setDownloadDestination('google_drive');
                      setError('');
                    }}
                  >
                    <Cloud size={16} strokeWidth={1.5} className="dl-where-row__icon" />
                    <span className="dl-where-row__copy">
                      <span className="dl-where-row__title">Google Drive</span>
                      <span className="dl-where-row__desc">Straight to your Drive, nothing to unzip</span>
                    </span>
                    {downloadDestination !== 'google_drive' ? (
                      <span className="dl-where-row__connect">Connect</span>
                    ) : null}
                  </button>
                </div>

                {!googleDriveAvailable && downloadDestination === 'google_drive' ? (
                  <p className="dl-modal-note" style={{ marginTop: '0.55rem', color: '#92400e' }}>
                    {getGoogleDriveSetupMessage()}
                  </p>
                ) : null}
              </section>

              {whatScope === 'sets' && folderPreviewNames.length > 0 ? (
                <p className="dl-modal-note">
                  Arrives as folders, one per set —{' '}
                  {folderPreviewNames.slice(0, 3).map((name, index) => (
                    <React.Fragment key={name}>
                      {index > 0 ? ', ' : ''}
                      <strong>{name}</strong>
                    </React.Fragment>
                  ))}
                  {folderPreviewNames.length > 3 ? ', and so on' : ''}
                  {' '}— not a heap of loose files.
                </p>
              ) : null}

              {error ? (
                <div className="dl-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              ) : null}
            </motion.div>

            <footer className="dl-modal-footer">
              <div className="dl-modal-footer__summary">
                <span className="dl-modal-footer__count">{selectionSummary.meta}</span>
                <span className="dl-modal-footer__hint">{destinationHint}</span>
              </div>
              <button
                type="button"
                className="dl-modal-footer__btn"
                disabled={isProcessing || resolvedSelectionPhotos.length < 1}
                onClick={handleStartDownloadClick}
              >
                {isProcessing ? 'Preparing…' : 'Download'}
              </button>
            </footer>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="absolute right-5 top-5 z-20 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <div className="p-10">
              <AnimatePresence mode="wait">

            {/* ─── AUTH STEP ─── */}
            {step === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-center text-[15px] font-bold uppercase tracking-[0.3em] text-zinc-900 mb-2">
                  Download Photos
                </h2>
                <p className="text-center text-[14px] text-zinc-500 mb-8 leading-relaxed max-w-[280px] mx-auto">
                  {limitOnly
                    ? `Verifying download availability for this delivery.`
                    : needsPin && needsEmail
                    ? `Please enter your email and the download PIN provided by ${collection?.name || 'the photographer'} to download this photo delivery.`
                    : needsPin
                    ? `Please enter the download PIN provided by ${collection?.name || 'the photographer'} to download this photo delivery.`
                    : `Please enter your email address to download this photo delivery.`
                  }
                  {hasDownloadLimit && (
                    <span className="block mt-2 text-zinc-400 text-[13px]">
                      {collection.download_limit_gallery} download{collection.download_limit_gallery !== 1 ? 's' : ''} remaining for this delivery.
                    </span>
                  )}
                  {hasPinUsageLimit && (
                    <span className="block text-zinc-400 text-[13px]">
                      PIN can be used {collection.pin_usage_limit} time{collection.pin_usage_limit !== 1 ? 's' : ''} total.
                    </span>
                  )}
                </p>

                <div className="space-y-4">
                  {/* Email Input */}
                  {needsEmail && (
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      className="w-full border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 transition-colors"
                    />
                  )}

                  {/* PIN Input */}
                  {needsPin && (
                    <div className="flex items-center justify-center gap-4 py-6 border border-zinc-100 mb-2">
                      {pinDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={pinRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handlePinInput(i, e.target.value)}
                          onKeyDown={e => handlePinKeyDown(i, e)}
                          className="w-10 text-center text-2xl font-medium text-zinc-900 outline-none bg-transparent border-b border-zinc-300 focus:border-zinc-900 transition-colors pb-1"
                        />
                      ))}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-rose-500 text-[13px] justify-center">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    disabled={isProcessing}
                    className="w-full bg-[#111] text-white py-4 text-[13px] font-bold uppercase tracking-[0.25em] hover:bg-zinc-800 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      limitOnly ? 'Continue' : 'Next'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── PAYMENT STEP (Stripe Overlay) ─── */}
            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setStep('selection')}
                    className="text-zinc-500 hover:text-zinc-900 transition-colors text-[13px] flex items-center gap-1 font-semibold uppercase tracking-[0.1em]"
                  >
                    ← Back to Selection
                  </button>
                </div>

                <h2 className="text-center text-[15px] font-bold uppercase tracking-[0.3em] text-zinc-900 mb-2">
                  Secure Digital Payment
                </h2>
                <p className="text-center text-[13px] text-zinc-500 mb-6">
                  Unlock high-resolution downloads instantly.
                </p>

                {/* Price block */}
                <div style={{
                  background: '#fcfbfa',
                  border: '1px solid #f2ede4',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Item to download</span>
                    <strong style={{ color: '#111', fontSize: '14px' }}>
                      {whatScope === 'single' ? 'Single Photo Download' : 'Entire Gallery Download'}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Amount Due</span>
                    <strong style={{ color: '#111', fontSize: '18px', fontWeight: 700 }}>
                      ₹{(whatScope === 'single' ? (collection.digital_download_price_single || 40) : (collection.digital_download_price_all || 199)).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Mock Card Form */}
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Delivery Email</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="w-full border border-zinc-200 rounded px-3 py-2.5 text-[14px] outline-none focus:border-zinc-900 transition-colors"
                      value={paymentEmail}
                      onChange={(e) => setPaymentEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className="w-full border border-zinc-200 rounded px-3 py-2.5 text-[14px] outline-none focus:border-zinc-900 transition-colors"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="4242 4242 4242 4242"
                        className="w-full border border-zinc-200 rounded pl-10 pr-3 py-2.5 text-[14px] outline-none focus:border-zinc-900 transition-colors"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                          setCardNumber(formatted);
                        }}
                      />
                      <CreditCard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        className="w-full border border-zinc-200 rounded px-3 py-2.5 text-[14px] outline-none focus:border-zinc-900 transition-colors"
                        value={cardExpiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                          setCardExpiry(formatted);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1.5">CVC</label>
                      <input
                        type="password"
                        required
                        placeholder="***"
                        maxLength={3}
                        className="w-full border border-zinc-200 rounded px-3 py-2.5 text-[14px] outline-none focus:border-zinc-900 transition-colors"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px dashed #e2e8f0', marginTop: '16px' }}>
                    <ShieldCheck size={16} className="text-[#10b981] flex-shrink-0" />
                    <span>This is a secure simulated Stripe test payment. Any inputs will succeed.</span>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-rose-500 text-[13px] justify-center mt-2">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPaying}
                    className="w-full bg-[#111] text-white py-4 text-[13px] font-bold uppercase tracking-[0.25em] hover:bg-zinc-800 transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Processing payment...
                      </>
                    ) : (
                      `Pay & Start Download`
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── PREPARING STEP ─── */}
            {step === 'preparing' && (
              <motion.div
                key="preparing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
                  {googleSignInPending ? (
                    <>
                      <div className="absolute inset-0 rounded-full border-[4px] border-zinc-100" />
                      <div className="absolute inset-2 rounded-full border-[4px] border-zinc-900 border-t-transparent animate-spin" />
                      <Cloud size={28} className="text-zinc-900" strokeWidth={1.5} />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-full border-[4px] border-zinc-100" />
                      <svg className="absolute inset-0 h-full w-full -rotate-90">
                        <motion.circle
                          cx="64" cy="64" r="61"
                          fill="none"
                          stroke="#18181b"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={383}
                          animate={{ strokeDashoffset: 383 - (383 * progress) / 100 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        />
                      </svg>
                      <span className="text-3xl font-bold text-zinc-900">{progress}%</span>
                    </>
                  )}
                </div>

                <h2 className="text-[15px] font-bold uppercase tracking-[0.25em] text-zinc-900 mb-2">
                  {googleSignInPending ? 'Sign in with Google' : 'Preparing Photos'}
                </h2>
                <p className="max-w-[300px] text-[15px] leading-relaxed text-zinc-500">{statusText}</p>

                <div className="mt-6 flex items-center gap-2 text-[13px] text-zinc-400">
                  <Loader2 size={12} className="animate-spin" />
                  Please keep this window open
                </div>
              </motion.div>
            )}

            {/* ─── COMPLETE STEP ─── */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-white">
                  <CheckCircle2 size={32} strokeWidth={1.5} />
                </div>

                <h2 className="text-[15px] font-bold uppercase tracking-[0.25em] text-zinc-900 mb-3">
                  {downloadCompleteMeta.destination === 'email'
                    ? 'Preparing your download'
                    : downloadCompleteMeta.destination === 'google_drive'
                    ? 'Saved to Google Drive'
                    : downloadCompleteMeta.isZip
                      ? 'Download Finished'
                      : 'Photo saved'}
                </h2>
                <p className="mx-auto mb-6 max-w-[300px] text-[16px] leading-relaxed text-zinc-600">
                  {downloadCompleteMeta.destination === 'email' ? (
                    <>
                      We are preparing your photos. You will receive an email at{' '}
                      <span className="font-medium text-zinc-800">{downloadCompleteMeta.visitorEmail}</span>{' '}
                      with a download link that stays valid for{' '}
                      {collection?.download_link_expiry_days || 7} days.
                    </>
                  ) : downloadCompleteMeta.destination === 'google_drive' ? (
                    <>
                      {downloadCompleteMeta.total > 1 ? (
                        <>
                          Your gallery was uploaded to a new folder in Google Drive
                          {downloadCompleteMeta.total > 0 ? (
                            <> ({downloadCompleteMeta.total} separate files)</>
                          ) : null}
                          .
                        </>
                      ) : (
                        <>Your photo was saved in a new Google Drive folder.</>
                      )}{' '}
                      A new tab should open to your Drive. If not, use the link below.
                    </>
                  ) : downloadCompleteMeta.isZip ? (
                    <>
                      Your gallery download should appear in your device&apos;s{' '}
                      <span className="font-medium text-zinc-800">Downloads</span> folder shortly
                      {downloadCompleteMeta.total > 0 ? (
                        <> ({downloadCompleteMeta.total} photos in one ZIP file)</>
                      ) : null}
                      . Keep this tab open until it finishes.
                    </>
                  ) : (
                    <>Your photo was saved to your device. Open your Downloads folder if you don&apos;t see it.</>
                  )}
                </p>

                {downloadCompleteMeta.destination === 'email' && downloadCompleteMeta.downloadToken ? (
                  <a
                    href={`/download/${encodeURIComponent(downloadCompleteMeta.downloadToken)}`}
                    className="mb-6 inline-block text-[14px] font-bold uppercase tracking-[0.15em] text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
                  >
                    Open download page
                  </a>
                ) : null}

                {downloadCompleteMeta.destination === 'google_drive' &&
                downloadCompleteMeta.driveFileUrl ? (
                  <a
                    href={downloadCompleteMeta.driveFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-6 inline-block text-[14px] font-bold uppercase tracking-[0.15em] text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
                  >
                    Open in Google Drive
                  </a>
                ) : null}

                <p className="mb-6 text-[14px] text-zinc-400">
                  {downloadCompleteMeta.destination === 'google_drive'
                    ? "Didn't see the file?"
                    : downloadCompleteMeta.isZip
                      ? 'Nothing in Downloads?'
                      : "Didn't get the file?"}{' '}
                  <button
                    type="button"
                    onClick={startDownload}
                    className="font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 transition-colors"
                  >
                    Try again
                  </button>
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-zinc-900 text-white py-3.5 text-[13px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-700 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}

          </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>
    </>
  );
};
