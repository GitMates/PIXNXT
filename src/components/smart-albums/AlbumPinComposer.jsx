import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AlbumPhotoPins.css';

export default function AlbumPinComposer({ open, slotLabel, onSave, onClose }) {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) {
            setMessage('');
            return undefined;
        }
        const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="ab-pin-composer-backdrop" onClick={onClose} role="presentation">
            <div
                className="ab-pin-composer"
                role="dialog"
                aria-modal="true"
                aria-label="Add pin message"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="ab-pin-composer-close" onClick={onClose} aria-label="Close">
                    ×
                </button>
                <div className="ab-pin-composer-head">
                    <div>
                        <h3 className="ab-pin-composer-title">Add pin</h3>
                        {slotLabel && <p className="ab-pin-composer-slot">{slotLabel}</p>}
                    </div>
                </div>
                <textarea
                    ref={inputRef}
                    className="ab-pin-composer-input"
                    rows={4}
                    placeholder="Type your note for this spot…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className="ab-pin-composer-actions">
                    <button type="button" className="ab-pin-composer-btn ab-pin-composer-btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ab-pin-composer-btn ab-pin-composer-btn--save"
                        disabled={!message.trim()}
                        onClick={() => onSave?.(message.trim())}
                    >
                        Save pin
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
