import React, { useMemo } from 'react';
import { formatRelativeTime } from '../../lib/relativeTime';
import { formatCommentTime } from '../../services/smartAlbumComments.service';
import {
    getReplacementFeedVersionPair,
    sortSpreadReplacements,
} from './albumImageReplacements';
import { formatSpreadDisplayLabel } from './albumSpreadUtils';
import { ReplacementVersionShotButton } from './ReplacementVersionImageLightbox';

function formatVersionUploadDescription(row) {
    if (row.note) {
        const note = String(row.note).trim();
        if (note) return note.endsWith('.') ? note : `${note}.`;
    }
    const label = String(row.slotLabel || '').trim();
    if (label && !row.whole && !/^whole spread$/i.test(label)) {
        return `Uploaded a new version \u2014 ${label.toLowerCase()}.`;
    }
    return 'Uploaded a new version.';
}

/** Feed card for photo version changes (Quiet Proof style). */
export default function AlbumPreviewReplacementCard({
    albumId,
    replacements,
    replacement,
    authorName = 'Photographer',
    spreadLabel = null,
    hasCovers = false,
    currentPreviewUrl = null,
    isLatestOnSpread = false,
    photoPins = [],
    imageReplacements = [],
    spreadOpts = {},
    album = null,
    totalPages = 0,
}) {
    const rows = useMemo(
        () =>
            sortSpreadReplacements(
                replacements?.length ? replacements : replacement ? [replacement] : []
            ),
        [replacements, replacement]
    );

    if (!rows.length) return null;

    const row = replacement || rows[rows.length - 1];
    const { isRestore, from: versionFrom, to: versionTo } = getReplacementFeedVersionPair(row);
    const createdAt = row.createdAt;
    const timeLabel = formatRelativeTime(createdAt) || formatCommentTime(createdAt);
    const spreadIdx = row.spreadIndex != null ? Number(row.spreadIndex) : null;
    const spreadText =
        spreadLabel ||
        (Number.isFinite(spreadIdx)
            ? formatSpreadDisplayLabel(spreadIdx, { hasCovers })
            : null);

    const description = isRestore
        ? row.note || `Restored this spread to v${versionTo}.`
        : formatVersionUploadDescription(row);

    const preferLiveNew =
        isLatestOnSpread || (!replacement && rows.length > 1 && row === rows[rows.length - 1]);
    const currentUrl = preferLiveNew ? currentPreviewUrl || row.newUrl : row.newUrl;

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
                    {isRestore ? 'Restored version' : 'New version'} · v{versionFrom} → v{versionTo}
                    {spreadText ? ` · ${spreadText}` : ''}
                </p>
            </header>
            <div className="quiet-proof-card__body">
                <p className="quiet-proof-card__text">{description}</p>
                <div className="quiet-proof-card__version-pair" aria-label="Version change">
                    <ReplacementVersionShotButton
                        albumId={albumId}
                        url={row.previousUrl}
                        storagePath={row.previousStoragePath}
                        tag={`v${versionFrom}`}
                        variant="feed"
                        spreadIndex={spreadIdx}
                        version={versionFrom}
                        photoPins={photoPins}
                        imageReplacements={imageReplacements}
                        spreadOpts={spreadOpts}
                        album={album}
                        totalPages={totalPages}
                    />
                    <span className="quiet-proof-card__version-arrow" aria-hidden>
                        →
                    </span>
                    <ReplacementVersionShotButton
                        albumId={albumId}
                        url={currentUrl}
                        storagePath={row.newStoragePath}
                        itemId={row.newItemId}
                        preferLive={preferLiveNew}
                        tag={`v${versionTo}`}
                        variant="feed"
                        spreadIndex={spreadIdx}
                        version={versionTo}
                        photoPins={photoPins}
                        imageReplacements={imageReplacements}
                        spreadOpts={spreadOpts}
                        album={album}
                        totalPages={totalPages}
                    />
                </div>
            </div>
        </article>
    );
}
