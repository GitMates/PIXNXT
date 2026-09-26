/**
 * Pure R2 folder helpers — safe to import from Vite config / Node server code
 * (no backend client side effects).
 */

export const R2_USERS_ROOT = 'users';

export const R2_USER_MODULES = {
  DELIVERIES: 'deliveries',
  ALBUM_PROOFER: 'album-proofer',
  GUEST_DELIVERY: 'guestdelivery',
  MOBILE_GALLERY: 'mobilegallery',
  /** Studio identity: logos, cover logo, favicon, profile icon, watermarks */
  STUDIO: 'studio',
};

export const PHOTOGRAPHER_R2_FIELDS = 'id, r2_folder, email, display_name';

export function safeR2PathSegment(value, fallback = 'item') {
  return (
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || fallback
  );
}

export function emailLocalPart(email) {
  return String(email || '').split('@')[0]?.trim() || '';
}

/** Pure resolver — prefers stored r2_folder, then email local-part. */
export function resolvePhotographerR2Folder(photographer) {
  if (!photographer) return 'photographer';

  const stored = String(photographer.r2_folder || '').trim();
  if (stored) return stored;

  const fromEmail = emailLocalPart(photographer.email);
  if (fromEmail) {
    const segment = safeR2PathSegment(fromEmail, '');
    if (segment) return segment;
  }

  const fromName = photographer.display_name
    ? safeR2PathSegment(photographer.display_name, '')
    : '';
  if (fromName) return fromName;

  return safeR2PathSegment(photographer.id, 'photographer');
}

/** Legacy folder names to scan when resolving existing R2 objects. */
export function photographerR2FolderVariants(photographer) {
  const variants = new Set();
  const primary = resolvePhotographerR2Folder(photographer);
  variants.add(primary);

  const fromEmail = emailLocalPart(photographer?.email);
  const emailSegment = fromEmail ? safeR2PathSegment(fromEmail, '') : '';
  const nameSegment = photographer?.display_name
    ? safeR2PathSegment(photographer.display_name, '')
    : '';

  if (nameSegment) variants.add(nameSegment);
  if (emailSegment) variants.add(emailSegment);
  if (nameSegment) variants.add(nameSegment.replace(/-/g, ''));
  if (emailSegment) variants.add(emailSegment.replace(/-/g, ''));
  if (photographer?.id) variants.add(safeR2PathSegment(photographer.id, 'photographer'));

  variants.delete('');
  return [...variants];
}

export function buildUserModulePath(photographerFolder, module, ...segments) {
  return [R2_USERS_ROOT, photographerFolder, module, ...segments].filter(Boolean).join('/');
}

/** Server-side helper (resolves via the Workers API; `db` is ignored, kept for call compat). */
export async function fetchPhotographerR2Folder(db, photographerId) {
  void db;
  if (!photographerId) return 'photographer';

  try {
    const { apiFetch } = await import('./api/client');
    const me = await apiFetch('/v1/me/profile').catch(() => null);
    const data = me?.profile?.id === photographerId ? me.profile : null;
    return resolvePhotographerR2Folder(
      data ?? { id: photographerId }
    );
  } catch {
    return safeR2PathSegment(photographerId, 'photographer');
  }
}

export async function fetchPhotographerR2FolderVariants(db, photographerId) {
  void db;
  if (!photographerId) return ['photographer'];

  try {
    const { apiFetch } = await import('./api/client');
    const me = await apiFetch('/v1/me/profile').catch(() => null);
    const data = me?.profile?.id === photographerId ? me.profile : null;
    return photographerR2FolderVariants(data ?? { id: photographerId });
  } catch {
    return [safeR2PathSegment(photographerId, 'photographer')];
  }
}
