import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { galleryUiStrings } from '../../../lib/gallery-languages';
import './ClientPhotoOverlays.css';

/** Clamp a fixed popup next to an anchor rect, flipping above when needed. */
function placeNear(rect, w, h, gap = 10) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), Math.max(8, vw - w - 8));
  let top = rect.bottom + gap;
  if (top + h > vh - 8) top = Math.max(8, rect.top - h - gap);
  const above = top < rect.bottom;
  return { left, top, above };
}

function usePopupPosition(anchorRect, w, h) {
  const [pos, setPos] = useState(() => (anchorRect ? placeNear(anchorRect, w, h) : { left: 0, top: 0, above: false }));
  useEffect(() => {
    if (anchorRect) setPos(placeNear(anchorRect, w, h));
  }, [anchorRect, w, h]);
  return pos;
}

function useDismiss(onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const openedAt = Date.now();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    const onDown = (e) => {
      if (Date.now() - openedAt < 280) return;
      if (e.target?.closest?.('[data-client-overlay], .gallery-masonry-action-btn')) return;
      onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, []);
}

/** Per-photo note editor (Pixieset-style bubble popup). */
export function PhotoNotePopup({
  anchorRect,
  initialNote = '',
  saving = false,
  lang = 'English',
  onSave,
  onDelete,
  onClose,
}) {
  const t = galleryUiStrings(lang);
  const [draft, setDraft] = useState(initialNote);
  const pos = usePopupPosition(anchorRect, 300, 240);
  useDismiss(onClose);
  const hasNote = Boolean(String(initialNote || '').trim());

  return createPortal(
    <div data-client-overlay className={`cpo-note${pos.above ? ' cpo-note--above' : ''}`} style={{ left: pos.left, top: pos.top }} role="dialog" aria-label="Photo note">
      <textarea
        className="cpo-note__input"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.notePh}
        rows={5}
        disabled={saving}
      />
      <div className="cpo-note__actions">
        {hasNote ? (
          <button type="button" className="cpo-note__delete" onClick={onDelete} disabled={saving} aria-label="Delete note">
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        ) : (
          <span />
        )}
        <span className="cpo-note__spacer" />
        <button type="button" className="cpo-note__cancel" onClick={onClose} disabled={saving}>
          {t.noteCancel}
        </button>
        <button
          type="button"
          className="cpo-note__save"
          disabled={saving || !draft.trim()}
          onClick={() => onSave(draft.trim())}
        >
          {saving ? t.noteSaving : t.noteSave}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Small menu behind the forward-arrow button: remove / add-to. */
export function PhotoOptionsMenu({ anchorRect, isFavorited, lang = 'English', onRemove, onAddTo, onClose }) {
  const t = galleryUiStrings(lang);
  const pos = usePopupPosition(anchorRect, 210, 110);
  useDismiss(onClose);
  return createPortal(
    <div data-client-overlay className="cpo-menu" style={{ left: pos.left, top: pos.top }} role="menu">
      {isFavorited ? (
        <button type="button" className="cpo-menu__item" onClick={onRemove} role="menuitem">
          <span className="cpo-menu__icon cpo-menu__icon--filled">
            <Heart size={14} strokeWidth={1.75} fill="none" />
          </span>
          {t.menuRemove}
        </button>
      ) : null}
      <button type="button" className="cpo-menu__item" onClick={onAddTo} role="menuitem">
        <Plus size={15} strokeWidth={1.75} />
        {t.menuAddTo}
      </button>
    </div>,
    document.body,
  );
}

/** Add-to-favorites panel: pick a list, toggle membership, create new. */
export function AddToFavoritesPanel({
  photo,
  thumb,
  lists = [],
  memberListIds = [],
  busyListId = null,
  creating = false,
  lang = 'English',
  onToggleList,
  onCreate,
  onClose,
}) {
  const t = galleryUiStrings(lang);
  const [name, setName] = useState('');
  const [naming, setNaming] = useState(false);
  useDismiss(onClose);
  return createPortal(
    <div className="cpo-panel-overlay" onClick={onClose} role="presentation">
      <div
        data-client-overlay
        className="cpo-panel"
        role="dialog"
        aria-label="Add to favorites"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cpo-panel__media">
          {thumb ? <img src={thumb} alt="" /> : null}
        </div>
        <div className="cpo-panel__body">
          <h2 className="cpo-panel__title">{t.addToTitle}</h2>
          <ul className="cpo-panel__lists">
            {lists.map((list) => {
              const member = memberListIds.includes(list.id);
              const busy = busyListId === list.id;
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    className="cpo-panel__list"
                    disabled={busy}
                    onClick={() => onToggleList(list)}
                  >
                    <span className="cpo-panel__thumb">
                      {list.coverUrl ? <img src={list.coverUrl} alt="" /> : null}
                    </span>
                    <span className="cpo-panel__list-copy">
                      <span className="cpo-panel__list-name">{list.name}</span>
                      <span className="cpo-panel__list-count">
                        {t.photosCount(Number(list.photoCount) || 0)}
                      </span>
                    </span>
                    <span className={`cpo-panel__heart${member ? ' is-on' : ''}`} aria-hidden>
                      <Heart size={16} strokeWidth={1.75} fill={member ? 'currentColor' : 'none'} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {naming ? (
            <div className="cpo-panel__create">
              <input
                className="cpo-panel__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.newListPh}
                maxLength={200}
                disabled={creating}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim() && !creating) onCreate(name.trim());
                }}
              />
              <button
                type="button"
                className="cpo-panel__create-btn"
                disabled={creating || !name.trim()}
                onClick={() => onCreate(name.trim())}
              >
                {creating ? t.creatingList : t.createList}
              </button>
            </div>
          ) : (
            <button type="button" className="cpo-panel__new" onClick={() => setNaming(true)}>
              <span className="cpo-panel__new-plus" aria-hidden>
                <Plus size={16} strokeWidth={1.75} />
              </span>
              <span>{String(t.createList || '').replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Bottom toast confirming a saved note (auto-dismisses). */
export function NoteSavedToast({ thumb, lang = 'English', onDone }) {
  const t = galleryUiStrings(lang);
  useEffect(() => {
    const id = window.setTimeout(() => onDone?.(), 2600);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return createPortal(
    <div className="cpo-toast" role="status">
      {thumb ? <img src={thumb} alt="" className="cpo-toast__thumb" /> : null}
      <span>{t.noteSaved}</span>
    </div>,
    document.body,
  );
}

export function NoteBadgeIcon() {
  return <MessageCircle size={13} strokeWidth={1.75} />;
}
