import { getPublicSiteOrigin } from './publicSiteUrl';

const INSTALL_PATH = '/m';

export function getAppInstallLink(slug, siteOrigin) {
  if (!slug) return '';
  const origin = siteOrigin || getPublicSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${String(origin).replace(/\/$/, '')}${INSTALL_PATH}/${encodeURIComponent(slug)}`;
}

export function getAppClientLink(slug, siteOrigin) {
  if (!slug) return '';
  const origin = siteOrigin || getPublicSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${String(origin).replace(/\/$/, '')}${INSTALL_PATH}/${encodeURIComponent(slug)}/view`;
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
