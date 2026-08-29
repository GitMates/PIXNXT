import React, { useEffect, useRef, useState } from 'react';
import { displayPersonLabel, isPlaceholderPersonLabel } from '../../../../lib/photoAiSearch';
import './PersonLabelEditor.css';

export function PersonLabelEditor({
  label,
  onSave,
  className = '',
  placeholder = 'Not named',
  editable = true,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const canEdit = editable && typeof onSave === 'function';

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit || saving) return;
    setDraft(isPlaceholderPersonLabel(label) ? '' : String(label || ''));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const commitEdit = async () => {
    if (!canEdit) return;
    const trimmed = draft.trim();
    setEditing(false);
    setDraft('');

    if (!trimmed || trimmed === label || (isPlaceholderPersonLabel(label) && !trimmed)) {
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (err) {
      console.warn('[PersonLabelEditor] save failed:', err);
      alert(err?.message || 'Could not save name.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className={`person-label-editor__input ${className}`.trim()}
        value={draft}
        disabled={saving}
        placeholder={placeholder}
        maxLength={80}
        aria-label="Person name"
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onBlur={() => {
          void commitEdit();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            void commitEdit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelEdit();
          }
        }}
      />
    );
  }

  const display = displayPersonLabel(label, placeholder);

  if (!canEdit) {
    return <span className={className}>{display}</span>;
  }

  return (
    <button
      type="button"
      className={`person-label-editor__trigger ${className}${
        isPlaceholderPersonLabel(label) ? ' person-label-editor__trigger--placeholder' : ''
      }`.trim()}
      title="Click to name this person"
      disabled={saving}
      onClick={startEdit}
    >
      {display}
    </button>
  );
}

export default PersonLabelEditor;
