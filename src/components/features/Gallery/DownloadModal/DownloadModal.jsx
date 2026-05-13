import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import { galleryService } from '@/services/gallery.service';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const [error, setError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const pin = pinDigits.join('');

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
    if (initialPhoto) {
      startDownload();
    } else {
      setStep('selection');
    }
  };

  const startDownload = async () => {
    setIsProcessing(true);
    setStep('preparing');
    setProgress(0);
    setStatusText('Gathering photos...');

    try {
      const zip = new JSZip();
      let photosToDownload = [];

      if (selectedSet === 'single' && initialPhoto) {
        photosToDownload = [initialPhoto];
      } else if (selectedSet === 'all') {
        photosToDownload = photos;
      } else if (selectedSet === null) {
        // Highlights - photos with no set_id
        photosToDownload = photos.filter(p => !p.set_id);
      } else {
        photosToDownload = photos.filter(p => p.set_id === selectedSet);
      }

      if (photosToDownload.length === 0) {
        throw new Error('No photos found in this selection.');
      }

      setStatusText(`Downloading ${photosToDownload.length} photos...`);

      const CHUNK_SIZE = 5;
      for (let i = 0; i < photosToDownload.length; i += CHUNK_SIZE) {
        const chunk = photosToDownload.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (photo, index) => {
          const globalIndex = i + index;
          const url = photo.full_url || photo.web_url;

          try {
            const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            zip.file(photo.filename || `photo-${globalIndex + 1}.jpg`, blob);
          } catch (err) {
            console.error(`Failed to fetch ${photo.filename}:`, err);
          }

          const currentProgress = Math.round(((globalIndex + 1) / photosToDownload.length) * 100);
          setProgress(currentProgress);
          setStatusText(`Processing: ${currentProgress}%`);
        }));
      }

      setStatusText('Creating zip archive...');
      const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });

      setStatusText('Saving to your device...');
      saveAs(content, `${collection.name || 'gallery'}.zip`);
      
      // Log download activity
      await galleryService.logActivity(collection.id, 'download', {
        email: email.trim(),
        photographerId: collection.user_id,
        photoId: initialPhoto?.id
      });

      setStep('complete');
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message || 'Download failed. Please try again.');
      setStep('selection');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const highlightsCount = photos.filter(p => !p.set_id).length;
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
              transition={{ duration: 0.4 }}
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
                {/* Download icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-full">
                    <Download size={18} strokeWidth={1.5} className="text-zinc-400" />
                  </div>
                </div>

                <h2 className="text-center text-[13px] font-bold uppercase tracking-[0.3em] text-zinc-900 mb-2">
                  Choose Photos
                </h2>
                <p className="text-center text-[12px] text-zinc-500 mb-10">
                  Select which photos you would like to download.
                </p>

                {/* Photo Set Selection */}
                <div className="mb-10">
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

                    {/* Highlights */}
                    {highlightsCount > 0 && (
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
                    {sets
                      .filter(s => s.name?.toLowerCase() !== 'highlights')
                      .filter(s => {
                        // If selected_download_sets is provided, only show those sets
                        if (!collection?.selected_download_sets || collection.selected_download_sets.length === 0) return true;
                        return collection.selected_download_sets.includes(s.name) || collection.selected_download_sets.includes(s.id);
                      })
                      .map(set => (
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
                      transition={{ duration: 0.4 }}
                    />
                  </svg>
                  <span className="text-3xl font-bold text-zinc-900">{progress}%</span>
                </div>

                <h2 className="text-[13px] font-bold uppercase tracking-[0.25em] text-zinc-900 mb-2">
                  Preparing Photos
                </h2>
                <p className="text-[13px] text-zinc-500">{statusText}</p>

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
                  Download Ready!
                </h2>
                <p className="text-[13px] text-zinc-500 mb-8 leading-relaxed">
                  Your photos have been bundled and the download has started. Enjoy your memories!
                </p>

                <p className="text-[11px] text-zinc-400 mb-3">
                  Didn't start?{' '}
                  <button onClick={startDownload} className="underline hover:text-zinc-700 transition-colors">
                    Download again
                  </button>
                </p>

                <button
                  onClick={onClose}
                  className="w-full bg-zinc-900 text-white py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-700 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
