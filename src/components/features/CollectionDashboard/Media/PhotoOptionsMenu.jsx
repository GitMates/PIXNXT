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
  onToggleHidden,
  onDownloadOriginal,
  onOpen,
  onWhoIsInThis,
  onRemove,
}) {
  if (!photo) return null;

  const hidden = Boolean(photo.is_private);
  const isVideo = isVideoMedia(photo);

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
