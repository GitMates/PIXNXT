import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Maximize2, Minimize2, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  PHOTO_SORT_FIELDS,
  sortFieldLabel,
} from '../../../../lib/dashboardPhotoSortUi';
import { CollectionPeopleStrip } from './CollectionPeopleStrip';
import './CollectionPhotosWorkspaceHeader.css';

function HeaderDropdown({ label, open, onToggle, children, menuClassName }) {
  const ref = useRef(null);
  const [mobileMenuStyle, setMobileMenuStyle] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onToggle(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onToggle]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      if (window.innerWidth > 768) {
        setMobileMenuStyle(null);
        return;
      }

      const trigger = ref.current?.querySelector('button');
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const preferredWidth = menuClassName?.includes('view') ? 268 : 248;
      const width = Math.min(preferredWidth, Math.max(0, window.innerWidth - 24));
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const top = rect.bottom + 8;

      setMobileMenuStyle({
        position: 'fixed',
        top,
        left,
        right: 'auto',
        width,
        minWidth: 0,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: `calc(100dvh - ${top + 12}px)`,
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 10000,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, menuClassName]);

  return (
    <div className={cn('cdpw-dropdown', open && 'cdpw-dropdown--open')} ref={ref}>
      <button type="button" className="cdpw-pill-btn" onClick={() => onToggle(!open)}>
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <div className={cn('cdpw-dropdown__menu', menuClassName)} style={mobileMenuStyle || undefined}>{children}</div>
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
  manualOrder = false,
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
  onDeletePerson,
  showPeopleField = false,
  fullScreen = false,
  onToggleFullScreen,
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const showPeopleStrip =
    Boolean(showPeopleField) ||
    analyzing ||
    loadingPeople ||
    indexedCount > 0 ||
    people.length > 0 ||
    Boolean(selfiePreview);
  const sortTriggerLabel = manualOrder ? 'Custom' : sortFieldLabel(sortField);

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
              <SortRadio
                checked={manualOrder}
                label="Custom order"
                onSelect={() => {
                  onSortFieldChange('custom');
                  setSortOpen(false);
                }}
              />
              <div className="cdpw-menu-divider" />
              {PHOTO_SORT_FIELDS.map((option) => (
                <SortRadio
                  key={option.id}
                  checked={!manualOrder && sortField === option.id}
                  label={option.label}
                  onSelect={() => {
                    onSortFieldChange(option.id);
                    setSortOpen(false);
                  }}
                />
              ))}
              <div className="cdpw-menu-divider" />
              <button
                type="button"
                disabled={manualOrder}
                className={cn('cdpw-sort-reverse', sortReverse && 'cdpw-sort-reverse--active', manualOrder && 'cdpw-sort-reverse--disabled')}
                onClick={() => {
                  onSortReverseChange(!sortReverse);
                  setSortOpen(false);
                }}
              >
                Reverse order
              </button>
            </HeaderDropdown>

            <button
              type="button"
              className="cdpw-fullscreen-btn"
              onClick={onToggleFullScreen}
              aria-pressed={fullScreen}
              aria-label={fullScreen ? 'Exit full screen grid' : 'Show full screen grid'}
              title={fullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullScreen ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
              <span>{fullScreen ? 'Exit full screen' : 'Full screen'}</span>
            </button>

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
          onDeletePerson={onDeletePerson}
        />
      ) : null}
    </div>
  );
}

export default CollectionPhotosWorkspaceHeader;
