import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Mail } from 'lucide-react';
import {
  getCollectionShareUrl,
  openShareByEmail,
  openWhatsAppShare,
} from '../../../../lib/shareCollection';
import { hasBeenPublished } from '../../../../lib/deliveryStatus';
import './DeliverySharePublishPanel.css';

const SHARE_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'copy', label: 'Copy' },
];

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function DeliverySharePublishPanel({
  open,
  collection,
  collectionSlug,
  profile,
  status,
  onPublish,
  onShareByEmail,
  showToast,
  deliveryTitle,
}) {
  const published = hasBeenPublished({ status, published_at: collection?.published_at });
  const [showLive, setShowLive] = useState(published);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareChannel, setShareChannel] = useState('whatsapp');

  const shareUrl = getCollectionShareUrl(collectionSlug, profile);
  const title = deliveryTitle || collection?.name || 'Delivery';

  useEffect(() => {
    if (!open) return;
    setShowLive(published);
    setCopied(false);
    setShareChannel('whatsapp');
  }, [open, published]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast?.('Link copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      showToast?.('Could not copy link.', 'error');
    }
  }, [shareUrl, showToast]);

  const runShareChannel = useCallback(
    (channelId) => {
      if (!shareUrl) return;
      if (channelId === 'whatsapp') {
        openWhatsAppShare(shareUrl, title);
        return;
      }
      if (channelId === 'email') {
        if (onShareByEmail) {
          onShareByEmail();
          return;
        }
        openShareByEmail(shareUrl, title);
        return;
      }
      if (channelId === 'copy') {
        void handleCopyLink();
      }
    },
    [shareUrl, title, handleCopyLink, onShareByEmail]
  );

  const handlePublishAndShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPublish();
      setShowLive(true);
      showToast?.('Delivery published. Choose how to send the link.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Could not publish delivery.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const liveBody = (
    <>
      <p className="cd-delivery-share-label">Client link</p>
      <div className="cd-delivery-share-link-row">
        <input type="text" readOnly value={shareUrl} aria-label="Client link" />
        <button
          type="button"
          className="cd-delivery-share-copy-inline"
          disabled={!shareUrl}
          onClick={() => void handleCopyLink()}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="cd-delivery-share-divider" />

      <p className="cd-delivery-share-label">Send to client</p>
      <div className="cd-delivery-share-channels" role="tablist" aria-label="Share method">
        {SHARE_CHANNELS.map((channel) => {
          const active = shareChannel === channel.id;
          return (
            <button
              key={channel.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`cd-delivery-share-channel${
                active ? ' cd-delivery-share-channel--active' : ''
              }${active && channel.id === 'whatsapp' ? ' cd-delivery-share-channel--wa' : ''}`}
              onClick={() => {
                if (shareChannel === channel.id) {
                  runShareChannel(channel.id);
                  return;
                }
                setShareChannel(channel.id);
                runShareChannel(channel.id);
              }}
            >
              <span className="cd-delivery-share-channel__icon" aria-hidden>
                {channel.id === 'whatsapp' ? (
                  <WhatsAppIcon />
                ) : channel.id === 'email' ? (
                  <Mail size={15} strokeWidth={2} />
                ) : (
                  <Copy size={15} strokeWidth={2} />
                )}
              </span>
              <span>{channel.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );

  const introBody = (
    <>
      <p className="cd-delivery-share-label">Client link</p>
      <div className="cd-delivery-share-link-row">
        <input
          type="text"
          readOnly
          value={shareUrl}
          placeholder="Publish to activate this link"
          aria-label="Gallery link"
        />
        <button
          type="button"
          className="cd-delivery-share-copy-inline"
          disabled={!shareUrl}
          onClick={() => void handleCopyLink()}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="cd-delivery-share-hint">
        Anyone with this link can view the gallery once you publish.
      </p>

      <button
        type="button"
        className="cd-delivery-share-publish-btn"
        onClick={() => void handlePublishAndShare()}
        disabled={busy}
      >
        {busy ? 'Publishing…' : 'Publish & share…'}
      </button>
      <p className="cd-delivery-share-footnote">
        Publishing activates the link. Nothing is sent until you pick a channel.
      </p>
    </>
  );

  return (
    <div className="cd-delivery-share-wrap">
      <div
        className={`cd-delivery-share-panel${showLive ? '' : ' cd-delivery-share-panel--intro'}`}
        role="dialog"
        aria-label="Share delivery"
      >
        {showLive ? liveBody : introBody}
      </div>
    </div>
  );
}
