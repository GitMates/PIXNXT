import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  deliveryDownloadRows,
  photosForDeliveryDownload,
} from '@/lib/deliveryDownload';
import { useDeliveryDownload } from '@/contexts/deliveryDownloadContext';
import { formatStorageBytes } from '@/utils/formatStorageBytes';
import { isVideoMedia } from '@/lib/photoDisplayUrl';
import {
  isGoogleDriveConfigured,
  getGoogleDriveSetupMessage,
  saveGalleryToGoogleDrive,
} from '@/lib/googleDriveUpload';
import {
  isDropboxConfigured,
  getDropboxSetupMessage,
  saveGalleryToDropbox,
} from '@/lib/dropboxUpload';
import './DeliveryDownloadModal.css';

function estimatePhotoBytes(photo, resolution = 'original') {
  const raw = Number(photo?.size_bytes) || 0;
  if (isVideoMedia(photo)) return raw;
  if (raw > 0) {
    if (resolution === 'web') return Math.max(1, Math.round(raw * 0.14));
    if (resolution === 'full') return Math.max(1, Math.round(raw * 0.5));
    return raw;
  }
  const w = Number(photo?.width) || 4000;
  const h = Number(photo?.height) || 3000;
  const px = w * h;
  if (resolution === 'web') return Math.round(Math.min(px * 0.12, 450_000));
  if (resolution === 'full') return Math.round(px * 0.28);
  return Math.round(px * 0.55);
}

