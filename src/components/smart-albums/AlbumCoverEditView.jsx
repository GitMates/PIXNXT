import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveBookWrapSpreadSrc } from './albumPagePhotos';
import { getSpreadPhotoTransform } from './albumPageTransforms';
import {
    clampSpineBounds,
    getBookWrapSpineCssVars,
    getBookWrapSpineLayout,
} from './bookWrapSpine';
import {
    setAlbumSpineBoundsOverride,
    SPINE_BOUNDS_CHANGED_EVENT,
} from './albumSpineSettings';
import BookWrapSpineImage from './BookWrapSpineImage';
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
    const dragRef = useRef(null);

    const baseLayout = useMemo(() => getBookWrapSpineLayout(album), [album, spineBoundsTick]);
    const spineLayout = useMemo(() => {
        if (!spineBounds) return baseLayout;
        const clamped = clampSpineBounds(
            spineBounds.spineStartFraction,
            spineBounds.spineEndFraction,
            baseLayout
        );
        const spineFraction = clamped.spineEndFraction - clamped.spineStartFraction;
        return {
            ...baseLayout,
            ...clamped,
            spineFraction,
            coverFraction: clamped.spineStartFraction,
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
        const override = getAlbumSpineBoundsOverride(albumId);
        if (override) {
            setSpineBounds(override);
        } else {
            setSpineBounds({
                spineStartFraction: baseLayout.spineStartFraction,
                spineEndFraction: baseLayout.spineEndFraction,
            });
        }
    }, [albumId, baseLayout.spineStartFraction, baseLayout.spineEndFraction]);

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

    const isBlankCoverAlbum = album?.blank_covers === true;
    const spineVisible = spineLayout.hasSpine && showSpine;

    const panelWidths = useMemo(() => {
        if (!dims) return null;
        const total = dims.width;
        if (!spineVisible) {
            const back = Math.floor(total / 2);
            return { back, spine: 0, front: total - back };
        }
        const back = Math.round(total * spineLayout.spineStartFraction);
        const spine = Math.round(total * spineLayout.spineFraction);
        return { back, spine, front: total - back - spine };
    }, [dims, spineVisible, spineLayout.spineStartFraction, spineLayout.spineFraction]);

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
            const clamped = clampSpineBounds(start, end, baseLayout, { fixedEdge });
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

    const panelHeight = dims?.height;
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
                    <div className="ab-cover-edit-view__photo-wrap">
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="back"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : (
                            <div className="ab-cover-edit-view__empty" aria-hidden />
                        )}
                    </div>
                    <span className="ab-cover-edit-hint ab-cover-edit-hint--back">Back</span>
                </PanelTag>

                {spineVisible && (
                    <div
                        className="ab-cover-edit-spine-panel"
                        style={spineStyle}
                        aria-label="Spine"
                    >
                        <div className="ab-cover-edit-view__photo-wrap">
                            {src ? (
                                <BookWrapSpineImage
                                    src={src}
                                    side="spine"
                                    layout={spineLayout}
                                    transform={transform}
                                />
                            ) : (
                                <div className="ab-cover-edit-view__empty ab-cover-edit-view__empty--spine" />
                            )}
                        </div>
                        <span className="ab-cover-edit-hint ab-cover-edit-hint--spine">Spine</span>
                    </div>
                )}

                {spineVisible && panelWidths && (
                    <>
                        <div
                            className="ab-cover-edit-spine-handle ab-cover-edit-spine-handle--left"
                            style={{ left: panelWidths.back }}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Drag to resize spine (left edge)"
                            onPointerDown={(e) => startSpineDrag('left', e)}
                        >
                            <span className="ab-cover-edit-spine-handle__line" aria-hidden />
                            <span className="ab-cover-edit-spine-handle__grip" aria-hidden />
                        </div>
                        <div
                            className="ab-cover-edit-spine-handle ab-cover-edit-spine-handle--right"
                            style={{ left: panelWidths.back + panelWidths.spine }}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Drag to resize spine (right edge)"
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
                    <div className="ab-cover-edit-view__photo-wrap">
                        {src ? (
                            <BookWrapSpineImage
                                src={src}
                                side="front"
                                layout={spineLayout}
                                transform={transform}
                            />
                        ) : (
                            <div className="ab-cover-edit-view__empty" aria-hidden />
                        )}
                    </div>
                    <span className="ab-cover-edit-hint ab-cover-edit-hint--front">Front</span>
                </PanelTag>
                </div>
            </div>
        </div>
    );
}
