import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag } from 'lucide-react';
import DatePicker from '../../ui/DatePicker/DatePicker';
import {
    categoryTagsFromCollection,
    normalizeCategoryTagsFromString,
} from '../../../lib/categoryTags';
import { cn } from '../../../lib/utils';
import './EditCollectionModal.css';

const STATUS_OPTIONS = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Hidden' },
];

const PRESET_TAGS = ['Wedding', 'Portrait', 'Editorial', 'Engagement', 'Family', 'Fashion', 'Maternity'];

export function EditCollectionModal({ collection, isOpen, onClose, onSave, onAdvanced, saving }) {
    const [name, setName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [status, setStatus] = useState('draft');
    const [categoryTags, setCategoryTags] = useState('');
    const [showOnShowcase, setShowOnShowcase] = useState(false);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (!collection || !isOpen) return;
        setName(collection.name || '');
        setEventDate(collection.event_date ? collection.event_date.slice(0, 10) : '');
        setStatus(collection.status || 'draft');
        setCategoryTags(collection.description || categoryTagsFromCollection(collection).join(', '));
        setShowOnShowcase(collection.show_on_showcase !== false);
        setTagInput('');
    }, [collection, isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        function onKey(e) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen || !collection) return null;

    const tags = normalizeCategoryTagsFromString(categoryTags);

    const addTag = (tag) => {
        const t = tag.trim();
        if (!t) return;
        const next = normalizeCategoryTagsFromString(
            [...tags, t].join(', ')
        );
        setCategoryTags(next.join(', '));
        setTagInput('');
    };

    const removeTag = (tag) => {
        setCategoryTags(tags.filter((t) => t !== tag).join(', '));
    };

    const onTagKeyDown = (e) => {
        if (e.nativeEvent.isComposing) return;
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tags.length) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name: name.trim(),
            event_date: eventDate || null,
            status,
            category_tags: normalizeCategoryTagsFromString(categoryTags),
            show_on_showcase: showOnShowcase,
        });
    };

    const suggestions = PRESET_TAGS.filter(
        (t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()),
    );

    return createPortal(
        <>
            <div className="ecm-backdrop" onClick={onClose} aria-hidden="true" />
            <aside className="ecm-drawer" role="dialog" aria-labelledby="ecm-title">
                <div className="ecm-drawer-header">
                    <div>
                        <p className="ecm-eyebrow">Delivery</p>
                        <h2 id="ecm-title" className="ecm-drawer-title">Edit Details</h2>
                    </div>
                    <button type="button" className="ecm-close" onClick={onClose} aria-label="Close panel">
                        <X className="size-4" />
                    </button>
                </div>

                <form className="ecm-drawer-body" onSubmit={handleSubmit}>
                    <div className="ecm-field">
                        <label className="ecm-label" htmlFor="ecm-name">Delivery Name</label>
                        <input
                            id="ecm-name"
                            type="text"
                            className="ecm-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="ecm-field">
                        <label className="ecm-label">Event Date</label>
                        <DatePicker value={eventDate} onChange={setEventDate} placeholder="MM/DD/YYYY" />
                    </div>

                    <div className="ecm-field">
                        <label className="ecm-label" htmlFor="ecm-status">Status</label>
                        <select
                            id="ecm-status"
                            className="ecm-input"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="ecm-toggle-card">
                        <div className="min-w-0">
                            <p className="ecm-toggle-title">Show in Showcase</p>
                            <p className="ecm-toggle-hint">Display this delivery on your public portfolio page</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={showOnShowcase}
                            onClick={() => setShowOnShowcase((v) => !v)}
                            className={cn('ecm-toggle', showOnShowcase && 'ecm-toggle--on')}
                        >
                            <span className="ecm-toggle-knob" />
                        </button>
                    </div>

                    <div className="ecm-field">
                        <label className="ecm-label">Delivery Tags</label>
                        <div className="ecm-tag-input">
                            {tags.map((tag) => (
                                <span key={tag} className="ecm-tag-chip">
                                    <Tag className="size-2.5 text-neutral-400" />
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={onTagKeyDown}
                                placeholder={tags.length === 0 ? 'Add tags…' : ''}
                                className="ecm-tag-text"
                            />
                        </div>
                        {(tagInput ? suggestions : PRESET_TAGS.filter((t) => !tags.includes(t))).length > 0 && (
                            <div className="ecm-tag-suggestions">
                                {(tagInput ? suggestions : PRESET_TAGS.filter((t) => !tags.includes(t))).map((s) => (
                                    <button key={s} type="button" className="ecm-tag-suggestion" onClick={() => addTag(s)}>
                                        {tagInput ? `+ ${s}` : s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="ecm-advanced"
                        onClick={() => {
                            onClose();
                            onAdvanced?.(collection);
                        }}
                    >
                        Advanced Settings
                    </button>
                </form>

                <div className="ecm-drawer-footer">
                    <button type="button" className="ecm-cancel" onClick={onClose}>Cancel</button>
                    <button type="submit" className="ecm-save" disabled={saving || !name.trim()} onClick={handleSubmit}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </aside>
        </>,
        document.body,
    );
}
