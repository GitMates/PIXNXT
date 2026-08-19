const STORAGE_PREFIX = 'pixnxt_gallery_reg_';
const EMAIL_PREFIX = 'pixnxt_fav_email_';

export function galleryRegistrationKey(collectionId) {
  return `${STORAGE_PREFIX}${collectionId}`;
}

export function readGalleryRegistration(collectionId) {
  if (!collectionId) return null;
  try {
    const raw = localStorage.getItem(galleryRegistrationKey(collectionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const email = String(parsed?.email || '').trim();
      if (email.includes('@')) {
        return {
          email,
          name: String(parsed?.name || '').trim(),
          phone: String(parsed?.phone || '').trim(),
        };
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const email = String(localStorage.getItem(`${EMAIL_PREFIX}${collectionId}`) || '').trim();
    if (email.includes('@')) return { email, name: '', phone: '' };
  } catch {
    /* ignore */
  }

  return null;
}

export function writeGalleryRegistration(collectionId, payload) {
  if (!collectionId) return;
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!email.includes('@')) return;
  const next = {
    email,
    name: String(payload?.name || '').trim(),
    phone: String(payload?.phone || '').trim(),
    at: Date.now(),
  };
  try {
    localStorage.setItem(galleryRegistrationKey(collectionId), JSON.stringify(next));
    localStorage.setItem(`${EMAIL_PREFIX}${collectionId}`, email);
  } catch {
    /* ignore */
  }
}

export function normalizeCaptureMode(value) {
  if (value === 'email_name' || value === 'email_name_phone') return value;
  return 'email';
}

export function captureModeNeedsName(mode) {
  const normalized = normalizeCaptureMode(mode);
  return normalized === 'email_name' || normalized === 'email_name_phone';
}

export function captureModeNeedsPhone(mode) {
  const normalized = normalizeCaptureMode(mode);
  return normalized === 'email_name_phone';
}

export function knownGalleryVisitorEmail(collectionId, fallback = '') {
  const fromFallback = String(fallback || '').trim();
  if (fromFallback.includes('@')) return fromFallback;
  const saved = readGalleryRegistration(collectionId);
  return saved?.email || '';
}
