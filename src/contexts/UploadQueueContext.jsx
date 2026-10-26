import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { galleryService } from '../services/gallery.service';
import { userStorageService } from '../services/userStorage.service';
import { photographerQuotaService } from '../services/photographerQuota.service';
import { isImageMime, isVideoMime, getFileMime, isPhotoshopFile } from '../lib/fileMime';
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
  createProgressThrottle,
  confirmedBytesFromCheckpoint,
  getTotalConfirmedBytes,
} from '../components/features/CollectionDashboard/Upload/uploadUtils';
import {
  createAdaptiveConcurrency,
  uploadFailureKind,
} from '../components/features/CollectionDashboard/Upload/adaptiveUploadConcurrency';
import { createUploadQueueStore } from './uploadQueueStore';
import { UploadQueueContext, UploadQueueStoreContext } from './uploadQueueContext';
import { isRateLimitedError } from '../services/storage.service';
/**
 * Blob previews (`URL.createObjectURL(file)`) make the browser decode the
 * full original for a 40 px row. Fine for a handful of files, catastrophic
 * for 1000. Above this count rows use the uploaded thumb once it exists.
 */
const PREVIEW_BLOB_LIMIT = 40;
/** Fallback wait when the API does not say how long (Retry-After missing). */
const RATE_LIMIT_DEFAULT_WAIT_MS = 60 * 1000;

function revokePreviews(files) {
  files.forEach((f) => {
    if (f.previewUrl && f.previewUrl.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl);
  });
}

function handleStorageLimitError(message) {
  if (!message.includes('Storage limit exceeded') && !message.includes('Remaining storage space')) {
    return null;
  }
  let remaining = '0.00 MB';
  const match = message.match(/Remaining storage space:\s*(.*?)\.\s*This/i);
  if (match && match[1]) {
    remaining = match[1].trim();
  }
  return {
    title: 'Storage limit reached',
    message: `You have ${remaining} only. Try to upload files below this size limit.`,
  };
}

function isUploadCancelled(err) {
  return err instanceof Error && /Upload cancelled/i.test(err.message);
}

function isResumableQueueError(err) {
  if (!err) return false;
  if (err.resumable === true || err.multipartCheckpoint) return true;
  if (err.status === 401) return true;
  const msg = String(err.message || '');
  return /session expired|sign in again|authentication required|unauthorized|network error uploading/i.test(msg);
}

