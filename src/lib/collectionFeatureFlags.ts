/**
 * Whether a collection feature is enabled for visitors.
 * Matches download/favorites: omitted or null defaults to enabled; only explicit false hides UI.
 */
export function isCollectionFeatureEnabled(
  value: boolean | null | undefined
): boolean {
  return value !== false;
}

const SLIDESHOW_CACHE_PREFIX = 'pixnxt_slideshow_';

export const SLIDESHOW_CHANGED_EVENT = 'pixnxt-slideshow-changed';

export function getSlideshowStorageKey(collectionId: string): string {
  return `${SLIDESHOW_CACHE_PREFIX}${collectionId}`;
}

/** Persist slideshow toggle across tabs (dashboard + public gallery). */
export function cacheSlideshowEnabled(collectionId: string, enabled: boolean): void {
  if (typeof window === 'undefined' || !collectionId) return;
  try {
    localStorage.setItem(getSlideshowStorageKey(collectionId), enabled ? '1' : '0');
    window.dispatchEvent(
      new CustomEvent(SLIDESHOW_CHANGED_EVENT, {
        detail: { collectionId, enabled },
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCachedSlideshowEnabled(collectionId: string): boolean | null {
  if (typeof window === 'undefined' || !collectionId) return null;
  try {
    const value = localStorage.getItem(getSlideshowStorageKey(collectionId));
    if (value === '0') return false;
    if (value === '1') return true;
  } catch {
    /* ignore */
  }
  return null;
}

type SlideshowCollectionFields = {
  id?: string;
  slideshow_enabled?: boolean | null;
  slideshow?: boolean | null;
};

/**
 * Slideshow nav visibility — same rules as social sharing (`!== false`), with legacy
 * `slideshow` column and localStorage when `slideshow_enabled` is absent on the row.
 */
export function isSlideshowEnabledForCollection(
  collection: SlideshowCollectionFields | null | undefined
): boolean {
  if (!collection) return true;

  if (collection.slideshow_enabled !== undefined && collection.slideshow_enabled !== null) {
    return collection.slideshow_enabled !== false;
  }

  if (collection.slideshow !== undefined && collection.slideshow !== null) {
    return collection.slideshow !== false;
  }

  if (collection.id) {
    const cached = readCachedSlideshowEnabled(collection.id);
    if (cached === false) return false;
    if (cached === true) return true;
  }

  return true;
}

/** Merge cached / legacy slideshow flags onto a collection row from the API. */
export function withResolvedSlideshowEnabled<T extends SlideshowCollectionFields>(
  collection: T
): T {
  if (!collection?.id) return collection;
  if (
    collection.slideshow_enabled !== undefined &&
    collection.slideshow_enabled !== null
  ) {
    return collection;
  }

  const cached = readCachedSlideshowEnabled(collection.id);
  if (cached !== null) {
    return { ...collection, slideshow_enabled: cached };
  }

  if (collection.slideshow !== undefined && collection.slideshow !== null) {
    return { ...collection, slideshow_enabled: collection.slideshow !== false };
  }

  return collection;
}

/** Parse `slideshow` query param from preview links (`1` / `0`). */
export function parseSlideshowQueryParam(
  value: string | null | undefined
): boolean | undefined {
  if (value === '1') return true;
  if (value === '0') return false;
  return undefined;
}
