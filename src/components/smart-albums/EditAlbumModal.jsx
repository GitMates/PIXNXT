import React, { useEffect, useState } from 'react';
import DatePicker from '../ui/DatePicker/DatePicker';
import {
    categoryTagsFromCollection,
    normalizeCategoryTagsFromString,
} from '../../lib/categoryTags';
import '../features/ClientGallery/EditCollectionModal.css';

const STATUS_OPTIONS = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
];

export default function EditAlbumModal({ album, isOpen, onClose, onSave, onAdvanced, saving }) {
    const [name, setName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [status, setStatus] = useState('draft');
    const [categoryTags, setCategoryTags] = useState('');

    useEffect(() => {
        if (!album || !isOpen) return;
        setName(album.name || '');
        setEventDate(album.event_date ? album.event_date.slice(0, 10) : '');
        setStatus(album.status === 'published' ? 'published' : 'draft');
        setCategoryTags(categoryTagsFromCollection(album).join(', '));
    }, [album, isOpen]);

    if (!isOpen || !album) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name: name.trim(),
            event_date: eventDate || null,
            status,
            category_tags: normalizeCategoryTagsFromString(categoryTags),
        });
    };

    return (
        <div className="ecm-overlay" onClick={onClose}>
            <div className="ecm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="eam-title">
                <div className="ecm-header">
                    <h2 id="eam-title" className="ecm-title">EDIT ALBUM</h2>
                    <button type="button" className="ecm-close" onClick={onClose} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form className="ecm-body" onSubmit={handleSubmit}>
                    <div className="ecm-field">
                        <label className="ecm-label" htmlFor="eam-name">Album Name</label>
                        <input
                            id="eam-name"
                            type="text"
                            className="ecm-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="ecm-row">
                        <div className="ecm-field ecm-field--half">
                            <label className="ecm-label">Event Date</label>
                            <DatePicker value={eventDate} onChange={setEventDate} placeholder="MM/DD/YYYY" />
                        </div>
                        <div className="ecm-field ecm-field--half">
                            <label className="ecm-label" htmlFor="eam-status">Status</label>
                            <div className="ecm-select-wrap">
                                <select
                                    id="eam-status"
                                    className="ecm-select"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <svg className="ecm-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="ecm-field">
                        <label className="ecm-label" htmlFor="eam-tags">Category Tags</label>
                        <input
                            id="eam-tags"
                            type="text"
                            className="ecm-input"
                            placeholder="Select or enter tags"
                            value={categoryTags}
                            onChange={(e) => setCategoryTags(e.target.value)}
                        />
                    </div>

                    <div className="ecm-footer">
                        <button
                            type="button"
                            className="ecm-advanced"
                            onClick={() => {
                                onClose();
                                onAdvanced?.(album);
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            Advanced Settings
                        </button>
                        <div className="ecm-actions">
                            <button type="button" className="ecm-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="ecm-save" disabled={saving || !name.trim()}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
