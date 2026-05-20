import React, { useEffect, useState } from 'react';
import { DatePicker } from '../../ui/DatePicker';
import './EditCollectionModal.css';

export function EditFolderModal({ folder, isOpen, onClose, onSave, saving }) {
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [showOnHomepage, setShowOnHomepage] = useState(true);

  useEffect(() => {
    if (!folder || !isOpen) return;
    setName(folder.name || '');
    setEventDate(folder.event_date ? String(folder.event_date).slice(0, 10) : '');
    setShowOnHomepage(folder.show_on_homepage !== false);
  }, [folder, isOpen]);

  if (!isOpen || !folder) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      event_date: eventDate || null,
      show_on_homepage: showOnHomepage,
    });
  };

  return (
    <div className="ecm-overlay" onClick={onClose}>
      <div className="ecm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="efm-title">
        <div className="ecm-header">
          <h2 id="efm-title" className="ecm-title">
            EDIT FOLDER
          </h2>
          <button type="button" className="ecm-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="ecm-body" onSubmit={handleSubmit}>
          <div className="ecm-field">
            <label className="ecm-label" htmlFor="efm-name">
              Folder Name
            </label>
            <input id="efm-name" type="text" className="ecm-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="ecm-field">
            <label className="ecm-label">Event Date</label>
            <DatePicker value={eventDate} onChange={setEventDate} placeholder="MM/DD/YYYY" />
          </div>

          <div className="ecm-toggle-block">
            <div className="ecm-toggle-row">
              <span className="ecm-toggle-label">Show on Homepage</span>
              <button
                type="button"
                role="switch"
                aria-checked={showOnHomepage}
                className={`ecm-toggle ${showOnHomepage ? 'ecm-toggle--on' : ''}`}
                onClick={() => setShowOnHomepage((v) => !v)}
              >
                <span className="ecm-toggle-knob" />
              </button>
              <span className="ecm-toggle-state">{showOnHomepage ? 'On' : 'Off'}</span>
            </div>
          </div>

          <div className="ecm-footer">
            <div className="ecm-actions">
              <button type="button" className="ecm-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="ecm-save" disabled={saving || !name.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
