import React from 'react';
import { isVideoMedia } from '../../../../lib/photoDisplayUrl';
import './PhotoOptionsMenu.css';

export function PhotoOptionsMenu({
  photo,
  photographNumber = 1,
  peopleCount = 0,
  isCover = false,
  onToggleStar,
  onUseAsCover,
  onMoveToSet,
  onReplace,
  onRename,
  onCopyFilename,
  onToggleHidden,
  onDownloadOriginal,
  onOpen,
  onWhoIsInThis,
  onRemove,
}) {
  if (!photo) return null;

  const hidden = Boolean(photo.is_private);
  const isVideo = isVideoMedia(photo);
  const filename = photo.filename || photo.original_filename || 'Untitled';

  return (
    <>
      <div className="cd-pom-section">
        <p className="cd-pom-label">Photograph {photographNumber}</p>
        <label className="cd-pom-starred" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={Boolean(photo.is_starred)}
            onChange={() => onToggleStar?.(photo)}
          />
          <span className="cd-pom-starred-copy">
            <span className="cd-pom-starred-title">Starred</span>
            <span className="cd-pom-starred-hint">Your own marker. Your client never sees it.</span>
          </span>
        </label>
      </div>

      <div className="cd-pom-divider" />

      <div className="cd-pom-section">
        <p className="cd-pom-label">{isVideo ? 'This film' : 'This photograph'}</p>
        {isVideo ? (
          <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onOpen?.(photo)}>
            Open
          </button>
        ) : null}
        {!isVideo ? (
          <button type="button" className={`cd-pom-item${isCover ? ' is-active' : ''}`} role="menuitem" onClick={() => onUseAsCover?.(photo)}>
            Use as the delivery cover
          </button>
        ) : null}
        <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onMoveToSet?.(photo)}>
          Move to another set...
        </button>
        {!isVideo ? (
          <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onReplace?.(photo)}>
            Replace image...
          </button>
        ) : null}
        {!isVideo ? (
          <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onRename?.(photo)}>
            Rename...
          </button>
        ) : null}
        <button
          type="button"
          className="cd-pom-item cd-pom-item--split"
          role="menuitem"
          onClick={() => onCopyFilename?.(photo)}
          title={filename}
        >
          <span>Copy filename</span>
          <span className="cd-pom-meta cd-pom-filename" title={filename}>
            {filename.length > 18 ? `${filename.slice(0, 15)}...` : filename}
          </span>
        </button>
        <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onToggleHidden?.(photo)}>
          {hidden ? 'Show to the client' : 'Hide from the client'}
        </button>
        <button type="button" className="cd-pom-item" role="menuitem" onClick={() => onDownloadOriginal?.(photo)}>
          Download the original
        </button>
      </div>

      <div className="cd-pom-divider" />

      <div className="cd-pom-section">
        <p className="cd-pom-label">People</p>
        <button
          type="button"
          className="cd-pom-item cd-pom-item--split"
          role="menuitem"
          onClick={() => onWhoIsInThis?.(photo)}
        >
          <span>Who is in this</span>
          <span className="cd-pom-meta">{peopleCount} found</span>
        </button>
      </div>

      <div className="cd-pom-divider" />

      <button
        type="button"
        className="cd-pom-item cd-pom-item--danger"
        role="menuitem"
        onClick={() => onRemove?.(photo)}
      >
        Remove from the delivery
      </button>
    </>
  );
}
