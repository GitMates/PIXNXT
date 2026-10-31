import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { OTHER_COUNTRY, PHONE_COUNTRIES } from '../../lib/onboarding';

const OPTIONS = [
  ...PHONE_COUNTRIES,
  { ...OTHER_COUNTRY, name: 'Other country' },
];

const matchesQuery = (country, query) => {
  const haystack = `${country.name} ${country.iso} ${country.dial}`.toLowerCase();
  return haystack.includes(query);
};

/**
 * Searchable country picker for the onboarding phone step.
 *
 * A native `<select>` cannot show the same level of polish as the rest of the
 * flow and opens as an unstyled OS menu. This keeps the same form value (ISO
 * code) while giving the country, dial code, and search a proper layout.
 */
export default function CountrySelect({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();

  const selected = useMemo(
    () => OPTIONS.find((country) => country.iso === value) || PHONE_COUNTRIES[0],
    [value],
  );

  const filtered = useMemo(() => {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return OPTIONS;
    return OPTIONS.filter((country) => matchesQuery(country, normalized));
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const openMenu = () => {
    if (disabled) return;
    const selectedIndex = OPTIONS.findIndex((country) => country.iso === selected.iso);
    setQuery('');
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };

  const selectCountry = (country) => {
    onChange?.(country.iso);
    // Keep focus on the trigger for normal selections. "Other country"
    // reveals the dial-code input, which the parent focuses instead.
    closeMenu({ restoreFocus: country.iso !== 'OTHER' });
  };

  const handleButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, filtered.length - 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const country = filtered[activeIndex];
      if (country) selectCountry(country);
    }
  };

  const activeOption = filtered[activeIndex];
  const activeOptionId = activeOption ? `${listboxId}-${activeOption.iso}` : undefined;

  return (
    <div
      className="onb-country-select"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="onb-country-trigger"
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Country: ${selected.name}${selected.dial ? ` ${selected.dial}` : ''}`}
        disabled={disabled}
      >
        <span className="onb-country-code" aria-hidden="true">
          {selected.iso === 'OTHER' ? '+' : selected.iso}
        </span>
        <span className="onb-country-name">{selected.name}</span>
        <span className="onb-country-dial">{selected.dial || 'Custom'}</span>
        <ChevronDown
          className={`onb-country-chevron${open ? ' is-open' : ''}`}
          size={16}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="onb-country-menu">
          <div className="onb-country-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search country or code"
              aria-label="Search countries"
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              autoComplete="off"
            />
          </div>

          <div
            className="onb-country-list"
            id={listboxId}
            role="listbox"
            aria-label="Countries"
            ref={listRef}
          >
            {filtered.length === 0 ? (
              <p className="onb-country-empty">No country found</p>
            ) : (
              filtered.map((country, index) => {
                const isSelected = country.iso === selected.iso;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`${country.iso}-${country.dial}`}
                    type="button"
                    id={`${listboxId}-${country.iso}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive ? 'true' : undefined}
                    className={[
                      'onb-country-option',
                      isActive ? 'is-active' : '',
                      isSelected ? 'is-selected' : '',
                    ].filter(Boolean).join(' ')}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCountry(country)}
                    tabIndex={-1}
                  >
                    <span className="onb-country-code" aria-hidden="true">
                      {country.iso === 'OTHER' ? '+' : country.iso}
                    </span>
                    <span className="onb-country-option-name">{country.name}</span>
                    <span className="onb-country-option-dial">
                      {country.dial || 'Custom'}
                    </span>
                    {isSelected ? (
                      <Check className="onb-country-check" size={15} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
