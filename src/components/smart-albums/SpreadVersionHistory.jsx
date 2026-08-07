import React, { useMemo, useState } from 'react';
import {
    getReplacementCurrentVersion,
    getReplacementVersion,
    resolveReplacementPreviewUrl,
    sortSpreadReplacements,
} from './albumImageReplacements';
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

function VersionThumb({ albumId, url, storagePath, current = false }) {
    const src = resolveReplacementPreviewUrl(albumId, url, storagePath);
    return (
        <span
            className={`ae-version-history__thumb${
                current ? ' ae-version-history__thumb--current' : ''
            }`}
        >
            {src ? (
                <img src={src} alt="" draggable={false} />
            ) : (
                <span className="ae-version-history__thumb-ph" />
            )}
        </span>
    );
}

/**
 * Collapsed bar + expandable version list above the note compose (matches editor mock).
 */
export default function SpreadVersionHistory({
    albumId,
    replacements = [],
    onNewVersion = null,
    onRestore = null,
    onDelete = null,
}) {
    const [expanded, setExpanded] = useState(false);
    const rows = useMemo(() => sortSpreadReplacements(replacements), [replacements]);

    const latest = rows.length ? rows[rows.length - 1] : null;
    const currentVersion = latest ? getReplacementCurrentVersion(latest) : 1;

    const historyEntries = useMemo(() => {
        if (!latest) return [];
        const entries = [
            {
                key: `current-${currentVersion}`,
                version: currentVersion,
                current: true,
                url: latest.newUrl,
                storagePath: null,
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
                url: row.previousUrl,
                storagePath: row.previousStoragePath,
                createdAt: row.createdAt,
                row,
            });
        }
        return entries;
    }, [rows, latest, currentVersion]);

    if (!rows.length || !latest) return null;

    const summary =
        latest.slotLabel ||
        latest.note ||
        (latest.whole ? 'Updated spread photo' : 'Updated photo');
    const truncated =
        summary.length > 28 ? `${summary.slice(0, 26).trimEnd()}…` : summary;

    return (
        <div className={`ae-version-history${expanded ? ' ae-version-history--open' : ''}`}>
            <div className="ae-version-history__bar">
                <span className="ae-version-history__badge">v{currentVersion}</span>
                <span className="ae-version-history__summary" title={summary}>
                    {truncated}
                </span>
                <div className="ae-version-history__actions">
                    <button
                        type="button"
                        className="ae-version-history__link"
                        onClick={() => setExpanded((v) => !v)}
                    >
                        {expanded ? 'Hide history' : `History (${historyEntries.length})`}
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
                            <VersionThumb
                                albumId={albumId}
                                url={entry.url}
                                storagePath={entry.storagePath}
                                current={entry.current}
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
