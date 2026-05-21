import React, { useState, useCallback, useRef } from 'react';
import { cn } from '../../../../lib/utils';
import { COVER_IMAGE_ACCEPT } from '../../../../lib/mediaFilePicker';
import { getFileMime, isImageMime } from '../../../../lib/fileMime';
import { isRawImageFile } from '../../../../lib/rawImageFormats';
import {
  getCoverPhotoIdFromDataTransfer,
  isCoverPhotoDrag,
  endCoverPhotoDrag,
} from '../../../../lib/coverPhotoDrag';
import './SidebarCoverUpload.css';

const COVER_DROP_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

function isCoverImageFile(file) {
  if (!file?.size) return false;
  const mime = getFileMime(file);
  return isImageMime(mime) || isRawImageFile(file);
}

/**
 * Cover slot: drag from the active set, browse from device, or pick from the collection.
 */
export function SidebarCoverUpload({
  coverUrl,
  isUpdating = false,
  activeSetName = 'this set',
  onPhotoDrop,
  onSelectFromCollection,
  onCoverFileSelect,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const onDragOver = useCallback(
    (e) => {
      const hasGalleryDrag = isCoverPhotoDrag(e.dataTransfer);
      const hasFiles = e.dataTransfer?.types?.includes('Files');
      if (!hasGalleryDrag && !hasFiles) return;
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
      if (photoId) {
        onPhotoDrop?.(photoId);
        return;
      }

      const file = Array.from(e.dataTransfer?.files || []).find(isCoverImageFile);
      if (file) onCoverFileSelect?.(file);
    },
    [isUpdating, onPhotoDrop, onCoverFileSelect]
  );

  const handleBrowseClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUpdating) return;
      fileInputRef.current?.click();
    },
    [isUpdating]
  );

  const handleSelectFromCollection = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUpdating) onSelectFromCollection?.();
    },
    [isUpdating, onSelectFromCollection]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file && isCoverImageFile(file)) onCoverFileSelect?.(file);
    },
    [onCoverFileSelect]
  );

  const handleDropzoneKeyDown = useCallback(
    (e) => {
      if (isUpdating) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [isUpdating]
  );

  const hasCover = Boolean(coverUrl);

  const dropHandlers = {
    onDragOver,
    onDragLeave,
    onDrop,
  };

  const emptyDropzone = (
    <div
      className={cn(
        'cd-sidebar-cover-dropzone',
        isDragging && 'dragging',
        isUpdating && 'uploading'
      )}
      role="button"
      tabIndex={isUpdating ? -1 : 0}
      aria-label={`Set collection cover. Drag a photo from ${activeSetName}, browse files, or select from collection.`}
      onClick={handleBrowseClick}
      onKeyDown={handleDropzoneKeyDown}
    >
      <div className="cd-sidebar-cover-drop-icon" aria-hidden>
        {COVER_DROP_ICON}
      </div>
      <p className="cd-sidebar-cover-drop-label">Collection cover</p>
      <p className="cd-sidebar-cover-drop-title">
        {isUpdating ? (
          'Updating cover…'
        ) : isDragging ? (
          'Drop to set cover'
        ) : (
          <>
            Drag from <span className="cd-sidebar-cover-set-name">{activeSetName}</span>
          </>
        )}
      </p>
      {!isUpdating && !isDragging && (
        <div className="cd-sidebar-cover-actions">
          <button
            type="button"
            className="cd-sidebar-cover-action-btn"
            onClick={handleBrowseClick}
          >
            Browse files
          </button>
          <button
            type="button"
            className="cd-sidebar-cover-action-btn cd-sidebar-cover-action-btn--secondary"
            onClick={handleSelectFromCollection}
          >
            From collection
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn('cd-cover-image', isDragging && 'dragging-cover')}
      {...dropHandlers}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="cd-cover-file-input"
        accept={COVER_IMAGE_ACCEPT}
        onChange={handleFileInputChange}
        tabIndex={-1}
        aria-hidden
      />

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
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{isUpdating ? 'Updating…' : 'Change cover'}</span>
          </button>
        </>
      ) : (
        emptyDropzone
      )}
    </div>
  );
}
