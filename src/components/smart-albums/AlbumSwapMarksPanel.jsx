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

    const sortedMarks = [...marks].sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const handleOpenSlot = (mark, slotKey) => {
        markSwapMarksSeen(albumId, [mark]);
        onNavigateToSlotKey?.(slotKey);
    };

    if (!sortedMarks.length) {
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
                    <h4 className="ae-swap-marks-title">Swap requests ({sortedMarks.length})</h4>
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
                    {sortedMarks.length} swap request{sortedMarks.length === 1 ? '' : 's'}
                    {unseenCount > 0 && (
                        <span className="ae-proof-new-pill">
                            {unseenCount} new
                        </span>
                    )}
                </p>
            )}
            <ul className="ae-swap-marks-list">
                {sortedMarks.map((mark) => {
                    const labelA = mark.labelA || resolveSlotLabel(mark.a, gridLayout);
                    const labelB = mark.labelB || resolveSlotLabel(mark.b, gridLayout);
                    const createdAtLabel = mark.createdAt
                        ? new Date(mark.createdAt).toLocaleString()
                        : null;
                    const unseen = isSwapMarkUnseen(albumId, mark);
                    return (
                        <li
                            key={mark.id}
                            className={`ae-swap-marks-item ae-swap-marks-card${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <div className="ae-swap-marks-body">
                                <span className="ae-swap-marks-header">
                                    Swap request
                                    {unseen && (
                                        <span className="ae-proof-new-badge">New</span>
                                    )}
                                </span>
                                <div
                                    className="ae-swap-marks-route"
                                    aria-label={`Swap ${labelA} with ${labelB}`}
                                >
                                    <button
                                        type="button"
                                        className="ae-swap-marks-slot-chip"
                                        onClick={() => handleOpenSlot(mark, mark.a)}
                                    >
                                        {labelA}
                                    </button>
                                    <span className="ae-swap-marks-route-arrow" aria-hidden>
                                        ↔
                                    </span>
                                    <button
                                        type="button"
                                        className="ae-swap-marks-slot-chip"
                                        onClick={() => handleOpenSlot(mark, mark.b)}
                                    >
                                        {labelB}
                                    </button>
                                </div>
                            </div>
                            <div className="ae-swap-marks-footer">
                                {createdAtLabel ? (
                                    <span className="ae-swap-marks-time">{createdAtLabel}</span>
                                ) : (
                                    <span className="ae-swap-marks-time" aria-hidden />
                                )}
                                <button
                                    type="button"
                                    className="ae-swap-marks-remove"
                                    onClick={() => {
                                        markSwapMarksSeen(albumId, [mark]);
                                        removeSwapMark(albumId, mark.id);
                                    }}
                                    aria-label={`Remove swap request ${labelA} with ${labelB}`}
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
