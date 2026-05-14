import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import './DatePicker.css';

const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Optional", 
  className,
  disablePastDates = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [value]);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (disablePastDates && newDate < today) return;
    
    // Format as YYYY-MM-DD for consistency with native inputs if needed, or just ISO
    const formattedDate = newDate.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleQuickSearch = (type) => {
    let newDate = new Date();
    switch (type) {
      case '1w': newDate.setDate(newDate.getDate() + 7); break;
      case '2w': newDate.setDate(newDate.getDate() + 14); break;
      case '1m': newDate.setMonth(newDate.getMonth() + 1); break;
      case '6m': newDate.setMonth(newDate.getMonth() + 6); break;
      case '1y': newDate.setFullYear(newDate.getFullYear() + 1); break;
      default: break;
    }
    const formattedDate = newDate.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysCount = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);
    
    const days = [];
    
    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="calendar-day other-month">
          {prevMonthDays - i}
        </div>
      );
    }
    
    // Current month's days
    for (let d = 1; d <= daysCount; d++) {
      const currentIterDate = new Date(year, month, d);
      currentIterDate.setHours(0, 0, 0, 0);
      
      const isPast = disablePastDates && currentIterDate < today;
      const isSelected = selectedDate && currentIterDate.getTime() === selectedDate.getTime();
      const isToday = currentIterDate.getTime() === today.getTime();
      
      days.push(
        <div 
          key={d} 
          className={cn(
            "calendar-day", 
            isPast && "disabled", 
            isSelected && "selected",
            isToday && "today"
          )}
          onClick={() => !isPast && handleDateSelect(d)}
        >
          {d}
        </div>
      );
    }

    // Next month's leading days to fill the grid (6 rows of 7 = 42 cells)
    const totalCells = 42;
    const nextDaysNeeded = totalCells - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      days.push(
        <div key={`next-${i}`} className="calendar-day other-month">
          {i}
        </div>
      );
    }

    return days;
  };

  const displayValue = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [value]);

  return (
    <div className={cn("custom-datepicker", className)} ref={containerRef}>
      <div 
        className={cn("dp-input-field", isOpen && "focused")} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("dp-value", !value && "placeholder")}>
          {value ? displayValue : placeholder}
        </span>
        <CalendarIcon className="dp-icon" size={18} />
      </div>

      {isOpen && (
        <div className="dp-dropdown">
          <div className="dp-calendar-section">
            <div className="calendar-header">
              <div className="month-year">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <div className="nav-buttons">
                <button onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                <button onClick={handleNextMonth}><ChevronRight size={16} /></button>
              </div>
            </div>
            
            <div className="calendar-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="weekday">{d}</div>
              ))}
            </div>
            
            <div className="calendar-grid">
              {renderCalendar()}
            </div>
          </div>

          <div className="dp-quick-search">
            <div className="quick-search-label">QUICK SEARCH</div>
            <button onClick={() => handleQuickSearch('1w')}>1 week from now</button>
            <button onClick={() => handleQuickSearch('2w')}>2 weeks from now</button>
            <button onClick={() => handleQuickSearch('1m')}>1 month from now</button>
            <button onClick={() => handleQuickSearch('6m')}>6 months from now</button>
            <button onClick={() => handleQuickSearch('1y')}>1 year from now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
