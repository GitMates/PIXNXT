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
  } = useUploadQueueContext();

  const counts = useMemo(() => uploadTabCounts(state.files), [state.files]);
  const inProgress = counts.uploading;
  const isAllComplete =
    state.files.length > 0 && counts.complete === state.files.length && inProgress === 0;
  const completeSummary = useMemo(() => uploadCompleteSummary(state.files), [state.files]);
  const inProgressTitle = useMemo(
    () => uploadInProgressTitle(state.files, inProgress),
    [state.files, inProgress]
  );

  if (!state.isOpen) return null;

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
  );
}
