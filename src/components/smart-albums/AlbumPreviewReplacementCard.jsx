import React, { useEffect, useState } from 'react';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import { resolveReplacementPreviewUrl } from './albumImageReplacements';

function ReplacementPreviewImage({ albumId, url, itemId, alt, variant, tagLabel }) {
    const [failed, setFailed] = useState(false);
    const resolvedUrl = resolveReplacementPreviewUrl(albumId, url, itemId);

    useEffect(() => {
        setFailed(false);
    }, [resolvedUrl]);

    const shotClassName = `av-preview-sidebar-replacement-shot${
        variant ? ` av-preview-sidebar-replacement-shot--${variant}` : ''
    }`;

    if (!resolvedUrl || failed) {
        return (
            <div className={`${shotClassName} av-preview-sidebar-replacement-shot--missing`}>
                <span className="av-preview-sidebar-replacement-shot-placeholder">
                    Original photo unavailable
                </span>
                {tagLabel ? (
                    <span
                        className={`av-preview-sidebar-replacement-shot-tag${
                            variant === 'now'
                                ? ' av-preview-sidebar-replacement-shot-tag--new'
                                : ''
                        }`}
                    >
                        {tagLabel}
                    </span>
                ) : null}
            </div>
        );
    }

    return (
        <div className={shotClassName}>
            <img
                src={resolvedUrl}
                alt={alt}
                draggable={false}
                onError={() => setFailed(true)}
            />
            {tagLabel ? (
                <span
                    className={`av-preview-sidebar-replacement-shot-tag${
                        variant === 'now' ? ' av-preview-sidebar-replacement-shot-tag--new' : ''
                    }`}
                >
                    {tagLabel}
                </span>
            ) : null}
        </div>
    );
}

export default function AlbumPreviewReplacementCard({
    albumId,
    replacement,
    onRemove,
}) {
    const createdAtLabel = replacement.createdAt
        ? formatCommentDateTime(replacement.createdAt)
        : null;

    return (
        <article className="av-preview-sidebar-replacement">
            <div className="av-preview-sidebar-replacement-pair">
                <ReplacementPreviewImage
                    albumId={albumId}
                    url={replacement.previousUrl}
                    itemId={replacement.previousItemId}
                    alt="Before photo change"
                    variant="before"
                    tagLabel="Before"
                />
                <div className="av-preview-sidebar-replacement-arrow" aria-hidden>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>
                <ReplacementPreviewImage
                    albumId={albumId}
                    url={replacement.newUrl}
                    itemId={replacement.newItemId}
                    alt="Updated photo"
                    variant="now"
                    tagLabel="Now"
                />
            </div>
            <div className="av-preview-sidebar-replacement-footer">
                {createdAtLabel ? (
                    <time
                        className="av-preview-sidebar-replacement-time"
                        dateTime={replacement.createdAt}
                    >
                        {createdAtLabel}
                    </time>
                ) : (
                    <span className="av-preview-sidebar-replacement-time" aria-hidden />
                )}
                <button
                    type="button"
                    className="av-preview-sidebar-replacement-remove"
                    onClick={() => onRemove?.(replacement.id)}
                >
                    Remove
                </button>
            </div>
        </article>
    );
}
