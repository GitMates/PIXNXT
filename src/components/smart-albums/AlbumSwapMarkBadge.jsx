import React from 'react';

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

    return (
        <span
            className="ab-swap-mark-badge"
            aria-label={`Swap: ${markInfo.slotLabel} with ${markInfo.partnerLabel}`}
        >
            <span className="ab-swap-mark-badge-icon">
                <IconSwap />
            </span>
            <span className="ab-swap-mark-badge-row">
                <span className="ab-swap-mark-badge-kicker">Swap</span>
                <span className="ab-swap-mark-badge-slot">{markInfo.slotLabel}</span>
                <span className="ab-swap-mark-badge-arrow" aria-hidden>
                    ↔
                </span>
                <span className="ab-swap-mark-badge-partner">{markInfo.partnerLabel}</span>
            </span>
        </span>
    );
}
