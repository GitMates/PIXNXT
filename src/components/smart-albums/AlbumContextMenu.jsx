import React from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuPortalLayout } from '../features/ClientGallery/useContextMenuPortalLayout';

const IconMove = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
    <line x1="19" y1="12" x2="19" y2="5" />
  </svg>
);
const IconDuplicate = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="14" height="14" rx="2" ry="2" />
    <path d="M4 16V4a2 2 0 0 1 2-2h12" />
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export function AlbumContextMenu({ menuRef, anchorEl, variant = 'grid', onMoveTo, onDuplicate, onDelete }) {
  const menuLayout = useContextMenuPortalLayout(anchorEl, variant);

  const run = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  if (!menuLayout) return null;

  return createPortal(
    <div
      className={`cg-ctx-menu cg-ctx-menu--portal ${variant === 'list' ? 'cg-ctx-menu--list' : ''}`}
      ref={menuRef}
      style={{ top: menuLayout.top, left: menuLayout.left }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      <button type="button" className="cg-ctx-item" onClick={run(onMoveTo)}>
        <IconMove />
        Move to
      </button>
      <button type="button" className="cg-ctx-item" onClick={run(onDuplicate)}>
        <IconDuplicate />
        Duplicate
      </button>
      <button type="button" className="cg-ctx-item cg-ctx-item--danger" onClick={run(onDelete)}>
        <IconTrash />
        Delete
      </button>
    </div>,
    document.body
  );
}
