import { Photo as GlobalPhoto } from '../../../../types/collection.types';

export type Photo = GlobalPhoto;

export interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  /** e.g. "All photos", "Highlights", "wed" */
  scopeLabel?: string;
}
