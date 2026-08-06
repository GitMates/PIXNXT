import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  CloudUpload,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Film,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { UploadWidgetState } from './uploadTypes';
import {
  filterFilesByTab,
  formatUploadMb,
  formatUploadSpeed,
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
};

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
}) => {
  if (!state.isOpen) return null;

  const [speed, setSpeed] = useState(0);
  const prevBytesRef = useRef(0);
  const prevTimeRef = useRef(Date.now());
  const lastValidSpeedRef = useRef(0);

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

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const completedCount = counts.complete;
  const totalCount = state.files.length;
  const activeFiles = useMemo(
    () => filterFilesByTab(state.files, state.activeTab),
    [state.files, state.activeTab]
  );
  const inProgressCount = counts.uploading;
  const overallPercent = useMemo(() => uploadOverallPercent(state.files), [state.files]);
  const isAllComplete =
    totalCount > 0 && completedCount === totalCount && inProgressCount === 0;
  const completeSummary = useMemo(() => uploadCompleteSummary(state.files), [state.files]);
  const inProgressTitle = useMemo(
    () => uploadInProgressTitle(state.files, inProgressCount),
    [state.files, inProgressCount]
  );

  const totalBytes = useMemo(() => getTotalUploadBytes(state.files), [state.files]);
  const doneBytes = useMemo(() => getTotalBytesDone(state.files), [state.files]);
  const formattedSpeed = useMemo(
    () => (isPaused ? 'Paused' : inProgressCount > 0 ? formatUploadSpeed(speed) : ''),
    [speed, inProgressCount, isPaused]
  );

  const detailsTabsAndList = (
    <div className="upload-batch-details">
      <div className="upload-panel-tabs" role="tablist">
        {(
          [
            { id: 'uploading' as const, label: 'Uploading', count: counts.uploading },
            { id: 'complete' as const, label: 'Complete', count: counts.complete },
            { id: 'failed' as const, label: 'Failed', count: counts.failed },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.id}
            className={`upload-panel-tab${state.activeTab === tab.id ? ' active' : ''}${
              tab.id === 'failed' && tab.count > 0 ? ' has-failures' : ''
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {tab.count > 0 ? <span className="upload-panel-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="upload-panel-list">
        {activeFiles.length === 0 ? (
          <p className="upload-panel-empty">No files in this tab.</p>
        ) : (
          activeFiles.map((file) => {
            const pct = fileRowPercent(file);
            const isActive = file.status === 'uploading' || file.status === 'processing';
            return (
              <div
                key={file.id}
                className={`upload-panel-row${
                  file.status === 'error'
                    ? ' is-error'
                    : file.status === 'completed'
                      ? ' is-done'
                      : ''
                }`}
              >
                <div className="upload-panel-row-thumb" aria-hidden>
                  {file.previewUrl ? (
                    file.mediaKind === 'video' ? (
                      <video src={file.previewUrl} muted playsInline preload="metadata" />
                    ) : (
                      <img src={file.previewUrl} alt="" />
                    )
                  ) : file.mediaKind === 'video' ? (
                    <Film size={16} strokeWidth={1.75} />
                  ) : (
                    <ImageIcon size={16} strokeWidth={1.75} />
                  )}
                </div>

                <div className="upload-panel-row-body">
                  <div className="upload-panel-row-top">
                    <span className="upload-panel-row-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="upload-panel-row-meta">
                      {file.status === 'error' ? (
                        'Failed'
                      ) : file.status === 'completed' ? (
                        'Done'
                      ) : file.status === 'waiting' ? (
                        isPaused ? 'Paused' : 'Queued'
                      ) : file.status === 'processing' ? (
                        file.progress < 5 ? 'Optimizing…' : 'Finishing…'
                      ) : (
                        <>
                          {formatUploadMb(uploadBytesDone(file))}
                          <span className="upload-panel-row-meta-sep">/</span>
                          {formatUploadMb(uploadTotalBytes(file))}
                          {isActive && formattedSpeed ? (
                            <>
                              <span className="upload-panel-row-meta-sep">·</span>
                              {formattedSpeed}
                            </>
                          ) : null}
                        </>
                      )}
                    </span>
                  </div>

                  {file.status !== 'error' ? (
                    <div
                      className={`upload-panel-row-bar${isActive ? ' is-active' : ''}`}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="upload-panel-row-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}

                  {file.status === 'error' && file.errorMessage ? (
                    <p className="upload-panel-row-error" title={file.errorMessage}>
                      <AlertCircle size={13} strokeWidth={2.25} aria-hidden />
                      <span>{file.errorMessage}</span>
                    </p>
                  ) : null}
                </div>

                <div className="upload-panel-row-trail" aria-hidden>
                  {file.status === 'completed' ? (
                    <CheckCircle2 size={18} strokeWidth={2} />
                  ) : file.status === 'error' ? (
                    <X size={16} strokeWidth={2.25} />
                  ) : isActive ? (
                    <Loader2 size={16} strokeWidth={2} className="upload-fab-spin" />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (state.isMinimized) {
    return (
      <div className="upload-manager-root upload-widget-mini">
        <div
          className="upload-widget-mini-header"
          onClick={onExpand}
          onKeyDown={(e) => e.key === 'Enter' && onExpand()}
          role="button"
          tabIndex={0}
        >
          <div className="upload-widget-mini-left">
            {isAllComplete ? (
              <CheckCircle2 size={20} strokeWidth={2} className="upload-widget-mini-icon-done" />
            ) : inProgressCount > 0 ? (
              <Loader2 size={20} strokeWidth={2} className="upload-fab-spin" />
            ) : (
              <CloudUpload size={18} strokeWidth={1.5} />
            )}
            <div>
              <p className="upload-widget-mini-title">
                {isAllComplete ? completeSummary : inProgressTitle}
              </p>
              {inProgressCount > 0 && (
                <p className="upload-widget-mini-sub">
                  {formatUploadMb(doneBytes)} / {formatUploadMb(totalBytes)}
                  {formattedSpeed ? ` · ${formattedSpeed}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="upload-widget-mini-actions">
            <button
              type="button"
              className="upload-widget-mini-btn"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              aria-label="Expand uploads"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              className="upload-widget-mini-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (isAllComplete && onDismiss) onDismiss();
                else onClose();
              }}
              aria-label={isAllComplete ? 'Close uploads panel' : 'Minimize uploads'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="upload-widget-mini-list">
          {state.files.map((file) => (
            <div key={file.id} className="upload-widget-mini-item">
              <div className="upload-widget-mini-icon">
                {file.previewUrl ? (
                  file.mediaKind === 'video' ? (
                    <video src={file.previewUrl} muted playsInline preload="metadata" />
                  ) : (
                    <img src={file.previewUrl} alt="" />
                  )
                ) : file.mediaKind === 'video' ? (
                  <Film size={16} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                ) : (
                  <ImageIcon size={16} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                )}
              </div>
              <div className="upload-widget-mini-details">
                <p className="upload-widget-mini-name">{file.name}</p>
                <p
                  className={`upload-widget-mini-status ${
                    file.status === 'completed' ? 'is-done' : file.status === 'error' ? 'is-error' : ''
                  }`}
                >
                  {file.status === 'completed'
                    ? 'Completed'
                    : file.status === 'error'
                      ? 'Failed'
                      : file.status === 'waiting'
                        ? 'Paused'
                        : file.status === 'processing'
                          ? file.progress < 5
                            ? 'Optimizing…'
                            : 'Finishing…'
                          : `${uploadActiveLabel(file.mediaKind)} · ${formatUploadMb(file.size)}`}
                </p>
              </div>
              <div
                className={`upload-widget-mini-trail ${
                  file.status === 'uploading' || file.status === 'processing' ? 'is-spin' : ''
                }`}
              >
                {file.status === 'completed' ? (
                  <CheckCircle2 size={20} strokeWidth={2} />
                ) : file.status === 'error' ? (
                  <X size={18} strokeWidth={2} color="#f08070" />
                ) : file.status === 'uploading' || file.status === 'processing' ? (
                  <Loader2 size={18} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-manager-root upload-panel">
      <header className="upload-panel-header">
        <h2 className="upload-panel-title">
          {inProgressCount > 0 ? (
            <Loader2 size={22} strokeWidth={2} className="upload-fab-spin" />
          ) : isAllComplete ? (
            <CheckCircle2 size={22} strokeWidth={2} />
          ) : (
            <CloudUpload size={22} strokeWidth={1.75} />
          )}
          Uploads
        </h2>
        <div className="upload-panel-header-actions">
          <button
            type="button"
            className="upload-panel-hide"
            onClick={onMinimize}
            aria-label="Minimize uploads panel"
          >
            <span className="upload-panel-hide-icon" aria-hidden>
              <ChevronDown size={14} strokeWidth={2.25} />
            </span>
            Minimize
          </button>
          {isAllComplete && onDismiss ? (
            <button type="button" className="upload-panel-close-done" onClick={onDismiss}>
              Close
            </button>
          ) : null}
        </div>
      </header>

      <div className="upload-panel-body">
        {isAllComplete ? (
          <section className="upload-batch upload-batch--done">
            <p className="upload-batch-path">{destinationLabel}</p>
            {!state.showDetails ? (
              <div className="upload-batch-success">
                <span className="upload-batch-success-check" aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="upload-batch-success-text">{completeSummary}</span>
                <div className="upload-batch-success-actions">
                  {onViewCompleted && (
                    <button
                      type="button"
                      className="upload-batch-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewCompleted();
                      }}
                    >
                      View
                    </button>
                  )}
                  {onDismiss && (
                    <button type="button" className="upload-batch-close-btn" onClick={onDismiss}>
                      Close
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="upload-batch-done-list-head">
                  <div className="upload-batch-done-list-head-left">
                    <span className="upload-batch-success-check" aria-hidden>
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="upload-batch-success-text">{completeSummary}</span>
                  </div>
                </div>
                {detailsTabsAndList}
              </>
            )}
          </section>
        ) : (
          <section className="upload-batch upload-batch--active">
            <div className="upload-batch-head">
              <p className="upload-batch-path">{destinationLabel}</p>
              <span className="upload-batch-percent">{overallPercent}%</span>
            </div>

            <div
              className="upload-batch-bar"
              role="progressbar"
              aria-valuenow={overallPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="upload-batch-bar-fill" style={{ width: `${overallPercent}%` }} />
            </div>

            <div className="upload-batch-meta">
              <div className="upload-batch-meta-left">
                <span className="upload-batch-count">
                  {completedCount}
                  <span className="upload-batch-count-sep">/</span>
                  {totalCount}
                </span>
                {totalBytes > 0 ? (
                  <span className="upload-batch-size-info">
                    {formatUploadMb(doneBytes)}
                    <span className="upload-batch-count-sep">/</span>
                    {formatUploadMb(totalBytes)}
                    {formattedSpeed ? (
                      <>
                        <span className="upload-batch-dot">·</span>
                        {formattedSpeed}
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div className="upload-batch-meta-actions">
                {inProgressCount > 0 && (
                  <button
                    type="button"
                    className="upload-panel-action-pause"
                    onClick={isPaused ? onResume : onPause}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                )}
                <button type="button" className="upload-panel-action-cancel" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </div>

            {detailsTabsAndList}
          </section>
        )}
      </div>
    </div>
  );
};
