import React, { useEffect } from 'react';
import { Play } from 'lucide-react';
import { formatDownloadDestination } from '@/lib/downloadActivityResolve';

export interface DownloadActivityDetailModalProps {
  selectedDownloadId: number | string;
  downloadActivity: Array<{
    id: number | string;
    email?: string;
    setName?: string | null;
    photoSetId?: string | null;
    destination?: string;
    pin?: string;
    date?: string;
  }>;
  downloadDetailPhotos: Array<{
    id?: string;
    set_id?: string | null;
    filename?: string;
    thumbnail_url?: string;
    web_url?: string;
    full_url?: string;
  }>;
  sets: Array<{ id: string; name?: string }>;
  highlightsName: string;
  onClose: () => void;
  onExport: () => void;
}

export function DownloadActivityDetailModal({
  selectedDownloadId,
  downloadActivity,
  downloadDetailPhotos,
  sets,
  highlightsName,
  onClose,
  onExport,
}: DownloadActivityDetailModalProps) {
  const detail = downloadActivity.find((a) => a.id === selectedDownloadId);

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

  if (!detail) return null;

  const photoSetLabel =
    detail.setName && detail.setName !== 'Unknown Set'
      ? detail.setName
      : sets.find((s) => s.id === detail.photoSetId)?.name || 'Highlights';

  const dateLabel = detail.date
    ? new Date(detail.date)
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .replace(',', ' -')
    : '—';

  return (
    <div
      className="cd-modal-overlay download-detail-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cd-modal download-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-detail-modal-title"
      >
        <div className="cd-modal-header download-detail-modal-header">
          <h3 id="download-detail-modal-title" className="cd-modal-title">
            Download Details
          </h3>
          <button type="button" className="cd-modal-close" onClick={onClose} aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="download-detail-modal-body">
          <div className="download-detail-toolbar">
            <button type="button" className="download-detail-toolbar-link" onClick={onExport}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export in Excel
            </button>
          </div>

          <div className="download-detail-meta">
            <div className="download-detail-meta-row">
              <span className="download-detail-meta-label">Email</span>
              <span className="download-detail-meta-value">{detail.email}</span>
            </div>
            <div className="download-detail-meta-row">
              <span className="download-detail-meta-label">Photo Set</span>
              <span className="download-detail-meta-value">{photoSetLabel}</span>
            </div>
            <div className="download-detail-meta-row">
              <span className="download-detail-meta-label">Saved to</span>
              <span className="download-detail-meta-value">
                <span
                  className={`download-destination-badge download-destination-badge--${
                    detail.destination === 'google_drive' ? 'drive' : 'local'
                  }`}
                >
                  {formatDownloadDestination(detail.destination)}
                </span>
              </span>
            </div>
            <div className="download-detail-meta-row">
              <span className="download-detail-meta-label">PIN</span>
              <span className="download-detail-meta-value">{detail.pin}</span>
            </div>
            <div className="download-detail-meta-row">
              <span className="download-detail-meta-label">Date</span>
              <span className="download-detail-meta-value">{dateLabel}</span>
            </div>
          </div>

          <div className="download-detail-photos-head">
            <span className="download-detail-photos-title">
              Photos ({downloadDetailPhotos.length})
            </span>
          </div>
          <div className="download-detail-photos">
            {downloadDetailPhotos.length === 0 ? (
              <p className="download-detail-empty">No photos found for this download.</p>
            ) : (
              downloadDetailPhotos.map((ph) => {
                const setLabel = !ph?.set_id
                  ? highlightsName
                  : sets.find((ss) => ss.id === ph.set_id)?.name || 'Highlights';
                const thumb = ph?.thumbnail_url || ph?.web_url || ph?.full_url;
                const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(ph?.filename || ph?.full_url || '');

                return (
                  <div key={ph?.id} className="download-detail-photo-row">
                    <div className="download-detail-thumb">
                      {thumb ? (
                        isVideo ? (
                          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video
                              src={thumb}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              muted
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            >
                              <Play size={16} fill="white" stroke="white" />
                            </div>
                          </div>
                        ) : (
                          <img src={thumb} alt="" />
                        )
                      ) : null}
                    </div>
                    <div className="download-detail-photo-main">
                      <div className="download-detail-filename">{ph?.filename || 'Photo'}</div>
                      <div className="download-detail-sub">
                        <span className="download-detail-set-tag">{setLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
