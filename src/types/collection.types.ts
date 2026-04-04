import { Tables } from './supabase';

export type Collection = Tables<'collections'>;
export type PhotoSet = Tables<'sets'>;
export type Photo = Tables<'photos'>;

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
