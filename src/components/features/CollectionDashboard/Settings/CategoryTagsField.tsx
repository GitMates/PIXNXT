import React, { useState } from 'react';
import { normalizeCategoryTag } from '../../../../lib/categoryTags';
import './CategoryTagsField.css';

export type CategoryTagsFieldProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
};

export function CategoryTagsField({ tags, onChange, disabled }: CategoryTagsFieldProps) {
  const [input, setInput] = useState('');

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

  return (
    <div className={`category-tags-field${disabled ? ' is-disabled' : ''}`}>
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
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        className="category-tags-input"
        placeholder={tags.length ? 'Add another tag' : 'Select or enter tags'}
        value={input}
        disabled={disabled}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
