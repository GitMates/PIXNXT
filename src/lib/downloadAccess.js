/**
 * Normalize delivery.restrict_to_emails (CSV string or JSON array) to lowercase emails.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseEmailAllowlist(raw) {
  if (raw == null || raw === false || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e || '').trim().toLowerCase()).filter((e) => e.includes('@'));
  }
  return String(raw)
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

/**
 * True when the delivery has a non-empty email allowlist (anyone is allowed when empty).
 * @param {unknown} raw
 */
export function hasEmailAllowlist(raw) {
  return parseEmailAllowlist(raw).length > 0;
}

/**
 * Download contact prompt mode from delivery settings.
 * @param {Record<string, unknown>|null|undefined} collection
 * @returns {'never'|'large'|'every'}
 */
export function resolveDownloadContactMode(collection) {
  const saved = collection?.download_contact_mode;
  if (saved === 'never' || saved === 'large' || saved === 'every') return saved;
  if (collection?.large_download_contact === true || collection?.large_download_contact === 1) return 'large';
  return 'never';
}

/** Rough threshold (bytes) where a set is "large enough" to zip server-side. */
export const LARGE_DOWNLOAD_BYTES = 80 * 1024 * 1024;
