import React from 'react';
import { Search } from 'lucide-react';

/**
 * Client Gallery–style neumorphic search field for Lab portal (UI only).
 */
export default function LabSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  style,
  inputProps,
}) {
  return (
    <div className="lab-search" style={{ flex: 1, minWidth: 200, maxWidth: '100%', ...style }}>
      <Search className="lab-search-icon" size={16} strokeWidth={2} aria-hidden />
      <input
        type="search"
        className="lab-search-input neu-inset"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...inputProps}
      />
    </div>
  );
}
