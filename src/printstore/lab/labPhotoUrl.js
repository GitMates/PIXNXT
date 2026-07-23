/**
 * Resolve order-item photo URLs from real stored data only (no mock catalog).
 * Accepts absolute URLs, data/blob URLs, or R2-relative object keys.
 */
export function resolveLabPhotoUrl(photoOption) {
  if (photoOption == null || photoOption === '') return '';

  if (typeof photoOption === 'string') {
    const s = photoOption.trim();
    if (!s) return '';
    if (
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('data:') ||
      s.startsWith('blob:')
    ) {
      return s;
    }
    let r2PublicUrl = '';
    try {
      r2PublicUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_R2_PUBLIC_URL) || '';
    } catch (_) {
      r2PublicUrl = '';
    }
    if (r2PublicUrl) {
      const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl : `${r2PublicUrl}/`;
      return `${baseUrl}${s.replace(/^\//, '')}`;
    }
    return '';
  }

  if (typeof photoOption === 'object' && !Array.isArray(photoOption)) {
    const candidates = [
      photoOption.editedPhotoUrl,
      photoOption.url,
      photoOption.web_url,
      photoOption.thumbnail_url,
      photoOption.full_url,
      photoOption.display_url,
      photoOption.src,
    ];
    for (const c of candidates) {
      if (typeof c !== 'string' || !c.trim()) continue;
      const resolved = resolveLabPhotoUrl(c);
      if (resolved) return resolved;
    }
    // Only treat id as a storage key when it looks like a path/URL — never raw UUIDs
    if (typeof photoOption.id === 'string') {
      const id = photoOption.id.trim();
      if (
        id.startsWith('http://') ||
        id.startsWith('https://') ||
        id.startsWith('data:') ||
        id.includes('/')
      ) {
        return resolveLabPhotoUrl(id);
      }
    }
  }

  return '';
}

/** Extract first photo URL from a printstore order item.options blob. */
export function getLabItemPhotoUrl(item) {
  const opts = item?.options || {};
  const candidates = [
    opts.editedPhotoUrl,
    item?.editedPhotoUrl,
    opts.photo,
    Array.isArray(opts.photos) ? opts.photos[0] : null,
    item?.photo,
  ];
  for (const c of candidates) {
    const url = resolveLabPhotoUrl(c);
    if (url) return url;
  }
  return '';
}

/**
 * Normalize a DB order item into the shape CartItemPreview expects,
 * with fully resolved photo + frame texture URLs.
 */
export function buildLabPreviewItem(item) {
  if (!item) return null;
  const opts = item.options || {};

  const hydratePhoto = (photo) => {
    if (!photo) return null;
    if (typeof photo === 'string') {
      const url = resolveLabPhotoUrl(photo);
      return url ? { url, editedPhotoUrl: url } : null;
    }
    if (typeof photo !== 'object' || Array.isArray(photo)) return null;
    const url = resolveLabPhotoUrl(photo);
    if (!url) {
      return { ...photo };
    }
    return {
      ...photo,
      url,
      editedPhotoUrl: resolveLabPhotoUrl(photo.editedPhotoUrl) || url,
      web_url: resolveLabPhotoUrl(photo.web_url) || photo.web_url,
      thumbnail_url: resolveLabPhotoUrl(photo.thumbnail_url) || photo.thumbnail_url,
    };
  };

  const photo = hydratePhoto(opts.photo || item.photo);
  const photos = Array.isArray(opts.photos)
    ? opts.photos.map(hydratePhoto).filter(Boolean)
    : [];

  const frameRaw = opts.frame || item.frame || null;
  const frame = frameRaw
    ? {
        ...frameRaw,
        colorThumb: resolveLabPhotoUrl(frameRaw.colorThumb) || frameRaw.colorThumb || '',
      }
    : null;

  const editedPhotoUrl =
    resolveLabPhotoUrl(opts.editedPhotoUrl) ||
    resolveLabPhotoUrl(item.editedPhotoUrl) ||
    photo?.editedPhotoUrl ||
    photo?.url ||
    '';

  return {
    productId: String(item.product_type || item.productId || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase(),
    productName: item.product_name || item.productName || '',
    photo,
    photos,
    editedPhotoUrl,
    size: opts.size || item.size || null,
    frame,
    paper: opts.paper || item.paper || null,
    border: opts.border || item.border || 'none',
    customBorderWidthCm: opts.customBorderWidthCm || item.customBorderWidthCm || 0,
    layout: opts.layout || item.layout || null,
    rotation: opts.rotation || item.rotation || 0,
    quantity: item.quantity,
    unitPrice: parseFloat(item.unit_price || item.unitPrice || 0),
    options: opts,
  };
}

/** Layout helpers used by artwork review (not mock catalog). */
export function isSlotLandscape(type, index) {
  if (!type) return false;
  if (type === 'grid_1top_2bottom' && index === 0) return true;
  if (type === 'grid_2top_1bottom' && index === 2) return true;
  if (type === 'grid_3top_1bottom' && index === 3) return true;
  if (type === 'grid_2x1_vertical') return true;
  if (type === 'grid_4x2') return true;
  if (type === 'grid_5x2') return true;
  if (type === 'grid_2x2_landscape') return true;
  return false;
}

export function adjustPhotoUrl(url, isLandscape) {
  if (typeof url !== 'string') return url;
  if (isLandscape) {
    return url.replace('w=800&h=1200', 'w=1200&h=800');
  }
  return url.replace('w=1200&h=800', 'w=800&h=1200');
}

/** Digital products never enter the print lab — customer downloads only. */
export const LAB_DIGITAL_PRODUCT_TYPES = new Set([
  'digital_download',
  'digital_download_all',
  'digital_package',
]);

export function isLabPhysicalItem(item) {
  const type = String(item?.product_type || item?.productId || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!type) return false;
  return !LAB_DIGITAL_PRODUCT_TYPES.has(type);
}

export function filterLabPhysicalItems(items = []) {
  return (items || []).filter(isLabPhysicalItem);
}
