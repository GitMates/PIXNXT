import React from 'react';

function IconLock({ className }) {
    return (
        <svg
            className={className}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function IconSwap({ className }) {
    return (
        <svg
            className={className}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M7 16V4M7 4 3 8M7 4l4 4" />
            <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
        </svg>
    );
}

export default function AlbumSwapMarkBadge({ markInfo }) {
    if (!markInfo) return null;

    const locked = markInfo.locked !== false;

    return (
        <span
            className={`ab-swap-mark-badge${locked ? ' ab-swap-mark-badge--locked' : ''}`}
            aria-label={
                locked
                    ? `Locked swap: ${markInfo.slotLabel} with ${markInfo.partnerLabel}`
                    : `Swap: ${markInfo.slotLabel} with ${markInfo.partnerLabel}`
            }
        >
            <span className="ab-swap-mark-badge-header">
                <span className="ab-swap-mark-badge-icon">
                    {locked ? <IconLock /> : <IconSwap />}
                </span>
                <span className="ab-swap-mark-badge-kicker">
                    {locked ? 'Swap locked' : 'Swap marked'}
                </span>
            </span>
            <span className="ab-swap-mark-badge-row">
                <span className="ab-swap-mark-badge-slot">{markInfo.slotLabel}</span>
                <span className="ab-swap-mark-badge-arrow" aria-hidden>
                    ↔
                </span>
                <span className="ab-swap-mark-badge-partner">{markInfo.partnerLabel}</span>
            </span>
        </span>
    );
}
