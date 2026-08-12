import React from 'react';
import { Check, X } from 'lucide-react';
import './AlbumStatusFilterPopover.css';

export const ALBUM_STATUS_FILTER_OPTIONS = [
    { value: 'draft', label: 'Draft', dotClass: 'sa-status-filter__dot--draft' },
    { value: 'awaiting', label: 'Not opened', dotClass: 'sa-status-filter__dot--awaiting' },
    { value: 'feedback', label: 'Awaiting feedback', dotClass: 'sa-status-filter__dot--feedback' },
    { value: 'revision', label: 'Revision requested', dotClass: 'sa-status-filter__dot--revision' },
    { value: 'approved', label: 'Approved', dotClass: 'sa-status-filter__dot--approved' },
    { value: 'paused', label: 'Paused', dotClass: 'sa-status-filter__dot--paused' },
];

export function normalizeStatusFilters(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value || value === 'all') return [];
    return [value];
}

export function getAlbumStatusFilterLabel(value) {
    const selected = normalizeStatusFilters(value);
    if (selected.length === 0) return 'Filter';
    if (selected.length === 1) {
        return (
            ALBUM_STATUS_FILTER_OPTIONS.find((option) => option.value === selected[0])?.label ||
            'Filter'
        );
    }
    return `${selected.length} statuses`;
}

export function albumMatchesStatusFilters(tone, value) {
    const selected = normalizeStatusFilters(value);
    if (selected.length === 0) return true;
    return selected.includes(tone);
}

export default function AlbumStatusFilterPopover({
    open,
    value,
    onChange,
    onClear,
    onClose,
}) {
    if (!open) return null;

    const selected = normalizeStatusFilters(value);
    const selectedSet = new Set(selected);
    const hasFilter = selected.length > 0;

    const toggleStatus = (status) => {
        const next = selectedSet.has(status)
            ? selected.filter((item) => item !== status)
            : [...selected, status];
        onChange(next);
    };

    return (
        <div className="sa-status-filter" role="dialog" aria-label="Filter albums">
            <div className="sa-status-filter__header">
                <div>
                    <h2 className="sa-status-filter__title">Filter albums</h2>
                    <p className="sa-status-filter__hint">Select one or more statuses</p>
                </div>
                <button
                    type="button"
                    className="sa-status-filter__close"
                    onClick={onClose}
                    aria-label="Close filters"
                >
                    <X size={15} strokeWidth={2} />
                </button>
            </div>

            <div className="sa-status-filter__body">
                <p className="sa-status-filter__section-label">Album status</p>
                <ul className="sa-status-filter__list" role="listbox" aria-multiselectable="true" aria-label="Album status">
                    {ALBUM_STATUS_FILTER_OPTIONS.map((option) => {
                        const isSelected = selectedSet.has(option.value);
                        return (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`sa-status-filter__option${isSelected ? ' sa-status-filter__option--selected' : ''}`}
                                    onClick={() => toggleStatus(option.value)}
                                >
                                    <span
                                        className={`sa-status-filter__check${isSelected ? ' sa-status-filter__check--on' : ''}`}
                                        aria-hidden
                                    >
                                        {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                                    </span>
                                    <span className={`sa-status-filter__dot ${option.dotClass}`} aria-hidden />
                                    <span className="sa-status-filter__option-label">{option.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {hasFilter ? (
                <div className="sa-status-filter__footer">
                    <button type="button" className="sa-status-filter__clear" onClick={onClear}>
                        Clear all
                    </button>
                    <span className="sa-status-filter__count">
                        {selected.length} selected
                    </span>
                </div>
            ) : null}
        </div>
    );
}
