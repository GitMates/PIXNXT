import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChangeCoverModalProps, CoverFocalPoint, CoverFocalSurfaceId, CoverFocals, Photo } from './ChangeCoverModal.types';
import { cn } from '../../../../lib/utils';
import { isGalleryImagePhoto } from '../../../../lib/coverPhotoDrag';
import { getPhotoFullDisplayUrl } from '../../../../lib/photoDisplayUrl';
import {
  COVER_FOCAL_SURFACE_IDS,
  COVER_FOCAL_SURFACES,
  focalPercentToElementStyle,
  focalPointFromPointer,
  getDefaultCoverFocals,
  parseFocalPoint,
  stripMediaUrlHash,
} from '../../../../lib/focalPoint';
import './ChangeCoverModal.css';

function cloneFocals(focals?: CoverFocals | null): CoverFocals {
  const base = getDefaultCoverFocals(
    parseFocalPoint(focals?.desktop) || parseFocalPoint(focals?.website) || { x: 50, y: 50 }
  );
  if (!focals) return base as CoverFocals;
  for (const surface of COVER_FOCAL_SURFACES) {
    const point = parseFocalPoint(focals[surface.id as CoverFocalSurfaceId]);
    if (point) base[surface.id] = point;
  }
  if (parseFocalPoint(focals.website)) base.website = focals.website;
  if (parseFocalPoint(focals.desktop)) base.desktop = focals.desktop;
  return base as CoverFocals;
}

function photoMatchesCover(photo: Photo, coverUrl?: string | null, coverPhotoId?: string | null) {
  if (coverPhotoId && String(photo.id) === String(coverPhotoId)) return true;
  if (!coverUrl) return false;
  const a = stripMediaUrlHash(coverUrl);
  const candidates = [photo.full_url, photo.web_url, photo.thumbnail_url, getPhotoFullDisplayUrl(photo)]
    .filter(Boolean)
    .map((url) => stripMediaUrlHash(String(url)));
  return candidates.some((url) => url && (url === a || a.endsWith(url) || url.endsWith(a)));
}

function sourceMeta(
  photo: Photo | null | undefined,
  photos: Photo[],
  sets: { id: string; name: string }[],
  highlightsName: string
) {
  if (!photo) {
    return { setName: highlightsName || 'this delivery', index: 1 };
  }
  const inSet = photos.filter((p) =>
    isGalleryImagePhoto(p) && (photo.set_id ? p.set_id === photo.set_id : !p.set_id)
  );
  const found = inSet.findIndex((p) => String(p.id) === String(photo.id));
  const index = found >= 0 ? found + 1 : 1;
  const setName = photo.set_id
    ? sets.find((s) => s.id === photo.set_id)?.name || 'Set'
    : highlightsName || 'Highlights';
  return { setName, index };
}

