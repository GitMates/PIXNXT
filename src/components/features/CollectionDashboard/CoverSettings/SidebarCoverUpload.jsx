import React, { useState, useCallback } from 'react';
import { cn } from '../../../../lib/utils';
import {
  getCoverPhotoIdFromDataTransfer,
  isCoverPhotoDrag,
  endCoverPhotoDrag,
} from '../../../../lib/coverPhotoDrag';
import './SidebarCoverUpload.css';

const COVER_DROP_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden
  >
    <rect
      x="6"
      y="6"
      width="28"
      height="28"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeDasharray="3 3"
    />
    <path
      d="M20 14v10M15 19l5-5 5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Cover slot: drag a photo from the active set, or click to pick from the collection.
 */
export function SidebarCoverUpload({
  coverUrl,
  isUpdating = false,
  activeSetName = 'this set',
  onPhotoDrop,
  onSelectFromCollection,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback(
    (e) => {
      if (!isCoverPhotoDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isUpdating) setIsDragging(true);
    },
    [isUpdating]
  );

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      endCoverPhotoDrag();
      if (isUpdating) return;

      const photoId = getCoverPhotoIdFromDataTransfer(e.dataTransfer);
      if (photoId) onPhotoDrop?.(photoId);
    },
    [isUpdating, onPhotoDrop]
  );

  const hasCover = Boolean(coverUrl);

  const dropHandlers = {
    onDragOver,
    onDragLeave,
    onDrop,
  };

  return (
    <div
      className={cn('cd-cover-image', isDragging && 'dragging-cover')}
      {...dropHandlers}
    >
      {hasCover ? (
        <>
          <img src={coverUrl.split('#')[0]} alt="Collection cover" draggable={false} />
          <div
            className={cn(
              'cd-sidebar-cover-dropzone cd-sidebar-cover-dropzone--overlay',
              isDragging && 'dragging'
            )}
            aria-hidden
          />
          <button
            type="button"
            className="cd-cover-hover-overlay"
            onClick={onSelectFromCollection}
            disabled={isUpdating}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{isUpdating ? 'Updating…' : 'Change Cover'}</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className={cn(
            'cd-sidebar-cover-dropzone',
            isDragging && 'dragging',
            isUpdating && 'uploading'
          )}
          onClick={onSelectFromCollection}
          disabled={isUpdating}
        >
          <div className="cd-sidebar-cover-drop-icon">{COVER_DROP_ICON}</div>
          <p className="cd-sidebar-cover-drop-title">
            {isUpdating ? 'Updating cover…' : `Drag a photo from ${activeSetName}`}
          </p>
          <p className="cd-sidebar-cover-drop-hint">or select from collection</p>
        </button>
      )}
    </div>
  );
}
