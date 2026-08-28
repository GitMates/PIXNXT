import React, { useEffect, useState } from 'react';

export const DEFAULT_ENQUIRY_FIELDS = {
  name: true,
  whatsapp: true,
  eventDate: true,
  eventType: true,
  city: true,
  email: false,
  budget: false,
  anythingElse: true,
};

const TOGGLE_FIELDS = [
  { key: 'eventDate', label: 'Event date' },
  { key: 'eventType', label: 'What the event is' },
  { key: 'city', label: 'City or venue' },
  { key: 'email', label: 'Email address' },
  { key: 'budget', label: 'Budget range' },
  { key: 'anythingElse', label: 'Anything else' },
];

export function normalizeEnquiryFields(raw) {
  const base = { ...DEFAULT_ENQUIRY_FIELDS };
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    name: true,
    whatsapp: true,
  };
}

/**
 * Enquiry form field editor with live preview.
 */
export function EnquiryFormEditorModal({
  open,
  initialFields,
  studioName,
  onClose,
  onSave,
}) {
  const [fields, setFields] = useState(() => normalizeEnquiryFields(initialFields));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFields(normalizeEnquiryFields(initialFields));
    setError('');
  }, [open, initialFields]);

  const setToggle = (key, next) => {
    setFields((prev) => ({ ...prev, [key]: next }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave?.(normalizeEnquiryFields(fields));
      onClose?.();
    } catch (err) {
      console.error('Failed to save enquiry form:', err);
      setError(err?.message || 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const replyName = studioName || 'Your studio';

  return (
    <div className="set-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="set-modal set-modal--enquiry"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-enquiry-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="set-modal__head">
          <h2 id="set-enquiry-title" className="set-modal__title">
            Enquiry form
          </h2>
          <p className="set-modal__desc">
            One section at the foot of your Showcase page, plus an Enquire action in its header that
            scrolls to it. On a phone it becomes a bar fixed to the bottom of the screen.
          </p>
        </div>

        <div className="set-enquiry-layout">
          <div className="set-enquiry-col">
            <span className="settings-section-overline">WHAT YOU ASK FOR</span>
            <ul className="set-enquiry-field-list">
              <li className="set-enquiry-field set-enquiry-field--fixed">
                <span>Name</span>
                <span className="set-enquiry-fixed-label">Always asked</span>
              </li>
              <li className="set-enquiry-field set-enquiry-field--fixed">
                <span>WhatsApp number</span>
                <span className="set-enquiry-fixed-label">Always asked</span>
              </li>
              {TOGGLE_FIELDS.map((item) => (
                <li key={item.key} className="set-enquiry-field">
                  <span>{item.label}</span>
                  <button
                    type="button"
                    className={`settings-toggle ${fields[item.key] ? 'settings-toggle--on' : ''}`}
                    onClick={() => setToggle(item.key, !fields[item.key])}
                    aria-pressed={!!fields[item.key]}
                    aria-label={`${fields[item.key] ? 'Hide' : 'Show'} ${item.label}`}
                  >
                    <span className="settings-toggle-thumb" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="set-modal__muted set-enquiry-help">
              Phone before email, and no email required at all by default. Every field you add loses
              you enquiries — seven is already generous.
            </p>
          </div>

          <div className="set-enquiry-col">
            <span className="settings-section-overline">WHAT A VISITOR SEES</span>
            <div className="set-enquiry-preview">
              <div className="set-enquiry-preview__grid">
                <label className="set-enquiry-preview__field">
                  <span>Your name</span>
                  <input type="text" disabled placeholder="Aditi" />
                </label>
                <label className="set-enquiry-preview__field">
                  <span>WhatsApp number</span>
                  <input type="text" disabled placeholder="+91" />
                </label>
                {fields.eventDate ? (
                  <label className="set-enquiry-preview__field">
                    <span>Event date</span>
                    <input type="text" disabled placeholder="Not sure yet" />
                  </label>
                ) : null}
                {fields.eventType ? (
                  <label className="set-enquiry-preview__field">
                    <span>What is the event?</span>
                    <input type="text" disabled placeholder="Wedding" />
                  </label>
                ) : null}
                {fields.city ? (
                  <label className="set-enquiry-preview__field set-enquiry-preview__field--full">
                    <span>City or venue</span>
                    <input type="text" disabled placeholder="Coimbatore" />
                  </label>
                ) : null}
                {fields.email ? (
                  <label className="set-enquiry-preview__field set-enquiry-preview__field--full">
                    <span>Email address</span>
                    <input type="text" disabled placeholder="you@example.com" />
                  </label>
                ) : null}
                {fields.budget ? (
                  <label className="set-enquiry-preview__field set-enquiry-preview__field--full">
                    <span>Budget range</span>
                    <input type="text" disabled placeholder="Still deciding" />
                  </label>
                ) : null}
                {fields.anythingElse ? (
                  <label className="set-enquiry-preview__field set-enquiry-preview__field--full">
                    <span>Anything else?</span>
                    <textarea disabled rows={3} placeholder="Three functions across two days…" />
                  </label>
                ) : null}
              </div>
              <button type="button" className="set-enquiry-preview__submit" disabled>
                Send enquiry
              </button>
              <p className="set-enquiry-preview__reply">
                {replyName} usually replies within a day.
              </p>
            </div>
          </div>
        </div>

        <div className="set-enquiry-notes">
          <div className="set-enquiry-note set-enquiry-note--info">
            <span className="set-enquiry-note__icon" aria-hidden>
              i
            </span>
            <p>
              Where an enquiry goes: WhatsApp when you have a number set, email when that field is
              on, and a row in People. Bot protection uses a honeypot — no captcha on the form.
            </p>
          </div>
          <div className="set-enquiry-note set-enquiry-note--warn">
            <p>
              <strong>This form is not on your delivery pages, and should not be.</strong> A guest
              already knows you. Showcase is for strangers who found your work.
            </p>
          </div>
        </div>

        {error ? <p className="set-modal__error">{error}</p> : null}

        <div className="set-modal__footer">
          <button type="button" className="settings-pill-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="set-modal__primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save form'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnquiryFormEditorModal;
