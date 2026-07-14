import { supabase } from './supabase/client';
import { categoryTagsFromCollection, normalizeCategoryTag } from './categoryTags';

export const STORE_PACKAGE_CATEGORIES = ['Wedding', 'Portrait', 'Event'];

export function normalizePackageCategory(value) {
  const tag = normalizeCategoryTag(value);
  if (!tag) return '';
  const match = STORE_PACKAGE_CATEGORIES.find(
    (c) => c.toLowerCase() === tag.toLowerCase()
  );
  return match || tag;
}

/** Packages whose category matches any gallery category_tag (case-insensitive). */
export function filterPackagesForCollection(packages, collection) {
  const tags = categoryTagsFromCollection(collection).map((t) => t.toLowerCase());
  if (!tags.length || !Array.isArray(packages)) return [];
  return packages.filter((pkg) => {
    if (!pkg?.is_active && pkg?.is_active !== undefined) return false;
    const cat = String(pkg.category_tag || '').toLowerCase();
    return cat && tags.includes(cat);
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

export function buildDigitalPackageCartItem(pkg) {
  const unitPrice = Number(pkg.price) || 0;
  const size = {
    id: `package_${pkg.photo_count}`,
    label: `${pkg.photo_count} Photos`,
  };
  return {
    id: `pkg-${pkg.id}-${Date.now()}`,
    productId: 'digital_package',
    productName: pkg.name,
    unitPrice,
    totalPrice: unitPrice,
    quantity: 1,
    photo: null,
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
    },
  };
}
