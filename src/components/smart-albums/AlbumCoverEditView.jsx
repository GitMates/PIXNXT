import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveBookWrapSpreadSrc } from './albumPagePhotos';
import { getSpreadPhotoTransform } from './albumPageTransforms';
import {
    clampSpineBounds,
    getBookWrapSpineCssVars,
    getBookWrapSpineLayout,
    isInwardSpineOverride,
} from './bookWrapSpine';
import {
    clearAlbumSpineBoundsOverride,
    getAlbumSpineBoundsOverride,
    setAlbumSpineBoundsOverride,
    SPINE_BOUNDS_CHANGED_EVENT,
} from './albumSpineSettings';
import { parseGridSizeAspect } from './albumGridSize';
import BookWrapSpineImage from './BookWrapSpineImage';
import { COVER_TEXT_CHANGED_EVENT, resolveFrontCoverDisplayText } from './albumCoverText';
import {
    COVER_COLOR_CHANGED_EVENT,
    getAlbumCoverColor,
} from './albumCoverColor';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';
import './AlbumCoverEditView.css';

const PAGE_HEIGHT_MIN = 300;
const PAGE_HEIGHT_MAX = 520;
const PAGE_HEIGHT_SCALE = 0.93;
const STAGE_MIN_PX = 80;

/** Fixed book-wrap size so spine drag only redistributes panels, never resizes the spread. */
function computeWrapDimensions(stageWidth, stageHeight, wrapAspect) {
    if (stageWidth < STAGE_MIN_PX || stageHeight < STAGE_MIN_PX || !wrapAspect) return null;
    const maxWrapWidth = stageWidth * 0.96;
    const maxWrapHeight = stageHeight * PAGE_HEIGHT_SCALE;
    const heightFromWidth = Math.floor(maxWrapWidth / wrapAspect);
    const height = Math.floor(Math.min(maxWrapHeight, heightFromWidth));
    const clampedHeight = Math.max(PAGE_HEIGHT_MIN, Math.min(PAGE_HEIGHT_MAX, height));
    return {
        width: Math.round(clampedHeight * wrapAspect),
        height: clampedHeight,
    };
}

function wrapFractionFromSpreadX(x, spreadWidth) {
    if (!spreadWidth) return 0;
    return Math.max(0, Math.min(1, x / spreadWidth));
}

/**
 * Cover editor: back | spine (center of wrap) | front from collection photo 1.
 */
