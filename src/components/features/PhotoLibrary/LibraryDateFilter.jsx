import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatFilterDateRangeLabel,
  getQuickDateRange,
  isDayInRange,
  isRangeEndpoint,
  toIsoFromParts,
} from '../../../utils/clientGalleryFilters';
import './LibraryDateFilter.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const LIBRARY_DATE_PRESETS = [
  { id: 'last-week', label: 'Last week' },
  { id: 'last-2-weeks', label: 'Last 2 weeks' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'last-year', label: 'Last year' },
];

export function LibraryDateFilter({ dateRange, onChange, onClose }) {
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [dateDraft, setDateDraft] = useState(() => dateRange || { start: null, end: null });

  const highlightRange = dateDraft?.start ? dateDraft : dateRange;

  const applyRange = (range) => {
    onChange?.(range);
    onClose?.();
  };

  const handleCalendarDayClick = (day) => {
    const iso = toIsoFromParts(calendarYear, calendarMonth, day);

    if (!dateDraft.start || (dateDraft.start && dateDraft.end)) {
      setDateDraft({ start: iso, end: null });
      return;
    }

    let start = dateDraft.start;
    let end = iso;
    if (end < start) {
      [start, end] = [end, start];
    }
    applyRange({ start, end });
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

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
        <span key={`prev-${i}`} className="pl-date-day pl-date-day--muted">
          {daysInPrevMonth - i}
        </span>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        calendarMonth === today.getMonth() &&
        calendarYear === today.getFullYear();
      const inRange = isDayInRange(calendarYear, calendarMonth, day, highlightRange);
      const isEndpoint = isRangeEndpoint(calendarYear, calendarMonth, day, highlightRange);

      cells.push(
        <button
          key={`cur-${day}`}
          type="button"
          className={`pl-date-day pl-date-day--selectable${isToday ? ' pl-date-day--today' : ''}${inRange ? ' pl-date-day--in-range' : ''}${isEndpoint ? ' pl-date-day--endpoint' : ''}`}
          onClick={() => handleCalendarDayClick(day)}
        >
          {day}
        </button>
      );
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push(
          <span key={`next-${i}`} className="pl-date-day pl-date-day--muted">
            {i}
          </span>
        );
      }
    }

    return cells;
  };

  return (
    <div className="pl-date-filter">
      <div className="pl-date-filter-calendar">
        <div className="pl-date-filter-head">
          <div className="pl-date-filter-month">
            {MONTH_NAMES[calendarMonth]} {calendarYear}
          </div>
          <div className="pl-date-filter-nav">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear((year) => year - 1);
                } else {
                  setCalendarMonth((month) => month - 1);
                }
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear((year) => year + 1);
                } else {
                  setCalendarMonth((month) => month + 1);
                }
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {dateRange?.start ? (
          <p className="pl-date-filter-active">
            {formatFilterDateRangeLabel(dateRange)}
          </p>
        ) : (
          <p className="pl-date-filter-hint">Select a start date, then an end date</p>
        )}

        <div className="pl-date-weekdays">
          {DAY_NAMES.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="pl-date-grid">{renderCalendarGrid()}</div>

        {dateRange?.start ? (
          <button type="button" className="pl-date-clear" onClick={() => applyRange(null)}>
            Clear date filter
          </button>
        ) : null}
      </div>

      <div className="pl-date-filter-quick">
        <p className="pl-date-filter-quick-label">Quick search</p>
        {LIBRARY_DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="pl-date-quick-btn"
            onClick={() => {
              const range = getQuickDateRange(preset.id);
              if (range) applyRange(range);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
