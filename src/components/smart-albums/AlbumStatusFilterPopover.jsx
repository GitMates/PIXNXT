import React from 'react';
import { X } from 'lucide-react';
import './AlbumStatusFilterPopover.css';

export const ALBUM_STATUS_FILTER_OPTIONS = [
    { value: 'draft', label: 'Draft', dotClass: 'sa-status-filter__dot--draft' },
    { value: 'awaiting', label: 'Awaiting feedback', dotClass: 'sa-status-filter__dot--awaiting' },
    { value: 'revision', label: 'Revision requested', dotClass: 'sa-status-filter__dot--revision' },
    { value: 'approved', label: 'Approved', dotClass: 'sa-status-filter__dot--approved' },
];

export default function AlbumStatusFilterPopover({
    open,
    value,
    onChange,
    onApply,
    onClear,
    onClose,
}) {
    if (!open) return null;

    return (
        <div className="sa-status-filter" role="dialog" aria-label="Filter Albums">
            <div className="sa-status-filter__header">
                <h2 className="sa-status-filter__title">Filter Albums</h2>
                <button
                    type="button"
                    className="sa-status-filter__close"
                    onClick={onClose}
                    aria-label="Close filters"
                >
                    <X size={16} strokeWidth={2} />
                </button>
            </div>

            <div className="sa-status-filter__body">
                <p className="sa-status-filter__section-label">Album Status</p>
                <ul className="sa-status-filter__list">
                    {ALBUM_STATUS_FILTER_OPTIONS.map((option) => {
                        const selected = value === option.value;
                        return (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    className={`sa-status-filter__option${selected ? ' sa-status-filter__option--selected' : ''}`}
                                    onClick={() => onChange(selected ? 'all' : option.value)}
                                >
                                    <span className="sa-status-filter__radio" aria-hidden />
                                    <span className={`sa-status-filter__dot ${option.dotClass}`} aria-hidden />
                                    <span className="sa-status-filter__option-label">{option.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="sa-status-filter__footer">
                <button type="button" className="sa-status-filter__clear" onClick={onClear}>
                    Clear All
                </button>
                <button type="button" className="sa-status-filter__apply" onClick={onApply}>
                    Apply Filters
                </button>
            </div>
        </div>
    );
}
