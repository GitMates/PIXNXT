import React, { useEffect, useRef } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
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

  const toggleFilterPanel = () => {
    onShowPanelChange?.(!showPanel);
    onShowDatePanelChange?.(false);
  };

  const toggleDatePanel = () => {
    onShowDatePanelChange?.(!showDatePanel);
    onShowPanelChange?.(false);
  };

  const hasDateFilter = Boolean(dateRange?.start);
  const filterIsOn = Boolean(showPanel || starredOnly);

  return (
    <div className="pl-search-wrap dl-toolbar" ref={rootRef}>
      <div className="dl-search">
        <Search aria-hidden />
        <input
          type="search"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          placeholder="Search photos or keywords..."
          onChange={(e) => onQueryChange(e.target.value)}
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
      </div>

      <div className="dl-tools">
        <div className="relative">
          <button
            type="button"
            className={cn('dl-icon-btn', filterIsOn && 'is-on')}
            aria-label="Show filter"
            aria-expanded={showPanel}
            onClick={toggleFilterPanel}
          >
            <Filter className="size-4" strokeWidth={1.6} />
          </button>
          {showPanel ? (
            <div className="dl-popover pl-filter-popover" role="menu">
              <p className="dl-popover__kicker">SHOW</p>
              {PIXNXT_FILTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  role="menuitem"
                  className={cn('dl-popover__item', starredOnly && 'is-on')}
                  onClick={() => onStarredOnlyChange?.(!starredOnly)}
                >
                  <span>{chip.label}</span>
                </button>
              ))}

              {labelSuggestions.length > 0 ? (
                <div className="pl-search-section">
                  <p className="dl-popover__kicker">AI KEYWORDS</p>
                  <div className="pl-search-chips">
                    {labelSuggestions.map((label) => {
                      const text = typeof label === 'string' ? label : String(label?.name ?? label?.Name ?? '');
                      if (!text) return null;
                      return (
                        <button
                          key={text}
                          type="button"
                          className={cn(
                            'pl-search-chip',
                            query.toLowerCase() === text.toLowerCase() && 'pl-search-chip--active',
                          )}
                          onClick={() => handleChipClick(text)}
                        >
                          {text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="pl-search-help">Search across every photo in your deliveries.</p>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className={cn('dl-icon-btn', (hasDateFilter || showDatePanel) && 'is-on')}
            aria-label={hasDateFilter ? `Date filter: ${formatFilterDateRangeLabel(dateRange)}` : 'Filter by date'}
            aria-expanded={showDatePanel}
            onClick={toggleDatePanel}
          >
            <Calendar className="size-4" strokeWidth={1.6} />
          </button>
          {showDatePanel ? (
            <div className="pl-date-filter-popover">
              <LibraryDateFilter
                dateRange={dateRange}
                onChange={onDateRangeChange}
                onClose={() => onShowDatePanelChange?.(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
