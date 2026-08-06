/**
 * Client Gallery photographer upload defaults.
 * Source of truth: photographers table; localStorage is a cache for upload workers.
 */

export const UPLOAD_DEFAULTS_KEYS = {
  defaultLanguage: 'default_language',
  filenameDisplay: 'filename_display',
  webDisplayQuality: 'web_display_quality',
  sharpenForWeb: 'sharpen_for_web',
  sharpeningLevel: 'sharpening_level',
  uploadQuality: 'upload_quality',
  rawPhotoSupport: 'raw_photo_support',
};

const WEB_EDGE = {
  standard: 1600,
  high: 2048,
  maximum: 3200,
};

function readLs(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v == null || v === '' ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeLs(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

export function resolveUploadDefaults(profile) {
  const sharpenForWeb =
    profile?.sharpen_for_web !== undefined && profile?.sharpen_for_web !== null
      ? !!profile.sharpen_for_web
      : readLs(UPLOAD_DEFAULTS_KEYS.sharpenForWeb, 'true') !== 'false';

  let sharpeningLevel =
    profile?.sharpening_level ||
    readLs(UPLOAD_DEFAULTS_KEYS.sharpeningLevel, sharpenForWeb ? 'high' : 'none');

  if (profile?.sharpen_for_web !== undefined && profile?.sharpen_for_web !== null) {
    sharpeningLevel = sharpenForWeb
      ? sharpeningLevel === 'none'
        ? 'high'
        : sharpeningLevel
      : 'none';
  }

  const webDisplayQuality =
    profile?.web_display_quality ||
    readLs(UPLOAD_DEFAULTS_KEYS.webDisplayQuality, 'high');

  return {
    defaultLanguage:
      profile?.default_language || readLs(UPLOAD_DEFAULTS_KEYS.defaultLanguage, 'english'),
    filenameDisplay:
      profile?.filename_display || readLs(UPLOAD_DEFAULTS_KEYS.filenameDisplay, 'show'),
    webDisplayQuality:
      webDisplayQuality === 'standard' || webDisplayQuality === 'maximum'
        ? webDisplayQuality
        : 'high',
    sharpenForWeb,
    sharpeningLevel:
      sharpeningLevel === 'none' || sharpeningLevel === 'optimal' || sharpeningLevel === 'high'
        ? sharpeningLevel
        : 'high',
    uploadQuality:
      profile?.upload_quality || readLs(UPLOAD_DEFAULTS_KEYS.uploadQuality, 'original'),
    rawPhotoSupport:
      profile?.raw_photo_support !== undefined && profile?.raw_photo_support !== null
        ? !!profile.raw_photo_support
        : readLs(UPLOAD_DEFAULTS_KEYS.rawPhotoSupport, 'false') === 'true',
  };
}

/** Keep upload pipeline localStorage in sync after DB save / profile load. */
export function syncUploadDefaultsToLocalStorage(profileOrDefaults) {
  const d =
    profileOrDefaults &&
    (profileOrDefaults.defaultLanguage !== undefined ||
      profileOrDefaults.default_language !== undefined)
      ? profileOrDefaults.defaultLanguage !== undefined
        ? profileOrDefaults
        : resolveUploadDefaults(profileOrDefaults)
      : resolveUploadDefaults(profileOrDefaults);

  writeLs(UPLOAD_DEFAULTS_KEYS.defaultLanguage, d.defaultLanguage);
  writeLs(UPLOAD_DEFAULTS_KEYS.filenameDisplay, d.filenameDisplay);
  writeLs(UPLOAD_DEFAULTS_KEYS.webDisplayQuality, d.webDisplayQuality);
  writeLs(UPLOAD_DEFAULTS_KEYS.sharpenForWeb, d.sharpenForWeb ? 'true' : 'false');
  writeLs(UPLOAD_DEFAULTS_KEYS.sharpeningLevel, d.sharpeningLevel);
  writeLs(UPLOAD_DEFAULTS_KEYS.uploadQuality, d.uploadQuality);
  writeLs(UPLOAD_DEFAULTS_KEYS.rawPhotoSupport, d.rawPhotoSupport ? 'true' : 'false');
}

export function webMaxEdgeForQuality(quality) {
  return WEB_EDGE[quality] || WEB_EDGE.high;
}

export function uploadMaxEdgeForQuality(quality) {
  if (quality === 'high') return 3600;
  if (quality === 'web') return 2048;
  return null;
}

/** Plans that may enable RAW (Studio / Pro marketing tiers). */
export function planAllowsRaw(plan) {
  const p = String(plan || '').toLowerCase();
  return p === 'plus' || p === 'pro' || p === 'ultimate' || p === 'studio';
}
