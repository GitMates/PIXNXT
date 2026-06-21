import React, { useEffect, useRef } from 'react';
import { DatePicker } from '../ui/DatePicker';
import '../../pages/mobile-gallery/MobileGallery.css';

const CreateAppModal = ({ isOpen, onClose, onCreate, saving }) => {
  const [name, setName] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEventDate('');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    onCreate({ name: name.trim(), event_date: eventDate || null });
  };

  return (
    <div className="mg-modal-overlay" onClick={onClose} role="presentation">
      <div className="mg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="mg-create-title">
        <h2 id="mg-create-title" className="mg-modal-title">CREATE NEW APP</h2>
        <form onSubmit={handleSubmit}>
          <label className="mg-field-label" htmlFor="mg-app-name">
            Mobile Gallery App Name
          </label>
          <input
            ref={nameInputRef}
            id="mg-app-name"
            type="text"
            className="mg-field-input"
            placeholder="e.g. John & Jane"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />

          <label className="mg-field-label" htmlFor="mg-app-date">
            Event Date
          </label>
          <DatePicker
            value={eventDate}
            onChange={setEventDate}
            placeholder="Pick a date (optional)"
            className="mg-date-picker"
          />

          <p className="mg-modal-help">
            Looking to create an app from a client gallery?{' '}
            <button type="button" className="mg-link-btn" onClick={() => alert('Link a client gallery from the app settings after creation.')}>
              Learn more
            </button>
          </p>

          <div className="mg-modal-actions">
            <button type="button" className="mg-btn-text" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="mg-btn-primary" disabled={!name.trim() || saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAppModal;
