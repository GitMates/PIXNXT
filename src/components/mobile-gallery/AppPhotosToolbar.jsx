import React, { useEffect, useRef, useState } from 'react';
import { PHOTO_SORT_OPTIONS } from '../../lib/mobileGalleryPhotoSort';
import { ClientGallerySearchField } from '../features/ClientGallery/ClientGalleryPageShell';
import '../../pages/mobile-gallery/MobileGallery.css';

const AppPhotosToolbar = ({
  photoCount,
  selectedCount,
  sortKey,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onAddPhotos,
  onSetCover,
  deleting,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const sortRef = useRef(null);
  const moreRef = useRef(null);

  const hasSelection = selectedCount > 0;

  useEffect(() => {
    const onDocClick = (e) => {
      if (sortRef.current?.contains(e.target)) return;
      if (moreRef.current?.contains(e.target)) return;
      setSortOpen(false);
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const sortControl = (
    <div className="mg-photos-sort" ref={sortRef}>
      <button
        type="button"
        className="mg-photos-sort-btn"
        onClick={() => setSortOpen((v) => !v)}
        aria-expanded={sortOpen}
        aria-label="Sort photos"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
          <polyline points="19 5 12 12 5 5" />
        </svg>
        <span>Sort</span>
      </button>
      {sortOpen && (
        <div className="mg-photos-sort-menu">
          {PHOTO_SORT_OPTIONS.filter((o) => o.value !== 'position').map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mg-photos-sort-option${sortKey === option.value ? ' mg-photos-sort-option--active' : ''}`}
              onClick={() => {
                onSortChange(option.value);
                setSortOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const addPhotosButton = (
    <button type="button" className="mg-add-photos-btn neu-pill" onClick={onAddPhotos}>
      <span className="mg-add-photos-plus">+</span>
      Add Photos
    </button>
  );

  const searchField = (
    <ClientGallerySearchField
      value={searchQuery}
      onChange={(e) => onSearchQueryChange(e.target.value)}
      placeholder="Search photos…"
      ariaLabel="Search photos"
      className="mg-photos-search"
      typewriterPlaceholder
    />
  );

  if (hasSelection) {
    return (
      <div className="mg-photos-bar mg-photos-bar--selection">
        <div className="mg-photos-selection-left">
          <span className="mg-photos-selected-count">
            {selectedCount} selected
          </span>
          <button type="button" className="mg-photos-action-link" onClick={onSelectAll}>
            Select all
          </button>
          <button type="button" className="mg-photos-action-link" onClick={onClearSelection}>
            Clear Selection
          </button>
        </div>
        <div className="mg-photos-bar-controls">
          {searchField}
          <div className="mg-photos-toolbar-actions">
            <button
              type="button"
              className="mg-photos-icon-btn neu-circle mg-photos-icon-btn--danger"
              onClick={onDeleteSelected}
              disabled={deleting}
              aria-label="Delete selected"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            {selectedCount === 1 && onSetCover && (
              <div className="mg-photos-more" ref={moreRef}>
                <button
                  type="button"
                  className="mg-photos-icon-btn neu-circle"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-label="More options"
                >
                  ⋯
                </button>
                {moreOpen && (
                  <div className="mg-photos-more-menu">
                    <button type="button" onClick={() => { onSetCover(); setMoreOpen(false); }}>
                      Set as app cover
                    </button>
                  </div>
                )}
              </div>
            )}
            {sortControl}
            {addPhotosButton}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mg-photos-bar">
      <span className="mg-photos-count">
        {photoCount} photo{photoCount === 1 ? '' : 's'}
      </span>
      <div className="mg-photos-bar-controls">
        {searchField}
        <div className="mg-photos-toolbar-actions">
          {sortControl}
          {addPhotosButton}
        </div>
      </div>
    </div>
  );
};

export default AppPhotosToolbar;
