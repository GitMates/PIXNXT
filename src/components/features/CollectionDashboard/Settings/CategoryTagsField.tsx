import React, { useMemo, useRef, useState } from 'react';
import {
  CATEGORY_TAG_SUGGESTIONS,
  normalizeCategoryTag,
} from '../../../../lib/categoryTags';
import './CategoryTagsField.css';

export type CategoryTagsFieldProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
};

export function CategoryTagsField({
  tags,
  onChange,
  disabled,
  placeholder,
  suggestions = CATEGORY_TAG_SUGGESTIONS,
}: CategoryTagsFieldProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimeout = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handleFocus = () => {
    clearBlurTimeout();
    setFocused(true);
  };

  const handleBlur = () => {
    clearBlurTimeout();
    blurTimeoutRef.current = setTimeout(() => setFocused(false), 120);
  };

  const addTag = (raw: string) => {
    const tag = normalizeCategoryTag(raw);
    if (!tag) return false;
    const exists = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) return false;
    onChange([...tags, tag]);
    return true;
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = input.trim().replace(/,$/, '');
      if (addTag(value)) setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const visibleSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase();
    return suggestions.filter((suggestion) => {
      const normalized = normalizeCategoryTag(suggestion);
      if (!normalized) return false;
      if (tags.some((t) => t.toLowerCase() === normalized.toLowerCase())) return false;
      if (!query) return true;
      return normalized.toLowerCase().includes(query);
    });
  }, [input, suggestions, tags]);

  return (
    <div className={`category-tags${disabled ? ' is-disabled' : ''}`}>
      <div className="category-tags-field neu-inset">
        {tags.map((tag) => (
          <span key={tag} className="category-tags-chip">
            {tag}
            <button
              type="button"
              className="category-tags-chip-remove"
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              onClick={() => removeTag(tag)}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          className="category-tags-input"
          placeholder={placeholder || 'Add a tag and press Enter'}
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label="Add category tag"
        />
      </div>

      {focused && visibleSuggestions.length > 0 ? (
        <div className="category-tags-suggestions">
          <p className="category-tags-suggestions__label">Suggestions</p>
          <div className="category-tags-suggestions__box">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="category-tags-suggestion"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (addTag(suggestion)) setInput('');
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
