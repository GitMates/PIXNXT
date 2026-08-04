import { supabase } from './supabase/client';
import { categoryTagsFromCollection, normalizeCategoryTag } from './categoryTags';

export const STORE_PACKAGE_CATEGORIES = ['Default', 'Wedding', 'Portrait', 'Event'];

/** Deliveries with fewer than this many photos are not package-eligible. */
export const PACKAGE_THRESHOLD = 10;

/** Pack sizes offered for social sharing (in addition to single photo). */
export const PACKAGE_PACK_TIERS = [10, 20, 30, 40, 50];

/** All price tiers including single (1). */
export const PACKAGE_PRICE_TIERS = [1, ...PACKAGE_PACK_TIERS];

/** @deprecated Prefer PACKAGE_PACK_TIERS[0] — kept for older imports. */
export const PACKAGE_PHOTO_COUNT = 10;

export function emptyCategoryPricingMap() {
  return Object.fromEntries(
    STORE_PACKAGE_CATEGORIES.map((cat) => [
      cat,
      Object.fromEntries(PACKAGE_PRICE_TIERS.map((n) => [String(n), ''])),
    ])
  );
}

export function isPackageCollection(photoCount) {
  return Number(photoCount) >= PACKAGE_THRESHOLD;
}

export function normalizePackageCategory(value) {
  const tag = normalizeCategoryTag(value);
  if (!tag) return '';
  const match = STORE_PACKAGE_CATEGORIES.find(
    (c) => c.toLowerCase() === tag.toLowerCase()
  );
  return match || tag;
}

/**
 * Resolve gallery category for digital packaging.
 * Matches Wedding / Portrait / Event from category_tags; otherwise Default.
 */
export function resolveCollectionPackageCategory(collection) {
  const tags = categoryTagsFromCollection(collection).map((t) => t.toLowerCase());
  for (const cat of STORE_PACKAGE_CATEGORIES) {
    if (cat === 'Default') continue;
    if (tags.includes(cat.toLowerCase())) return cat;
  }
  return 'Default';
}

export function findTierPrice(packages, category, photoCount) {
  if (!category || !Array.isArray(packages)) return null;
  const cat = String(category).toLowerCase();
  const count = Number(photoCount);
  const row = packages.find(
    (p) =>
      String(p.category_tag || '').toLowerCase() === cat
      && Number(p.photo_count) === count
      && (p.is_active !== false)
  );
  return row || null;
}

