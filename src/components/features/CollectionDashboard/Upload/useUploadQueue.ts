import { useCallback, useRef, useState } from 'react';
import { galleryService } from '../../../../services/gallery.service';
import { prepareUploadFile } from '../../../../lib/prepareUploadFile';
import { isImageMime, getFileMime } from '../../../../lib/fileMime';
import { initialUploadWidgetState, type UploadQueueFile, type UploadWidgetState } from './uploadTypes';

const LARGE_FILE_BYTES = 6 * 1024 * 1024;
const MAX_CONCURRENT_SMALL = 4;
const MAX_CONCURRENT_LARGE = 1;

type UseUploadQueueOptions = {
  collectionId: string | null | undefined;
  photographerId: string | null | undefined;
  activeSetId: string | null;
  photosLength: number;
  onPhotoUploaded: (photo: unknown) => void;
};

function getMaxConcurrent(files: UploadQueueFile[], pending: UploadQueueFile[]): boolean {
  const all = [...files, ...pending];
  return all.some((f) => f.file.size >= LARGE_FILE_BYTES);
}

export function useUploadQueue({
  collectionId,
  photographerId,
  activeSetId,
  photosLength,
  onPhotoUploaded,
}: UseUploadQueueOptions) {
  const [state, setState] = useState<UploadWidgetState>(initialUploadWidgetState);
  const pausedRef = useRef(false);
  const photoIndexRef = useRef(photosLength);
  const activeCountRef = useRef(0);
  const pendingQueueRef = useRef<UploadQueueFile[]>([]);
  const sessionRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  photoIndexRef.current = photosLength;

  const patchFile = useCallback((id: string, patch: Partial<UploadQueueFile>) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }, []);

  const runUpload = useCallback(
    async (uf: UploadQueueFile) => {
      if (!collectionId || !photographerId || !uf.file) {
        patchFile(uf.id, {
          status: 'error',
          progress: 0,
          errorMessage: !photographerId
            ? 'Photographer account not loaded. Refresh and try again.'
            : 'Collection not found.',
        });
        return;
      }

      const session = sessionRef.current;
      const sortIndex = photoIndexRef.current;
      photoIndexRef.current += 1;

      const safePatch = (patch: Partial<UploadQueueFile>) => {
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
          activeSetId,
          (percent) => {
            const mapped = 12 + Math.round(percent * 0.88);
            safePatch({ status: percent >= 100 ? 'processing' : 'uploading', progress: mapped });
          }
        );

        if (session !== sessionRef.current) return;
        safePatch({ progress: 100, status: 'completed' });
        onPhotoUploaded(photoData);
      } catch (err) {
        console.error('Upload failed:', err);
        const message =
          err instanceof Error ? err.message : 'Upload failed. Check your connection and try again.';
        safePatch({ status: 'error', progress: 0, errorMessage: message });
      }
    },
    [collectionId, photographerId, activeSetId, onPhotoUploaded, patchFile]
  );

  const pumpQueue = useCallback(() => {
    if (pausedRef.current) return;

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
    (uf: UploadQueueFile) => {
      if (pausedRef.current) {
        patchFile(uf.id, { status: 'waiting', progress: 0 });
        pendingQueueRef.current.push(uf);
        return;
      }
      pendingQueueRef.current.push(uf);
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
      return prev;
    });
    queueMicrotask(() => pumpQueue());
  }, [pumpQueue]);

  const processFiles = useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      const rawFiles = Array.from(fileList || []);
      const files = rawFiles.filter((f) => f.size > 0);

      if (rawFiles.length > 0 && files.length === 0) {
        alert(
          'The selected files are empty or corrupted. If you are uploading a file from another app, please save it to your computer first.'
        );
        return false;
      }
      if (files.length === 0) return false;

      const newUploadFiles: UploadQueueFile[] = files.map((file) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: pausedRef.current ? 'waiting' : 'processing',
        previewUrl: isImageMime(getFileMime(file)) ? URL.createObjectURL(file) : undefined,
      }));

      setState((prev) => ({
        ...prev,
        isOpen: true,
        isMinimized: false,
        activeTab: 'uploading',
        files: [...prev.files, ...newUploadFiles],
      }));

      newUploadFiles.forEach((uf) => {
        if (pausedRef.current) {
          pendingQueueRef.current.push(uf);
        } else {
          enqueueUpload(uf);
        }
      });

      return true;
    },
    [enqueueUpload]
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((prev) => ({
      ...prev,
      isPaused: true,
      files: prev.files.map((f) =>
        f.status === 'uploading' || f.status === 'processing'
          ? { ...f, status: 'waiting' as const, progress: f.progress }
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
    setState((prev) => {
      prev.files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      return initialUploadWidgetState();
    });
  }, []);

  const minimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const setActiveTab = useCallback((tab: UploadWidgetState['activeTab']) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleDetails = useCallback(() => {
    setState((prev) => ({ ...prev, showDetails: !prev.showDetails }));
  }, []);

  return {
    state,
    setState,
    processFiles,
    pause,
    resume,
    cancel,
    minimize,
    expand,
    setActiveTab,
    toggleDetails,
  };
}
