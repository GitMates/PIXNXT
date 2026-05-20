import React, { useState } from 'react';
import { getShareUrlForCollection } from '../../../lib/shareCollection';
import './CollectionShareModals.css';

function ModalShell({ title, onClose, children }) {
    return (
        <div className="cgm-overlay" onClick={onClose}>
            <div className="cgm-modal" onClick={(e) => e.stopPropagation()} role="dialog">
                <div className="cgm-header">
                    <h3 className="cgm-title">{title}</h3>
                    <button type="button" className="cgm-close" onClick={onClose} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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

export function CollectionDirectLinkModal({ collection, isOpen, onClose }) {
    if (!isOpen || !collection) return null;
    const url = getShareUrlForCollection(collection);

    return (
        <ModalShell title="GET DIRECT LINK" onClose={onClose}>
            <CopyField label="COLLECTION URL" value={url} />
            <p className="cgm-hint">Share this link with clients to view the gallery.</p>
        </ModalShell>
    );
}

export function CollectionQrModal({ collection, isOpen, onClose }) {
    if (!isOpen || !collection) return null;
    const url = getShareUrlForCollection(collection);
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

    return (
        <ModalShell title="GET QR CODE" onClose={onClose}>
            <div className="cgm-qr-wrap">
                <img src={qrSrc} alt={`QR code for ${collection.name}`} width={220} height={220} />
            </div>
            <CopyField label="COLLECTION URL" value={url} />
        </ModalShell>
    );
}

export function CollectionDuplicateModal({ collection, isOpen, onClose, onConfirm, busy }) {
    if (!isOpen || !collection) return null;

    return (
        <ModalShell title="DUPLICATE COLLECTION" onClose={onClose}>
            <p className="cgm-text">Create a new collection named &ldquo;{collection.name} (Copy)&rdquo;?</p>
            <p className="cgm-text cgm-text--muted">Photos are not copied. You can add media after opening the new collection.</p>
            <div className="cgm-footer-actions">
                <button type="button" className="cgm-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="button" className="cgm-btn-primary" onClick={onConfirm} disabled={busy}>
                    {busy ? 'Duplicating…' : 'Duplicate'}
                </button>
            </div>
        </ModalShell>
    );
}

export { MoveCollectionModal as CollectionMoveToModal } from '../Collections/MoveCollectionModal';
