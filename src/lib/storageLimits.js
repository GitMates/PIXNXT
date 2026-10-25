/** 1 GiB in bytes. */
export const GIB = 1024 * 1024 * 1024;

/** Beta floor for every studio. Larger admin caps are left alone. */
export const MIN_STORAGE_LIMIT_BYTES = 10 * GIB;

/**
 * Effective studio cap. Positive stored values below 10 GiB are raised.
 * 0 / missing fall back to the plan default (free = 10 GiB).
 */
export function resolveStorageLimitBytes(profile) {
  const stored = Number(profile?.storage_limit_bytes);
  if (Number.isFinite(stored) && stored > 0) {
    return Math.max(stored, MIN_STORAGE_LIMIT_BYTES);
  }
  const limitGb = Number(profile?.storage_limit_gb);
  if (Number.isFinite(limitGb) && limitGb > 0) {
    return Math.max(limitGb * GIB, MIN_STORAGE_LIMIT_BYTES);
  }
  const tier = String(profile?.plan || '').toLowerCase();
  if (tier === 'pro') return 100 * GIB;
  if (tier === 'premium') return 500 * GIB;
  return MIN_STORAGE_LIMIT_BYTES;
}
