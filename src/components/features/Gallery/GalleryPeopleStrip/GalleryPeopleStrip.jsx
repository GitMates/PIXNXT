import React, { useRef } from 'react';
import { ScanFace, Loader2 } from 'lucide-react';
import { PersonFaceAvatar } from '../../CollectionDashboard/Photos/PersonFaceAvatar';
import './GalleryPeopleStrip.css';

export function GalleryPeopleStrip({
  people = [],
  loading = false,
  activePersonId,
  selfieSearching = false,
  selfieMessage,
  isFilterActive,
  onSelectPerson,
  onSelfiePick,
  onClearFilter,
  variant = 'gallery',
}) {
  const selfieInputRef = useRef(null);

  if (!loading && people.length === 0) {
    return null;
  }

  const handleSelfieChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelfiePick?.(file);
    e.target.value = '';
  };

  return (
    <section
      className={`gallery-people-strip gallery-people-strip--${variant}`}
      aria-label="People in this event"
    >
      <div className="gallery-people-strip__intro">
        <ScanFace size={18} strokeWidth={1.5} aria-hidden className="gallery-people-strip__intro-icon" />
        <p className="gallery-people-strip__intro-text">
          People in this event — tap a face to see only their photos
        </p>
      </div>

      {isFilterActive && (
        <div className="gallery-people-strip__filter-bar">
          <span>{selfieMessage || 'Showing photos for selected person'}</span>
          <button type="button" onClick={onClearFilter}>
            Show all
          </button>
        </div>
      )}

      {!isFilterActive && selfieMessage && !selfieSearching && (
        <p className="gallery-people-strip__status gallery-people-strip__status--muted">{selfieMessage}</p>
      )}

      <div className="gallery-people-strip__row" role="list">
        <button
          type="button"
          role="listitem"
          className="gallery-people-strip__find"
          disabled={selfieSearching || loading}
          onClick={() => selfieInputRef.current?.click()}
        >
          <span className="gallery-people-strip__find-circle">
            {selfieSearching ? (
              <Loader2 size={22} className="gallery-people-strip__spin" aria-hidden />
            ) : (
              <ScanFace size={22} strokeWidth={1.5} aria-hidden />
            )}
          </span>
          <span className="gallery-people-strip__find-label">Find my photos</span>
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            capture="user"
            className="gallery-people-strip__file-input"
            onChange={handleSelfieChange}
          />
        </button>

        {loading && people.length === 0 ? (
          <p className="gallery-people-strip__loading">
            <Loader2 size={16} className="gallery-people-strip__spin" /> Loading people…
          </p>
        ) : (
          people.map((person) => (
            <button
              key={person.id}
              type="button"
              role="listitem"
              className={`gallery-people-strip__person${activePersonId === person.id ? ' is-active' : ''}`}
              onClick={() => onSelectPerson?.(person.id)}
            >
              <PersonFaceAvatar
                imageUrl={person.imageUrl}
                boundingBox={person.boundingBox}
                size={64}
                className="gallery-people-strip__avatar"
              />
              <span className="gallery-people-strip__person-name">
                {/^Person \d+$/i.test(String(person.label || ''))
                  ? 'Not named'
                  : person.label || 'Not named'}
              </span>
              <span className="gallery-people-strip__person-meta">
                {person.count} photo{person.count === 1 ? '' : 's'}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
