import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '../../../../lib/utils';
import { COVER_IMAGE_ACCEPT } from '../../../../lib/mediaFilePicker';
import { getFileMime, isImageMime } from '../../../../lib/fileMime';
import { isRawImageFile } from '../../../../lib/rawImageFormats';
import {
  COVER_MIN_WIDTH_PX,
  coverEmptyPrimaryAction,
  isAcceptedCoverDropFile,
  isLowResolutionCover,
} from '../../../../lib/deliveryCoverUpload';
import {
  getCoverPhotoIdFromDataTransfer,
  isCoverPhotoDrag,
  endCoverPhotoDrag,
} from '../../../../lib/coverPhotoDrag';
import './SidebarCoverUpload.css';
import { useAppLanguage } from '../../../../context/AppLanguageContext';

const COVER_HINT_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="26"
    height="26"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M15 8h.01M12.5 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6.5" />
    <path d="m3 16 5-5c.93-.9 2.07-.9 3 0l4 4" />
    <path d="m14 14 1-1c.67-.64 1.45-.82 2.18-.53M16 19h6M19 16v6" />
  </svg>
);

const COVER_DROP_ICON = (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12" />
  </svg>
);

function isCoverImageFile(file) {
  if (!file?.size) return false;
  const mime = getFileMime(file);
  return isImageMime(mime) || isRawImageFile(file);
}

function CoverUploadProgressBar({ progress, active }) {
  if (!active) return null;
  const determinate = typeof progress === 'number' && Number.isFinite(progress);
  const clamped = determinate ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  return (
    <div
      className={cn(
        'cd-sidebar-cover-progress',
        !determinate && 'cd-sidebar-cover-progress--indeterminate'
      )}
      role="progressbar"
      aria-label="Uploading cover"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped ?? undefined}
    >
      <div
        className="cd-sidebar-cover-progress__fill"
        style={determinate ? { width: `${clamped}%` } : undefined}
      />
    </div>
  );
}

function CoverFieldLabel({ title, note }) {
  return (
    <div className="cd-sidebar-cover-field-label">
      <span>{title}</span>
      {note ? <span className="cd-sidebar-cover-field-note">{note}</span> : null}
    </div>
  );
}

/**
 * Sidebar delivery cover — empty dropzone or filled preview with change.
 */
export function SidebarCoverUpload({
  coverUrl,
  coverSource = null,
  coverFocalX = 50,
  coverFocalY = 50,
  isUpdating = false,
  uploadProgress = null,
  photoCount = 0,
  onPhotoDrop,
  onSelectFromCollection,
  onCoverFileSelect,
}) {
  const { t } = useAppLanguage();
  const w = t.workspace;
  const [isDragging, setIsDragging] = useState(false);
  const [probedWidth, setProbedWidth] = useState(null);
  const fileInputRef = useRef(null);
  const hasPhotos = Number(photoCount) > 0;
  const primaryAction = coverEmptyPrimaryAction(photoCount);
  const showProgress = Boolean(isUpdating);
  const hasCover = Boolean(coverUrl);
  const lowRes = isLowResolutionCover(probedWidth);
  const emptyNote = hasCover ? null : 'Auto-picked if left empty';
  const filledNote = lowRes ? 'Low resolution — may look soft on large screens' : null;

  useEffect(() => {
    setProbedWidth(null);
  }, [coverUrl]);

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

      const file = Array.from(e.dataTransfer?.files || []).find(isAcceptedCoverDropFile);
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
      if (isUpdating || !hasPhotos) return;
      onSelectFromCollection?.();
    },
    [isUpdating, hasPhotos, onSelectFromCollection]
  );

  const handleChangeClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUpdating) return;
      if (hasPhotos) onSelectFromCollection?.();
      else fileInputRef.current?.click();
    },
    [isUpdating, hasPhotos, onSelectFromCollection]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file && isCoverImageFile(file)) onCoverFileSelect?.(file);
    },
    [onCoverFileSelect]
  );

  const dropHandlers = {
    onDragOver,
    onDragLeave,
    onDrop,
  };

  const fromDeliveryBtn = (
    <span
      className={cn('cd-sidebar-cover-tip', !hasPhotos && 'cd-sidebar-cover-tip--active')}
      data-tip={hasPhotos ? undefined : 'Upload photos first'}
    >
      <button
        type="button"
        className={cn(
          'cd-sidebar-cover-action-btn',
          primaryAction === 'from-delivery' && 'cd-sidebar-cover-action-btn--primary',
          !hasPhotos && 'cd-sidebar-cover-action-btn--quiet'
        )}
        onClick={handleSelectFromCollection}
        aria-disabled={!hasPhotos}
        disabled={isUpdating || !hasPhotos}
        title={hasPhotos ? undefined : 'Upload photos first'}
      >
        From delivery
      </button>
    </span>
  );

  const uploadBtn = (
    <button
      type="button"
      className={cn(
        'cd-sidebar-cover-action-btn',
        primaryAction === 'upload' && 'cd-sidebar-cover-action-btn--primary'
      )}
      onClick={handleBrowseClick}
      disabled={isUpdating}
    >
      {w.upload}
    </button>
  );

  const emptyDropzone = (
    <>
      <div
        className={cn(
          'cd-sidebar-cover-dropzone',
          isDragging && 'dragging',
          isUpdating && 'uploading'
        )}
      >
        <div className="cd-sidebar-cover-hint">
          <div className="cd-sidebar-cover-drop-icon" aria-hidden>
            {COVER_HINT_ICON}
          </div>
          <p className="cd-sidebar-cover-drop-hint">Drop an image or choose one</p>
          <small className="cd-sidebar-cover-drop-spec">16:9 · min {COVER_MIN_WIDTH_PX}px wide</small>
        </div>
        {isUpdating ? null : isDragging ? null : (
          <div className="cd-sidebar-cover-actions">
            {fromDeliveryBtn}
            {uploadBtn}
          </div>
        )}
        {isDragging ? (
          <div className="cd-sidebar-cover-dropmsg">
            {COVER_DROP_ICON}
            Release to set cover
          </div>
        ) : null}
        <CoverUploadProgressBar progress={uploadProgress} active={showProgress} />
      </div>
      <CoverFieldLabel title={w.deliveryCover} note={emptyNote} />
    </>
  );

  return (
    <div
      className={cn(
        'cd-cover-image',
        !hasCover && 'cd-cover-image--empty',
        isDragging && 'dragging-cover',
        isUpdating && 'cd-cover-image--uploading'
      )}
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
          <div className="cd-sidebar-cover-preview">
            <img
              key={coverUrl.split('#')[0]}
              src={coverUrl.split('#')[0]}
              alt={w.deliveryCover}
              draggable={false}
              style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
              onLoad={(e) => setProbedWidth(e.currentTarget.naturalWidth)}
            />
            {coverSource === 'auto' ? (
              <span className="cd-sidebar-cover-auto-badge">AUTO</span>
            ) : null}
            <div
              className={cn(
                'cd-sidebar-cover-dropzone cd-sidebar-cover-dropzone--overlay',
                isDragging && 'dragging'
              )}
              aria-hidden
            />
            <button
              type="button"
              className="cd-sidebar-cover-change"
              onClick={handleChangeClick}
              disabled={isUpdating}
            >
              Change
            </button>
            <CoverUploadProgressBar progress={uploadProgress} active={showProgress} />
          </div>
          <CoverFieldLabel title={w.deliveryCover} note={filledNote} />
        </>
      ) : (
        emptyDropzone
      )}
    </div>
  );
}
