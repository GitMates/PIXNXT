import { useEffect } from 'react';
import { useUploadQueueContext } from '../../../../contexts/UploadQueueContext';

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
  onPhotoUploaded: (photo: unknown) => void;
}) {
  const ctx = useUploadQueueContext();

  useEffect(() => {
    if (!options.collectionId || !options.photographerId) return;
    ctx.configureTarget({
      collectionId: options.collectionId,
      photographerId: options.photographerId,
      activeSetId: options.activeSetId,
      photosLength: options.photosLength,
      existingFilenames: options.existingFilenames ?? [],
      existingCompleteFilenames: options.existingFilenames ?? [],
      incompletePhotos: options.incompletePhotos ?? [],
      destinationLabel: options.destinationLabel || 'Collection',
      onPhotoUploaded: options.onPhotoUploaded,
    });
  }, [
    options.collectionId,
    options.photographerId,
    options.activeSetId,
    options.photosLength,
    options.existingFilenames,
    options.incompletePhotos,
    options.destinationLabel,
    options.onPhotoUploaded,
    ctx.configureTarget,
  ]);

  const processFiles = (
    fileList: FileList | File[] | null | undefined,
    uploadTargetOverride?: {
      collectionId?: string;
      photographerId?: string;
      activeSetId?: string | null;
      destinationLabel?: string;
    }
  ) => ctx.processFiles(fileList, uploadTargetOverride);

  return {
    state: ctx.state,
    processFiles,
    pause: ctx.pause,
    resume: ctx.resume,
    cancel: ctx.cancel,
    minimize: ctx.minimize,
    expand: ctx.expand,
    setActiveTab: ctx.setActiveTab,
    toggleDetails: ctx.toggleDetails,
  };
}
