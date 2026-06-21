import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mobileGalleryPublicService } from '../../services/mobileGalleryPublic.service';
import {
  getAppClientLink,
  getAppInstallLink,
  isAndroidChrome,
  isIosSafari,
  isMobileDevice,
  isStandaloneDisplay,
} from '../../lib/mobileGalleryInstall';
import './MobileGalleryPublic.css';

function AppIcon({ app, className = '' }) {
  const initial = String(app?.name || 'A').trim().charAt(0).toUpperCase();
  const src = app?.icon_url || app?.cover_image_url;

  if (src) {
    return <img src={src} alt="" className={`mg-install-app-icon ${className}`.trim()} />;
  }

  return <div className={`mg-install-app-icon mg-install-app-icon--placeholder ${className}`.trim()}>{initial}</div>;
}

function PhoneIllustration() {
  return (
    <div className="mg-install-phone-illustration" aria-hidden>
      <div className="mg-install-phone-frame">
        <div className="mg-install-phone-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={`mg-install-phone-tile${i === 7 ? ' mg-install-phone-tile--active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InstallInstructions({ isIos, isAndroid }) {
  return (
    <div className="mg-install-tip-card">
      {isIos ? (
        <p>
          Tap <span className="mg-install-inline-icon" aria-hidden>⎙</span> Share, then{' '}
          <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install this app.
        </p>
      ) : isAndroid ? (
        <p>
          Tap <span className="mg-install-menu-dots" aria-hidden><span /><span /><span /></span> in the top right,
          then <strong>&ldquo;Add to Home Screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.
        </p>
      ) : (
        <p>
          Open your browser menu and choose <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install this app.
        </p>
      )}
      <p className="mg-install-tip-footnote">Don&apos;t see Add to Home Screen?</p>
    </div>
  );
}

const MobileGalleryInstall = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const mobile = useMemo(() => isMobileDevice(), []);
  const standalone = useMemo(() => isStandaloneDisplay(), []);
  const isIos = useMemo(() => isIosSafari(), []);
  const isAndroid = useMemo(() => isAndroidChrome(), []);

  useEffect(() => {
    if (standalone) {
      navigate(`/m/${slug}/view`, { replace: true });
    }
  }, [standalone, slug, navigate]);

  useEffect(() => {
    if (!slug || standalone) return undefined;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const appData = await mobileGalleryPublicService.getPublishedAppBySlug(slug);
        if (cancelled) return;

        if (!appData) {
          setNotFound(true);
          setApp(null);
          return;
        }

        setApp(appData);
        setNotFound(false);

        const [settings, photographer] = await Promise.all([
          mobileGalleryPublicService.getModuleBranding(appData.photographer_id),
          mobileGalleryPublicService.getPhotographerBranding(appData.photographer_id),
        ]);

        if (!cancelled) {
          setLogoUrl(settings?.logo_url || photographer?.profile_icon_url || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, standalone]);

  useEffect(() => {
    if (!app?.slug) return undefined;

    const manifest = {
      name: app.name,
      short_name: app.name?.slice(0, 12) || 'Gallery',
      description: `${app.name} mobile gallery`,
      start_url: `/m/${app.slug}/view`,
      scope: `/m/${app.slug}/`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#20a398',
      icons: app.icon_url
        ? [{ src: app.icon_url, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
        : [],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);

    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#20a398';
    document.head.appendChild(theme);

    document.title = app.name;

    return () => {
      URL.revokeObjectURL(url);
      link.remove();
      theme.remove();
    };
  }, [app]);

  if (standalone) {
    return null;
  }

  if (loading) {
    return <div className="mg-install-page"><p className="mg-install-loading">Loading…</p></div>;
  }

  if (notFound || !app) {
    return (
      <div className="mg-install-page">
        <div className="mg-install-center">
          <h1>Gallery not found</h1>
          <p>This install link may be invalid or the gallery is not published yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mg-install-page">
      <div className="mg-install-center">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="mg-install-brand-logo" />
        ) : (
          <div className="mg-install-brand-mark" aria-hidden />
        )}

        <AppIcon app={app} />
        <h1 className="mg-install-app-name">{app.name}</h1>

        {mobile ? (
          <>
            <InstallInstructions isIos={isIos} isAndroid={isAndroid} />
            <p className="mg-install-open-gallery">
              Already installed?{' '}
              <Link to={`/m/${slug}/view`}>Open gallery</Link>
            </p>
          </>
        ) : (
          <>
            <p className="mg-install-desktop-message">
              This mobile gallery app can only be installed on a mobile device. Please open this
              link on your mobile or tablet browser.
            </p>
            <PhoneIllustration />
            <p className="mg-install-desktop-url">{getAppInstallLink(slug, window.location.origin)}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileGalleryInstall;
