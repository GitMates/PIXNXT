import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloudUpload, Loader2, CheckCircle2 } from 'lucide-react';
import { useUploadQueueContext } from '../../../../contexts/UploadQueueContext';
import { UploadManager } from './UploadManager';
import { uploadTabCounts } from './uploadUtils';
import './UploadManager.css';

export const UPLOAD_VIEW_COLLECTION_EVENT = 'pixnxt-upload-view-collection';

export function GlobalUploadShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    state,
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
  } = useUploadQueueContext();

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const inProgress = counts.uploading;
  const isAllComplete =
    state.files.length > 0 && counts.complete === state.files.length && inProgress === 0;

  if (!state.isOpen) return null;

  const showExpanded = !state.isMinimized;
  const showFab = state.isMinimized;

  const handleViewCompleted = () => {
    const target = getUploadTarget();
    const targetCollectionId = target?.collectionId ?? activeCollectionId;
    const targetSetId = target?.activeSetId ?? uploadTargetSetId ?? null;

    if (!targetCollectionId) {
      if (isAllComplete) dismiss();
      else minimize();
      return;
    }

    const detail = {
      collectionId: targetCollectionId,
      activeSetId: targetSetId,
    };

    const isOnTargetManage =
      location.pathname === '/collections/manage' &&
      new URLSearchParams(location.search).get('id') === targetCollectionId;

    if (!isOnTargetManage) {
      navigate(`/collections/manage?id=${encodeURIComponent(targetCollectionId)}`, {
        state: { uploadView: detail },
      });
    } else {
      window.dispatchEvent(
        new CustomEvent(UPLOAD_VIEW_COLLECTION_EVENT, { detail })
      );
    }

    // Keep the upload panel open on the Complete tab so “View” shows the finished file list.
    openCompletedUploadDetails();
  };

  const handleFabClick = () => {
    expand();
  };

  return (
    <>
      {showExpanded && (
        <UploadManager
          state={state}
          destinationLabel={destinationLabel || 'Collection'}
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
        />
      )}

      {showFab && (
        <button
          type="button"
          className={`upload-fab${inProgress > 0 ? ' upload-fab--active' : ''}${isAllComplete ? ' upload-fab--done' : ''}`}
          onClick={handleFabClick}
          aria-label={
            isAllComplete
              ? `${counts.complete} uploads complete. Open upload panel`
              : `Uploading ${inProgress} items. Open upload panel`
          }
        >
          <span className="upload-fab-icon" aria-hidden>
            {isAllComplete ? (
              <CheckCircle2 size={26} strokeWidth={2} />
            ) : inProgress > 0 ? (
              <Loader2 size={26} strokeWidth={2} className="upload-fab-spin" />
            ) : (
              <CloudUpload size={26} strokeWidth={1.75} />
            )}
          </span>
          {inProgress > 0 && (
            <span className="upload-fab-badge">{inProgress}</span>
          )}
          {isAllComplete && !inProgress && (
            <span className="upload-fab-badge upload-fab-badge--done">{counts.complete}</span>
          )}
        </button>
      )}
    </>
  );
}
