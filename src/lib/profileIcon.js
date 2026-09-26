import { resolveMediaUrl } from './photoDisplayUrl';

const CACHE_PREFIX = 'pixnxt_profile_icon_';
const preloaded = new Set();

/** Prefer uploaded profile icon, then legacy avatar_url. */
export function resolveProfileIconUrl(profile) {
  if (!profile || typeof profile !== 'object') return '';
  const raw =
    (typeof profile.profile_icon_url === 'string' && profile.profile_icon_url.trim()) ||
    (typeof profile.avatar_url === 'string' && profile.avatar_url.trim()) ||
    (typeof profile.profileIconUrl === 'string' && profile.profileIconUrl.trim()) ||
    '';
  return resolveMediaUrl(raw) || '';
}

export function readCachedProfileIcon(userId) {
  if (!userId || typeof window === 'undefined') return '';
  try {
    return String(localStorage.getItem(`${CACHE_PREFIX}${userId}`) || '').trim();
  } catch {
    return '';
  }
}

export function writeCachedProfileIcon(userId, url) {
  if (!userId || typeof window === 'undefined') return;
  const resolved = resolveMediaUrl(url) || '';
  try {
    if (resolved) localStorage.setItem(`${CACHE_PREFIX}${userId}`, resolved);
    else localStorage.removeItem(`${CACHE_PREFIX}${userId}`);
  } catch {
    /* ignore quota */
  }
  if (resolved) preloadProfileIcon(resolved);
}

/** Warm the browser cache so avatars paint on the next route without waiting. */
export function preloadProfileIcon(url) {
  const src = resolveMediaUrl(url);
  if (!src || typeof window === 'undefined' || preloaded.has(src)) return;
  preloaded.add(src);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.src = src;
  } catch {
    /* ignore */
  }
}

/**
 * Best icon URL for a studio user:
 * 1) live profile fields
 * 2) cached URL from last successful profile load
 */
export function getStudioProfileIconSrc(profile, userId) {
  const live = resolveProfileIconUrl(profile);
  if (live) {
    if (userId) writeCachedProfileIcon(userId, live);
    else preloadProfileIcon(live);
    return live;
  }
  const cached = readCachedProfileIcon(userId || profile?.id);
  if (cached) {
    preloadProfileIcon(cached);
    return cached;
  }
  return '';
}

/** Persist icon URL whenever a full photographer profile is written to localStorage. */
export function syncProfileIconCacheFromProfile(profile) {
  if (!profile?.id) return;
  const url = resolveProfileIconUrl(profile);
  writeCachedProfileIcon(profile.id, url);
}
