import React, { useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    isEndHalfSpreadIndex,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import {
    enumerateAlbumPhotoSlots,
    getLockedSlotKeys,
    getSwapPickerDockSide,
    makeSlotKey,
    slotsMatch,
} from './albumSwapMarks';
import './AlbumSwapMarks.css';
import './AlbumBook.css';

function getOverviewPageImage(album, pageNum, totalPages, showSamples) {
    const albumId = album?.id;
    const spreadOpts = getSpreadContext(album, totalPages);
    if (pageNum === 0 && spreadOpts.hasCovers) {
        return resolveCoverImageSrc(album, { showSamples });
    }
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const spreadCtx = getSpreadContext(album, totalPages);
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread: isWholeSpreadLayout(album?.grid_layout),
        spreadOpts: spreadCtx,
    });
    return slot.src || (showSamples ? getSampleImageForPage(pageNum) : null);
}

function slotsForSpread(spreadIndex, allSlots, totalPages, spreadOpts) {
    const { left } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    return allSlots.filter((slot) => {
        const spreadLeft =
            slot.spreadLeft ??
            getSpreadLeftPageIndex(slot.pageNum, { ...spreadOpts, totalPages });
        return spreadLeft === left;
    });
}

function pickSwapTargetSlot(availableSlots, originSlot) {
    if (!availableSlots.length) return null;
    if (originSlot?.whole) {
        return availableSlots.find((slot) => slot.whole) || availableSlots[0];
    }
    if (originSlot?.cellId === 2) {
        return availableSlots.find((slot) => slot.cellId === 2) || availableSlots[0];
    }
    if (originSlot?.cellId === 1) {
        return availableSlots.find((slot) => slot.cellId === 1) || availableSlots[0];
    }
    return availableSlots[0];
}

function spreadOverviewLabel(spreadIndex, totalPages, spreadOpts) {
    if (spreadOpts.hasCovers && spreadIndex === 0) return 'Cover';
    if (isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)) return 'Back';
    if (spreadOpts.hasCovers) return String(spreadIndex);
    return String(spreadIndex + 1);
}

function isInnerSwapSpread(spreadIndex, totalPages, spreadOpts) {
    if (spreadOpts.hasCovers && spreadIndex === 0) return false;
    if (isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)) return false;
    return true;
}

function SwapSpreadThumb({ album, spreadIndex, totalPages, spreadOpts, showSamples }) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const isCover = spreadOpts.hasCovers && spreadIndex === 0;
    const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
    const leftSrc = getOverviewPageImage(album, left, totalPages, showSamples);
    const rightSrc =
        right !== left ? getOverviewPageImage(album, right, totalPages, showSamples) : null;
    const spreadSrc =
        !isCover && !isEndSpread ? getSpreadPhotoOverride(album?.id, left) : null;
    const coverSrc =
        isCover || isEndSpread
            ? getSpreadPhotoOverride(album?.id, 0) ||
              resolveCoverImageSrc(album, { showSamples })
            : null;
    const showSpreadFull = Boolean(spreadSrc);

    return (
        <span className="ab-overview-thumb ab-overview-thumb--spread">
            {showSpreadFull ? (
                <span className="ab-overview-page ab-overview-page--spread-full">
                    <img src={spreadSrc} alt="" draggable={false} />
                </span>
            ) : isCover && coverSrc ? (
                <span className="ab-overview-page ab-overview-page--cover-single">
                    <img src={coverSrc} alt="" draggable={false} />
                </span>
            ) : isCover ? (
                <span className="ab-overview-page ab-overview-page--cover-single">
                    {rightSrc || leftSrc ? (
                        <img src={rightSrc || leftSrc} alt="" draggable={false} />
                    ) : (
                        <span className="ab-overview-placeholder" />
                    )}
                </span>
            ) : isEndSpread && coverSrc ? (
                <span className="ab-overview-page ab-overview-page--end-single">
                    <img src={coverSrc} alt="" draggable={false} />
                </span>
            ) : isEndSpread ? (
                <span className="ab-overview-page ab-overview-page--end-single">
                    {leftSrc ? (
                        <img src={leftSrc} alt="" draggable={false} />
                    ) : (
                        <span className="ab-overview-placeholder" />
                    )}
                </span>
            ) : (
                <>
                    <span className="ab-overview-page">
                        {leftSrc ? (
                            <img src={leftSrc} alt="" draggable={false} />
                        ) : (
                            <span className="ab-overview-placeholder" />
                        )}
                    </span>
                    {!spreadSrc && (
                        <span className="ab-overview-page">
                            {rightSrc ? (
                                <img src={rightSrc} alt="" draggable={false} />
                            ) : (
                                <span className="ab-overview-placeholder" />
                            )}
                        </span>
                    )}
                </>
            )}
        </span>
    );
}

function getSwapPanelVerticalBounds(bookEl) {
    const verticalAnchor =
        bookEl.closest('.av-preview-book-section') ||
        bookEl.closest('.ae-canvas-stage') ||
        bookEl.closest('.ab-book-stage') ||
        bookEl.closest('.ab-root');
    const bookRect = bookEl.getBoundingClientRect();
    const anchorRect = verticalAnchor?.getBoundingClientRect?.();
    const top = anchorRect?.height > 0 ? anchorRect.top : bookRect.top;

    return {
        top,
        bookHeight: bookRect.height,
    };
}

