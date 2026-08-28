import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './SetOptionsMenu.css';

export function SetOptionsMenu({
  set,
  photoCount = 0,
  visibleSetCount = 0,
  otherSets = [],
  hidden = false,
  inApp = true,
  sizeLabel = '—',
  anchorEl,
  onRename,
  onEditDescription,
  onDuplicate,
  onToggleHidden,
  onMoveAllTo,
  onDownload,
  onToggleInApp,
  onDelete,
  onClose,
}) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: undefined });
  const [moveOpen, setMoveOpen] = useState(false);

  useLayoutEffect(() => {
    if (!anchorEl) return undefined;
    const place = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuW = 320;
      const gutter = 12;
      const menuEl = menuRef.current;
      const naturalH = menuEl?.scrollHeight || menuEl?.offsetHeight || 480;
      const maxH = Math.max(200, window.innerHeight - gutter * 2);
      const menuH = Math.min(naturalH, maxH);
      let left = rect.right + 8;
      if (left + menuW > window.innerWidth - gutter) {
        left = Math.max(gutter, rect.left - menuW - 8);
      }
      let top = rect.top;
      if (top + menuH > window.innerHeight - gutter) {
        top = Math.max(gutter, window.innerHeight - menuH - gutter);
      }
      if (top < gutter) top = gutter;
      setPos({ top, left, maxHeight: naturalH > maxH ? maxH : undefined });
    };
    place();
    // Remeasure after paint so we use the real height, not the estimate.
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorEl, moveOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (anchorEl?.contains?.(e.target)) return;
      onClose?.();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [anchorEl, onClose]);

  const name = set?.name || 'Set';
  const countLabel = `${Number(photoCount) || 0} photo${photoCount === 1 ? '' : 's'}`;
  const otherVisible = Math.max(0, visibleSetCount - (hidden ? 0 : 1));

  return createPortal(
    <div
      ref={menuRef}
      className="cd-set-options"
      role="menu"
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxHeight,
        overflowY: pos.maxHeight ? 'auto' : undefined,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="cd-set-options__kicker">
        {name} · {countLabel}
      </p>

      <button type="button" className="cd-set-options__item" role="menuitem" onClick={onRename}>
        Rename
      </button>
      <button type="button" className="cd-set-options__item" role="menuitem" onClick={onDuplicate}>
        Duplicate
      </button>

      <div className="cd-set-options__rule" />

      <p className="cd-set-options__kicker">What your client sees</p>
      <label className="cd-set-options__check">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => onToggleHidden?.(e.target.checked)}
        />
        <span className="cd-set-options__box" aria-hidden />
        <span className="cd-set-options__check-copy">
          <span className="cd-set-options__check-label">Hidden from the client</span>
          <span className="cd-set-options__hint">
            {hidden
              ? 'This set is hidden in the client gallery.'
              : `Visible in the gallery alongside the other ${otherVisible} set${otherVisible === 1 ? '' : 's'}.`}
          </span>
        </span>
      </label>

      <div className="cd-set-options__rule" />

      <p className="cd-set-options__kicker">Photos</p>
      <button
        type="button"
        className="cd-set-options__item"
        role="menuitem"
        onClick={() => setMoveOpen((open) => !open)}
      >
        Move all photos to...
      </button>
      {moveOpen ? (
        <div className="cd-set-options__sub">
          {otherSets.length === 0 ? (
            <p className="cd-set-options__empty">No other sets to move to.</p>
          ) : (
            otherSets.map((target) => (
              <button
                key={target.id}
                type="button"
                className="cd-set-options__item cd-set-options__item--sub"
                role="menuitem"
                onClick={() => onMoveAllTo?.(target.id)}
              >
                {target.name}
              </button>
            ))
          )}
        </div>
      ) : null}
      <button type="button" className="cd-set-options__item" role="menuitem" onClick={onDownload}>
        <span>Download this set</span>
        <span className="cd-set-options__meta">{sizeLabel}</span>
      </button>

      <div className="cd-set-options__rule" />

      <p className="cd-set-options__kicker">Mobile app</p>
      <label className="cd-set-options__check">
        <input
          type="checkbox"
          checked={inApp}
          onChange={(e) => onToggleInApp?.(e.target.checked)}
        />
        <span className="cd-set-options__box" aria-hidden />
        <span className="cd-set-options__check-copy">
          <span className="cd-set-options__check-label">In the app</span>
          <span className="cd-set-options__hint">
            Downloaded to the phone and viewable with no signal. Turning this off removes it from
            every phone at the next sync.
          </span>
        </span>
      </label>

      {onDelete ? (
        <>
          <div className="cd-set-options__rule" />
          <button
            type="button"
            className="cd-set-options__item cd-set-options__item--danger"
            role="menuitem"
            onClick={onDelete}
          >
            Delete set
          </button>
        </>
      ) : null}
    </div>,
    document.body
  );
}
