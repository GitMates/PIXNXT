import { photoAiService } from './photoAi.service';

const reclusterTimers = new Map();

/** Index one uploaded photo, then debounce a single people recluster for the collection. */
export function queuePhotoAiIndex(collectionId, photoId) {
  if (!collectionId || !photoId) return;

  void photoAiService.indexPhoto(photoId).catch((err) => {
    console.warn('[photoAi] auto index failed:', err?.message || err);
  });

  schedulePhotoAiRecluster(collectionId);
}

/** Debounce clustering so bulk uploads trigger one AWS cluster pass, not one per photo. */
export function schedulePhotoAiRecluster(collectionId, delayMs = 3000) {
  if (!collectionId) return;

  const existing = reclusterTimers.get(collectionId);
  if (existing) clearTimeout(existing);

  reclusterTimers.set(
    collectionId,
    setTimeout(() => {
      reclusterTimers.delete(collectionId);
      void photoAiService.reclusterCollection(collectionId).catch((err) => {
        console.warn('[photoAi] auto recluster failed:', err?.message || err);
      });
    }, delayMs)
  );
}
