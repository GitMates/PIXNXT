import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { galleryService } from '../services/gallery.service';
import { prepareUploadFile } from '../lib/prepareUploadFile';
import { isImageMime, getFileMime } from '../lib/fileMime';
import { isRawImageFile } from '../lib/rawImageFormats';
import { extractRawPreviewBlob } from '../lib/rawImagePreview';
import { initialUploadWidgetState } from '../components/features/CollectionDashboard/Upload/uploadTypes';
import {
  partitionDuplicateUploadFiles,
  sortFilesBySizeAsc,
  sortUploadQueueBySizeAsc,
  uploadTabCounts,
} from '../components/features/CollectionDashboard/Upload/uploadUtils';

const LARGE_FILE_BYTES = 6 * 1024 * 1024;
const MAX_CONCURRENT_SMALL = 4;
const MAX_CONCURRENT_LARGE = 1;

const UploadQueueContext = createContext(null);

function getMaxConcurrent(files, pending) {
  const all = [...files, ...pending];
  return all.some((f) => f.file.size >= LARGE_FILE_BYTES);
}

function revokePreviews(files) {
  files.forEach((f) => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  });
}

export function UploadQueueProvider({ children }) {
  const [state, setState] = useState(() => ({ ...initialUploadWidgetState }));
  const [destinationLabel, setDestinationLabel] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [uploadTargetSetId, setUploadTargetSetId] = useState(null);
  const pausedRef = useRef(false);
  const photoIndexRef = useRef(0);
  const activeCountRef = useRef(0);
  const pendingQueueRef = useRef([]);
  const sessionRef = useRef(0);
  const stateRef = useRef(state);
  const targetRef = useRef(null);
  /** Last batch enqueue target (for widget label / View navigation while uploads run). */
  const lastBatchTargetRef = useRef(null);

  stateRef.current = state;

  const configureTarget = useCallback((config) => {
    targetRef.current = config;
    const inFlight = stateRef.current.files.some(
      (f) => f.status === 'uploading' || f.status === 'processing' || f.status === 'waiting'
    );
    if (!inFlight) {
      if (config?.destinationLabel) {
        setDestinationLabel(config.destinationLabel);
      }
      if ('activeSetId' in (config || {})) {
        setUploadTargetSetId(config.activeSetId ?? null);
      }
    }
    if (config?.collectionId) {
      setActiveCollectionId(config.collectionId);
    }
    if (config?.photosLength != null && !inFlight) {
      photoIndexRef.current = config.photosLength;
    }
  }, []);

  const patchFile = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }, []);

  const runUpload = useCallback(
    async (uf) => {
      const collectionId = uf.collectionId;
      const photographerId = uf.photographerId;
      const setId = uf.setId ?? null;
      const sortIndex = uf.sortIndex ?? 0;

      if (!collectionId || !photographerId || !uf.file) {
        patchFile(uf.id, {
          status: 'error',
          progress: 0,
          errorMessage: !photographerId
            ? 'Photographer account not loaded. Refresh and try again.'
            : 'Open a collection before uploading.',
        });
        return;
      }

      const session = sessionRef.current;

      const safePatch = (patch) => {
        if (session !== sessionRef.current) return;
        patchFile(uf.id, patch);
      };

      safePatch({ status: 'processing', progress: 0 });

      try {
        const fileToUpload = await prepareUploadFile(uf.file, (pct) => {
          safePatch({ status: 'processing', progress: Math.min(12, Math.round(pct * 0.12)) });
        });

        safePatch({
          uploadSize: fileToUpload.size,
          status: 'uploading',
          progress: 12,
        });

        const photoData = await galleryService.uploadPhoto(
          collectionId,
          photographerId,
          fileToUpload,
          sortIndex,
          setId,
          (percent) => {
            const mapped = 12 + Math.round(percent * 0.88);
            safePatch({ status: percent >= 100 ? 'processing' : 'uploading', progress: mapped });
          }
        );

        if (session !== sessionRef.current) return;
        safePatch({ progress: 100, status: 'completed' });
        targetRef.current?.onPhotoUploaded?.(photoData);
      } catch (err) {
        console.error('Upload failed:', err);
        const message =
          err instanceof Error ? err.message : 'Upload failed. Check your connection and try again.';
        safePatch({ status: 'error', progress: 0, errorMessage: message });
      }
    },
    [patchFile]
  );

  const pumpQueue = useCallback(() => {
    if (pausedRef.current) return;

    pendingQueueRef.current = sortUploadQueueBySizeAsc(pendingQueueRef.current);

    const hasLarge = getMaxConcurrent(stateRef.current.files, pendingQueueRef.current);
    const maxConcurrent = hasLarge ? MAX_CONCURRENT_LARGE : MAX_CONCURRENT_SMALL;

    while (activeCountRef.current < maxConcurrent && pendingQueueRef.current.length > 0) {
      const uf = pendingQueueRef.current.shift();
      if (!uf) break;

      activeCountRef.current += 1;
      void runUpload(uf).finally(() => {
        activeCountRef.current -= 1;
        pumpQueue();
      });
    }
  }, [runUpload]);

  const enqueueUpload = useCallback(
    (uf) => {
      if (pausedRef.current) {
        patchFile(uf.id, { status: 'waiting', progress: 0 });
        pendingQueueRef.current.push(uf);
        return;
      }
      pendingQueueRef.current.push(uf);
      pendingQueueRef.current = sortUploadQueueBySizeAsc(pendingQueueRef.current);
      pumpQueue();
    },
    [patchFile, pumpQueue]
  );

  const processWaiting = useCallback(() => {
    setState((prev) => {
      const waiting = prev.files.filter((f) => f.status === 'waiting');
      waiting.forEach((f) => {
        if (!pendingQueueRef.current.some((q) => q.id === f.id)) {
          pendingQueueRef.current.push(f);
        }
      });
      pendingQueueRef.current = sortUploadQueueBySizeAsc(pendingQueueRef.current);
      return prev;
    });
    queueMicrotask(() => pumpQueue());
  }, [pumpQueue]);

  const processFiles = useCallback(
    async (fileList, uploadTargetOverride) => {
      const target = uploadTargetOverride
        ? { ...targetRef.current, ...uploadTargetOverride }
        : targetRef.current;
      if (!target?.collectionId || !target?.photographerId) {
        alert('Open a collection before uploading photos.');
        return false;
      }

      const rawFiles = Array.from(fileList || []);
      const files = rawFiles.filter((f) => f.size > 0);

      if (rawFiles.length > 0 && files.length === 0) {
        alert(
          'The selected files are empty or corrupted. If you are uploading a file from another app, please save it to your computer first.'
        );
        return false;
      }
      if (files.length === 0) return false;

      const existingNames = (target.existingFilenames || []).map((n) => n.toLowerCase());
      const queuedNames = stateRef.current.files
        .filter((f) => f.status !== 'error')
        .map((f) => f.name.toLowerCase());
      const { accepted, skipped } = partitionDuplicateUploadFiles(
        files,
        existingNames,
        queuedNames
      );

      if (skipped.length > 0) {
        const preview = skipped.slice(0, 5).join(', ');
        const more = skipped.length > 5 ? ` and ${skipped.length - 5} more` : '';
        alert(
          `Skipped ${skipped.length} duplicate file(s) already in this collection: ${preview}${more}`
        );
      }
      if (accepted.length === 0) return false;

      const sortedAccepted = sortFilesBySizeAsc(accepted);

      const collectionId = target.collectionId;
      const photographerId = target.photographerId;
      const setId = target.activeSetId ?? null;
      const batchDestination =
        target.destinationLabel || destinationLabel || 'Collection';
      const baseSortIndex = photoIndexRef.current;

      lastBatchTargetRef.current = {
        collectionId,
        activeSetId: setId,
        destinationLabel: batchDestination,
      };
      setDestinationLabel(batchDestination);
      setUploadTargetSetId(setId);
      setActiveCollectionId(collectionId);

      const newUploadFiles = sortedAccepted.map((file, index) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: pausedRef.current ? 'waiting' : 'processing',
        previewUrl: undefined,
        collectionId,
        photographerId,
        setId,
        sortIndex: baseSortIndex + index,
        destinationLabel: batchDestination,
      }));

      photoIndexRef.current = baseSortIndex + sortedAccepted.length;

      setState((prev) => ({
        ...prev,
        isOpen: true,
        isMinimized: false,
        activeTab: 'uploading',
        files: [...prev.files, ...newUploadFiles],
      }));

      const attachPreview = async (uf) => {
        const { file } = uf;
        let previewUrl;
        try {
          if (isRawImageFile(file)) {
            const previewBlob = await extractRawPreviewBlob(file);
            if (previewBlob) previewUrl = URL.createObjectURL(previewBlob);
          } else if (isImageMime(getFileMime(file))) {
            previewUrl = URL.createObjectURL(file);
          }
        } catch (err) {
          console.warn('Upload preview generation failed:', file.name, err);
        }
        if (previewUrl) patchFile(uf.id, { previewUrl });
      };

      newUploadFiles.forEach((uf) => {
        void attachPreview(uf);
        if (pausedRef.current) {
          pendingQueueRef.current.push(uf);
        } else {
          enqueueUpload(uf);
        }
      });

      return true;
    },
    [enqueueUpload, patchFile, destinationLabel]
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((prev) => ({
      ...prev,
      isPaused: true,
      files: prev.files.map((f) =>
        f.status === 'uploading' || f.status === 'processing'
          ? { ...f, status: 'waiting', progress: f.progress }
          : f
      ),
    }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState((prev) => ({ ...prev, isPaused: false }));
    processWaiting();
  }, [processWaiting]);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    pendingQueueRef.current = [];
    activeCountRef.current = 0;
    pausedRef.current = false;
    lastBatchTargetRef.current = null;
    setState((prev) => {
      revokePreviews(prev.files);
      return { ...initialUploadWidgetState };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      const { uploading } = uploadTabCounts(prev.files);
      if (uploading > 0) return prev;
      revokePreviews(prev.files);
      return { ...initialUploadWidgetState };
    });
  }, []);

  const closeWidget = useCallback(() => {
    setState((prev) => {
      const { uploading } = uploadTabCounts(prev.files);
      if (uploading > 0) {
        return { ...prev, isMinimized: true };
      }
      revokePreviews(prev.files);
      return { ...initialUploadWidgetState };
    });
  }, []);

  const minimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const setActiveTab = useCallback((tab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleDetails = useCallback(() => {
    setState((prev) => ({ ...prev, showDetails: !prev.showDetails }));
  }, []);

  /** Close panel shortly after every file uploads successfully (no failures in flight). */
  useEffect(() => {
    if (!state.isOpen) return;
    const total = state.files.length;
    if (total === 0) return;
    const { complete, uploading, failed } = uploadTabCounts(state.files);
    if (uploading > 0 || failed > 0 || complete !== total) return;

    const timer = window.setTimeout(() => dismiss(), 1200);
    return () => window.clearTimeout(timer);
  }, [state.isOpen, state.files, dismiss]);

  /** Expand panel and show the file list on the Complete tab (used by “View” after uploads finish). */
  const openCompletedUploadDetails = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
      showDetails: true,
      activeTab: 'complete',
    }));
  }, []);

  const getUploadTarget = useCallback(() => {
    const batch = lastBatchTargetRef.current;
    if (batch?.collectionId) {
      return {
        collectionId: batch.collectionId,
        activeSetId: batch.activeSetId ?? null,
        destinationLabel: batch.destinationLabel || destinationLabel || 'Collection',
      };
    }
    const target = targetRef.current;
    if (!target?.collectionId) return null;
    return {
      collectionId: target.collectionId,
      activeSetId: target.activeSetId ?? null,
      destinationLabel: target.destinationLabel || destinationLabel || 'Collection',
    };
  }, [destinationLabel]);

  const value = useMemo(
    () => ({
      state,
      destinationLabel,
      activeCollectionId,
      uploadTargetSetId,
      configureTarget,
      getUploadTarget,
      processFiles,
      pause,
      resume,
      cancel,
      dismiss,
      closeWidget,
      minimize,
      expand,
      setActiveTab,
      toggleDetails,
      openCompletedUploadDetails,
    }),
    [
      state,
      destinationLabel,
      activeCollectionId,
      uploadTargetSetId,
      configureTarget,
      getUploadTarget,
      processFiles,
      pause,
      resume,
      cancel,
      dismiss,
      closeWidget,
      minimize,
      expand,
      setActiveTab,
      toggleDetails,
      openCompletedUploadDetails,
    ]
  );

  return (
    <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>
  );
}

export function useUploadQueueContext() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error('useUploadQueueContext must be used within UploadQueueProvider');
  }
  return ctx;
}

/** Minimize once when navigating away from collection manage (do not block reopening via FAB). */
export function UploadQueueRouteSync() {
  const location = useLocation();
  const { state, minimize } = useUploadQueueContext();
  const prevPathRef = useRef(null);

  React.useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;

    if (prev === '/collections/manage' && curr !== '/collections/manage') {
      if (state.isOpen && !state.isMinimized) {
        minimize();
      }
    }
  }, [location.pathname, state.isOpen, state.isMinimized, minimize]);

  return null;
}
