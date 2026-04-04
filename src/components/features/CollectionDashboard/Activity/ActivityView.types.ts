import { ActivityTab } from '../../../../types/collection.types';

export interface ActivityViewProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}
