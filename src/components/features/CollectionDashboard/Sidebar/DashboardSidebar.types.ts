import { SidebarTab, PhotoSet } from '../../../../types/collection.types';

export interface DashboardSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  sets: PhotoSet[];
  activeSetId: string | null;
  onSetChange: (setId: string | null) => void;
  onAddSet: () => void;
  onEditSet: (set: PhotoSet) => void;
  onDeleteSet: (setId: string) => void;
  onManageSets: () => void;
}
