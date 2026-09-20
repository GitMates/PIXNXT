/**
 * Gallery backend (Cloudflare /v1) — mirrors the
 * galleryService API surface. gallery.service.js delegates here per-function.
 */
import { apiFetch } from '../lib/api/client';

async function maps() {
  const mod = await import('./gallery.service');
  return { mapCollectionDashboardRow: mod.mapCollectionDashboardRow };
}

async function attachCovers(collections) {
  const missing = (collections || []).filter((c) => !c.cover_url && !c.cover && (c.photo_count ?? 0) > 0);
  await Promise.all(
    missing.slice(0, 20).map(async (c) => {
      try {
        const data = await apiFetch(`/v1/galleries/${c.id}/photos?limit=1`);
        const first = data?.photos?.[0];
        const thumb = first?.thumbnail_url || first?.web_url || first?.full_url || null;
        if (thumb) {
          c.cover_url = thumb;
          c.list_cover_url = thumb;
        }
      } catch {
        // cover stays empty — grid handles missing covers
      }
    }),
  );
  return collections;
}

async function mapRows(rows) {
  const { mapCollectionDashboardRow } = await maps();
  const mapped = (rows || []).map((r) =>
    mapCollectionDashboardRow({ ...r, photos: r.photos ?? [] }),
  );
  return attachCovers(mapped);
}

export async function getCollections(photographerId) {
  if (!photographerId) return [];
  const data = await apiFetch('/v1/galleries/dashboard');
  return mapRows((data?.galleries || []).filter((g) => g.photographer_id === photographerId));
}

export async function getDeliveryBoardExtras(collectionIds) {
  const ids = [...new Set((collectionIds || []).filter(Boolean))];
  if (!ids.length) return { submittedIds: new Set(), stuckIds: new Set(), earningsById: {} };
  const data = await apiFetch(`/v1/engage/board-extras?ids=${ids.map(encodeURIComponent).join(',')}`);
  return {
    submittedIds: new Set(data?.submittedIds || []),
    stuckIds: new Set(data?.stuckIds || []),
    earningsById: data?.earningsById || {},
  };
}

export async function getStarredCollections(photographerId) {
  if (!photographerId) return [];
  const data = await apiFetch('/v1/galleries/dashboard?starred=1');
  return mapRows(data?.galleries || []);
}

export async function getStarredPhotos() {
  const data = await apiFetch('/v1/photos/library?starred=1&limit=200');
  return data?.photos || [];
}

export async function getLibraryPhotos() {
  const photos = [];
  let offset = 0;
  for (;;) {
    const data = await apiFetch(`/v1/photos/library?limit=200&offset=${offset}`);
    const batch = data?.photos || [];
    photos.push(...batch.map((r) => ({ ...r, source: 'delivery' })));
    if (batch.length < 200) break;
    offset += 200;
  }
  return photos;
}

// ---------- folders ----------

export async function getFoldersForMove() {
  const data = await apiFetch('/v1/folders?limit=100');
  return data?.folders || [];
}

export async function createFolder(photographerId, nameOrOptions) {
  const options = typeof nameOrOptions === 'string' ? { name: nameOrOptions } : nameOrOptions ?? {};
  const name = options.name?.trim();
  if (!photographerId || !name) throw new Error('Folder name is required.');
  const data = await apiFetch('/v1/folders', {
    method: 'POST',
    body: {
      name,
      showOnShowcase: options.showOnShowcase !== false ? 1 : 0,
      eventDate: options.eventDate || null,
      guestPasswordHash: options.passwordEnabled && options.password?.trim() ? options.password.trim() : null,
    },
  });
  const f = data?.folder;
  return { id: f.id, name: f.name, cover_url: f.cover_url, event_date: f.event_date, show_on_showcase: f.show_on_showcase };
}

export async function moveCollectionToFolder(collectionId, folderId) {
  if (!collectionId) throw new Error('Delivery is required.');
  const data = await apiFetch(`/v1/galleries/${collectionId}`, {
    method: 'PATCH',
    body: { folder_id: folderId ?? null },
  });
  return { id: data?.gallery?.id, folder_id: data?.gallery?.folder_id ?? null };
}

