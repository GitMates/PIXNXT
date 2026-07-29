import React, { useState, useMemo, useEffect } from 'react';
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
  onReorderSets?: (newSets: PhotoSet[]) => void;
}

export const PhotosSection: React.FC<PhotosSectionProps> = ({
  sets,
  activeSetId,
  onSetChange,
  onAddSet,
  onEditSet,
  onDeleteSet,
  showSetMenu,
  setShowSetMenu,
  onReorderSets
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  useEffect(() => {
    setOrderedIds(null);
  }, [sets]);

  const setList = useMemo(() => {
    const sortedSets = [...sets].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const raw = [
      { id: 'highlights', name: 'Highlights', isHighlights: true, photoCount: 0 },
      ...sortedSets.map(s => ({ ...s, isHighlights: false, photoCount: s.photo_count || 0 }))
    ];

    if (!orderedIds) return raw;
    const map = new Map(raw.map(item => [item.id, item]));
    const result: typeof raw = [];
    orderedIds.forEach(id => {
      if (map.has(id)) {
        result.push(map.get(id)!);
        map.delete(id);
      }
    });
    map.forEach(item => result.push(item));
    return result;
  }, [sets, orderedIds]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) {
      handleDragEnd();
      return;
    }

    const items = [...setList];
    const [moved] = items.splice(draggedIndex, 1);
    items.splice(toIndex, 0, moved);

    setOrderedIds(items.map(i => i.id));
    handleDragEnd();

    if (onReorderSets) {
      const customSetsOnly = items.filter(i => !i.isHighlights) as any[];
      onReorderSets(customSetsOnly);
    }
  };

  return (
    <div className="cd-sidebar-photos">
      {setList.map((item, index) => {
        const isActive = item.isHighlights ? activeSetId === null : activeSetId === item.id;
        return (
          <div
            key={item.id}
            className={`cd-set-item ${isActive ? 'active' : ''} ${draggedIndex === index ? 'is-dragging' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
            onClick={() => onSetChange(item.isHighlights ? null : item.id)}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="cd-set-drag-handle">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </div>
            <span className="cd-set-name">
              {item.name} {item.photoCount > 0 && `(${item.photoCount})`}
            </span>

            <button
              className="cd-set-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowSetMenu(showSetMenu === item.id ? null : item.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>

            {showSetMenu === item.id && (
              <div className="cd-set-dropdown">
                <div
                  className="cd-ctx-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSetMenu(null);
                    onEditSet(item.isHighlights ? ({ id: 'highlights-default', name: 'Highlights' } as any) : (item as any));
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Edit set
                </div>
                {!item.isHighlights && (
                  <div
                    className="cd-ctx-item cd-ctx-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSetMenu(null);
                      onDeleteSet(item.id);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    Delete set
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button className="cd-add-set-btn" onClick={onAddSet}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        Add Set
      </button>
    </div>
  );
};
