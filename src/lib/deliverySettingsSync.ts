import type { Dispatch, SetStateAction } from 'react';
import { broadcastGalleryLive } from './galleryLiveSync';
import { galleryService } from '../services/gallery.service';
import { guestDeliveryService } from '../services/guestDelivery.service';

type SetCollectionFn = (value: any | ((prev: any) => any)) => void;
type SetGuestEventFn = Dispatch<SetStateAction<any>>;

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

/** Optimistic dashboard sync for guest_delivery_events.settings (and optional top-level columns). */
export async function persistGuestDeliveryEventSettings(
  photographerId: string | undefined,
  event: any,
  settingsPatch: Record<string, unknown>,
  onEventUpdated?: SetGuestEventFn,
  topLevelUpdates: Record<string, unknown> = {},
) {
  if (!photographerId || !event?.id) {
    throw new Error('Guest delivery is still loading. Try again in a moment.');
  }

  const previousEvent = event;
  const nextSettings = { ...(event.settings || {}), ...settingsPatch };
  const optimistic = { ...event, ...topLevelUpdates, settings: nextSettings };

  onEventUpdated?.(optimistic);

  const payload: Record<string, unknown> = { ...topLevelUpdates };
  if (Object.keys(settingsPatch).length > 0) {
    payload.settings = nextSettings;
  }

  try {
    const updated = await guestDeliveryService.updateEvent(photographerId, event.id, payload);
    onEventUpdated?.(updated);
    return updated;
  } catch (err) {
    onEventUpdated?.(previousEvent);
    console.error('Failed to save guest delivery settings:', err);
    throw err;
  }
}
