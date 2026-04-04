import React from 'react';
import { PhotoSet } from '@/types/collection.types';

interface PhotosSectionProps {
  sets: PhotoSet[];
  activeSetId: string | null;
  onSetChange: (setId: string | null) => void;
  onAddSet: () => void;
  onEditSet: (set: PhotoSet) => void;
  onDeleteSet: (setId: string) => void;
  showSetMenu: string | null;
  setShowSetMenu: (setId: string | null) => void;
}

export const PhotosSection: React.FC<PhotosSectionProps> = ({
  sets,
  activeSetId,
  onSetChange,
  onAddSet,
  onEditSet,
  onDeleteSet,
  showSetMenu,
  setShowSetMenu
}) => {
  return (
    <div className="cd-sidebar-photos">
      <div 
        className={`cd-set-item ${activeSetId === null ? 'active' : ''}`}
        onClick={() => onSetChange(null)}
      >
        <div className="cd-set-dot"></div>
        <span className="cd-set-name">Highlights</span>
      </div>

      {sets.map(set => (
        <div 
          key={set.id} 
          className={`cd-set-item ${activeSetId === set.id ? 'active' : ''}`}
          onClick={() => onSetChange(set.id)}
        >
          <div className="cd-set-dot"></div>
          <span className="cd-set-name">{set.name}</span>
          <button 
            className="cd-set-more"
            onClick={(e) => {
              e.stopPropagation();
              setShowSetMenu(showSetMenu === set.id ? null : (set.id || null));
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
          
          {showSetMenu === set.id && (
            <div className="cd-set-context-menu">
              <div className="cd-ctx-item" onClick={() => onEditSet(set)}>Edit Set</div>
              <div className="cd-ctx-item cd-ctx-delete" onClick={() => set.id && onDeleteSet(set.id)}>Delete Set</div>
            </div>
          )}
        </div>
      ))}

      <button className="cd-add-set-btn" onClick={onAddSet}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        Add Set
      </button>
    </div>
  );
};
