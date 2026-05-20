import React, { useEffect, useState } from 'react';
import './EditCollectionModal.css';

const STATUS_OPTIONS = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Hidden' },
];

function BulkModalShell({ title, count, isOpen, onClose, onApply, applying, applyDisabled, children }) {
    if (!isOpen) return null;

    return (
        <div className="ecm-overlay" onClick={onClose}>
            <div className="ecm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="bulk-modal-title">
                <div className="ecm-header">
                    <h2 id="bulk-modal-title" className="ecm-title">{title}</h2>
                    <button type="button" className="ecm-close" onClick={onClose} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <div className="ecm-body">
                    {children}
                    <div className="ecm-footer" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
                        <div className="ecm-actions">
                            <button type="button" className="ecm-cancel" onClick={onClose}>Cancel</button>
                            <button
                                type="button"
                                className="ecm-save"
                                disabled={applying || applyDisabled}
                                onClick={onApply}
                            >
                                {applying ? 'Applying…' : `Apply to ${count} collection${count === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function BulkCollectionStatusModal({ isOpen, count, onClose, onApply, applying }) {
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (isOpen) setStatus('');
    }, [isOpen]);

    return (
        <BulkModalShell
            title="EDIT COLLECTION STATUS"
            count={count}
            isOpen={isOpen}
            onClose={onClose}
            onApply={() => onApply({ status })}
            applying={applying}
            applyDisabled={!status}
        >
            <div className="ecm-field">
                <label className="ecm-label" htmlFor="bulk-status">Status</label>
                <div className="ecm-select-wrap">
                    <select
                        id="bulk-status"
                        className="ecm-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">Select an option</option>
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <svg className="ecm-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
            </div>
        </BulkModalShell>
    );
}

export function BulkCollectionTagsModal({ isOpen, count, onClose, onApply, applying }) {
    const [tags, setTags] = useState('');

    useEffect(() => {
        if (isOpen) setTags('');
    }, [isOpen]);

    return (
        <BulkModalShell
            title="EDIT CATEGORY TAGS"
            count={count}
            isOpen={isOpen}
            onClose={onClose}
            onApply={() => onApply({ description: tags.trim() || null })}
            applying={applying}
            applyDisabled={false}
        >
            <div className="ecm-field">
                <label className="ecm-label" htmlFor="bulk-tags">Category Tags</label>
                <input
                    id="bulk-tags"
                    type="text"
                    className="ecm-input"
                    placeholder="Select tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                />
            </div>
        </BulkModalShell>
    );
}
