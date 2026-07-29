import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guestDeliveryPublishService } from '../../services/guestDeliveryPublish.service';
import './EventGuestGallery.css';

export default function EventGuestGallery() {
  const { slug, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gallery, setGallery] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    document.body.classList.add('egg-body-lock');
    document.documentElement.classList.add('egg-root-lock');
    return () => {
      document.body.classList.remove('egg-body-lock');
      document.documentElement.classList.remove('egg-root-lock');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await guestDeliveryPublishService.loadGuestGallery({
          slug,
          accessToken: token,
        });
        if (!cancelled) setGallery(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err?.message || 'Could not load your gallery.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  const photos = gallery?.photos || [];
  const activePhoto = lightboxIndex >= 0 ? photos[lightboxIndex] : null;

  return (
    <div className="egg-page">
      <header className="egg-header">
        <p className="egg-brand">PIXNXT</p>
        {gallery?.event?.name ? <h1 className="egg-title">{gallery.event.name}</h1> : null}
        {gallery?.guest?.name ? (
          <p className="egg-subtitle">
            Photos for {gallery.guest.name}
            {photos.length ? ` · ${photos.length} photo${photos.length === 1 ? '' : 's'}` : ''}
          </p>
        ) : null}
      </header>

      <main className="egg-main">
        {loading && <p className="egg-muted">Loading your photos…</p>}

        {!loading && error && (
          <div className="egg-empty">
            <h2>Gallery unavailable</h2>
            <p className="egg-muted">{error}</p>
          </div>
        )}

        {!loading && !error && photos.length === 0 && (
          <div className="egg-empty">
            <h2>No photos found</h2>
            <p className="egg-muted">
              We could not find any photos matching your selfie for this event. Contact your photographer if you think
              this is a mistake.
            </p>
          </div>
        )}

        {!loading && !error && photos.length > 0 && (
          <div className="egg-grid">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="egg-grid-item"
                onClick={() => setLightboxIndex(index)}
                aria-label={`Open ${photo.filename || 'photo'}`}
              >
                <img src={photo.thumbnail_url || photo.full_url} alt={photo.filename || ''} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </main>

      {activePhoto && (
        <div
          className="egg-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setLightboxIndex(-1)}
        >
          <button type="button" className="egg-lightbox-close" onClick={() => setLightboxIndex(-1)} aria-label="Close">
            ×
          </button>
          <button
            type="button"
            className="egg-lightbox-nav egg-lightbox-nav--prev"
            disabled={lightboxIndex <= 0}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => Math.max(0, i - 1));
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <img
            src={activePhoto.full_url || activePhoto.thumbnail_url}
            alt={activePhoto.filename || ''}
            className="egg-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="egg-lightbox-nav egg-lightbox-nav--next"
            disabled={lightboxIndex >= photos.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => Math.min(photos.length - 1, i + 1));
            }}
            aria-label="Next photo"
          >
            ›
          </button>
          <a
            href={activePhoto.full_url || activePhoto.thumbnail_url}
            download={activePhoto.filename || 'photo.jpg'}
            className="egg-lightbox-download"
            onClick={(e) => e.stopPropagation()}
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
