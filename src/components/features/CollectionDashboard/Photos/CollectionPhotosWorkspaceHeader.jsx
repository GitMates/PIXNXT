import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { DashboardMediaFilter } from '../Media/DashboardMediaFilter';
import { CollectionPeopleStrip } from './CollectionPeopleStrip';
import './CollectionPhotosWorkspaceHeader.css';

const SORT_OPTIONS = [
  { id: 'taken-new-old', label: 'Capture time: Newest first' },
  { id: 'taken-old-new', label: 'Capture time: Oldest first' },
  { id: 'upload-new-old', label: 'Uploaded: Newest first' },
  { id: 'upload-old-new', label: 'Uploaded: Oldest first' },
  { id: 'name-az', label: 'Name: A–Z' },
  { id: 'name-za', label: 'Name: Z–A' },
  { id: 'random', label: 'Random' },
];

function HeaderDropdown({ label, open, onToggle, children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onToggle(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onToggle]);

  return (
    <div className={cn('cdpw-dropdown', open && 'cdpw-dropdown--open', className)} ref={ref}>
      <button type="button" className="cdpw-pill-btn" onClick={() => onToggle(!open)}>
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? <div className="cdpw-dropdown__menu">{children}</div> : null}
    </div>
  );
}

export function CollectionPhotosWorkspaceHeader({
  setName,
  countLabel,
  showMediaFilter,
  mediaFilter,
  onMediaFilterChange,
  photoCount,
  videoCount,
  searchQuery,
  onSearchQueryChange,
  sortOption,
  onSortOptionChange,
  gridSize,
  onGridSizeChange,
  showFilename,
  onShowFilenameChange,
  onAddMedia,
  people = [],
  activePersonId,
  onSelectPerson,
  onClearPerson,
  analyzing = false,
  loadingPeople = false,
  indexedCount = 0,
  onSelfieSearch,
  onClearSelfie,
  onTogglePersonHidden,
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const showPeopleStrip = analyzing || loadingPeople || indexedCount > 0 || people.length > 0;

  return (
    <div className="cdpw">
      <div className="cdpw-header">
        <div className="cdpw-header__title-block">
          <h2 className="cdpw-title">{setName}</h2>
          <p className="cdpw-subtitle">{countLabel}</p>
          {showMediaFilter ? (
            <DashboardMediaFilter
              value={mediaFilter}
              onChange={onMediaFilterChange}
              photoCount={photoCount}
              videoCount={videoCount}
              className="cdpw-media-filter"
            />
          ) : null}
        </div>

        <label className="cdpw-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Find a photo in this delivery…"
            aria-label="Find a photo in this delivery"
          />
        </label>

        <div className="cdpw-header__actions">
          <HeaderDropdown label="View" open={viewOpen} onToggle={setViewOpen}>
            <button
              type="button"
              className={cn('cdpw-dropdown__item', gridSize === 'small' && 'cdpw-dropdown__item--active')}
              onClick={() => {
                onGridSizeChange('small');
                setViewOpen(false);
              }}
            >
              Small grid
            </button>
            <button
              type="button"
              className={cn('cdpw-dropdown__item', gridSize === 'large' && 'cdpw-dropdown__item--active')}
              onClick={() => {
                onGridSizeChange('large');
                setViewOpen(false);
              }}
            >
              Large grid
            </button>
            <button
              type="button"
              className={cn('cdpw-dropdown__item', showFilename && 'cdpw-dropdown__item--active')}
              onClick={() => onShowFilenameChange(!showFilename)}
            >
              {showFilename ? 'Hide filenames' : 'Show filenames'}
            </button>
          </HeaderDropdown>

          <HeaderDropdown
            label="Capture time"
            open={sortOpen}
            onToggle={setSortOpen}
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn('cdpw-dropdown__item', sortOption === option.id && 'cdpw-dropdown__item--active')}
                onClick={() => {
                  onSortOptionChange(option.id);
                  setSortOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </HeaderDropdown>

          <button type="button" className="cdpw-add-media" onClick={onAddMedia}>
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Add media
          </button>
        </div>
      </div>

      {showPeopleStrip ? (
        <CollectionPeopleStrip
          people={people}
          activePersonId={activePersonId}
          onSelectPerson={onSelectPerson}
          onClearPerson={onClearPerson}
          analyzing={analyzing}
          loadingPeople={loadingPeople}
          indexedCount={indexedCount}
          onSelfieSearch={onSelfieSearch}
          onClearSelfie={onClearSelfie}
          onTogglePersonHidden={onTogglePersonHidden}
        />
      ) : null}
    </div>
  );
}

export default CollectionPhotosWorkspaceHeader;
