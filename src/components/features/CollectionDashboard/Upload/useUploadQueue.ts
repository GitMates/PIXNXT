import { useEffect } from 'react';
import { useUploadQueueContext } from '../../../../contexts/UploadQueueContext';

export function useUploadQueue(options: {
  collectionId: string | null | undefined;
  photographerId: string | null | undefined;
  activeSetId: string | null;
  photosLength: number;
  existingFilenames?: string[];
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
      destinationLabel: options.destinationLabel || 'Collection',
      onPhotoUploaded: options.onPhotoUploaded,
    });
  }, [
    options.collectionId,
    options.photographerId,
    options.activeSetId,
    options.photosLength,
    options.existingFilenames,
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
