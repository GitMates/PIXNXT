import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDownloadDestination } from '@/lib/downloadActivityResolve';
import { countPhotosForDownloadActivity } from '@/lib/downloadActivityResolve';
import { formatActivityRelativeTime } from '@/lib/buildActivityFeed';
import './DownloadActivity.css';

export interface DownloadActivityDetailModalProps {
  selectedDownloadId: number | string;
  downloadActivity: Array<{
    id: number | string;
    email?: string;
    setName?: string | null;
    photoSetId?: string | null;
    destination?: string;
    pin?: string;
    pinUsed?: boolean;
    date?: string;
    type?: string;
    resolution?: string;
    filename?: string;
    photoCount?: number | null;
    size?: number | null;
  }>;
  downloadDetailPhotos: Array<{
    id?: string;
    set_id?: string | null;
    filename?: string;
    thumbnail_url?: string;
    web_url?: string;
    full_url?: string;
    media_type?: string;
  }>;
  sets: Array<{ id: string; name?: string }>;
  highlightsName: string;
  onClose: () => void;
  onExportCsv: () => void;
  onDownloadSameSet: () => void;
}

const GRID_VISIBLE = 17;
const PLACEHOLDER_MODS = [0, 1, 2, 3, 4, 5];

function capitalizeWord(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function formatByteSize(bytes: unknown, resolution?: string) {
  const n = Number(bytes);
  if (Number.isFinite(n) && n > 0) {
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(n / 1024))} KB`;
  }
  return resolution ? `${resolution} size` : '—';
}

function formatSentTo(destination?: string, photoCount = 0) {
  if (destination === 'google_drive') return 'Google Drive';
  if (destination === 'email') return 'Email delivery';
  if (photoCount > 1) return 'Their device, as one zip';
  return 'Their device';
}

function formatWhen(date?: string) {
  if (!date) return '—';
  const relative = formatActivityRelativeTime(date);
  const absolute = new Date(date)
    .toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '');
  return relative && absolute ? `${relative} · ${absolute}` : relative || absolute;
}

function buildSummary(detail: DownloadActivityDetailModalProps['downloadActivity'][0], photoCount: number, setLabel: string) {
  const sizeLabel = detail.resolution ? capitalizeWord(detail.resolution) : null;
  if (detail.type === 'gallery') {
    const hasCount = photoCount > 0;
    let text = hasCount
      ? `Downloaded ${photoCount} photo${photoCount === 1 ? '' : 's'}`
      : 'Downloaded the full delivery';
    if (setLabel) text += ` from ${setLabel}`;
    if (sizeLabel) text += ` · ${sizeLabel} size`;
    return text;
  }
  if (detail.type === 'video') {
    let text = `Downloaded ${detail.filename || 'a video'}`;
    if (sizeLabel) text += ` · ${sizeLabel} size`;
    return text;
  }
  let text = `Downloaded ${detail.filename || '1 photo'}`;
  if (setLabel) text += ` from ${setLabel}`;
  if (sizeLabel) text += ` · ${sizeLabel} size`;
  return text;
}

export function DownloadActivityDetailModal({
  selectedDownloadId,
  downloadActivity,
  downloadDetailPhotos,
  sets,
  highlightsName,
  onClose,
  onExportCsv,
  onDownloadSameSet,
}: DownloadActivityDetailModalProps) {
  const detail = downloadActivity.find((a) => a.id === selectedDownloadId);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const photoSetLabel = useMemo(() => {
    if (!detail) return 'Highlights';
    if (detail.setName && detail.setName !== 'Unknown Set') return detail.setName;
    return sets.find((s) => s.id === detail.photoSetId)?.name || highlightsName || 'Highlights';
  }, [detail, sets, highlightsName]);

  const photoCount = useMemo(() => {
    if (!detail) return 0;
    if (downloadDetailPhotos.length > 0) return downloadDetailPhotos.length;
    return countPhotosForDownloadActivity(detail, downloadDetailPhotos, sets);
  }, [detail, downloadDetailPhotos, sets]);

  const gridPhotos = showAll ? downloadDetailPhotos : downloadDetailPhotos.slice(0, GRID_VISIBLE);
  const overflowCount = showAll ? 0 : Math.max(0, downloadDetailPhotos.length - GRID_VISIBLE);

  if (!detail) return null;

  const sizeLine = (() => {
    const bytes = formatByteSize(detail.size, detail.resolution);
    if (detail.resolution && bytes !== `${detail.resolution} size`) {
      return `${capitalizeWord(detail.resolution)} size · ${bytes}`;
    }
    return bytes;
  })();

  const pinLabel =
    detail.pinUsed && detail.pin && detail.pin !== '---' ? detail.pin : 'Not required';

  return (
    <AnimatePresence>
      <motion.div
        className="download-detail-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        role="presentation"
      >
        <motion.aside
          className="download-detail-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-detail-drawer-title"
        >
          <div className="download-detail-drawer__head">
            <div className="download-detail-drawer__head-top" style={{ marginBottom: 0 }}>
              <button type="button" className="download-detail-drawer__close" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <h3 id="download-detail-drawer-title" className="download-detail-drawer__title">
              Download
            </h3>
            <p className="download-detail-drawer__summary">
              {buildSummary(detail, photoCount, photoSetLabel)}
            </p>
          </div>

          <div className="download-detail-drawer__body">
            <div className="download-detail-drawer__section-head download-detail-drawer__section-head--detail" style={{ paddingTop: '24px' }}>
              <span className="download-detail-photos-title">Detail</span>
            </div>

            <div className="download-detail-facts">
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">Who</span>
                <span className="download-detail-fact-value">{detail.email || 'Visitor'}</span>
              </div>
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">What</span>
                <span className="download-detail-fact-value">
                  {photoCount} photograph{photoCount === 1 ? '' : 's'} from <strong>{photoSetLabel}</strong>
                </span>
              </div>
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">Size</span>
                <span className="download-detail-fact-value">{sizeLine}</span>
              </div>
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">Sent to</span>
                <span className="download-detail-fact-value">
                  {formatSentTo(detail.destination, photoCount) || formatDownloadDestination(detail.destination)}
                </span>
              </div>
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">PIN used</span>
                <span className="download-detail-fact-value">{pinLabel}</span>
              </div>
              <div className="download-detail-fact-row">
                <span className="download-detail-fact-label">When</span>
                <span className="download-detail-fact-value">{formatWhen(detail.date)}</span>
              </div>
            </div>

            <div className="download-detail-drawer__section-head download-detail-drawer__section-head--photos" style={{ paddingTop: '28px' }}>
              <span className="download-detail-photos-title">The photographs</span>
              {photoCount > 0 ? (
                <span className="download-detail-drawer__section-count">{photoCount}</span>
              ) : null}
            </div>

            <div className="download-detail-photo-grid">
              {gridPhotos.length === 0 ? (
                <p className="download-detail-empty">No photos found for this download.</p>
              ) : (
                <>
                  {gridPhotos.map((ph, index) => {
                    const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                    const isVideo =
                      ph?.media_type === 'video' ||
                      /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '');
                    return (
                      <div key={ph?.id || index} className="download-detail-photo-grid__cell">
                        {thumb && !isVideo ? (
                           <img src={thumb} alt="" />
                        ) : (
                          <span
                            className={`download-detail-photo-grid__placeholder download-detail-photo-grid__placeholder--${PLACEHOLDER_MODS[index % PLACEHOLDER_MODS.length]}`}
                          />
                        )}
                      </div>
                    );
                  })}
                  {overflowCount > 0 ? (
                    <div
                      className="download-detail-photo-grid__cell download-detail-photo-grid__cell--more cursor-pointer"
                      onClick={() => setShowAll(true)}
                    >
                      +{overflowCount}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="download-detail-drawer__footer">
            <button
              type="button"
              className="download-detail-footer-secondary"
              onClick={() => {
                if (detail.email) window.location.href = `mailto:${encodeURIComponent(detail.email)}`;
              }}
            >
              Message them
            </button>
            <button type="button" className="download-detail-footer-primary" onClick={onDownloadSameSet}>
              Download the same set
            </button>
            <button type="button" className="download-detail-footer-export" onClick={onExportCsv}>
              Export as CSV
            </button>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
