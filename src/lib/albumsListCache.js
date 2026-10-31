/** In-memory Album Proofer collection list — instant paint when returning from an album. */

const cacheByUser = new Map();

export function readAlbumsListCache(userId) {
  if (!userId) return null;
  return cacheByUser.get(userId) || null;
}

export function writeAlbumsListCache(userId, { albums, proofSummaries } = {}) {
  if (!userId) return;
  const prev = cacheByUser.get(userId) || {};
  cacheByUser.set(userId, {
    albums: Array.isArray(albums) ? albums : prev.albums || [],
    proofSummaries:
      proofSummaries && typeof proofSummaries === 'object'
        ? proofSummaries
        : prev.proofSummaries || {},
    at: Date.now(),
  });
}

export function mapAlbumsListCache(userId, mapper) {
  if (!userId || typeof mapper !== 'function') return;
  const prev = cacheByUser.get(userId);
  if (!prev) return;
  writeAlbumsListCache(userId, {
    albums: mapper(prev.albums || []),
    proofSummaries: prev.proofSummaries,
  });
}

export function removeAlbumFromListCache(userId, albumId) {
  if (!userId || !albumId) return;
  mapAlbumsListCache(userId, (albums) => albums.filter((album) => album.id !== albumId));
  const prev = cacheByUser.get(userId);
  if (!prev?.proofSummaries?.[albumId]) return;
  const nextSummaries = { ...prev.proofSummaries };
  delete nextSummaries[albumId];
  writeAlbumsListCache(userId, { albums: prev.albums, proofSummaries: nextSummaries });
}

export function prependAlbumToListCache(userId, album) {
  if (!userId || !album?.id) return;
  mapAlbumsListCache(userId, (albums) => {
    const without = albums.filter((row) => row.id !== album.id);
    return [album, ...without];
  });
}

export function clearAlbumsListCache(userId) {
  if (!userId) cacheByUser.clear();
  else cacheByUser.delete(userId);
}
