export const PHOTO_SORT_OPTIONS = [
  { value: 'position', label: 'Custom order' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
  { value: 'random', label: 'Random' },
];

export function sortMobileGalleryPhotos(photos, sortKey) {
  const copy = [...photos];
  switch (sortKey) {
    case 'name-asc':
      return copy.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
    case 'name-desc':
      return copy.sort((a, b) => (b.filename || '').localeCompare(a.filename || ''));
    case 'random': {
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    default:
      return copy.sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
  }
}

export function filterPhotosBySearch(photos, query) {
  const q = query.trim().toLowerCase();
  if (!q) return photos;
  return photos.filter((p) => (p.filename || '').toLowerCase().includes(q));
}