export const ChangeCoverModal: React.FC<ChangeCoverModalProps> = ({
  isOpen,
  onClose,
  photos,
  coverUrl,
  coverPhoto,
  initialFocals,
  initialView = 'edit',
  sets = [],
  highlightsName = 'Highlights',
  onConfirm,
  saving = false,
}) => {
  const [view, setView] = useState<'pick' | 'edit'>(initialView);
  const [draftPhoto, setDraftPhoto] = useState<Photo | null>(coverPhoto || null);
  const [focals, setFocals] = useState<CoverFocals>(() => cloneFocals(initialFocals));
  const [activeSurface, setActiveSurface] = useState<CoverFocalSurfaceId>('desktop');
  const [dragging, setDragging] = useState(false);
  const [crosshairStyle, setCrosshairStyle] = useState({ left: '50%', top: '50%' });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const imagePhotos = useMemo(() => photos.filter(isGalleryImagePhoto), [photos]);

  const resolvedPhoto = useMemo(() => {
    if (draftPhoto) return draftPhoto;
    if (coverPhoto) return coverPhoto;
    return imagePhotos.find((p) => photoMatchesCover(p, coverUrl, coverPhoto?.id)) || null;
  }, [draftPhoto, coverPhoto, imagePhotos, coverUrl]);

  const editorSrc = stripMediaUrlHash(
    (resolvedPhoto && (getPhotoFullDisplayUrl(resolvedPhoto) || resolvedPhoto.full_url || resolvedPhoto.web_url)) ||
      coverUrl ||
      ''
  );

  const source = sourceMeta(resolvedPhoto, imagePhotos, sets, highlightsName);
  const activePoint: CoverFocalPoint = focals[activeSurface] || focals.desktop || focals.website || { x: 50, y: 50 };

  const syncCrosshair = useCallback((x: number, y: number) => {
    const img = imageRef.current;
    if (!img) {
      setCrosshairStyle({ left: `${x}%`, top: `${y}%` });
      return;
    }
    setCrosshairStyle(focalPercentToElementStyle(x, y, img));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const hasCover = Boolean(coverUrl || coverPhoto);
    setView(initialView === 'pick' || !hasCover ? 'pick' : 'edit');
    setDraftPhoto(coverPhoto || null);
    setFocals(cloneFocals(initialFocals));
    setActiveSurface('desktop');
    // Re-init only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || view !== 'edit') return;
    syncCrosshair(activePoint.x, activePoint.y);
  }, [isOpen, view, activeSurface, activePoint.x, activePoint.y, syncCrosshair, editorSrc]);

  const setActivePoint = useCallback((x: number, y: number) => {
    setFocals((prev) => {
      const current = prev[activeSurface] || { x: 50, y: 50 };
      const next = { ...prev };
      for (const id of COVER_FOCAL_SURFACE_IDS) {
        const point = prev[id as CoverFocalSurfaceId] || current;
        const linked =
          Math.abs(point.x - current.x) < 0.2 && Math.abs(point.y - current.y) < 0.2;
        if (id === activeSurface || linked) {
          next[id as CoverFocalSurfaceId] = { x, y };
        }
      }
      return next;
    });
    syncCrosshair(x, y);
  }, [activeSurface, syncCrosshair]);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const img = imageRef.current;
    if (!img) return;
    const { x, y } = focalPointFromPointer(clientX, clientY, img);
    setActivePoint(x, y);
  }, [setActivePoint]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  }, [updateFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updateFromPointer(e.clientX, e.clientY);
  }, [dragging, updateFromPointer]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handlePickPhoto = (photo: Photo) => {
    const same = resolvedPhoto && String(resolvedPhoto.id) === String(photo.id);
    setDraftPhoto(photo);
    if (!same) setFocals(getDefaultCoverFocals() as CoverFocals);
    setActiveSurface('desktop');
    setView('edit');
  };

  const handleCentre = () => {
    setActivePoint(50, 50);
  };

  const handleUseCover = () => {
    if (!editorSrc) {
      setView('pick');
      return;
    }
    void onConfirm({ photo: resolvedPhoto, focals });
  };

  if (!isOpen) return null;

  const across = Math.round(activePoint.x);
  const down = Math.round(activePoint.y);

  return (
    <div className="cover-modal-overlay" onClick={onClose}>
      <div
        className={cn('cover-modal-container', view === 'edit' ? 'cover-modal-container--focal' : 'wide')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-focal-header">
          <div className="cover-focal-header-text">
            <h3 className="cover-focal-title">Delivery cover</h3>
            <p className="cover-focal-subtitle">
              {view === 'pick'
                ? 'Choose the photograph to use as this delivery’s cover.'
                : 'Pick the photograph, then drag the point onto the part that must never be cut off.'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {view === 'pick' ? (
          <div className="cover-modal-content">
            <div className="modal-collection-view">
              <div className="photo-grid-scroll">
                {imagePhotos.length === 0 ? (
                  <div className="empty-collection-state">
                    <p>No photos in this delivery yet. Add media to a set first.</p>
                  </div>
                ) : (
                  <div className="photo-selection-grid">
                    {imagePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="photo-grid-item"
                        onClick={() => handlePickPhoto(photo)}
                      >
                        <img src={photo.thumbnail_url || photo.full_url || undefined} alt={photo.filename} />
                        <div className="photo-overlay">
                          <button type="button" className="use-photo-btn">Use as Cover</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="cover-focal-body">
              <div className="cover-focal-editor">
                <div className="cover-focal-editor-meta">
                  <p className="cover-focal-source">
                    From <strong>{source.setName}</strong> · photograph {source.index}
                  </p>
                  <button
                    type="button"
                    className="cover-focal-change-photo"
                    onClick={() => setView('pick')}
                  >
                    Choose a different photograph
                  </button>
                </div>

                <div
                  className={cn('cover-focal-stage', dragging && 'is-dragging')}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {editorSrc ? (
                    <img
                      ref={imageRef}
                      src={editorSrc}
                      alt=""
                      draggable={false}
                      onLoad={() => syncCrosshair(activePoint.x, activePoint.y)}
                    />
                  ) : (
                    <div className="cover-focal-empty">No cover photograph yet</div>
                  )}
                  <div className="cover-focal-grid" aria-hidden />
                  {editorSrc ? (
                    <div className="cover-focal-crosshair" style={crosshairStyle}>
                      <span className="cover-focal-crosshair__ring" />
                    </div>
                  ) : null}
                </div>

                <p className="cover-focal-help">
                  {COVER_FOCAL_SURFACES.find((s) => s.id === activeSurface)?.hint ||
                    'Every place this photograph appears is a different shape. The point you set here is the one thing the crop is guaranteed to keep — put it on the faces.'}{' '}
                  Currently{' '}
                  <strong>{across}% across, {down}% down.</strong>
                </p>
              </div>

              <div className="cover-focal-previews">
                {COVER_FOCAL_SURFACES.map((surface) => {
                  const point = focals[surface.id as CoverFocalSurfaceId] || { x: 50, y: 50 };
                  return (
                    <button
                      key={surface.id}
                      type="button"
                      className={cn(
                        'cover-focal-preview',
                        `cover-focal-preview--${surface.id}`,
                        activeSurface === surface.id && 'is-active'
                      )}
                      onClick={() => setActiveSurface(surface.id as CoverFocalSurfaceId)}
                    >
                      <span className="cover-focal-preview__label">{surface.kicker}</span>
                      <span
                        className="cover-focal-preview__frame"
                        style={{ aspectRatio: surface.aspect }}
                      >
                        {editorSrc ? (
                          <img
                            src={editorSrc}
                            alt=""
                            draggable={false}
                            style={{ objectPosition: `${point.x}% ${point.y}%` }}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="cover-focal-footer">
              <p className="cover-focal-note">
                Nothing is re-uploaded — the point is stored with the delivery and applied everywhere.
              </p>
              <div className="cover-focal-actions">
                <button type="button" className="cover-focal-btn" onClick={handleCentre} disabled={saving}>
                  Centre it
                </button>
                <button type="button" className="cover-focal-btn" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="cover-focal-btn cover-focal-btn--primary"
                  onClick={handleUseCover}
                  disabled={saving || !editorSrc}
                >
                  {saving ? 'Saving…' : 'Use this cover'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
