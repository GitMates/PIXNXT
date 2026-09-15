export type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_url?: string | null;
  cover_photo_id?: string | null;
  status?: string;
  privacy?: string;
  photographer_id?: string;
  photo_count?: number;
  video_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};
export type PhotoSet = {
  id: string;
  collection_id: string;
  name: string;
  description?: string | null;
  photographer_id?: string;
  position?: number;
  photo_count?: number;
  video_count?: number;
  is_private?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};
export type Photo = {
  id: string;
  collection_id: string;
  set_id?: string | null;
  filename?: string;
  photographer_id?: string;
  position?: number;
  size_bytes?: number;
  width?: number | null;
  height?: number | null;
  thumbnail_url?: string | null;
  web_url?: string | null;
  full_url?: string | null;
  is_starred?: boolean;
  is_private?: boolean;
  media_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export interface CollectionDashboardState {
  collection: Collection | null;
  sets: PhotoSet[];
  photos: Photo[];
  activeSetId: string | null;
  activeSidebarTab: SidebarTab;
  isSidebarCollapsed: boolean;
  isLoading: boolean;
}

export type SidebarTab = 'photos' | 'design' | 'settings' | 'activity';
export type SettingsTab = 'general' | 'privacy' | 'download' | 'favorite' | 'store';
export type DesignTab = 'cover' | 'typography' | 'color' | 'grid';
export type ActivityTab = 'download' | 'favorite' | 'store' | 'email' | 'share' | 'private';
