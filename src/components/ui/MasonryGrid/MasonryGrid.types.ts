export interface MasonryGridProps {
  images: string[];
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}
