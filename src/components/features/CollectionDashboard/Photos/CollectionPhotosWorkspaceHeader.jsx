import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  PHOTO_SORT_FIELDS,
  sortFieldLabel,
} from '../../../../lib/dashboardPhotoSortUi';
import { CollectionPeopleStrip } from './CollectionPeopleStrip';
import './CollectionPhotosWorkspaceHeader.css';

function HeaderDropdown({ label, open, onToggle, children, menuClassName }) {
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
    <div className={cn('cdpw-dropdown', open && 'cdpw-dropdown--open')} ref={ref}>
      <button type="button" className="cdpw-pill-btn" onClick={() => onToggle(!open)}>
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <div className={cn('cdpw-dropdown__menu', menuClassName)}>{children}</div>
      ) : null}
    </div>
  );
}

function ViewCheckbox({ checked, disabled, label, onChange }) {
  return (
    <label className={cn('cdpw-view-option', disabled && 'cdpw-view-option--disabled')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="cdpw-view-option__box" aria-hidden />
      <span className="cdpw-view-option__label">{label}</span>
    </label>
  );
}

function SortRadio({ checked, label, onSelect }) {
  return (
    <button type="button" className="cdpw-sort-option" onClick={onSelect}>
      <span className={cn('cdpw-sort-option__radio', checked && 'cdpw-sort-option__radio--checked')} aria-hidden />
      <span className="cdpw-sort-option__label">{label}</span>
    </button>
  );
}

export function CollectionPhotosWorkspaceHeader({
  setName,
  countLabel,
  searchQuery,
  onSearchQueryChange,
  sortField,
  sortReverse,
  onSortFieldChange,
  onSortReverseChange,
  showFilename,
  onShowFilenameChange,
  showCameraBadges,
  onShowCameraBadgesChange,
  showUnmatchedPeople,
  onShowUnmatchedPeopleChange,
  showClientFavorited,
  onShowClientFavoritedChange,
  showInSelectionList,
  onShowInSelectionListChange,
  sharingOverlaysEnabled,
  onAddMedia,
  people = [],
  activePersonId,
  onSelectPerson,
  onClearPerson,
  analyzing = false,
  loadingPeople = false,
  indexedCount = 0,
  tableMissing = false,
  selfiePreview = '',
  selfieSearching = false,
  selfieMessage = '',
  onSelfieSearch,
  onClearSelfie,
  onReanalyze,
  onRenamePerson,
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const showPeopleStrip =
    analyzing ||
    loadingPeople ||
    indexedCount > 0 ||
    people.length > 0 ||
    Boolean(onSelfieSearch) ||
    Boolean(selfiePreview);
  const sortTriggerLabel = sortFieldLabel(sortField);

  return (
    <div className="cdpw">
      <div className="cdpw-header">
        <div className="cdpw-header__primary">
          <div className="cdpw-header__title-block">
            <h2 className="cdpw-title">{setName}</h2>
            <p className="cdpw-subtitle">{countLabel}</p>
          </div>

          <div className="cdpw-header__actions">
            <div className="cdpw-search neu-inset">
              <Search size={16} strokeWidth={1.75} aria-hidden className="cdpw-search__icon" />
              <input
                type="search"
                className="cdpw-search__input"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Find a photo in this delivery…"
                aria-label="Find a photo in this delivery"
              />
            </div>

            <HeaderDropdown
              label="View"
              open={viewOpen}
              onToggle={setViewOpen}
              menuClassName="cdpw-dropdown__menu--view"
            >
              <p className="cdpw-menu-section">Show on each photo</p>
              <ViewCheckbox
                checked={showCameraBadges}
                label="Camera badges"
                onChange={onShowCameraBadgesChange}
              />
              <ViewCheckbox
                checked={showFilename}
                label="Filenames"
                onChange={onShowFilenameChange}
              />
              <ViewCheckbox
                checked={showUnmatchedPeople}
                label="Not matched to anyone"
                onChange={onShowUnmatchedPeopleChange}
              />

              <div className="cdpw-menu-divider" />

              <p className="cdpw-menu-section">Available after sharing</p>
              <ViewCheckbox
                checked={showClientFavorited}
                disabled={!sharingOverlaysEnabled}
                label="Favourited by the client"
                onChange={onShowClientFavoritedChange}
              />
              <ViewCheckbox
                checked={showInSelectionList}
                disabled={!sharingOverlaysEnabled}
                label="Already in a selection list"
                onChange={onShowInSelectionListChange}
              />
            </HeaderDropdown>

            <HeaderDropdown
              label={sortTriggerLabel}
              open={sortOpen}
              onToggle={setSortOpen}
              menuClassName="cdpw-dropdown__menu--sort"
            >
              <p className="cdpw-menu-section">Sort photos by</p>
              {PHOTO_SORT_FIELDS.map((option) => (
                <SortRadio
                  key={option.id}
                  checked={sortField === option.id}
                  label={option.label}
                  onSelect={() => onSortFieldChange(option.id)}
                />
              ))}
              <div className="cdpw-menu-divider" />
              <button
                type="button"
                className={cn('cdpw-sort-reverse', sortReverse && 'cdpw-sort-reverse--active')}
                onClick={() => onSortReverseChange(!sortReverse)}
              >
                Reverse order
              </button>
            </HeaderDropdown>

            <button type="button" className="cdpw-add-media" onClick={onAddMedia}>
              <span className="cdpw-add-media__plus" aria-hidden>
                +
              </span>
              Add media
            </button>
          </div>
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
          tableMissing={tableMissing}
          selfiePreview={selfiePreview}
          selfieSearching={selfieSearching}
          selfieMessage={selfieMessage}
          onSelfieSearch={onSelfieSearch}
          onClearSelfie={onClearSelfie}
          onReanalyze={onReanalyze}
          onRenamePerson={onRenamePerson}
        />
      ) : null}
    </div>
  );
}

export default CollectionPhotosWorkspaceHeader;
