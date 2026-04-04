export interface DashboardTopbarProps {
  collectionName: string;
  status: 'DRAFT' | 'PUBLISHED';
  onStatusChange: (status: 'DRAFT' | 'PUBLISHED') => void;
  onPreview: () => void;
  onShare: () => void;
  onBack: () => void;
}
