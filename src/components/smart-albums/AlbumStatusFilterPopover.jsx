import React from 'react';
import './AlbumStatusFilterPopover.css';

export const ALBUM_STATUS_FILTER_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'awaiting', label: 'Not opened' },
    { value: 'feedback', label: 'Awaiting feedback' },
    { value: 'revision', label: 'Revision requested' },
    { value: 'approved', label: 'Approved' },
    { value: 'paused', label: 'Paused' },
];

export function normalizeStatusFilters(value) {
    if (Array.isArray(value)) {
        const first = value.find(Boolean);
        return first ? [first] : [];
    }
    if (!value || value === 'all') return [];
    return [value];
}

export function getAlbumStatusFilterLabel(value) {
    const selected = normalizeStatusFilters(value);
    if (selected.length === 0) return 'Filter';
    return (
        ALBUM_STATUS_FILTER_OPTIONS.find((option) => option.value === selected[0])?.label || 'Filter'
    );
}

export function albumMatchesStatusFilters(tone, value) {
    const selected = normalizeStatusFilters(value);
    if (selected.length === 0) return true;
    return selected[0] === tone;
}

export default function AlbumStatusFilterPopover({ open, value, onChange, onClose }) {
    if (!open) return null;

    const selected = normalizeStatusFilters(value);
    const selectedValue = selected[0] || null;

    const selectStatus = (status) => {
        if (selectedValue === status) {
            onChange([]);
        } else {
            onChange([status]);
        }
        onClose?.();
    };

    return (
        <div className="sa-status-filter" role="listbox" aria-label="Filter albums">
            {ALBUM_STATUS_FILTER_OPTIONS.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`sa-status-filter__option${isSelected ? ' sa-status-filter__option--selected' : ''}`}
                        onClick={() => selectStatus(option.value)}
                    >
                        <span className="sa-status-filter__option-label">{option.label}</span>
                        {isSelected ? <span className="sa-status-filter__tick" aria-hidden>✓</span> : null}
                    </button>
                );
            })}
        </div>
    );
}