export default function AlbumCoverEditView({
    album,
    albumId,
    editable = false,
    showSamples = false,
    onSlotActivate,
    transformRevision = 0,
    photoRevision = 0,
}) {
    const stageRef = useRef(null);
    const spreadRef = useRef(null);
    const [dims, setDims] = useState(null);
    const [showSpine, setShowSpine] = useState(true);
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);
    const [spineBounds, setSpineBounds] = useState(null);
    const [spineDragging, setSpineDragging] = useState(false);
    const [coverTextTick, setCoverTextTick] = useState(0);
    const [coverColorTick, setCoverColorTick] = useState(0);
    const dragRef = useRef(null);

    const baseLayout = useMemo(() => getBookWrapSpineLayout(album), [album, spineBoundsTick]);
    const spineLayout = useMemo(() => {
        if (!spineBounds) return baseLayout;
        const clamped = clampSpineBounds(
            spineBounds.spineStartFraction,
            spineBounds.spineEndFraction,
            baseLayout,
            { inwardOnly: baseLayout.spineFromCoverCalc }
        );
        const spineFraction = clamped.spineEndFraction - clamped.spineStartFraction;
        return {
            ...baseLayout,
            ...clamped,
            spineFraction,
            coverFraction: clamped.spineStartFraction,
            coverSpineStartFraction: baseLayout.coverSpineStartFraction,
            coverSpineEndFraction: baseLayout.coverSpineEndFraction,
            spineDisplayStartFraction: clamped.spineStartFraction,
            spineDisplayEndFraction: clamped.spineEndFraction,
            spineZoneStartFraction: baseLayout.spineZoneStartFraction,
            spineZoneEndFraction: baseLayout.spineZoneEndFraction,
            hasSpine: spineFraction > 0.004,
        };
    }, [baseLayout, spineBounds]);

    const src = useMemo(
        () => resolveBookWrapSpreadSrc(album, { showSamples }),
        [album, showSamples, photoRevision]
    );
    const wrapAspect = baseLayout.wrapAspect;
    const transform = albumId
        ? getSpreadPhotoTransform(albumId, 0)
        : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    void transformRevision;

    useEffect(() => {
        const autoBounds = {
            spineStartFraction: baseLayout.spineStartFraction,
            spineEndFraction: baseLayout.spineEndFraction,
        };
        if (baseLayout.spineFromCoverCalc) {
            const autoBounds = {
                spineStartFraction: baseLayout.defaultSpineStartFraction,
                spineEndFraction: baseLayout.defaultSpineEndFraction,
            };
            const override = getAlbumSpineBoundsOverride(albumId);
            if (override && isInwardSpineOverride(override, baseLayout)) {
                setSpineBounds({
                    spineStartFraction: override.spineStartFraction,
                    spineEndFraction: override.spineEndFraction,
                });
                return;
            }
            if (albumId && override) clearAlbumSpineBoundsOverride(albumId);
            setSpineBounds(autoBounds);
            return;
        }
        const override = getAlbumSpineBoundsOverride(albumId);
        if (override) {
            const span = override.spineEndFraction - override.spineStartFraction;
            if (span > 0.004 && span < 0.5) {
                setSpineBounds(override);
                return;
            }
            if (albumId) clearAlbumSpineBoundsOverride(albumId);
        }
        setSpineBounds(autoBounds);
    }, [
        albumId,
        baseLayout.spineStartFraction,
        baseLayout.spineEndFraction,
        baseLayout.spineFromCoverCalc,
        baseLayout.wrapAspect,
        baseLayout.innerSpreadAspect,
    ]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) {
                setSpineBoundsTick((t) => t + 1);
            }
        };
        window.addEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onTextChanged = (e) => {
            if (e.detail?.albumId === albumId) setCoverTextTick((t) => t + 1);
        };
        window.addEventListener(COVER_TEXT_CHANGED_EVENT, onTextChanged);
        return () => window.removeEventListener(COVER_TEXT_CHANGED_EVENT, onTextChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onColorChanged = (e) => {
            if (e.detail?.albumId === albumId) setCoverColorTick((t) => t + 1);
        };
        window.addEventListener(COVER_COLOR_CHANGED_EVENT, onColorChanged);
        return () => window.removeEventListener(COVER_COLOR_CHANGED_EVENT, onColorChanged);
    }, [albumId]);

    const coverText = useMemo(() => {
        void coverTextTick;
        return resolveFrontCoverDisplayText(album, albumId);
    }, [album, albumId, coverTextTick]);

    const isBlankCoverAlbum = album?.blank_covers === true;
    const showLeatherCover = isBlankCoverAlbum && !src;
    const coverColorId = useMemo(() => {
        void coverColorTick;
        return getAlbumCoverColor(albumId);
    }, [albumId, coverColorTick]);
    const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
    const leatherBackStyle = useMemo(
        () =>
            showLeatherCover
                ? getCoverLeatherSurfaceStyle(coverColorId, { aspect: pageAspect })
                : null,
        [showLeatherCover, coverColorId, pageAspect]
    );
    const leatherSpineStyle = useMemo(
        () =>
            showLeatherCover
                ? getCoverLeatherSurfaceStyle(coverColorId, { aspect: pageAspect })
                : null,
        [showLeatherCover, coverColorId, pageAspect]
    );
    const leatherFrontStyle = useMemo(
        () =>
            showLeatherCover
                ? getCoverLeatherSurfaceStyle(coverColorId, {
                      aspect: pageAspect,
                      title: coverText,
                  })
                : null,
        [showLeatherCover, coverColorId, pageAspect, coverText]
    );
    const spineVisible = spineLayout.hasSpine && showSpine;

    const panelWidths = useMemo(() => {
        if (!dims) return null;
        const total = dims.width;
        if (!spineVisible) {
            const back = Math.floor(total / 2);
            return { back, spine: 0, front: total - back, gapBeforeSpine: 0, gapAfterSpine: 0 };
        }

        if (spineLayout.spineFromCoverCalc) {
            const coverStart =
                spineLayout.coverSpineStartFraction ??
                spineLayout.defaultSpineStartFraction;
            const coverEnd =
                spineLayout.coverSpineEndFraction ?? spineLayout.defaultSpineEndFraction;
            const back = Math.round(total * coverStart);
            const front = Math.round(total * (1 - coverEnd));
            const spine = Math.round(total * spineLayout.spineFraction);
            const gapBeforeSpine = Math.round(
                total * Math.max(0, spineLayout.spineStartFraction - coverStart)
            );
            const gapAfterSpine = Math.round(
                total * Math.max(0, coverEnd - spineLayout.spineEndFraction)
            );
            const used = back + front + spine + gapBeforeSpine + gapAfterSpine;
            const remainder = total - used;
            return {
                back,
                spine,
                front: front + remainder,
                gapBeforeSpine,
                gapAfterSpine,
            };
        }

        const back = Math.round(total * spineLayout.spineStartFraction);
        const spine = Math.round(total * spineLayout.spineFraction);
        return {
            back,
            spine,
            front: total - back - spine,
            gapBeforeSpine: 0,
            gapAfterSpine: 0,
        };
    }, [
        dims,
        spineVisible,
        spineLayout.spineFromCoverCalc,
        spineLayout.coverSpineStartFraction,
        spineLayout.coverSpineEndFraction,
        spineLayout.defaultSpineStartFraction,
        spineLayout.defaultSpineEndFraction,
        spineLayout.spineStartFraction,
        spineLayout.spineEndFraction,
        spineLayout.spineFraction,
    ]);

    const measure = useCallback(() => {
        const el = stageRef.current;
        if (!el) return;
        const next = computeWrapDimensions(el.clientWidth, el.clientHeight, wrapAspect);
        if (next) setDims(next);
    }, [wrapAspect]);

    useEffect(() => {
        measure();
        const el = stageRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure]);

    const persistSpineBounds = useCallback(
        (start, end, { fixedEdge = null } = {}) => {
            const clamped = clampSpineBounds(start, end, baseLayout, {
                fixedEdge,
                inwardOnly: baseLayout.spineFromCoverCalc,
            });
            setSpineBounds(clamped);
            if (albumId) {
                setAlbumSpineBoundsOverride(
                    albumId,
                    clamped.spineStartFraction,
                    clamped.spineEndFraction
                );
            }
        },
        [albumId, baseLayout]
    );

    const startSpineDrag = useCallback(
        (edge, e) => {
            if (!dims || !spreadRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            const handleEl = e.currentTarget;
            handleEl.setPointerCapture?.(e.pointerId);
            const spreadRect = spreadRef.current.getBoundingClientRect();
            const startBounds = spineBounds || {
                spineStartFraction: spineLayout.spineStartFraction,
                spineEndFraction: spineLayout.spineEndFraction,
            };
            dragRef.current = { edge, spreadRect, startBounds };
            setSpineDragging(true);

            const onMove = (ev) => {
                const drag = dragRef.current;
                if (!drag) return;
                ev.preventDefault();
                const x = Math.max(
                    0,
                    Math.min(drag.spreadRect.width, ev.clientX - drag.spreadRect.left)
                );
                const fraction = wrapFractionFromSpreadX(x, drag.spreadRect.width);

                if (drag.edge === 'left') {
                    persistSpineBounds(fraction, drag.startBounds.spineEndFraction, {
                        fixedEdge: 'end',
                    });
                } else {
                    persistSpineBounds(drag.startBounds.spineStartFraction, fraction, {
                        fixedEdge: 'start',
                    });
                }
            };

            const onUp = (ev) => {
                dragRef.current = null;
                setSpineDragging(false);
                handleEl.releasePointerCapture?.(ev.pointerId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [dims, spineBounds, spineLayout, persistSpineBounds]
    );

    const activateWrap = useCallback(
        (e) => {
            if (!editable || !onSlotActivate) return;
            onSlotActivate(
                {
                    pageNum: 0,
                    cellId: 0,
                    spreadLeft: 0,
                    whole: true,
                    hasPhoto: Boolean(src),
                    label: isBlankCoverAlbum ? 'Cover' : 'Book wrap',
                },
                e.currentTarget.getBoundingClientRect()
            );
        },
        [editable, onSlotActivate, isBlankCoverAlbum, src]
    );

    const spineInwardOnly = baseLayout.spineFromCoverCalc;
    const panelHeight = dims?.height;
    const spinePanelLeft =
        panelWidths && spineVisible
            ? panelWidths.back + (panelWidths.gapBeforeSpine || 0)
            : 0;
    const gapBeforeStyle =
        panelWidths && panelHeight && panelWidths.gapBeforeSpine > 0
            ? { width: panelWidths.gapBeforeSpine, height: panelHeight }
            : undefined;
    const gapAfterStyle =
        panelWidths && panelHeight && panelWidths.gapAfterSpine > 0
            ? { width: panelWidths.gapAfterSpine, height: panelHeight }
            : undefined;
    const backStyle =
        panelWidths && panelHeight
            ? { width: panelWidths.back, height: panelHeight }
            : undefined;
    const spineStyle =
        panelWidths && panelHeight && spineVisible
            ? { width: panelWidths.spine, height: panelHeight }
            : undefined;
    const frontStyle =
        panelWidths && panelHeight
            ? { width: panelWidths.front, height: panelHeight }
            : undefined;
    const spreadStyle = dims
        ? {
              width: dims.width,
              height: dims.height,
              ...getBookWrapSpineCssVars(spineLayout),
          }
        : undefined;

    const PanelTag = editable ? 'button' : 'div';

    return (
        <div className="ab-cover-edit-root" ref={stageRef}>
            {(spineLayout.hasSpine || isBlankCoverAlbum) && (
                <button
                    type="button"
                    className={`ab-cover-edit-spine-toggle${
                        spineVisible ? ' ab-cover-edit-spine-toggle--active' : ''
                    }`}
                    onClick={() => setShowSpine((v) => !v)}
                >
                    {spineVisible ? 'Hide spine' : '+ Add spine'}
                </button>
            )}
            <div className="ab-cover-edit-spread-anchor">
                <div
                    ref={spreadRef}
                    className={`ab-cover-edit-spread ab-cover-edit-spread--wrap${
                        spineVisible ? ' ab-cover-edit-spread--has-spine' : ''
                    }${spineDragging ? ' ab-cover-edit-spread--dragging-spine' : ''}`}
                    style={spreadStyle}
                    role="group"
                    aria-label="Book wrap — back, spine, and front"
                >
                <PanelTag
                    type={editable ? 'button' : undefined}
                    className={`ab-cover-edit-page ab-cover-edit-page--back${
                        editable ? ' ab-cover-edit-page--interactive' : ''
                    }`}
                    style={backStyle}
                    onClick={editable ? activateWrap : undefined}
                    aria-label={
                        editable
                            ? isBlankCoverAlbum
                                ? 'Back cover — choose cover photo'
                                : 'Back cover — choose book wrap'
                            : undefined
                    }
                >
                    <div
                        className={`ab-cover-edit-view__photo-wrap${
                            showLeatherCover ? ' ab-cover-leather-canvas' : ''
                        }`}
                        style={showLeatherCover ? leatherBackStyle : undefined}
                    >
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="back"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : !showLeatherCover ? (
                            <div className="ab-cover-edit-view__empty" aria-hidden />
                        ) : null}
                    </div>
                    <span className="ab-cover-edit-hint ab-cover-edit-hint--back">Back</span>
                </PanelTag>

                {spineVisible && panelWidths?.gapBeforeSpine > 0 && (
                    <div
                        className="ab-cover-edit-spine-gap ab-cover-edit-spine-gap--before"
                        style={gapBeforeStyle}
                        aria-hidden
                    >
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="spine-gap-before"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : null}
                    </div>
                )}

                {spineVisible && (
                    <div
                        className="ab-cover-edit-spine-panel"
                        style={spineStyle}
                        aria-label="Spine"
                    >
                        <div
                            className={`ab-cover-edit-view__photo-wrap${
                                showLeatherCover ? ' ab-cover-leather-canvas' : ''
                            }`}
                            style={showLeatherCover ? leatherSpineStyle : undefined}
                        >
                            {src ? (
                                <BookWrapSpineImage
                                    src={src}
                                    side="spine"
                                    layout={spineLayout}
                                    transform={transform}
                                />
                            ) : !showLeatherCover ? (
                                <div
                                    className="ab-cover-edit-view__empty ab-cover-edit-view__empty--spine"
                                    aria-hidden
                                />
                            ) : null}
                        </div>
                        <span className="ab-cover-edit-hint ab-cover-edit-hint--spine">
                            Spine
                        </span>
                    </div>
                )}

                {spineVisible && panelWidths?.gapAfterSpine > 0 && (
                    <div
                        className="ab-cover-edit-spine-gap ab-cover-edit-spine-gap--after"
                        style={gapAfterStyle}
                        aria-hidden
                    >
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="spine-gap-after"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : null}
                    </div>
                )}

                {spineVisible && panelWidths && (
                    <>
                        <div
                            className={`ab-cover-edit-spine-handle ab-cover-edit-spine-handle--left${
                                spineInwardOnly ? ' ab-cover-edit-spine-handle--inward' : ''
                            }`}
                            style={{ left: spinePanelLeft }}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={
                                spineInwardOnly
                                    ? 'Drag inward to narrow spine (left edge)'
                                    : 'Drag to resize spine (left edge)'
                            }
                            onPointerDown={(e) => startSpineDrag('left', e)}
                        >
                            <span className="ab-cover-edit-spine-handle__line" aria-hidden />
                            <span className="ab-cover-edit-spine-handle__grip" aria-hidden />
                        </div>
                        <div
                            className={`ab-cover-edit-spine-handle ab-cover-edit-spine-handle--right${
                                spineInwardOnly ? ' ab-cover-edit-spine-handle--inward' : ''
                            }`}
                            style={{ left: spinePanelLeft + panelWidths.spine }}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={
                                spineInwardOnly
                                    ? 'Drag inward to narrow spine (right edge)'
                                    : 'Drag to resize spine (right edge)'
                            }
                            onPointerDown={(e) => startSpineDrag('right', e)}
                        >
                            <span className="ab-cover-edit-spine-handle__line" aria-hidden />
                            <span className="ab-cover-edit-spine-handle__grip" aria-hidden />
                        </div>
                    </>
                )}

                <PanelTag
                    type={editable ? 'button' : undefined}
                    className={`ab-cover-edit-page ab-cover-edit-page--front${
                        editable ? ' ab-cover-edit-page--interactive' : ''
                    }`}
                    style={frontStyle}
                    onClick={editable ? activateWrap : undefined}
                    aria-label={
                        editable
                            ? isBlankCoverAlbum
                                ? 'Front cover — choose cover photo'
                                : 'Front cover — choose book wrap'
                            : undefined
                    }
                >
                    <div
                        className={`ab-cover-edit-view__photo-wrap${
                            showLeatherCover ? ' ab-cover-leather-canvas' : ''
                        }`}
                        style={showLeatherCover ? leatherFrontStyle : undefined}
                        aria-label={showLeatherCover && coverText ? coverText : undefined}
                    >
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="front"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : showLeatherCover ? null : coverText ? (
                            <div
                                className="ab-cover-text-message ab-cover-text-message--on-blank"
                                aria-hidden
                            >
                                {coverText}
                            </div>
                        ) : (
                            <div className="ab-cover-edit-view__empty" aria-hidden />
                        )}
                        {coverText && src ? (
                            <div className="ab-cover-text-message" aria-hidden>
                                {coverText}
                            </div>
                        ) : null}
                    </div>
                    <span className="ab-cover-edit-hint ab-cover-edit-hint--front">Front</span>
                </PanelTag>
                </div>
            </div>
        </div>
    );
}