export default function AlbumSwapPickerModal({
    open,
    album,
    albumId,
    totalPages,
    originSlot,
    swapMarks = [],
    showSamples = false,
    bookAnchorRef = null,
    onSelect,
    onClose,
}) {
    const [panelStyle, setPanelStyle] = useState(null);

    const gridLayout = album?.grid_layout || 'two-page';
    const spreadOpts = useMemo(
        () => getSpreadContext(album, totalPages),
        [album, totalPages]
    );
    const slots = useMemo(
        () => enumerateAlbumPhotoSlots(totalPages, gridLayout, spreadOpts, album),
        [totalPages, gridLayout, spreadOpts, album]
    );
    const lockedKeys = useMemo(() => getLockedSlotKeys(swapMarks), [swapMarks]);
    const dockSide = getSwapPickerDockSide(originSlot);
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);

    const spreadRows = useMemo(() => {
        return Array.from({ length: totalSpreads }, (_, spreadIndex) => {
            if (!isInnerSwapSpread(spreadIndex, totalPages, spreadOpts)) return null;
            const spreadSlots = slotsForSpread(spreadIndex, slots, totalPages, spreadOpts);
            const availableSlots = spreadSlots.filter((slot) => {
                const slotKey = makeSlotKey(slot.pageNum, slot.cellId);
                if (slotsMatch(slot, originSlot)) return false;
                if (lockedKeys.has(slotKey)) return false;
                return true;
            });
            const targetSlot = pickSwapTargetSlot(availableSlots, originSlot);
            const isOrigin = spreadSlots.some((slot) => slotsMatch(slot, originSlot));
            const isLocked = spreadSlots.length > 0 && !targetSlot && !isOrigin;
            const disabled = !targetSlot;

            return {
                spreadIndex,
                spreadSlots,
                targetSlot,
                isOrigin,
                isLocked,
                disabled,
                label: spreadOverviewLabel(spreadIndex, totalPages, spreadOpts),
                isCover: spreadOpts.hasCovers && spreadIndex === 0,
                isEnd: isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts),
            };
        }).filter(Boolean);
    }, [totalSpreads, slots, totalPages, spreadOpts, originSlot, lockedKeys]);

    useLayoutEffect(() => {
        if (!open || !originSlot) {
            setPanelStyle(null);
            return undefined;
        }

        const updatePosition = () => {
            const bookEl = bookAnchorRef?.current;
            if (!bookEl) {
                setPanelStyle(null);
                return;
            }

            const rect = bookEl.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const vertical = getSwapPanelVerticalBounds(bookEl);
            const panelWidth = Math.round(rect.width / 2);
            const thumbHeight = Math.round(vertical.bookHeight * 0.44);

            const base = {
                top: vertical.top,
                bottom: 0,
                width: panelWidth,
                '--ab-swap-thumb-h': `${thumbHeight}px`,
                '--ab-overview-thumb-h': `${thumbHeight}px`,
                '--ab-overview-thumb-w': `${panelWidth - 36}px`,
            };

            if (dockSide === 'left') {
                setPanelStyle({
                    ...base,
                    left: rect.left,
                });
                return;
            }

            setPanelStyle({
                ...base,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, originSlot, bookAnchorRef, dockSide]);

    if (!open || !originSlot) return null;

    const useBookAnchor = Boolean(panelStyle);

    return createPortal(
        <div
            className={`ab-swap-modal-backdrop${
                useBookAnchor ? ' ab-swap-modal-backdrop--book-anchor' : ''
            }`}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={`ab-swap-modal ab-swap-modal--book-spreads${
                    useBookAnchor ? ' ab-swap-modal--book-anchor' : ''
                }${
                    useBookAnchor && dockSide === 'left'
                        ? ' ab-swap-modal--dock-left'
                        : useBookAnchor && dockSide === 'right'
                          ? ' ab-swap-modal--dock-right'
                          : ''
                }`}
                style={useBookAnchor ? panelStyle : undefined}
                role="dialog"
                aria-modal="true"
                aria-label="Choose photo to swap with"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ab-swap-modal-spread-list">
                    {spreadRows.map(
                        ({
                            spreadIndex,
                            targetSlot,
                            isOrigin,
                            isLocked,
                            disabled,
                            label,
                            isCover,
                            isEnd,
                        }) => (
                            <button
                                key={`swap-spread-${spreadIndex}`}
                                type="button"
                                className={`ab-overview-item ab-swap-modal-spread-item${
                                    isCover ? ' ab-overview-item--cover' : ''
                                }${isEnd ? ' ab-overview-item--back' : ''}${
                                    isOrigin ? ' ab-overview-item--active' : ''
                                }${isLocked ? ' ab-swap-modal-spread-item--locked' : ''}`}
                                disabled={disabled}
                                onClick={() => targetSlot && onSelect?.(targetSlot)}
                            >
                                <SwapSpreadThumb
                                    album={album}
                                    spreadIndex={spreadIndex}
                                    totalPages={totalPages}
                                    spreadOpts={spreadOpts}
                                    showSamples={showSamples}
                                />
                                <span className="ab-overview-label">
                                    {label}
                                    {isOrigin ? (
                                        <span className="ab-swap-modal-item-badge">Selected</span>
                                    ) : null}
                                    {isLocked ? (
                                        <span className="ab-swap-modal-item-badge">Locked</span>
                                    ) : null}
                                </span>
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
