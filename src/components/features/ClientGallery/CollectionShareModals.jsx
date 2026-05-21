import React, { useState } from 'react';
import { getShareUrlForCollection, getQrCodeImageUrl, getShareUrlWarning } from '../../../lib/shareCollection';
import { getFolderStudioUrl } from '../../../lib/folderStudioUrl';
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
    const warning = getShareUrlWarning(url);

    return (
        <ModalShell title="GET DIRECT LINK" onClose={onClose}>
            <CopyField label="COLLECTION URL" value={url} />
            {warning ? <p className="cgm-warning">{warning}</p> : null}
            <p className="cgm-hint">Share this link with clients to view the gallery.</p>
        </ModalShell>
    );
}

export function CollectionQrModal({ collection, isOpen, onClose }) {
    if (!isOpen || !collection) return null;
    const url = getShareUrlForCollection(collection);
    const warning = getShareUrlWarning(url);
    const qrSrc = getQrCodeImageUrl(url, 220);

    return (
        <ModalShell title="GET QR CODE" onClose={onClose}>
            <div className="cgm-qr-wrap">
                <img src={qrSrc} alt={`QR code for ${collection.name}`} width={220} height={220} />
            </div>
            <CopyField label="COLLECTION URL" value={url} />
            {warning ? <p className="cgm-warning">{warning}</p> : null}
            <p className="cgm-hint">Clients scan the code to open the public gallery. Use your production domain, not a preview deploy URL.</p>
        </ModalShell>
    );
}

export function CollectionDuplicateModal({ collection, isOpen, onClose, onConfirm, busy }) {
    if (!isOpen || !collection) return null;

    return (
        <ModalShell title="DUPLICATE COLLECTION" onClose={onClose}>
            <p className="cgm-text">Are you sure you want to duplicate this collection?</p>
            <ul className="cgm-duplicate-notes">
                <li>Duplicating a collection may take a few minutes depending on the size.</li>
                <li>Photos and videos in the new collection may be temporarily unavailable while the process is running.</li>
            </ul>
            <div className="cgm-footer-actions">
                <button type="button" className="cgm-btn-ghost" onClick={onClose} disabled={busy}>
                    Cancel
                </button>
                <button type="button" className="cgm-btn-duplicate" onClick={onConfirm} disabled={busy}>
                    {busy ? 'Duplicating…' : 'Duplicate'}
                </button>
            </div>
        </ModalShell>
    );
}

export function FolderDirectLinkModal({ folder, isOpen, onClose }) {
    if (!isOpen || !folder) return null;
    const url = getFolderStudioUrl(folder.id);

    return (
        <ModalShell title="GET DIRECT LINK" onClose={onClose}>
            <CopyField label="FOLDER URL" value={url} />
            <p className="cgm-hint">Opens this folder in your studio. Share with your team to manage collections inside it.</p>
        </ModalShell>
    );
}

export function FolderQrModal({ folder, isOpen, onClose }) {
    if (!isOpen || !folder) return null;
    const url = getFolderStudioUrl(folder.id);
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

    return (
        <ModalShell title="GET QR CODE" onClose={onClose}>
            <div className="cgm-qr-wrap">
                <img src={qrSrc} alt={`QR code for folder ${folder.name}`} width={220} height={220} />
            </div>
            <CopyField label="FOLDER URL" value={url} />
        </ModalShell>
    );
}

export { MoveCollectionModal as CollectionMoveToModal } from '../Collections/MoveCollectionModal';
