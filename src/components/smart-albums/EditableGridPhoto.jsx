import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    getPagePhotoTransform,
    getSpreadPhotoTransform,
    normalizePhotoTransform,
    photoTransformStyle,
    setPagePhotoTransform,
    setSpreadPhotoTransform,
} from './albumPageTransforms';

const EDGE_ORIGIN = {
    n: '50% 100%',
    s: '50% 0%',
    e: '0% 50%',
    w: '100% 50%',
};

const clampScale = (value) => Math.max(0.5, Math.min(3, value));

export default function EditableGridPhoto({
    albumId,
    pageNum,
    spreadLeftPage = null,
    panoramic = null,
    src,
    transformRevision = 0,
    onTransformChange,
}) {
    const wrapRef = useRef(null);
    const liveRef = useRef(null);
    const isSpread = panoramic != null && spreadLeftPage != null;

    const readTransform = useCallback(() => {
        if (isSpread) return getSpreadPhotoTransform(albumId, spreadLeftPage);
        return getPagePhotoTransform(albumId, pageNum);
    }, [albumId, pageNum, spreadLeftPage, isSpread]);

    const [transform, setTransform] = useState(readTransform);
    const spineOrigin =
        panoramic === 'left' ? '100% 50%' : panoramic === 'right' ? '0% 50%' : '50% 50%';
    const [transformOrigin, setTransformOrigin] = useState(spineOrigin);

    useEffect(() => {
        setTransform(readTransform());
    }, [readTransform, transformRevision]);

    useEffect(() => {
        if (!isSpread) setTransformOrigin('50% 50%');
        else setTransformOrigin(spineOrigin);
    }, [isSpread, spineOrigin]);

    const persist = useCallback(
        (next) => {
            const normalized = normalizePhotoTransform(next);
            setTransform(normalized);
            if (isSpread) {
                setSpreadPhotoTransform(albumId, spreadLeftPage, normalized);
            } else {
                setPagePhotoTransform(albumId, pageNum, normalized);
            }
            onTransformChange?.();
        },
        [albumId, pageNum, spreadLeftPage, isSpread, onTransformChange]
    );

    const updateLocal = useCallback((next) => {
        setTransform(normalizePhotoTransform(next));
    }, []);

    const startPan = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setTransformOrigin('50% 50%');
        const startX = e.clientX;
        const startY = e.clientY;
        const base = normalizePhotoTransform(transform);

        const onMove = (ev) => {
            const rect = wrapRef.current?.getBoundingClientRect();
            if (!rect?.width || !rect?.height) return;
            const dx = ((ev.clientX - startX) / rect.width) * 100;
            const dy = ((ev.clientY - startY) / rect.height) * 100;
            const next = {
                ...base,
                x: Math.max(-40, Math.min(40, base.x + dx)),
                y: Math.max(-40, Math.min(40, base.y + dy)),
            };
            liveRef.current = next;
            updateLocal(next);
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            if (liveRef.current) persist(liveRef.current);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const startEdgeResize = (edge) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setTransformOrigin(EDGE_ORIGIN[edge]);
        const startX = e.clientX;
        const startY = e.clientY;
        const base = normalizePhotoTransform(transform);
        const vertical = edge === 'n' || edge === 's';

        const onMove = (ev) => {
            let delta = 0;
            if (edge === 'n') delta = (startY - ev.clientY) * 0.008;
            else if (edge === 's') delta = (ev.clientY - startY) * 0.008;
            else if (edge === 'e') delta = (ev.clientX - startX) * 0.008;
            else if (edge === 'w') delta = (startX - ev.clientX) * 0.008;

            const next = vertical
                ? { ...base, scaleY: clampScale(base.scaleY + delta) }
                : { ...base, scaleX: clampScale(base.scaleX + delta) };
            liveRef.current = next;
            updateLocal(next);
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            if (liveRef.current) persist(liveRef.current);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    if (!src) {
        return <div className="ab-grid-cell-placeholder" />;
    }

    const img = (
        <img
            src={src}
            alt=""
            className="ab-grid-cell-photo ab-grid-cell-photo--editable"
            draggable={false}
            style={{
                ...photoTransformStyle(transform, { panoramic }),
                transformOrigin: isSpread ? spineOrigin : transformOrigin,
            }}
            onPointerDown={startPan}
        />
    );

    return (
        <div className="ab-grid-editable-wrap ab-grid-editable-wrap--active" ref={wrapRef}>
            {panoramic ? (
                <span className={`ab-pano-bleed ab-pano-bleed--${panoramic}`}>{img}</span>
            ) : (
                img
            )}
            {['n', 'e', 's', 'w'].map((edge) => (
                <div
                    key={edge}
                    className={`ab-grid-edge-handle ab-grid-edge-handle--${edge}`}
                    role="presentation"
                    onPointerDown={startEdgeResize(edge)}
                />
            ))}
            <span className="ab-grid-edit-hint">Drag to move · each edge zooms</span>
        </div>
    );
}
