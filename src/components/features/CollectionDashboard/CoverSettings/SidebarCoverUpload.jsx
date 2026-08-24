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
 * Cover slot: browse from device or pick from the delivery.
 */
export function SidebarCoverUpload({
  coverUrl,
  coverFocalX = 50,
  coverFocalY = 50,
  isUpdating = false,
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
      aria-label="Set delivery cover. Browse files or select from delivery."
      onClick={handleBrowseClick}
      onKeyDown={handleDropzoneKeyDown}
    >
      <div className="cd-sidebar-cover-drop-icon" aria-hidden>
        {COVER_DROP_ICON}
      </div>
      <p className="cd-sidebar-cover-drop-label">Delivery cover</p>
      {(isUpdating || isDragging) && (
        <p className="cd-sidebar-cover-drop-title">
          {isUpdating ? 'Updating cover…' : 'Drop to set cover'}
        </p>
      )}
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
            From delivery
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
          <img
            src={coverUrl.split('#')[0]}
            alt="Delivery cover"
            draggable={false}
            style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
          />
          <div
            className={cn(
              'cd-sidebar-cover-dropzone cd-sidebar-cover-dropzone--overlay',
              isDragging && 'dragging'
            )}
            aria-hidden
          />
          <div className="cd-sidebar-cover-caption">
            <span className="cd-sidebar-cover-caption__label">Delivery cover</span>
            <div className="cd-sidebar-cover-caption__actions">
              <button
                type="button"
                className="cd-sidebar-cover-caption__change"
                onClick={handleBrowseClick}
                disabled={isUpdating}
              >
                Browse files
              </button>
              <button
                type="button"
                className="cd-sidebar-cover-caption__change"
                onClick={onSelectFromCollection}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating…' : 'Change'}
              </button>
            </div>
          </div>
        </>
      ) : (
        emptyDropzone
      )}
    </div>
  );
}
