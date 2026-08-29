export const GALLERY_LIVE_CHANNEL = 'pixnxt-gallery-update';
export const GALLERY_SETTINGS_STORAGE_PREFIX = 'pixnxt-gallery-settings:';
export const GALLERY_MEDIA_STORAGE_PREFIX = 'pixnxt-gallery-media:';
export const GALLERY_PEOPLE_LABEL_PREFIX = 'pixnxt-gallery-people-label:';
export const PERSON_LABEL_UPDATED = 'PERSON_LABEL_UPDATED';
export const PERSON_LABEL_EVENT = 'pixnxt-person-label';

export function broadcastGalleryLive({
  type = 'SETTINGS_UPDATED',
  collectionId,
  slug,
  settings,
} = {}) {
  if (!collectionId && !slug) return;

  const payload = {
    type,
    collectionId,
    slug,
    settings: settings && typeof settings === 'object' ? settings : undefined,
    at: Date.now(),
  };

  try {
    if (collectionId && payload.settings) {
      localStorage.setItem(
        `${GALLERY_SETTINGS_STORAGE_PREFIX}${collectionId}`,
        JSON.stringify(payload)
      );
    }
    if (collectionId && type === 'MEDIA_UPDATED') {
      localStorage.setItem(
        `${GALLERY_MEDIA_STORAGE_PREFIX}${collectionId}`,
        JSON.stringify({ collectionId, slug, type, at: payload.at })
      );
    }
  } catch {
    /* ignore quota */
  }

  try {
    const channel = new BroadcastChannel(GALLERY_LIVE_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* BroadcastChannel optional */
  }
}

/** Sync a renamed person across delivery dashboard, preview, and client gallery tabs. */
export function broadcastPersonLabelUpdate({ collectionId, personId, label }) {
  if (!collectionId || !personId) return;
  const trimmed = String(label || '').trim();
  if (!trimmed) return;

  const payload = {
    type: PERSON_LABEL_UPDATED,
    collectionId,
    personId,
    label: trimmed,
    at: Date.now(),
  };

  try {
    localStorage.setItem(
      `${GALLERY_PEOPLE_LABEL_PREFIX}${collectionId}:${personId}`,
      JSON.stringify(payload)
    );
  } catch {
    /* ignore quota */
  }

  try {
    window.dispatchEvent(new CustomEvent(PERSON_LABEL_EVENT, { detail: payload }));
  } catch {
    /* ignore */
  }

  try {
    const channel = new BroadcastChannel(GALLERY_LIVE_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* BroadcastChannel optional */
  }
}

export function subscribePersonLabelUpdates(callback) {
  if (typeof callback !== 'function') return () => {};

  const handlePayload = (payload) => {
    if (payload?.type !== PERSON_LABEL_UPDATED) return;
    callback(payload);
  };

  const onCustom = (event) => handlePayload(event.detail);
  window.addEventListener(PERSON_LABEL_EVENT, onCustom);

  const onStorage = (event) => {
    if (!event.key?.startsWith(GALLERY_PEOPLE_LABEL_PREFIX) || !event.newValue) return;
    try {
      handlePayload(JSON.parse(event.newValue));
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('storage', onStorage);

  let channel = null;
  try {
    channel = new BroadcastChannel(GALLERY_LIVE_CHANNEL);
    channel.onmessage = (event) => handlePayload(event.data);
  } catch {
    /* BroadcastChannel optional */
  }

  return () => {
    window.removeEventListener(PERSON_LABEL_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}
