/** Human label for download destination stored in activity_log.metadata.destination */
export function formatDownloadDestination(destination) {
  if (destination === 'google_drive') return 'Google Drive';
  return 'Local';
}

/**
 * Photos included in a download activity row (gallery set, all photos, or single file).
 */
export function resolvePhotosForDownloadActivity(item, photos = [], sets = []) {
  if (!item) return [];

  const type = item.type;
  if (type === 'single' || type === 'photo' || type === 'video') {
    const photo =
      photos.find(
        (p) =>
          (item.photoId && p.id === item.photoId) ||
          (item.filename && p.filename === item.filename)
      ) || null;
    return photo ? [photo] : [];
  }

  if (type === 'gallery') {
    const setName = item.setName;
    if (!setName || setName === 'All Photos') {
      return photos;
    }
    if (setName === 'Highlights') {
      return photos.filter((p) => !p.set_id);
    }
    const set = sets.find((s) => s.name === setName);
    if (set) {
      return photos.filter((p) => p.set_id === set.id);
    }
    return photos;
  }

  return [];
}

export function countPhotosForDownloadActivity(item, photos = [], sets = []) {
  if (item?.photoCount != null && Number(item.photoCount) > 0) {
    return Number(item.photoCount);
  }
  const resolved = resolvePhotosForDownloadActivity(item, photos, sets);
  return resolved.length > 0 ? resolved.length : 1;
}

/** Thumbnail source photo for a download activity list row */
export function pickDownloadActivityThumbPhoto(item, photos = [], sets = []) {
  if (!item) return null;
  if (item.type === 'photo' || item.type === 'video' || item.type === 'single') {
    return (
      photos.find(
        (p) =>
          (item.photoId && p.id === item.photoId) ||
          (item.filename && p.filename === item.filename)
      ) || null
    );
  }
  if (item.type === 'gallery') {
    const resolved = resolvePhotosForDownloadActivity(item, photos, sets);
    return resolved[0] || null;
  }
  return null;
}
