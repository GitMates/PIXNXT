import { Photo } from '../../../../types/collection.types';

export interface MediaGridViewProps {
  photos: Photo[];
  gridSize: 'small' | 'large';
  showFilename: boolean;
  selectedPhotos: string[];
  onToggleSelection: (id: string) => void;
  onToggleStar: (id: string, current: boolean) => void;
  onDelete: (ids: string[]) => void;
  onAddMedia: () => void;
}

export interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  showFilename: boolean;
  gridSize: 'small' | 'large';
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onMakeCover: () => void;
}

export interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  onMoveToSet: (setId: string | null) => void;
  sets: { id: string | null; name: string }[];
}
