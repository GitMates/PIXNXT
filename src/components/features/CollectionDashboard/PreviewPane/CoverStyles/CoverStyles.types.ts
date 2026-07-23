export interface CoverProps {
  title: string;
  date: string;
  description?: string;
  subtitle?: string;
  photoUrl?: string;
  focalX?: number;
  focalY?: number;
  className?: string;
  /** Smaller cover typography in the dashboard GalleryPreview pane only */
  isPreview?: boolean;
  /** Slightly larger cover typography on the public /gallery page only */
  isGalleryView?: boolean;
  onViewGallery?: () => void;
}
