const INSTALL_PATH = '/m';

export function isLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  } catch {
    return true;
  }
}

export function resolveInstallOrigin(siteOrigin) {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const browserOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/$/, '')
      : '';
  const passed = String(siteOrigin || '').replace(/\/$/, '');

  // Prefer the live custom domain (e.g. pixnxt.in) over a stale vercel.app value baked at build time.
  const candidates = [browserOrigin, fromEnv, passed].filter(Boolean);
  const productionOrigin = candidates.find(
    (origin) => !isLocalOrigin(origin) && !/vercel\.app/i.test(origin)
  );
  if (productionOrigin) return productionOrigin;

  return candidates[0] || '';
}

export function getAppInstallLink(slug, siteOrigin) {
  if (!slug) return '';
  const origin = resolveInstallOrigin(siteOrigin);
  if (!origin) return '';
  return `${origin}${INSTALL_PATH}/${encodeURIComponent(slug)}/`;
}

export function getAppClientLink(slug, siteOrigin) {
  if (!slug) return '';
  const origin = resolveInstallOrigin(siteOrigin);
  if (!origin) return '';
  return `${origin}${INSTALL_PATH}/${encodeURIComponent(slug)}/pwa`;
}

export function isValidInstallLink(url) {
  return /^https?:\/\/[^/\s?#]+\/m\/[^/\s?#]+\/?$/i.test(String(url || '').trim());
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  return navigator.maxTouchPoints > 1 && window.innerWidth < 900;
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

export function isAndroidChrome() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) && /Chrome/i.test(ua);
}
