import React, { useState } from 'react';
import { DashboardSidebarProps } from './DashboardSidebar.types';
import { SidebarSection } from './SidebarSection';
import { PhotosSection } from './PhotosSection';

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  isSidebarCollapsed,
  onToggleCollapse,
  sets,
  activeSetId,
  onSetChange,
  onAddSet,
  onEditSet,
  onDeleteSet,
}) => {
  const [showSetMenuId, setShowSetMenuId] = useState<string | null>(null);

  if (isSidebarCollapsed) {
    return (
      <aside className="cd-sidebar collapsed">
        <div className="cd-sidebar-menu">
           {/* Simple icons for collapsed state */}
           {/* ... to be implemented or styled via CSS ... */}
        </div>
        <div className="cd-sidebar-bottom-action">
           <button onClick={onToggleCollapse} className="cd-collapse-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
           </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="cd-sidebar">
      <div className="cd-sidebar-menu">
        {/* PHOTOS SECTION */}
        <SidebarSection
          id="photos"
          title="Photos"
          isActive={activeTab === 'photos'}
          onToggle={() => onTabChange('photos')}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M8 2h12a2 2 0 0 1 2 2v10"></path></svg>
          )}
        >
          <PhotosSection
            sets={sets}
            activeSetId={activeSetId}
            onSetChange={onSetChange}
            onAddSet={onAddSet}
            onEditSet={onEditSet}
            onDeleteSet={onDeleteSet}
            showSetMenu={showSetMenuId}
            setShowSetMenu={setShowSetMenuId}
          />
        </SidebarSection>

        {/* DESIGN SECTION */}
        <SidebarSection
          id="design"
          title="Design"
          isActive={activeTab === 'design'}
          onToggle={() => onTabChange('design')}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.5 1.5"></path><path d="M14 11l5 5"></path><circle cx="5" cy="5" r=".5"></circle></svg>
          )}
        />

        {/* SETTINGS SECTION */}
        <SidebarSection
          id="settings"
          title="Settings"
          isActive={activeTab === 'settings'}
          onToggle={() => onTabChange('settings')}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          )}
        />

        {/* ACTIVITY SECTION */}
        <SidebarSection
          id="activity"
          title="Activity"
          isActive={activeTab === 'activity'}
          onToggle={() => onTabChange('activity')}
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          )}
        />
      </div>

      <div className="cd-sidebar-bottom-action">
        <button
          className="cd-collapse-toggle"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
        </button>
      </div>
    </aside>
  );
};
