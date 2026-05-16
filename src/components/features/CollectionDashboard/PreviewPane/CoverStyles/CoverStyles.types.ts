export interface CoverProps {
  title: string;
  date: string;
  description?: string;
  subtitle?: string;
  photoUrl?: string;
  focalX?: number;
  focalY?: number;
  className?: string;
  isPreview?: boolean;
  onViewGallery?: () => void;
}
