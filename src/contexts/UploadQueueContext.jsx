import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { galleryService } from '../services/gallery.service';
import { isImageMime, isVideoMime, getFileMime } from '../lib/fileMime';
import { getUploadMediaKindFromFile } from '../components/features/CollectionDashboard/Upload/uploadUtils';
import { isRawImageFile } from '../lib/rawImageFormats';
import { extractRawPreviewBlob } from '../lib/rawImagePreview';
import { initialUploadWidgetState } from '../components/features/CollectionDashboard/Upload/uploadTypes';
import {
  partitionDuplicateUploadFiles,
  sortFilesBySizeAsc,
  sortUploadQueueBySizeAsc,
  uploadTabCounts,
  isIncompleteUploadPhoto,
} from '../components/features/CollectionDashboard/Upload/uploadUtils';
import { UploadQueueContext } from './uploadQueueContext';

/** Small derivative PUTs — push concurrency hard (Pixieset-style preview-first). */
const MAX_CONCURRENT_DERIVATIVES = 20;
/** Full originals share less bandwidth so they finish faster each. */
const LARGE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_CONCURRENT_ORIGINALS_SMALL = 10;
const MAX_CONCURRENT_ORIGINALS_LARGE = 6;

function getMaxOriginalConcurrent(files, pending) {
  const all = [...files, ...pending];
  return all.some((f) => (f.file?.size || f.size || 0) >= LARGE_FILE_BYTES)
    ? MAX_CONCURRENT_ORIGINALS_LARGE
    : MAX_CONCURRENT_ORIGINALS_SMALL;
}

function revokePreviews(files) {
  files.forEach((f) => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  });
}

function handleStorageLimitError(message) {
  if (!message.includes('Storage limit exceeded') && !message.includes('Remaining storage space')) {
    return;
  }
  let remaining = '0.00 MB';
  const match = message.match(/Remaining storage space:\s*(.*?)\.\s*This/i);
  if (match && match[1]) {
    remaining = match[1].trim();
  }
  alert(`You have ${remaining} only. Try to upload files below this size limit.`);
}

function isUploadCancelled(err) {
  return err instanceof Error && /Upload cancelled/i.test(err.message);
}

/** Normalize Supabase PostgREST / R2 / unknown throws into a user-visible string. */
function uploadErrorMessage(err) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const msg = err.message || err.error_description || err.error || err.details;
    if (msg) {
      const code = err.code ? ` (${err.code})` : '';
      return `${msg}${code}`;
    }
  }
  if (typeof err === 'string' && err.trim()) return err;
  return 'Upload failed. Check your connection and try again.';
}

function getUploadPhase(uf, originalContextById) {
  const map = originalContextById.current || originalContextById;
  const uploadContext = uf.uploadContext || map.get(uf.id);
  if (uploadContext || (uf.progress ?? 0) >= 25) return 'original';
  return 'derivative';
}

function requeueUploadFile(uf, phase, pendingDerivativesRef, pendingOriginalsRef, originalContextById) {
  const id = uf.id;
  if (phase === 'original') {
    const map = originalContextById.current || originalContextById;
    const uploadContext = uf.uploadContext || map.get(id);
    if (!pendingOriginalsRef.current.some((q) => q.id === id)) {
      pendingOriginalsRef.current.push({ ...uf, uploadContext });
      pendingOriginalsRef.current = sortUploadQueueBySizeAsc(pendingOriginalsRef.current);
    }
    return;
  }
  if (!pendingDerivativesRef.current.some((q) => q.id === id)) {
    pendingDerivativesRef.current.push(uf);
    pendingDerivativesRef.current = sortUploadQueueBySizeAsc(pendingDerivativesRef.current);
  }
}

