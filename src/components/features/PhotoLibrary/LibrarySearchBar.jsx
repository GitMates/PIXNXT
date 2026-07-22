import React, { useEffect, useRef } from 'react';
import { Search, Calendar, X } from 'lucide-react';
import { formatFilterDateRangeLabel } from '../../../utils/clientGalleryFilters';
import { LibraryDateFilter } from './LibraryDateFilter';
import './LibrarySearchBar.css';

const PIXNXT_FILTERS = [{ id: 'starred', label: 'Starred' }];

export function LibrarySearchBar({
  query,
  onQueryChange,
  labelSuggestions = [],
  starredOnly,
  onStarredOnlyChange,
  dateRange,
  onDateRangeChange,
  showPanel,
  onShowPanelChange,
  showDatePanel,
  onShowDatePanelChange,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!showPanel && !showDatePanel) return;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onShowPanelChange?.(false);
        onShowDatePanelChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel, showDatePanel, onShowPanelChange, onShowDatePanelChange]);

  const handleChipClick = (label) => {
    onQueryChange(label);
    onShowPanelChange?.(false);
  };

  const openSearchPanel = () => {
    onShowPanelChange?.(true);
    onShowDatePanelChange?.(false);
  };

  const toggleDatePanel = () => {
    onShowDatePanelChange?.(!showDatePanel);
    onShowPanelChange?.(false);
  };

  const hasDateFilter = Boolean(dateRange?.start);
  const isOpen = showPanel || showDatePanel;

  return (
    <div className="pl-search-wrap" ref={rootRef}>
      <div className={`pl-search-bar neu-inset${isOpen ? ' pl-search-bar--open' : ''}`}>
        <Search size={16} strokeWidth={1.75} aria-hidden className="pl-search-icon" />
        <input
          type="text"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          className="pl-search-input"
          value={query}
          placeholder="Search collections or keywords…"
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={openSearchPanel}
          aria-label="Search photo library"
        />
        {query ? (
          <button
            type="button"
            className="pl-search-clear"
            aria-label="Clear search"
            onClick={() => onQueryChange('')}
          >
            <X size={16} />
          </button>
        ) : null}
        <div className="pl-search-divider" aria-hidden />
        <button
          type="button"
          className={`pl-calendar-btn${hasDateFilter || showDatePanel ? ' pl-calendar-btn--active' : ''}`}
          aria-label={hasDateFilter ? `Date filter: ${formatFilterDateRangeLabel(dateRange)}` : 'Filter by date'}
          aria-expanded={showDatePanel}
          onClick={toggleDatePanel}
        >
          <Calendar size={18} strokeWidth={1.75} />
        </button>
      </div>

      {showDatePanel && (
        <div className="pl-date-filter-popover">
          <LibraryDateFilter
            dateRange={dateRange}
            onChange={onDateRangeChange}
            onClose={() => onShowDatePanelChange?.(false)}
          />
        </div>
      )}

      {showPanel && (
        <div className="pl-search-panel">
          <div className="pl-search-section">
            <p className="pl-search-section-label">Pixnxt</p>
            <div className="pl-search-chips">
              {PIXNXT_FILTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`pl-search-chip${starredOnly ? ' pl-search-chip--active' : ''}`}
                  onClick={() => onStarredOnlyChange?.(!starredOnly)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {labelSuggestions.length > 0 && (
            <div className="pl-search-section">
              <p className="pl-search-section-label">AI keywords</p>
              <div className="pl-search-chips">
                {labelSuggestions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={`pl-search-chip${query.toLowerCase() === label.toLowerCase() ? ' pl-search-chip--active' : ''}`}
                    onClick={() => handleChipClick(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="pl-search-help">Search across every photo in all of your client gallery collections.</p>
        </div>
      )}
    </div>
  );
}
