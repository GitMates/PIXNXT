import React from 'react';
import { formatStorageBytes } from '@/utils/formatStorageBytes';
import './DeliveryDownloadModal.css';

function overallPercent(progress) {
  const total = Number(progress?.total) || 0;
  if (total <= 0) return 0;
  const saved = Number(progress?.saved) || 0;
  const fileFrac = filePercent(progress) / 100;
  const value = ((saved + (progress?.done ? 0 : fileFrac)) / total) * 100;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function filePercent(progress) {
  const received = Number(progress?.bytesReceived) || 0;
  const total = Number(progress?.bytesTotal) || 0;
  if (total > 0) return Math.max(0, Math.min(100, Math.round((received / total) * 100)));
  if (progress?.phase === 'writing') return 95;
  if (progress?.phase === 'done') return 100;
  return received > 0 ? 15 : 8;
}

export function DeliveryDownloadProgress({
  progress,
  minimized = false,
  onClose,
  onMinimize,
  onExpand,
}) {
  if (!progress) return null;
  const total = Number(progress.total) || 0;
  const saved = Number(progress.saved) || 0;
  const failed = Number(progress.failed) || 0;
  const current = Math.min(total, saved + (progress.done ? 0 : 1));
  const overall = overallPercent(progress);
  const currentPct = filePercent(progress);
  const knownBytes = Number(progress.bytesTotal) > 0;
  const indeterminate = !progress.done && !knownBytes && progress.phase !== 'writing';
  const bytesLabel =
    progress.bytesTotal || progress.bytesReceived
      ? `${formatStorageBytes(progress.bytesReceived || 0)}${progress.bytesTotal ? ` of ${formatStorageBytes(progress.bytesTotal)}` : ''}`
      : '';

  if (minimized) {
    return (
      <button
        type="button"
        className="cd-dl-progress cd-dl-progress--pill"
        onClick={onExpand}
        aria-label="Show download progress"
      >
        <span className="cd-dl-progress__pill-bar" aria-hidden="true">
          <span style={{ width: `${progress.done ? 100 : overall}%` }} />
        </span>
        <span className="cd-dl-progress__pill-copy">
          {progress.done
            ? `${saved} saved`
            : `${current} of ${total}`}
        </span>
      </button>
    );
  }

  return (
    <div className="cd-dl-progress" role="status" aria-live="polite">
      <div className="cd-dl-progress__header">
        <div>
          <p className="cd-dl-progress__title">
            {progress.done ? 'Download complete' : 'Downloading delivery'}
          </p>
          <p className="cd-dl-progress__folder">{progress.folderName}</p>
        </div>
        <div className="cd-dl-progress__actions">
          <button
            type="button"
            className="cd-dl-progress__icon"
            onClick={onMinimize}
            aria-label="Minimize download progress"
          >
            –
          </button>
          {progress.done ? (
            <button type="button" className="cd-dl-progress__icon" onClick={onClose} aria-label="Dismiss">
              ×
            </button>
          ) : null}
        </div>
      </div>
      <p className="cd-dl-progress__meta">
        {progress.done
          ? `${saved} saved${failed ? `, ${failed} missing` : ''}`
          : `${current} of ${total}${progress.filename ? ` · ${progress.filename}` : ''}`}
      </p>
      <div
        className="cd-dl-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overall}
      >
        <span style={{ width: `${progress.done ? 100 : overall}%` }} />
      </div>
      {!progress.done ? (
        <>
          <div className="cd-dl-progress__filebar" aria-hidden="true">
            <span
              className={indeterminate ? 'is-indeterminate' : undefined}
              style={indeterminate ? undefined : { width: `${currentPct}%` }}
            />
          </div>
          <p className="cd-dl-progress__bytes">
            {bytesLabel || (progress.phase === 'writing' ? 'Saving to folder…' : 'Fetching file…')}
          </p>
        </>
      ) : (
        <p className="cd-dl-progress__bytes">Keep working — files are in the folder you chose.</p>
      )}
    </div>
  );
}