export function UploadQueueProvider({ children }) {
  const [state, setState] = useState(() => ({ ...initialUploadWidgetState }));
  const [destinationLabel, setDestinationLabel] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [uploadTargetSetId, setUploadTargetSetId] = useState(null);
  const pausedRef = useRef(false);
  const photoIndexRef = useRef(0);
  const activeDerivativesRef = useRef(0);
  const activeOriginalsRef = useRef(0);
  const pendingDerivativesRef = useRef([]);
  const pendingOriginalsRef = useRef([]);
  /** Survives pause/resume so originals can continue without redoing web/thumb. */
  const originalContextByIdRef = useRef(new Map());
  /** In-flight job ids — avoid double-enqueue on pause/resume. */
  const activeJobIdsRef = useRef(new Set());
  /** AbortControllers for active XHR uploads (pause cancels these). */
  const abortControllersRef = useRef(new Map());
  const sessionRef = useRef(0);
  const stateRef = useRef(state);
  const targetRef = useRef(null);
  /** Last batch enqueue target (for widget label / View navigation while uploads run). */
  const lastBatchTargetRef = useRef(null);
  const pumpQueueRef = useRef(() => {});

  stateRef.current = state;

  const configureTarget = useCallback((config) => {
    targetRef.current = { ...(targetRef.current || {}), ...config };
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

  const runDerivativeUpload = useCallback(
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
            : 'Open a delivery before uploading.',
        });
        return;
      }

      const session = sessionRef.current;
      const safePatch = (patch) => {
        if (session !== sessionRef.current) return;
        patchFile(uf.id, patch);
      };

      safePatch({
        status: 'processing',
        progress: 0,
        uploadSize: uf.file.size,
      });

      const controller = new AbortController();
      abortControllersRef.current.set(uf.id, controller);

      try {
        const customUpload = targetRef.current?.uploadPhotoFn;
        if (customUpload) {
          const fileToUpload = uf.file;
          safePatch({
            uploadSize: fileToUpload.size,
            status: 'uploading',
            progress: 0,
          });
          const photoData = await customUpload({
            file: fileToUpload,
            photographerId,
            sortIndex,
            setId,
            onProgress: (percent) => {
              safePatch({
                status: percent >= 100 ? 'processing' : 'uploading',
                progress: percent,
              });
            },
          });
          if (session !== sessionRef.current) return;
          safePatch({ progress: 100, status: 'completed' });
          targetRef.current?.onPhotoUploaded?.(photoData);
          return;
        }

        const { uploadContext } = await galleryService.uploadPhotoDerivatives(
          collectionId,
          photographerId,
          uf.file,
          sortIndex,
          setId,
          (percent) => {
            // Phase 1 occupies 0–25% of the per-file bar
            safePatch({
              status: 'uploading',
              progress: Math.min(25, Math.round((percent / 100) * 25)),
            });
          },
          (insertedPhoto) => {
            if (session === sessionRef.current) {
              targetRef.current?.onPhotoUploaded?.(insertedPhoto);
            }
          },
          { signal: controller.signal }
        );

        if (session !== sessionRef.current) return;

        originalContextByIdRef.current.set(uf.id, uploadContext);
        safePatch({ status: 'waiting', progress: 25 });
        pendingOriginalsRef.current.push({ ...uf, uploadContext });
        pendingOriginalsRef.current = sortUploadQueueBySizeAsc(pendingOriginalsRef.current);
      } catch (err) {
        if (isUploadCancelled(err) && pausedRef.current) {
          safePatch({ status: 'waiting', progress: Math.min(uf.progress ?? 0, 24) });
          requeueUploadFile(
            uf,
            'derivative',
            pendingDerivativesRef,
            pendingOriginalsRef,
            originalContextByIdRef
          );
          return;
        }
        console.error('Derivative upload failed:', err);
        const message = uploadErrorMessage(err);
        handleStorageLimitError(message);
        safePatch({ status: 'error', progress: 0, errorMessage: message });
      } finally {
        abortControllersRef.current.delete(uf.id);
      }
    },
    [patchFile]
  );

  const runOriginalUpload = useCallback(
    async (uf) => {
      const session = sessionRef.current;
      const safePatch = (patch) => {
        if (session !== sessionRef.current) return;
        patchFile(uf.id, patch);
      };

      const uploadContext = uf.uploadContext || originalContextByIdRef.current.get(uf.id);
      if (!uploadContext) {
        safePatch({
          status: 'error',
          progress: 0,
          errorMessage: 'Missing upload context for original file.',
        });
        return;
      }

      safePatch({
        status: 'uploading',
        progress: Math.max(uf.progress || 25, 25),
        uploadSize: uf.file?.size || uf.size,
      });

      const controller = new AbortController();
      abortControllersRef.current.set(uf.id, controller);

      try {
        const photoData = await galleryService.uploadPhotoOriginal(
          uploadContext,
          (percent) => {
            // Phase 2 occupies 25–100%
            safePatch({
              status: percent >= 100 ? 'processing' : 'uploading',
              progress: 25 + Math.round((percent / 100) * 75),
            });
          },
          { signal: controller.signal }
        );

        if (session !== sessionRef.current) return;
        originalContextByIdRef.current.delete(uf.id);
        safePatch({ progress: 100, status: 'completed' });
        targetRef.current?.onPhotoUploaded?.(photoData);
      } catch (err) {
        if (isUploadCancelled(err) && pausedRef.current) {
          safePatch({ status: 'waiting', progress: Math.max(uf.progress ?? 25, 25) });
          requeueUploadFile(
            { ...uf, uploadContext },
            'original',
            pendingDerivativesRef,
            pendingOriginalsRef,
            originalContextByIdRef
          );
          return;
        }
        console.error('Original upload failed:', err);
        const message = uploadErrorMessage(err);
        handleStorageLimitError(message);
        safePatch({ status: 'error', progress: 0, errorMessage: message });
      } finally {
        abortControllersRef.current.delete(uf.id);
      }
    },
    [patchFile]
  );

  const pumpQueue = useCallback(() => {
    if (pausedRef.current) return;

    pendingDerivativesRef.current = sortUploadQueueBySizeAsc(pendingDerivativesRef.current);

    // Phase 1: finish ALL web/thumb work before any originals start
    while (
      activeDerivativesRef.current < MAX_CONCURRENT_DERIVATIVES &&
      pendingDerivativesRef.current.length > 0
    ) {
      const uf = pendingDerivativesRef.current.shift();
      if (!uf) break;

      activeDerivativesRef.current += 1;
      activeJobIdsRef.current.add(uf.id);
      void runDerivativeUpload(uf).finally(() => {
        activeDerivativesRef.current -= 1;
        activeJobIdsRef.current.delete(uf.id);
        pumpQueueRef.current();
      });
    }

    const derivativesStillRunning =
      pendingDerivativesRef.current.length > 0 || activeDerivativesRef.current > 0;
    if (derivativesStillRunning) return;

    pendingOriginalsRef.current = sortUploadQueueBySizeAsc(pendingOriginalsRef.current);
    const maxOriginals = getMaxOriginalConcurrent(
      stateRef.current.files,
      pendingOriginalsRef.current
    );

    while (
      activeOriginalsRef.current < maxOriginals &&
      pendingOriginalsRef.current.length > 0
    ) {
      const uf = pendingOriginalsRef.current.shift();
      if (!uf) break;

      activeOriginalsRef.current += 1;
      activeJobIdsRef.current.add(uf.id);
      void runOriginalUpload(uf).finally(() => {
        activeOriginalsRef.current -= 1;
        activeJobIdsRef.current.delete(uf.id);
        pumpQueueRef.current();
      });
    }
  }, [runDerivativeUpload, runOriginalUpload]);

  pumpQueueRef.current = pumpQueue;

  const enqueueUpload = useCallback(
    (uf) => {
      if (pausedRef.current) {
        patchFile(uf.id, { status: 'waiting', progress: 0 });
        pendingDerivativesRef.current.push(uf);
        return;
      }
      pendingDerivativesRef.current.push(uf);
      pendingDerivativesRef.current = sortUploadQueueBySizeAsc(pendingDerivativesRef.current);
      pumpQueue();
    },
    [patchFile, pumpQueue]
  );

  const requeueWaitingFiles = useCallback(() => {
    const waiting = stateRef.current.files.filter((f) => f.status === 'waiting');
    for (const f of waiting) {
      if (activeJobIdsRef.current.has(f.id)) continue;
      const inDerivatives = pendingDerivativesRef.current.some((q) => q.id === f.id);
      const inOriginals = pendingOriginalsRef.current.some((q) => q.id === f.id);
      if (inDerivatives || inOriginals) continue;
      requeueUploadFile(
        f,
        getUploadPhase(f, originalContextByIdRef),
        pendingDerivativesRef,
        pendingOriginalsRef,
        originalContextByIdRef
      );
    }
  }, []);

  const processFiles = useCallback(
    async (fileList, uploadTargetOverride) => {
      if (uploadTargetOverride) {
        targetRef.current = { ...(targetRef.current || {}), ...uploadTargetOverride };
        if (!Object.prototype.hasOwnProperty.call(uploadTargetOverride, 'uploadPhotoFn')) {
          delete targetRef.current.uploadPhotoFn;
        }
      }
      const target = targetRef.current;
      if (!target?.collectionId || !target?.photographerId) {
        alert('Open a delivery or event before uploading photos.');
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

      const collectionId = target.collectionId;
      const photographerId = target.photographerId;
      const setId = target.activeSetId ?? null;

      let existingPhotos = [];
      try {
        existingPhotos = await galleryService.findPhotosByFilenames(
          collectionId,
          files.map((f) => f.name),
          setId
        );
      } catch (err) {
        console.error('Failed to look up existing photos for upload:', err);
      }

      const missingOriginalKeys = new Set();
      await Promise.all(
        existingPhotos.map(async (photo) => {
          if (!photo?.filename) return;
          if (isIncompleteUploadPhoto(photo)) {
            missingOriginalKeys.add(String(photo.filename).toLowerCase());
            return;
          }
          const fileExt = photo.filename.split('.').pop()?.toLowerCase() || null;
          const missing = await galleryService.isOriginalMissingInR2(photo, fileExt);
          if (missing) {
            missingOriginalKeys.add(String(photo.filename).toLowerCase());
          }
        })
      );

      const incompleteByName = new Map();
      for (const photo of target.incompletePhotos || []) {
        if (photo?.filename) {
          incompleteByName.set(String(photo.filename).toLowerCase(), photo);
        }
      }
      for (const photo of existingPhotos) {
        if (!photo?.filename) continue;
        const key = String(photo.filename).toLowerCase();
        if (missingOriginalKeys.has(key)) {
          incompleteByName.set(key, photo);
        }
      }

      const existingCompleteNames = existingPhotos
        .filter((photo) => {
          if (!photo?.filename) return false;
          const key = String(photo.filename).toLowerCase();
          return !missingOriginalKeys.has(key);
        })
        .map((photo) => String(photo.filename).toLowerCase());

      const staleCompleteNames = (target.existingCompleteFilenames || target.existingFilenames || [])
        .map((n) => String(n).toLowerCase())
        .filter((key) => !missingOriginalKeys.has(key) && !incompleteByName.has(key));

      const completeNameSet = new Set([...existingCompleteNames, ...staleCompleteNames]);

      const queuedNames = stateRef.current.files
        .filter(
          (f) =>
            f.status === 'waiting' ||
            f.status === 'uploading' ||
            f.status === 'processing'
        )
        .map((f) => f.name.toLowerCase());
      const { accepted, resumable, skipped } = partitionDuplicateUploadFiles(
        files,
        completeNameSet,
        queuedNames,
        incompleteByName
      );

      if (skipped.length > 0) {
        const preview = skipped.slice(0, 5).join(', ');
        const more = skipped.length > 5 ? ` and ${skipped.length - 5} more` : '';
        alert(
          `Skipped ${skipped.length} duplicate file(s) already in this delivery: ${preview}${more}`
        );
      }
      if (accepted.length === 0 && resumable.length === 0) return false;

      if (resumable.length > 0) {
        alert(
          `Resuming ${resumable.length} upload(s): original missing in storage — uploading originals only (web & thumb already exist).`
        );
      }

      const batchDestination = target.destinationLabel || destinationLabel || 'Delivery';
      const baseSortIndex = photoIndexRef.current;

      lastBatchTargetRef.current = {
        collectionId,
        activeSetId: setId,
        destinationLabel: batchDestination,
        viewPath: target.viewPath || null,
      };
      targetRef.current = { ...target, destinationLabel: batchDestination };
      setDestinationLabel(batchDestination);
      setUploadTargetSetId(setId);
      setActiveCollectionId(collectionId);

      const sortedAccepted = sortFilesBySizeAsc(accepted);
      const sortedResumable = [...resumable].sort((a, b) => a.file.size - b.file.size);

      const newUploadFiles = sortedAccepted.map((file, index) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: pausedRef.current ? 'waiting' : 'processing',
        previewUrl: undefined,
        mediaKind: getUploadMediaKindFromFile(file),
        collectionId,
        photographerId,
        setId,
        sortIndex: baseSortIndex + index,
        destinationLabel: batchDestination,
      }));

      const resumeUploadFiles = sortedResumable.map((item, index) => {
        let uploadContext;
        try {
          uploadContext = galleryService.buildResumeOriginalContext(item.photo, item.file);
        } catch (err) {
          console.error('Resume context failed:', item.file.name, err);
          return {
            id: Math.random().toString(36).slice(2, 11),
            file: item.file,
            name: item.file.name,
            size: item.file.size,
            progress: 0,
            status: 'error',
            errorMessage:
              err instanceof Error
                ? err.message
                : 'Cannot resume — delete the incomplete photo and re-upload.',
            previewUrl: item.photo.thumbnail_url || item.photo.web_url || undefined,
            mediaKind: getUploadMediaKindFromFile(item.file),
            collectionId,
            photographerId,
            setId: item.photo.set_id ?? setId,
            sortIndex: baseSortIndex + sortedAccepted.length + index,
            destinationLabel: batchDestination,
            resumeIncomplete: true,
          };
        }

        return {
          id: Math.random().toString(36).slice(2, 11),
          file: item.file,
          name: item.file.name,
          size: item.file.size,
          progress: 25,
          status: pausedRef.current ? 'waiting' : 'waiting',
          previewUrl: item.photo.thumbnail_url || item.photo.web_url || undefined,
          mediaKind: getUploadMediaKindFromFile(item.file),
          collectionId,
          photographerId,
          setId: item.photo.set_id ?? setId,
          sortIndex: baseSortIndex + sortedAccepted.length + index,
          destinationLabel: batchDestination,
          uploadContext,
          resumeIncomplete: true,
        };
      });

      photoIndexRef.current = baseSortIndex + sortedAccepted.length + resumeUploadFiles.length;

      const allNew = [...newUploadFiles, ...resumeUploadFiles.filter((f) => f.status !== 'error')];
      const erroredResume = resumeUploadFiles.filter((f) => f.status === 'error');

      setState((prev) => ({
        ...prev,
        isOpen: true,
        isMinimized: false,
        activeTab: 'uploading',
        files: [...prev.files, ...allNew, ...erroredResume],
      }));

      const attachPreview = async (uf) => {
        if (uf.previewUrl) return;
        const { file } = uf;
        let previewUrl;
        try {
          if (isRawImageFile(file)) {
            const previewBlob = await extractRawPreviewBlob(file);
            if (previewBlob) previewUrl = URL.createObjectURL(previewBlob);
          } else if (isVideoMime(getFileMime(file))) {
            previewUrl = URL.createObjectURL(file);
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
          pendingDerivativesRef.current.push(uf);
        } else {
          enqueueUpload(uf);
        }
      });

      // Resumes skip web/thumb — go straight to originals (after any new derivatives finish)
      resumeUploadFiles.forEach((uf) => {
        if (uf.status === 'error' || !uf.uploadContext) return;
        originalContextByIdRef.current.set(uf.id, uf.uploadContext);
        if (pausedRef.current) {
          pendingOriginalsRef.current.push(uf);
        } else {
          pendingOriginalsRef.current.push(uf);
          pumpQueue();
        }
      });

      return true;
    },
    [enqueueUpload, patchFile, destinationLabel, pumpQueue]
  );

  const pause = useCallback(() => {
    pausedRef.current = true;

    // Re-queue in-flight jobs so resume can restart them
    const activeIds = [...activeJobIdsRef.current];
    for (const id of activeIds) {
      const fileRec = stateRef.current.files.find((f) => f.id === id);
      if (!fileRec) continue;
      requeueUploadFile(
        { ...fileRec, file: fileRec.file },
        getUploadPhase(fileRec, originalContextByIdRef),
        pendingDerivativesRef,
        pendingOriginalsRef,
        originalContextByIdRef
      );
    }

    // Abort active XHR uploads immediately
    for (const controller of abortControllersRef.current.values()) {
      controller.abort();
    }

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
    requeueWaitingFiles();
    pumpQueue();
  }, [requeueWaitingFiles, pumpQueue]);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    pendingDerivativesRef.current = [];
    pendingOriginalsRef.current = [];
    activeDerivativesRef.current = 0;
    activeOriginalsRef.current = 0;
    activeJobIdsRef.current.clear();
    abortControllersRef.current.clear();
    originalContextByIdRef.current.clear();
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
        destinationLabel: batch.destinationLabel || destinationLabel || 'Delivery',
        viewPath: batch.viewPath || null,
      };
    }
    const target = targetRef.current;
    if (!target?.collectionId) return null;
    return {
      collectionId: target.collectionId,
      activeSetId: target.activeSetId ?? null,
      destinationLabel: target.destinationLabel || destinationLabel || 'Delivery',
      viewPath: target.viewPath || null,
    };
  }, [destinationLabel]);

  const retryFailed = useCallback(() => {
    setState((prev) => {
      const failedFiles = prev.files.filter((f) => f.status === 'error');
      if (failedFiles.length === 0) return prev;

      const updatedFiles = prev.files.map((f) =>
        f.status === 'error' ? { ...f, status: 'waiting', errorMessage: undefined } : f
      );

      failedFiles.forEach((f) => {
        const uf = { ...f, status: 'waiting', errorMessage: undefined };
        const phase = uf.uploadContext || originalContextByIdRef.current.has(uf.id) ? 'original' : 'derivative';
        requeueUploadFile(
          uf,
          phase,
          pendingDerivativesRef,
          pendingOriginalsRef,
          originalContextByIdRef
        );
      });

      if (!pausedRef.current) {
        setTimeout(() => pumpQueue(), 0);
      }

      return {
        ...prev,
        files: updatedFiles,
        activeTab: 'uploading', // switch back to uploading tab on retry
      };
    });
  }, [pumpQueue]);

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
      retryFailed,
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
      retryFailed,
    ]
  );

  return (
    <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>
  );
}
