/** Compare DB timestamps reliably (ISO strings may differ in precision/format). */
export function normalizeIndexedTimestamp(value) {
  if (value == null || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? String(value) : ms;
}

export function isIndexedSnapshotFresh(state, indexedPhotoCount, maxIndexedAt) {
  if (!state) return false;
  if (state.indexed_photo_count !== indexedPhotoCount) return false;
  return (
    normalizeIndexedTimestamp(state.max_indexed_at) ===
    normalizeIndexedTimestamp(maxIndexedAt)
  );
}
