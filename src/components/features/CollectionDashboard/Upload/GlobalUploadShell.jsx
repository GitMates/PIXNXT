import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloudUpload, Loader2, CheckCircle2 } from 'lucide-react';
import { useUploadQueueContext } from '../../../../contexts/uploadQueueContext';
import { UploadManager } from './UploadManager';
import { uploadCompleteSummary, uploadInProgressTitle, uploadTabCounts } from './uploadUtils';
import './UploadManager.css';

export const UPLOAD_VIEW_COLLECTION_EVENT = 'pixnxt-upload-view-collection';

export function GlobalUploadShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    state,
    notice,
    destinationLabel,
    minimize,
    expand,
    closeWidget,
    dismiss,
    pause,
    resume,
    cancel,
    setActiveTab,
    toggleDetails,
    openCompletedUploadDetails,
    activeCollectionId,
    uploadTargetSetId,
    getUploadTarget,
    retryFailed,
    dismissNotice,
  } = useUploadQueueContext();

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const inProgress = counts.uploading;
  const isAllComplete =
    state.files.length > 0 &&
    counts.complete === state.files.length &&
    inProgress === 0 &&
    counts.failed === 0;
  const completeSummary = useMemo(() => uploadCompleteSummary(state.files), [state.files]);
  const inProgressTitle = useMemo(
    () => uploadInProgressTitle(state.files, inProgress),
    [state.files, inProgress]
  );

  if (!state.isOpen && !notice) return null;

  const handleViewCompleted = () => {
    const target = getUploadTarget();
    const targetCollectionId = target?.collectionId ?? activeCollectionId;
    const targetSetId = target?.activeSetId ?? uploadTargetSetId ?? null;
    const targetViewPath = target?.viewPath;

    if (!targetCollectionId) {
      if (isAllComplete) dismiss();
      else minimize();
      return;
    }

    if (targetViewPath) {
      const isOnTarget =
        location.pathname === targetViewPath ||
        location.pathname.startsWith(`${targetViewPath}/`);

      if (!isOnTarget) {
        navigate(targetViewPath);
      }

      openCompletedUploadDetails();
      return;
    }

    const detail = {
      collectionId: targetCollectionId,
      activeSetId: targetSetId,
    };

    const isOnTargetManage =
      location.pathname === '/deliveries/manage' &&
      new URLSearchParams(location.search).get('id') === targetCollectionId;

    if (!isOnTargetManage) {
      navigate(`/deliveries/manage?id=${encodeURIComponent(targetCollectionId)}`, {
        state: { uploadView: detail },
      });
    } else {
      window.dispatchEvent(
        new CustomEvent(UPLOAD_VIEW_COLLECTION_EVENT, { detail })
      );
    }

    openCompletedUploadDetails();
  };

  return (
    <>
      {notice ? (
        <div className="cd-modal-overlay" onClick={dismissNotice}>
          <div
            className="cd-modal cd-modal-sm"
            role="dialog"
            aria-modal="true"
            aria-label={notice.title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">{notice.title}</h3>
              <button type="button" className="cd-modal-close" onClick={dismissNotice} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="cd-modal-body">
              <p className="cd-modal-text">{notice.message}</p>
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-btn-primary" onClick={dismissNotice} autoFocus>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {state.isOpen ? (
        <UploadManager
          state={state}
          destinationLabel={destinationLabel || 'Delivery'}
          isPaused={state.isPaused}
          onMinimize={minimize}
          onExpand={expand}
          onClose={closeWidget}
          onDismiss={isAllComplete ? dismiss : undefined}
          onPause={pause}
          onResume={resume}
          onCancel={cancel}
          onTabChange={setActiveTab}
          onToggleDetails={toggleDetails}
          onViewCompleted={handleViewCompleted}
          onRetry={retryFailed}
        />
      ) : null}
    </>
  );
}
