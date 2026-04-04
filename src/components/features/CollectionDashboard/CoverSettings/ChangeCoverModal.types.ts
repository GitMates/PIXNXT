export interface Photo {
  id: string;
  full_url: string;
  thumbnail_url?: string;
  filename?: string;
}

export interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  onUploadPhoto: (file: File) => void;
  isUploading?: boolean;
}
