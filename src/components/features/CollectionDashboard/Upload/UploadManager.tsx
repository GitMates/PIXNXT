import React, { useMemo } from 'react';
import {
  CloudUpload,
  ChevronUp,
  Minus,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Check,
} from 'lucide-react';
import type { UploadWidgetState } from './uploadTypes';
import {
  filterFilesByTab,
  formatUploadMb,
  uploadBytesDone,
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

  const detailsTabsAndList = (
    <div className="upload-batch-details">
      <div className="upload-panel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'uploading'}
          className={`upload-panel-tab ${state.activeTab === 'uploading' ? 'active' : ''}`}
          onClick={() => onTabChange('uploading')}
        >
          Uploading
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'complete'}
          className={`upload-panel-tab ${state.activeTab === 'complete' ? 'active' : ''}`}
          onClick={() => onTabChange('complete')}
        >
          Complete
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'failed'}
          className={`upload-panel-tab ${state.activeTab === 'failed' ? 'active' : ''}`}
          onClick={() => onTabChange('failed')}
        >
          Failed
        </button>
      </div>

      <div className="upload-panel-list">
        {activeFiles.length === 0 ? (
          <p className="upload-panel-empty">No files in this tab.</p>
        ) : (
          activeFiles.map((file) => (
            <div key={file.id} className="upload-panel-row upload-panel-row--stacked">
              <div className="upload-panel-row-main">
                <span
                  className={`upload-panel-row-name ${
                    file.status === 'error'
                      ? 'is-error'
                      : file.status === 'completed'
                        ? 'is-done'
                        : ''
                  }`}
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="upload-panel-row-progress">
                  {file.status === 'error'
                    ? 'Failed'
                    : `${formatUploadMb(uploadBytesDone(file))}/${formatUploadMb(uploadTotalBytes(file))}`}
                </span>
              </div>
              {file.status === 'error' && file.errorMessage && (
                <p className="upload-panel-row-error" title={file.errorMessage}>
                  {file.errorMessage}
                </p>
              )}
            </div>
          ))
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
                {isAllComplete
                  ? `${completedCount} ${completedCount === 1 ? 'image' : 'images'} uploaded`
                  : `Uploading ${inProgressCount} ${inProgressCount === 1 ? 'item' : 'items'}`}
              </p>
              {inProgressCount > 0 && (
                <p className="upload-widget-mini-sub">
                  {formatUploadMb(
                    state.files.reduce((acc, f) => acc + uploadBytesDone(f), 0)
                  )}{' '}
                  /{' '}
                  {formatUploadMb(state.files.reduce((acc, f) => acc + uploadTotalBytes(f), 0))}
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
                  <img src={file.previewUrl} alt="" />
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
                          : `Uploading · ${formatUploadMb(file.size)}`}
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
            <Loader2 size={26} strokeWidth={1.75} className="upload-fab-spin" />
          ) : isAllComplete ? (
            <CheckCircle2 size={26} strokeWidth={1.75} />
          ) : (
            <CloudUpload size={26} strokeWidth={1.25} />
          )}
          Uploads
        </h2>
        <div className="upload-panel-header-actions">
          {isAllComplete && onDismiss ? (
            <button type="button" className="upload-panel-close-done" onClick={onDismiss}>
              Close
            </button>
          ) : null}
          <button type="button" className="upload-panel-hide" onClick={onMinimize}>
            Hide
            <span className="upload-panel-hide-icon" aria-hidden>
              <Minus size={16} strokeWidth={1.5} />
            </span>
          </button>
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
                <span className="upload-batch-success-text">
                  {completedCount} {completedCount === 1 ? 'image' : 'images'} uploaded
                </span>
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
                    <span className="upload-batch-success-text">
                      {completedCount} {completedCount === 1 ? 'image' : 'images'} uploaded
                    </span>
                  </div>
                  <button type="button" className="upload-batch-details-link" onClick={onToggleDetails}>
                    − Hide file list
                  </button>
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

            <div className="upload-batch-bar" role="progressbar" aria-valuenow={overallPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="upload-batch-bar-fill" style={{ width: `${overallPercent}%` }} />
            </div>

            <div className="upload-batch-meta">
              <div className="upload-batch-meta-left">
                <span className="upload-batch-count">
                  {completedCount} / {totalCount}
                </span>
                <button type="button" className="upload-batch-details-link" onClick={onToggleDetails}>
                  {state.showDetails ? '− Hide details' : '+ View details'}
                </button>
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

            {state.showDetails && detailsTabsAndList}
          </section>
        )}
      </div>
    </div>
  );
};
