import { useCallback, useEffect, useRef } from 'react';
import { useUploadQueueContext } from '../../../../contexts/uploadQueueContext';

type UploadPhotoFn = (args: {
  file: File;
  photographerId: string;
  sortIndex: number;
  setId?: string | null;
  onProgress?: (percent: number) => void;
}) => Promise<unknown>;

export function useUploadQueue(options: {
  collectionId: string | null | undefined;
  photographerId: string | null | undefined;
  activeSetId: string | null;
  photosLength: number;
  /** Filenames that already have a completed original upload. */
  existingFilenames?: string[];
  /** Photos with web/thumb but missing original — re-upload resumes originals only. */
  incompletePhotos?: Array<{
    id: string;
    filename: string;
    collection_id?: string;
    set_id?: string | null;
    web_storage_path?: string | null;
    thumbnail_storage_path?: string | null;
    web_url?: string | null;
    thumbnail_url?: string | null;
    media_type?: string | null;
  }>;
  destinationLabel?: string;
  viewPath?: string | null;
  uploadPhotoFn?: UploadPhotoFn;
  onPhotoUploaded: (photo: unknown) => void;
}) {
  const ctx = useUploadQueueContext();
  const onPhotoUploadedRef = useRef(options.onPhotoUploaded);
  const existingFilenamesRef = useRef(options.existingFilenames);
  const uploadPhotoFnRef = useRef(options.uploadPhotoFn);

  useEffect(() => {
    onPhotoUploadedRef.current = options.onPhotoUploaded;
  }, [options.onPhotoUploaded]);

  useEffect(() => {
    existingFilenamesRef.current = options.existingFilenames;
  }, [options.existingFilenames]);

  useEffect(() => {
    uploadPhotoFnRef.current = options.uploadPhotoFn;
  }, [options.uploadPhotoFn]);

  const getUploadTargetSnapshot = useCallback(
    () => ({
      collectionId: options.collectionId,
      photographerId: options.photographerId,
      activeSetId: options.activeSetId,
      photosLength: options.photosLength,
      existingFilenames: existingFilenamesRef.current ?? options.existingFilenames ?? [],
      existingCompleteFilenames: options.existingFilenames ?? [],
      incompletePhotos: options.incompletePhotos ?? [],
      destinationLabel: options.destinationLabel || 'Collection',
      viewPath: options.viewPath ?? null,
      uploadPhotoFn: uploadPhotoFnRef.current
        ? (args: Parameters<UploadPhotoFn>[0]) => uploadPhotoFnRef.current!(args)
        : undefined,
      onPhotoUploaded: (photo: unknown) => onPhotoUploadedRef.current?.(photo),
    }),
    [
      options.collectionId,
      options.photographerId,
      options.activeSetId,
      options.photosLength,
      options.existingFilenames,
      options.incompletePhotos,
      options.destinationLabel,
      options.viewPath,
    ]
  );

  useEffect(() => {
    if (!options.collectionId || !options.photographerId) return;
    ctx.configureTarget(getUploadTargetSnapshot());
  }, [options.collectionId, options.photographerId, options.photosLength, getUploadTargetSnapshot, ctx.configureTarget]);

  const processFiles = useCallback(
    (
      fileList: FileList | File[] | null | undefined,
      uploadTargetOverride?: ReturnType<typeof getUploadTargetSnapshot>
    ) => {
      const target = uploadTargetOverride ?? getUploadTargetSnapshot();
      return ctx.processFiles(fileList, target);
    },
    [ctx.processFiles, getUploadTargetSnapshot]
  );

  return {
    state: ctx.state,
    processFiles,
    getUploadTargetSnapshot,
    pause: ctx.pause,
    resume: ctx.resume,
    cancel: ctx.cancel,
    minimize: ctx.minimize,
    expand: ctx.expand,
    setActiveTab: ctx.setActiveTab,
    toggleDetails: ctx.toggleDetails,
  };
}
