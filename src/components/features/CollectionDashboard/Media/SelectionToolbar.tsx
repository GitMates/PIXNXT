import React, { useState, useRef, useEffect } from 'react';
import { SelectionToolbarProps } from './Media.types';

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  onClear,
  onSelectAll,
  onDelete,
  onMoveToSet,
  sets
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showSelectMenu, setShowSelectMenu] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const selectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setShowMoveMenu(false);
      }
      if (selectMenuRef.current && !selectMenuRef.current.contains(event.target as Node)) {
        setShowSelectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="cd-selection-toolbar">
      <div className="cd-selection-left">
        <button className="cd-selection-close" onClick={onClear}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div 
          className="cd-selection-count-wrapper" 
          onClick={() => setShowSelectMenu(!showSelectMenu)}
          ref={selectMenuRef}
        >
          <span>{selectedCount} selected</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cd-selection-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
          {showSelectMenu && (
            <div className="cd-selection-menu">
              <div className="cd-ctx-item" onClick={onSelectAll}>Select All</div>
            </div>
          )}
        </div>
      </div>

      <div className="cd-selection-actions">
        <button className="cd-sel-action-btn" title="Add to Starred">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
        <button className="cd-sel-action-btn" title="Share link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
        
        <div className="cd-selection-move-wrapper" ref={moveMenuRef}>
          <button 
            className="cd-sel-action-btn" 
            title="Move/Copy" 
            onClick={() => setShowMoveMenu(!showMoveMenu)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" /></svg>
          </button>
          
          {showMoveMenu && (
            <div className="cd-selection-move-dropdown">
              <div className="cd-sort-label">Move to Set</div>
              {sets.map(s => (
                <div 
                  key={s.id || 'highlights'} 
                  className="cd-ctx-item"
                  onClick={() => {
                    onMoveToSet(s.id);
                    setShowMoveMenu(false);
                  }}
                >
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="cd-sel-action-btn" title="Delete" onClick={onDelete}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
};
