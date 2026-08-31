import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AppSpinner } from '../../../ui/AppLoading';
import {
  fetchGalleryDownloadJob,
  getGalleryDownloadFileUrl,
  pollGalleryDownloadJob,
} from '@/services/galleryDownloadJob.service';
import './GalleryDownloadPopup.css';

/**
 * Centered dark popup for async gallery download states:
 * preparing → ready (or failed / expired).
 */
export default function GalleryDownloadPopup({
  token,
  collectionName = '',
  brandName = '',
  showBack = true,
  onBack,
  onReady,
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid download link.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const initial = await fetchGalleryDownloadJob(token);
        if (cancelled) return;

        if (initial.status === 'ready' || initial.status === 'failed' || initial.status === 'expired') {
          setJob(initial);
          setLoading(false);
          if (initial.status === 'ready' && onReady) onReady(initial);
          return;
        }

        const finalJob = await pollGalleryDownloadJob(token, { timeoutMs: 180000 });
        if (!cancelled) {
          setJob(finalJob);
          setLoading(false);
          if (finalJob.status === 'ready' && onReady) onReady(finalJob);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err.message || 'Could not load download.';
          setError(err.expired ? 'This download link has expired.' : message);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, onReady]);

  const handleDownload = useCallback(async () => {
    if (!token || downloading) return;
    setDownloading(true);
    try {
      const url = getGalleryDownloadFileUrl(token);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = job?.zipFilename || 'gallery-download.zip';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setDownloading(false);
    }
  }, [token, downloading, job?.zipFilename]);

  const handleBackClick = useCallback(() => {
    if (onBack) onBack(job);
  }, [onBack, job]);

  const collectionLabel = (job?.collectionName || collectionName || 'Gallery').toUpperCase();
  const brandLabel = (job?.brandName || brandName || collectionLabel).toUpperCase();

  const isPreparing =
    loading ||
    (!error && job && job.status !== 'ready' && job.status !== 'failed') ||
    (!error && !job && !!token);
  const isFailed = !loading && (error || job?.status === 'failed');
  const isReady = !loading && !error && job?.status === 'ready';

  return (
    <div className="gallery-dl-popup-scrim" role="dialog" aria-modal="true" aria-labelledby="gallery-dl-popup-title">
      <div className="gallery-dl-popup">
        {(showBack || collectionLabel) && !isPreparing ? (
          <header className="gallery-dl-popup__head">
            {showBack ? (
              <button type="button" className="gallery-dl-popup__back" onClick={handleBackClick}>
                <ArrowLeft size={16} strokeWidth={1.5} />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="gallery-dl-popup__brand">
              <strong>{collectionLabel}</strong>
              <span>{brandLabel}</span>
            </div>
          </header>
        ) : null}

        <div className="gallery-dl-popup__body">
          {isPreparing ? (
            <>
              <AppSpinner size="md" />
              <h1 id="gallery-dl-popup-title">We are preparing your photos</h1>
              <p>You will be notified by email once your download is ready.</p>
              <p>You can also stay on this page if you prefer.</p>
            </>
          ) : isFailed ? (
            <>
              <h1 id="gallery-dl-popup-title">
                {error?.includes('expired') ? 'Download unavailable' : 'Download failed'}
              </h1>
              <p>{error || job?.errorMessage || 'Something went wrong while preparing your photos.'}</p>
              {error?.includes('expired') ? (
                <p>Visit the gallery to request a new download.</p>
              ) : null}
            </>
          ) : isReady ? (
            <>
              <CheckCircle2 size={34} className="gallery-dl-popup__check" strokeWidth={1.5} />
              <h1 id="gallery-dl-popup-title">Your photos are ready to download</h1>
              <p>Click the link below to start the download.</p>
              <button
                type="button"
                className="gallery-dl-popup__file"
                onClick={handleDownload}
                disabled={downloading}
              >
                <span>{job?.zipFilename || 'gallery-download.zip'}</span>
                <span>{job?.byteSizeLabel || ''}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
