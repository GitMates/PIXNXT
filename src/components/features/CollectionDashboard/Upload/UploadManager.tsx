import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { UploadWidgetState } from './uploadTypes';
import {
  filterFilesByTab,
  formatUploadMb,
  formatUploadSpeed,
  formatUploadTimeRemaining,
  getTotalUploadBytes,
  getTotalBytesDone,
  uploadActiveLabel,
  uploadBytesDone,
  uploadCompleteSummary,
  uploadInProgressTitle,
  uploadOverallPercent,
  uploadTabCounts,
  uploadTotalBytes,
} from './uploadUtils';
import './UploadManager.css';

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
  if (!total) return Math.min(100, Math.max(0, file.progress || 0));
  return Math.min(100, Math.round((uploadBytesDone(file) / total) * 100));
}

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

  const [speed, setSpeed] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const prevBytesRef = useRef(0);
  const prevTimeRef = useRef(Date.now());
  const lastValidSpeedRef = useRef(0);
  const lastEtaSpeedRef = useRef(0);
  const uploadStartedAtRef = useRef<number | null>(null);

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const completedCount = counts.complete;
  const failedCount = counts.failed;
  const totalCount = state.files.length;
  const inProgressCount = counts.uploading;
  const overallPercent = useMemo(() => uploadOverallPercent(state.files), [state.files]);

  const isAllComplete = totalCount > 0 && completedCount === totalCount && inProgressCount === 0 && failedCount === 0;
  const isFinishedWithFailures = failedCount > 0 && inProgressCount === 0;

  const totalBytes = useMemo(() => getTotalUploadBytes(state.files), [state.files]);
  const doneBytes = useMemo(() => getTotalBytesDone(state.files), [state.files]);

  useEffect(() => {
    const hasActive = state.files.some(
      (f) => f.status === 'uploading' || f.status === 'processing' || f.status === 'waiting'
    );
    if (hasActive && uploadStartedAtRef.current == null) {
      uploadStartedAtRef.current = Date.now();
    }
    if (
      state.files.length > 0 &&
      state.files.every((f) => f.status === 'completed' || f.status === 'error')
    ) {
      uploadStartedAtRef.current = null;
      lastEtaSpeedRef.current = 0;
    }
  }, [state.files]);

  useEffect(() => {
    const isUploading = state.files.some(
      (f) => f.status === 'uploading' || f.status === 'processing' || f.status === 'waiting'
    );
    if (!isUploading) {
      setSpeed(0);
      lastValidSpeedRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const currentDone = getTotalBytesDone(state.files);
      const timeDiff = (now - prevTimeRef.current) / 1000;

      if (timeDiff > 0) {
        const bytesDiff = currentDone - prevBytesRef.current;
        const instantSpeed = bytesDiff > 0 ? bytesDiff / timeDiff : 0;

        if (instantSpeed > 0) {
          const smoothed =
            lastValidSpeedRef.current > 0
              ? lastValidSpeedRef.current * 0.4 + instantSpeed * 0.6
              : instantSpeed;
          lastValidSpeedRef.current = smoothed;
          lastEtaSpeedRef.current = smoothed;
          setSpeed(smoothed);
        } else if (lastValidSpeedRef.current > 0) {
          const decayed = lastValidSpeedRef.current * 0.85;
          lastValidSpeedRef.current = decayed > 1024 ? decayed : 0;
          setSpeed(lastValidSpeedRef.current);
        } else {
          setSpeed(0);
        }
      }

      prevBytesRef.current = currentDone;
      prevTimeRef.current = now;
    }, 400);

    return () => clearInterval(interval);
  }, [state.files]);

  useEffect(() => {
    if (inProgressCount <= 0 || isPaused) return undefined;
    const tick = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [inProgressCount, isPaused]);

  const sessionAverageSpeed = useMemo(() => {
    const started = uploadStartedAtRef.current;
    if (!started || doneBytes < 32 * 1024) return 0;
    const elapsed = (nowTick - started) / 1000;
    if (elapsed < 2) return 0;
    return doneBytes / elapsed;
  }, [doneBytes, nowTick]);

  const etaSpeed = speed > 0 ? speed : lastEtaSpeedRef.current || sessionAverageSpeed;
  const remainingBytes = Math.max(0, totalBytes - doneBytes);
  const secondsLeft = etaSpeed > 0 ? Math.max(0, Math.round(remainingBytes / etaSpeed)) : 0;

  const timeRemainingLabel = useMemo(() => {
    if (isPaused) return 'Paused';
    if (isAllComplete) return 'All done';
    if (isFinishedWithFailures) return `${failedCount} failed`;
    if (inProgressCount > 0) {
      const eta = formatUploadTimeRemaining(secondsLeft);
      if (eta) return eta;
      return 'Calculating…';
    }
    return '';
  }, [
    secondsLeft,
    isPaused,
    isAllComplete,
    isFinishedWithFailures,
    failedCount,
    inProgressCount,
  ]);

  const formattedSpeed = useMemo(
    () => (isPaused ? 'Paused' : inProgressCount > 0 ? formatUploadSpeed(speed) : ''),
    [speed, inProgressCount, isPaused]
  );

  const activeFiles = useMemo(
    () => filterFilesByTab(state.files, state.activeTab),
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
            Uploading <strong>{totalCount}</strong>
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
  if (isPaused) {
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
      : isPaused
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

      {/* Destination Path & Time Remaining */}
      <div className="upload-card-subheader">
        <div className="upload-card-path">
          {destinationLabel.replace(' / ', ' → ')}
        </div>
        <div className="upload-card-time-status">
          {timeRemainingLabel}
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="upload-card-progress-container">
        <div 
          className="upload-card-progress-bar"
          style={{ width: `${overallPercent}%` }}
        />
      </div>

      {/* Meta details & Action Buttons */}
      <div className="upload-card-meta-section">
        <div className="upload-card-meta-text">
          <strong>{completedCount}</strong> of <strong>{totalCount}</strong>
          <span className="meta-dot">·</span>
          {formatUploadMb(doneBytes)} of {formatUploadMb(totalBytes)}
          {!isPaused && !isAllComplete && !isFinishedWithFailures && formattedSpeed && (
            <>
              <span className="meta-dot">·</span>
              {formattedSpeed}
            </>
          )}
          {!isPaused && !isAllComplete && !isFinishedWithFailures && (
            <>
              <span className="meta-dot">·</span>
              {overallPercent}%
            </>
          )}
        </div>

        <div className="upload-card-actions">
          {/* Uploading State Actions */}
          {!isPaused && !isAllComplete && !isFinishedWithFailures && (
            <>
              <button type="button" className="btn-secondary" onClick={onPause}>Pause</button>
              <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
            </>
          )}

          {/* Paused State Actions */}
          {isPaused && (
            <>
              <button type="button" className="btn-primary" onClick={onResume}>Resume</button>
              <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
            </>
          )}

          {/* Finished with Failures Actions */}
          {isFinishedWithFailures && (
            <>
              <button type="button" className="btn-primary" onClick={onRetry}>Retry {failedCount}</button>
              <button type="button" className="btn-secondary" onClick={onDismiss}>Done</button>
            </>
          )}

          {/* Finished Clean Actions */}
          {isAllComplete && (
            <button type="button" className="btn-secondary" onClick={onDismiss}>Close</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="upload-card-tabs-container">
        <div className="upload-card-tabs" role="tablist">
          {(
            [
              { id: 'uploading' as const, label: 'Uploading', count: counts.uploading },
              { id: 'complete' as const, label: 'Complete', count: counts.complete },
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
        {activeFiles.length === 0 ? (
          <p className="upload-card-empty">No files in this tab.</p>
        ) : (
          activeFiles.map((file) => {
            const pct = fileRowPercent(file);
            const isError = file.status === 'error';
            const isDone = file.status === 'completed';
            const isRowUploading = file.status === 'uploading' || file.status === 'processing';

            return (
              <div
                key={file.id}
                className={`upload-card-row ${isError ? 'row-error' : ''} ${isDone ? 'row-done' : ''}`}
                style={{
                  position: 'relative'
                }}
              >
                <div className="upload-card-row-thumb">
                  {file.previewUrl ? (
                    file.mediaKind === 'video' ? (
                      <video src={file.previewUrl} muted playsInline preload="metadata" />
                    ) : (
                      <img src={file.previewUrl} alt="" />
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
                    ) : (
                      `${formatUploadMb(uploadBytesDone(file))} of ${formatUploadMb(uploadTotalBytes(file))}`
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
                  ) : (
                    <span className="row-percent-text">{pct}%</span>
                  )}
                </div>

                {/* Progress bar line running under the row */}
                {isRowUploading && (
                  <div className="upload-row-progress-line" style={{ width: `${pct}%` }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Note / CTA */}
      <footer className="upload-card-footer">
        {/* Uploading / Paused note */}
        {(inProgressCount > 0 || isPaused) && !isFinishedWithFailures && !isAllComplete && (
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
                Two files lost the connection partway. Retrying resumes them, it does not start again.
              </span>
            </div>
            <button type="button" className="btn-primary btn-small" onClick={onRetry}>
              Retry {failedCount}
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