function parsePriceInput(value) {
  const n = parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function tierOffer(row, category, photoCount) {
  if (!row) return null;
  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const label =
    photoCount === 1
      ? `${category} · Single Photo`
      : `${category} · ${photoCount} Photos`;
  return { price, package: row, label, photo_count: photoCount };
}

/**
 * Resolve single + pack offerings for a gallery from store_packages only.
 * Never mixes Wedding / Portrait / Event prices across categories.
 * Falls back to Default category rows when the matched category has no tier.
 */
export function resolveDigitalCategoryPricing(packages, collection, { photoCount } = {}) {
  const category = resolveCollectionPackageCategory(collection);
  const count = Number(photoCount) || 0;
  const packageEligible = isPackageCollection(count);

  const pickTier = (tierCount) => {
    const primary = findTierPrice(packages, category, tierCount);
    if (primary) return tierOffer(primary, category, tierCount);
    if (category !== 'Default') {
      const fallback = findTierPrice(packages, 'Default', tierCount);
      if (fallback) return tierOffer(fallback, 'Default', tierCount);
    }
    return null;
  };

  const single = pickTier(1);

  const packs = packageEligible
    ? PACKAGE_PACK_TIERS
      .filter((n) => count >= n)
      .map((n) => pickTier(n))
      .filter(Boolean)
    : [];

  return {
    category,
    packageEligible,
    single,
    packs,
    /** @deprecated Use packs — first pack for older UI. */
    pack: packs[0] || null,
    entireFallback: null,
  };
}

/** Packages whose category matches the gallery's resolved category (or Default). */
export function filterPackagesForCollection(packages, collection) {
  const category = resolveCollectionPackageCategory(collection);
  if (!Array.isArray(packages)) return [];
  const cat = category.toLowerCase();
  return packages.filter((pkg) => {
    if (pkg?.is_active === false) return false;
    const tag = String(pkg.category_tag || '').toLowerCase();
    return tag === cat || tag === 'default';
  });
}

export async function fetchStorePackages(photographerId, { activeOnly = false } = {}) {
  if (!photographerId) return [];
  let query = supabase
    .from('store_packages')
    .select('*')
    .eq('photographer_id', photographerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Build UI state: { Wedding: { '1': '40', '10': '199', ... }, ... }
 */
export function categoryPricingFromPackages(packages) {
  const out = emptyCategoryPricingMap();
  for (const row of packages || []) {
    const cat = normalizePackageCategory(row.category_tag);
    if (!out[cat]) continue;
    const count = Number(row.photo_count);
    if (!PACKAGE_PRICE_TIERS.includes(count)) continue;
    out[cat][String(count)] = String(Math.round(Number(row.price) || 0));
  }
  return out;
}

function buildTierPayload(cat, photoCount, price, sortOrder) {
  return {
    category_tag: cat,
    name: photoCount === 1 ? `${cat} · Single Photo` : `${cat} · ${photoCount} Photos`,
    photo_count: photoCount,
    price,
    package_type: 'digital',
    description:
      photoCount === 1
        ? `Single high-resolution download for ${cat} galleries`
        : `${photoCount}-photo social sharing package for ${cat} galleries`,
    is_active: price > 0 || photoCount === 1,
    sort_order: sortOrder,
  };
}

/**
 * Save category digital pricing via fetch + insert/update (reliable; no ON CONFLICT dependency).
 */
export async function saveCategoryDigitalPricing(photographerId, pricingMap) {
  if (!photographerId) throw new Error('Missing photographer');

  const existing = await fetchStorePackages(photographerId);
  const toInsert = [];
  const updateJobs = [];

  for (let i = 0; i < STORE_PACKAGE_CATEGORIES.length; i += 1) {
    const cat = STORE_PACKAGE_CATEGORIES[i];
    const entry = pricingMap?.[cat] || {};

    for (let t = 0; t < PACKAGE_PRICE_TIERS.length; t += 1) {
      const photoCount = PACKAGE_PRICE_TIERS[t];
      const raw = entry[String(photoCount)] ?? entry[photoCount]
        ?? (photoCount === 1 ? entry.single : null)
        ?? (photoCount === 10 ? entry.pack : null);
      const parsed = parsePriceInput(raw);
      const price = parsed == null ? 0 : parsed;

      const match = existing.find(
        (p) =>
          String(p.category_tag || '').toLowerCase() === cat.toLowerCase()
          && Number(p.photo_count) === photoCount
      );

      // Skip never-priced empty packs
      if (!match && price <= 0 && photoCount !== 1) continue;

      const payload = buildTierPayload(
        cat,
        photoCount,
        price,
        i * PACKAGE_PRICE_TIERS.length + t
      );

      if (match) {
        // Clear / deactivate empty packs that already exist
        if (price <= 0 && photoCount !== 1) {
          updateJobs.push(
            updateStorePackage(match.id, photographerId, {
              ...payload,
              is_active: false,
              price: 0,
            })
          );
        } else {
          updateJobs.push(updateStorePackage(match.id, photographerId, payload));
        }
      } else {
        toInsert.push({ photographer_id: photographerId, ...payload });
      }
    }
  }

  const results = [];

  if (updateJobs.length) {
    const updated = await Promise.all(updateJobs);
    results.push(...updated);
  }

  if (toInsert.length) {
    const { data, error } = await supabase
      .from('store_packages')
      .insert(toInsert)
      .select();
    if (error) throw new Error(error.message || 'Failed to insert package prices');
    results.push(...(data || []));
  }

  return results;
}

export async function createStorePackage(photographerId, payload) {
  const row = {
    photographer_id: photographerId,
    category_tag: normalizePackageCategory(payload.category_tag),
    name: String(payload.name || '').trim(),
    photo_count: Math.max(1, parseInt(payload.photo_count, 10) || 1),
    price: Math.max(0, Number(payload.price) || 0),
    package_type: payload.package_type || 'digital',
    description: String(payload.description || '').trim(),
    is_active: payload.is_active !== false,
    sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 0,
  };

  const { data, error } = await supabase
    .from('store_packages')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStorePackage(id, photographerId, payload) {
  const patch = {
    updated_at: new Date().toISOString(),
  };
  if (payload.category_tag !== undefined) {
    patch.category_tag = normalizePackageCategory(payload.category_tag);
  }
  if (payload.name !== undefined) patch.name = String(payload.name || '').trim();
  if (payload.photo_count !== undefined) {
    patch.photo_count = Math.max(1, parseInt(payload.photo_count, 10) || 1);
  }
  if (payload.price !== undefined) {
    patch.price = Math.max(0, Number(payload.price) || 0);
  }
  if (payload.package_type !== undefined) patch.package_type = payload.package_type;
  if (payload.description !== undefined) {
    patch.description = String(payload.description || '').trim();
  }
  if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;
  if (payload.sort_order !== undefined) patch.sort_order = Number(payload.sort_order) || 0;

  const { data, error } = await supabase
    .from('store_packages')
    .update(patch)
    .eq('id', id)
    .eq('photographer_id', photographerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStorePackage(id, photographerId) {
  const { error } = await supabase
    .from('store_packages')
    .delete()
    .eq('id', id)
    .eq('photographer_id', photographerId);
  if (error) throw error;
}

export function buildDigitalPackageCartItem(pkg, selectedPhotos = []) {
  const unitPrice = Number(pkg.price) || 0;
  const size = {
    id: `package_${pkg.photo_count}`,
    label: `${pkg.photo_count} Photos`,
  };
  const photos = (selectedPhotos || []).map((photo) => ({
    id: photo.id,
    filename: photo.filename || photo.name || '',
    url: photo.url || photo.web_url || photo.thumbnail_url || photo.full_url || '',
    web_url: photo.web_url || photo.url || '',
    thumbnail_url: photo.thumbnail_url || photo.web_url || photo.url || '',
    full_url: photo.full_url || photo.web_url || photo.url || '',
  }));
  return {
    id: `pkg-${pkg.id}-${Date.now()}`,
    productId: 'digital_package',
    productName: pkg.name,
    unitPrice,
    totalPrice: unitPrice,
    quantity: 1,
    photo: photos[0] || null,
    photos,
    size,
    frame: null,
    paper: null,
    border: 'none',
    options: {
      productId: 'digital_package',
      productName: pkg.name,
      packageId: pkg.id,
      category_tag: pkg.category_tag,
      photo_count: pkg.photo_count,
      description: pkg.description || '',
      size,
      unitPrice,
      photos,
      selected_photo_ids: photos.map((p) => p.id),
    },
  };
}
