import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    albumProofService,
    getAlbumApprovedAt,
    getAlbumChangesSubmittedAt,
    markAlbumApproved,
    markAlbumChangesSubmitted,
} from '../../services/albumProof.service';
import { getGuestProfile, smartAlbumCommentsService } from '../../services/smartAlbumComments.service';

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

export default function AlbumPreviewProofActions({
    albumId,
    albumName,
    photoCommentItems = [],
    swapItems = [],
    spreadCommentsBySpread = {},
    onToast,
}) {
    const [approveOpen, setApproveOpen] = useState(false);
    const [submitOpen, setSubmitOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [approvedAt, setApprovedAt] = useState(() => getAlbumApprovedAt(albumId));
    const [submittedAt, setSubmittedAt] = useState(() => getAlbumChangesSubmittedAt(albumId));

    const spreadCommentCount = Object.values(spreadCommentsBySpread || {}).flat().length;
    const feedbackCount =
        photoCommentItems.length + swapItems.length + spreadCommentCount;

    const resolveGuest = useCallback(() => {
        const guest = getGuestProfile(albumId);
        return {
            name: guest?.name?.trim() || 'Album client',
            email: guest?.email?.trim() || '',
        };
    }, [albumId]);

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

    const handleSubmitChanges = async () => {
        if (!albumId || busy) return;
        if (feedbackCount === 0) {
            onToast?.('Add at least one comment or swap request before submitting.', 'info');
            return;
        }

        setBusy(true);
        try {
            const guest = resolveGuest();
            const spreadComments = await smartAlbumCommentsService.listAlbumComments(albumId);
            const roots = spreadComments.filter((c) => !c.parent_id && String(c.body || '').trim());

            await albumProofService.notifyPhotographerAlbumChanges({
                albumId,
                guestName: guest.name,
                guestEmail: guest.email,
                siteOrigin: window.location.origin,
                photoComments: photoCommentItems.map((pin) => ({
                    spread_label: `Photo comment · ${pin.spreadLabel}`,
                    message: pin.message,
                })),
                swapRequests: swapItems.map((item) => ({
                    from_label: item.labelA,
                    to_label: item.labelB,
                })),
                spreadComments: roots.map((c) => ({
                    spread_index: c.spread_index,
                    author_name: c.author_name,
                    body: c.body,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                })),
            });
            markAlbumChangesSubmitted(albumId);
            setSubmittedAt(new Date().toISOString());
            setSubmitOpen(false);
            onToast?.('Your changes were sent to your photographer.', 'success');
        } catch (e) {
            console.error(e);
            onToast?.(e?.message || 'Could not submit changes. Please try again.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="av-preview-header-actions">
                <button
                    type="button"
                    className="av-preview-header-action av-preview-header-action--secondary"
                    onClick={() => setSubmitOpen(true)}
                    disabled={Boolean(submittedAt)}
                    title={
                        submittedAt
                            ? 'Changes already submitted'
                            : 'Send comments and swap requests to your photographer'
                    }
                >
                    {submittedAt ? 'Changes sent' : 'Submit change'}
                </button>
                <button
                    type="button"
                    className="av-preview-header-action av-preview-header-action--primary"
                    onClick={() => setApproveOpen(true)}
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

            <ProofConfirmModal
                open={submitOpen}
                title="Submit your changes?"
                lead="We'll email your photographer a summary of all photo comments, spread comments, and swap requests you've added to this album."
                note={
                    feedbackCount > 0
                        ? `${feedbackCount} item${feedbackCount === 1 ? '' : 's'} will be included. Make sure your feedback is complete before sending.`
                        : 'Add at least one comment or swap request before submitting.'
                }
                confirmLabel="Confirm & send"
                busy={busy}
                onCancel={() => !busy && setSubmitOpen(false)}
                onConfirm={handleSubmitChanges}
            />
        </>
    );
}
