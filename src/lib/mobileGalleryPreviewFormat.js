import { getAppInstallLink } from './mobileGalleryInstall';

export function formatPreviewEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';

  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const day = d.getDate();
  const year = d.getFullYear();
  const suffix =
    day > 3 && day < 21 ? 'TH' : { 1: 'ST', 2: 'ND', 3: 'RD' }[day % 10] || 'TH';

  return `${month} ${day}${suffix}, ${year}`;
}

export function getPreviewCoverUrl(app, photos) {
  const firstPhoto = photos?.[0];
  return (
    firstPhoto?.full_url ||
    firstPhoto?.thumbnail_url ||
    app?.cover_image_url ||
    app?.icon_url ||
    null
  );
}

/** Cover wallpaper only — never falls back to app icon. */
export function getWallpaperUrl(app, photos, coverOverride) {
  if (coverOverride) return coverOverride;
  if (app?.cover_image_url) return app.cover_image_url;
  const firstPhoto = photos?.[0];
  return firstPhoto?.full_url || firstPhoto?.thumbnail_url || null;
}

export function buildPreviewHomepageUrl(profile, user) {
  const slug = (profile?.homepage_slug || user?.email?.split('@')[0] || 'gallery').toLowerCase();
  const host = window.location.host;
  const protocol = window.location.protocol;

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const baseHost = host.replace(/^[a-zA-Z0-9-]+\.localhost/, 'localhost');
    return `${protocol}//${slug}.${baseHost}/`;
  }

  if (host.endsWith('.vercel.app')) {
    return `${protocol}//${host}/p/${slug}`;
  }

  const hostWithoutSubdomain = host.replace(/^(www\.|[a-zA-Z0-9-]+\.)/i, '');
  return `${protocol}//${slug}.${hostWithoutSubdomain}/`;
}

export function getPreviewWebsiteLink(profile, user) {
  const rawWebsite = String(profile?.website || '').trim();
  if (rawWebsite) {
    const href = rawWebsite.startsWith('http') ? rawWebsite : `https://${rawWebsite}`;
    try {
      const parsed = new URL(href);
      const label = `${parsed.host.replace(/^www\./, '')}${parsed.pathname === '/' ? '/' : parsed.pathname}`;
      return { href, label };
    } catch {
      return { href, label: rawWebsite };
    }
  }

  const href = buildPreviewHomepageUrl(profile, user);
  try {
    const parsed = new URL(href);
    return { href, label: `${parsed.host.replace(/^www\./, '')}/` };
  } catch {
    return { href, label: href };
  }
}

export function getPreviewShareUrl(appOrSlug) {
  if (!appOrSlug) return '';
  const slug = typeof appOrSlug === 'string' ? appOrSlug : appOrSlug?.slug;
  if (slug) return getAppInstallLink(slug);
  const appId = typeof appOrSlug === 'string' ? appOrSlug : appOrSlug?.id;
  return `${window.location.origin}/mobile-gallery/app/${appId}/preview`;
}
