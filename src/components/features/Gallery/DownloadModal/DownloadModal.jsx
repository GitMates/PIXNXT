import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, AlertCircle, HardDrive, Cloud } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import {
  downloadPhotosToZip,
  downloadSinglePhotoFile,
  DEFAULT_DOWNLOAD_CONCURRENCY,
} from '@/lib/downloadPhoto';
import { galleryService } from '@/services/gallery.service';
import {
  isGoogleDriveConfigured,
  requestGoogleDriveAccessToken,
  uploadGalleryToGoogleDrive,
} from '@/lib/googleDriveUpload';

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
  return allowlist.some((item) => String(item) === String(key));
}

function preparingStatusText(done, total, phase = 'download') {
  if (total <= 1) {
    if (phase === 'save') return 'Saving your photo…';
    if (phase === 'zip') return 'Almost done…';
    return 'Downloading your photo…';
  }
  if (phase === 'zip') return `Packaging ${total} photos into one file…`;
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
  initialSetId = 'all'
}) => {
  const [step, setStep] = useState('auth'); // auth -> selection -> preparing -> complete
  const [email, setEmail] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [selectedSet, setSelectedSet] = useState(initialPhoto ? 'single' : (initialSetId || 'all'));
  const [downloadDestination, setDownloadDestination] = useState('local'); // local | google_drive
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const [error, setError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const downloadRunIdRef = useRef(0);
  const completedCountRef = useRef(0);
  const [downloadCompleteMeta, setDownloadCompleteMeta] = useState({
    isZip: false,
    total: 0,
    destination: 'local',
    driveFileUrl: null,
  });

  const googleDriveAvailable = isGoogleDriveConfigured();

  const pin = pinDigits.join('');

  /** Never decrease % — parallel fetches used to race on a shared counter and flash lower values. */
  const setProgressMonotonic = (nextPct) => {
    const clamped = Math.min(100, Math.max(0, Math.round(nextPct)));
    setProgress((prev) => Math.max(prev, clamped));
  };

  // Initial step determination
  useEffect(() => {
    if (isOpen && collection) {
      const needsEmail = !!collection?.email_capture_enabled || !!collection?.restrict_to_emails;
      const isSingle = !!initialPhoto;
      const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
      const hasPin = !!(collection?.download_pin || collection?.pin_value || collection?.pinValue || collection?.download_pin_hash);
      const needsPin = hasPin && (!isSingle || pinRequiredForSingle);
      const hasDownloadLimit = !!collection?.download_limit_gallery;
      const hasPinUsageLimit = !!(needsPin && collection?.pin_usage_limit);

      // Reset fields and set initial step only on initial open
      if (prevIsOpen.current === false) {
        setError('');
        setProgress(0);
        setIsProcessing(false);
        setPinDigits(['', '', '', '']);
        setEmail('');
        setSelectedSet(initialPhoto ? 'single' : (initialSetId || 'all'));
        setDownloadDestination('local');

        // Show auth step if any form of gate is required
        if (needsEmail || needsPin || hasDownloadLimit || hasPinUsageLimit) {
          setStep('auth');
        } else {
          setStep('selection');
        }
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, collection, initialPhoto, initialSetId]);

  const prevIsOpen = useRef(false);

  const downloadSetAllowlist = useMemo(
    () => resolveDownloadSetAllowlist(collection?.selected_download_sets, sets),
    [collection?.selected_download_sets, sets]
  );

  const highlightsCount = photos.filter((p) => !p.set_id).length;
  const highlightsDownloadAllowed = isDownloadSetAllowed(downloadSetAllowlist, 'Highlights');

  const downloadableNamedSets = useMemo(
    () =>
      sets
        .filter((s) => s.name?.toLowerCase() !== 'highlights')
        .filter(
          (s) =>
            isDownloadSetAllowed(downloadSetAllowlist, s.name) ||
            isDownloadSetAllowed(downloadSetAllowlist, s.id)
        )
        .filter((s) => photos.some((p) => String(p.set_id) === String(s.id))),
    [sets, downloadSetAllowlist, photos]
  );

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
    if (collection?.email_capture_enabled && !email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Validate PIN if set
    const validPin = collection?.download_pin || collection?.pin_value || collection?.pinValue || collection?.download_pin_hash;
    const needsPin = !!validPin;

    if (needsPin && pin !== validPin) {
      setError('Incorrect PIN. Please check with your photographer.');
      setPinDigits(['', '', '', '']);
      setTimeout(() => pinRefs[0].current?.focus(), 50);
      return;
    }

    // Check email restriction
    if (collection?.restrict_to_emails) {
      const allowedEmails = collection.restrict_to_emails.split(',').map(e => e.trim().toLowerCase());
      const enteredEmail = email.trim().toLowerCase();
      if (!enteredEmail || !allowedEmails.includes(enteredEmail)) {
        setError('Your email is not authorized to download this collection.');
        return;
      }
    }

    setIsProcessing(true);
    setError('');

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
          email: email.trim(),
          photographerId: collection.user_id,
          metadata: { success: true, type: 'download_pin' }
        });
      }

      // ── Check Download Limit ──────────────────────────────
      if (collection?.download_limit_gallery) {
        const downloadCount = await galleryService.getDownloadCount(collection.id);
        if (downloadCount >= collection.download_limit_gallery) {
          setError(`Download limit reached. This collection can only be downloaded ${collection.download_limit_gallery} time${collection.download_limit_gallery !== 1 ? 's' : ''}.`);
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

  const startDownload = async () => {
    const runId = ++downloadRunIdRef.current;
    completedCountRef.current = 0;
    setIsProcessing(true);
    setStep('preparing');
    setProgress(0);
    setDownloadCompleteMeta({ isZip: false, total: 0, destination: downloadDestination, driveFileUrl: null });
    setStatusText('Gathering photos...');

    const isStale = () => runId !== downloadRunIdRef.current;

    try {
      const zip = new JSZip();
      let photosToDownload = [];

      if (selectedSet === 'single' && initialPhoto) {
        photosToDownload = [initialPhoto];
      } else if (selectedSet === 'all') {
        photosToDownload = photos;
      } else if (selectedSet === null) {
        photosToDownload = photos.filter((p) => !p.set_id);
      } else {
        photosToDownload = photos.filter((p) => String(p.set_id) === String(selectedSet));
      }

      if (photosToDownload.length === 0) {
        throw new Error('No photos found in this selection.');
      }

      const setName = selectedSet === 'all' ? 'All Photos' : 
                   selectedSet === 'single' ? 'Single Photo' :
                   (selectedSet === null ? 'Highlights' : (sets.find(s => s.id === selectedSet)?.name || 'Photos'));

      const isVideo = selectedSet === 'single' && initialPhoto?.media_type === 'video';
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

      if (downloadDestination === 'google_drive') {
        if (!googleDriveAvailable) {
          throw new Error(
            'Google Drive is not configured for this site. Choose Local or contact the photographer.'
          );
        }

        setStatusText('Connecting to Google Drive…');
        setProgressMonotonic(5);
        const accessToken = await requestGoogleDriveAccessToken();
        if (isStale()) return;

        setStatusText(
          total === 1 ? 'Uploading to Google Drive…' : `Uploading ${total} photos to Google Drive…`
        );
        setProgressMonotonic(15);

        const driveResult = await uploadGalleryToGoogleDrive(accessToken, photosToDownload, {
          collectionName: collection.name || 'gallery',
          concurrency: DEFAULT_DOWNLOAD_CONCURRENCY,
          isStale,
          onProgress: (done) => {
            completedCountRef.current = done;
            reportDownloadProgress();
          },
          onZipProgress: (percent) => {
            if (isStale()) return;
            const zipPct = Math.min(99, 85 + Math.round((percent / 100) * 14));
            setProgressMonotonic(zipPct);
            setStatusText(preparingStatusText(total, total, 'zip'));
          },
        });

        if (isStale()) return;

        setProgressMonotonic(100);
        setStatusText('Saved to Google Drive');
        setDownloadCompleteMeta({
          isZip: driveResult.isZip,
          total: driveResult.photoCount,
          destination: 'google_drive',
          driveFileUrl: driveResult.webViewLink,
        });
      } else if (total === 1) {
        const photo = photosToDownload[0];
        setProgressMonotonic(50);
        setStatusText(preparingStatusText(0, 1));
        await downloadSinglePhotoFile(photo);
        if (isStale()) return;
        setProgressMonotonic(100);
        setStatusText(preparingStatusText(1, 1, 'save'));
        setDownloadCompleteMeta({ isZip: false, total: 1, destination: 'local', driveFileUrl: null });
      } else {
        const fileCount = await downloadPhotosToZip(zip, photosToDownload, {
          concurrency: DEFAULT_DOWNLOAD_CONCURRENCY,
          isStale,
          onProgress: (done) => {
            completedCountRef.current = done;
            reportDownloadProgress();
          },
        });

        if (isStale()) return;

        if (fileCount === 0) {
          throw new Error(
            'Could not download any photos. They may still be processing — try again in a moment.'
          );
        }

        setProgressMonotonic(100);
        setStatusText(preparingStatusText(total, total, 'zip'));
        setProgressMonotonic(90);
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'STORE' },
          (metadata) => {
            if (isStale()) return;
            const zipPct = Math.min(99, 90 + Math.round((metadata.percent / 100) * 9));
            setProgressMonotonic(zipPct);
            setStatusText(preparingStatusText(total, total, 'zip'));
          }
        );
        const zipFilename = `${(collection.name || 'gallery').replace(/[/\\:*?"<>|]/g, '_')}.zip`;
        downloadSize = zipBlob.size;

        if (isStale()) return;

        setProgressMonotonic(99);
        setStatusText(preparingStatusText(total, total, 'save'));
        saveAs(zipBlob, zipFilename);
        setProgressMonotonic(100);
        setDownloadCompleteMeta({ isZip: true, total, destination: 'local', driveFileUrl: null });
      }

      if (isStale()) return;

      const loggedPhoto = total === 1 ? photosToDownload[0] : initialPhoto;
      try {
        await galleryService.logActivity(collection.id, 'download', {
          email: email.trim(),
          photographerId: collection.user_id,
          photoId: loggedPhoto?.id,
          metadata: {
            type:
              total === 1
                ? loggedPhoto?.media_type === 'video'
                  ? 'video'
                  : 'photo'
                : 'gallery',
            resolution: 'High Res',
            destination: downloadDestination,
            pinUsed: !!(collection?.download_pin && pin.length > 0),
            pin: pin.length > 0 ? pin : null,
            size: downloadSize,
            photoCount: photosToDownload.length,
            setName:
              selectedSet === 'all'
                ? 'All Photos'
                : selectedSet === 'single'
                  ? sets.find((s) => s.id === initialPhoto?.set_id)?.name || 'Highlights'
                  : selectedSet === null
                    ? 'Highlights'
                    : sets.find((s) => String(s.id) === String(selectedSet))?.name || 'Unknown Set',
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
      setError(err.message || 'Download failed. Please try again.');
      setStep('selection');
    } finally {
      if (!isStale()) setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const needsEmail = !!collection?.email_capture_enabled || !!collection?.restrict_to_emails;
  const hasPin = !!(collection?.download_pin || collection?.pin_value || collection?.pinValue || collection?.download_pin_hash);
  const pinRequiredForSingle = collection?.require_pin_for_single_photo !== false;
  const needsPin = hasPin && (!initialPhoto || pinRequiredForSingle);
  const hasDownloadLimit = !!collection?.download_limit_gallery;
  const hasPinUsageLimit = !!(needsPin && collection?.pin_usage_limit);
  const limitOnly = !needsEmail && !needsPin && (hasDownloadLimit || hasPinUsageLimit);

  return (
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
        className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl"
        style={{ borderRadius: '4px' }}
      >
        {/* Progress Bar */}
        {step === 'preparing' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-100">
            <motion.div
              className="h-full bg-zinc-900"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Close button */}
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
                <h2 className="text-center text-[13px] font-bold uppercase tracking-[0.3em] text-zinc-900 mb-2">
                  Download Photos
                </h2>
                <p className="text-center text-[12px] text-zinc-500 mb-8 leading-relaxed max-w-[280px] mx-auto">
                  {limitOnly
                    ? `Verifying download availability for this collection.`
                    : needsPin && needsEmail
                    ? `Please enter your email and the download PIN provided by ${collection?.name || 'the photographer'} to download this photo collection.`
                    : needsPin
                    ? `Please enter the download PIN provided by ${collection?.name || 'the photographer'} to download this photo collection.`
                    : `Please enter your email address to download this photo collection.`
                  }
                  {hasDownloadLimit && (
                    <span className="block mt-2 text-zinc-400 text-[11px]">
                      {collection.download_limit_gallery} download{collection.download_limit_gallery !== 1 ? 's' : ''} remaining for this collection.
                    </span>
                  )}
                  {hasPinUsageLimit && (
                    <span className="block text-zinc-400 text-[11px]">
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
                    <div className="flex items-center gap-2 text-rose-500 text-[11px] justify-center">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    disabled={isProcessing}
                    className="w-full bg-[#111] text-white py-4 text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-zinc-800 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

            {/* ─── SELECTION STEP ─── */}
            {step === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-center text-[13px] font-bold uppercase tracking-[0.3em] text-zinc-900 mb-2">
                  Choose Photo Set
                </h2>
                <p className="text-center text-[12px] text-zinc-500 mb-8">
                  Select which photos you would like to download.
                </p>

                {/* Download destination */}
                <div className="mb-8">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
                    Save to
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadDestination('local');
                        setError('');
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center transition-all',
                        downloadDestination === 'local'
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'
                      )}
                    >
                      <HardDrive size={20} strokeWidth={1.5} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Local</span>
                      <span
                        className={cn(
                          'text-[10px] leading-snug',
                          downloadDestination === 'local' ? 'text-zinc-300' : 'text-zinc-500'
                        )}
                      >
                        Save to this device
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!googleDriveAvailable) return;
                        setDownloadDestination('google_drive');
                        setError('');
                      }}
                      disabled={!googleDriveAvailable}
                      title={
                        googleDriveAvailable
                          ? 'Upload to your Google Drive'
                          : 'Google Drive is not configured (VITE_GOOGLE_CLIENT_ID)'
                      }
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center transition-all',
                        downloadDestination === 'google_drive'
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300',
                        !googleDriveAvailable && 'cursor-not-allowed opacity-45'
                      )}
                    >
                      <Cloud size={20} strokeWidth={1.5} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                        Google Drive
                      </span>
                      <span
                        className={cn(
                          'text-[10px] leading-snug',
                          downloadDestination === 'google_drive' ? 'text-zinc-300' : 'text-zinc-500'
                        )}
                      >
                        {googleDriveAvailable ? 'Upload to your Drive' : 'Not available'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Photo Set Selection */}
                <div className="mb-10">
                  {initialPhoto ? (
                    <p className="text-center text-[12px] text-zinc-500 mb-6">
                      Downloading this {initialPhoto.media_type === 'video' ? 'video' : 'photo'}.
                    </p>
                  ) : (
                    <>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
                    Photo Sets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* All Photos */}
                    <button
                      onClick={() => setSelectedSet('all')}
                      className={cn(
                        'rounded-full px-5 py-2.5 text-[12px] font-bold transition-all',
                        selectedSet === 'all'
                          ? 'bg-[#111] text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      )}
                    >
                      All Photos ({photos.length})
                    </button>

                    {/* Highlights (photos with no set_id) */}
                    {highlightsCount > 0 && highlightsDownloadAllowed && (
                      <button
                        onClick={() => setSelectedSet(null)}
                        className={cn(
                          'rounded-full px-5 py-2.5 text-[12px] font-bold transition-all',
                          selectedSet === null
                            ? 'bg-[#111] text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        )}
                      >
                        Highlights ({highlightsCount})
                      </button>
                    )}

                    {/* Named Sets */}
                    {downloadableNamedSets.map(set => (
                        <button
                          key={set.id}
                          onClick={() => setSelectedSet(set.id)}
                          className={cn(
                            'rounded-full px-5 py-2.5 text-[12px] font-bold transition-all',
                            selectedSet === set.id
                              ? 'bg-[#111] text-white'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          )}
                        >
                          {set.name} ({photos.filter(p => p.set_id === set.id).length})
                        </button>
                      ))}
                  </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-rose-500 text-[11px] mb-4 justify-center">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={startDownload}
                  disabled={isProcessing}
                  className="w-full bg-[#111] text-white py-4 text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Preparing...
                    </>
                  ) : 'Start Download'}
                </button>
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
                </div>

                <h2 className="text-[13px] font-bold uppercase tracking-[0.25em] text-zinc-900 mb-2">
                  Preparing Photos
                </h2>
                <p className="max-w-[280px] text-[13px] leading-relaxed text-zinc-500">{statusText}</p>

                <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-400">
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

                <h2 className="text-[13px] font-bold uppercase tracking-[0.25em] text-zinc-900 mb-3">
                  {downloadCompleteMeta.destination === 'google_drive'
                    ? 'Saved to Google Drive'
                    : downloadCompleteMeta.isZip
                      ? 'Download Finished'
                      : 'Photo saved'}
                </h2>
                <p className="mx-auto mb-6 max-w-[300px] text-[14px] leading-relaxed text-zinc-600">
                  {downloadCompleteMeta.destination === 'google_drive' ? (
                    <>
                      {downloadCompleteMeta.isZip ? (
                        <>
                          Your gallery was uploaded as a ZIP
                          {downloadCompleteMeta.total > 0 ? (
                            <> ({downloadCompleteMeta.total} photos)</>
                          ) : null}
                          .
                        </>
                      ) : (
                        <>Your photo was uploaded to Google Drive.</>
                      )}{' '}
                      Open Drive to view or share the file.
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

                {downloadCompleteMeta.destination === 'google_drive' &&
                downloadCompleteMeta.driveFileUrl ? (
                  <a
                    href={downloadCompleteMeta.driveFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-6 inline-block text-[12px] font-bold uppercase tracking-[0.15em] text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
                  >
                    Open in Google Drive
                  </a>
                ) : null}

                <p className="mb-6 text-[12px] text-zinc-400">
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
                  className="w-full bg-zinc-900 text-white py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-700 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