/** Normalize Cloudflare Workers API / R2 / unknown throws into a user-visible string. */
function uploadErrorMessage(err) {
  if (isResumableQueueError(err)) {
    if (err?.status === 401 || /session expired|sign in again|authentication required/i.test(String(err?.message || ''))) {
      return 'Session expired during upload. Sign in if needed, then click Resume — progress is kept.';
    }
    return 'Upload interrupted. Click Resume to continue from where it stopped.';
  }
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
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createUploadQueueStore({ ...initialUploadWidgetState });
  const store = storeRef.current;
  const setState = store.setState;
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
  /** Kept for minimal diff: every `stateRef.current` read now hits the store directly. */
  const stateRef = { get current() { return store.getState(); } };
  const targetRef = useRef(null);
  /** Last batch enqueue target (for widget label / View navigation while uploads run). */
  const lastBatchTargetRef = useRef(null);
  const pumpQueueRef = useRef(() => {});
  /** Epoch ms until which pumpQueue must not start new jobs (rate limit). */
  const rateLimitedUntilRef = useRef(0);
  const rateLimitTimerRef = useRef(null);
  const adaptiveRef = useRef(null);
  if (!adaptiveRef.current) adaptiveRef.current = createAdaptiveConcurrency();
  /** Centered in-app notice (replaces native alert() popups). */
  const [notice, setNotice] = useState(null);
  const notifyNotice = useCallback((title, message) => {
    setNotice({ title, message });
  }, []);
  const dismissNotice = useCallback(() => {
    setNotice(null);
  }, []);

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
    setState((prev) => {
      const idx = prev.files.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const current = prev.files[idx];
      let nextPatch = patch;
      if (Object.prototype.hasOwnProperty.call(patch, 'confirmedBytes')) {
        const nextConfirmed = Math.max(current.confirmedBytes || 0, patch.confirmedBytes || 0);
        if (nextConfirmed === (current.confirmedBytes || 0) && Object.keys(patch).length === 1) return prev;
        nextPatch = { ...patch, confirmedBytes: nextConfirmed };
      }
      let changed = false;
      for (const key of Object.keys(nextPatch)) {
        if (!Object.is(current[key], nextPatch[key])) { changed = true; break; }
      }
      if (!changed) return prev;
      const files = prev.files.slice();
      files[idx] = { ...current, ...nextPatch };
      return { ...prev, files };
    });
  }, [setState]);

  const syncConcurrency = useCallback(() => {
    const n = adaptiveRef.current.limit;
    setState((prev) => (prev.activeConcurrency === n ? prev : { ...prev, activeConcurrency: n }));
  }, [setState]);

  /**
   * The Worker answered RATE_LIMITED. Nothing is wrong with the file: park it,
   * stop starting new jobs until the window reopens, then pump again. Shows
   * one notice per pause, not one per file.
   */
  const handleRateLimited = useCallback((uf, phase, err) => {
    const waitMs = err?.retryAfterMs || RATE_LIMIT_DEFAULT_WAIT_MS;
    const until = Date.now() + waitMs;
    const alreadyPaused = rateLimitedUntilRef.current > Date.now();
    rateLimitedUntilRef.current = Math.max(rateLimitedUntilRef.current, until);

    patchFile(uf.id, { status: 'waiting', progress: phase === 'original' ? Math.max(uf.progress ?? 25, 25) : 0 });
    requeueUploadFile(uf, phase, pendingDerivativesRef, pendingOriginalsRef, originalContextByIdRef);

    if (!alreadyPaused) {
      const minutes = Math.max(1, Math.ceil(waitMs / 60000));
      notifyNotice(
        'Upload limit reached',
        `The upload service asked us to slow down. Uploads continue automatically in about ${minutes} min — keep this tab open.`
      );
    }
    if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
    rateLimitTimerRef.current = setTimeout(() => {
      rateLimitTimerRef.current = null;
      pumpQueueRef.current();
    }, rateLimitedUntilRef.current - Date.now() + 50);
  }, [patchFile, notifyNotice]);

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
            onProgress: createProgressThrottle((percent) => {
              safePatch({
                status: percent >= 100 ? 'processing' : 'uploading',
                progress: percent,
              });
            }),
          });
          if (session !== sessionRef.current) return;
          safePatch({ progress: 100, status: 'completed' });
          targetRef.current?.onPhotoUploaded?.(photoData);
          return;
        }

        const { uploadContext, photoData } = await galleryService.uploadPhotoDerivatives(
          collectionId,
          photographerId,
          uf.file,
          sortIndex,
          setId,
          createProgressThrottle((percent) => {
            safePatch({ status: 'uploading', progress: Math.min(99, percent) });
          }),
          (insertedPhoto) => {
            if (session !== sessionRef.current) return;
            const current = store.getState().files.find((f) => f.id === uf.id);
            if (current && !current.previewUrl && insertedPhoto?.thumbnail_url) {
              safePatch({ previewUrl: insertedPhoto.thumbnail_url });
            }
            targetRef.current?.onPhotoUploaded?.(insertedPhoto);
          },
          {
            signal: controller.signal,
            overlapOriginal: true,
            skipQuota: true,
            quietQuota: true,
            onConfirmedBytes: (bytes) => safePatch({ confirmedBytes: bytes }),
            onMultipartCheckpoint: (checkpoint) => {
              const nextCtx = {
                ...(originalContextByIdRef.current.get(uf.id) || {}),
                multipartCheckpoint: checkpoint,
              };
              originalContextByIdRef.current.set(uf.id, nextCtx);
              const fromParts = confirmedBytesFromCheckpoint(
                checkpoint,
                uf.file?.size || uf.size || 0
              );
              safePatch({ uploadContext: nextCtx, confirmedBytes: fromParts });
            },
          }
        );

        if (session !== sessionRef.current) return;

        if (uploadContext?.originalDone) {
          originalContextByIdRef.current.delete(uf.id);
          safePatch({
            progress: 100,
            status: 'completed',
            confirmedBytes: uf.file?.size || uf.size || 0,
          });
          targetRef.current?.onPhotoUploaded?.(photoData);
          if (photographerId && uf.file?.size) {
            userStorageService.addLocalBytes(photographerId, uf.file.size);
          }
          return;
        }

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
        if (isRateLimitedError(err)) {
          handleRateLimited(uf, 'derivative', err);
          return;
        }
        console.error('Derivative upload failed:', err);
        adaptiveRef.current.noteFailure(uploadFailureKind(err));
        if (err?.removedPhotoId) targetRef.current?.onPhotoRemoved?.(err.removedPhotoId);
        const message = uploadErrorMessage(err);
        const limitNotice = handleStorageLimitError(message);
        if (limitNotice) notifyNotice(limitNotice.title, limitNotice.message);
        safePatch({ status: 'error', progress: 0, errorMessage: message });
      } finally {
        abortControllersRef.current.delete(uf.id);
      }
    },
    [patchFile, notifyNotice, handleRateLimited]
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
        confirmedBytes: Math.max(
          uf.confirmedBytes || 0,
          confirmedBytesFromCheckpoint(
            uploadContext.multipartCheckpoint,
            uf.file?.size || uf.size || 0
          )
        ),
      });

      const controller = new AbortController();
      abortControllersRef.current.set(uf.id, controller);

      try {
        const photoData = await galleryService.uploadPhotoOriginal(
          uploadContext,
          createProgressThrottle((percent) => {
            // Phase 2 occupies 25–100%
            safePatch({
              status: percent >= 100 ? 'processing' : 'uploading',
              progress: 25 + Math.round((percent / 100) * 75),
            });
          }),
          {
            signal: controller.signal,
            onConfirmedBytes: (bytes) => safePatch({ confirmedBytes: bytes }),
            onMultipartCheckpoint: (checkpoint) => {
              const nextCtx = { ...uploadContext, multipartCheckpoint: checkpoint };
              originalContextByIdRef.current.set(uf.id, nextCtx);
              const fromParts = confirmedBytesFromCheckpoint(
                checkpoint,
                uf.file?.size || uf.size || 0
              );
              safePatch({ uploadContext: nextCtx, confirmedBytes: fromParts });
            },
          }
        );

        if (session !== sessionRef.current) return;
        originalContextByIdRef.current.delete(uf.id);
        safePatch({
          progress: 100,
          status: 'completed',
          confirmedBytes: uf.file?.size || uf.size || 0,
          resumable: false,
          errorMessage: undefined,
        });
        targetRef.current?.onPhotoUploaded?.(photoData);
        if (uf.photographerId && uf.file?.size) {
          userStorageService.addLocalBytes(uf.photographerId, uf.file.size);
        }
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
        if (isRateLimitedError(err)) {
          handleRateLimited({ ...uf, uploadContext }, 'original', err);
          return;
        }
        console.error('Original upload failed:', err);
        adaptiveRef.current.noteFailure(uploadFailureKind(err));
        const resumable = isResumableQueueError(err);
        const nextCtx = {
          ...uploadContext,
          multipartCheckpoint: err?.multipartCheckpoint || uploadContext.multipartCheckpoint || null,
        };
        if (resumable) {
          // Keep the photo row + multipart parts so Resume continues.
          originalContextByIdRef.current.set(uf.id, nextCtx);
          const message = uploadErrorMessage(err);
          safePatch({
            status: 'error',
            progress: Math.max(uf.progress ?? 25, 25),
            errorMessage: message,
            uploadContext: nextCtx,
            resumable: true,
          });
          return;
        }
        if (uploadContext?.photoId) {
          galleryService.deletePhotos([uploadContext.photoId]).catch(() => {});
          targetRef.current?.onPhotoRemoved?.(uploadContext.photoId);
        }
        originalContextByIdRef.current.delete(uf.id);
        const message = uploadErrorMessage(err);
        const limitNotice = handleStorageLimitError(message);
        if (limitNotice) notifyNotice(limitNotice.title, limitNotice.message);
        safePatch({ status: 'error', progress: 0, errorMessage: message, resumable: false });
      } finally {
        abortControllersRef.current.delete(uf.id);
      }
    },
    [patchFile, notifyNotice, handleRateLimited]
  );

  const noteQueueIdle = useCallback(() => {
    if (pausedRef.current) return;
    if (activeDerivativesRef.current > 0 || activeOriginalsRef.current > 0) return;
    if (pendingDerivativesRef.current.length > 0 || pendingOriginalsRef.current.length > 0) return;
    if (!globalThis.__pixnxtUploading) return;
    globalThis.__pixnxtUploading = false;
    photographerQuotaService.notifyQuotaChanged({ refresh: true });
  }, []);

  const pumpQueue = useCallback(() => {
    if (pausedRef.current) return;
    if (Date.now() < rateLimitedUntilRef.current) return;

    pendingDerivativesRef.current = sortUploadQueueBySizeAsc(pendingDerivativesRef.current);
    const maxSlots = adaptiveRef.current.limit;
    const activeTotal = () => activeDerivativesRef.current + activeOriginalsRef.current;

    while (
      activeTotal() < maxSlots &&
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

    // Resumed originals share the same photo-level cap as new files.
    pendingOriginalsRef.current = sortUploadQueueBySizeAsc(pendingOriginalsRef.current);

    while (
      activeTotal() < maxSlots &&
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
    syncConcurrency();
    noteQueueIdle();
  }, [runDerivativeUpload, runOriginalUpload, noteQueueIdle, syncConcurrency]);

  pumpQueueRef.current = pumpQueue;

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
        notifyNotice('No delivery selected', 'Open a delivery or event before uploading photos.');
        return false;
      }

      const rawFiles = Array.from(fileList || []);
      const photoshopFiles = rawFiles.filter(isPhotoshopFile);
      const readableFiles = rawFiles.filter((f) => f.size > 0 && !isPhotoshopFile(f));

      if (photoshopFiles.length > 0) {
        notifyNotice(
          'Photoshop files skipped',
          'Photoshop files (.psd, .psb) cannot be uploaded to the client gallery. Export a JPEG or PNG first.'
        );
      }

      const files = readableFiles;

      if (rawFiles.length > 0 && files.length === 0) {
        if (photoshopFiles.length > 0) return false;
        notifyNotice(
          'Files could not be read',
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

      // D1 already says these have no original — no need to ask R2.
      const missingOriginalKeys = new Set();
      const needsR2Check = [];
      for (const photo of existingPhotos) {
        if (!photo?.filename) continue;
        if (isIncompleteUploadPhoto(photo)) missingOriginalKeys.add(String(photo.filename).toLowerCase());
        else needsR2Check.push(photo);
      }
      if (needsR2Check.length > 0) {
        try {
          const missingFromR2 = await galleryService.findMissingOriginalFilenames(needsR2Check);
          missingFromR2.forEach((name) => missingOriginalKeys.add(name));
        } catch (err) {
          console.error('Bulk original check failed:', err);
        }
      }

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
        notifyNotice(
          `Skipped ${skipped.length} duplicate file${skipped.length === 1 ? '' : 's'}`,
          `Already in this delivery: ${preview}${more}`
        );
      }
      if (accepted.length === 0 && resumable.length === 0) return false;

      if (resumable.length > 0) {
        notifyNotice(
          `Resuming ${resumable.length} upload${resumable.length === 1 ? '' : 's'}`,
          'Original missing in storage — uploading originals only (web & thumb already exist).'
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

      const batchBytes = [...accepted, ...resumable.map((item) => item.file)].reduce(
        (sum, file) => sum + (file?.size || 0),
        0
      );
      if (batchBytes > 0) {
        try {
          await galleryService._assertStorageQuota(photographerId, batchBytes);
        } catch (err) {
          const message = uploadErrorMessage(err);
          const limitNotice = handleStorageLimitError(message);
          notifyNotice(limitNotice?.title || 'Upload blocked', limitNotice?.message || message);
          return false;
        }
      }
      globalThis.__pixnxtUploading = true;

      if (
        activeDerivativesRef.current === 0 &&
        activeOriginalsRef.current === 0 &&
        pendingDerivativesRef.current.length === 0 &&
        pendingOriginalsRef.current.length === 0
      ) {
        adaptiveRef.current.reset();
      }

      const sortedAccepted = sortFilesBySizeAsc(accepted);
      const sortedResumable = [...resumable].sort((a, b) => a.file.size - b.file.size);

      const newUploadFiles = sortedAccepted.map((file, index) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        confirmedBytes: 0,
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
      if (allNew.length === 0) globalThis.__pixnxtUploading = false;

      setState((prev) => ({
        ...prev,
        isOpen: true,
        isMinimized: false,
        isStopped: false,
        activeTab: 'uploading',
        activeConcurrency: adaptiveRef.current.limit,
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

      if (allNew.length <= PREVIEW_BLOB_LIMIT) {
        newUploadFiles.forEach((uf) => { void attachPreview(uf); });
      }

      // One sort + one pump for the whole batch (was one sort + one pump per file).
      pendingDerivativesRef.current.push(...newUploadFiles);
      pendingDerivativesRef.current = sortUploadQueueBySizeAsc(pendingDerivativesRef.current);

      // Resumes skip web/thumb — go straight to originals.
      for (const uf of resumeUploadFiles) {
        if (uf.status === 'error' || !uf.uploadContext) continue;
        originalContextByIdRef.current.set(uf.id, uf.uploadContext);
        pendingOriginalsRef.current.push(uf);
      }
      pendingOriginalsRef.current = sortUploadQueueBySizeAsc(pendingOriginalsRef.current);

      if (!pausedRef.current) pumpQueue();

      return true;
    },
    [patchFile, destinationLabel, pumpQueue, notifyNotice]
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

  useEffect(() => () => {
    if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const files = store.getState().files;
      const busy = files.some(
        (f) => f.status === 'uploading' || f.status === 'processing' || f.status === 'waiting'
      );
      if (!busy) return;
      const prev = adaptiveRef.current.limit;
      adaptiveRef.current.observe(getTotalConfirmedBytes(files));
      if (adaptiveRef.current.limit !== prev) {
        syncConcurrency();
        pumpQueueRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [store, syncConcurrency]);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    pendingDerivativesRef.current = [];
    pendingOriginalsRef.current = [];
    activeDerivativesRef.current = 0;
    activeOriginalsRef.current = 0;
    activeJobIdsRef.current.clear();
    for (const controller of abortControllersRef.current.values()) {
      controller.abort();
    }
    abortControllersRef.current.clear();
    originalContextByIdRef.current.clear();
    adaptiveRef.current.reset();
    pausedRef.current = false;
    rateLimitedUntilRef.current = 0;
    if (rateLimitTimerRef.current) { clearTimeout(rateLimitTimerRef.current); rateLimitTimerRef.current = null; }
    globalThis.__pixnxtUploading = false;
    setState((prev) => {
      const kept = prev.files.filter((f) => f.status === 'completed');
      const dropped = prev.files.filter((f) => f.status !== 'completed');
      revokePreviews(dropped);
      if (kept.length === 0) {
        lastBatchTargetRef.current = null;
        return { ...initialUploadWidgetState };
      }
      return {
        ...prev,
        isPaused: false,
        isStopped: true,
        activeConcurrency: 0,
        files: kept,
        activeTab: 'complete',
      };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      const counts = uploadTabCounts(prev.files);
      if (counts.uploading + counts.waiting > 0 && !prev.isStopped) return prev;
      revokePreviews(prev.files);
      return { ...initialUploadWidgetState };
    });
  }, []);

  const closeWidget = useCallback(() => {
    setState((prev) => {
      const counts = uploadTabCounts(prev.files);
      if (counts.uploading + counts.waiting > 0 && !prev.isStopped) {
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
        f.status === 'error'
          ? { ...f, status: 'waiting', errorMessage: undefined, resumable: f.resumable === true }
          : f
      );

      failedFiles.forEach((f) => {
        const ctx = f.uploadContext || originalContextByIdRef.current.get(f.id);
        if (ctx) originalContextByIdRef.current.set(f.id, ctx);
        const uf = {
          ...f,
          status: 'waiting',
          errorMessage: undefined,
          uploadContext: ctx || f.uploadContext,
        };
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
        activeTab: 'uploading', // switch back to uploading tab on retry / resume
      };
    });
  }, [pumpQueue]);

  const value = useMemo(
    () => ({
      notice,
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
      notifyNotice,
      dismissNotice,
    }),
    [
      notice,
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
      notifyNotice,
      dismissNotice,
    ]
  );

  return (
    <UploadQueueStoreContext.Provider value={store}>
      <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>
    </UploadQueueStoreContext.Provider>
  );
}
