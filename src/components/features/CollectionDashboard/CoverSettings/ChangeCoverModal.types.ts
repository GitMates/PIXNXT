import { Photo as GlobalPhoto } from '../../../../types/collection.types';

export type Photo = GlobalPhoto;

export type ChangeCoverModalView = 'upload' | 'collection';

export interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  /** e.g. "All photos", "Highlights", "wed" */
  scopeLabel?: string;
  /** Open OS file picker for a new cover image. */
  onBrowseFiles?: () => void;
  /** User dropped a file on the upload zone. */
  onDropCoverFile?: (file: File) => void;
  isUploading?: boolean;
}
