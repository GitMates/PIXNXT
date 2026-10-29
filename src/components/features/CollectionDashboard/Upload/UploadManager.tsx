import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { UploadWidgetState } from './uploadTypes';
import {
  confirmedBytesForFile,
  connectionHealthForSpeed,
  createConfirmedSpeedTracker,
  fileIsRetrying,
  filterFilesByTab,
  formatUploadBytePair,
  formatUploadEta,
  formatUploadMb,
  formatUploadSpeed,
  getTotalConfirmedBytes,
  getTotalProgressBytes,
  getTotalUploadBytes,
  originalsStillInFlight,
  uploadBytesDone,
  uploadOverallPercent,
  uploadTabCounts,
  uploadTotalBytes,
  selectRenderedRows,
} from './uploadUtils';
import './UploadManager.css';

const MAX_RENDERED_ROWS = 60;

export type UploadManagerProps = {
  state: UploadWidgetState;
  destinationLabel: string;
  isPaused: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  onDismiss?: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onTabChange: (tab: UploadWidgetState['activeTab']) => void;
  onToggleDetails: () => void;
  onViewCompleted?: () => void;
  onRetry?: () => void;
};

// Custom SVG Icons matching mockups
const OrangeCircularLoader = () => (
  <svg className="upload-loader-spin" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8.5" stroke="#f6f2eb" strokeWidth="2.5" />
    <path d="M11 2.5C6.30558 2.5 2.5 6.30558 2.5 11" stroke="#d46a43" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const PausedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" fill="#fbeee6" stroke="#f0d4cc" strokeWidth="1" />
    <path d="M11 15V7M11 7L8 10M11 7L14 10" stroke="#d46a43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FailureIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" fill="#fdf2f0" stroke="#fcdad5" strokeWidth="1" />
    <path d="M11 7V12M11 15H11.01" stroke="#d4503c" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const CleanCheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" fill="#eef7f2" stroke="#d5ebd9" strokeWidth="1" />
    <path d="M7 11.5L9.5 14L15 8.5" stroke="#2e7d32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function fileRowPercent(file: UploadWidgetState['files'][number]) {
  if (file.status === 'completed') return 100;
  if (file.status === 'error') return 0;
  const total = uploadTotalBytes(file);
  const confirmedPct = total ? Math.round((confirmedBytesForFile(file) / total) * 100) : 0;
  const xhrPct = !total
    ? Math.min(99, Math.max(0, file.progress || 0))
    : Math.min(99, Math.round((uploadBytesDone(file) / total) * 100));
  return Math.min(99, Math.max(xhrPct, confirmedPct));
}

function stayInLabel(destinationLabel: string) {
  const parts = destinationLabel.split(/\s*(?:→|\/)\s*/).filter(Boolean);
  return parts[parts.length - 1] || destinationLabel || 'this set';
}

type UploadRowProps = { file: UploadWidgetState['files'][number] };

const UploadRow = React.memo(function UploadRow({ file }: UploadRowProps) {
  const pct = fileRowPercent(file);
  const isError = file.status === 'error';
  const isDone = file.status === 'completed';
  const isRowUploading = file.status === 'uploading' || file.status === 'processing';

  return (
    <div
      className={`upload-card-row ${isError ? 'row-error' : ''} ${isDone ? 'row-done' : ''}`}
      style={{ position: 'relative' }}
    >
      <div className="upload-card-row-thumb">
        {file.previewUrl ? (
          file.mediaKind === 'video' && file.previewUrl.startsWith('blob:') ? (
            <video src={file.previewUrl} muted playsInline preload="metadata" />
          ) : (
            <img src={file.previewUrl} alt="" loading="lazy" decoding="async" />
          )
        ) : (
          <div className="thumb-placeholder" />
        )}
      </div>

      <div className="upload-card-row-details">
        <div className="upload-card-row-name" title={file.name}>
          {file.name}
        </div>
        <div className="upload-card-row-meta">
          {isError ? (
            file.errorMessage || 'Connection dropped'
          ) : isDone ? (
            formatUploadMb(file.size)
          ) : file.status === 'waiting' ? (
            formatUploadMb(file.size)
          ) : (
            formatUploadBytePair(uploadBytesDone(file), uploadTotalBytes(file))
          )}
        </div>
      </div>

      <div className="upload-card-row-right">
        {isError ? (
          <span className="row-status-icon text-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </span>
        ) : isDone ? (
          <span className="row-status-icon text-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        ) : file.status === 'waiting' ? (
          <span className="row-waiting-text">Waiting</span>
        ) : (
          <>
            {fileIsRetrying(file) ? <span className="row-retry-chip">Retrying</span> : null}
            <span className="row-percent-text">{pct}%</span>
          </>
        )}
      </div>

      {isRowUploading && (
        <div className="upload-row-progress-line" style={{ width: `${pct}%` }} />
      )}
    </div>
  );
});

