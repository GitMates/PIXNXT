import React, { useEffect, useRef } from 'react';
import { DatePicker } from '../ui/DatePicker';
import '../../pages/guest-delivery/GuestDelivery.css';

const CreateEventModal = ({ isOpen, onClose, onCreate, saving }) => {
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
    <div className="gd-modal-overlay" onClick={onClose} role="presentation">
      <div className="gd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gd-create-title">
        <h2 id="gd-create-title" className="gd-modal-title">Create Event</h2>
        <form className="gd-modal-form" onSubmit={handleSubmit}>
          <div className="gd-modal-field">
            <label className="gd-field-label" htmlFor="gd-event-name">Event name</label>
            <input
              ref={nameInputRef}
              id="gd-event-name"
              type="text"
              className="gd-field-input"
              placeholder="e.g. Priya & Arjun Wedding"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="gd-modal-field">
            <label className="gd-field-label" htmlFor="gd-event-date">Event date</label>
            <DatePicker
              value={eventDate}
              onChange={setEventDate}
              placeholder="Pick a date (optional)"
              className="gd-date-picker"
              showQuickSearch={false}
            />
          </div>

          <div className="gd-modal-actions">
            <button type="button" className="gd-btn-text" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="gd-primary-btn" disabled={!name.trim() || saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
