import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

  const title = name ? `Delete “${name}”?` : 'Delete delivery?';

  return createPortal(
    <div
      className="dl-delete-overlay"
      onClick={() => {
        if (!busy) onClose();
      }}
      role="presentation"
    >
      <div
        className="dl-delete-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dl-delete-title"
        aria-describedby="dl-delete-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dl-delete-title" className="dl-delete-title">
          {title}
        </h2>
        <p id="dl-delete-body" className="dl-delete-body">
          This cannot be undone.{' '}
          <strong>All photographs, films, and past activity will be permanently removed.</strong>
        </p>
        <label className="dl-delete-accept">
          <input
            type="checkbox"
            checked={accepted}
            disabled={busy}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>I accept that this delivery will be permanently deleted</span>
        </label>
        <div className="dl-delete-actions">
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
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
