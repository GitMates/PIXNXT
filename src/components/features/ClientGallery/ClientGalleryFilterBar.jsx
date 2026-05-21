import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  COLLECTION_STATUS_FILTER_OPTIONS,
  collectCategoryTagsFromCollections,
  EMPTY_CLIENT_GALLERY_FILTERS,
  formatFilterDateRangeLabel,
  getQuickDateRange,
  getStatusFilterLabel,
  hasActiveClientGalleryFilters,
  isDayInRange,
  isRangeEndpoint,
  toIsoFromParts,
} from '../../../utils/clientGalleryFilters';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const EVENT_QUICK_PRESETS = [
  { id: 'last-week', label: 'Last week' },
  { id: 'last-2-weeks', label: 'Last 2 weeks' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'last-year', label: 'Last year' },
  { id: 'next-week', label: 'Next week' },
  { id: 'next-2-weeks', label: 'Next 2 weeks' },
  { id: 'next-month', label: 'Next month' },
  { id: 'next-6-months', label: 'Next 6 months' },
  { id: 'next-year', label: 'Next year' },
];

const EXPIRY_QUICK_PRESETS = [
  { id: 'next-week', label: 'Next week' },
  { id: 'next-2-weeks', label: 'Next 2 weeks' },
  { id: 'next-month', label: 'Next month' },
  { id: 'next-6-months', label: 'Next 6 months' },
  { id: 'next-year', label: 'Next year' },
];

function FilterOption({ selected, onClick, children }) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className={`cg-style-18 cg-filter-option${selected ? ' cg-filter-option--selected' : ''}`}
      onClick={onClick}
    >
      <span>{children}</span>
      {selected ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </div>
  );
}

