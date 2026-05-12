import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, Download, Check, ChevronRight,
  Loader2, Image as ImageIcon, CheckCircle2,
  Monitor, Smartphone, Cloud, ArrowRight,
  HardDrive, Globe, AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

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
  const [pin, setPin] = useState('');
  const [selectedSize, setSelectedSize] = useState('high'); // high, web, original
  const [selectedSet, setSelectedSet] = useState(initialPhoto ? 'single' : initialSetId); // all, or set id, or single
  const [downloadTo, setDownloadTo] = useState('device'); // device, google, dropbox
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const [error, setError] = useState('');

  // Initial step determination
  useEffect(() => {
    if (isOpen) {
      const needsEmail = collection?.email_capture_enabled;
      let needsPin = !!(collection?.download_pin);

      // If downloading a single photo, check if PIN is actually required for single photos
      if (initialPhoto && needsPin && collection?.require_pin_for_single_photo === false) {
        needsPin = false;
      }

      if (!needsEmail && !needsPin) {
        setStep('selection');
      } else {
        setStep('auth');
      }

      // Reset state
      setError('');
      setProgress(0);
      setIsProcessing(false);
      setSelectedSet(initialPhoto ? 'single' : initialSetId);
      setDownloadTo('device');
    }
  }, [isOpen, collection, initialPhoto, initialSetId]);

  const handleAuth = () => {
    if (collection?.email_capture_enabled && !email) {
      setError('Please enter your email address');
      return;
    }

    const needsPin = !!(collection?.download_pin);
    const pinRequiredForThis = initialPhoto ? (needsPin && collection?.require_pin_for_single_photo !== false) : needsPin;

    if (pinRequiredForThis && pin !== collection.download_pin) {
      setError('Incorrect PIN. Please check with your photographer.');
      return;
    }

    setError('');

    // Auto-start download for single photos to improve UX since size selection is removed
    if (initialPhoto) {
      startDownload();
    } else {
      setStep('selection');
    }
  };

  const startDownload = async () => {
    if (downloadTo !== 'device') {
      alert(`${downloadTo.charAt(0).toUpperCase() + downloadTo.slice(1)} integration is coming soon! For now, please use "Save to My Device".`);
      return;
    }

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
      } else {
        photosToDownload = photos.filter(p => p.set_id === selectedSet);
      }

      if (photosToDownload.length === 0) {
        throw new Error('No photos found in this selection.');
      }

      setStatusText(`Downloading ${photosToDownload.length} photos...`);

      // Parallel download with chunking to avoid browser limits
      const CHUNK_SIZE = 5;
      for (let i = 0; i < photosToDownload.length; i += CHUNK_SIZE) {
        const chunk = photosToDownload.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (photo, index) => {
          const globalIndex = i + index;
          const url = selectedSize === 'high' ? (photo.full_url || photo.web_url) : photo.web_url;

          try {
            // Use no-cache to ensure fresh images and avoid some CORS issues with cached responses
            const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const fileName = photo.filename || `photo-${globalIndex + 1}.jpg`;
            zip.file(fileName, blob);
          } catch (err) {
            console.error(`Failed to fetch ${photo.filename}:`, err);
            // Don't fail the whole zip for one photo, but log it
          }

          const currentProgress = Math.round(((globalIndex + 1) / photosToDownload.length) * 100);
          setProgress(currentProgress);
          setStatusText(`Processing: ${currentProgress}%`);
        }));
      }

      setStatusText('Generating zip archive...');
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // Faster zipping, larger file
      }, (metadata) => {
        // Zip generation progress
        if (metadata.percent) {
          // We've already shown 100% for downloads, maybe just show status
        }
      });

      setStatusText('Saving to your device...');
      saveAs(content, `${collection.name || 'gallery'}-${selectedSize}.zip`);

      setStep('complete');
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message || 'Download failed. This is likely due to security restrictions or memory limits.');
      setStep('selection');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[12px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative w-full max-w-[540px] overflow-hidden rounded-[40px] bg-white shadow-[0_40px_160px_rgba(0,0,0,0.2)]"
      >
        {/* Progress Bar Top */}
        {step === 'preparing' && (
          <motion.div
            className="absolute top-0 left-0 h-1 bg-zinc-900 z-10"
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        )}

        <button
          onClick={onClose}
          className="absolute right-8 top-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-all hover:bg-zinc-200 hover:text-zinc-900 active:scale-90"
        >
          <X size={18} />
        </button>

        <div className="p-12">
          <AnimatePresence mode="wait">
            {step === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div>
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-white shadow-2xl shadow-zinc-900/20">
                    <Lock size={28} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Download Access</h2>
                  <p className="mt-3 text-[16px] leading-relaxed text-zinc-500">
                    Please provide the required information provided by your photographer to start your download.
                  </p>
                </div>

                <div className="space-y-4">
                  {collection?.email_capture_enabled && (
                    <div className="group relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                        <Mail size={20} />
                      </div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border-none bg-zinc-100 py-5 pl-14 pr-5 text-[15px] outline-none ring-2 ring-transparent transition-all focus:bg-white focus:ring-zinc-900/10"
                      />
                    </div>
                  )}

                  {collection?.download_pin && (
                    <div className="group relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-Digit PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full rounded-2xl border-none bg-zinc-100 py-5 pl-14 pr-5 text-[15px] tracking-[0.3em] outline-none ring-2 ring-transparent transition-all focus:bg-white focus:ring-zinc-900/10 placeholder:tracking-normal"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-rose-600">
                      <AlertCircle size={18} />
                      <span className="text-[13px] font-medium">{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-zinc-900 py-5 text-[14px] font-bold text-white shadow-2xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-[0.98]"
                  >
                    Authenticate
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Choose Photos</h2>
                  <p className="mt-2 text-[15px] text-zinc-500">Configure your download preferences below.</p>
                </div>

                <div className="space-y-8">
                  {/* Photo Set Selection */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Photos</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedSet('all')}
                        className={cn(
                          "rounded-full px-5 py-2.5 text-[13px] font-medium transition-all",
                          selectedSet === 'all'
                            ? "bg-zinc-900 text-white shadow-lg"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        )}
                      >
                        All Photos ({photos.length})
                      </button>

                      {/* Highlights (photos with no set_id) */}
                      {photos.some(p => !p.set_id) && (
                        <button
                          onClick={() => setSelectedSet(null)}
                          className={cn(
                            "rounded-full px-5 py-2.5 text-[13px] font-medium transition-all",
                            selectedSet === null
                              ? "bg-zinc-900 text-white shadow-lg"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          )}
                        >
                          Highlights ({photos.filter(p => !p.set_id).length})
                        </button>
                      )}
                      {sets.map(set => (
                        <button
                          key={set.id}
                          onClick={() => setSelectedSet(set.id)}
                          className={cn(
                            "rounded-full px-5 py-2.5 text-[13px] font-medium transition-all",
                            selectedSet === set.id
                              ? "bg-zinc-900 text-white shadow-lg"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          )}
                        >
                          {set.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selection */}
                  {/* <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Choose Download Size</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setSelectedSize('high')}
                          className={cn(
                            "group relative flex flex-col items-start gap-1 rounded-2xl border-2 p-5 text-left transition-all",
                            selectedSize === 'high' 
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-xl shadow-zinc-900/10" 
                              : "border-zinc-100 bg-white text-zinc-900 hover:border-zinc-200"
                          )}
                        >
                          <span className="text-[15px] font-bold">High Resolution</span>
                          <span className={cn("text-[11px]", selectedSize === 'high' ? "text-zinc-400" : "text-zinc-500")}>
                            {collection?.high_res_choice === 'original' ? 'Original Size' : (collection?.high_res_choice || '3600px')} • Best for print
                          </span>
                          {selectedSize === 'high' && <CheckCircle2 size={18} className="absolute top-5 right-5" />}
                        </button>
                        
                        <button
                          onClick={() => setSelectedSize('web')}
                          className={cn(
                            "group relative flex flex-col items-start gap-1 rounded-2xl border-2 p-5 text-left transition-all",
                            selectedSize === 'web' 
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-xl shadow-zinc-900/10" 
                              : "border-zinc-100 bg-white text-zinc-900 hover:border-zinc-200"
                          )}
                        >
                          <span className="text-[15px] font-bold">Web Size</span>
                          <span className={cn("text-[11px]", selectedSize === 'web' ? "text-zinc-400" : "text-zinc-500")}>
                            {collection?.web_size_choice || '1024px'} • Best for social
                          </span>
                          {selectedSize === 'web' && <CheckCircle2 size={18} className="absolute top-5 right-5" />}
                        </button>
                    </div>
                  </div> */}

                  {/* Destination Selection */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Download To</label>
                    <div className="space-y-2">
                      {[
                        { id: 'device', name: 'Save to My Device', icon: Monitor },
                        { id: 'google', name: 'Save to Google Photos', icon: Cloud },
                        { id: 'dropbox', name: 'Save to Dropbox', icon: HardDrive },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setDownloadTo(item.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl border p-5 transition-all",
                            downloadTo === item.id
                              ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                              : "border-zinc-100 bg-white hover:border-zinc-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                              downloadTo === item.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
                            )}>
                              <item.icon size={20} />
                            </div>
                            <span className="text-[14px] font-bold text-zinc-900">{item.name}</span>
                          </div>
                          {downloadTo === item.id && <Check size={20} className="text-zinc-900" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-center text-[13px] font-medium text-rose-500">{error}</p>
                  )}

                  <button
                    onClick={startDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-5 text-[14px] font-bold text-white shadow-2xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-[0.98]"
                  >
                    Start Download
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'preparing' && (
              <motion.div
                key="preparing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="relative mb-12 flex h-40 w-40 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[6px] border-zinc-100" />
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="77"
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={483}
                      animate={{ strokeDashoffset: 483 - (483 * progress) / 100 }}
                      transition={{ duration: 0.5 }}
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-bold text-zinc-900">{progress}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-zinc-900">Preparing Photos</h2>
                  <p className="text-[16px] text-zinc-500 max-w-[320px]">
                    {statusText}
                  </p>
                </div>

                <div className="mt-12 flex items-center gap-2 rounded-2xl bg-zinc-50 px-6 py-3 text-[12px] font-medium text-zinc-400">
                  <Loader2 size={14} className="animate-spin" />
                  Please keep this window open
                </div>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10 text-center py-6"
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30">
                  <CheckCircle2 size={48} strokeWidth={1.5} />
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-zinc-900">Download Ready!</h2>
                  <p className="text-[16px] leading-relaxed text-zinc-500">
                    Your photos have been bundled and the download has started. Enjoy your memories!
                  </p>
                </div>

                <div className="rounded-3xl bg-zinc-50 p-8">
                  <p className="text-[13px] text-zinc-400">
                    Didn't start? No worries, you can trigger it manually.
                  </p>
                  <button
                    onClick={startDownload}
                    className="mt-4 flex items-center justify-center gap-2 mx-auto text-[14px] font-bold text-zinc-900 hover:opacity-70 transition-all"
                  >
                    <Download size={18} />
                    Download Again
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-zinc-900 py-5 text-[14px] font-bold text-white transition-all hover:bg-zinc-800"
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

