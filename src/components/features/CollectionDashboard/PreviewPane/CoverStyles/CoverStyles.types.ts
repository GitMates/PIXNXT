export interface CoverProps {
  title: string;
  date: string;
  subtitle?: string;
  photoUrl?: string;
  className?: string;
  onViewGallery?: () => void;
}
