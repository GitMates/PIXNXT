import React from 'react';
import {
    countUnseenSwapMarks,
    isSwapMarkUnseen,
    markSwapMarksSeen,
    removeSwapMark,
    resolveSlotLabel,
} from './albumSwapMarks';

export default function AlbumSwapMarksPanel({
    albumId,
    marks = [],
    gridLayout = 'two-page',
    variant = 'embedded',
    seenTick = 0,
    onNavigateToSlotKey,
}) {
    const isPanel = variant === 'panel';
    void seenTick;

    const unseenCount = countUnseenSwapMarks(albumId, marks);

    const handleOpenSlot = (mark, slotKey) => {
        markSwapMarksSeen(albumId, [mark]);
        onNavigateToSlotKey?.(slotKey);
    };

    if (!marks.length) {
        if (!isPanel) return null;
        return (
            <p className="ae-panel-text ae-panel-text--muted ae-swap-marks-empty">
                No swap requests yet. Hover a placed photo on the spread and click Swap to mark a pair.
            </p>
        );
    }

    return (
        <div className={`ae-swap-marks${isPanel ? ' ae-swap-marks--panel' : ''}`}>
            {!isPanel && (
                <>
                    <h4 className="ae-swap-marks-title">Swap requests ({marks.length})</h4>
                    <p className="ae-swap-marks-lead">
                        Swap pairs currently requested in this album.
                    </p>
                </>
            )}
            {isPanel && (
                <p
                    className={`ae-swap-marks-count${
                        unseenCount > 0 ? ' ae-swap-marks-count--unseen' : ''
                    }`}
                    role="status"
                >
                    {marks.length} swap request{marks.length === 1 ? '' : 's'}
                    {unseenCount > 0 && (
                        <span className="ae-proof-new-pill">
                            {unseenCount} new
                        </span>
                    )}
                </p>
            )}
            <ul className="ae-swap-marks-list">
                {marks.map((mark) => {
                    const labelA = mark.labelA || resolveSlotLabel(mark.a, gridLayout);
                    const labelB = mark.labelB || resolveSlotLabel(mark.b, gridLayout);
                    const unseen = isSwapMarkUnseen(albumId, mark);
                    return (
                        <li
                            key={mark.id}
                            className={`ae-swap-marks-item${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <span className="ae-swap-marks-pair" aria-label={`Swap ${labelA} with ${labelB}`}>
                                <button
                                    type="button"
                                    className="ae-swap-marks-chip"
                                    onClick={() => handleOpenSlot(mark, mark.a)}
                                >
                                    {labelA}
                                </button>
                                <span className="ae-swap-marks-arrow" aria-hidden>
                                    ↔
                                </span>
                                <button
                                    type="button"
                                    className="ae-swap-marks-chip"
                                    onClick={() => handleOpenSlot(mark, mark.b)}
                                >
                                    {labelB}
                                </button>
                                {unseen && <span className="ae-proof-new-badge">New</span>}
                            </span>
                            <button
                                type="button"
                                className="ae-swap-marks-remove"
                                onClick={() => {
                                    markSwapMarksSeen(albumId, [mark]);
                                    removeSwapMark(albumId, mark.id);
                                }}
                                aria-label={`Delete swap request ${labelA} with ${labelB}`}
                            >
                                Delete
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
