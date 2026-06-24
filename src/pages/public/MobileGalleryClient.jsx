import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { mobileGalleryPublicService } from '../../services/mobileGalleryPublic.service';
import { getAppInstallLink } from '../../lib/mobileGalleryInstall';
import { getAppCtaLink } from '../../lib/mobileGalleryAppSettings';
import { applyMobileGalleryPwaHead } from '../../lib/mobileGalleryPwa';
import MobileGalleryClientHome from '../../components/mobile-gallery/MobileGalleryClientHome';
import { useMobileGalleryGridPhotos } from '../../components/mobile-gallery/MobileGalleryPhotoGrid';
import { getAppDesignSettings } from '../../lib/mobileGalleryDesign';
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

function ClientBottomNav({ activeTab, onTabChange, isDark }) {
  const tabs = [
    { id: 'home', label: 'Home', Icon: IconHome },
    { id: 'favorites', label: 'Favorites', Icon: IconHeart },
    { id: 'share', label: 'Share', Icon: IconShare },
    { id: 'profile', label: 'Profile', Icon: IconProfile },
  ];

  return (
    <nav
      className={`mg-design-bottom-nav mg-client-bottom-nav${isDark ? ' mg-design-bottom-nav--dark' : ''}`}
      aria-label="App navigation"
    >
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

  const design = useMemo(() => (app ? getAppDesignSettings(app) : null), [app]);
  const isDark = design?.color_theme === 'dark';
  const gridStyle = design?.grid_style || 'vertical';
  const { sortedPhotos } = useMobileGalleryGridPhotos(photos, gridStyle);

  const shareUrl = useMemo(
    () => (app?.slug ? getAppInstallLink(app.slug) : ''),
    [app?.slug]
  );
  const ctaLink = useMemo(() => getAppCtaLink(app, null), [app]);
  const showBranding = settings?.show_pixnxt_branding !== false;
  const profileIconUrl = settings?.logo_url || photographer?.profile_icon_url || null;
  const title = String(app?.name || '').toUpperCase();
  const photographerName =
    photographer?.business_name?.trim() || photographer?.display_name?.trim() || null;

  useEffect(() => {
    if (!app?.slug) return undefined;
    return applyMobileGalleryPwaHead({ app, slug: app.slug, photographerName, logoUrl: profileIconUrl });
  }, [app, photographerName, profileIconUrl]);

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
    <div className={`mg-client-page${isDark ? ' mg-client-page--dark' : ''}`}>
      <div className="mg-client-shell">
        {activeTab === 'home' && (
          <MobileGalleryClientHome
            app={app}
            photos={photos}
            scrollRef={scrollRef}
            photosRef={photosRef}
            ctaLink={ctaLink}
            onPhotoClick={(index) => setLightboxIndex(index)}
          />
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

        <ClientBottomNav activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} />
      </div>

      {lightboxIndex !== null && sortedPhotos[lightboxIndex] && (
        <div
          className="mg-preview-lightbox"
          onClick={() => setLightboxIndex(null)}
          role="presentation"
        >
          <img
            src={sortedPhotos[lightboxIndex].full_url || sortedPhotos[lightboxIndex].thumbnail_url}
            alt=""
          />
        </div>
      )}
    </div>
  );
};

export default MobileGalleryClient;
