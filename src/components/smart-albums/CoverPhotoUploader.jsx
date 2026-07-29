import React from 'react';
import { pickImageFiles } from '../../lib/pickImageFiles';
import './CoverPhotoUploader.css';

const COVER_ACCEPT = 'image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp';

/**
 * Cover wrap upload control.
 * Uses pickImageFiles (detached input + Windows focus polling) — React-owned
 * <input type="file"> often loses the change event for large cover images on Windows.
 */
export default function CoverPhotoUploader({
    busy = false,
    disabled = false,
    hasImage = false,
    onSelectFile = null,
}) {
    const handleClick = () => {
        if (busy || disabled || typeof onSelectFile !== 'function') return;
        pickImageFiles({
            accept: COVER_ACCEPT,
            onPick: (files) => {
                const file = files?.[0];
                if (file) void onSelectFile(file);
            },
        });
    };

    return (
        <div className={`ae-cover-upload${busy ? ' ae-cover-upload--busy' : ''}`}>
            <button
                type="button"
                className={`ae-cover-upload__label${
                    busy || disabled ? ' ae-cover-upload__label--disabled' : ''
                }`}
                disabled={busy || disabled}
                onClick={handleClick}
            >
                <svg
                    className="ae-cover-upload__icon"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="ae-cover-upload__title">
                    {busy
                        ? 'Uploading cover…'
                        : hasImage
                          ? 'Replace cover image'
                          : 'Upload cover image'}
                </span>
                <span className="ae-cover-upload__hint">
                    Applies across back, spine, and front
                </span>
            </button>
        </div>
    );
}
