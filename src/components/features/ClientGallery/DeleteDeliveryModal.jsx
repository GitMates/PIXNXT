import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import './DeleteDeliveryModal.css';

export function DeleteDeliveryModal({
  isOpen,
  name,
  busy = false,
  onClose,
  onConfirm,
}) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    setAccepted(false);
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const trimmedName = name?.trim();
  const title = trimmedName ? `Delete “${trimmedName}”?` : 'Delete this delivery?';

  return createPortal(
    <div
      className="dl-delete-overlay"
      onClick={() => {
        if (!busy) onClose();
      }}
      role="presentation"
    >
      <div
        className="dl-delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dl-delete-title"
        aria-describedby="dl-delete-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dl-delete-header">
          <p className="dl-delete-eyebrow">Delete delivery</p>
          <button
            type="button"
            className="dl-delete-close"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="dl-delete-body">
          <h2 id="dl-delete-title" className="dl-delete-title">
            {title}
          </h2>

          <div id="dl-delete-body" className="dl-delete-warning">
            <AlertTriangle className="dl-delete-warning-icon" size={18} strokeWidth={2} aria-hidden />
            <div className="dl-delete-warning-text">
              <p>This cannot be undone.</p>
              <p>
                All photographs, films, and past activity will be permanently removed from your
                studio.
              </p>
            </div>
          </div>

          <label className={`dl-delete-accept${accepted ? ' is-checked' : ''}`}>
            <input
              type="checkbox"
              className="dl-delete-accept-input"
              checked={accepted}
              disabled={busy}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="dl-delete-accept-box" aria-hidden>
              {accepted ? (
                <svg viewBox="0 0 12 10" width="11" height="9" fill="none">
                  <path
                    d="M1 5.2L4.2 8.4L11 1.4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="dl-delete-accept-label">
              I accept that this delivery will be permanently deleted
            </span>
          </label>
        </div>

        <div className="dl-delete-footer">
          <button
            type="button"
            className="dl-delete-cancel"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dl-delete-confirm"
            disabled={!accepted || busy}
            onClick={() => void onConfirm()}
          >
            {busy ? (
              <>
                <span className="dl-delete-confirm-spinner" aria-hidden />
                Deleting…
              </>
            ) : (
              'Delete delivery'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
