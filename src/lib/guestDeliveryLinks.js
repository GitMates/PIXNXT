import { getPublicSiteOrigin } from './publicSiteUrl';

export function getGuestRegistrationUrl(slug) {
  const origin = getPublicSiteOrigin();
  const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  return `${origin}/e/${encodeURIComponent(safeSlug)}/register`;
}

export function getGuestPersonalGalleryUrl(slug, accessToken) {
  const origin = getPublicSiteOrigin();
  const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const token = String(accessToken || '').trim();
  return `${origin}/e/${encodeURIComponent(safeSlug)}/g/${encodeURIComponent(token)}`;
}
