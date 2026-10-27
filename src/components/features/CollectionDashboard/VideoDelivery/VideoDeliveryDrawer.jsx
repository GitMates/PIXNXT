import { useEffect, useMemo, useState } from 'react';
import {
  POOL_DEFAULT_MIN,
  PREVIEW_LEN_SEC,
  PREVIEW_SNAP_SEC,
  TOPUP_PACK_MIN,
  formatFilmClock,
  previewWindow,
  snapPreviewStartSec,
  streamMinutesNeeded,
  studioVideoChip,
} from '../../../../lib/videoDelivery';
import { ApiError } from '../../../../lib/api/client';
import { galleryService } from '../../../../services/gallery.service';
import './VideoDelivery.css';

function poolFrom(quota) {
  const total = Number(quota?.stream_minutes_total) > 0 ? Number(quota.stream_minutes_total) : POOL_DEFAULT_MIN;
  const used = Math.max(0, Number(quota?.stream_minutes_used) || 0);
  return { total, used, remaining: Math.max(0, total - used) };
}

export function VideoDeliveryDrawer({ photo, quota, onClose, onPhoto, onPool }) {
  const pool = poolFrom(quota);
  const need = streamMinutesNeeded(photo?.video_duration_seconds);
  const chip = studioVideoChip(photo);
  const preview = previewWindow(photo);
  const duration = Number(photo?.video_duration_seconds) || 0;
  const maxStart = Math.max(0, duration - PREVIEW_LEN_SEC);
  const [start, setStart] = useState(preview.startSec);
  const [busy, setBusy] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [error, setError] = useState('');
  const fits = need <= pool.remaining;
  const streaming = photo?.delivery_mode === 'stream' && chip !== 'download';

  useEffect(() => {
    setStart(previewWindow(photo).startSec);
    setConfirmDownload(false);
    setError('');
  }, [photo?.id, photo?.preview_start_sec]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!photo?.id) return undefined;
    const handle = setTimeout(() => {
      if (snapPreviewStartSec(start) === snapPreviewStartSec(photo.preview_start_sec)) return;
      galleryService.updatePhotoVideoDelivery(photo.id, {
        action: 'preview',
        preview_start_sec: snapPreviewStartSec(start),
      }).then((data) => {
        if (data?.photo) onPhoto?.(data.photo);
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(handle);
  }, [start, photo?.id, photo?.preview_start_sec, onPhoto]);

  const startLabel = useMemo(() => {
    const snapped = snapPreviewStartSec(start);
    return `${formatFilmClock(snapped)} – ${formatFilmClock(snapped + PREVIEW_LEN_SEC)}`;
  }, [start]);

  if (!photo) return null;

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const data = await galleryService.updatePhotoVideoDelivery(photo.id, { action });
      if (data?.photo) onPhoto?.(data.photo);
      if (data?.pool) onPool?.(data.pool);
      if (action === 'download') onClose?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'POOL_EXHAUSTED') {
        setError(`Needs ${need} min / you have ${pool.remaining} left.`);
      } else {
        setError(err?.message || 'Could not update this film.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vd-scrim" onClick={onClose}>
      <aside
        className="vd-drawer"
        role="dialog"
        aria-label="Film delivery"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vd-drawer__head">
          <div>
            <p className="vd-drawer__kicker">Film</p>
            <h2>{photo.filename || 'Untitled film'}</h2>
            <p className="vd-drawer__meta">{formatFilmClock(duration)} · {need} stream min</p>
          </div>
          <button type="button" className="vd-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {chip === 'preparing' ? (
          <p className="vd-copy">Your client keeps the download until it is ready.</p>
        ) : streaming ? (
          <>
            <p className="vd-copy">
              Your client plays this in the gallery. It uses {need} stream minutes.
            </p>
            {confirmDownload ? (
              <div className="vd-confirm">
                <p>Switch to download with preview? Stream minutes return to your pool.</p>
                <button type="button" className="vd-btn" disabled={busy} onClick={() => run('download')}>
                  Switch to download
                </button>
                <button type="button" className="vd-btn vd-btn--ghost" onClick={() => setConfirmDownload(false)}>
                  Keep streaming
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="vd-btn vd-btn--ghost"
                disabled={busy}
                onClick={() => setConfirmDownload(true)}
              >
                Switch to download with preview
              </button>
            )}
          </>
        ) : (
          <>
            <label className="vd-slider">
              <span>Preview start · {startLabel}</span>
              <input
                type="range"
                min={0}
                max={maxStart}
                step={PREVIEW_SNAP_SEC}
                value={Math.min(start, maxStart)}
                onChange={(e) => setStart(Number(e.target.value))}
              />
            </label>
            <table className="vd-table">
              <tbody>
                <tr>
                  <th>Needs</th>
                  <td>{need} min</td>
                </tr>
                <tr>
                  <th>You have</th>
                  <td>{pool.remaining} left</td>
                </tr>
              </tbody>
            </table>
            {fits ? (
              <button type="button" className="vd-btn" disabled={busy} onClick={() => run('stream')}>
                Stream this film
              </button>
            ) : (
              <p className="vd-copy">
                Add {TOPUP_PACK_MIN} stream minutes to play this in the gallery. Until then it stays a download with a preview.
              </p>
            )}
            <button type="button" className="vd-btn vd-btn--ghost" onClick={onClose}>
              Keep as download
            </button>
          </>
        )}
        {error ? <p className="vd-error">{error}</p> : null}
      </aside>
    </div>
  );
}
