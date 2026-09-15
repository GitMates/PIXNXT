/**
 * Mobile gallery backend (Cloudflare /v1/mobile + /v1/emails).
 * Mirrors mobileGallery / Photos / Public / Share / Settings surfaces.
 */
import { apiFetch } from '../lib/api/client';

// ---------- apps ----------

export async function getApps() {
  const data = await apiFetch('/v1/mobile/apps');
  return data?.apps || [];
}

export async function getApp(photographerId, appId) {
  void photographerId;
  const data = await apiFetch(`/v1/mobile/apps/${appId}`).catch(() => null);
  return data?.app ?? null;
}

export async function createApp({ photographer_id, name, event_date = null }) {
  void photographer_id;
  const data = await apiFetch('/v1/mobile/apps', {
    method: 'POST',
    body: { name, eventDate: event_date },
  });
  return data?.app;
}

export async function updateApp(photographerId, appId, updates) {
  void photographerId;
  const data = await apiFetch(`/v1/mobile/apps/${appId}`, { method: 'PATCH', body: updates });
  return data?.app;
}

export async function deleteApp(photographerId, appId) {
  void photographerId;
  await apiFetch(`/v1/mobile/apps/${appId}`, { method: 'DELETE' });
}

// ---------- photos ----------

export async function getPhotos(photographerId, appId) {
  void photographerId;
  const data = await apiFetch(`/v1/mobile/apps/${appId}/photos`);
  return (data?.photos || []).map((p) => ({
    ...p,
    web_url: p.full_url,
    thumbnail_url: p.thumbnail_url || p.full_url,
  }));
}

export async function uploadPhoto({ appId, file, position = 0, onProgress = null }) {
  const { storageService } = await import('./storage.service');
  const { getPhotographerR2Folder } = await import('../lib/photographerR2Folder');
  const { buildUserModulePath, R2_USER_MODULES } = await import('../lib/photographerR2FolderCore.js');
  const { getFileMime } = await import('../lib/fileMime');
  const { getImageDimensionsFast } = await import('../lib/imageDimensions');
  const me = await apiFetch('/v1/me');
  const photographerId = me?.photographer?.id;
  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const app = await getApp(photographerId, appId);
  const safeApp = String(app?.name || appId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'app';
  const storagePath = buildUserModulePath(
    await getPhotographerR2Folder(photographerId),
    R2_USER_MODULES.MOBILE_GALLERY,
    `${safeApp}__${appId}`,
    'photos',
    fileName,
  );
  const mime = getFileMime(file);
  const uploadBody = file.type === mime ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified });
  const [{ url: publicUrl }, dimensions] = await Promise.all([
    storageService.upload(storagePath, uploadBody, onProgress),
    getImageDimensionsFast(file),
  ]);
  const data = await apiFetch(`/v1/mobile/apps/${appId}/photos`, {
    method: 'POST',
    body: {
      filename: file.name,
      storagePath,
      fullUrl: publicUrl,
      thumbnailUrl: publicUrl,
      sizeBytes: file.size ?? 0,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      position,
    },
  });
  return data?.photo;
}

export async function deletePhoto(photographerId, appId, photoId) {
  void photographerId;
  await apiFetch(`/v1/mobile/apps/${appId}/photos/${photoId}`, { method: 'DELETE' });
}

export async function updatePhotoOrder(photographerId, appId, orderedPhotoIds) {
  void photographerId;
  await apiFetch(`/v1/mobile/apps/${appId}/photos/order`, {
    method: 'POST',
    body: { orderedIds: orderedPhotoIds || [] },
  });
}

// ---------- public ----------

export async function getPublishedAppBySlug(slug) {
  const data = await apiFetch(`/v1/mobile/public/apps/${encodeURIComponent(slug)}`, { auth: false }).catch(() => null);
  return data?.app ?? null;
}

export async function getPublishedAppPhotos(appIdOrApp) {
  const key = typeof appIdOrApp === 'string' ? appIdOrApp : appIdOrApp?.slug ?? appIdOrApp?.id;
  if (!key) return [];
  const data = await apiFetch(`/v1/mobile/public/apps/${encodeURIComponent(key)}/photos`, { auth: false }).catch(() => null);
  return (data?.photos || []).map((p) => ({
    ...p,
    web_url: p.full_url,
    thumbnail_url: p.thumbnail_url || p.full_url,
  }));
}

export async function getModuleBranding(photographerId) {
  const data = await apiFetch(`/v1/mobile/public/branding/${photographerId}`, { auth: false }).catch(() => null);
  return { photographer: data?.photographer ?? null, settings: data?.settings ?? null };
}

export async function getPhotographerBranding(photographerId) {
  const mod = await getModuleBranding(photographerId);
  return mod.photographer;
}

// ---------- share / settings ----------

export async function sendInvite({ appId, recipientEmail, subject, message, sendCopy, websiteLink, photographerProfile }) {
  void photographerProfile;
  const data = await apiFetch(`/v1/mobile/apps/${appId}/invites`, {
    method: 'POST',
    body: {
      recipientEmail, subject, message, sendCopy: sendCopy === true,
      websiteHref: websiteLink?.href ?? websiteLink ?? null,
      websiteLabel: websiteLink?.label ?? null,
    },
  });
  return data?.invite;
}

export async function getInviteHistory(photographerId, appId) {
  void photographerId;
  const data = await apiFetch(`/v1/mobile/apps/${appId}/invites`);
  return data?.invites || [];
}

export async function getSettings() {
  const data = await apiFetch('/v1/mobile/settings');
  return data?.settings ?? {};
}

export async function updateSettings(photographerId, updates) {
  void photographerId;
  // Merge with current settings (never wipe unrelated keys).
  const current = await getSettings().catch(() => ({}));
  const next = { ...(current || {}), ...(updates || {}) };
  const data = await apiFetch('/v1/mobile/settings', { method: 'PUT', body: { settings: next } });
  return data;
}
