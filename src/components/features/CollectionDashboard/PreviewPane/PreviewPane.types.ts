import { DesignSettings } from '../../../../types/design.types';

export interface PreviewPaneProps {
  settings: DesignSettings;
  collectionTitle: string;
  collectionDate: string;
  coverPhotoUrl?: string;
  gridPhotos: { full_url: string }[];
  previewMode: 'desktop' | 'mobile';
  onPreviewModeChange: (mode: 'desktop' | 'mobile') => void;
  dashboardState?: any;
}

export interface GalleryPreviewProps {
  settings: DesignSettings;
  collectionTitle: string;
  collectionDate: string;
  coverPhotoUrl?: string;
  gridPhotos: { full_url: string }[];
  dashboardState?: any;
}
