import React, { useEffect, useRef } from 'react';
import { filesFromInput } from '../../lib/uploadFileOrder';
import './CollectionPickerModal.css';

export default function CollectionPickerModal({
    open,
    title,
    subtitle,
    items = [],
    uploading = false,
    onClose,
    onSelectItem,
    onUploadFiles,
}) {
    const fileRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="cpm-backdrop" role="presentation" onClick={() => onClose?.()}>
            <div
                className="cpm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cpm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="cpm-header">
                    <div>
                        <h2 id="cpm-title" className="cpm-title">
                            {title}
                        </h2>
                        {subtitle && <p className="cpm-subtitle">{subtitle}</p>}
                    </div>
                    <button type="button" className="cpm-close" onClick={() => onClose?.()} aria-label="Close">
                        ×
                    </button>
                </header>

                <div className="cpm-body">
                    {items.length === 0 ? (
                        <div className="cpm-empty">
                            <p>No photos yet. Upload JPG, PNG, or PDF files.</p>
                            <button
                                type="button"
                                className="cpm-btn-primary"
                                disabled={uploading}
                                onClick={() => fileRef.current?.click()}
                            >
                                {uploading ? 'Uploading…' : 'Upload photos'}
                            </button>
                        </div>
                    ) : (
                        <div className="cpm-grid">
                            {items.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="cpm-thumb"
                                    onClick={() => onSelectItem?.(item.id)}
                                    title={`${index + 1}. ${item.name || 'Photo'}`}
                                >
                                    <span className="cpm-thumb-order" aria-hidden>
                                        {index + 1}
                                    </span>
                                    <img src={item.dataUrl} alt="" loading="lazy" draggable={false} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="cpm-footer">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        multiple
                        className="cpm-file-input"
                        onChange={(e) => {
                            const files = filesFromInput(e.target.files);
                            if (files.length) onUploadFiles?.(files);
                            e.target.value = '';
                        }}
                    />
                    <button type="button" className="cpm-btn-secondary" onClick={() => onClose?.()}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="cpm-btn-secondary"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                    >
                        Add more
                    </button>
                </footer>
            </div>
        </div>
    );
}
