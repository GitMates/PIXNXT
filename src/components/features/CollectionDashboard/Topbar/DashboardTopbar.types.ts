export interface DashboardTopbarProps {
  collectionName: string;
  status: 'DRAFT' | 'PUBLISHED';
  onStatusChange: (status: 'DRAFT' | 'PUBLISHED') => void;
  onPreview: () => void;
  onShare: () => void;
  onBack: () => void;
  /** When set, shows Pixieset-style "More" menu with collection actions */
  moreMenu?: {
    collectionId?: string | null;
    collectionSlug?: string | null;
    photographerId?: string | null;
    photographerProfile?: Record<string, unknown> | null;
    currentFolderId?: string | null;
    eventDate?: string | null;
    pinValue?: string;
    clientPasswordDisplay?: string;
    onOpenDownloadSettings?: () => void;
  };
}
