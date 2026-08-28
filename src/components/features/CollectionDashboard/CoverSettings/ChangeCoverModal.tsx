import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChangeCoverModalProps, CoverFocalPoint, CoverFocalSurfaceId, CoverFocals, Photo } from './ChangeCoverModal.types';
import { cn } from '../../../../lib/utils';
import { isGalleryImagePhoto } from '../../../../lib/coverPhotoDrag';
import { getPhotoFullDisplayUrl, getPhotoGridDisplayUrl } from '../../../../lib/photoDisplayUrl';
import { COVER_IMAGE_ACCEPT } from '../../../../lib/mediaFilePicker';
import {
  COVER_FOCAL_SURFACE_IDS,
  COVER_FOCAL_SURFACES,
  computeCoverCropPercentRect,
  focalPercentToElementStyle,
  focalPointFromPointer,
  getDefaultCoverFocals,
  parseFocalPoint,
  stripMediaUrlHash,
} from '../../../../lib/focalPoint';
import './ChangeCoverModal.css';

const APPEARS_SHORT_LABEL: Record<string, string> = {
  desktop: 'Desktop',
  email: 'Email',
  phone: 'Phone',
  card: 'Icon',
};

/** Preview tiles: fixed height; width follows surface ratio. */
const PREVIEW_TILE_HEIGHT = 76;
const STAGE_MAX_WIDTH = 560;
const STAGE_MAX_HEIGHT = 340;
const MODAL_VIEWPORT_RATIO = 0.94;
const FOOTER_CHROME_MIN = 190;

function computeStageDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  availableWidth = STAGE_MAX_WIDTH,
  maxHeight = STAGE_MAX_HEIGHT
) {
  const maxW = Math.min(STAGE_MAX_WIDTH, Math.max(120, availableWidth));
  const maxH = Math.max(120, maxHeight);
  if (!naturalWidth || !naturalHeight) {
    return { width: maxW, height: Math.min(maxH, Math.round(maxW * (10 / 16))) };
  }
  const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

function estimateStageMaxHeight() {
  if (typeof window === 'undefined') return STAGE_MAX_HEIGHT;
  return Math.max(
    120,
    Math.min(STAGE_MAX_HEIGHT, Math.round(window.innerHeight * MODAL_VIEWPORT_RATIO) - 400)
  );
}

function parseAspectRatio(aspect: string): number {
  const [rawW, rawH] = String(aspect).split('/');
  const w = parseFloat(rawW);
  const h = parseFloat(rawH);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return 1;
  return w / h;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

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

export const ChangeCoverModal: React.FC<ChangeCoverModalProps> = ({
  isOpen,
  onClose,
  photos,
  coverUrl,
  coverPhoto,
  initialFocals,
  initialView = 'edit',
  onConfirm,
  onDraftChange,
  onRemove,
  saving = false,
  onCoverFileSelect,
}) => {
  const [view, setView] = useState<'pick' | 'edit'>(initialView);
  const [draftPhoto, setDraftPhoto] = useState<Photo | null>(coverPhoto || null);
  const [focals, setFocals] = useState<CoverFocals>(() => cloneFocals(initialFocals));
  const [activeSurface, setActiveSurface] = useState<CoverFocalSurfaceId>('desktop');
  const [dragging, setDragging] = useState(false);
  const [crosshairStyle, setCrosshairStyle] = useState({ left: '50%', top: '50%' });
  const [draftReady, setDraftReady] = useState(false);
  const [stageDisplaySize, setStageDisplaySize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [stageMaxHeight, setStageMaxHeight] = useState(estimateStageMaxHeight);
  const [loadedNaturalSize, setLoadedNaturalSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const imageRef = useRef<HTMLImageElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baselineRef = useRef<{ focals: string; photoId: string }>({ focals: '', photoId: '' });

  const imagePhotos = useMemo(() => photos.filter(isGalleryImagePhoto), [photos]);

  const resolvedPhoto = useMemo(() => {
    if (draftPhoto) return draftPhoto;
    if (coverPhoto) return coverPhoto;
    return imagePhotos.find((p) => photoMatchesCover(p, coverUrl, coverPhoto?.id)) || null;
  }, [draftPhoto, coverPhoto, imagePhotos, coverUrl]);

  const editorSrc = stripMediaUrlHash(
    (draftPhoto && (getPhotoFullDisplayUrl(draftPhoto) || draftPhoto.full_url || draftPhoto.web_url)) ||
      coverUrl ||
      (resolvedPhoto && (getPhotoFullDisplayUrl(resolvedPhoto) || resolvedPhoto.full_url || resolvedPhoto.web_url)) ||
      ''
  );

  const photoNaturalDimensions = useMemo(() => {
    const w = Number(resolvedPhoto?.width);
    const h = Number(resolvedPhoto?.height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
    return loadedNaturalSize;
  }, [resolvedPhoto, loadedNaturalSize]);

  const cropMaskId = useId().replace(/:/g, '');

  const activePoint: CoverFocalPoint = focals[activeSurface] || focals.desktop || focals.website || { x: 50, y: 50 };

  const activeSurfaceConfig = useMemo(
    () => COVER_FOCAL_SURFACES.find((surface) => surface.id === activeSurface),
    [activeSurface]
  );

  const cropOverlay = useMemo(() => {
    if (!stageDisplaySize || !photoNaturalDimensions || !activeSurfaceConfig) return null;
    const pct = computeCoverCropPercentRect(
      photoNaturalDimensions.width,
      photoNaturalDimensions.height,
      parseAspectRatio(activeSurfaceConfig.aspect),
      activePoint.x,
      activePoint.y
    );
    if (!pct) return null;
    const { width: dw, height: dh } = stageDisplaySize;
    return {
      dw,
      dh,
      x: (pct.left / 100) * dw,
      y: (pct.top / 100) * dh,
      w: (pct.width / 100) * dw,
      h: (pct.height / 100) * dh,
    };
  }, [
    stageDisplaySize,
    photoNaturalDimensions,
    activeSurfaceConfig,
    activePoint.x,
    activePoint.y,
  ]);

  const syncCrosshair = useCallback((x: number, y: number) => {
    const img = imageRef.current;
    if (!img) {
      setCrosshairStyle({ left: `${x}%`, top: `${y}%` });
      return;
    }
    setCrosshairStyle(focalPercentToElementStyle(x, y, img));
  }, []);

  const measureStage = useCallback(() => {
    const img = imageRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) return;
    setLoadedNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    const bodyEl = stageWrapRef.current?.closest('.cover-focal-body') as HTMLElement | null;
    const available = bodyEl?.clientWidth
      ? Math.min(STAGE_MAX_WIDTH, bodyEl.clientWidth)
      : STAGE_MAX_WIDTH;
    setStageDisplaySize(
      computeStageDisplaySize(img.naturalWidth, img.naturalHeight, available, stageMaxHeight)
    );
    syncCrosshair(activePoint.x, activePoint.y);
  }, [activePoint.x, activePoint.y, syncCrosshair, stageMaxHeight]);

  const remeasureChrome = useCallback(() => {
    const modal = modalRef.current;
    if (!modal) {
      setStageMaxHeight(estimateStageMaxHeight());
      return;
    }
    const vhCap = Math.round(window.innerHeight * MODAL_VIEWPORT_RATIO);
    const header = modal.querySelector('.cover-focal-header') as HTMLElement | null;
    const bottom = modal.querySelector('.cover-focal-bottom') as HTMLElement | null;
    const controls = modal.querySelector('.cover-focal-controls') as HTMLElement | null;
    const body = modal.querySelector('.cover-focal-body') as HTMLElement | null;

    let reserved = 0;
    if (header) reserved += header.offsetHeight;
    if (bottom) reserved += Math.max(bottom.offsetHeight, FOOTER_CHROME_MIN);
    else reserved += FOOTER_CHROME_MIN;
    if (controls) reserved += controls.offsetHeight;
    if (body) {
      const cs = getComputedStyle(body);
      reserved += parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    }
    reserved += 28;

    const next = Math.max(120, Math.min(STAGE_MAX_HEIGHT, vhCap - reserved));
    setStageMaxHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, []);

  useEffect(() => {
    setStageDisplaySize(null);
    setStageMaxHeight(estimateStageMaxHeight());
    setLoadedNaturalSize(null);
  }, [editorSrc]);

  useLayoutEffect(() => {
    if (!isOpen || view !== 'edit' || !editorSrc) return undefined;
    let cancelled = false;

    const syncNaturalSize = () => {
      if (cancelled) return;
      const img = imageRef.current;
      if (!img) {
        requestAnimationFrame(syncNaturalSize);
        return;
      }
      if (!img.naturalWidth || !img.naturalHeight) return;
      setLoadedNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      measureStage();
    };

    syncNaturalSize();
    const img = imageRef.current;
    if (img) img.addEventListener('load', syncNaturalSize);

    return () => {
      cancelled = true;
      const el = imageRef.current;
      if (el) el.removeEventListener('load', syncNaturalSize);
    };
  }, [isOpen, view, editorSrc, measureStage]);

  useEffect(() => {
    if (!isOpen || view !== 'edit' || !photoNaturalDimensions) return;
    const bodyEl = stageWrapRef.current?.closest('.cover-focal-body') as HTMLElement | null;
    const available = bodyEl?.clientWidth
      ? Math.min(STAGE_MAX_WIDTH, bodyEl.clientWidth)
      : STAGE_MAX_WIDTH;
    setStageDisplaySize(
      computeStageDisplaySize(
        photoNaturalDimensions.width,
        photoNaturalDimensions.height,
        available,
        stageMaxHeight
      )
    );
  }, [isOpen, view, photoNaturalDimensions, editorSrc, stageMaxHeight]);

  useEffect(() => {
    if (!isOpen || view !== 'edit') return undefined;
    remeasureChrome();
    const id = requestAnimationFrame(() => measureStage());
    return () => cancelAnimationFrame(id);
  }, [isOpen, view, remeasureChrome, measureStage]);

  useEffect(() => {
    if (!isOpen || view !== 'edit') return;
    measureStage();
  }, [stageMaxHeight, measureStage, isOpen, view]);

  useEffect(() => {
    if (!isOpen || view !== 'edit') return undefined;
    const onResize = () => {
      remeasureChrome();
      measureStage();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, view, measureStage, remeasureChrome]);

  useEffect(() => {
    if (!isOpen || view !== 'edit' || !modalRef.current) return undefined;
    const ro = new ResizeObserver(() => remeasureChrome());
    ro.observe(modalRef.current);
    return () => ro.disconnect();
  }, [isOpen, view, remeasureChrome]);

  useEffect(() => {
    if (!isOpen) {
      setDraftReady(false);
      return;
    }
    const hasCover = Boolean(coverUrl || coverPhoto);
    const openingFocals = cloneFocals(initialFocals);
    setView(initialView === 'pick' || !hasCover ? 'pick' : 'edit');
    setDraftPhoto(coverPhoto || null);
    setFocals(openingFocals);
    setActiveSurface('desktop');
    baselineRef.current = {
      focals: JSON.stringify(openingFocals),
      photoId: String(coverPhoto?.id || ''),
    };
    setDraftReady(true);
    // Re-init only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || view !== 'edit') return;
    syncCrosshair(activePoint.x, activePoint.y);
  }, [isOpen, view, activeSurface, activePoint.x, activePoint.y, syncCrosshair, editorSrc]);

  useEffect(() => {
    if (!isOpen || !draftReady || !onDraftChange) return;
    onDraftChange({ photo: resolvedPhoto, focals });
    // Parent applies this to the live design preview; omit onDraftChange from deps to avoid render loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftReady, resolvedPhoto, focals]);

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

  const handleFocalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      const point = focals[activeSurface] || { x: 50, y: 50 };
      let { x, y } = point;
      if (e.key === 'ArrowLeft') x -= step;
      else if (e.key === 'ArrowRight') x += step;
      else if (e.key === 'ArrowUp') y -= step;
      else if (e.key === 'ArrowDown') y += step;
      else return;
      e.preventDefault();
      e.stopPropagation();
      setActivePoint(clampPercent(x), clampPercent(y));
    },
    [focals, activeSurface, setActivePoint]
  );

  const openFileBrowser = () => {
    if (saving) return;
    fileInputRef.current?.click();
  };

  const handleCoverFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onCoverFileSelect) return;
    const photo = await onCoverFileSelect(file);
    if (photo) {
      setDraftPhoto(photo);
      setFocals(getDefaultCoverFocals() as CoverFocals);
      setActiveSurface('desktop');
      setView('edit');
    }
  };

  const browseButton = onCoverFileSelect ? (
    <button
      type="button"
      className="cover-modal-browse-btn"
      onClick={openFileBrowser}
      disabled={saving}
    >
      Browse from file
    </button>
  ) : null;

  const handleUseCover = () => {
    if (!editorSrc) {
      setView('pick');
      return;
    }
    void onConfirm({ photo: resolvedPhoto, focals });
  };

  const handleRemove = () => {
    if (!onRemove || saving) return;
    void onRemove();
  };

  if (!isOpen) return null;

  const across = Math.round(activePoint.x);
  const down = Math.round(activePoint.y);
  const focalLabel = `Focal ${across}% across, ${down}% down`;
  const isDirty =
    draftReady &&
    (JSON.stringify(focals) !== baselineRef.current.focals ||
      String(draftPhoto?.id || '') !== baselineRef.current.photoId);

  return (
    <div className="cover-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className={cn(
          'cover-modal-container',
          view === 'edit' ? 'cover-modal-container--focal' : 'cover-modal-container--wide'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-focal-header">
          <div className="cover-focal-header-text">
            <h3 className="cover-focal-title">Delivery cover</h3>
            <p className="cover-focal-subtitle">
              {view === 'pick'
                ? 'Choose the photograph to use as this delivery’s cover.'
                : 'Drag the point onto the part that must never be cut off.'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="cd-cover-file-input"
          accept={COVER_IMAGE_ACCEPT}
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void handleCoverFileInput(e)}
        />

        {view === 'pick' ? (
          <div className="cover-modal-content">
            <div className="modal-collection-view">
              {browseButton ? (
                <div className="cover-modal-pick-toolbar">
                  {browseButton}
                  <span>or choose a photograph from this delivery</span>
                </div>
              ) : null}
              <div className="photo-grid-scroll">
                {imagePhotos.length === 0 ? (
                  <div className="empty-collection-state">
                    <p>No photos in this delivery yet. Browse from file, or add media to a set first.</p>
                  </div>
                ) : (
                  <div className="photo-selection-grid">
                    {imagePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="photo-grid-item"
                        onClick={() => handlePickPhoto(photo)}
                      >
                        <img
                          src={getPhotoGridDisplayUrl(photo) || photo.thumbnail_url || photo.web_url || photo.full_url || undefined}
                          alt={photo.filename}
                        />
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
              <div className="cover-focal-stage-block">
                <div
                  ref={stageWrapRef}
                  className={cn('cover-focal-stage', dragging && 'is-dragging')}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                {editorSrc ? (
                  <div
                    className="cover-focal-stage__canvas"
                    style={
                      stageDisplaySize
                        ? {
                            width: `${stageDisplaySize.width}px`,
                            height: `${stageDisplaySize.height}px`,
                          }
                        : undefined
                    }
                  >
                    <img
                      ref={imageRef}
                      src={editorSrc}
                      alt=""
                      draggable={false}
                      onLoad={measureStage}
                    />
                    {cropOverlay ? (
                      <svg
                        className="cover-focal-crop-overlay"
                        width={cropOverlay.dw}
                        height={cropOverlay.dh}
                        viewBox={`0 0 ${cropOverlay.dw} ${cropOverlay.dh}`}
                        aria-hidden
                      >
                        <defs>
                          <mask id={cropMaskId}>
                            <rect width="100%" height="100%" fill="white" />
                            <rect
                              x={cropOverlay.x}
                              y={cropOverlay.y}
                              width={cropOverlay.w}
                              height={cropOverlay.h}
                              fill="black"
                            />
                          </mask>
                        </defs>
                        <rect
                          width="100%"
                          height="100%"
                          fill="rgba(0, 0, 0, 0.38)"
                          mask={`url(#${cropMaskId})`}
                        />
                        <rect
                          x={cropOverlay.x}
                          y={cropOverlay.y}
                          width={cropOverlay.w}
                          height={cropOverlay.h}
                          fill="none"
                          stroke="#e53935"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : null}
                    <div
                      className="cover-focal-crosshair"
                      style={crosshairStyle}
                      role="slider"
                      tabIndex={0}
                      aria-label={focalLabel}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={across}
                      aria-valuetext={focalLabel}
                      onKeyDown={handleFocalKeyDown}
                    >
                      <span className="cover-focal-crosshair__ring" />
                    </div>
                  </div>
                ) : (
                  <div className="cover-focal-stage__canvas cover-focal-stage__canvas--empty">
                    <div className="cover-focal-crosshair" style={{ left: '50%', top: '50%' }}>
                      <span className="cover-focal-crosshair__ring" />
                    </div>
                  </div>
                )}
                </div>
              </div>

              <div className="cover-focal-controls">
                <div className="cover-focal-control-group">
                  <div className="cover-focal-control-group__row">
                    <button
                      type="button"
                      className="cover-focal-tool-btn cover-focal-tool-btn--secondary"
                      onClick={() => setView('pick')}
                      disabled={saving}
                    >
                      Replace photo
                    </button>
                    {onRemove ? (
                      <button
                        type="button"
                        className="cover-focal-tool-btn cover-focal-tool-btn--hairline"
                        onClick={handleRemove}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <span className="cover-focal-control-group__label cover-focal-control-group__label--accent">
                    Which photo
                  </span>
                </div>

                <div className="cover-focal-control-group cover-focal-control-group--where">
                  <div className="cover-focal-control-group__row">
                    <span className="cover-focal-coords">
                      Focal {across}% × {down}%
                    </span>
                    <button
                      type="button"
                      className="cover-focal-tool-btn cover-focal-tool-btn--hairline"
                      onClick={handleCentre}
                      disabled={saving}
                    >
                      Reset to centre
                    </button>
                  </div>
                  <span className="cover-focal-control-group__label">Where in it</span>
                </div>
              </div>
            </div>

            <div className="cover-focal-bottom">
              <div className="cover-focal-bottom__row">
                <div className="cover-focal-appears">
                  <p className="cover-focal-appears__title">Where it appears</p>
                  <div className="cover-focal-previews">
                    {COVER_FOCAL_SURFACES.map((surface) => {
                      const point = focals[surface.id as CoverFocalSurfaceId] || { x: 50, y: 50 };
                      const ratio = parseAspectRatio(surface.aspect);
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
                          <span
                            className="cover-focal-preview__frame"
                            style={{
                              height: `${PREVIEW_TILE_HEIGHT}px`,
                              width: `${Math.round(PREVIEW_TILE_HEIGHT * ratio)}px`,
                            }}
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
                          <span className="cover-focal-preview__label">
                            {APPEARS_SHORT_LABEL[surface.id] || surface.kicker}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cover-focal-actions">
                  <button type="button" className="cover-focal-btn" onClick={onClose} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cover-focal-btn cover-focal-btn--primary"
                    onClick={handleUseCover}
                    disabled={saving || !editorSrc || !isDirty}
                  >
                    {saving ? 'Saving…' : 'Save cover'}
                  </button>
                </div>
              </div>
              <p className="cover-focal-footnote">
                Nothing is re-uploaded — the point is stored with the delivery.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
