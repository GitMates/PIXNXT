import React, { useState, useRef, useEffect } from 'react';
import { PhotoCardProps } from './Media.types';
import { CollectionGridPhoto } from './CollectionGridPhoto';

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  showFilename,
  gridSize,
  onSelect,
  onToggleStar,
  onDelete,
  onMakeCover
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      className={`cd-photo-card ${isSelected ? 'selected' : ''} ${gridSize === 'large' ? 'large' : ''}`}
      onClick={onSelect}
    >
      <div className="cd-photo-card-inner cd-photo-card-inner--contain">
        <CollectionGridPhoto photo={photo} index={0} containInCell />
      </div>
      
      {showFilename && (
        <div className="cd-photo-filename">{photo.filename}</div>
      )}

      <button 
        className="cd-photo-menu" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setShowMenu(!showMenu); 
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>

      <button 
        className={`cd-photo-star ${photo.is_starred ? 'active' : ''}`}
        onClick={(e) => { 
          e.stopPropagation(); 
          onToggleStar(); 
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={photo.is_starred ? "#FFC107" : "none"} stroke={photo.is_starred ? "#FFC107" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </button>

      {showMenu && (
        <div className="cd-photo-context-menu" ref={menuRef}>
          <div className="cd-ctx-item" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onMakeCover(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path></svg>
            <span>Make cover</span>
          </div>
          <div className="cd-ctx-item cd-ctx-delete" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
};
