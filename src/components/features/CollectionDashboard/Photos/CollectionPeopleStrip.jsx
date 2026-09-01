import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { AppSpinner } from '../../../ui/AppLoading';
import { cn } from '../../../../lib/utils';
import { displayPersonLabel } from '../../../../lib/photoAiSearch';
import { prepareSelfieForRekognition } from '../../../../lib/selfieImageForRekognition';
import { PersonFaceAvatar } from './PersonFaceAvatar';
import { PersonLabelEditor } from './PersonLabelEditor';

const VISIBLE_LIMIT = 8;
const AVATAR_SIZE = 60;

function formatPersonCount(count) {
  const value = Number(count) || 0;
  return value.toLocaleString();
}

function IndexingFacesStatus() {
  return (
    <span className="cdpw-people__status cdpw-people__status--analyzing" role="status" aria-live="polite">
      <AppSpinner size="sm" label="Indexing faces" />
      <span className="cdpw-people__status-copy">
        Indexing faces
        <span className="cdpw-people__status-dots" aria-hidden>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </span>
  );
}

function PersonDeletePopover({ anchorRef, person, deleting, onCancel, onConfirm }) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition, person?.id]);

  if (!person || !position || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="cdpw-person-delete-popover cdpw-person-delete-popover--portal"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`cdpw-person-delete-${person.id}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="cdpw-person-delete-popover__label">Remove person</span>
      <p id={`cdpw-person-delete-${person.id}`} className="cdpw-person-delete-popover__body">
        <strong>{displayPersonLabel(person.label)}</strong> will be hidden from this delivery. Their
        photos stay in the gallery.
      </p>
      <div className="cdpw-person-delete-popover__actions">
        <button
          type="button"
          className="cdpw-person-delete-popover__cancel"
          disabled={deleting}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cdpw-person-delete-popover__confirm"
          disabled={deleting}
          onClick={() => void onConfirm()}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>,
    document.body
  );
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
  onRenamePerson,
  onDeletePerson,
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const selfieInputRef = useRef(null);
  const deleteAnchorRef = useRef(null);
  const visiblePeople = people.filter((person) => !person.isHidden);
  const overflow = Math.max(0, visiblePeople.length - VISIBLE_LIMIT);
  const shown = expanded ? visiblePeople : visiblePeople.slice(0, VISIBLE_LIMIT);
  const canSearch = Boolean(onSelfieSearch) && !tableMissing && indexedCount > 0 && !analyzing;

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await onDeletePerson?.(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      alert(err?.message || 'Could not remove this person.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!deleteTarget) return undefined;
    const handlePointer = (event) => {
      if (
        event.target.closest('.cdpw-person-delete-popover') ||
        event.target.closest('.cdpw-person__remove')
      ) {
        return;
      }
      if (!deleting) setDeleteTarget(null);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape' && !deleting) setDeleteTarget(null);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [deleteTarget, deleting]);

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
                  <AppSpinner size="sm" label="Matching selfie" />
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
          <span className="cdpw-people__status cdpw-people__status--loading" role="status" aria-live="polite">
            <AppSpinner size="sm" label="Loading people" />
            <span className="cdpw-people__status-copy">Loading people…</span>
          </span>
        ) : null}

        {!loadingPeople &&
          shown.map((person) => {
            const active = activePersonId === person.id;
            const isDeleteTarget = deleteTarget?.id === person.id;
            return (
              <div key={person.id} className="cdpw-person">
                <button
                  type="button"
                  className={cn('cdpw-person__btn', active && 'cdpw-person__btn--active')}
                  onClick={() => onSelectPerson?.(person.id)}
                  aria-pressed={active}
                >
                  <span
                    ref={isDeleteTarget ? deleteAnchorRef : null}
                    className="cdpw-person__avatar-wrap"
                  >
                    <PersonFaceAvatar
                      imageUrl={person.imageUrl}
                      boundingBox={person.boundingBox}
                      avatarSource={person.avatarSource}
                      size={AVATAR_SIZE}
                      variant="strip"
                    />
                    <span className="cdpw-person__count">{formatPersonCount(person.count)}</span>
                    {active && onDeletePerson ? (
                      <span
                        className="cdpw-person__remove"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget((current) =>
                            current?.id === person.id ? null : person
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTarget((current) =>
                              current?.id === person.id ? null : person
                            );
                          }
                        }}
                        aria-label={`Remove ${displayPersonLabel(person.label)}`}
                        aria-expanded={isDeleteTarget}
                      >
                        <X size={12} strokeWidth={2.25} />
                      </span>
                    ) : null}
                  </span>
                  <PersonLabelEditor
                    className="cdpw-person__name"
                    label={person.label}
                    editable={Boolean(onRenamePerson)}
                    onSave={(name) => onRenamePerson?.(person.id, name)}
                  />
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
              {analyzing ? (
                <RefreshCw size={16} className="cdpw-person__overflow-icon--busy" aria-hidden />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </button>
          </div>
        ) : null}

        {!loadingPeople && analyzing ? <IndexingFacesStatus /> : null}

        {!loadingPeople && !analyzing && shown.length === 0 && !selfiePreview ? (
          <span className="cdpw-people__status">
            {tableMissing
              ? 'Photo AI tables missing — run migrations'
              : indexedCount === 0
                ? 'Upload photos — faces are indexed automatically'
                : 'No people found yet'}
          </span>
        ) : null}
      </div>

      <div className="cdpw-people__side">
        {selfieSearching ? (
          <p className="cdpw-people__selfie-status">
            <AppSpinner size="xs" label="Matching your face" /> Matching your face…
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

      {deleteTarget ? (
        <PersonDeletePopover
          anchorRef={deleteAnchorRef}
          person={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </section>
  );
}

export default CollectionPeopleStrip;
