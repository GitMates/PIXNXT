import React, { useEffect, useMemo, useState } from 'react';
import './BulkEditCollectionsModal.css';

const STATUS_OPTIONS = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Hidden' },
];

const SETTINGS = [
    { id: 'status', label: 'Status' },
    { id: 'tags', label: 'Category Tags' },
    { id: 'homepage', label: 'Show on Homepage' },
    { id: 'email', label: 'Email Registration' },
    { id: 'sharing', label: 'Social Sharing Buttons' },
    { id: 'downloads', label: 'Photo Download Status' },
];

export function BulkEditCollectionsModal({ isOpen, count, onClose, onApply, applying }) {
    const [activeSetting, setActiveSetting] = useState(null);
    const [status, setStatus] = useState('');
    const [tags, setTags] = useState('');
    const [showOnHomepage, setShowOnHomepage] = useState(null);
    const [emailRegistration, setEmailRegistration] = useState(null);
    const [socialSharing, setSocialSharing] = useState(null);
    const [downloadsEnabled, setDownloadsEnabled] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setActiveSetting(null);
        setStatus('');
        setTags('');
        setShowOnHomepage(null);
        setEmailRegistration(null);
        setSocialSharing(null);
        setDownloadsEnabled(null);
    }, [isOpen]);

    const payload = useMemo(() => {
        const next = {};
        if (status) next.status = status;
        if (tags.trim()) next.description = tags.trim();
        if (showOnHomepage !== null) next.show_on_homepage = showOnHomepage;
        if (emailRegistration !== null) next.email_capture_enabled = emailRegistration;
        if (socialSharing !== null) next.social_sharing_enabled = socialSharing;
        if (downloadsEnabled !== null) next.downloads_enabled = downloadsEnabled;
        return next;
    }, [status, tags, showOnHomepage, emailRegistration, socialSharing, downloadsEnabled]);

    const canApply = Object.keys(payload).length > 0;

    if (!isOpen) return null;

    const renderPanel = () => {
        if (!activeSetting) {
            return (
                <p className="bec-empty">Select settings from the left to modify your collection{count === 1 ? '' : 's'}.</p>
            );
        }

        switch (activeSetting) {
            case 'status':
                return (
                    <div className="bec-panel-field">
                        <label className="bec-label" htmlFor="bec-status">Status</label>
                        <select id="bec-status" className="bec-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Select an option</option>
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                );
            case 'tags':
                return (
                    <div className="bec-panel-field">
                        <label className="bec-label" htmlFor="bec-tags">Category Tags</label>
                        <input
                            id="bec-tags"
                            type="text"
                            className="bec-input"
                            placeholder="Select tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>
                );
            case 'homepage':
                return (
                    <ToggleRow
                        label="Show on Homepage"
                        value={showOnHomepage}
                        onChange={setShowOnHomepage}
                    />
                );
            case 'email':
                return (
                    <ToggleRow
                        label="Email Registration"
                        value={emailRegistration}
                        onChange={setEmailRegistration}
                    />
                );
            case 'sharing':
                return (
                    <ToggleRow
                        label="Social Sharing Buttons"
                        value={socialSharing}
                        onChange={setSocialSharing}
                    />
                );
            case 'downloads':
                return (
                    <ToggleRow
                        label="Photo Download"
                        value={downloadsEnabled}
                        onChange={setDownloadsEnabled}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="bec-overlay" onClick={onClose}>
            <div className="bec-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="bec-title">
                <div className="bec-header">
                    <h2 id="bec-title" className="bec-title">BULK EDIT</h2>
                    <button type="button" className="bec-close" onClick={onClose} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="bec-body">
                    <aside className="bec-sidebar">
                        <p className="bec-sidebar-heading">Collection Settings</p>
                        <ul className="bec-sidebar-list">
                            {SETTINGS.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={`bec-sidebar-item${activeSetting === item.id ? ' bec-sidebar-item--active' : ''}`}
                                        onClick={() => setActiveSetting(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <div className="bec-panel">{renderPanel()}</div>
                </div>

                <div className="bec-footer">
                    <button type="button" className="bec-cancel" onClick={onClose}>Cancel</button>
                    <button
                        type="button"
                        className="bec-apply"
                        disabled={!canApply || applying}
                        onClick={() => onApply(payload)}
                    >
                        {applying ? 'Applying…' : `Apply to ${count} collection${count === 1 ? '' : 's'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleRow({ label, value, onChange }) {
    return (
        <div className="bec-toggle-block">
            <div className="bec-toggle-row">
                <span className="bec-toggle-label">{label}</span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={value === true}
                    className={`bec-toggle${value === true ? ' bec-toggle--on' : ''}`}
                    onClick={() => onChange(value === true ? false : true)}
                >
                    <span className="bec-toggle-knob" />
                </button>
                <span className="bec-toggle-state">{value === true ? 'On' : value === false ? 'Off' : 'Not set'}</span>
            </div>
            <p className="bec-toggle-hint">Toggle to set this value for all selected collections.</p>
        </div>
    );
}
