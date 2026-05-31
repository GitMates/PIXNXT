import React from 'react';
import { removeSwapMark, resolveSlotLabel } from './albumSwapMarks';

function IconLock() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export default function AlbumSwapMarksPanel({
    albumId,
    marks = [],
    gridLayout = 'two-page',
    variant = 'embedded',
}) {
    const isPanel = variant === 'panel';

    if (!marks.length) {
        if (!isPanel) return null;
        return (
            <p className="ae-panel-text ae-panel-text--muted ae-swap-marks-empty">
                No swap marks yet. Hover a placed photo on the spread and click Swap to mark a pair.
            </p>
        );
    }

    return (
        <div className={`ae-swap-marks${isPanel ? ' ae-swap-marks--panel' : ''}`}>
            {!isPanel && (
                <>
                    <h4 className="ae-swap-marks-title">Swap marks ({marks.length})</h4>
                    <p className="ae-swap-marks-lead">
                        Locked swap requests — photos stay in place until you apply them.
                    </p>
                </>
            )}
            {isPanel && (
                <p className="ae-swap-marks-count" role="status">
                    {marks.length} locked mark{marks.length === 1 ? '' : 's'}
                </p>
            )}
            <ul className="ae-swap-marks-list">
                {marks.map((mark) => {
                    const labelA = mark.labelA || resolveSlotLabel(mark.a, gridLayout);
                    const labelB = mark.labelB || resolveSlotLabel(mark.b, gridLayout);
                    const locked = mark.locked !== false;
                    return (
                        <li
                            key={mark.id}
                            className={`ae-swap-marks-item${locked ? ' ae-swap-marks-item--locked' : ''}`}
                        >
                            <span className="ae-swap-marks-pair">
                                {locked && (
                                    <span className="ae-swap-marks-lock" aria-hidden>
                                        <IconLock />
                                    </span>
                                )}
                                {labelA} ↔ {labelB}
                            </span>
                            <button
                                type="button"
                                className="ae-swap-marks-remove"
                                onClick={() => removeSwapMark(albumId, mark.id)}
                                aria-label={`Unlock swap mark ${labelA} with ${labelB}`}
                            >
                                Unlock
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
