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
      {/* ── Highlights (virtual set: photos with no set_id) ── */}
      <div
        className={`cd-set-item ${activeSetId === null ? 'active' : ''}`}
        onClick={() => onSetChange(null)}
      >
        <div className="cd-set-drag-handle">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </div>
        <span className="cd-set-name">Highlights</span>

        {/* Three-dot menu for Highlights */}
        <button
          className="cd-set-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowSetMenu(showSetMenu === 'highlights-default' ? null : 'highlights-default');
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
        </button>

        {showSetMenu === 'highlights-default' && (
          <div className="cd-set-dropdown">
            <div
              className="cd-ctx-item"
              onClick={(e) => {
                e.stopPropagation();
                setShowSetMenu(null);
                onEditSet({ id: 'highlights-default', name: 'Highlights' } as any);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit set
            </div>
            {/* No Delete option — Highlights is a permanent virtual set */}
          </div>
        )}
      </div>

      {/* ── User-created sets ── */}
      {sets.map(set => (
        <div
          key={set.id}
          className={`cd-set-item ${activeSetId === set.id ? 'active' : ''}`}
          onClick={() => onSetChange(set.id)}
        >
          <div className="cd-set-drag-handle">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </div>
          <span className="cd-set-name">{set.name} {set.photo_count > 0 && `(${set.photo_count})`}</span>
          <button
            className="cd-set-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowSetMenu(showSetMenu === set.id ? null : (set.id || null));
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>

          {showSetMenu === set.id && (
            <div className="cd-set-dropdown">
              <div
                className="cd-ctx-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSetMenu(null);
                  onEditSet(set);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit set
              </div>
              <div
                className="cd-ctx-item cd-ctx-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSetMenu(null);
                  set.id && onDeleteSet(set.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Delete set
              </div>
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
