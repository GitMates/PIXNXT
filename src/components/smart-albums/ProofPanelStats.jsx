import React from 'react';

function formatStatValue(value) {
    return String(Math.max(0, value)).padStart(2, '0');
}

export default function ProofPanelStats({ unresolved = 0, total = 0, totalLabel = 'Total' }) {
    return (
        <div className="ae-proof-stats" role="status">
            <div className="ae-proof-stat">
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
