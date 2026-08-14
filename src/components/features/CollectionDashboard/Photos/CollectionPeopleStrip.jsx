import React, { useRef } from 'react';
import { Loader2, Minus, Camera } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { PersonFaceAvatar } from './PersonFaceAvatar';
import { prepareSelfieForRekognition } from '../../../../lib/selfieImageForRekognition';

const VISIBLE_LIMIT = 8;

export function CollectionPeopleStrip({
  people = [],
  activePersonId,
  onSelectPerson,
  onClearPerson,
  analyzing = false,
  loadingPeople = false,
  indexedCount = 0,
  onSelfieSearch,
  onClearSelfie,
  onTogglePersonHidden,
}) {
  const selfieInputRef = useRef(null);

  const visiblePeople = people.filter((person) => !person.isHidden);
  const shown = visiblePeople.slice(0, VISIBLE_LIMIT);
  const overflow = Math.max(0, visiblePeople.length - VISIBLE_LIMIT);

  const handleSelfiePick = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Selfie must be 8 MB or smaller.');
      return;
    }
    try {
      const jpegDataUrl = await prepareSelfieForRekognition(file);
      onSelfieSearch?.(jpegDataUrl);
    } catch (err) {
      alert(err?.message || 'Could not process selfie image.');
    }
  };

  return (
    <section className="cdpw-people" aria-label="People in this delivery">
      <span className="cdpw-people__label">People</span>

      <div className="cdpw-people__strip">
        {loadingPeople ? (
          <span className="cdpw-people__status">
            <Loader2 size={16} className="cdpw-spin" aria-hidden />
            Loading people…
          </span>
        ) : null}

        {!loadingPeople && shown.map((person) => {
          const active = activePersonId === person.id;
          return (
            <div key={person.id} className="cdpw-person">
              <button
                type="button"
                className={cn('cdpw-person__btn', active && 'cdpw-person__btn--active')}
                onClick={() => onSelectPerson?.(person.id)}
                aria-pressed={active}
              >
                <span className="cdpw-person__avatar-wrap">
                  <PersonFaceAvatar
                    imageUrl={person.imageUrl}
                    boundingBox={person.boundingBox}
                    size={56}
                  />
                  <span className="cdpw-person__count">{person.count}</span>
                  {active ? (
                    <span
                      className="cdpw-person__clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearPerson?.();
                      }}
                      aria-label="Clear person filter"
                    >
                      <Minus size={12} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </span>
                <span className="cdpw-person__name">{person.label || '—'}</span>
              </button>
            </div>
          );
        })}

        {!loadingPeople && overflow > 0 ? (
          <button type="button" className="cdpw-person__overflow" aria-label={`${overflow} more people`}>
            +{overflow}
          </button>
        ) : null}

        {!loadingPeople && indexedCount > 0 ? (
          <>
            <button
              type="button"
              className="cdpw-person__selfie"
              title="Find yourself with a selfie"
              onClick={() => selfieInputRef.current?.click()}
            >
              <Camera size={18} aria-hidden />
            </button>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              capture="user"
              className="cdpw-person__selfie-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleSelfiePick(file);
                e.target.value = '';
              }}
            />
          </>
        ) : null}

        {analyzing ? (
          <span className="cdpw-people__status cdpw-people__status--analyzing">
            <Loader2 size={14} className="cdpw-spin" aria-hidden />
            Analyzing
          </span>
        ) : null}
      </div>

      <p className="cdpw-people__hint">
        ranked by prominence · names appear when a guest claims themselves
      </p>
    </section>
  );
}

export default CollectionPeopleStrip;
