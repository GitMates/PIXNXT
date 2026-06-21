import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mobileGalleryPublicService } from '../../services/mobileGalleryPublic.service';
import {
  getAppInstallLink,
  isAndroidChrome,
  isMobileDevice,
  isStandaloneDisplay,
} from '../../lib/mobileGalleryInstall';
import {
  applyMobileGalleryPwaHead,
  isInAppBrowser,
  replaceInstallUrlWithPwa,
  shouldShowSafariInstallFlow,
} from '../../lib/mobileGalleryPwa';
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

function InstallCallout({ showCopyLink, installUrl, isIos, isAndroid }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mg-install-callout">
      {showCopyLink ? (
        <>
          <p className="mg-install-callout-label">Browser not supported</p>
          <p className="mg-install-callout-text">
            Tap the &ldquo;Copy Link&rdquo; button below and open this page directly in the{' '}
            <strong>Safari browser app</strong>.
          </p>
          <button
            type="button"
            className={`mg-install-copy-btn${copied ? ' mg-install-copy-btn--copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </>
      ) : (
        <>
          {isIos ? (
            <p className="mg-install-callout-text">
              Tap <span className="mg-install-share-icon" aria-hidden>⎙</span> Share, then{' '}
              <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install this app.
            </p>
          ) : isAndroid ? (
            <p className="mg-install-callout-text">
              Tap <span className="mg-install-menu-dots" aria-hidden><span /><span /><span /></span> in the top right,
              then <strong>&ldquo;Add to Home Screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.
            </p>
          ) : (
            <p className="mg-install-callout-text">
              Open your browser menu and choose <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install this app.
            </p>
          )}
          <button
            type="button"
            className="mg-install-copy-btn mg-install-copy-btn--hidden"
            tabIndex={-1}
            aria-hidden
          >
            Copy Link
          </button>
          <p className="mg-install-help" title="Make sure you're opening this page directly in the Safari browser app.">
            Don&apos;t see Add to Home Screen?
          </p>
        </>
      )}
    </div>
  );
}

const MobileGalleryInstall = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [photographerName, setPhotographerName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const mobile = useMemo(() => isMobileDevice(), []);
  const standalone = useMemo(() => isStandaloneDisplay(), []);
  const inAppBrowser = useMemo(() => isInAppBrowser(), []);
  const safariInstallFlow = useMemo(() => shouldShowSafariInstallFlow(), []);
  const isAndroid = useMemo(() => isAndroidChrome(), []);
  const installUrl = useMemo(
    () => (slug ? getAppInstallLink(slug, window.location.origin) : ''),
    [slug]
  );

  useEffect(() => {
    if (standalone && slug) {
      navigate(`/m/${slug}/pwa`, { replace: true });
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
          setPhotographerName(
            photographer?.business_name?.trim() ||
              photographer?.display_name?.trim() ||
              null
          );
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
    return applyMobileGalleryPwaHead({ app, slug: app.slug, photographerName, logoUrl });
  }, [app, photographerName, logoUrl]);

  useEffect(() => {
    if (!slug || !mobile || !safariInstallFlow || standalone) return;
    replaceInstallUrlWithPwa(slug);
  }, [slug, mobile, safariInstallFlow, standalone]);

  if (standalone) {
    return null;
  }

  if (loading) {
    return <div className="mg-install-page"><p className="mg-install-loading">Loading…</p></div>;
  }

  if (notFound || !app) {
    return (
      <div className="mg-install-page">
        <div className="mg-install-shell">
          <h1>Gallery not found</h1>
          <p>This install link may be invalid or the gallery is not published yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mg-install-page">
      <div className="mg-install-shell">
        <header className="mg-install-header">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="mg-install-brand-logo" />
          ) : (
            <div className="mg-install-brand-mark" aria-hidden />
          )}
        </header>

        <div className="mg-install-hero">
          <AppIcon app={app} />
          <h1 className="mg-install-app-name">{app.name}</h1>
        </div>

        {mobile ? (
          <>
            <InstallCallout
              showCopyLink={inAppBrowser}
              installUrl={installUrl}
              isIos={safariInstallFlow}
              isAndroid={isAndroid}
            />
            <p className="mg-install-open-gallery">
              Already installed?{' '}
              <Link to={`/m/${slug}/pwa`}>Open gallery</Link>
            </p>
          </>
        ) : (
          <div className="mg-install-desktop">
            <p className="mg-install-desktop-message">
              This mobile gallery app can only be installed on a mobile device. Please open this
              link on your mobile or tablet browser.
            </p>
            <PhoneIllustration />
            <p className="mg-install-desktop-url">{installUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileGalleryInstall;
