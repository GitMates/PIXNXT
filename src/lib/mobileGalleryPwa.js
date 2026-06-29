import { isIosSafari, isMobileDevice, isStandaloneDisplay } from './mobileGalleryInstall';
import { APPLE_TOUCH_ICON_SIZES, getAppleTouchIconUrl } from './mobileGalleryIcon';

export function getManifestUrl(slug) {
  if (!slug) return '';
  return `/m/${encodeURIComponent(slug)}/manifest.json`;
}

export function getPwaPath(slug) {
  if (!slug) return '';
  return `/m/${encodeURIComponent(slug)}/pwa`;
}

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export function buildWebManifest({ app, photographerName }) {
  const slug = app?.slug;
  const origin = getOrigin();
  const base = origin ? `${origin}/m/${encodeURIComponent(slug)}` : `/m/${slug}`;
  const remoteIcon = app?.icon_url || app?.cover_image_url || '';
  const iconType = /\.jpe?g($|\?)/i.test(remoteIcon)
    ? 'image/jpeg'
    : /\.webp($|\?)/i.test(remoteIcon)
      ? 'image/webp'
      : 'image/png';

  const description = photographerName
    ? `${app?.name || 'Gallery'} mobile gallery by ${photographerName}`
    : `${app?.name || 'Gallery'} mobile gallery`;

  return {
    id: `/m/${slug}/`,
    name: app?.name || 'Gallery',
    short_name: String(app?.name || 'Gallery').slice(0, 12),
    description,
    start_url: `${base}/pwa`,
    scope: `/m/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#20a398',
    icons: slug
      ? [
          { src: `${base}/icon-192.png`, sizes: '192x192', type: iconType, purpose: 'any' },
          { src: `${base}/icon-512.png`, sizes: '512x512', type: iconType, purpose: 'any' },
          { src: `${base}/icon-512.png`, sizes: '512x512', type: iconType, purpose: 'maskable' },
        ]
      : [],
  };
}

export function isInAppBrowser() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    if (/GSA|Gmail|FBIOS|FBAV|FBAN|Instagram|Line\//i.test(ua)) return true;
    if (/AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) return true;
  }

  if (/Android/i.test(ua) && /(wv|Instagram|FBAV|FBAN)/i.test(ua)) return true;
  return false;
}

export function shouldShowSafariInstallFlow() {
  return isIosSafari() && !isInAppBrowser();
}

export function shouldShowInstallPrompt() {
  return isMobileDevice() && !isInAppBrowser() && !isStandaloneDisplay();
}

export function ensurePwaUrl(slug) {
  if (!slug || typeof window === 'undefined') return;
  const pwaPath = getPwaPath(slug);
  const current = window.location.pathname.replace(/\/$/, '');
  const target = pwaPath.replace(/\/$/, '');
  if (current !== target || window.location.search) {
    window.history.replaceState({}, document.title, pwaPath);
  }
}

export function registerMobileGalleryServiceWorker(slug) {
  if (typeof window === 'undefined' || !slug) return;
  if (window !== window.top) return;
  if (!('serviceWorker' in navigator)) return;

  const scope = `/m/${encodeURIComponent(slug)}/`;
  navigator.serviceWorker.register('/m/sw.js', { scope }).catch(() => {});
}

export function applyAppleTouchIcons(slug) {
  if (!slug || typeof document === 'undefined') return { created: [], appTitle: null };

  const href = getAppleTouchIconUrl(slug);
  const created = [];

  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((node) => {
    node.remove();
  });

  APPLE_TOUCH_ICON_SIZES.forEach((size) => {
    const touchIcon = document.createElement('link');
    touchIcon.rel = 'apple-touch-icon';
    touchIcon.sizes = size;
    touchIcon.href = href;
    document.head.appendChild(touchIcon);
    created.push(touchIcon);
  });

  const defaultTouch = document.createElement('link');
  defaultTouch.rel = 'apple-touch-icon';
  defaultTouch.href = href;
  document.head.appendChild(defaultTouch);
  created.push(defaultTouch);

  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = `/m/${encodeURIComponent(slug)}/icon-192.png`;
  document.head.appendChild(favicon);
  created.push(favicon);

  const appTitle = document.createElement('meta');
  appTitle.name = 'apple-mobile-web-app-title';
  document.head.appendChild(appTitle);
  created.push(appTitle);

  return { created, appTitle };
}

export function applyMobileGalleryPwaHead({ app, slug, photographerName, logoUrl }) {
  if (!app || !slug || typeof document === 'undefined') return () => {};

  const created = [];

  document.title = app.name || 'Gallery';

  const { created: touchIcons, appTitle } = applyAppleTouchIcons(slug);
  created.push(...touchIcons);
  if (appTitle) appTitle.content = app.name || 'Gallery';

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    if (import.meta.env.DEV) {
      const blob = new Blob([JSON.stringify(buildWebManifest({ app, photographerName }))], {
        type: 'application/json',
      });
      manifestLink.href = URL.createObjectURL(blob);
    } else {
      manifestLink.href = getManifestUrl(slug);
    }
    document.head.appendChild(manifestLink);
    created.push(manifestLink);
  }

  registerMobileGalleryServiceWorker(slug);

  return () => {
    const manifestNode = created.find((n) => n.rel === 'manifest');
    if (manifestNode?.href?.startsWith('blob:')) {
      URL.revokeObjectURL(manifestNode.href);
    }
    created.forEach((node) => node.remove());
  };
}

export function replaceInstallUrlWithPwa(slug) {
  ensurePwaUrl(slug);
}