export function DeliveryDownloadModal({
  open,
  mode: initialMode = 'all',
  setId: initialSetId = null,
  collectionName = 'delivery',
  photos = [],
  sets = [],
  highlightsName = 'Highlights',
  onClose,
  onStarted,
}) {
  const { startDownload } = useDeliveryDownload();
  const rows = useMemo(
    () => deliveryDownloadRows({ photos, sets, highlightsName }),
    [photos, sets, highlightsName],
  );

  const [downloadScope, setDownloadScope] = useState(initialMode || 'all');
  const [selectedSetId, setSelectedSetId] = useState(initialSetId || rows[0]?.id || 'highlights');
  const [resolution, setResolution] = useState('original');
  const [includeVideos, setIncludeVideos] = useState(true);
  const [destination, setDestination] = useState('local'); // 'local' | 'google_drive' | 'dropbox'

  // Cloud upload states
  const [cloudPhase, setCloudPhase] = useState('idle'); // 'idle' | 'auth' | 'uploading' | 'complete' | 'error'
  const [cloudProgress, setCloudProgress] = useState(0);
  const [cloudStatusText, setCloudStatusText] = useState('');
  const [cloudCompleteUrl, setCloudCompleteUrl] = useState('');
  const [error, setError] = useState('');
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setCloudPhase('idle');
      return undefined;
    }
    setError('');
    setCloudPhase('idle');
    setCloudProgress(0);
    setCloudStatusText('');
    setCloudCompleteUrl('');
    setDownloadScope(initialMode || 'all');
    if (initialSetId) {
      setSelectedSetId(initialSetId);
    } else {
      const firstWithFiles = rows.find((row) => row.count > 0);
      setSelectedSetId(firstWithFiles?.id || rows[0]?.id || 'highlights');
    }
    return undefined;
  }, [open, initialMode, initialSetId, rows]);

  // Selected photos based on scope
  const scopedPhotos = useMemo(() => {
    if (downloadScope === 'all') {
      return photosForDeliveryDownload({
        mode: 'all',
        photos,
        sets,
        highlightsName,
      });
    }
    return photosForDeliveryDownload({
      mode: 'set',
      photos,
      sets,
      setId: selectedSetId,
      highlightsName,
    });
  }, [downloadScope, selectedSetId, photos, sets, highlightsName]);

  const selectedRow = rows.find((row) => String(row.id) === String(selectedSetId));

  // Partition photos and videos
  const allVideos = useMemo(() => scopedPhotos.filter((p) => isVideoMedia(p)), [scopedPhotos]);
  const allImages = useMemo(() => scopedPhotos.filter((p) => !isVideoMedia(p)), [scopedPhotos]);

  const finalPhotos = useMemo(() => {
    if (!includeVideos) return allImages;
    return scopedPhotos;
  }, [scopedPhotos, allImages, includeVideos]);

  // Total size estimate
  const totalEstimatedBytes = useMemo(() => {
    return finalPhotos.reduce((sum, p) => sum + estimatePhotoBytes(p, resolution), 0);
  }, [finalPhotos, resolution]);

  const handleStartDownload = async () => {
    if (!finalPhotos.length) {
      setError('No files available to download in this selection.');
      return;
    }
    setError('');

    const targetSetName = downloadScope === 'set' ? selectedRow?.name : null;

    if (destination === 'local') {
      try {
        const result = await startDownload(finalPhotos, {
          collectionName,
          setName: targetSetName,
          resolution,
          includeVideos,
          onPicked: () => onClose?.(),
        });
        if (result.cancelled) return;
        onStarted?.(result, collectionName);
        onClose?.();
      } catch (err) {
        setError(err?.message || 'Could not download files.');
      }
      return;
    }

    if (destination === 'google_drive') {
      if (!isGoogleDriveConfigured()) {
        setError(getGoogleDriveSetupMessage());
        return;
      }
      const runId = ++runIdRef.current;
      const isStale = () => runId !== runIdRef.current;

      setCloudPhase('auth');
      setCloudProgress(0);
      setCloudStatusText('Opening Google sign-in window…');

      try {
        const result = await saveGalleryToGoogleDrive(finalPhotos, {
          collectionName: targetSetName ? `${collectionName} - ${targetSetName}` : collectionName,
          resolution,
          isStale,
          onAuthStart: () => {
            if (!isStale()) {
              setCloudPhase('auth');
              setCloudStatusText('Waiting for Google sign-in… Please authorize in the popup.');
            }
          },
          onAuthComplete: () => {
            if (!isStale()) {
              setCloudPhase('uploading');
              setCloudStatusText(`Signed in! Preparing ${finalPhotos.length} files…`);
            }
          },
          onUploadPhase: (phase) => {
            if (!isStale()) setCloudStatusText(phase);
          },
          onProgress: (done, total) => {
            if (!isStale()) {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              setCloudProgress(pct);
            }
          },
        });

        if (isStale()) return;
        setCloudPhase('complete');
        setCloudProgress(100);
        const url = result.folderUrl || result.webViewLink || '';
        setCloudCompleteUrl(url);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      } catch (err) {
        if (!isStale()) {
          setCloudPhase('error');
          setError(err?.message || 'Google Drive upload failed.');
        }
      }
      return;
    }

    if (destination === 'dropbox') {
      if (!isDropboxConfigured()) {
        setError(getDropboxSetupMessage());
        return;
      }
      const runId = ++runIdRef.current;
      const isStale = () => runId !== runIdRef.current;

      setCloudPhase('auth');
      setCloudProgress(0);
      setCloudStatusText('Opening Dropbox sign-in window…');

      try {
        const result = await saveGalleryToDropbox(finalPhotos, {
          collectionName: targetSetName ? `${collectionName} - ${targetSetName}` : collectionName,
          resolution,
          isStale,
          onAuthStart: () => {
            if (!isStale()) {
              setCloudPhase('auth');
              setCloudStatusText('Waiting for Dropbox sign-in… Please authorize in the popup.');
            }
          },
          onAuthComplete: () => {
            if (!isStale()) {
              setCloudPhase('uploading');
              setCloudStatusText(`Signed in! Uploading ${finalPhotos.length} files to Dropbox…`);
            }
          },
          onUploadPhase: (phase) => {
            if (!isStale()) setCloudStatusText(phase);
          },
          onProgress: (pct) => {
            if (!isStale()) setCloudProgress(pct);
          },
        });

        if (isStale()) return;
        setCloudPhase('complete');
        setCloudProgress(100);
        setCloudCompleteUrl(result.folderUrl || '');
        if (result.folderUrl) window.open(result.folderUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        if (!isStale()) {
          setCloudPhase('error');
          setError(err?.message || 'Dropbox upload failed.');
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div className="cd-modal-overlay" onClick={() => (cloudPhase === 'idle' || cloudPhase === 'complete') && onClose?.()}>
      <div
        className="cd-modal cd-dl-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-dl-export-title"
      >
        <div className="cd-modal-header">
          <div className="cd-dl-modal__header-left">
            <h3 className="cd-modal-title" id="cd-dl-export-title">
              Download Media
            </h3>
            <span className="cd-dl-modal__collection-badge">{collectionName}</span>
          </div>
          <button
            type="button"
            className="cd-modal-close"
            onClick={() => {
              runIdRef.current += 1;
              onClose?.();
            }}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cd-modal-body cd-dl-modal__body">
          {cloudPhase !== 'idle' ? (
            <div className="cd-dl-cloud-status">
              {cloudPhase === 'auth' && (
                <div className="cd-dl-cloud-status__spinner-wrap">
                  <div className="cd-dl-spinner" />
                  <h4>Waiting for Authentication</h4>
                  <p>{cloudStatusText}</p>
                </div>
              )}

              {cloudPhase === 'uploading' && (
                <div className="cd-dl-cloud-status__uploading">
                  <div className="cd-dl-cloud-status__header">
                    <h4>Uploading to {destination === 'google_drive' ? 'Google Drive' : 'Dropbox'}</h4>
                    <span className="cd-dl-cloud-status__pct">{cloudProgress}%</span>
                  </div>
                  <div className="cd-dl-cloud-progress-track">
                    <div className="cd-dl-cloud-progress-fill" style={{ width: `${cloudProgress}%` }} />
                  </div>
                  <p className="cd-dl-cloud-status__text">{cloudStatusText}</p>
                </div>
              )}

              {cloudPhase === 'complete' && (
                <div className="cd-dl-cloud-status__complete">
                  <div className="cd-dl-cloud-status__success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h4>Upload Complete!</h4>
                  <p>All {finalPhotos.length} files were successfully saved to your {destination === 'google_drive' ? 'Google Drive' : 'Dropbox'}.</p>
                  {cloudCompleteUrl && (
                    <a
                      href={cloudCompleteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cd-basics-btn cd-dl-btn-primary"
                      style={{ display: 'inline-block', marginTop: '12px' }}
                    >
                      Open in {destination === 'google_drive' ? 'Google Drive' : 'Dropbox'}
                    </a>
                  )}
                </div>
              )}

              {cloudPhase === 'error' && (
                <div className="cd-dl-cloud-status__error">
                  <h4>Upload Failed</h4>
                  <p className="cd-dl-export__error">{error}</p>
                  <button
                    type="button"
                    className="cd-basics-btn"
                    style={{ marginTop: '12px' }}
                    onClick={() => setCloudPhase('idle')}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. Scope selection: Everything vs Set */}
              <div className="cd-dl-section">
                <label className="cd-dl-label">Scope</label>
                <div className="cd-dl-scope-tabs">
                  <button
                    type="button"
                    className={`cd-dl-scope-tab ${downloadScope === 'all' ? 'is-active' : ''}`}
                    onClick={() => setDownloadScope('all')}
                  >
                    Download everything
                    <span className="cd-dl-scope-count">{photos.length} files</span>
                  </button>
                  <button
                    type="button"
                    className={`cd-dl-scope-tab ${downloadScope === 'set' ? 'is-active' : ''}`}
                    onClick={() => setDownloadScope('set')}
                  >
                    Download a set...
                    <span className="cd-dl-scope-count">{rows.length} sets</span>
                  </button>
                </div>

                {downloadScope === 'set' && (
                  <div className="cd-dl-set-selector">
                    <select
                      className="cd-dl-select"
                      value={selectedSetId}
                      onChange={(e) => setSelectedSetId(e.target.value)}
                    >
                      {rows.map((row) => (
                        <option key={row.id} value={row.id} disabled={row.count === 0}>
                          {row.name} ({row.count} {row.count === 1 ? 'file' : 'files'}{row.bytes ? ` · ${formatStorageBytes(row.bytes)}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Quality selection: 3 View Sizes */}
              <div className="cd-dl-section">
                <label className="cd-dl-label">Image Quality</label>
                <div className="cd-dl-quality-cards">
                  <label className={`cd-dl-quality-card ${resolution === 'original' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="dl_quality"
                      value="original"
                      checked={resolution === 'original'}
                      onChange={() => setResolution('original')}
                    />
                    <div className="cd-dl-quality-info">
                      <div className="cd-dl-quality-title-row">
                        <span className="cd-dl-quality-name">Original Resolution</span>
                        <span className="cd-dl-quality-tag">Best Quality</span>
                      </div>
                      <p className="cd-dl-quality-desc">
                        Full original raw & JPEG resolution. Best for printing and archiving.
                      </p>
                    </div>
                  </label>

                  <label className={`cd-dl-quality-card ${resolution === 'full' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="dl_quality"
                      value="full"
                      checked={resolution === 'full'}
                      onChange={() => setResolution('full')}
                    />
                    <div className="cd-dl-quality-info">
                      <div className="cd-dl-quality-title-row">
                        <span className="cd-dl-quality-name">High Resolution</span>
                        <span className="cd-dl-quality-tag">Display Size</span>
                      </div>
                      <p className="cd-dl-quality-desc">
                        Full display quality. Crisp on 4K & Retina screens, faster to download.
                      </p>
                    </div>
                  </label>

                  <label className={`cd-dl-quality-card ${resolution === 'web' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="dl_quality"
                      value="web"
                      checked={resolution === 'web'}
                      onChange={() => setResolution('web')}
                    />
                    <div className="cd-dl-quality-info">
                      <div className="cd-dl-quality-title-row">
                        <span className="cd-dl-quality-name">Web Size</span>
                        <span className="cd-dl-quality-tag">Fastest</span>
                      </div>
                      <p className="cd-dl-quality-desc">
                        Optimized web compression. Perfect for mobile sharing and social media.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Video Option (if videos exist in selection) */}
              {allVideos.length > 0 && (
                <div className="cd-dl-section">
                  <label className="cd-dl-label">Videos / Films</label>
                  <label className="cd-dl-checkbox-card">
                    <input
                      type="checkbox"
                      checked={includeVideos}
                      onChange={(e) => setIncludeVideos(e.target.checked)}
                    />
                    <div className="cd-dl-checkbox-text">
                      <span className="cd-dl-checkbox-title">
                        Include Videos ({allVideos.length} {allVideos.length === 1 ? 'video' : 'videos'})
                      </span>
                      <span className="cd-dl-checkbox-sub">
                        Full original format ({allVideos.map((v) => v.filename || 'video').join(', ').slice(0, 50)}...)
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* 4. Destination Platform: Local, Google Drive, Dropbox */}
              <div className="cd-dl-section">
                <label className="cd-dl-label">Save To Platform</label>
                <div className="cd-dl-dest-grid">
                  <button
                    type="button"
                    className={`cd-dl-dest-card ${destination === 'local' ? 'is-selected' : ''}`}
                    onClick={() => setDestination('local')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className="cd-dl-dest-name">My Device</span>
                    <span className="cd-dl-dest-hint">Local Folder</span>
                  </button>

                  <button
                    type="button"
                    className={`cd-dl-dest-card ${destination === 'google_drive' ? 'is-selected' : ''}`}
                    onClick={() => setDestination('google_drive')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    </svg>
                    <span className="cd-dl-dest-name">Google Drive</span>
                    <span className="cd-dl-dest-hint">Direct Cloud</span>
                  </button>

                  <button
                    type="button"
                    className={`cd-dl-dest-card ${destination === 'dropbox' ? 'is-selected' : ''}`}
                    onClick={() => setDestination('dropbox')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 6 4-3 4 3-4 3 4 3-4 3-4-3 4-3Z" />
                      <path d="m12 6-4-3-4 3 4 3-4 3 4 3 4-3-4-3Z" />
                      <path d="m4 12 4 3 4-3" />
                      <path d="m20 12-4 3-4-3" />
                      <path d="M8 18.5 12 21l4-2.5" />
                    </svg>
                    <span className="cd-dl-dest-name">Dropbox</span>
                    <span className="cd-dl-dest-hint">Direct Cloud</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {cloudPhase === 'idle' && (
          <div className="cd-dl-footer">
            <div className="cd-dl-footer__summary">
              <span className="cd-dl-footer__count">
                <strong>{finalPhotos.length}</strong> {finalPhotos.length === 1 ? 'file' : 'files'}
                {allVideos.length > 0 && includeVideos ? ` (${allImages.length} photos, ${allVideos.length} videos)` : ''}
              </span>
              <span className="cd-dl-footer__size">
                ~{formatStorageBytes(totalEstimatedBytes)}
              </span>
            </div>

            {error && <p className="cd-dl-export__error cd-dl-footer__error">{error}</p>}

            <div className="cd-dl-footer__actions">
              <button
                type="button"
                className="cd-basics-btn"
                onClick={() => onClose?.()}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cd-basics-btn cd-dl-btn-primary"
                disabled={!finalPhotos.length}
                onClick={handleStartDownload}
              >
                {destination === 'google_drive'
                  ? 'Save to Google Drive'
                  : destination === 'dropbox'
                  ? 'Save to Dropbox'
                  : 'Download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
