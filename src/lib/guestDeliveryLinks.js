import { getClientFacingOrigin } from './publicSiteUrl';

export function getGuestRegistrationUrl(slug, photographerProfile = null) {
  const origin = getClientFacingOrigin(photographerProfile);
  const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  return `${origin}/e/${encodeURIComponent(safeSlug)}/register`;
}

export function getGuestPersonalGalleryUrl(slug, accessToken, photographerProfile = null) {
  const origin = getClientFacingOrigin(photographerProfile);
  const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const token = String(accessToken || '').trim();
  return `${origin}/e/${encodeURIComponent(safeSlug)}/g/${encodeURIComponent(token)}`;
}
