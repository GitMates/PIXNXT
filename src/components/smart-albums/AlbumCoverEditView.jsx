import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveBookWrapSpreadSrc } from './albumPagePhotos';
import { getSpreadPhotoTransform, photoTransformStyle } from './albumPageTransforms';
import { parseGridSizeAspect } from './albumGridSize';
import './AlbumCoverEditView.css';

const PAGE_HEIGHT_MIN = 300;
const PAGE_HEIGHT_MAX = 520;
const PAGE_HEIGHT_SCALE = 0.93;
const STAGE_MIN_PX = 80;

function computePageDimensions(stageWidth, stageHeight, gridSize = 'square') {
    if (stageWidth < STAGE_MIN_PX || stageHeight < STAGE_MIN_PX) return null;
    const aspect = parseGridSizeAspect(gridSize);
    const maxPageWidth = stageWidth / 2;
    const maxPageHeight = stageHeight * PAGE_HEIGHT_SCALE;
    const pageHeight = Math.floor(Math.min(maxPageHeight, maxPageWidth / aspect));
    const clampedPageHeight = Math.max(
        PAGE_HEIGHT_MIN,
        Math.min(PAGE_HEIGHT_MAX, pageHeight)
    );
    return {
        width: Math.round(clampedPageHeight * aspect),
        height: clampedPageHeight,
    };
}

/**
 * Cover editor: one spread filled by the book-wrap image (collection order 1 on spread:0).
 * Left half = back cover, right half = front — shown as one continuous photo.
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
    const [dims, setDims] = useState(null);

    const src = useMemo(
        () => resolveBookWrapSpreadSrc(album, { showSamples }),
        [album, showSamples, photoRevision]
    );
    const gridSize = album?.grid_size || 'square';
    const transform = albumId
        ? getSpreadPhotoTransform(albumId, 0)
        : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    void transformRevision;

    const measure = useCallback(() => {
        const el = stageRef.current;
        if (!el) return;
        const next = computePageDimensions(el.clientWidth, el.clientHeight, gridSize);
        if (next) setDims(next);
    }, [gridSize]);

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
                    label: 'Book wrap',
                },
                e.currentTarget.getBoundingClientRect()
            );
        },
        [editable, onSlotActivate, src]
    );

    const spreadStyle = dims
        ? { width: dims.width * 2, height: dims.height }
        : undefined;

    const SpreadTag = editable ? 'button' : 'div';

    return (
        <div className="ab-cover-edit-root" ref={stageRef}>
            <SpreadTag
                type={editable ? 'button' : undefined}
                className={`ab-cover-edit-spread ab-cover-edit-spread--whole${
                    editable ? ' ab-cover-edit-spread--interactive' : ''
                }`}
                style={spreadStyle}
                onClick={editable ? activateWrap : undefined}
                aria-label={
                    editable ? 'Book wrap spread — choose photo' : 'Book wrap spread'
                }
            >
                <div className="ab-cover-edit-view__photo-wrap">
                    {src ? (
                        <img
                            src={src}
                            alt=""
                            className="ab-cover-edit-wrap-img"
                            draggable={false}
                            style={photoTransformStyle(transform)}
                        />
                    ) : (
                        <div className="ab-cover-edit-view__empty" aria-hidden />
                    )}
                </div>
                <div className="ab-cover-edit-spine" aria-hidden />
                <span className="ab-cover-edit-hint ab-cover-edit-hint--back">Back</span>
                <span className="ab-cover-edit-hint ab-cover-edit-hint--front">Front</span>
            </SpreadTag>
        </div>
    );
}
