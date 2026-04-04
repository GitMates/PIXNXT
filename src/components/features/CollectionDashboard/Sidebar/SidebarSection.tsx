import React from 'react';

interface SidebarSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  id,
  title,
  icon,
  isActive,
  onToggle,
  children
}) => {
  return (
    <div className={`cd-sidebar-section ${isActive ? 'active' : ''}`}>
      <div className="cd-sidebar-section-header" onClick={onToggle}>
        <div className="cd-sidebar-section-title">
          <div className="cd-sidebar-icon">
            {icon}
          </div>
          <span>{title}</span>
        </div>
        <svg 
          className={`cd-sidebar-chevron ${isActive ? 'open' : ''}`}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isActive && (
        <div className="cd-sidebar-section-content">
          {children}
        </div>
      )}
    </div>
  );
};
