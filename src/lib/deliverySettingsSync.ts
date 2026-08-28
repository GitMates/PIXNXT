import { broadcastGalleryLive } from './galleryLiveSync';
import { galleryService } from '../services/gallery.service';

type SetCollectionFn = (value: any | ((prev: any) => any)) => void;

/** Optimistic dashboard + live gallery sync for delivery settings toggles. */
export async function persistDeliverySettings(
  collectionId: string,
  slug: string | undefined,
  patch: Record<string, unknown>,
  setCollection?: SetCollectionFn
) {
  if (!collectionId || !patch || typeof patch !== 'object') return null;

  setCollection?.((prev: any) => (prev ? { ...prev, ...patch } : prev));
  broadcastGalleryLive({
    type: 'SETTINGS_UPDATED',
    collectionId,
    slug,
    settings: patch,
  });

  try {
    const updated = await galleryService.updateCollection(collectionId, patch);
    setCollection?.((prev: any) => (prev ? { ...prev, ...(updated || patch) } : prev));
    return updated;
  } catch (err) {
    console.error('Failed to save delivery setting:', err);
    throw err;
  }
}
