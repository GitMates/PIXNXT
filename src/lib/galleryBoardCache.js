/** sessionStorage board for Client Gallery — instant paint + optimistic create/delete. */

export const GALLERY_BOARD_PREFIX = 'pixnxt_cg_board_';
export const GALLERY_BOARD_PENDING_DELETES_PREFIX = 'pixnxt_cg_pending_del_';
export const GALLERY_BOARD_PENDING_CREATES_PREFIX = 'pixnxt_cg_pending_create_';
/** Safety net if DELETE never settles / tab closed mid-flight. */
export const PENDING_DELETE_TTL_MS = 30 * 60 * 1000;
/** Keep optimistic creates until the list API catches up. */
export const PENDING_CREATE_TTL_MS = 5 * 60 * 1000;

function defaultStorage() {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

/**
 * Pending-delete map: id → { ts, done }
 * - done:false while DELETE is in flight (always hide)
 * - done:true after DELETE succeeds (hide until a fresh list omits the id)
 */
function readPendingDeleteMap(userId, storage = defaultStorage(), now = Date.now()) {
  if (!userId || !storage) return {};
  try {
    const raw = storage.getItem(`${GALLERY_BOARD_PENDING_DELETES_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    const map = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [id, entry] of Object.entries(parsed)) {
        if (!id) continue;
        if (typeof entry === 'number') {
          if (now - entry < PENDING_DELETE_TTL_MS) map[id] = { ts: entry, done: false };
          continue;
        }
        if (entry && typeof entry === 'object' && typeof entry.ts === 'number') {
          if (now - entry.ts < PENDING_DELETE_TTL_MS) {
            map[id] = { ts: entry.ts, done: Boolean(entry.done) };
          }
        }
      }
    } else if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (id) map[id] = { ts: now, done: false };
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writePendingDeleteMap(userId, map, storage = defaultStorage()) {
  if (!userId || !storage) return;
  try {
    const key = `${GALLERY_BOARD_PENDING_DELETES_PREFIX}${userId}`;
    const entries = Object.keys(map || {});
    if (!entries.length) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function markCollectionPendingDelete(userId, collectionId, storage = defaultStorage()) {
  if (!userId || !collectionId) return;
  const map = readPendingDeleteMap(userId, storage);
  map[collectionId] = { ts: Date.now(), done: false };
  writePendingDeleteMap(userId, map, storage);
}

/** Call after DELETE HTTP succeeds — keep hiding until a list response omits the id. */
export function markCollectionDeleteSettled(userId, collectionId, storage = defaultStorage()) {
  if (!userId || !collectionId) return;
  const map = readPendingDeleteMap(userId, storage);
  if (!map[collectionId]) {
    map[collectionId] = { ts: Date.now(), done: true };
  } else {
    map[collectionId] = { ...map[collectionId], done: true };
  }
  writePendingDeleteMap(userId, map, storage);
}

export function clearCollectionPendingDelete(userId, collectionId, storage = defaultStorage()) {
  if (!userId || !collectionId) return;
  const map = readPendingDeleteMap(userId, storage);
  delete map[collectionId];
  writePendingDeleteMap(userId, map, storage);
}

/** Always hide pending-delete ids. Never auto-clear in-flight (done:false) tombstones. */
export function filterPendingDeletedCollections(userId, collections, storage = defaultStorage()) {
  const rows = collections || [];
  const map = readPendingDeleteMap(userId, storage);
  const pendingIds = Object.keys(map);
  if (!pendingIds.length) return rows;
  return rows.filter((c) => !map[c.id]);
}

/**
 * After a non-stale list fetch: drop tombstones that are settled (DELETE done)
 * and no longer present in the API response.
 */
export function reconcileSettledDeletes(userId, fetchedCollections, storage = defaultStorage()) {
  const map = readPendingDeleteMap(userId, storage);
  const ids = Object.keys(map);
  if (!ids.length) return;
  const returned = new Set((fetchedCollections || []).map((c) => c.id));
  let changed = false;
  for (const id of ids) {
    if (map[id]?.done && !returned.has(id)) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writePendingDeleteMap(userId, map, storage);
}

function readPendingCreateMap(userId, storage = defaultStorage(), now = Date.now()) {
  if (!userId || !storage) return {};
  try {
    const raw = storage.getItem(`${GALLERY_BOARD_PENDING_CREATES_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    const map = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [id, entry] of Object.entries(parsed)) {
        const ts = entry && typeof entry === 'object' ? entry.ts : entry;
        if (id && typeof ts === 'number' && now - ts < PENDING_CREATE_TTL_MS) {
          map[id] = entry && typeof entry === 'object' ? entry : { ts, row: null };
        }
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writePendingCreateMap(userId, map, storage = defaultStorage()) {
  if (!userId || !storage) return;
  try {
    const key = `${GALLERY_BOARD_PENDING_CREATES_PREFIX}${userId}`;
    const entries = Object.keys(map || {});
    if (!entries.length) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function markCollectionPendingCreate(userId, collection, storage = defaultStorage()) {
  if (!userId || !collection?.id) return;
  const map = readPendingCreateMap(userId, storage);
  map[collection.id] = { ts: Date.now(), row: collection };
  writePendingCreateMap(userId, map, storage);
}

export function clearCollectionPendingCreate(userId, collectionId, storage = defaultStorage()) {
  if (!userId || !collectionId) return;
  const map = readPendingCreateMap(userId, storage);
  delete map[collectionId];
  writePendingCreateMap(userId, map, storage);
}

const COVER_BOARD_FIELDS = [
  'cover_url',
  'cover',
  'list_cover_url',
  'cover_photo_id',
  'cover_source',
  'cover_focal_x',
  'cover_focal_y',
  'cover_focals',
];

function boardRowIsNewer(boardRow, apiRow) {
  const boardAt = boardRow?.updated_at;
  const apiAt = apiRow?.updated_at;
  if (!boardAt) return false;
  if (!apiAt) return true;
  return String(boardAt) > String(apiAt);
}

function mergeBoardOverlay(apiRow, boardRow) {
  if (!boardRow) return apiRow;
  let next = apiRow;
  if (boardRow.is_starred !== undefined) {
    next = { ...next, is_starred: boardRow.is_starred };
  }
  if (boardRowIsNewer(boardRow, apiRow) && COVER_BOARD_FIELDS.some((key) => key in boardRow)) {
    const coverPatch = {};
    for (const key of COVER_BOARD_FIELDS) {
      if (key in boardRow) coverPatch[key] = boardRow[key];
    }
    next = { ...next, ...coverPatch, updated_at: boardRow.updated_at || next.updated_at };
  }
  return next;
}

/**
 * Merge list-API rows with optimistic creates so a slow/incomplete refetch
 * cannot wipe deliveries the user just created.
 */
export function mergeFetchedBoardCollections(userId, fetched, storage = defaultStorage()) {
  reconcileSettledDeletes(userId, fetched, storage);
  const pendingDeletes = new Set(Object.keys(readPendingDeleteMap(userId, storage)));
  const boardById = new Map(
    (readGalleryBoard(userId, storage)?.collections || []).map((c) => [c.id, c]),
  );
  const apiRows = filterPendingDeletedCollections(userId, fetched || [], storage).map((c) =>
    mergeBoardOverlay(c, boardById.get(c.id)),
  );
  const byId = new Map(apiRows.map((c) => [c.id, c]));

  const pendingCreates = readPendingCreateMap(userId, storage);
  let createMapChanged = false;
  for (const [id, entry] of Object.entries(pendingCreates)) {
    if (pendingDeletes.has(id)) {
      delete pendingCreates[id];
      createMapChanged = true;
      continue;
    }
    if (byId.has(id)) {
      delete pendingCreates[id];
      createMapChanged = true;
      continue;
    }
    const row = entry?.row || readGalleryBoard(userId, storage)?.collections?.find((c) => c.id === id);
    if (row) byId.set(id, row);
  }
  if (createMapChanged) writePendingCreateMap(userId, pendingCreates, storage);

  const pendingIds = Object.keys(pendingCreates);
  if (!pendingIds.length) return [...byId.values()];

  const merged = [];
  const seen = new Set();
  for (const id of pendingIds) {
    const row = byId.get(id);
    if (row) {
      merged.push(row);
      seen.add(id);
    }
  }
  for (const row of apiRows) {
    if (!seen.has(row.id)) merged.push(row);
  }
  return merged;
}

export function readGalleryBoard(userId, storage = defaultStorage()) {
  if (!userId || !storage) return null;
  try {
    const raw = storage.getItem(`${GALLERY_BOARD_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.collections) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeGalleryBoard(userId, collections, folders, storage = defaultStorage()) {
  if (!userId || !storage) return;
  try {
    storage.setItem(
      `${GALLERY_BOARD_PREFIX}${userId}`,
      JSON.stringify({
        collections: filterPendingDeletedCollections(userId, collections || [], storage),
        folders: folders || [],
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function clearGalleryBoard(userId, storage = defaultStorage()) {
  if (!userId || !storage) return;
  try {
    storage.removeItem(`${GALLERY_BOARD_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

export function removeCollectionFromBoardData(board, collectionId) {
  return {
    collections: (board?.collections || []).filter((c) => c.id !== collectionId),
    folders: board?.folders || [],
  };
}

export function upsertCollectionOnBoardData(board, collection) {
  if (!collection?.id) {
    return {
      collections: board?.collections || [],
      folders: board?.folders || [],
    };
  }
  const collections = board?.collections || [];
  const folders = board?.folders || [];
  const idx = collections.findIndex((c) => c.id === collection.id);
  const nextCollections =
    idx >= 0
      ? collections.map((c, i) => (i === idx ? { ...c, ...collection } : c))
      : [collection, ...collections];
  return { collections: nextCollections, folders };
}

export function removeCollectionFromBoard(userId, collectionId, storage = defaultStorage()) {
  clearCollectionPendingCreate(userId, collectionId, storage);
  markCollectionPendingDelete(userId, collectionId, storage);
  const next = removeCollectionFromBoardData(readGalleryBoard(userId, storage), collectionId);
  writeGalleryBoard(userId, next.collections, next.folders, storage);
  return next;
}

export function upsertCollectionOnBoard(userId, collection, storage = defaultStorage()) {
  const next = upsertCollectionOnBoardData(readGalleryBoard(userId, storage), collection);
  writeGalleryBoard(userId, next.collections, next.folders, storage);
  return next;
}

/** Write cover fields to the Deliveries board so navigating back paints immediately. */
export function syncCollectionCoverOnBoard(userId, collectionId, patch, storage = defaultStorage()) {
  if (!userId || !collectionId || !patch) return null;
  return upsertCollectionOnBoard(
    userId,
    {
      id: collectionId,
      ...patch,
      updated_at: patch.updated_at || new Date().toISOString(),
    },
    storage,
  );
}

/** Optimistic create/duplicate — board row + pending-create so refetch cannot wipe it. */
export function rememberCreatedCollection(userId, collection, storage = defaultStorage()) {
  markCollectionPendingCreate(userId, collection, storage);
  return upsertCollectionOnBoard(userId, collection, storage);
}
