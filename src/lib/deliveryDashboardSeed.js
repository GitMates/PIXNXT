/** In-memory seed so create/duplicate can open the editor without a loader flash. */

export function deliveryDashboardSeed(gallery) {
  if (!gallery?.id) return null;
  return {
    ...gallery,
    photos: Array.isArray(gallery.photos) ? gallery.photos : [],
    sets: Array.isArray(gallery.sets) ? gallery.sets : [],
  };
}

export function matchingDeliverySeed(seed, collectionId) {
  if (!seed?.id || !collectionId) return null;
  return String(seed.id) === String(collectionId) ? seed : null;
}

export function shouldBlockDeliveryOpen({ collectionId, seed = null, collection = null } = {}) {
  if (matchingDeliverySeed(seed, collectionId)) return false;
  if (collection?.id && collectionId && String(collection.id) === String(collectionId)) {
    return false;
  }
  return true;
}

export function deliveryManageNavState(gallery, extraState = {}) {
  return {
    ...extraState,
    seed: deliveryDashboardSeed(gallery),
  };
}