function FilterChip({ active, label, onOpen, onClear }) {
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`cg-style-70${active ? ' cg-filter-chip--active' : ' bg-[#fdfaf4] border border-[#eedec3] hover:bg-[#eedec3]'}`}
        onClick={onOpen}
      >
        <span>{label}</span>
        {active ? (
          <span
            role="button"
            tabIndex={0}
            className="cg-filter-chip-clear"
            aria-label={`Remove ${label} filter`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }
            }}
          >
            ×
          </span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function ClientGalleryFilterBar({ filters, onFiltersChange, collections }) {
  const barRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [dateDraft, setDateDraft] = useState({ start: null, end: null });

  const availableTags = useMemo(
    () => collectCategoryTagsFromCollections(collections),
    [collections]
  );

  const hasActive = hasActiveClientGalleryFilters(filters);

  const toggleFilter = (name) => {
    setActiveFilter((prev) => {
      const next = prev === name ? null : name;
      if (next === 'eventdate') {
        setDateDraft(filters.eventDateRange || { start: null, end: null });
      } else if (next === 'expirydate') {
        setDateDraft(filters.expiryDateRange || { start: null, end: null });
      }
      return next;
    });
  };

  const patchFilters = (patch) => onFiltersChange({ ...filters, ...patch });

  const clearAllFilters = () => {
    onFiltersChange({ ...EMPTY_CLIENT_GALLERY_FILTERS });
    setActiveFilter(null);
    setDateDraft({ start: null, end: null });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const today = new Date();

  const activeDateRange =
    activeFilter === 'expirydate' ? filters.expiryDateRange : filters.eventDateRange;
  const calendarHighlightRange = dateDraft?.start ? dateDraft : activeDateRange;

  const applyDateRange = (field, range) => {
    patchFilters({ [field]: range });
    setActiveFilter(null);
    setDateDraft({ start: null, end: null });
  };

  const handleCalendarDayClick = (day) => {
    const iso = toIsoFromParts(calendarYear, calendarMonth, day);
    const field = activeFilter === 'expirydate' ? 'expiryDateRange' : 'eventDateRange';

    if (!dateDraft.start || (dateDraft.start && dateDraft.end)) {
      setDateDraft({ start: iso, end: null });
      return;
    }
    let start = dateDraft.start;
    let end = iso;
    if (end < start) {
      [start, end] = [end, start];
    }
    applyDateRange(field, { start, end });
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const daysInPrevMonth = getDaysInMonth(
      calendarMonth - 1 < 0 ? 11 : calendarMonth - 1,
      calendarMonth - 1 < 0 ? calendarYear - 1 : calendarYear
    );
    const cells = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push(
        <span key={`prev-${i}`} className="cg-style-1">
          {daysInPrevMonth - i}
        </span>
      );
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        d === today.getDate() &&
        calendarMonth === today.getMonth() &&
        calendarYear === today.getFullYear();
      const inRange = isDayInRange(calendarYear, calendarMonth, d, calendarHighlightRange);
      const isEndpoint = isRangeEndpoint(calendarYear, calendarMonth, d, calendarHighlightRange);
      cells.push(
        <button
          key={`cur-${d}`}
          type="button"
          className={`cg-style-69 cg-calendar-day${isToday ? ' cg-calendar-day--today' : ''}${inRange ? ' cg-calendar-day--in-range' : ''}${isEndpoint ? ' cg-calendar-day--endpoint' : ''}`}
          onClick={() => handleCalendarDayClick(d)}
        >
          {d}
        </button>
      );
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push(
          <span key={`next-${i}`} className="cg-style-1">
            {i}
          </span>
        );
      }
    }
    return cells;
  };

  const renderDateFilterPanel = (field, quickPresets) => (
    <div className="cg-style-21">
      <div className="cg-style-22">
        <div className="cg-style-23">
          <span className="cg-style-24">{MONTH_NAMES[calendarMonth]}</span>
          <span className="cg-style-25">{calendarYear}</span>
          <button
            type="button"
            className="cg-style-26"
            onClick={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
              } else setCalendarMonth(calendarMonth - 1);
            }}
          >
            ←
          </button>
          <button
            type="button"
            className="cg-style-26"
            onClick={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
              } else setCalendarMonth(calendarMonth + 1);
            }}
          >
            →
          </button>
        </div>
        <div className="cg-style-27">
          {DAY_NAMES.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cg-style-28">{renderCalendarGrid()}</div>
      </div>
      <div className="cg-style-29">
        <div className="cg-style-30">QUICK SEARCH</div>
        {quickPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="cg-style-31 cg-quick-date-btn"
            onClick={() => {
              const range = getQuickDateRange(preset.id);
              if (range) applyDateRange(field, range);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );

  const statusLabel = filters.status
    ? `Status: ${getStatusFilterLabel(filters.status)}`
    : 'Status';
  const tagLabel = filters.categoryTag ? `Category Tag: ${filters.categoryTag}` : 'Category Tag';
  const eventLabel = filters.eventDateRange?.start
    ? `Event Date: ${formatFilterDateRangeLabel(filters.eventDateRange)}`
    : 'Event Date';
  const expiryLabel = filters.expiryDateRange?.start
    ? `Expiry Date: ${formatFilterDateRangeLabel(filters.expiryDateRange)}`
    : 'Expiry Date';
  const starredLabel =
    filters.starred === true ? 'Starred: Yes' : filters.starred === false ? 'Starred: No' : 'Starred';

  return (
    <div className="cg-style-16" ref={barRef}>
        <div className="relative inline-flex">
          <FilterChip
            active={filters.status != null}
            label={statusLabel}
            onOpen={() => toggleFilter('status')}
            onClear={() => patchFilters({ status: null })}
          />
          {activeFilter === 'status' && (
            <div className="cg-style-17">
              {COLLECTION_STATUS_FILTER_OPTIONS.map((opt) => (
                <FilterOption
                  key={opt.value}
                  selected={filters.status === opt.value}
                  onClick={() => {
                    patchFilters({ status: opt.value });
                    setActiveFilter(null);
                  }}
                >
                  {opt.label}
                </FilterOption>
              ))}
            </div>
          )}
        </div>

        <div className="relative inline-flex">
          <FilterChip
            active={Boolean(filters.categoryTag)}
            label={tagLabel}
            onOpen={() => toggleFilter('category')}
            onClear={() => patchFilters({ categoryTag: null })}
          />
          {activeFilter === 'category' && (
            <div className="cg-style-17">
              {availableTags.length === 0 ? (
                <div className="cg-style-19">
                  You don&apos;t have category tags yet.{' '}
                  <a className="cg-style-20" href="#">
                    Learn more
                  </a>
                </div>
              ) : (
                availableTags.map((tag) => (
                  <FilterOption
                    key={tag}
                    selected={filters.categoryTag === tag}
                    onClick={() => {
                      patchFilters({ categoryTag: tag });
                      setActiveFilter(null);
                    }}
                  >
                    {tag}
                  </FilterOption>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative inline-flex">
          <FilterChip
            active={Boolean(filters.eventDateRange?.start)}
            label={eventLabel}
            onOpen={() => toggleFilter('eventdate')}
            onClear={() => patchFilters({ eventDateRange: null })}
          />
          {activeFilter === 'eventdate' && renderDateFilterPanel('eventDateRange', EVENT_QUICK_PRESETS)}
        </div>

        <div className="relative inline-flex">
          <FilterChip
            active={Boolean(filters.expiryDateRange?.start)}
            label={expiryLabel}
            onOpen={() => toggleFilter('expirydate')}
            onClear={() => patchFilters({ expiryDateRange: null })}
          />
          {activeFilter === 'expirydate' && renderDateFilterPanel('expiryDateRange', EXPIRY_QUICK_PRESETS)}
        </div>

        <div className="relative inline-flex">
          <FilterChip
            active={filters.starred != null}
            label={starredLabel}
            onOpen={() => toggleFilter('starred')}
            onClear={() => patchFilters({ starred: null })}
          />
          {activeFilter === 'starred' && (
            <div className="cg-style-17">
              <FilterOption
                selected={filters.starred === true}
                onClick={() => {
                  patchFilters({ starred: true });
                  setActiveFilter(null);
                }}
              >
                Yes
              </FilterOption>
              <FilterOption
                selected={filters.starred === false}
                onClick={() => {
                  patchFilters({ starred: false });
                  setActiveFilter(null);
                }}
              >
                No
              </FilterOption>
            </div>
          )}
        </div>

        {hasActive ? (
          <button type="button" className="cg-filter-clear-all" onClick={clearAllFilters}>
            Clear filters
          </button>
        ) : null}
    </div>
  );
}
