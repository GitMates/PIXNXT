import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import {
    getReplacementCurrentVersion,
    getReplacementVersion,
    resolveReplacementPreviewUrl,
    sortSpreadReplacements,
} from './albumImageReplacements';

function ReplacementImagePreviewPopup({ anchorRef, albumId, url, storagePath, onClose }) {
    const popupRef = useRef(null);
    const [failed, setFailed] = useState(false);
    const [useStorageFallback, setUseStorageFallback] = useState(false);
    const [position, setPosition] = useState(null);
    const resolvedUrl = resolveReplacementPreviewUrl(
        albumId,
        useStorageFallback ? null : url,
        useStorageFallback || !url ? storagePath : null
    );

    useEffect(() => {
        setFailed(false);
        setUseStorageFallback(false);
    }, [url, storagePath]);

    const updatePosition = useCallback(() => {
        const anchor = anchorRef?.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const popupWidth = popupRef.current?.offsetWidth ?? 300;
        const popupHeight = popupRef.current?.offsetHeight ?? 220;
        const margin = 12;
        const gap = 10;

        let left = rect.left - gap;
        let top = rect.top + rect.height / 2;
        let placement = 'left';

        if (left - popupWidth < margin) {
            left = rect.right + gap;
            placement = 'right';
        }

        if (top - popupHeight / 2 < margin) {
            top = margin + popupHeight / 2;
        } else if (top + popupHeight / 2 > window.innerHeight - margin) {
            top = window.innerHeight - margin - popupHeight / 2;
        }

        setPosition({ left, top, placement });
    }, [anchorRef]);

    useLayoutEffect(() => {
        const anchor = anchorRef?.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        setPosition({
            left: rect.left - 10,
            top: rect.top + rect.height / 2,
            placement: 'left',
        });

        const raf = window.requestAnimationFrame(updatePosition);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [updatePosition, resolvedUrl, failed]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    if (!position) return null;

    const transform =
        position.placement === 'left'
            ? 'translate(-100%, -50%)'
            : 'translate(0, -50%)';

    return createPortal(
        <>
            <button
                type="button"
                className="av-replacement-preview-backdrop"
                aria-label="Close image preview"
                onClick={() => onClose?.()}
            />
            <div
                ref={popupRef}
                className={`av-replacement-preview-popup av-replacement-preview-popup--${position.placement}`}
                style={{
                    left: `${position.left}px`,
                    top: `${position.top}px`,
                    transform,
                }}
                role="dialog"
                aria-label="Previous image preview"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="av-replacement-preview-popup-bubble">
                    {!resolvedUrl || failed ? (
                        <div className="av-replacement-preview-popup-missing">
                            Original photo unavailable
                        </div>
                    ) : (
                        <img
                            className="av-replacement-preview-popup-image"
                            src={resolvedUrl}
                            alt="Previous photo"
                            draggable={false}
                            onLoad={updatePosition}
                            onError={() => {
                                if (!useStorageFallback && storagePath && url) {
                                    setUseStorageFallback(true);
                                    return;
                                }
                                setFailed(true);
                            }}
                        />
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}

export default function AlbumPreviewReplacementCard({ albumId, replacements, replacement }) {
    const rows = sortSpreadReplacements(
        replacements?.length ? replacements : replacement ? [replacement] : []
    );
    const previewBtnRefs = useRef({});
    const [openPreviewVersion, setOpenPreviewVersion] = useState(null);

    if (!rows.length) return null;

    const latest = rows[rows.length - 1];
    const currentVersion = getReplacementCurrentVersion(latest);
    const currentAtLabel = latest.createdAt ? formatCommentDateTime(latest.createdAt) : null;
    const openRow = rows.find((row) => getReplacementVersion(row) === openPreviewVersion);

    return (
        <>
            {rows.map((row) => {
                const version = getReplacementVersion(row);
                const becameCurrentRow =
                    version > 1
                        ? rows.find((entry) => getReplacementVersion(entry) === version - 1)
                        : null;
                const atLabel = becameCurrentRow?.createdAt
                    ? formatCommentDateTime(becameCurrentRow.createdAt)
                    : null;
                return (
                    <article key={row.id} className="av-preview-sidebar-replacement">
                        <div className="av-preview-sidebar-replacement-pair">
                            <div className="av-preview-sidebar-replacement-update">
                                <p className="av-preview-sidebar-replacement-update-label">
                                    Version {version}
                                </p>
                                <button
                                    ref={(node) => {
                                        previewBtnRefs.current[version] = node;
                                    }}
                                    type="button"
                                    className="av-preview-sidebar-replacement-preview-btn"
                                    onClick={() =>
                                        setOpenPreviewVersion((active) =>
                                            active === version ? null : version
                                        )
                                    }
                                    aria-expanded={openPreviewVersion === version}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                        {atLabel ? (
                            <div className="av-preview-sidebar-replacement-footer av-preview-sidebar-replacement-footer--solo">
                                <time
                                    className="av-preview-sidebar-replacement-time"
                                    dateTime={becameCurrentRow.createdAt}
                                >
                                    {atLabel}
                                </time>
                            </div>
                        ) : null}
                    </article>
                );
            })}
            <article className="av-preview-sidebar-replacement">
                <div className="av-preview-sidebar-replacement-pair">
                    <div className="av-preview-sidebar-replacement-current">
                        <p className="av-preview-sidebar-replacement-update-label">
                            Version {currentVersion}
                        </p>
                        <span className="av-preview-sidebar-replacement-current-badge">
                            Current
                        </span>
                    </div>
                </div>
                {currentAtLabel ? (
                    <div className="av-preview-sidebar-replacement-footer av-preview-sidebar-replacement-footer--solo">
                        <time
                            className="av-preview-sidebar-replacement-time"
                            dateTime={latest.createdAt}
                        >
                            {currentAtLabel}
                        </time>
                    </div>
                ) : null}
            </article>
            {openPreviewVersion != null && openRow ? (
                <ReplacementImagePreviewPopup
                    anchorRef={{
                        get current() {
                            return previewBtnRefs.current[openPreviewVersion];
                        },
                    }}
                    albumId={albumId}
                    url={openRow.previousUrl}
                    storagePath={openRow.previousStoragePath}
                    onClose={() => setOpenPreviewVersion(null)}
                />
            ) : null}
        </>
    );
}