export async function listFoldersForGallery(photographerId) {
  if (!photographerId) return [];
  const [foldersRes, dashRes] = await Promise.all([
    apiFetch('/v1/folders?limit=100'),
    apiFetch('/v1/galleries/dashboard'),
  ]);
  const folders = foldersRes?.folders || [];
  const collections = ((dashRes?.galleries || []).filter((g) => g.photographer_id === photographerId));
  const { mapCollectionDashboardRow } = await maps();
  const mapped = collections.map((c) => mapCollectionDashboardRow({ ...c, photos: c.photos ?? [] }));
  const countBy = {};
  const coversByFolder = {};
  const inFolder = [...mapped]
    .filter((c) => c.folder_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  for (const c of inFolder) {
    if (!c.folder_id) continue;
    countBy[c.folder_id] = (countBy[c.folder_id] || 0) + 1;
    const thumb = c.cover_url || c.cover || c.list_cover_url;
    if (!thumb) continue;
    if (!coversByFolder[c.folder_id]) coversByFolder[c.folder_id] = [];
    if (coversByFolder[c.folder_id].length < 4) coversByFolder[c.folder_id].push(thumb);
  }
  return (folders || []).map((f) => {
    const childCovers = coversByFolder[f.id] || [];
    const preview_urls = f.cover_url
      ? [f.cover_url, ...childCovers.filter((u) => u !== f.cover_url)].slice(0, 4)
      : childCovers.slice(0, 4);
    return {
      ...f,
      collection_count: countBy[f.id] || 0,
      preview_urls,
      cover_url: f.cover_url || childCovers[0] || null,
    };
  });
}

export async function getFolderById(folderId) {
  if (!folderId) return null;
  const data = await apiFetch('/v1/folders?limit=100');
  return (data?.folders || []).find((f) => f.id === folderId) ?? null;
}

export async function getCollectionsForFolder(photographerId, folderId) {
  if (!photographerId || !folderId) return [];
  const data = await apiFetch(`/v1/galleries?folderId=${encodeURIComponent(folderId)}&limit=200`);
  return mapRows(data?.galleries || []);
}

export async function updateFolder(folderId, photographerId, updates) {
  if (!folderId || !photographerId) throw new Error('Folder and photographer are required.');
  const body = {};
  if (updates.name !== undefined) body.name = String(updates.name).trim();
  if (updates.event_date !== undefined) body.eventDate = updates.event_date || null;
  if (updates.show_on_showcase !== undefined) body.showOnShowcase = updates.show_on_showcase ? 1 : 0;
  if (updates.cover_url !== undefined) body.coverUrl = updates.cover_url;
  if (updates.guest_password_hash !== undefined) body.guestPasswordHash = updates.guest_password_hash;
  if (Object.keys(body).length === 0) return getFolderById(folderId);
  const data = await apiFetch(`/v1/folders/${folderId}`, { method: 'PATCH', body });
  return data?.folder;
}

export async function deleteFolder(folderId) {
  if (!folderId) throw new Error('Folder is required.');
  await apiFetch(`/v1/folders/${folderId}`, { method: 'DELETE' });
}

// ---------- public collections ----------

export async function getPublicCollections(photographerId, fallbackSlug = '') {
  if (!photographerId) return [];
  const profile = await apiFetch(`/v1/public/photographer/by-id/${photographerId}`).catch(() => null);
  // Legacy photographers may have no showcase_slug — fall back to the page
  // slug / email local part the portfolio URL was built from.
  const slug =
    profile?.photographer?.showcase_slug ||
    fallbackSlug ||
    String(profile?.photographer?.email || '').split('@')[0];
  if (!slug) return [];
  const data = await apiFetch(`/v1/public/showcase/${encodeURIComponent(slug)}`).catch(() => null);
  const galleries = data?.galleries || [];
  return attachCovers(
    galleries.map((g) => ({ ...g, photographer_id: photographerId, photo_count: g.photo_count ?? 0 })),
  );
}

export async function submitShowcaseEnquiry({ photographerId, name, email, message }) {
  const data = await apiFetch('/v1/engage/showcase-enquiries', {
    method: 'POST',
    auth: false,
    body: { photographerId, name, email, message },
  });
  return { id: data?.id };
}

export async function getShowcaseEnquiries(photographerId, limit = 20) {
  if (!photographerId) return [];
  const data = await apiFetch(`/v1/engage/showcase-enquiries?limit=${limit}`);
  return data?.enquiries || [];
}

// ---------- collections ----------

export async function createCollection(collectionData) {
  const { _vaultSettings, photographer_id, ...insertPayload } = collectionData;
  if (typeof window !== 'undefined') {
    const storedEnabled = localStorage.getItem('pixnxt_global_digital_enabled');
    if (storedEnabled !== null) insertPayload.digital_download_enabled = storedEnabled === 'true';
    const storedSingle = localStorage.getItem('pixnxt_global_digital_price_single');
    if (storedSingle !== null) insertPayload.digital_download_price_single = parseInt(storedSingle);
    const storedAll = localStorage.getItem('pixnxt_global_digital_price_all');
    if (storedAll !== null) insertPayload.digital_download_price_all = parseInt(storedAll);
  }
  if (photographer_id) {
    const { photographerQuotaService: quotaService } = await import('./photographerQuota.service');
    await quotaService.assertCreationDeliveryQuota(photographer_id, 1);
  }
  const data = await apiFetch('/v1/galleries', { method: 'POST', body: insertPayload });
  const gallery = data?.gallery;
  if (gallery?.photographer_id) {
    const { photographerQuotaService: quotaService } = await import('./photographerQuota.service');
    quotaService.invalidate?.(gallery.photographer_id);
    quotaService.notifyQuotaChanged?.();
    // Usage counting is server-side now (POST /v1/galleries bumps
    // delivery_used_count) — no client bump, or every create counts twice.
  }
  if (gallery?.id && _vaultSettings && Object.keys(_vaultSettings).length > 0) {
    try {
      await upsertVaultPlan(gallery.id, _vaultSettings);
    } catch {
      // vault settings are best-effort
    }
  }
  return gallery;
}

export async function duplicateCollection(sourceCollectionId, photographerId) {
  if (!sourceCollectionId || !photographerId) {
    throw new Error('Delivery and photographer are required to duplicate.');
  }
  const source = await getCollectionById(sourceCollectionId);
  const { photos: sourcePhotos, sets: sourceSets, ...rest } = source;
  // Never copy server-managed identity/counters into the new row.
  for (const k of ['id', 'photographer_id', 'created_at', 'updated_at', 'photo_count',
    'video_count', 'total_size_bytes', 'published_at']) delete rest[k];
  const created = await createCollection({
    ...rest,
    photographer_id: photographerId,
    name: `${source.name} (Copy)`,
    status: 'draft',
  });
  const setIdMap = new Map();
  for (const set of [...(sourceSets || [])].sort((a, b) => (a.position || 0) - (b.position || 0))) {
    const s = await createSet({ collectionId: created.id, photographerId, name: set.name, description: set.description ?? '', position: set.position ?? 0 });
    setIdMap.set(set.id, s.id);
  }
  for (const photo of [...(sourcePhotos || [])].sort((a, b) => (a.position || 0) - (b.position || 0))) {
    await apiFetch(`/v1/galleries/${created.id}/photos`, {
      method: 'POST',
      body: {
        filename: photo.filename,
        mimeType: photo.mime_type,
        sizeBytes: photo.size_bytes ?? 0,
        width: photo.width,
        height: photo.height,
        storagePath: photo.original_storage_path,
        status: photo.status ?? 'ready',
        mediaType: photo.media_type ?? 'image',
        position: photo.position ?? 0,
        setId: photo.set_id ? setIdMap.get(photo.set_id) ?? null : null,
        thumbnailUrl: photo.thumbnail_url,
        webUrl: photo.web_url,
        watermarkedUrl: photo.watermarked_url,
        fullUrl: photo.full_url,
        thumbnailStoragePath: photo.thumbnail_storage_path,
        webStoragePath: photo.web_storage_path,
        watermarkedStoragePath: photo.watermarked_storage_path,
        exifTakenAt: photo.exif_taken_at,
        exifCamera: photo.exif_camera,
        exifLens: photo.exif_lens,
      },
    });
  }
  return created;
}

/**
 * Autosaves merge the whole PATCH response into dashboard state. The response
 * is read at write time, so a concurrent autosave can return a pre-cover-write
 * row and clobber the optimistic cover. Only carry cover fields through when
 * this PATCH actually changed them.
 */
function keepCoverOnlyIfPatched(gallery, updateData) {
  if (!gallery || typeof gallery !== 'object') return gallery;
  if (updateData && ('cover_url' in updateData || 'cover_photo_id' in updateData)) return gallery;
  delete gallery.cover_url;
  delete gallery.cover_photo_id;
  return gallery;
}

export async function updateCollection(id, updateData) {
  const data = await apiFetch(`/v1/galleries/${id}`, { method: 'PATCH', body: updateData });
  return keepCoverOnlyIfPatched(data?.gallery, updateData);
}

export async function updateCollectionStatus(id, status) {
  const data = await apiFetch(`/v1/galleries/${id}`, { method: 'PATCH', body: { status } });
  return keepCoverOnlyIfPatched(data?.gallery, { status });
}

export async function deleteCollection(id) {
  const dashboard = await getCollectionDashboardData(id).catch(() => null);
  const coverPath = dashboard?.cover_url ? pathFromPublicUrl(dashboard.cover_url) : null;
  await apiFetch(`/v1/galleries/${id}`, {
    method: 'DELETE',
    body: coverPath ? { coverPath } : {},
  }).catch(() => {});
  try {
    const { photographerQuotaService } = await import('./photographerQuota.service');
    photographerQuotaService.notifyQuotaChanged?.();
  } catch {
    // ignore
  }
}

function pathFromPublicUrl(url) {
  const base = String(import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
  if (!url || !base || !String(url).startsWith(base)) return null;
  return String(url).slice(base.length).replace(/^\//, '') || null;
}

export async function getCollectionDashboardData(id) {
  const data = await apiFetch(`/v1/galleries/${id}/dashboard`);
  const gallery = data?.gallery;
  if (!gallery) throw new Error('Gallery not found');
  gallery.sets = [...(gallery.sets || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  gallery.photos = [...(gallery.photos || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  return gallery;
}

export async function getCollectionById(id) {
  return getCollectionDashboardData(id);
}

/** Session-scoped guest-password unlock (typed once, remembered per tab). */
function galleryPasswordKey(galleryId) {
  return `pixnxt_gallery_password_${galleryId}`;
}

/** Studio-only: remember the plaintext the photographer last set (survives reload). */
function studioGuestPasswordKey(galleryId) {
  return `pixnxt_studio_guest_password_${galleryId}`;
}

export function isPasswordDigest(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || '').trim());
}

export function getStoredGalleryPassword(galleryId) {
  if (!galleryId || typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(galleryPasswordKey(galleryId)) || null;
  } catch {
    return null;
  }
}

export function setStoredGalleryPassword(galleryId, password) {
  if (!galleryId || typeof sessionStorage === 'undefined') return;
  try {
    if (password) sessionStorage.setItem(galleryPasswordKey(galleryId), String(password));
    else sessionStorage.removeItem(galleryPasswordKey(galleryId));
  } catch {
    // ignore quota errors
  }
}

export function clearStoredGalleryPassword(galleryId) {
  setStoredGalleryPassword(galleryId, null);
}

export function getStudioGuestPassword(galleryId) {
  if (!galleryId || typeof sessionStorage === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(studioGuestPasswordKey(galleryId));
    if (!value || isPasswordDigest(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function setStudioGuestPassword(galleryId, password) {
  if (!galleryId || typeof sessionStorage === 'undefined') return;
  try {
    const plain = String(password || '').trim();
    if (plain && !isPasswordDigest(plain)) {
      sessionStorage.setItem(studioGuestPasswordKey(galleryId), plain);
    } else {
      sessionStorage.removeItem(studioGuestPasswordKey(galleryId));
    }
  } catch {
    // ignore quota errors
  }
}

export function clearStudioGuestPassword(galleryId) {
  setStudioGuestPassword(galleryId, null);
}

function isPasswordRequiredError(err) {
  return Boolean(err) && (err.status === 403 || err.statusCode === 403);
}

export async function getCollectionBySlug(slug, options = {}) {
  const normalized = decodeURIComponent(String(slug || '').trim());
  const studioCollectionId = options.collectionId || null;
  if (studioCollectionId) {
    try {
      return await getCollectionDashboardData(studioCollectionId);
    } catch {
      // fall through to slug lookup
    }
  }
  if (!normalized) return null;
  const data = await apiFetch(`/v1/public/gallery-by-slug/${encodeURIComponent(normalized)}`).catch(() => null);
  const gallery = data?.gallery;
  if (!gallery) return null;
  const explicitPassword = options.password ?? null;
  const storedPassword = getStoredGalleryPassword(gallery.id);
  const urlPassword = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('password')
    : null;
  const password = explicitPassword ?? storedPassword ?? urlPassword ?? null;
  const photosPath = password
    ? `/v1/public/gallery/${gallery.id}/photos?password=${encodeURIComponent(password)}&limit=2000`
    : `/v1/public/gallery/${gallery.id}/photos?limit=2000`;
  const setsPath = password
    ? `/v1/public/gallery/${gallery.id}/sets?password=${encodeURIComponent(password)}`
    : `/v1/public/gallery/${gallery.id}/sets`;
  const [photosRes, setsRes] = await Promise.all([
    apiFetch(photosPath).catch((err) => ({ __forbidden: isPasswordRequiredError(err) })),
    apiFetch(setsPath).catch((err) => ({ __forbidden: isPasswordRequiredError(err) })),
  ]);
  const photosForbidden = Boolean(photosRes && photosRes.__forbidden);
  const setsForbidden = Boolean(setsRes && setsRes.__forbidden);
  const needsPassword = Boolean(
    gallery.has_password || gallery.privacy === 'password' || photosForbidden || setsForbidden,
  );
  if ((photosForbidden || setsForbidden) && !password) {
    return {
      ...gallery,
      photos: [],
      sets: [],
      needsPassword: true,
    };
  }
  gallery.photos = [...((photosRes && photosRes.photos) || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  gallery.sets = [...((setsRes && setsRes.sets) || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  gallery.needsPassword = needsPassword && (photosForbidden || setsForbidden);
  if (password && !photosForbidden) setStoredGalleryPassword(gallery.id, password);
  return gallery;
}

/** Store campaign apply/test (maps edge-fn payload to /v1/emails/store-campaign). */
export async function sendStoreCampaign(edgePayload) {
  const data = await apiFetch('/v1/emails/store-campaign', {
    method: 'POST',
    body: {
      mode: edgePayload.mode === 'test' ? 'test' : 'apply',
      testType: edgePayload.testType ?? 'email',
      manualRecipient: edgePayload.recipient ?? edgePayload.manualRecipient ?? null,
      collectionId: edgePayload.collectionId ?? null,
      campaignId: edgePayload.campaignId,
      reminderKey: edgePayload.emailKey ?? edgePayload.reminderKey ?? 'announcement',
      emailConfig: edgePayload.emailConfig ?? {},
      discount: edgePayload.discount ?? null,
      discountCode: edgePayload.discountCode ?? null,
      durationDays: edgePayload.durationDays ?? null,
    },
  });
  return data;
}

/** Server-side password/PIN check (hashes never leave the API). */
export async function verifyGalleryAccess(galleryId, { password, pin } = {}) {
  const data = await apiFetch(`/v1/public/gallery/${galleryId}/verify`, {
    method: 'POST',
    auth: false,
    body: { password: password ?? null, pin: pin ?? null },
  });
  return { passwordOk: data?.passwordOk !== false, pinOk: data?.pinOk !== false };
}

// ---------- sets ----------

export async function getSets(collectionId) {
  const data = await apiFetch(`/v1/galleries/${collectionId}/sets`);
  return [...(data?.sets || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
}

export async function createSet({ collectionId, photographerId, name, description, position }) {
  void photographerId;
  const data = await apiFetch(`/v1/galleries/${collectionId}/sets`, {
    method: 'POST',
    body: { name, description: description ?? '', position: position ?? 0 },
  });
  return data?.set;
}

export async function updateSet(setId, updateData) {
  const data = await apiFetch(`/v1/galleries/sets/${setId}`, { method: 'PATCH', body: updateData });
  return data?.set;
}

export async function deleteSet(setId) {
  await apiFetch(`/v1/galleries/sets/${setId}`, { method: 'DELETE' });
}

export async function assignPhotosToSet(photoIds, setId) {
  for (const photoId of photoIds || []) {
    await apiFetch(`/v1/galleries/photos/${photoId}`, { method: 'PATCH', body: { set_id: setId } });
  }
}

export async function duplicateSet({ collectionId, photographerId, name, description, position, photos = [] }) {
  const created = await createSet({ collectionId, photographerId, name, description, position });
  if (!photos.length) return { set: created, photos: [] };
  const createdPhotos = [];
  for (const [index, p] of photos.entries()) {
    const row = await apiFetch(`/v1/galleries/${collectionId}/photos`, {
      method: 'POST',
      body: {
        filename: p.filename,
        mimeType: p.mime_type,
        sizeBytes: p.size_bytes ?? 0,
        width: p.width ?? null,
        height: p.height ?? null,
        storagePath: p.original_storage_path,
        status: p.status ?? 'ready',
        mediaType: p.media_type ?? 'image',
        position: p.position ?? index,
        setId: created.id,
        thumbnailUrl: p.thumbnail_url ?? null,
        webUrl: p.web_url ?? null,
        watermarkedUrl: p.watermarked_url ?? null,
        fullUrl: p.full_url ?? null,
        thumbnailStoragePath: p.thumbnail_storage_path ?? null,
        webStoragePath: p.web_storage_path ?? null,
        watermarkedStoragePath: p.watermarked_storage_path ?? null,
        exifTakenAt: p.exif_taken_at ?? null,
        isStarred: p.is_starred ? 1 : 0,
        isPrivate: p.is_private ? 1 : 0,
      },
    }).catch(() => null);
    if (row?.photo) createdPhotos.push(row.photo);
  }
  return { set: created, photos: createdPhotos };
}

// ---------- photos (metadata; bytes via storageService) ----------

export async function updatePhoto(id, updateData) {
  const data = await apiFetch(`/v1/galleries/photos/${id}`, { method: 'PATCH', body: updateData });
  return data?.photo;
}

export async function deletePhotos(ids) {
  if (!ids || ids.length === 0) return;
  await apiFetch('/v1/galleries/photos/delete', { method: 'POST', body: { ids } });
  try {
    const { photographerQuotaService } = await import('./photographerQuota.service');
    photographerQuotaService.notifyQuotaChanged?.();
  } catch {
    // ignore
  }
}

export async function togglePhotoStar(id, isStarred) {
  const data = await apiFetch(`/v1/galleries/photos/${id}`, {
    method: 'PATCH',
    body: { is_starred: isStarred ? 1 : 0 },
  });
  return data?.photo;
}

// ---------- photographer profile ----------

export async function getOwnFullProfile() {
  const data = await apiFetch('/v1/me/profile');
  return data?.profile ?? null;
}

export async function getPhotographerProfile(photographerId) {
  const data = await apiFetch('/v1/me/profile').catch(() => null);
  if (data?.profile && (!photographerId || data.profile.id === photographerId)) return data.profile;
  if (!photographerId) return null;
  const pub = await apiFetch(`/v1/public/photographer/by-id/${photographerId}`).catch(() => null);
  return pub?.photographer ?? null;
}

export async function getPhotographerProfileBySlug(slug) {
  const data = await apiFetch(`/v1/public/photographer/by-slug/${encodeURIComponent(slug)}`).catch(() => null);
  return data?.photographer ?? null;
}

export async function getPhotographerProfileByCustomDomain(domain) {
  const data = await apiFetch(`/v1/public/photographer/by-domain/${encodeURIComponent(domain)}`).catch(() => null);
  return data?.photographer ?? null;
}

export async function updatePhotographerProfile(photographerId, updates) {
  void photographerId;
  const data = await apiFetch('/v1/me/profile', { method: 'PATCH', body: updates });
  return data?.profile;
}

// ---------- sessions / visitors ----------

export async function registerGalleryVisitor({ collectionId, email, name, phone } = {}) {
  const data = await apiFetch('/v1/engage/sessions', {
    method: 'POST',
    auth: false,
    body: { collectionId, email, name: name ?? null, phone: phone ?? null },
  });
  return data?.session;
}

export async function createOrGetSession(collectionId, email, options = {}) {
  const data = await apiFetch('/v1/engage/sessions', {
    method: 'POST',
    auth: false,
    body: {
      collectionId,
      email,
      name: options.name ?? null,
      phone: options.phone ?? null,
      ensureDefaultFavoriteList: options.ensureDefaultFavoriteList !== false,
    },
  });
  return data?.session;
}

// ---------- favorites ----------

export async function getFavorites(sessionId, listId = null) {
  if (!sessionId) return [];
  const lists = await getFavoriteListsForSession(sessionId);
  const target = listId ? lists.filter((l) => l.id === listId) : lists;
  const photoIds = [];
  for (const list of target) {
    const data = await apiFetch(`/v1/engage/lists/${list.id}/photos`).catch(() => null);
    for (const row of data?.photos || []) {
      const id = row?.id ?? row?.photo_id ?? row;
      if (id != null && id !== '') photoIds.push(String(id));
    }
  }
  return [...new Set(photoIds)];
}

export async function getFavoriteListPublic(listId) {
  const data = await apiFetch(`/v1/engage/lists/${listId}`).catch(() => null);
  return data?.list ?? null;
}

export async function getFavoriteListById(listId) {
  return getFavoriteListPublic(listId);
}

export async function submitFavoriteList(listId, sessionId) {
  const data = await apiFetch(`/v1/engage/lists/${listId}/submit`, {
    method: 'POST',
    auth: false,
    body: { sessionId },
  });
  return data;
}

export async function reopenFavoriteList(listId) {
  const data = await apiFetch(`/v1/engage/lists/${listId}/reopen`, { method: 'POST', body: {} });
  return data;
}

export async function notifyPhotographerFavoriteSubmit({ listId, sessionId, clientMessage }) {
  await apiFetch('/v1/emails/favorite-submit', {
    method: 'POST',
    auth: false,
    body: { listId, sessionId, clientMessage: clientMessage ?? null },
  });
}

export async function createFavoriteList(collectionId, sessionId, listName, meta = {}) {
  const data = await apiFetch('/v1/engage/lists', {
    method: 'POST',
    auth: false,
    body: { collectionId, sessionId, name: listName, description: meta.description ?? null, maxSelection: meta.maxSelection ?? null },
  });
  return data?.list;
}

export async function toggleFavorite(sessionId, photoId, isFavorite, listId = null) {
  let targetId = listId;
  if (!targetId) {
    const lists = await getFavoriteListsForSession(sessionId);
    targetId = lists[0]?.id;
    if (!targetId) throw new Error('No favorite list found for this session.');
  }
  await apiFetch(`/v1/engage/lists/${targetId}/items`, {
    method: 'POST',
    auth: false,
    body: { sessionId, photoId, isFavorite: !!isFavorite },
  });
  return { favorited: !!isFavorite };
}

export async function getFavoriteActivity(collectionId) {
  if (!collectionId) return [];
  const data = await apiFetch(`/v1/engage/lists/by-collection/${encodeURIComponent(collectionId)}`).catch(() => null);
  return (data?.lists || []).map((row) => ({
    ...row,
    email: row.email || null,
    photoCount: Number(row.photoCount) || 0,
    updated_at: row.updated_at || row.created_at,
    sessionId: row.session_id ?? row.sessionId ?? null,
    coverUrl: row.cover_url ?? row.coverUrl ?? null,
  }));
}

export async function getCollectionFavoriteOverlayPhotoIds(collectionId) {
  if (!collectionId) return { favoritedPhotoIds: [], selectionListPhotoIds: [] };
  const data = await apiFetch(`/v1/engage/lists/by-collection/${encodeURIComponent(collectionId)}/overlay`).catch(() => null);
  return {
    favoritedPhotoIds: data?.favoritedPhotoIds || [],
    selectionListPhotoIds: data?.selectionListPhotoIds || [],
  };
}

export async function getFavoriteListPhotos(listId) {
  const data = await apiFetch(`/v1/engage/lists/${listId}/photos`).catch(() => null);
  return data?.photos || [];
}

export async function getFavoriteListItemRows(listId) {
  const rows = await getFavoriteListPhotos(listId);
  // Selection detail, shared links, dashboard drawer and export were built
  // for the Supabase-era shape and read `row.photo`; the Workers endpoint
  // returns flat photo rows, so expose both views on each row.
  return rows.map((row) => ({
    ...row,
    photo: row,
    note: row.comment ?? null,
    itemCreatedAt: row.created_at ?? null,
  }));
}

export async function getFavoriteListsForSession(sessionId) {
  if (!sessionId) return [];
  const data = await apiFetch(`/v1/engage/lists/by-session/${encodeURIComponent(sessionId)}`).catch(() => null);
  return (data?.lists || []).map((row) => ({
    ...row,
    photoCount: Number(row.photoCount) || 0,
    coverUrl: row.cover_url ?? row.coverUrl ?? null,
  }));
}

export async function updateFavoriteList(listId, updateData) {
  const data = await apiFetch(`/v1/engage/lists/${listId}`, { method: 'PATCH', body: updateData });
  return data?.list;
}

export async function deleteFavoriteList(listId) {
  await apiFetch(`/v1/engage/lists/${listId}`, { method: 'DELETE', body: {} });
}

export async function removePhotoFromFavoriteList(listId, photoId) {
  await apiFetch(`/v1/engage/lists/${listId}/items/${photoId}`, { method: 'DELETE' });
}

export async function getSessionDefaultFavoriteList(sessionId) {
  const lists = await getFavoriteListsForSession(sessionId);
  return lists[0] ?? null;
}

// ---------- activity ----------

export async function getDownloadActivity(collectionId) {
  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&type=download&limit=500`).catch(() => null);
  return data?.activity || [];
}

export async function deleteActivity(activityId) {
  await apiFetch(`/v1/engage/activity/${activityId}`, { method: 'DELETE' });
}

export async function logActivity(collectionId, eventType, data = {}) {
  const { sessionId, photoId, visitorEmail, resolution, ...metadata } = data || {};
  await apiFetch('/v1/engage/activity', {
    method: 'POST',
    auth: false,
    body: { collectionId, eventType, sessionId: sessionId ?? null, photoId: photoId ?? null, visitorEmail: visitorEmail ?? null, resolution: resolution ?? null, metadata },
  });
}

export async function getDownloadCount(collectionId) {
  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&type=download&limit=1`).catch(() => null);
  return data?.counts?.download ?? 0;
}

/** Background digital-package cart sync. */
export async function syncDigitalCartItem(sessionId, { productType, name, unitPrice, options }) {
  if (!sessionId || !productType) return null;
  const data = await apiFetch('/v1/printstore/cart/sync-digital', {
    method: 'POST',
    auth: false,
    body: { sessionId, productType, name: name ?? productType, unitPrice: unitPrice ?? 0, options: options ?? null },
  });
  return data;
}

export async function getPinUsageCount(collectionId) {  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&type=password_attempt&limit=2000`).catch(() => null);
  return (data?.activity || []).filter(
    (row) => {
      try {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        return meta?.success === true && meta?.type === 'download_pin';
      } catch {
        return false;
      }
    },
  ).length;
}

export async function getEmailRegistrationActivity(collectionId) {
  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&type=email_register&limit=500`).catch(() => null);
  return data?.activity || [];
}

export async function getGalleryOpenActivity(collectionId) {
  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&type=gallery_view&limit=500`).catch(() => null);
  return data?.activity || [];
}

export async function getActivityCounts(collectionId) {
  const data = await apiFetch(`/v1/engage/activity?collectionId=${encodeURIComponent(collectionId)}&limit=1`).catch(() => null);
  return data?.counts || {};
}

// ---------- reminders / vault / share ----------

export async function getCollectionReminders(collectionId) {
  const data = await apiFetch(`/v1/engage/reminders?collectionId=${encodeURIComponent(collectionId)}`);
  return data?.reminders || [];
}

export async function createCollectionReminder(reminderData) {
  const data = await apiFetch('/v1/engage/reminders', { method: 'POST', body: reminderData });
  return data?.reminder;
}

export async function updateCollectionReminder(id, updateData) {
  const data = await apiFetch(`/v1/engage/reminders/${id}`, { method: 'PATCH', body: updateData });
  return data?.reminder;
}

export async function deleteCollectionReminder(id) {
  await apiFetch(`/v1/engage/reminders/${id}`, { method: 'DELETE' });
}

export async function ensureCollectionReminder(collectionId, patch = {}) {
  const existing = await getCollectionReminders(collectionId);
  if (existing.length > 0) {
    if (Object.keys(patch).length === 0) return existing[0];
    return updateCollectionReminder(existing[0].id, patch);
  }
  return createCollectionReminder({ collectionId, timing: '7 days before auto expiry date', subject: 'Gallery expiring soon', body: '', ...patch });
}

export async function shareCollectionByEmail({ collectionSlug, collectionId, recipientEmail, senderEmail, personalMessage, subject }) {
  const data = await apiFetch('/v1/emails/share-collection', {
    method: 'POST',
    body: { collectionSlug, collectionId: collectionId ?? null, recipientEmail, senderEmail: senderEmail ?? null, personalMessage: personalMessage ?? null, subject: subject ?? null },
  });
  return data;
}

export async function sendSelectionListEmail({ collectionSlug, recipientEmail, subject, message, chooseUrl }) {
  const data = await apiFetch('/v1/emails/selection', {
    method: 'POST',
    body: { collectionSlug, recipientEmail, subject: subject ?? null, message, chooseUrl: chooseUrl ?? null },
  });
  return data;
}

export async function getCollectionShareEmailHistory(collectionId) {
  const data = await apiFetch(`/v1/engage/share-history?collectionId=${encodeURIComponent(collectionId)}`);
  return data?.history || [];
}

export async function fetchVaultPlan(collectionId) {
  const data = await apiFetch(`/v1/engage/vault/${collectionId}`);
  return data?.plan ?? null;
}

export async function upsertVaultPlan(collectionId, settings) {
  const data = await apiFetch(`/v1/engage/vault/${collectionId}`, { method: 'PUT', body: settings });
  return data?.plan;
}

export async function upsertVaultPlanBatch(collectionIds, settings) {
  const plans = [];
  for (const collectionId of collectionIds || []) {
    plans.push(await upsertVaultPlan(collectionId, settings).catch(() => null));
  }
  return plans;
}

export async function listPresets() {
  const data = await apiFetch('/v1/engage/presets');
  return data?.presets || [];
}

export async function createPreset(name, settings) {
  const data = await apiFetch('/v1/engage/presets', { method: 'POST', body: { name, settings } });
  return data?.preset;
}

export async function deletePreset(id) {
  await apiFetch(`/v1/engage/presets/${id}`, { method: 'DELETE' });
}

// ---------- watermarks (GET /v1/watermarks) ----------

export async function listWatermarks() {
  const data = await apiFetch('/v1/watermarks');
  return data?.watermarks || [];
}

export async function getWatermark(id) {
  if (!id) return null;
  const rows = await listWatermarks();
  return rows.find((w) => w.id === id) ?? null;
}

export async function createWatermark(watermarkData) {
  const data = await apiFetch('/v1/watermarks', { method: 'POST', body: watermarkData });
  return data?.watermark;
}

export async function updateWatermark(id, updates) {
  const data = await apiFetch(`/v1/watermarks/${id}`, { method: 'PATCH', body: updates });
  return data?.watermark;
}

export async function deleteWatermark(id) {
  await apiFetch(`/v1/watermarks/${id}`, { method: 'DELETE' });
}

// ---------- cover focals (PATCH /v1/galleries/:id) ----------

export async function saveCollectionFocalPoint(collectionId, coverUrl, focalX, focalY) {
  const { normalizeFocalForDb, appendFocalToCoverUrl } = await import('../lib/focalPoint.js');
  const fx = normalizeFocalForDb(focalX);
  const fy = normalizeFocalForDb(focalY);
  const newCoverUrl = appendFocalToCoverUrl(coverUrl, fx, fy);
  return updateCollection(collectionId, { cover_url: newCoverUrl, cover_focal_x: fx, cover_focal_y: fy });
}

export async function saveCollectionCoverFocals(collectionId, coverUrl, focals, extra = {}) {
  const { focalsToDbPayload, stripMediaUrlHash, appendCoverFocalsToCoverUrl } = await import('../lib/focalPoint.js');
  const payload = focalsToDbPayload(focals);
  const primary = payload.desktop || payload.website || { x: 50, y: 50 };
  const cleanUrl = stripMediaUrlHash(coverUrl);
  try {
    return await updateCollection(collectionId, {
      ...extra,
      cover_url: cleanUrl,
      cover_focal_x: primary.x,
      cover_focal_y: primary.y,
      cover_focals: payload,
    });
  } catch {
    const hashedUrl = appendCoverFocalsToCoverUrl(cleanUrl, payload);
    return saveCollectionFocalPoint(collectionId, hashedUrl || cleanUrl, primary.x, primary.y);
  }
}

// ---------- store orders (GET /v1/store/orders + /v1/store/order-items) ----------

export async function getStoreOrders(collectionId) {
  if (!collectionId) return [];
  // Live storefront writes printstore_orders (the legacy `orders` table is dead).
  const data = await apiFetch(
    `/v1/printstore/studio/orders?collectionId=${encodeURIComponent(collectionId)}`
  ).catch(() => null);
  return data?.orders || [];
}

export async function getStoreOrderItems(collectionId) {
  if (!collectionId) return [];
  const orders = await getStoreOrders(collectionId);
  const ids = orders.map((o) => o.id).filter(Boolean).slice(0, 50);
  if (ids.length === 0) return [];
  const data = await apiFetch(
    `/v1/printstore/studio/order-items?ids=${encodeURIComponent(ids.join(','))}`
  ).catch(() => null);
  return data?.items || [];
}

// ---------- quota / storage reads (GET /v1/me/quota + /v1/me/storage) ----------

export async function getQuotaSnapshot() {
  const data = await apiFetch('/v1/me/quota').catch(() => null);
  return data?.quota ?? null;
}

export async function getStorageUsage() {
  const data = await apiFetch('/v1/me/storage').catch(() => null);
  if (!data) return null;
  return data;
}

// ---------- engage fan-out (GET /v1/engage/notifications + /v1/engage/studio-overview) ----------

export async function getNotificationsBulk(collectionIds) {
  const ids = [...new Set((collectionIds || []).filter(Boolean))];
  if (!ids.length) return { collections: [], downloads: [], favorites: [], orders: [], sessions: [], sessionEmails: [] };
  const data = await apiFetch(`/v1/engage/notifications?ids=${ids.map(encodeURIComponent).join(',')}`);
  const parseMeta = (row) => {
    if (row && typeof row.metadata === 'string') {
      try {
        return { ...row, metadata: JSON.parse(row.metadata) };
      } catch {
        return { ...row, metadata: null };
      }
    }
    return row;
  };
  return {
    collections: data?.collections || [],
    downloads: (data?.downloads || []).map(parseMeta),
    favorites: data?.favorites || [],
    orders: data?.orders || [],
    sessions: data?.sessions || [],
    sessionEmails: data?.sessionEmails || [],
  };
}

export async function getStudioOverview() {
  const data = await apiFetch('/v1/engage/studio-overview').catch(() => null);
  if (!data) return { deliveries: [], openedCollectionIds: [], printOrders: [], guestEvents: [], guests: [] };
  return data;
}

export async function listReferrals() {
  const data = await apiFetch('/v1/engage/referrals').catch(() => null);
  return data?.referrals || [];
}

export async function createReferral(referredEmail) {
  const data = await apiFetch('/v1/engage/referrals', { method: 'POST', body: { referredEmail } });
  return data?.referral;
}

export async function listContacts() {
  const data = await apiFetch('/v1/engage/contacts').catch(() => null);
  return data?.contacts || [];
}

// ---------- favorite default-list resolution (mirrors gallery.service preference) ----------

export async function resolveDefaultFavoriteList(sessionId) {
  if (!sessionId) return null;
  const lists = await getFavoriteListsForSession(sessionId);
  if (!lists?.length) return null;
  const my = lists.find((l) => l.name === 'My Favorites');
  if (my) return my;
  const clientLists = lists.filter((l) => !(l.max_selection != null && Number(l.max_selection) > 0));
  if (clientLists.length) return clientLists[clientLists.length - 1];
  const withCap = lists.filter((l) => l.max_selection != null && Number(l.max_selection) > 0);
  if (withCap.length) return withCap[0];
  return lists[0];
}

// ---------- client-exclusive access (PATCH /v1/galleries/sets/:setId + /photos/:photoId) ----------

export async function updateSetClientOnly(setId, isClientOnly) {
  const data = await apiFetch(`/v1/galleries/sets/${setId}`, {
    method: 'PATCH',
    body: { is_private: isClientOnly ? 1 : 0 },
  });
  return data?.set;
}

export async function setPhotoPrivate(photoId, isPrivate, collectionId) {
  const data = await apiFetch(`/v1/galleries/photos/${photoId}`, {
    method: 'PATCH',
    body: { is_private: isPrivate ? 1 : 0 },
  });
  if (collectionId) {
    try {
      await logActivity(collectionId, 'gallery_view', {
        photoId,
        metadata: { type: 'photo_private', photo_id: photoId, is_private: isPrivate },
      });
    } catch {
      // activity is best-effort
    }
  }
  return data?.photo;
}

// ---------- sales automations (GET/POST/DELETE /v1/engage/sales-automations) ----------

function salesAutomationsKey(photographerId) {
  return `pixnxt_sales_automations_${photographerId}`;
}

function readLocalAutomations(photographerId) {
  try {
    const local = localStorage.getItem(salesAutomationsKey(photographerId));
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export async function fetchSalesAutomations(photographerId) {
  if (!photographerId) return [];
  try {
    const data = await apiFetch('/v1/engage/sales-automations');
    return Array.isArray(data?.automations) ? data.automations : [];
  } catch {
    return readLocalAutomations(photographerId);
  }
}

export async function saveSalesAutomation(photographerId, automation) {
  if (!photographerId) throw new Error('photographerId is required');
  const now = new Date().toISOString();
  const payload = { ...automation, last_activity: now, updated_at: now };
  try {
    const data = await apiFetch('/v1/engage/sales-automations', { method: 'POST', body: payload });
    return data?.automation ?? payload;
  } catch {
    const targetId = automation.id || `auto_${Math.random().toString(36).slice(2, 11)}`;
    const next = { ...payload, id: targetId, created_at: automation.created_at || now };
    try {
      const automations = readLocalAutomations(photographerId);
      const idx = automations.findIndex((a) => a.id === targetId);
      if (idx >= 0) automations[idx] = next;
      else automations.push(next);
      localStorage.setItem(salesAutomationsKey(photographerId), JSON.stringify(automations));
    } catch {
      // ignore quota errors
    }
    return next;
  }
}

export async function deleteSalesAutomation(photographerId, id) {
  try {
    await apiFetch(`/v1/engage/sales-automations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // fall through to local mirror cleanup
  }
  try {
    const localStr = localStorage.getItem(salesAutomationsKey(photographerId));
    if (localStr) {
      const automations = JSON.parse(localStr).filter((a) => a.id !== id);
      localStorage.setItem(salesAutomationsKey(photographerId), JSON.stringify(automations));
    }
  } catch {
    // ignore
  }
}
