/** Match backend slugify (backend/src/lib/db.ts) for client-side unique allocation. */
export function slugifyDeliveryName(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function pickUniqueDeliverySlug(baseName, usedSlugs = []) {
  const used = new Set(
    [...usedSlugs].map((s) => String(s || '').toLowerCase()).filter(Boolean),
  );
  const base = slugifyDeliveryName(baseName) || 'delivery';
  if (!used.has(base)) return base;
  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 80);
    if (!used.has(candidate)) return candidate;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

export function pickUniqueCopyName(sourceName, usedNames = []) {
  const used = new Set(
    [...usedNames].map((n) => String(n || '').trim().toLowerCase()).filter(Boolean),
  );
  const base = String(sourceName || 'Delivery').trim() || 'Delivery';
  const first = `${base} (Copy)`;
  if (!used.has(first.toLowerCase())) return first;
  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${base} (Copy ${i})`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (Copy ${Date.now().toString(36)})`;
}

const STRIP_ON_DUPLICATE = [
  'id',
  'photographer_id',
  'created_at',
  'updated_at',
  'photo_count',
  'video_count',
  'total_size_bytes',
  'published_at',
  'slug',
  'photos',
  'sets',
];

/**
 * Build the create payload for a duplicated delivery.
 * Never reuses the source slug — that caused "A gallery with this URL already exists".
 */
export function buildDuplicateCollectionPayload(source, { usedSlugs = [], usedNames = [] } = {}) {
  if (!source || typeof source !== 'object') {
    throw new Error('Source delivery is required to duplicate.');
  }
  const rest = { ...source };
  for (const key of STRIP_ON_DUPLICATE) delete rest[key];

  const name = pickUniqueCopyName(source.name, usedNames);
  const slug = pickUniqueDeliverySlug(name, usedSlugs);

  return {
    ...rest,
    name,
    slug,
    status: 'draft',
  };
}
