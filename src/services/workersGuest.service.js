/**
 * Guest delivery backend (Cloudflare /v1/guest + /v1/emails).
 * Mirrors guestDelivery / Guests / Photos / Publish service surfaces.
 */
import { apiFetch } from '../lib/api/client';

// ---------- events ----------

export async function getEvents() {
  const data = await apiFetch('/v1/guest/events');
  return data?.events || [];
}

export async function getEvent(photographerId, eventId) {
  const data = await apiFetch(`/v1/guest/events/${eventId}`);
  return data?.event ?? null;
}

export async function getEventBySlug(slug) {
  // Public registration pages resolve the event through the gallery endpoint.
  const data = await apiFetch('/v1/guest/gallery', {
    method: 'POST',
    auth: false,
    body: { slug },
  }).catch(() => null);
  return data?.event ?? null;
}

export async function createEvent({ photographer_id, name, event_date = null }) {
  void photographer_id;
  const data = await apiFetch('/v1/guest/events', {
    method: 'POST',
    body: { name, eventDate: event_date },
  });
  return data?.event;
}

export async function updateEvent(photographerId, eventId, updates) {
  void photographerId;
  const data = await apiFetch(`/v1/guest/events/${eventId}`, { method: 'PATCH', body: updates });
  return data?.event;
}

export async function deleteEvent(photographerId, eventId) {
  void photographerId;
  await apiFetch(`/v1/guest/events/${eventId}`, { method: 'DELETE' });
}

export async function createLinkedEvent({ collectionId, photographerId, name, eventDate, slug }) {
  void photographerId;
  const data = await apiFetch('/v1/guest/events', {
    method: 'POST',
    body: { name, eventDate: eventDate ?? null, slug: slug ?? null, collectionId: collectionId ?? null },
  });
  return data?.event;
}

export async function getEventByCollectionId(collectionId) {
  const data = await apiFetch('/v1/guest/events');
  return (data?.events || []).find((e) => e.collection_id === collectionId) ?? null;
}

// ---------- guests ----------

export async function getGuests(photographerId, eventId) {
  const data = await apiFetch(`/v1/guest/events/${eventId}/guests`);
  return data?.guests || [];
}

export async function deleteGuest(photographerId, eventId, guestId) {
  void photographerId;
  await apiFetch(`/v1/guest/events/${eventId}/guests/${guestId}`, { method: 'DELETE' });
}

// ---------- photos ----------

export async function getPhotos(photographerId, eventId) {
  void photographerId;
  const data = await apiFetch(`/v1/guest/events/${eventId}/photos`);
  return data?.photos || [];
}

export async function getLibraryPhotos() {
  const { events } = { events: await getEvents() };
  const photos = [];
  for (const event of events.slice(0, 50)) {
    const data = await apiFetch(`/v1/guest/events/${event.id}/photos`).catch(() => null);
    photos.push(...(data?.photos || []).map((p) => ({ ...p, event_id: event.id, event_name: event.name })));
  }
  return photos;
}

export async function uploadGuestPhoto({ photographerId, eventId, file, position = 0, onProgress } = {}) {
  const { storageService } = await import('./storage.service');
  const { apiFetch: fetchApi } = await import('../lib/api/client');
  const me = await fetchApi('/v1/me');
  const userId = me?.photographer?.id;
  const ownerId = photographerId ?? userId;
  if (ownerId) {
    const { photographerQuotaService } = await import('./photographerQuota.service');
    await photographerQuotaService.assertGuestImageQuota(ownerId, 1);
  }
  const safe = String(file.name || 'photo.jpg').replace(/[^\w.-]+/g, '-');
  const path = `u/${userId}/guestdelivery/${eventId}/${Date.now()}-${safe}`;
  const uploaded = await storageService.upload(path, file, onProgress);
  const data = await fetchApi(`/v1/guest/events/${eventId}/photos`, {
    method: 'POST',
    body: {
      filename: file.name,
      storagePath: uploaded.path,
      fullUrl: uploaded.url,
      sizeBytes: file.size ?? 0,
      position,
    },
  });
  return data?.photo;
}

export async function deleteGuestPhoto(photographerId, eventId, photoId) {
  void photographerId;
  await apiFetch(`/v1/guest/events/${eventId}/photos/${photoId}`, { method: 'DELETE' });
}

export async function updateGuestPhotoOrder(photographerId, eventId, orderedPhotoIds) {
  void photographerId;
  await apiFetch(`/v1/guest/events/${eventId}/photos/order`, {
    method: 'POST',
    body: { orderedIds: orderedPhotoIds || [] },
  });
  return { ok: true };
}

// ---------- publish / gallery / match ----------

export async function publishEvent(eventId) {
  const data = await apiFetch(`/v1/guest/events/${eventId}/publish`, { method: 'POST', body: {} });
  return data;
}

export async function sendDeliveryEmail({ eventId, guestId, sendCopy = false }) {
  const data = await apiFetch('/v1/emails/guest-delivery', {
    method: 'POST',
    body: { eventId, guestId, sendCopy },
  });
  return data;
}

export async function loadGuestGallery({ slug, accessToken }) {
  const data = await apiFetch('/v1/guest/gallery', {
    method: 'POST',
    auth: false,
    body: { slug, accessToken: accessToken ?? null },
  });
  return data;
}

export async function matchGuestSelfie({ eventId, guestId, threshold }) {
  const data = await apiFetch('/v1/guest/match', {
    method: 'POST',
    auth: false,
    body: { eventId, guestId, threshold: threshold ?? 80 },
  });
  return data;
}
