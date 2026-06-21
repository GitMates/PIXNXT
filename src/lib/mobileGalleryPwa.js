import { isIosSafari } from './mobileGalleryInstall';

export function getManifestUrl(slug) {
  if (!slug) return '';
  return `/m/${encodeURIComponent(slug)}/manifest.json`;
}

export function getPwaPath(slug) {
  if (!slug) return '';
  return `/m/${encodeURIComponent(slug)}/pwa`;
}

export function buildWebManifest({ app, photographerName }) {
  const iconUrl = app?.icon_url || app?.cover_image_url || null;
  const slug = app?.slug;
  const description = photographerName
    ? `${app?.name || 'Gallery'} mobile gallery by ${photographerName}`
    : `${app?.name || 'Gallery'} mobile gallery`;

  return {
    name: app?.name || 'Gallery',
    short_name: String(app?.name || 'Gallery').slice(0, 12),
    description,
    start_url: './pwa',
    scope: `/m/${slug}/`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#20a398',
    icons: iconUrl
      ? [
          {
            src: iconUrl,
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ]
      : [],
  };
}

/** Gmail, Instagram, Facebook, etc. — cannot install PWA from these browsers on iOS. */
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

export function registerMobileGalleryServiceWorker(slug) {
  if (typeof window === 'undefined' || !slug) return undefined;
  if (window !== window.top) return undefined;
  if (!('serviceWorker' in navigator)) return undefined;

  const scope = `/m/${encodeURIComponent(slug)}/`;

  const register = () => {
    navigator.serviceWorker
      .register('/m/sw.js', { scope })
      .catch((err) => console.warn('MG service worker registration failed', err));
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }

  return undefined;
}

export function applyMobileGalleryPwaHead({ app, slug, photographerName, logoUrl }) {
  if (!app || !slug || typeof document === 'undefined') return () => {};

  const iconUrl = app.icon_url || app.cover_image_url;
  const created = [];

  document.title = app.name || 'Gallery';

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

  const themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#20a398';
  document.head.appendChild(themeColor);
  created.push(themeColor);

  const appleCapable = document.createElement('meta');
  appleCapable.name = 'apple-mobile-web-app-capable';
  appleCapable.content = 'yes';
  document.head.appendChild(appleCapable);
  created.push(appleCapable);

  const appleStatus = document.createElement('meta');
  appleStatus.name = 'apple-mobile-web-app-status-bar-style';
  appleStatus.content = 'default';
  document.head.appendChild(appleStatus);
  created.push(appleStatus);

  const mobileCapable = document.createElement('meta');
  mobileCapable.name = 'mobile-web-app-capable';
  mobileCapable.content = 'yes';
  document.head.appendChild(mobileCapable);
  created.push(mobileCapable);

  if (iconUrl) {
    const touchIcon = document.createElement('link');
    touchIcon.rel = 'apple-touch-icon';
    touchIcon.href = iconUrl;
    document.head.appendChild(touchIcon);
    created.push(touchIcon);
  }

  const description = buildWebManifest({ app, photographerName }).description;
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogDescription) {
    ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    document.head.appendChild(ogDescription);
    created.push(ogDescription);
  }
  ogDescription.content = description;

  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
    created.push(ogTitle);
  }
  ogTitle.content = app.name || 'Gallery';

  if (iconUrl) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
      created.push(ogImage);
    }
    ogImage.content = iconUrl;
  }

  if (logoUrl) {
    let ogSite = document.querySelector('meta[property="og:site_name"]');
    if (!ogSite) {
      ogSite = document.createElement('meta');
      ogSite.setAttribute('property', 'og:site_name');
      document.head.appendChild(ogSite);
      created.push(ogSite);
    }
    ogSite.content = photographerName || 'PIXNXT';
  }

  registerMobileGalleryServiceWorker(slug);

  return () => {
    if (import.meta.env.DEV && manifestLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(manifestLink.href);
    }
    created.forEach((node) => node.remove());
  };
}

export function replaceInstallUrlWithPwa(slug) {
  if (!slug || typeof window === 'undefined') return;
  const pwaPath = getPwaPath(slug);
  if (window.location.pathname !== pwaPath) {
    window.history.replaceState({}, document.title, pwaPath);
  }
}
