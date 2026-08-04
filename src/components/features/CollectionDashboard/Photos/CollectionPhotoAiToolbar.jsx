import React, { useEffect, useRef } from 'react';
import { Users, Loader2, Camera, Upload, Eye, EyeOff } from 'lucide-react';
import { PersonFaceAvatar } from './PersonFaceAvatar';
import { prepareSelfieForRekognition } from '../../../../lib/selfieImageForRekognition';
import './CollectionPhotoAiToolbar.css';

export function CollectionPhotoAiToolbar({
  showPeople,
  onTogglePeople,
  people = [],
  activePersonId,
  onSelectPerson,
  onClearPerson,
  analyzing = false,
  loadingPeople,
  indexedCount = 0,
  tableMissing = false,
  selfiePreview,
  selfieSearching,
  selfieMessage,
  onSelfieSearch,
  onClearSelfie,
  onTogglePersonHidden,
  onClosePanels,
}) {
  const toolbarRef = useRef(null);
  const selfieInputRef = useRef(null);

  useEffect(() => {
    if (!showPeople) return;

    const handleClickOutside = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        onClosePanels?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPeople, onClosePanels]);

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

  const peopleSummary = (() => {
    if (analyzing) return 'Analyzing photos automatically…';
    const visibleCount = people.filter((person) => !person.isHidden).length;
    if (indexedCount > 0 && people.length > 0) {
      const hiddenCount = people.length - visibleCount;
      const base = `${visibleCount} visible to clients across ${indexedCount} photos`;
      return hiddenCount > 0 ? `${base} (${hiddenCount} hidden)` : base;
    }
    if (indexedCount > 0) {
      return `Analyzed ${indexedCount} photos — no faces detected yet`;
    }
    return 'People are detected automatically when photos are uploaded.';
  })();

  return (
    <div className="cd-photo-ai-toolbar" ref={toolbarRef}>
      <div className="cd-photo-ai-actions">
        <button
          type="button"
          className={`cd-icon-btn cd-photo-ai-btn${showPeople ? ' active' : ''}`}
          title="People"
          aria-label="People"
          aria-pressed={showPeople}
          onClick={onTogglePeople}
        >
          <Users size={18} strokeWidth={1.5} />
        </button>
      </div>

      {showPeople && (
        <div className="cd-photo-ai-people-panel cd-photo-ai-people-panel--wide">
          {tableMissing && (
            <div className="cd-photo-ai-setup-banner" role="alert">
              <strong>One-time setup needed</strong>
              <p>
                The <code>photo_ai_metadata</code> and <code>photo_ai_people</code> tables are missing in Supabase.
                Run the SQL migrations once, then refresh this page.
              </p>
            </div>
          )}

          <div className="cd-photo-ai-people-head">
            <div>
              <h3>People</h3>
              <p>{peopleSummary}</p>
            </div>
            {analyzing && (
              <span className="cd-photo-ai-analyzing-badge" aria-live="polite">
                <Loader2 size={14} className="cd-photo-ai-spin" />
                Analyzing
              </span>
            )}
          </div>

          <div className="cd-photo-ai-selfie-section">
            <p className="cd-photo-ai-selfie-label">Find yourself in this gallery</p>
            <div className="cd-photo-ai-selfie-row">
              {selfiePreview ? (
                <span className="cd-photo-ai-selfie-preview">
                  <img src={selfiePreview} alt="Your selfie preview" />
                </span>
              ) : (
                <span className="cd-photo-ai-selfie-preview cd-photo-ai-selfie-preview--empty">
                  <Camera size={22} />
                </span>
              )}
              <div className="cd-photo-ai-selfie-actions">
                <button
                  type="button"
                  className="cd-photo-ai-selfie-btn"
                  disabled={selfieSearching || analyzing || tableMissing || indexedCount === 0}
                  onClick={() => selfieInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {selfiePreview ? 'Change selfie' : 'Upload selfie'}
                </button>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  capture="user"
                  className="cd-photo-ai-selfie-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleSelfiePick(file);
                    e.target.value = '';
                  }}
                />
                {selfiePreview && (
                  <button
                    type="button"
                    className="cd-photo-ai-selfie-clear"
                    onClick={onClearSelfie}
                    disabled={selfieSearching}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {selfieSearching && (
              <p className="cd-photo-ai-selfie-status">
                <Loader2 size={14} className="cd-photo-ai-spin" /> Matching your face…
              </p>
            )}
            {!selfieSearching && selfieMessage && (
              <p className={`cd-photo-ai-selfie-status${selfieMessage.includes('No matching') ? ' cd-photo-ai-selfie-status--muted' : ''}`}>
                {selfieMessage}
              </p>
            )}
          </div>

          {activePersonId && (
            <div className="cd-photo-ai-active-filter">
              <span>Showing photos for selected person</span>
              <button type="button" onClick={onClearPerson}>
                Clear
              </button>
            </div>
          )}

          {loadingPeople ? (
            <p className="cd-photo-ai-people-empty">
              <Loader2 size={16} className="cd-photo-ai-spin" /> Loading people…
            </p>
          ) : people.length > 0 ? (
            <div className="cd-photo-ai-people-circles">
              {people.map((person) => (
                <div
                  key={person.id}
                  className={`cd-photo-ai-person-wrap${person.isHidden ? ' cd-photo-ai-person-wrap--hidden' : ''}`}
                >
                  <button
                    type="button"
                    className={`cd-photo-ai-person-circle${activePersonId === person.id ? ' active' : ''}`}
                    onClick={() => onSelectPerson(person.id)}
                  >
                    <PersonFaceAvatar
                      imageUrl={person.imageUrl}
                      boundingBox={person.boundingBox}
                      size={72}
                    />
                    <span className="cd-photo-ai-person-name">{person.label}</span>
                    <span className="cd-photo-ai-person-count">
                      {person.count} photo{person.count === 1 ? '' : 's'}
                    </span>
                    {person.isHidden ? (
                      <span className="cd-photo-ai-person-hidden-label">Hidden from clients</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="cd-photo-ai-person-visibility"
                    title={person.isHidden ? 'Show on client gallery' : 'Hide from client gallery'}
                    aria-label={person.isHidden ? `Show ${person.label} on client gallery` : `Hide ${person.label} from client gallery`}
                    onClick={() => onTogglePersonHidden?.(person.id, !person.isHidden)}
                  >
                    {person.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="cd-photo-ai-people-empty">
              {tableMissing
                ? 'After you run the SQL migrations in Supabase, upload photos to detect people automatically.'
                : analyzing
                  ? 'Detecting faces in your photos…'
                  : 'No people detected yet. Upload photos to this delivery and faces will be grouped automatically.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
