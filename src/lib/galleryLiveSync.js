export const GALLERY_LIVE_CHANNEL = 'pixnxt-gallery-update';
export const GALLERY_SETTINGS_STORAGE_PREFIX = 'pixnxt-gallery-settings:';
export const GALLERY_MEDIA_STORAGE_PREFIX = 'pixnxt-gallery-media:';

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
