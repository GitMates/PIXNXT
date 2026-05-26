import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Share2, Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { buildGmailComposeUrl } from '../../../../lib/gmailComposeUrl';

export interface ShareCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareTitle?: string;
  collectionId?: string | null;
  isDark?: boolean;
  initialSenderEmail?: string;
  /** e.g. `font-sans theme-light` — applies gallery typography preset to modal copy */
  themeClassName?: string;
}

export const ShareCollectionModal: React.FC<ShareCollectionModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareTitle = 'Collection',
  themeClassName = 'font-sans',
}) => {
  const [copied, setCopied] = useState(false);

  const handleEmailShare = () => {
    const url = buildGmailComposeUrl(shareUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this collection: ${shareTitle} ${shareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-collection-title"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={cn('relative w-full max-w-md bg-white p-10 shadow-2xl', themeClassName)}
            style={{ color: '#111' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 border-none bg-transparent text-zinc-400 transition-colors hover:text-zinc-950 cursor-pointer"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <motion.div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                <Share2 className="text-zinc-400" size={24} strokeWidth={1.5} />
              </div>
              <h3
                id="share-collection-title"
                className="gallery-heading mb-2 text-xl font-bold text-zinc-900"
              >
                Share Collection
              </h3>
              <p className="gallery-body-text text-sm text-zinc-500">
                Share these memories with family and friends.
              </p>
            </motion.div>

            <motion.div className="mb-10 flex justify-center gap-10">
              <button
                type="button"
                onClick={handleEmailShare}
                className="group flex cursor-pointer flex-col items-center gap-3 border-none bg-transparent transition-opacity hover:opacity-70"
              >
                <motion.div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors group-hover:bg-zinc-200">
                  <Mail size={24} strokeWidth={1.5} />
                </motion.div>
                <span className="gallery-body-text text-[12px] font-bold uppercase tracking-widest text-zinc-500">
                  Email
                </span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="group flex cursor-pointer flex-col items-center gap-3 border-none bg-transparent transition-opacity hover:opacity-70"
              >
                <motion.div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-200/50">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </motion.div>
                <span className="gallery-body-text text-[12px] font-bold uppercase tracking-widest text-zinc-500">
                  WhatsApp
                </span>
              </button>
            </motion.div>

            <motion.div className="relative">
              <div className="absolute inset-0 flex items-center">
                <motion.div className="w-full border-t border-zinc-200" />
              </div>
              <motion.div className="gallery-body-text relative flex justify-center text-[12px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="bg-white px-4">Or copy link</span>
              </motion.div>
            </motion.div>

            <motion.div className="mt-6 flex overflow-hidden rounded border border-zinc-200 p-1">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="gallery-body-text flex-1 bg-zinc-50 px-3 text-sm text-zinc-500 outline-none"
                aria-label="Gallery share link"
              />
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className={cn(
                  'gallery-body-text flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                  copied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                )}
              >
                {copied ? <Check size={14} /> : <LinkIcon size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
