import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    albumProofService,
    getAlbumApprovedAt,
    markAlbumApproved,
} from '../../services/albumProof.service';
import { getGuestProfile } from '../../services/smartAlbumComments.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';

function ProofConfirmModal({
    open,
    title,
    lead,
    note,
    confirmLabel,
    busy,
    onCancel,
    onConfirm,
    variant = 'default',
}) {
    if (!open) return null;

    return createPortal(
        <div
            className="av-proof-modal-backdrop"
            onClick={() => !busy && onCancel()}
            role="presentation"
        >
            <div
                className="av-proof-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="av-proof-modal-title">{title}</h2>
                <p className="av-proof-modal-lead">{lead}</p>
                {note && <p className="av-proof-modal-note">{note}</p>}
                <div className="av-proof-modal-actions">
                    <button
                        type="button"
                        className="av-proof-modal-btn av-proof-modal-btn--ghost"
                        disabled={busy}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`av-proof-modal-btn av-proof-modal-btn--confirm${
                            variant === 'approve' ? ' av-proof-modal-btn--approve' : ''
                        }`}
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {busy ? 'Sending…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function AlbumPreviewProofActions({ albumId, albumName, album, onToast }) {
    const [approveOpen, setApproveOpen] = useState(false);
    const [pinOpen, setPinOpen] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [busy, setBusy] = useState(false);
    const [approvedAt, setApprovedAt] = useState(() => getAlbumApprovedAt(albumId));

    const access = useMemo(
        () =>
            smartAlbumProoferSettingsService.getEffectiveAlbumAccess(
                album?.photographer_id,
                albumId,
                album,
                album?.preview_data
            ),
        [album, albumId]
    );

    const requiresPin = Boolean(access?.requireDigitalVerification && access?.approvalPin);

    const resolveGuest = useCallback(() => {
        const guest = getGuestProfile(albumId);
        return {
            name: guest?.name?.trim() || 'Album client',
            email: guest?.email?.trim() || '',
        };
    }, [albumId]);

    const handleApproveClick = () => {
        if (requiresPin) {
            setPinInput('');
            setPinError('');
            setPinOpen(true);
            return;
        }
        setApproveOpen(true);
    };

    const handlePinSubmit = () => {
        if (pinInput.replace(/\s/g, '') !== String(access.approvalPin || '').replace(/\s/g, '')) {
            setPinError('Incorrect approval PIN.');
            return;
        }
        setPinOpen(false);
        setApproveOpen(true);
    };

    const handleApprove = async () => {
        if (!albumId || busy) return;
        setBusy(true);
        try {
            const guest = resolveGuest();
            await albumProofService.notifyPhotographerAlbumApproved({
                albumId,
                guestName: guest.name,
                guestEmail: guest.email,
                siteOrigin: window.location.origin,
            });
            markAlbumApproved(albumId);
            setApprovedAt(new Date().toISOString());
            setApproveOpen(false);
            onToast?.('Album approved. Your photographer has been notified.', 'success');
        } catch (e) {
            console.error(e);
            onToast?.(e?.message || 'Could not send approval. Please try again.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="av-preview-header-actions">
                <button
                    type="button"
                    className="av-preview-header-action av-preview-header-action--primary"
                    onClick={handleApproveClick}
                    disabled={Boolean(approvedAt)}
                    title={
                        approvedAt
                            ? 'Album already approved'
                            : 'Approve album for binding'
                    }
                >
                    {approvedAt ? 'Approved' : 'Approve album'}
                </button>
            </div>

            {pinOpen &&
                createPortal(
                    <div
                        className="av-proof-modal-backdrop"
                        onClick={() => setPinOpen(false)}
                        role="presentation"
                    >
                        <div
                            className="av-proof-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Enter approval PIN"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="av-proof-modal-title">Enter approval PIN</h2>
                            <p className="av-proof-modal-lead">
                                Enter the secure PIN your photographer provided.
                            </p>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm mb-2"
                                autoFocus
                            />
                            {pinError && <p className="text-sm text-red-600 mb-2">{pinError}</p>}
                            <div className="av-proof-modal-actions">
                                <button
                                    type="button"
                                    className="av-proof-modal-btn av-proof-modal-btn--ghost"
                                    onClick={() => setPinOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="av-proof-modal-btn av-proof-modal-btn--confirm av-proof-modal-btn--approve"
                                    onClick={handlePinSubmit}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            <ProofConfirmModal
                open={approveOpen}
                title="Approve this album?"
                lead={`You are about to approve “${albumName || 'this album'}” as final.`}
                note="Once approved, your album will move to binding and production. After submission, no further changes can be made. Please review every spread carefully before confirming."
                confirmLabel="Confirm approval"
                busy={busy}
                variant="approve"
                onCancel={() => !busy && setApproveOpen(false)}
                onConfirm={handleApprove}
            />
        </>
    );
}
