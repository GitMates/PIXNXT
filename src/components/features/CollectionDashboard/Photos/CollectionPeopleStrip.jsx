import React, { useRef, useState } from 'react';
import { Camera, Loader2, Minus, RefreshCw, Upload } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { prepareSelfieForRekognition } from '../../../../lib/selfieImageForRekognition';
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
  indexedCount = 0,
  tableMissing = false,
  selfiePreview = '',
  selfieSearching = false,
  selfieMessage = '',
  onSelfieSearch,
  onClearSelfie,
  onReanalyze,
}) {
  const [expanded, setExpanded] = useState(false);
  const selfieInputRef = useRef(null);
  const visiblePeople = people.filter((person) => !person.isHidden);
  const overflow = Math.max(0, visiblePeople.length - VISIBLE_LIMIT);
  const shown = expanded ? visiblePeople : visiblePeople.slice(0, VISIBLE_LIMIT);
  const canSearch = Boolean(onSelfieSearch) && !tableMissing && indexedCount > 0 && !analyzing;

  const handleSelfiePick = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    // Large camera files are fine — prepareSelfieForRekognition resizes/compresses for AWS.
    if (file.size > 40 * 1024 * 1024) {
      alert('Image must be 40 MB or smaller.');
      return;
    }
    try {
      const jpegDataUrl = await prepareSelfieForRekognition(file);
      onSelfieSearch?.(jpegDataUrl);
    } catch (err) {
      alert(err?.message || 'Could not process image.');
    }
  };

  return (
    <section className="cdpw-people" aria-label="People in this delivery">
      <span className="cdpw-people__label">People</span>

      <div className={cn('cdpw-people__strip', expanded && 'cdpw-people__strip--expanded')}>
        {onSelfieSearch ? (
          <div className="cdpw-person cdpw-person--find">
            <button
              type="button"
              className={cn('cdpw-person__btn', 'cdpw-person__btn--find', selfiePreview && 'cdpw-person__btn--find-active')}
              disabled={selfieSearching || analyzing || tableMissing}
              onClick={() => selfieInputRef.current?.click()}
              title={
                tableMissing
                  ? 'Photo AI tables are missing'
                  : indexedCount === 0
                    ? 'Upload photos first — faces are indexed automatically'
                    : selfiePreview
                      ? 'Change selfie'
                      : 'Upload a selfie to find matching photos'
              }
            >
              <span className="cdpw-person__avatar-wrap cdpw-person__avatar-wrap--find">
                {selfieSearching ? (
                  <Loader2 size={22} className="cdpw-spin" aria-hidden />
                ) : selfiePreview ? (
                  <img src={selfiePreview} alt="" className="cdpw-person__selfie-img" />
                ) : (
                  <Camera size={22} strokeWidth={1.5} aria-hidden />
                )}
              </span>
              <span className="cdpw-person__name">
                {selfieSearching ? 'Matching…' : selfiePreview ? 'Your selfie' : 'Upload selfie'}
              </span>
            </button>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              capture="user"
              className="cdpw-people__file-input"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleSelfiePick(file);
                e.target.value = '';
              }}
            />
            {selfiePreview && !selfieSearching ? (
              <button
                type="button"
                className="cdpw-person__find-clear"
                onClick={onClearSelfie}
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}

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

        {!loadingPeople && overflow > 0 && !expanded ? (
          <div className="cdpw-person cdpw-person--overflow-wrap">
            <button
              type="button"
              className="cdpw-person__overflow"
              aria-label={`Show ${overflow} more people`}
              onClick={() => setExpanded(true)}
            >
              +{overflow}
            </button>
          </div>
        ) : null}

        {!loadingPeople && expanded && overflow > 0 ? (
          <div className="cdpw-person cdpw-person--overflow-wrap">
            <button
              type="button"
              className="cdpw-person__overflow cdpw-person__overflow--collapse"
              aria-label="Show fewer people"
              onClick={() => setExpanded(false)}
            >
              Less
            </button>
          </div>
        ) : null}

        {onReanalyze ? (
          <div className="cdpw-person cdpw-person--overflow-wrap">
            <button
              type="button"
              className="cdpw-person__overflow cdpw-person__overflow--reanalyze"
              aria-label="Re-analyze faces in this delivery"
              disabled={analyzing || tableMissing}
              title="Index faces again"
              onClick={() => onReanalyze?.()}
            >
              {analyzing ? <Loader2 size={16} className="cdpw-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        ) : null}

        {!loadingPeople && analyzing && shown.length === 0 ? (
          <span className="cdpw-people__status cdpw-people__status--analyzing">
            <Loader2 size={14} className="cdpw-spin" aria-hidden />
            Analyzing photos…
          </span>
        ) : null}

        {!loadingPeople && !analyzing && shown.length === 0 && !selfiePreview ? (
          <span className="cdpw-people__status">
            {tableMissing
              ? 'Photo AI tables missing — run migrations'
              : indexedCount === 0
                ? 'Upload photos — faces are indexed automatically'
                : 'No people found yet'}
          </span>
        ) : null}

        {!loadingPeople && analyzing && shown.length > 0 ? (
          <span className="cdpw-people__status cdpw-people__status--analyzing">
            <Loader2 size={14} className="cdpw-spin" aria-hidden />
            Updating…
          </span>
        ) : null}
      </div>

      <div className="cdpw-people__side">
        <p className="cdpw-people__hint">
          ranked by prominence · names appear when a guest
          <br />
          claims themselves
        </p>
        {selfieSearching ? (
          <p className="cdpw-people__selfie-status">
            <Loader2 size={12} className="cdpw-spin" aria-hidden /> Matching your face…
          </p>
        ) : null}
        {!selfieSearching && selfieMessage ? (
          <p
            className={cn(
              'cdpw-people__selfie-status',
              /no matching/i.test(selfieMessage) && 'cdpw-people__selfie-status--muted'
            )}
          >
            {selfieMessage}
          </p>
        ) : null}
        {!canSearch && !tableMissing && indexedCount === 0 && onSelfieSearch ? (
          <p className="cdpw-people__selfie-status cdpw-people__selfie-status--muted">
            <Upload size={12} aria-hidden /> Add media to index faces
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default CollectionPeopleStrip;
