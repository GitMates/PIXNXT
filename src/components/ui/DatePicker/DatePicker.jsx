import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';
import './DatePicker.css';

/**
 * A premium-styled native date picker component.
 * Uses the browser's native date picker but styled to fit the PIXNXT design.
 */
const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  className 
}) => {
  const inputRef = useRef(null);

  const handleWrapperClick = () => {
    // Some browsers allow opening the picker programmatically
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div 
      className={cn("dp-wrapper", className)} 
      onClick={handleWrapperClick}
    >
      <input
        ref={inputRef}
        type="date"
        className="dp-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Calendar className="dp-icon" size={18} />
    </div>
  );
};

export default DatePicker;
