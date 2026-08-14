import React from 'react';
import { Loader2, Minus } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { PersonFaceAvatar } from './PersonFaceAvatar';

const VISIBLE_LIMIT = 8;
const AVATAR_SIZE = 60;

function formatPersonCount(count) {
  const value = Number(count) || 0;
  return value.toLocaleString();
}

export function CollectionPeopleStrip({
  people = [],
  activePersonId,
  onSelectPerson,
  onClearPerson,
  analyzing = false,
  loadingPeople = false,
}) {
  const visiblePeople = people.filter((person) => !person.isHidden);
  const shown = visiblePeople.slice(0, VISIBLE_LIMIT);
  const overflow = Math.max(0, visiblePeople.length - VISIBLE_LIMIT);

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

        {!loadingPeople &&
          shown.map((person) => {
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
                      size={AVATAR_SIZE}
                      variant="strip"
                    />
                    <span className="cdpw-person__count">{formatPersonCount(person.count)}</span>
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
          <div className="cdpw-person cdpw-person--overflow-wrap">
            <button type="button" className="cdpw-person__overflow" aria-label={`${overflow} more people`}>
              +{overflow}
            </button>
          </div>
        ) : null}

        {!loadingPeople && analyzing && shown.length === 0 ? (
          <span className="cdpw-people__status cdpw-people__status--analyzing">
            <Loader2 size={14} className="cdpw-spin" aria-hidden />
            Analyzing photos…
          </span>
        ) : null}
      </div>

      <p className="cdpw-people__hint">
        ranked by prominence · names appear when a guest
        <br />
        claims themselves
      </p>
    </section>
  );
}

export default CollectionPeopleStrip;
