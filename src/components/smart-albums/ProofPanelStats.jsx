import React from 'react';

function formatStatValue(value) {
    return String(Math.max(0, value)).padStart(2, '0');
}

export default function ProofPanelStats({
    unresolved = 0,
    total = 0,
    totalLabel = 'Total',
    compact = false,
}) {
    const hasUnresolved = unresolved > 0;

    return (
        <div
            className={`ae-proof-stats${compact ? ' ae-proof-stats--compact' : ''}`}
            role="status"
            aria-label={`${unresolved} unresolved, ${total} ${totalLabel.toLowerCase()}`}
        >
            <div className={`ae-proof-stat${hasUnresolved ? ' ae-proof-stat--active' : ''}`}>
                <span className="ae-proof-stat-value">{formatStatValue(unresolved)}</span>
                <span className="ae-proof-stat-label">Unresolved</span>
            </div>
            <div className="ae-proof-stat">
                <span className="ae-proof-stat-value">{formatStatValue(total)}</span>
                <span className="ae-proof-stat-label">{totalLabel}</span>
            </div>
        </div>
    );
}
