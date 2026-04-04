import { Photo as GlobalPhoto } from '../../../../types/collection.types';

export type Photo = GlobalPhoto;

export interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  onUploadPhoto: (file: File) => void;
  isUploading?: boolean;
}
