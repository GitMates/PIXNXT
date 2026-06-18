import React from 'react';
import {
    countUnseenSwapMarks,
    getSlotLabel,
    isSwapMarkUnseen,
    markSwapMarksSeen,
    parseSlotKey,
    removeSwapMark,
    resolveSlotLabel,
} from './albumSwapMarks';
import ProofDoneButton from './ProofDoneButton';
import ProofPanelStats from './ProofPanelStats';

export default function AlbumSwapMarksPanel({
    albumId,
    album = null,
    totalPages = 0,
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

    const handleOpenSlot = (slotKey) => {
        onNavigateToSlotKey?.(slotKey);
    };

    const handleCompleteMark = (mark) => {
        markSwapMarksSeen(albumId, [mark]);
    };

    const labelForSlotKey = (key, storedLabel) => {
        if (album && totalPages > 0) {
            const { pageNum, cellId } = parseSlotKey(key);
            const whole =
                (gridLayout === 'whole-spread' && pageNum > 0) ||
                /\b(Whole|Both)\b/i.test(storedLabel || '');
            return getSlotLabel(pageNum, cellId, whole, totalPages, album);
        }
        return storedLabel || resolveSlotLabel(key, gridLayout);
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
                <ProofPanelStats
                    unresolved={unseenCount}
                    total={sortedMarks.length}
                    totalLabel="Total swaps"
                />
            )}
            <ul className="ae-swap-marks-list">
                {sortedMarks.map((mark) => {
                    const labelA = labelForSlotKey(mark.a, mark.labelA);
                    const labelB = labelForSlotKey(mark.b, mark.labelB);
                    const createdAtLabel = mark.createdAt
                        ? new Date(mark.createdAt).toLocaleString()
                        : null;
                    const unseen = isSwapMarkUnseen(albumId, mark);
                    const doneAria = unseen
                        ? `Mark swap request ${labelA} with ${labelB} complete`
                        : `Swap request ${labelA} with ${labelB} already complete`;
                    return (
                        <li
                            key={mark.id}
                            className={`ae-swap-marks-item ae-swap-marks-card${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <div className="ae-proof-item-top-right">
                                <ProofDoneButton
                                    completed={!unseen}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCompleteMark(mark);
                                    }}
                                    ariaLabel={doneAria}
                                />
                            </div>
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
                                        onClick={() => handleOpenSlot(mark.a)}
                                    >
                                        {labelA}
                                    </button>
                                    <span className="ae-swap-marks-route-arrow" aria-hidden>
                                        ↔
                                    </span>
                                    <button
                                        type="button"
                                        className="ae-swap-marks-slot-chip"
                                        onClick={() => handleOpenSlot(mark.b)}
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
                                <div className="ae-proof-item-actions">
                                    <button
                                        type="button"
                                        className="ae-swap-marks-remove"
                                        onClick={() => {
                                            removeSwapMark(albumId, mark.id);
                                        }}
                                        aria-label={`Remove swap request ${labelA} with ${labelB}`}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
