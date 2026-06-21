import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { mobileGalleryPublicService } from '../../services/mobileGalleryPublic.service';
import { getAppInstallLink } from '../../lib/mobileGalleryInstall';
import { getAppCtaLink } from '../../lib/mobileGalleryAppSettings';
import { formatPreviewEventDate, getPreviewCoverUrl } from '../../lib/mobileGalleryPreviewFormat';
import '../mobile-gallery/MobileGallery.css';
import './MobileGalleryPublic.css';

const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);

const IconHeart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

const IconShare = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconProfile = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

function ClientBottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', Icon: IconHome },
    { id: 'favorites', label: 'Favorites', Icon: IconHeart },
    { id: 'share', label: 'Share', Icon: IconShare },
    { id: 'profile', label: 'Profile', Icon: IconProfile },
  ];

  return (
    <nav className="mg-preview-bottom-nav mg-client-bottom-nav" aria-label="App navigation">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`mg-preview-bottom-nav-item${activeTab === id ? ' mg-preview-bottom-nav-item--active' : ''}`}
          onClick={() => onTabChange(id)}
          aria-label={label}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon />
        </button>
      ))}
    </nav>
  );
}

const MobileGalleryClient = () => {
  const { slug } = useParams();
  const scrollRef = useRef(null);
  const photosRef = useRef(null);

  const [app, setApp] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const appData = await mobileGalleryPublicService.getPublishedAppBySlug(slug);
        if (!appData || cancelled) {
          if (!cancelled) setApp(null);
          return;
        }

        const [photoData, settingsData, photographerData] = await Promise.all([
          mobileGalleryPublicService.getPublishedAppPhotos(appData.id),
          mobileGalleryPublicService.getModuleBranding(appData.photographer_id),
          mobileGalleryPublicService.getPhotographerBranding(appData.photographer_id),
        ]);

        if (!cancelled) {
          setApp(appData);
          setPhotos(photoData);
          setSettings(settingsData);
          setPhotographer(photographerData);
          document.title = appData.name;
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setApp(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const coverUrl = useMemo(() => getPreviewCoverUrl(app, photos), [app, photos]);
  const shareUrl = useMemo(
    () => (app?.slug ? getAppInstallLink(app.slug) : ''),
    [app?.slug]
  );
  const ctaLink = useMemo(() => getAppCtaLink(app, null), [app]);
  const showBranding = settings?.show_pixnxt_branding !== false;
  const profileIconUrl = settings?.logo_url || photographer?.profile_icon_url || null;
  const eventLabel = formatPreviewEventDate(app?.event_date);
  const title = String(app?.name || '').toUpperCase();

  const handleViewPhotos = () => {
    photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div className="mg-client-page"><p className="mg-install-loading">Loading…</p></div>;
  }

  if (!app) {
    return (
      <div className="mg-client-page">
        <p className="mg-install-loading">Gallery not found.</p>
      </div>
    );
  }

  return (
    <div className="mg-client-page">
      <div className="mg-client-shell">
        {activeTab === 'home' && (
          <div className="mg-preview-home-scroll mg-client-scroll" ref={scrollRef}>
            <div
              className="mg-preview-home"
              style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
            >
              <div className="mg-preview-home-overlay" />
              <div className="mg-preview-home-content">
                {eventLabel && <p className="mg-preview-home-date">{eventLabel}</p>}
                <h1 className="mg-preview-home-title">{title}</h1>
                <button type="button" className="mg-preview-home-cta" onClick={handleViewPhotos}>
                  View Photos
                </button>
              </div>
            </div>

            <div className="mg-preview-home-body" ref={photosRef}>
              {photos.length === 0 ? (
                <div className="mg-preview-home-empty-photos">
                  <p>No photos yet</p>
                </div>
              ) : (
                <div className="mg-preview-home-photo-grid">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="mg-preview-home-photo-cell"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      <img src={photo.thumbnail_url || photo.full_url} alt="" />
                    </button>
                  ))}
                </div>
              )}

              {ctaLink && (
                <a
                  href={ctaLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mg-preview-visit-website"
                >
                  {ctaLink.label}
                </a>
              )}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="mg-preview-panel-empty mg-preview-panel-empty--favorites">
            <IconHeart />
            <p className="mg-preview-empty-heading">No Favorites</p>
            <span>Mark photos as favorites to see them here.</span>
          </div>
        )}

        {activeTab === 'share' && (
          <div className="mg-preview-share-screen">
            <div className="mg-preview-share-card">
              <button
                type="button"
                className="mg-preview-share-option"
                onClick={() => {
                  const body = encodeURIComponent(`View the gallery here:\n${shareUrl}`);
                  window.location.href = `mailto:?subject=${encodeURIComponent(app.name)}&body=${body}`;
                }}
              >
                Share by email
              </button>
              <button
                type="button"
                className="mg-preview-share-option"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
              >
                Copy install link
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="mg-preview-profile-screen">
            <div className="mg-preview-profile-header">
              <div className="mg-preview-profile-icon">
                {profileIconUrl ? <img src={profileIconUrl} alt="" /> : null}
              </div>
              <h2 className="mg-preview-profile-name">{title}</h2>
            </div>
            {showBranding && <p className="mg-preview-powered-by">Powered by PIXNXT</p>}
          </div>
        )}

        <ClientBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="mg-preview-lightbox"
          onClick={() => setLightboxIndex(null)}
          role="presentation"
        >
          <img
            src={photos[lightboxIndex].full_url || photos[lightboxIndex].thumbnail_url}
            alt=""
          />
        </div>
      )}
    </div>
  );
};

export default MobileGalleryClient;
