import { getPublicSiteOrigin } from './publicSiteUrl';
import {
  getPlatformRootDomain,
  isCustomDomainVerified,
  normalizeCustomDomain,
} from './customDomain';

export function getShowcaseSlug(profile, user) {
  return (
    profile?.showcase_slug ||
    user?.email?.split('@')[0] ||
    'gallery'
  ).toLowerCase();
}

/**
 * Public showcase URL for a photographer portfolio.
 * Production uses /p/{slug} on the main domain — wildcard *.pixnxt.in DNS is not configured.
 * Local dev uses {slug}.localhost subdomain routing.
 */
export function buildShowcaseUrl(profile, user) {
  const slug = getShowcaseSlug(profile, user);

  if (typeof window === 'undefined') {
    const root = getPlatformRootDomain();
    return `https://www.${root}/p/${encodeURIComponent(slug)}`;
  }

  const host = window.location.host;
  const protocol = window.location.protocol;

  if (isCustomDomainVerified(profile)) {
    return `https://${normalizeCustomDomain(profile.custom_domain)}/`;
  }

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const baseHost = host.replace(/^[a-zA-Z0-9-]+\.localhost/, 'localhost');
    return `${protocol}//${slug}.${baseHost}/`;
  }

  const origin = getPublicSiteOrigin() || `${protocol}//${host}`;
  return `${origin.replace(/\/+$/, '')}/p/${encodeURIComponent(slug)}`;
}
