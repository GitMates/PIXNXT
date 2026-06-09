import React, { useEffect, useRef, useState } from 'react';
import './AlbumCoverTextModal.css';

export default function AlbumCoverTextModal({
    open,
    initialMessage = '',
    onClose,
    onSave,
}) {
    const inputRef = useRef(null);
    const [message, setMessage] = useState(initialMessage);

    useEffect(() => {
        if (!open) return undefined;
        setMessage(initialMessage);
        const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(timer);
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [open, initialMessage, onClose]);

    if (!open) return null;

    return (
        <div className="actm-backdrop" role="presentation" onClick={() => onClose?.()}>
            <div
                className="actm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="actm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="actm-header">
                    <h2 id="actm-title" className="actm-title">
                        Cover text message
                    </h2>
                    <button type="button" className="actm-close" onClick={() => onClose?.()} aria-label="Close">
                        ×
                    </button>
                </header>
                <div className="actm-body">
                    <label className="actm-label" htmlFor="actm-message">
                        Message on front cover
                    </label>
                    <textarea
                        id="actm-message"
                        ref={inputRef}
                        className="actm-textarea"
                        rows={4}
                        maxLength={280}
                        placeholder="e.g. Kellie &amp; Fahim · June 2026"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <p className="actm-hint">Shown over the front cover. Leave empty to remove.</p>
                </div>
                <footer className="actm-footer">
                    <button type="button" className="actm-btn actm-btn--secondary" onClick={() => onClose?.()}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="actm-btn actm-btn--primary"
                        onClick={() => onSave?.(message.trim())}
                    >
                        Save message
                    </button>
                </footer>
            </div>
        </div>
    );
}
