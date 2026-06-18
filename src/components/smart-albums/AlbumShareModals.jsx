import React, { useState } from 'react';
import {
    getSmartAlbumPreviewShareUrl,
    getShareUrlWarning,
    getQrCodeImageUrl,
    isClientShareLinkEnabled,
    isClientShareLinkLive,
} from '../../lib/shareSmartAlbum';
import '../features/ClientGallery/CollectionShareModals.css';

function ModalShell({ title, onClose, children }) {
    return (
        <div className="cgm-overlay" onClick={onClose}>
            <div className="cgm-modal" onClick={(e) => e.stopPropagation()} role="dialog">
                <div className="cgm-header">
                    <h3 className="cgm-title">{title}</h3>
                    <button type="button" className="cgm-close" onClick={onClose} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="cgm-body">{children}</div>
            </div>
        </div>
    );
}

function CopyField({ label, value }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="cgm-field">
            <label className="cgm-label">{label}</label>
            <div className="cgm-copy-row">
                <input type="text" readOnly value={value || ''} className="cgm-input" />
                <button type="button" className="cgm-copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}

export function AlbumPreviewLinkModal({ album, isOpen, onClose }) {
    if (!isOpen || !album) return null;
    const url = getSmartAlbumPreviewShareUrl(album);
    const warning = getShareUrlWarning(url);
    const shareLinkDisabled = !isClientShareLinkEnabled(album);
    const shareLinkLive = isClientShareLinkLive(album);

    return (
        <ModalShell title="GET DIRECT LINK" onClose={onClose}>
            <CopyField label="ALBUM PREVIEW URL" value={url} />
            {warning ? <p className="cgm-warning">{warning}</p> : null}
            {shareLinkDisabled ? (
                <p className="cgm-warning">
                    Client share link is disabled in Settings. Turn it on before sharing this URL.
                </p>
            ) : null}
            {!shareLinkLive && album?.status !== 'published' ? (
                <p className="cgm-warning">The album must be published first.</p>
            ) : null}
            <p className="cgm-hint">
                Share this link to open the album preview with per-spread comments (read-only
                flipbook, no editor). The album must be published and the client share link must be
                on.
            </p>
        </ModalShell>
    );
}

export function AlbumPreviewQrModal({ album, isOpen, onClose }) {
    if (!isOpen || !album) return null;
    const url = getSmartAlbumPreviewShareUrl(album);
    const warning = getShareUrlWarning(url);
    const shareLinkDisabled = !isClientShareLinkEnabled(album);
    const shareLinkLive = isClientShareLinkLive(album);
    const qrSrc = getQrCodeImageUrl(url, 220);

    return (
        <ModalShell title="GET QR CODE" onClose={onClose}>
            <div className="cgm-qr-wrap">
                <img src={qrSrc} alt={`QR code for ${album.name}`} width={220} height={220} />
            </div>
            <CopyField label="ALBUM PREVIEW URL" value={url} />
            {warning ? <p className="cgm-warning">{warning}</p> : null}
            {shareLinkDisabled ? (
                <p className="cgm-warning">
                    Client share link is disabled in Settings. Turn it on before sharing this QR code.
                </p>
            ) : null}
            {!shareLinkLive && album?.status !== 'published' ? (
                <p className="cgm-warning">The album must be published first.</p>
            ) : null}
            <p className="cgm-hint">
                Scan to open the album preview. The album must be published and the client share
                link must be on.
            </p>
        </ModalShell>
    );
}
