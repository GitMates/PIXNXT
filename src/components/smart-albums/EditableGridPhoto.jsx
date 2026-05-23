import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getPagePhotoTransform, setPagePhotoTransform } from './albumPageTransforms';

export default function EditableGridPhoto({
    albumId,
    pageNum,
    src,
    transformRevision = 0,
    onTransformChange,
}) {
    const wrapRef = useRef(null);
    const liveRef = useRef(null);
    const [transform, setTransform] = useState(() =>
        getPagePhotoTransform(albumId, pageNum)
    );

    useEffect(() => {
        setTransform(getPagePhotoTransform(albumId, pageNum));
    }, [albumId, pageNum, transformRevision]);

    const persist = useCallback(
        (next) => {
            setTransform(next);
            setPagePhotoTransform(albumId, pageNum, next);
            onTransformChange?.();
        },
        [albumId, pageNum, onTransformChange]
    );

    const updateLocal = useCallback((next) => {
        setTransform(next);
    }, []);

    const startPan = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const base = { ...transform };

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

    const startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const base = { ...transform };

        const onMove = (ev) => {
            const delta = (startY - ev.clientY) * 0.008;
            const next = {
                ...base,
                scale: Math.max(0.5, Math.min(3, base.scale + delta)),
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

    if (!src) {
        return <div className="ab-grid-cell-placeholder" />;
    }

    return (
        <div className="ab-grid-editable-wrap" ref={wrapRef}>
            <img
                src={src}
                alt=""
                className="ab-grid-cell-photo ab-grid-cell-photo--editable"
                draggable={false}
                style={{
                    transform: `translate(${transform.x}%, ${transform.y}%) scale(${transform.scale})`,
                }}
                onPointerDown={startPan}
            />
            <button
                type="button"
                className="ab-grid-resize-handle"
                aria-label="Resize photo"
                onPointerDown={startResize}
            />
        </div>
    );
}
