import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Share2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { buildGmailComposeUrl } from '../../../../lib/gmailComposeUrl';
import './ShareCollectionModal.css';

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
  /** When true, show note that downloads require a password. */
  downloadRequiresPassword?: boolean;
  /** Active lightbox photo — enables "Share photograph N". */
  activePhotoId?: string | null;
  /** Zero-based index of the active photograph in the visible grid. */
  activePhotoIndex?: number | null;
}

function getDisplaySharePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

function buildPhotoShareUrl(shareUrl: string, photoId: string): string {
  try {
    const parsed = new URL(shareUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
    parsed.searchParams.set('photo', String(photoId));
    return parsed.toString();
  } catch {
    const joiner = shareUrl.includes('?') ? '&' : '?';
    return `${shareUrl}${joiner}photo=${encodeURIComponent(String(photoId))}`;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function tryNativeShare(data: ShareData): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
  }
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const ShareCollectionModal: React.FC<ShareCollectionModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareTitle = 'Gallery',
  downloadRequiresPassword = false,
  activePhotoId = null,
  activePhotoIndex = null,
  themeClassName = 'font-sans',
}) => {
  const [copied, setCopied] = useState(false);

  const displayPath = useMemo(() => getDisplaySharePath(shareUrl), [shareUrl]);
  const photoShareUrl = useMemo(
    () => (activePhotoId ? buildPhotoShareUrl(shareUrl, activePhotoId) : null),
    [shareUrl, activePhotoId]
  );
  const photoNumber =
    typeof activePhotoIndex === 'number' && activePhotoIndex >= 0 ? activePhotoIndex + 1 : null;

  const resetCopyState = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    window.setTimeout(() => setter(false), 2000);
  };

  const handleCopyLink = async () => {
    if (await copyText(shareUrl)) {
      resetCopyState(setCopied);
    }
  };

  const handleEmailShare = () => {
    const body = `Hi,\n\nI'd like to share this gallery with you:\n${shareUrl}\n\nEnjoy!`;
    const url = buildGmailComposeUrl(body, { subject: shareTitle });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this gallery: ${shareTitle}\n${shareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleNativeShare = async () => {
    const shared = await tryNativeShare({
      title: shareTitle,
      text: `Check out this gallery: ${shareTitle}`,
      url: shareUrl,
    });
    if (!shared) {
      await handleCopyLink();
    }
  };

  const handleSharePhoto = async () => {
    if (!photoShareUrl || photoNumber == null) return;

    const shared = await tryNativeShare({
      title: `${shareTitle} — photograph ${photoNumber}`,
      text: `View this photograph from ${shareTitle}`,
      url: photoShareUrl,
    });
    if (!shared) {
      if (await copyText(photoShareUrl)) {
        resetCopyState(setCopied);
      }
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
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className={cn('share-gallery-modal', themeClassName)}
          >
            <button
              type="button"
              onClick={onClose}
              className="share-gallery-modal__close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <h3 id="share-collection-title" className="share-gallery-modal__title">
              Share the gallery
            </h3>
            <p className="share-gallery-modal__description gallery-body-text">
              Anyone with the link can view it.
              {downloadRequiresPassword
                ? ' They will not be able to download unless you tell them the password.'
                : ' Share it with family and friends.'}
            </p>

            <div className="share-gallery-modal__url-row">
              <span className="share-gallery-modal__url-text gallery-body-text" title={shareUrl}>
                {displayPath}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="share-gallery-modal__copy-btn gallery-body-text"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="share-gallery-modal__section-label gallery-body-text">Send it</p>
            <div className="share-gallery-modal__send-grid">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="share-gallery-modal__send-btn"
              >
                <span className="share-gallery-modal__send-icon">
                  <WhatsAppIcon />
                </span>
                <span className="share-gallery-modal__send-label gallery-body-text">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleEmailShare}
                className="share-gallery-modal__send-btn"
              >
                <span className="share-gallery-modal__send-icon">
                  <Mail size={18} strokeWidth={1.75} />
                </span>
                <span className="share-gallery-modal__send-label gallery-body-text">Email</span>
              </button>
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="share-gallery-modal__send-btn"
              >
                <span className="share-gallery-modal__send-icon">
                  <Share2 size={18} strokeWidth={1.75} />
                </span>
                <span className="share-gallery-modal__send-label gallery-body-text">
                   more
                </span>
              </button>
            </div>

            <p className="share-gallery-modal__native-note gallery-body-text">
              <strong>more</strong> opens your phone&apos;s share sheet ,
              Messages, Notes, and other apps on your device.
            </p>

            {photoShareUrl && photoNumber != null ? (
              <>
                <p className="share-gallery-modal__section-label gallery-body-text">
                  Just this photograph
                </p>
                <button
                  type="button"
                  onClick={() => void handleSharePhoto()}
                  className="share-gallery-modal__photo-btn"
                >
                  <span className="share-gallery-modal__photo-icon">
                    <Share2 size={18} strokeWidth={1.75} />
                  </span>
                  <span className="share-gallery-modal__photo-copy">
                    <span className="share-gallery-modal__photo-title gallery-body-text">
                      Share photograph {photoNumber}
                    </span>
                    <span className="share-gallery-modal__photo-subtitle gallery-body-text">
                      Opens on this one image rather than the whole gallery
                    </span>
                  </span>
                </button>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
