/** Helpers for Showcase featured-work cards. */

export function showcaseDisplayName(collection) {
  const custom = String(collection?.showcase_display_name || '').trim();
  if (custom) return custom;
  return String(collection?.name || 'Untitled').trim() || 'Untitled';
}

export function showcaseContactName(collection) {
  const custom = String(collection?.showcase_permission_contact || '').trim();
  if (custom) return custom.split(/[\s,+/]+/)[0];

  const title = showcaseDisplayName(collection);
  const first = title.split(/\s*(?:&|x|×|\+)\s*/i)[0]?.trim() || title;
  return first.split(/\s+/)[0] || 'your client';
}

export function showcasePermission(collection) {
  const raw = String(collection?.showcase_permission || 'none').toLowerCase();
  if (raw === 'asked' || raw === 'approved') return raw;
  return 'none';
}

export function daysSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function showcaseFeaturedPhotoIds(collection) {
  const raw = collection?.showcase_featured_photo_ids;
  if (!Array.isArray(raw)) return null;
  const ids = raw.map(String).filter(Boolean);
  return ids.length ? ids : null;
}

export function showcasePhotoCount(collection) {
  const featured = showcaseFeaturedPhotoIds(collection);
  if (featured) return featured.length;
  return Number(collection?.photo_count) || 0;
}