export const UploadManager: React.FC<UploadManagerProps> = ({
  state,
  destinationLabel,
  isPaused,
  onMinimize,
  onExpand,
  onClose,
  onDismiss,
  onPause,
  onResume,
  onCancel,
  onTabChange,
  onToggleDetails,
  onViewCompleted,
  onRetry,
}) => {
  if (!state.isOpen) return null;

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [speedSample, setSpeedSample] = useState({
    bytesPerSec: 0,
    slow: false,
    stalled: false,
    ticks: 0,
    stalledForSeconds: 0,
  });
  const speedTrackerRef = useRef<ReturnType<typeof createConfirmedSpeedTracker> | null>(null);
  if (!speedTrackerRef.current) speedTrackerRef.current = createConfirmedSpeedTracker();
  const filesRef = useRef(state.files);
  filesRef.current = state.files;

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const completedCount = counts.complete;
  const failedCount = counts.failed;
  const waitingCount = counts.waiting;
  const totalCount = state.files.length;
  const inProgressCount = counts.uploading;
  const pendingCount = inProgressCount + waitingCount;
  const hasActiveUploads = inProgressCount > 0;
  const overallPercent = useMemo(() => uploadOverallPercent(state.files), [state.files]);
  const isStopped = Boolean(state.isStopped);

  const isAllComplete =
    totalCount > 0 && completedCount === totalCount && pendingCount === 0 && failedCount === 0;
  const isFinishedWithFailures = failedCount > 0 && pendingCount === 0 && !isStopped;
  const resumableFailedCount = useMemo(
    () => state.files.filter((f) => f.status === 'error' && f.resumable).length,
    [state.files]
  );
  const retryLabel = resumableFailedCount > 0 ? `Resume ${failedCount}` : `Retry ${failedCount}`;

  useEffect(() => {
    if (!isAllComplete || !onDismiss || isStopped) return undefined;
    const timer = window.setTimeout(() => onDismiss(), 2000);
    return () => window.clearTimeout(timer);
  }, [isAllComplete, onDismiss, isStopped]);

  const totalBytes = useMemo(() => getTotalUploadBytes(state.files), [state.files]);
  const doneBytes = useMemo(() => getTotalProgressBytes(state.files), [state.files]);
  const finishing = hasActiveUploads && !isPaused && !isStopped && !originalsStillInFlight(state.files);

  useEffect(() => {
    if (state.files.length === 0) speedTrackerRef.current?.reset(0);
  }, [state.files.length]);

  useEffect(() => {
    if (!hasActiveUploads || isPaused || isStopped) return undefined;
    const interval = window.setInterval(() => {
      const confirmed = getTotalConfirmedBytes(filesRef.current);
      setSpeedSample(speedTrackerRef.current!.tick(confirmed));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasActiveUploads, isPaused, isStopped]);

  const remainingBytes = Math.max(0, totalBytes - doneBytes);
  const health = connectionHealthForSpeed(speedSample.bytesPerSec, {
    stalledForSeconds: speedSample.stalledForSeconds,
    finishing,
  });
  const atATime = Math.max(1, state.activeConcurrency || inProgressCount);

  const timeRemainingLabel = useMemo(() => {
    if (isPaused) return 'Paused';
    if (isStopped) return 'Stopped';
    if (isAllComplete) return 'All uploaded';
    if (isFinishedWithFailures) return `${failedCount} failed`;
    if (pendingCount > 0) {
      if (finishing) return 'Finishing photos…';
      return formatUploadEta(remainingBytes, speedSample.bytesPerSec, speedSample.ticks);
    }
    return '';
  }, [
    remainingBytes,
    speedSample.bytesPerSec,
    speedSample.ticks,
    isPaused,
    isStopped,
    isAllComplete,
    isFinishedWithFailures,
    failedCount,
    pendingCount,
    finishing,
  ]);

  const { rows: renderedRows, hidden: hiddenRows } = useMemo(
    () => selectRenderedRows(filterFilesByTab(state.files, state.activeTab), MAX_RENDERED_ROWS),
    [state.files, state.activeTab]
  );

  // Auto switch active tab to failed if we finish with failures
  useEffect(() => {
    if (isFinishedWithFailures && state.activeTab !== 'failed') {
      onTabChange('failed');
    }
  }, [isFinishedWithFailures, onTabChange, state.activeTab]);

  // 1. Minimized View
  if (state.isMinimized) {
    return (
      <div className="upload-manager-root upload-widget-mini-pill" onClick={onExpand}>
        <div className="upload-widget-mini-pill-content">
          <span className="upload-mini-loader-wrap">
            <OrangeCircularLoader />
          </span>
          <span className="upload-mini-label">
            {isPaused ? (
              'Paused'
            ) : (
              <>
                Uploading <strong>{inProgressCount}</strong>
              </>
            )}
          </span>
          {timeRemainingLabel && (
            <span className="upload-mini-time">{timeRemainingLabel}</span>
          )}
          <button
            type="button"
            className="upload-mini-chevron-btn"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Header Icon based on State
  let headerIcon = <OrangeCircularLoader />;
  if (isStopped || isPaused) {
    headerIcon = <PausedIcon />;
  } else if (isAllComplete) {
    headerIcon = <CleanCheckIcon />;
  } else if (isFinishedWithFailures) {
    headerIcon = <FailureIcon />;
  }

  // Color theme class names
  const cardStateClass = isAllComplete
    ? 'state-clean'
    : isFinishedWithFailures
      ? 'state-failed'
      : isPaused || isStopped
        ? 'state-paused'
        : 'state-uploading';

  return (
    <div className={`upload-manager-root upload-panel-card ${cardStateClass}`}>
      {/* Header */}
      <header className="upload-card-header">
        <div className="upload-card-header-left">
          {headerIcon}
          <h2 className="upload-card-title">Uploads</h2>
        </div>
        <button type="button" className="upload-card-minimise-btn" onClick={onMinimize}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          Minimise
        </button>
      </header>

      <div className="upload-card-dest">
        {destinationLabel.replace(' / ', ' → ')}
      </div>

      <div className="upload-card-headline">
        <div className="upload-card-count">
          {completedCount} of {totalCount}
          <small>photos</small>
        </div>
        <div className="upload-card-time-status">{timeRemainingLabel}</div>
      </div>

      <div
        className="upload-card-progress-container"
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overallPercent}
      >
        <div
          className="upload-card-progress-bar"
          style={{ width: `${overallPercent}%` }}
        />
      </div>

      <div className="upload-card-stats" aria-live="off">
        {isAllComplete || isStopped ? (
          <span>
            <strong>{formatUploadMb(doneBytes)}</strong> uploaded
          </span>
        ) : (
          <>
            <span>{formatUploadBytePair(doneBytes, totalBytes)}</span>
            <span className="meta-dot">·</span>
            {isPaused ? (
              <span className="upload-speed-pill"><strong>Paused</strong></span>
            ) : (
              <span
                className={`upload-health-pill health-${health.h}`}
                aria-label={`Connection ${health.word}, ${formatUploadSpeed(speedSample.bytesPerSec)}`}
              >
                <span className="upload-health-dot" aria-hidden="true" />
                <span className="upload-health-word">{health.word}</span>
                {finishing ? null : <strong>{formatUploadSpeed(speedSample.bytesPerSec)}</strong>}
              </span>
            )}
            <span className="meta-dot">·</span>
            <span>
              <strong>{atATime}</strong> at a time
            </span>
          </>
        )}
      </div>

      {speedSample.slow && !finishing && !isPaused && !isAllComplete && !isStopped && !isFinishedWithFailures ? (
        <p className="upload-slow-note">
          Slow connection
        </p>
      ) : null}

      {confirmCancel && !isAllComplete && !isStopped ? (
        <div className="upload-cancel-confirm">
          <p>
            Stop <strong>{totalCount - completedCount} remaining uploads?</strong> The {completedCount} already
            uploaded stay in {stayInLabel(destinationLabel)}.
          </p>
          <div className="upload-card-actions">
            <button
              type="button"
              className="btn-danger-solid"
              onClick={() => {
                setConfirmCancel(false);
                onCancel();
              }}
            >
              Stop uploads
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmCancel(false)}>
              Keep uploading
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-card-actions upload-card-actions-end">
          {!isPaused && !isAllComplete && !isFinishedWithFailures && !isStopped && (
            <>
              <button type="button" className="btn-secondary" onClick={onPause}>Pause</button>
              <button type="button" className="btn-cancel" onClick={() => setConfirmCancel(true)}>Cancel</button>
            </>
          )}

          {isPaused && !isStopped && (
            <>
              <button type="button" className="btn-primary" onClick={onResume}>Resume</button>
              <button type="button" className="btn-cancel" onClick={() => setConfirmCancel(true)}>Cancel</button>
            </>
          )}

          {isFinishedWithFailures && (
            <>
              <button type="button" className="btn-primary" onClick={onRetry}>{retryLabel}</button>
              <button type="button" className="btn-secondary" onClick={onDismiss}>Done</button>
            </>
          )}

          {(isAllComplete || isStopped) && (
            <button type="button" className="btn-secondary" onClick={onDismiss}>Close</button>
          )}
        </div>
      )}

      {isAllComplete ? (
        <div className="upload-done-box">
          <b>All {totalCount} photos uploaded.</b> They&apos;re in {stayInLabel(destinationLabel)} and visible to your
          client once you publish.
        </div>
      ) : null}
      {isStopped ? (
        <div className="upload-done-box">
          <b>Stopped.</b> {completedCount} photos uploaded and kept in {stayInLabel(destinationLabel)}. Add the rest
          again whenever you&apos;re ready.
        </div>
      ) : null}

      {/* Tabs */}
      <div className="upload-card-tabs-container">
        <div className="upload-card-tabs" role="tablist">
          {(
            [
              { id: 'uploading' as const, label: 'Uploading', count: counts.uploading },
              { id: 'waiting' as const, label: 'Waiting', count: counts.waiting },
              { id: 'complete' as const, label: 'Done', count: counts.complete },
              ...(failedCount > 0 ? [{ id: 'failed' as const, label: 'Failed', count: failedCount }] : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={state.activeTab === tab.id}
              className={`upload-card-tab${state.activeTab === tab.id ? ' is-active' : ''}${
                tab.id === 'failed' ? ' tab-failed' : ''
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label} <span className="tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Files List */}
      <div className="upload-card-list">
        {renderedRows.length === 0 ? (
          <p className="upload-card-empty">
            {state.activeTab === 'uploading'
              ? 'Nothing uploading right now.'
              : state.activeTab === 'waiting'
                ? 'Nothing waiting.'
                : state.activeTab === 'complete'
                  ? 'Nothing finished yet.'
                  : 'No files in this tab.'}
          </p>
        ) : (
          <>
            {renderedRows.map((file) => (
              <UploadRow key={file.id} file={file} />
            ))}
            {hiddenRows > 0 && (
              <p className="upload-card-empty">+ {hiddenRows} more in this tab</p>
            )}
          </>
        )}
      </div>

      {/* Bottom Footer Note / CTA */}
      <footer className="upload-card-footer">
        {/* Uploading / Paused note */}
        {(pendingCount > 0 || isPaused) && !isFinishedWithFailures && !isAllComplete && !isStopped && (
          <span className="footer-note-text">
            Keep this tab open. Closing it stops the upload.
          </span>
        )}

        {/* Failed Bottom Banner */}
        {isFinishedWithFailures && (
          <div className="footer-failure-banner">
            <div className="banner-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="banner-info-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span className="banner-text">
                {resumableFailedCount > 0
                  ? 'Upload paused partway (often after a long session). Resume continues from the last finished chunk — it does not start over.'
                  : 'Some files failed. Retry will try again; large films keep progress when Resume is available.'}
              </span>
            </div>
            <button type="button" className="btn-primary btn-small" onClick={onRetry}>
              {retryLabel}
            </button>
          </div>
        )}

        {/* Clean Success Bottom Banner */}
        {isAllComplete && (
          <div className="footer-success-banner">
            <div className="banner-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="banner-success-icon">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span className="banner-text">
                {totalCount} photographs added to Highlights.
              </span>
            </div>
            {onViewCompleted && (
              <button type="button" className="btn-secondary btn-small" onClick={onViewCompleted}>
                View them
              </button>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};
