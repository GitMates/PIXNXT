import React from 'react';
import { createPortal } from 'react-dom';
import '../../pages/mobile-gallery/MobileGallery.css';

const IconUnpublish = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

const IconPublish = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const AppContextMenu = ({ menuRef, anchorEl, isPublished, onTogglePublish, onDelete }) => {
  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const menuWidth = 168;
  let left = rect.right - menuWidth;
  if (left < 12) left = 12;
  if (left + menuWidth > window.innerWidth - 12) {
    left = window.innerWidth - menuWidth - 12;
  }

  const menu = (
    <div
      ref={menuRef}
      className="mg-context-menu mg-context-menu--app"
      style={{ top: rect.bottom + 4, left }}
      role="menu"
    >
      <button
        type="button"
        className="mg-context-item mg-context-item--icon"
        onClick={onTogglePublish}
        role="menuitem"
      >
        {isPublished ? <IconUnpublish /> : <IconPublish />}
        {isPublished ? 'Unpublish' : 'Publish'}
      </button>
      <button
        type="button"
        className="mg-context-item mg-context-item--icon"
        onClick={onDelete}
        role="menuitem"
      >
        <IconTrash />
        Delete App
      </button>
    </div>
  );

  return createPortal(menu, document.body);
};

export default AppContextMenu;
