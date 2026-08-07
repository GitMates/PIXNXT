import React, { useMemo } from 'react';
import { formatRelativeTime } from '../../lib/relativeTime';
import { formatCommentTime } from '../../services/smartAlbumComments.service';
import {
    getReplacementCurrentVersion,
    resolveReplacementPreviewUrl,
    sortSpreadReplacements,
} from './albumImageReplacements';

function Shot({ albumId, url, storagePath, tag }) {
    const src = resolveReplacementPreviewUrl(albumId, url, storagePath);
    return (
        <span className="quiet-proof-card__version-shot">
            {src ? (
                <img src={src} alt="" draggable={false} />
            ) : (
                <span className="quiet-proof-card__version-shot-ph" />
            )}
            {tag ? <span className="quiet-proof-card__version-shot-tag">{tag}</span> : null}
        </span>
    );
}

/** Feed card for photo version changes (Quiet Proof style). */
export default function AlbumPreviewReplacementCard({
    albumId,
    replacements,
    replacement,
    authorName = 'Photographer',
    spreadLabel = null,
}) {
    const rows = useMemo(
        () =>
            sortSpreadReplacements(
                replacements?.length ? replacements : replacement ? [replacement] : []
            ),
        [replacements, replacement]
    );

    if (!rows.length) return null;

    const latest = rows[rows.length - 1];
    const currentVersion = getReplacementCurrentVersion(latest);
    const createdAt = latest.createdAt;
    const timeLabel = formatRelativeTime(createdAt) || formatCommentTime(createdAt);
    const spreadIdx =
        latest.spreadIndex != null ? Number(latest.spreadIndex) : null;
    const spreadText =
        spreadLabel ||
        (Number.isFinite(spreadIdx)
            ? `Spread ${String(spreadIdx + 1).padStart(2, '0')}`
            : null);

    return (
        <article className="quiet-proof-card">
            <header className="quiet-proof-card__head">
                <div className="quiet-proof-card__title-row">
                    <div className="quiet-proof-card__name-wrap">
                        <span className="quiet-proof-card__name">{authorName}</span>
                        <span className="quiet-proof-card__badge quiet-proof-card__badge--photographer">
                            Photographer
                        </span>
                    </div>
                    {timeLabel ? (
                        <time className="quiet-proof-card__time" dateTime={createdAt || undefined}>
                            {timeLabel}
                        </time>
                    ) : null}
                </div>
                <p className="quiet-proof-card__activity">
                    <span className="quiet-proof-card__activity-dot" aria-hidden />
                    New version · v{currentVersion}
                    {spreadText ? ` · ${spreadText}` : ''}
                </p>
            </header>
            <div className="quiet-proof-card__body">
                <div className="quiet-proof-card__version-pair" aria-label="Version change">
                    <Shot
                        albumId={albumId}
                        url={latest.previousUrl}
                        storagePath={latest.previousStoragePath}
                        tag={`v${currentVersion - 1}`}
                    />
                    <span className="quiet-proof-card__version-arrow" aria-hidden>
                        →
                    </span>
                    <Shot albumId={albumId} url={latest.newUrl} tag={`v${currentVersion}`} />
                </div>
            </div>
        </article>
    );
}
