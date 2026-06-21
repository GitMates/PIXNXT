import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { galleryService } from '../../services/gallery.service';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import { mobileGalleryPhotosService } from '../../services/mobileGalleryPhotos.service';
import { mobileGallerySettingsService } from '../../services/mobileGallerySettings.service';
import { sortMobileGalleryPhotos } from '../../lib/mobileGalleryPhotoSort';
import {
  formatPreviewEventDate,
  getPreviewCoverUrl,
  getPreviewShareUrl,
  getPreviewWebsiteLink,
} from '../../lib/mobileGalleryPreviewFormat';
import { getAppCtaLink } from '../../lib/mobileGalleryAppSettings';
import './MobileGallery.css';

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

const IconPhone = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1" y="1" width="16" height="20" rx="2.5" />
    <line x1="7" y1="18" x2="11" y2="18" />
  </svg>
);

const IconTablet = () => (
  <svg width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1" y="1" width="20" height="24" rx="2" />
    <line x1="8" y1="22" x2="14" y2="22" />
  </svg>
);

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

function PreviewBottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', Icon: IconHome },
    { id: 'favorites', label: 'Favorites', Icon: IconHeart },
    { id: 'share', label: 'Share', Icon: IconShare },
    { id: 'profile', label: 'Profile', Icon: IconProfile },
  ];

  return (
    <nav className="mg-preview-bottom-nav" aria-label="App navigation">
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

function PreviewHomeFeed({ app, coverUrl, photos, ctaLink, photosRef, scrollRef, onViewPhotos }) {
  const eventLabel = formatPreviewEventDate(app.event_date);
  const title = String(app.name || '').toUpperCase();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return (
    <div className="mg-preview-home-scroll" ref={scrollRef}>
      <div
        className="mg-preview-home"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
      >
        <div className="mg-preview-home-overlay" />
        <div className="mg-preview-home-content">
          {eventLabel && <p className="mg-preview-home-date">{eventLabel}</p>}
          <h1 className="mg-preview-home-title">{title}</h1>
          <button type="button" className="mg-preview-home-cta" onClick={onViewPhotos}>
            View Photos
          </button>
        </div>
      </div>

      <div className="mg-preview-home-body" ref={photosRef}>
        {photos.length === 0 ? (
          <div className="mg-preview-home-empty-photos">
            <p>No photos yet</p>
            <span>Add photos in the editor to preview your gallery.</span>
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
}

function PreviewFavoritesScreen() {
  return (
    <div className="mg-preview-panel-empty mg-preview-panel-empty--favorites">
      <IconHeart />
      <p className="mg-preview-empty-heading">No Favorites</p>
      <span>Mark some of your photos as your favorites to see them collected here.</span>
    </div>
  );
}

function PreviewShareScreen({ app, shareUrl, coverUrl }) {
  const shareText = encodeURIComponent(`Check out ${app?.name || 'my gallery'}!`);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedImage = encodeURIComponent(coverUrl || '');

  const options = [
    {
      id: 'email',
      label: 'Email',
      icon: <IconMail />,
      action: () => {
        const subject = encodeURIComponent(`Mobile Gallery App: ${app?.name || 'Gallery'}`);
        const body = encodeURIComponent(`View the gallery app here:\n${shareUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      },
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          '_blank',
          'noopener,noreferrer,width=600,height=400'
        );
      },
    },
    {
      id: 'x',
      label: 'X',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`,
          '_blank',
          'noopener,noreferrer,width=600,height=400'
        );
      },
    },
    {
      id: 'pinterest',
      label: 'Pinterest',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${shareText}`,
          '_blank',
          'noopener,noreferrer,width=600,height=400'
        );
      },
    },
  ];

  return (
    <div className="mg-preview-share-screen">
      <div className="mg-preview-share-card">
        {options.map((opt) => (
          <button key={opt.id} type="button" className="mg-preview-share-option" onClick={opt.action}>
            <span className="mg-preview-share-option-icon">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewProfileScreen({ app, websiteLink, showBranding, profileIconUrl }) {
  const title = String(app?.name || '').toUpperCase();

  return (
    <div className="mg-preview-profile-screen">
      <div className="mg-preview-profile-header">
        <div className="mg-preview-profile-icon">
          {profileIconUrl ? (
            <img src={profileIconUrl} alt="" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.2" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <h2 className="mg-preview-profile-name">{title}</h2>
        {websiteLink && (
          <a
            href={websiteLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mg-preview-profile-website"
          >
            <IconGlobe />
            {websiteLink.label}
          </a>
        )}
      </div>
      {showBranding && (
        <p className="mg-preview-powered-by">Powered by PIXNXT</p>
      )}
    </div>
  );
}

const AppPreview = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const scrollRef = useRef(null);
  const photosRef = useRef(null);

  const [app, setApp] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState('phone');
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [appData, photoData, profileData, settingsData] = await Promise.all([
          mobileGalleryService.getApp(user.id, appId),
          mobileGalleryPhotosService.getPhotos(user.id, appId),
          galleryService.getPhotographerProfile(user.id),
          mobileGallerySettingsService.getSettings(user.id),
        ]);
        if (!cancelled) {
          setApp(appData);
          setPhotos(sortMobileGalleryPhotos(photoData, 'position'));
          setProfile(profileData);
          setSettings(settingsData);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setApp(null);
          setPhotos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, appId]);

  const coverUrl = useMemo(() => getPreviewCoverUrl(app, photos), [app, photos]);
  const websiteLink = useMemo(
    () => (profile ? getPreviewWebsiteLink(profile, user) : null),
    [profile, user]
  );
  const ctaLink = useMemo(
    () => getAppCtaLink(app, websiteLink),
    [app, websiteLink]
  );
  const shareUrl = useMemo(() => getPreviewShareUrl(app), [app]);
  const showBranding = settings?.show_pixnxt_branding !== false;

  const handleBack = () => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (scrollRef.current && scrollRef.current.scrollTop > 20) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`/mobile-gallery/app/${appId}`);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const handleViewPhotos = () => {
    setActiveTab('home');
    photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="mg-preview-page">
        <p className="mg-preview-loading">Loading preview…</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mg-preview-page">
        <p className="mg-preview-loading">App not found.</p>
        <button type="button" className="mg-preview-back-btn" onClick={() => navigate('/mobile-gallery')}>
          Back to Apps
        </button>
      </div>
    );
  }

  return (
    <div className="mg-preview-page">
      <header className="mg-preview-toolbar">
        <button type="button" className="mg-preview-back-btn" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="mg-preview-device-toggles" role="group" aria-label="Preview device">
          <button
            type="button"
            className={`mg-preview-device-toggle${device === 'phone' ? ' mg-preview-device-toggle--active' : ''}`}
            onClick={() => setDevice('phone')}
            aria-label="Phone preview"
            aria-pressed={device === 'phone'}
          >
            <IconPhone />
          </button>
          <button
            type="button"
            className={`mg-preview-device-toggle${device === 'tablet' ? ' mg-preview-device-toggle--active' : ''}`}
            onClick={() => setDevice('tablet')}
            aria-label="Tablet preview"
            aria-pressed={device === 'tablet'}
          >
            <IconTablet />
          </button>
        </div>
      </header>

      <div className="mg-preview-stage">
        <div className={`mg-preview-frame mg-preview-frame--${device}`}>
          <div className="mg-preview-frame-screen">
            {activeTab === 'home' && (
              <PreviewHomeFeed
                app={app}
                coverUrl={coverUrl}
                photos={photos}
                ctaLink={ctaLink}
                scrollRef={scrollRef}
                photosRef={photosRef}
                onViewPhotos={handleViewPhotos}
              />
            )}
            {activeTab === 'favorites' && <PreviewFavoritesScreen />}
            {activeTab === 'share' && (
              <PreviewShareScreen app={app} shareUrl={shareUrl} coverUrl={coverUrl} />
            )}
            {activeTab === 'profile' && (
              <PreviewProfileScreen
                app={app}
                websiteLink={websiteLink}
                showBranding={showBranding}
                profileIconUrl={profile?.profile_icon_url || settings?.logo_url}
              />
            )}

            <PreviewBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>
      </div>

      <p className="mg-preview-hint">Scroll and click to preview your gallery app.</p>
    </div>
  );
};

export default AppPreview;
