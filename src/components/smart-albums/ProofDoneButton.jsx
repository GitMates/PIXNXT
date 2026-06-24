import React from 'react';

export default function ProofDoneButton({
    completed = false,
    onClick,
    ariaLabel = 'Mark as complete',
    title,
    className = '',
}) {
    return (
        <button
            type="button"
            className={`ae-proof-done-btn${completed ? ' ae-proof-done-btn--completed' : ''}${
                className ? ` ${className}` : ''
            }`}
            onClick={onClick}
            aria-label={ariaLabel}
            title={title || ariaLabel}
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
            >
                <circle className="ae-proof-done-btn__ring" cx="12" cy="12" r="9" />
                <path className="ae-proof-done-btn__check" d="M8.25 12.35L10.7 14.8L15.8 9.6" />
            </svg>
        </button>
    );
}
