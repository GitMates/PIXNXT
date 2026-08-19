import React, { useEffect, useMemo, useState } from 'react';
import {
    getReplacementCurrentVersion,
    getReplacementVersion,
    sortSpreadReplacements,
} from './albumImageReplacements';
import { ReplacementVersionShotButton } from './ReplacementVersionImageLightbox';
import './SpreadVersionHistory.css';

function formatHistoryWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const mon = d.toLocaleString([], { month: 'short' });
    const hasTime = String(iso).includes('T') || d.getHours() !== 0 || d.getMinutes() !== 0;
    if (!hasTime) return `${day} ${mon}`;
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
    return `${day} ${mon} ${time}`;
}

/** Compact bar date: "6 Aug" */
function formatBarDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${d.toLocaleString([], { month: 'short' })}`;
}

/** Collapsed bar copy: "Original · you · 6 Aug" */
function formatBarSummary({ label, when = null }) {
    const parts = [label].filter(Boolean);
    const date = formatBarDate(when);
    if (date) parts.push(date);
    return parts.join(' · ');
}

/**
 * Collapsed bar + expandable version list above the note compose (matches editor mock).
 * Always shows at least v1 when the spread has a preview or onNewVersion is available,
 * so photographers can upload the first "New version" without a prior replacement row.
 */
export default function SpreadVersionHistory({
    albumId,
    replacements = [],
    currentPreviewUrl = null,
    onNewVersion = null,
    onRestore = null,
    onDelete = null,
    forceExpandToken = 0,
    authorLabel = 'you',
    createdAt = null,
    spreadIndex = null,
    photoPins = [],
    imageReplacements = [],
    spreadOpts = {},
    album = null,
    totalPages = 0,
}) {
    const [expanded, setExpanded] = useState(false);
    const rows = useMemo(() => sortSpreadReplacements(replacements), [replacements]);

    useEffect(() => {
        if (forceExpandToken > 0 && rows.length > 0) {
            setExpanded(true);
        }
    }, [forceExpandToken, rows.length]);

    const latest = rows.length ? rows[rows.length - 1] : null;
    const currentVersion = latest ? getReplacementCurrentVersion(latest) : 1;
    // Prefer the live spread preview for "current" so thumbs match the flipbook after
    // an in-place replace (stored newUrl can still point at the prior file).
    const livePreviewUrl = currentPreviewUrl || latest?.newUrl || null;

    const historyEntries = useMemo(() => {
        if (!latest) {
            if (!livePreviewUrl && !onNewVersion) return [];
            return [
                {
                    key: 'baseline-v1',
                    version: 1,
                    current: true,
                    url: livePreviewUrl,
                    storagePath: null,
                    itemId: null,
                    preferLive: false,
                    createdAt: null,
                    row: null,
                },
            ];
        }
        const entries = [
            {
                key: `current-${currentVersion}`,
                version: currentVersion,
                current: true,
                url: livePreviewUrl || latest.newUrl,
                storagePath: latest.newStoragePath || null,
                itemId: latest.newItemId || null,
                preferLive: true,
                createdAt: latest.createdAt,
                row: null,
            },
        ];
        for (let i = rows.length - 1; i >= 0; i -= 1) {
            const row = rows[i];
            const version = getReplacementVersion(row);
            entries.push({
                key: row.id || `v-${version}`,
                version,
                current: false,
                // Frozen prior snapshot only — never resolve via live collection id.
                url: row.previousUrl,
                storagePath: row.previousStoragePath,
                itemId: null,
                preferLive: false,
                createdAt: row.createdAt,
                row,
            });
        }
        return entries;
    }, [rows, latest, currentVersion, livePreviewUrl, onNewVersion]);

    const resolvedSpreadIndex =
        spreadIndex != null
            ? spreadIndex
            : latest?.spreadIndex != null
              ? Number(latest.spreadIndex)
              : null;
    const allReplacements =
        imageReplacements?.length > 0 ? imageReplacements : replacements;

    // Nothing to show until there is a photo or a way to upload a version.
    if (!rows.length && !livePreviewUrl && !onNewVersion) return null;

    const summaryLabel = latest
        ? latest.note ||
          (latest.whole || /^whole spread$/i.test(String(latest.slotLabel || ''))
              ? 'Uploaded a new version'
              : latest.slotLabel) ||
          (latest.whole ? 'Updated spread' : 'Updated photo')
        : 'Original';
    const summaryWhen = latest?.createdAt || createdAt || null;
    const summary = formatBarSummary({
        label: summaryLabel,
        who: authorLabel,
        when: summaryWhen,
    });

    return (
        <div className={`ae-version-history${expanded ? ' ae-version-history--open' : ''}`}>
            <div className="ae-version-history__bar">
                <span className="ae-version-history__badge">v{currentVersion}</span>
                <span className="ae-version-history__summary" title={summary}>
                    {summary}
                </span>
                <div className="ae-version-history__actions">
                    <button
                        type="button"
                        className="ae-version-history__link"
                        onClick={() => setExpanded((v) => !v)}
                    >
                        {expanded ? 'Hide history' : 'History'}
                    </button>
                    {onNewVersion ? (
                        <button
                            type="button"
                            className="ae-version-history__link ae-version-history__link--accent"
                            onClick={onNewVersion}
                        >
                            New version
                        </button>
                    ) : null}
                </div>
            </div>

            {expanded ? (
                <ul className="ae-version-history__list">
                    {historyEntries.map((entry) => (
                        <li key={entry.key} className="ae-version-history__row">
                            <ReplacementVersionShotButton
                                albumId={albumId}
                                url={entry.url}
                                storagePath={entry.storagePath}
                                itemId={entry.itemId}
                                preferLive={entry.preferLive}
                                current={entry.current}
                                tag={`v${entry.version}`}
                                variant="history"
                                spreadIndex={resolvedSpreadIndex}
                                version={entry.version}
                                photoPins={photoPins}
                                imageReplacements={allReplacements}
                                spreadOpts={spreadOpts}
                                album={album}
                                totalPages={totalPages}
                            />
                            <div className="ae-version-history__meta">
                                <span className="ae-version-history__label">
                                    {entry.current ? (
                                        <>
                                            <strong>v{entry.version}</strong>
                                            <strong> · current</strong>
                                        </>
                                    ) : (
                                        <>v{entry.version}</>
                                    )}
                                </span>
                                {entry.createdAt ? (
                                    <time
                                        className="ae-version-history__when"
                                        dateTime={entry.createdAt}
                                    >
                                        {formatHistoryWhen(entry.createdAt)}
                                    </time>
                                ) : null}
                            </div>
                            {!entry.current && entry.row ? (
                                <div className="ae-version-history__row-actions">
                                    {onRestore ? (
                                        <button
                                            type="button"
                                            className="ae-version-history__link"
                                            onClick={() => onRestore(entry.row)}
                                        >
                                            Restore
                                        </button>
                                    ) : null}
                                    {onDelete ? (
                                        <button
                                            type="button"
                                            className="ae-version-history__link"
                                            onClick={() => onDelete(entry.row)}
                                        >
                                            Delete
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
