/** Compare DB timestamps reliably (ISO strings may differ in precision/format). */
export function normalizeIndexedTimestamp(value) {
  if (value == null || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? String(value) : ms;
}

function timestampMs(value) {
  const normalized = normalizeIndexedTimestamp(value);
  return typeof normalized === 'number' ? normalized : 0;
}

export function isIndexedSnapshotFresh(state, indexedPhotoCount, maxIndexedAt) {
  if (!state) return false;
  if (state.indexed_photo_count !== indexedPhotoCount) return false;
  // People clusters must not predate the newest indexed metadata row (or the
  // latest indexing progress recorded on the collection state).
  const newestIndexedAt = Math.max(
    timestampMs(state.max_indexed_at),
    timestampMs(maxIndexedAt)
  );
  // Nothing indexed yet — treat the empty snapshot as fresh.
  if (newestIndexedAt === 0) return true;
  // Indexed metadata is only usable once the clustering pass that runs after
  // indexing has finished (queue auto-recluster). Without this, callers would
  // treat freshly-indexed-but-not-yet-clustered rows as fresh and show
  // "no faces detected yet" until a manual re-sync.
  const clusteredAt = timestampMs(state.clustered_at);
  return clusteredAt >= newestIndexedAt;
}

export function maxIndexedAtFromRows(rows) {
  let maxIndexedAt = null;
  for (const row of rows || []) {
    if (!row.indexed_at) continue;
    if (!maxIndexedAt || row.indexed_at > maxIndexedAt) {
      maxIndexedAt = row.indexed_at;
    }
  }
  return maxIndexedAt;
}
