import { supabase } from '../lib/supabase/client';
import { albumProofService } from './albumProof.service';
import { smartAlbumProoferSettingsService } from './smartAlbumProoferSettings.service';
import { categoryTagsToDb } from '../lib/categoryTags';
import { deleteAlbumCollectionAssets, getAlbumCollectionStorageBytes } from '../components/smart-albums/albumCollection';
import { clearAllAlbumPagePhotos } from '../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms } from '../components/smart-albums/albumPageTransforms';
import {
  buildAlbumPreviewSnapshot,
  getAlbumIdsWithLocalAssets,
  hydrateAlbumPreviewData,
  patchAlbumPreviewProoferAccess,
} from '../components/smart-albums/albumPreviewData';
import { protectPreviewSnapshot } from '../components/smart-albums/albumPreviewGuard';
import { getAlbumCoverColor } from '../components/smart-albums/albumCoverColor';
import { getAlbumSpineBoundsOverride } from '../components/smart-albums/albumSpineSettings';
import { duplicateAlbumAssets } from '../components/smart-albums/albumDuplicate';
import { repairAlbumPreviewFromServer, previewNeedsAssetRepair, repairAllMyAlbumPreviewsFromServer } from '../lib/repairAlbumPreview';



const STORAGE_KEY = 'pixnxt_smart_albums_local';

const STARRED_OVR_KEY = 'pixnxt_smart_albums_starred';

const SETTINGS_OVR_KEY = 'pixnxt_smart_album_settings_ovr';

const PAGECOUNT_OVR_KEY = 'pixnxt_smart_album_pagecount_ovr';

const GRID_SETTINGS_OVR_KEY = 'pixnxt_smart_album_grid_settings_ovr';

const REPAIRED_CATALOG_SESSION = new Set();

async function repairBrokenAlbumsForPhotographerInBackground(photographerId) {
  if (!photographerId || REPAIRED_CATALOG_SESSION.has(photographerId)) return null;
  REPAIRED_CATALOG_SESSION.add(photographerId);
  try {
    return await repairAllMyAlbumPreviewsFromServer();
  } catch (err) {
    // Allow retry later in the session if the API was temporarily unavailable.
    REPAIRED_CATALOG_SESSION.delete(photographerId);
    throw err;
  }
}



function generateSlug(name) {

  const base = String(name || 'album')

    .toLowerCase()

    .trim()

    .replace(/[^\w ]+/g, '')

    .replace(/ +/g, '-');

  return `${base || 'album'}-${Date.now().toString(36)}`;

}

function normalizeAlbumName(name) {
  return String(name || '').trim();
}

function albumNameKey(name) {
  return normalizeAlbumName(name).toLowerCase();
}



function readLocalAlbums(photographerId) {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    const all = raw ? JSON.parse(raw) : [];

    return all.filter((a) => a.photographer_id === photographerId);

  } catch {

    return [];

  }

}



function writeLocalAlbums(photographerId, albums) {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    const all = raw ? JSON.parse(raw) : [];

    const others = all.filter((a) => a.photographer_id !== photographerId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...albums]));

  } catch {

    /* ignore */

  }

}



function readStarredOverrides(photographerId) {

  try {

    const raw = localStorage.getItem(STARRED_OVR_KEY);

    const all = raw ? JSON.parse(raw) : {};

    return all[photographerId] || {};

  } catch {

    return {};

  }

}



function writeStarredOverride(photographerId, albumId, isStarred) {

  try {

    const raw = localStorage.getItem(STARRED_OVR_KEY);

    const all = raw ? JSON.parse(raw) : {};

    const userMap = { ...(all[photographerId] || {}), [albumId]: isStarred };

    all[photographerId] = userMap;

    localStorage.setItem(STARRED_OVR_KEY, JSON.stringify(all));

  } catch {

    /* ignore */

  }

}



function removeStarredOverride(photographerId, albumId) {

  try {

    const raw = localStorage.getItem(STARRED_OVR_KEY);

    const all = raw ? JSON.parse(raw) : {};

    const userMap = { ...(all[photographerId] || {}) };

    delete userMap[albumId];

    all[photographerId] = userMap;

    localStorage.setItem(STARRED_OVR_KEY, JSON.stringify(all));

  } catch {

    /* ignore */

  }

}



function isMissingTableError(error) {

  const msg = error?.message || '';

  const mentionsTable =
    msg.includes('album_proofer_albums') || msg.includes('smart_albums');

  return mentionsTable && (msg.includes('does not exist') || msg.includes('schema cache'));

}



function isMissingColumnError(error) {

  const msg = (error?.message || '').toLowerCase();

  const code = error?.code || '';

  return (

    code === '42703' ||

    code === 'PGRST204' ||

    msg.includes('is_starred') ||

    msg.includes('category_tags') ||

    msg.includes('expiry_date') ||

    msg.includes('comments_enabled') ||
    msg.includes('replies_enabled') ||
    msg.includes('messages_enabled') ||
    msg.includes('share_link_enabled') ||
    msg.includes('preview_data') ||
    msg.includes('grid_size') ||
    msg.includes('grid_layout') ||
    msg.includes('storage_bytes') ||

    (msg.includes('column') && msg.includes('does not exist'))

  );

}



function shouldUseLocalStore(error) {

  return isMissingTableError(error);

}

function isGenericColumnError(error) {
  if (isMissingColumnError(error)) return true;
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('column') &&
    (msg.includes('does not exist') || msg.includes('schema cache'))
  );
}

const ALBUM_DETAIL_FIELDS_MINIMAL =
  'id, photographer_id, name, event_date, slug, page_count, cover_image_url, status, created_at, updated_at';

const ALBUM_DETAIL_GRID_FIELDS = `${ALBUM_DETAIL_FIELDS_MINIMAL}, grid_size, grid_layout`;

async function selectAlbumRow(photographerId, albumId, fields) {
  return supabase
    .from('album_proofer_albums')
    .select(fields)
    .eq('photographer_id', photographerId)
    .eq('id', albumId)
    .maybeSingle();
}

const OPTIONAL_ALBUM_INSERT_COLUMNS = [
  'preview_data',
  'messages_enabled',
  'replies_enabled',
  'comments_enabled',
  'share_link_enabled',
  'share_link_paused_at',
  'proofer_settings',
  'expiry_date',
  'category_tags',
  'is_starred',
  'grid_layout',
  'grid_size',
  'storage_bytes',
];

/** List view only — omit heavy preview_data JSON blobs. */
const ALBUM_LIST_FIELDS = [
  'id',
  'photographer_id',
  'name',
  'event_date',
  'slug',
  'page_count',
  'cover_image_url',
  'status',
  'grid_size',
  'grid_layout',
  'comments_enabled',
  'replies_enabled',
  'messages_enabled',
  'share_link_enabled',
  'share_link_paused_at',
  'created_at',
  'updated_at',
  'client_approved_at',
  'client_approved_by',
  'client_changes_submitted_at',
  'client_changes_submitted_by',
  'client_commenting_started_at',
  'client_commenting_started_by',
  'client_contact_email',
  'client_contact_name',
  'client_last_activity_at',
  'client_reminder_sent_at',
  'published_at',
  'revision_ready_notified_at',
  'client_approved_notified_at',
  'storage_bytes',
].join(', ');

function buildAlbumRowFromLocal(local, photographerId) {
  const settingsOvr = readSettingsOverrides(photographerId)[local.id] || {};
  const pageCountOvr = readPageCountOverrides(photographerId)[local.id];
  const starredOvr = readStarredOverrides(photographerId)[local.id];

  const row = {
    id: local.id,
    photographer_id: photographerId,
    name: (local.name || 'Untitled').trim(),
    event_date: local.event_date || null,
    slug: local.slug || generateSlug(local.name),
    page_count: pageCountOvr ?? local.page_count ?? 21,
    grid_size: local.grid_size ?? 'square',
    grid_layout: local.grid_layout ?? 'two-page',
    status: 'published',
    cover_image_url: local.cover_image_url || null,
    is_starred:
      starredOvr !== undefined ? Boolean(starredOvr) : Boolean(local.is_starred),
    category_tags: Array.isArray(local.category_tags) ? local.category_tags : [],
    expiry_date: local.expiry_date || null,
  };

  if (settingsOvr.comments_enabled !== undefined) {
    row.comments_enabled = settingsOvr.comments_enabled;
  }
  if (settingsOvr.replies_enabled !== undefined) {
    row.replies_enabled = settingsOvr.replies_enabled;
  }
  if (settingsOvr.messages_enabled !== undefined) {
    row.messages_enabled = settingsOvr.messages_enabled;
  }
  if (settingsOvr.share_link_enabled !== undefined) {
    row.share_link_enabled = settingsOvr.share_link_enabled;
  }

  return row;
}

async function insertAlbumRowResilient(row) {
  let payload = { ...row, updated_at: new Date().toISOString() };
  const droppable = OPTIONAL_ALBUM_INSERT_COLUMNS.filter((col) => col in payload);

  while (true) {
    const { data, error } = await supabase
      .from('album_proofer_albums')
      .insert(payload)
      .select('*')
      .single();

    if (!error && data) {
      return { data, error: null };
    }

    const duplicate =
      error?.code === '23505' ||
      String(error?.message || '')
        .toLowerCase()
        .includes('duplicate');
    if (duplicate && payload.id) {
      const { data: existing } = await supabase
        .from('album_proofer_albums')
        .select('*')
        .eq('id', payload.id)
        .maybeSingle();
      return { data: existing, error: existing ? null : error };
    }

    if (!isGenericColumnError(error) || droppable.length === 0) {
      return { data: null, error };
    }

    const col = droppable.shift();
    delete payload[col];
  }
}

async function updateAlbumRowResilient(photographerId, albumId, patch) {
  let payload = { ...patch, updated_at: new Date().toISOString() };

  // Hard gate: never persist a preview_data blob that orphans page placements.
  // This catches publish/settings/background sync paths that bypass syncAlbumPreviewData.
  if (payload.preview_data && typeof payload.preview_data === 'object') {
    let existingPreview = null;
    try {
      const { data: existingRow } = await supabase
        .from('album_proofer_albums')
        .select('preview_data')
        .eq('photographer_id', photographerId)
        .eq('id', albumId)
        .maybeSingle();
      existingPreview =
        existingRow?.preview_data && typeof existingRow.preview_data === 'object'
          ? existingRow.preview_data
          : null;
    } catch {
      existingPreview = null;
    }

    const { previewData, shouldSkipWrite } = protectPreviewSnapshot(
      payload.preview_data,
      existingPreview
    );

    if (shouldSkipWrite || !previewData) {
      console.warn(
        '[album-proofer] blocked unsafe preview_data write (would orphan photos)',
        albumId
      );
      delete payload.preview_data;
      // Keep cover if the patch only wanted status/settings; drop cover derived from bad snapshot.
      if (patch.cover_image_url !== undefined && !existingPreview?.cover_url) {
        delete payload.cover_image_url;
      } else if (existingPreview?.cover_url && patch.cover_image_url != null) {
        // Prefer keeping a previously good cover over a null from an empty snapshot.
        if (!patch.cover_image_url) {
          payload.cover_image_url = existingPreview.cover_url;
        }
      }
    } else {
      payload.preview_data = previewData;
      if (payload.cover_image_url === undefined && previewData.cover_url) {
        payload.cover_image_url = previewData.cover_url;
      }
      if (payload.storage_bytes == null && previewData.storage_bytes != null) {
        payload.storage_bytes = previewData.storage_bytes;
      }
    }

    // Nothing left to write besides updated_at — bail early.
    const keys = Object.keys(payload).filter((k) => k !== 'updated_at');
    if (keys.length === 0) {
      return { data: null, error: null };
    }
  }

  const droppable = OPTIONAL_ALBUM_INSERT_COLUMNS.filter((col) => col in payload);
  let attempts = 0;
  const maxAttempts = droppable.length + 2;

  while (attempts < maxAttempts) {
    attempts += 1;
    const { data, error } = await supabase
      .from('album_proofer_albums')
      .update(payload)
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return { data, error: null };
    }

    if (!isGenericColumnError(error) || droppable.length === 0) {
      return { data: null, error };
    }

    const col = droppable.shift();
    delete payload[col];
  }

  return { data: null, error: new Error('Album update failed after retries') };
}

/** Must persist share_link_enabled — never drop that column on retry. */
async function updateShareLinkEnabledRow(photographerId, albumId, enabled, pausedAt = null) {
  const base = {
    share_link_enabled: enabled,
    updated_at: new Date().toISOString(),
  };
  const withPausedAt = {
    ...base,
    share_link_paused_at: enabled ? null : pausedAt || new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('album_proofer_albums')
    .update(withPausedAt)
    .eq('photographer_id', photographerId)
    .eq('id', albumId)
    .select('*')
    .maybeSingle();

  if (
    error &&
    isGenericColumnError(error) &&
    /share_link_paused_at/i.test(String(error.message || ''))
  ) {
    ({ data, error } = await supabase
      .from('album_proofer_albums')
      .update(base)
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select('*')
      .maybeSingle());
  }

  if (!error && !data) {
    await syncLocalAlbumsToSupabase(photographerId, []);
    ({ data, error } = await supabase
      .from('album_proofer_albums')
      .update(base)
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select('*')
      .maybeSingle());
  }

  return { data, error };
}



function readSettingsOverrides(photographerId) {
  try {
    const raw = localStorage.getItem(SETTINGS_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[photographerId] || {};
  } catch {
    return {};
  }
}

function writeSettingsOverride(photographerId, albumId, patch) {
  try {
    const raw = localStorage.getItem(SETTINGS_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const userMap = { ...(all[photographerId] || {}) };
    userMap[albumId] = {
      ...(userMap[albumId] || {}),
      ...patch,
      saved_at: new Date().toISOString(),
    };
    all[photographerId] = userMap;
    localStorage.setItem(SETTINGS_OVR_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function applySettingsOverrides(row, photographerId) {
  if (!row || !photographerId) return row;
  const ovr = readSettingsOverrides(photographerId)[row.id];
  if (!ovr) return row;
  const merged = { ...row };
  if (ovr.comments_enabled !== undefined) {
    merged.comments_enabled = ovr.comments_enabled;
  }
  if (ovr.replies_enabled !== undefined) {
    merged.replies_enabled = ovr.replies_enabled;
  }
  if (ovr.messages_enabled !== undefined) {
    merged.messages_enabled = ovr.messages_enabled;
  }
  // share_link_enabled is DB-only — never overlay from localStorage (that faked PAUSED while public stayed open).
  if (ovr.status !== undefined) {
    merged.status = ovr.status;
  }
  return merged;
}

function readPageCountOverrides(photographerId) {
  try {
    const raw = localStorage.getItem(PAGECOUNT_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[photographerId] || {};
  } catch {
    return {};
  }
}

function writePageCountOverride(photographerId, albumId, pageCount) {
  try {
    const raw = localStorage.getItem(PAGECOUNT_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const userMap = { ...(all[photographerId] || {}) };
    userMap[albumId] = Number(pageCount);
    all[photographerId] = userMap;
    localStorage.setItem(PAGECOUNT_OVR_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function readGridSettingsOverrides(photographerId) {
  try {
    const raw = localStorage.getItem(GRID_SETTINGS_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[photographerId] || {};
  } catch {
    return {};
  }
}

function writeGridSettingsOverride(photographerId, albumId, patch) {
  try {
    const raw = localStorage.getItem(GRID_SETTINGS_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const userMap = { ...(all[photographerId] || {}) };
    userMap[albumId] = {
      ...(userMap[albumId] || {}),
      ...patch,
    };
    all[photographerId] = userMap;
    localStorage.setItem(GRID_SETTINGS_OVR_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function removeGridSettingsOverride(photographerId, albumId) {
  try {
    const raw = localStorage.getItem(GRID_SETTINGS_OVR_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const userMap = { ...(all[photographerId] || {}) };
    delete userMap[albumId];
    all[photographerId] = userMap;
    localStorage.setItem(GRID_SETTINGS_OVR_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function mapAlbumRow(row, photographerId) {

  const overrides = photographerId ? readStarredOverrides(photographerId) : {};

  const starredFromOverride = overrides[row.id];

  const withSettings = applySettingsOverrides(row, photographerId);
  const pageCountOverrides = photographerId ? readPageCountOverrides(photographerId) : {};
  const pageCountFromOverride = pageCountOverrides[row.id];
  const gridOverrides = photographerId ? readGridSettingsOverrides(photographerId)[row.id] : null;

  return {

    ...withSettings,

    page_count: pageCountFromOverride ?? withSettings.page_count ?? 21,

    grid_size: gridOverrides?.grid_size ?? withSettings.grid_size ?? 'square',

    grid_layout: gridOverrides?.grid_layout ?? withSettings.grid_layout ?? 'two-page',

    spread_grid_size: gridOverrides?.spread_grid_size ?? withSettings.spread_grid_size ?? null,

    has_covers: (() => {
        if (
            gridOverrides != null &&
            Object.prototype.hasOwnProperty.call(gridOverrides, 'has_covers')
        ) {
            return gridOverrides.has_covers === true;
        }
        if (withSettings.has_covers === false) return false;
        if (withSettings.has_covers === true) return true;
        return true;
    })(),

    blank_covers: (() => {
        if (
            gridOverrides != null &&
            Object.prototype.hasOwnProperty.call(gridOverrides, 'blank_covers')
        ) {
            return gridOverrides.blank_covers === true;
        }
        return withSettings.blank_covers === true;
    })(),

    comments_enabled: withSettings.comments_enabled !== false,

    replies_enabled: withSettings.replies_enabled !== false,

    messages_enabled: withSettings.messages_enabled !== false,

    share_link_enabled: withSettings.share_link_enabled !== false,

    photo_count: withSettings.photo_count ?? 0,

    category_tags: withSettings.category_tags ?? [],

    is_starred:

      starredFromOverride !== undefined ? starredFromOverride : (withSettings.is_starred ?? false),

    storage_bytes: Number(withSettings.storage_bytes) || 0,

  };

}



function updateLocalAlbum(photographerId, albumId, patch) {

  const albums = readLocalAlbums(photographerId);

  const idx = albums.findIndex((a) => a.id === albumId);

  if (idx === -1) return null;

  const updated = {

    ...albums[idx],

    ...patch,

    updated_at: new Date().toISOString(),

  };

  albums[idx] = updated;

  writeLocalAlbums(photographerId, albums);

  return mapAlbumRow(updated, photographerId);

}



function removeLocalAlbum(photographerId, albumId) {

  const albums = readLocalAlbums(photographerId).filter((a) => a.id !== albumId);

  writeLocalAlbums(photographerId, albums);

}



/** Push albums that exist only in localStorage up to Supabase so prod/dev stay in sync. */
async function syncLocalAlbumsToSupabase(photographerId, remoteRows) {
  const remote = [...(remoteRows || [])];
  const remoteIds = new Set(remote.map((r) => r.id));
  const localOnly = readLocalAlbums(photographerId).filter((a) => !remoteIds.has(a.id));

  for (const local of localOnly) {
    const row = buildAlbumRowFromLocal(local, photographerId);
    const { data, error } = await insertAlbumRowResilient(row);

    if (data) {
      remote.push(data);
      remoteIds.add(data.id);
      removeLocalAlbum(photographerId, local.id);
      continue;
    }

    console.warn('Could not sync local album to Supabase:', local.name, error?.message);
  }

  return remote.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

async function syncLocalAlbumAssetsToSupabase(photographerId) {
  const albumIds = getAlbumIdsWithLocalAssets();
  if (!albumIds.length) return;

  for (const albumId of albumIds) {
    const gridOvr = readGridSettingsOverrides(photographerId)[albumId];
    const localSnapshot = buildAlbumPreviewSnapshot(albumId, {
      album: gridOvr
        ? {
            has_covers: gridOvr.has_covers !== false,
            blank_covers: gridOvr.blank_covers === true,
            spread_grid_size: gridOvr.spread_grid_size ?? null,
          }
        : null,
      coverColorPreset: getAlbumCoverColor(albumId),
      spineBounds: getAlbumSpineBoundsOverride(albumId),
    });
    if (!localSnapshot) continue;

    let existingPreview = null;
    try {
      const { data } = await supabase
        .from('album_proofer_albums')
        .select('preview_data')
        .eq('id', albumId)
        .eq('photographer_id', photographerId)
        .maybeSingle();
      existingPreview =
        data?.preview_data && typeof data.preview_data === 'object' ? data.preview_data : null;
    } catch {
      existingPreview = null;
    }

    if (previewNeedsAssetRepair(existingPreview) || previewNeedsAssetRepair(localSnapshot)) {
      try {
        const repair = await repairAlbumPreviewFromServer(albumId);
        if (repair?.preview_data && repair.repaired) {
          existingPreview = repair.preview_data;
          hydrateAlbumPreviewData(albumId, repair.preview_data);
        }
      } catch (err) {
        console.warn('Background album repair failed:', albumId, err?.message || err);
      }
    }

    const { previewData, shouldSkipWrite } = protectPreviewSnapshot(localSnapshot, existingPreview);
    if (!previewData || shouldSkipWrite) continue;

    const hasAssets =
      previewData.cover_url ||
      (previewData.collection?.length ?? 0) > 0 ||
      Object.keys(previewData.pages || {}).length > 0;
    if (!hasAssets) continue;

    const { error } = await updateAlbumRowResilient(photographerId, albumId, {
      preview_data: previewData,
      cover_image_url: previewData.cover_url || null,
      storage_bytes: getAlbumCollectionStorageBytes(albumId),
    });

    if (error) {
      console.warn('Could not sync album assets to Supabase:', albumId, error.message);
    }
  }
}

async function syncLocalAlbumSettingsToSupabase(photographerId, remoteRows) {
  const settingsOvr = readSettingsOverrides(photographerId);
  if (!Object.keys(settingsOvr).length) return;

  for (const row of remoteRows || []) {
    const ovr = settingsOvr[row.id];
    if (!ovr) continue;

    const payload = { updated_at: new Date().toISOString() };
    if (ovr.status !== undefined && ovr.status !== row.status) {
      payload.status = ovr.status === 'published' ? 'published' : 'draft';
    }
    if (
      ovr.comments_enabled !== undefined &&
      ovr.comments_enabled !== row.comments_enabled
    ) {
      payload.comments_enabled = ovr.comments_enabled;
    }
    if (ovr.replies_enabled !== undefined && ovr.replies_enabled !== row.replies_enabled) {
      payload.replies_enabled = ovr.replies_enabled;
    }
    if (ovr.messages_enabled !== undefined && ovr.messages_enabled !== row.messages_enabled) {
      payload.messages_enabled = ovr.messages_enabled;
    }
    if (
      ovr.share_link_enabled !== undefined &&
      ovr.share_link_enabled !== row.share_link_enabled
    ) {
      payload.share_link_enabled = ovr.share_link_enabled;
    }
    if (Object.keys(payload).length <= 1) continue;

    const { error } = await updateAlbumRowResilient(photographerId, row.id, payload);

    if (error) {
      console.warn('Could not sync album settings to Supabase:', row.id, error.message);
    }
  }
}



async function deleteAlbumAssets(albumId) {

  try {
    await deleteAlbumCollectionAssets(albumId);
  } catch (err) {
    // Storage deletion (R2) may fail due to CORS in dev or missing credentials.
    // Log but don't block the DB record deletion.
    console.warn('[deleteAlbum] Could not delete storage assets, continuing:', err?.message);
  }

  clearAllAlbumPagePhotos(albumId);

  clearAlbumTransforms(albumId);

}



function findLocalAlbum(photographerId, albumId) {

  const found = readLocalAlbums(photographerId).find((a) => a.id === albumId);

  return found ? mapAlbumRow(found, photographerId) : null;

}



function enrichAlbumStorageBytes(album) {
  if (!album?.id) return album;
  const localBytes = getAlbumCollectionStorageBytes(album.id);
  const remoteBytes = Number(album.storage_bytes) || 0;
  return {
    ...album,
    storage_bytes: Math.max(localBytes, remoteBytes),
  };
}

function mergeAlbumRows(remoteRows, photographerId) {

  const remote = (remoteRows || []).map((r) => enrichAlbumStorageBytes(mapAlbumRow(r, photographerId)));

  const remoteIds = new Set(remote.map((a) => a.id));

  const localOnly = readLocalAlbums(photographerId)

    .filter((a) => !remoteIds.has(a.id))

    .map((r) => enrichAlbumStorageBytes(mapAlbumRow(r, photographerId)));

  return [...localOnly, ...remote];

}



export const smartAlbumsService = {

  async albumNameExists(photographerId, name, excludeAlbumId = null) {
    const key = albumNameKey(name);
    if (!key) return false;
    const albums = await this.getAlbums(photographerId);
    return albums.some(
      (album) => album.id !== excludeAlbumId && albumNameKey(album.name) === key
    );
  },

  async buildUniqueCopyName(photographerId, baseName) {
    const normalized = normalizeAlbumName(baseName) || 'Untitled';
    const albums = await this.getAlbums(photographerId);
    const taken = new Set(albums.map((album) => albumNameKey(album.name)));

    const first = `${normalized} (Copy)`;
    if (!taken.has(albumNameKey(first))) return first;

    let copyIndex = 2;
    while (taken.has(albumNameKey(`${normalized} (Copy ${copyIndex})`))) {
      copyIndex += 1;
    }
    return `${normalized} (Copy ${copyIndex})`;
  },

  async getAlbums(photographerId) {

    const { data, error } = await supabase

      .from('album_proofer_albums')

      .select(ALBUM_LIST_FIELDS)

      .eq('photographer_id', photographerId)

      .order('created_at', { ascending: false });



    if (error) {

      if (shouldUseLocalStore(error) || isGenericColumnError(error)) {
        const fallback = await supabase
          .from('album_proofer_albums')
          .select('id, photographer_id, name, event_date, slug, page_count, cover_image_url, status, created_at, updated_at')
          .eq('photographer_id', photographerId)
          .order('created_at', { ascending: false });

        if (!fallback.error && fallback.data) {
          const synced = await syncLocalAlbumsToSupabase(photographerId, fallback.data);
          void syncLocalAlbumAssetsToSupabase(photographerId).catch((e) => {
            console.warn('Background album asset sync failed:', e?.message || e);
          });
          void repairBrokenAlbumsForPhotographerInBackground(photographerId).catch((e) => {
            console.warn('Background album catalog repair failed:', e?.message || e);
          });
          return mergeAlbumRows(synced, photographerId);
        }
      }

      if (shouldUseLocalStore(error)) {

        return readLocalAlbums(photographerId).map((r) => mapAlbumRow(r, photographerId));

      }

      throw error;

    }

    let synced = data || [];
    try {
      synced = await syncLocalAlbumsToSupabase(photographerId, synced);
    } catch (e) {
      console.warn('Local album metadata sync failed:', e?.message || e);
    }

    try {
      await syncLocalAlbumSettingsToSupabase(photographerId, synced);
    } catch (e) {
      console.warn('Local album settings sync failed:', e?.message || e);
    }

    void syncLocalAlbumAssetsToSupabase(photographerId).catch((e) => {
      console.warn('Background album asset sync failed:', e?.message || e);
    });

    // One-shot per session: rebuild any wiped collections for this photographer from R2.
    void repairBrokenAlbumsForPhotographerInBackground(photographerId).catch((e) => {
      console.warn('Background album catalog repair failed:', e?.message || e);
    });

    return mergeAlbumRows(synced, photographerId);

  },



  async getAlbum(photographerId, albumId) {
    const fieldSets = [
      `${ALBUM_LIST_FIELDS},preview_data`,
      ALBUM_LIST_FIELDS,
      ALBUM_DETAIL_GRID_FIELDS,
      ALBUM_DETAIL_FIELDS_MINIMAL,
    ];

    let data = null;
    let lastError = null;

    for (const fields of fieldSets) {
      const result = await selectAlbumRow(photographerId, albumId, fields);
      data = result.data;
      lastError = result.error;
      if (!lastError && data) break;
      if (lastError && !isGenericColumnError(lastError)) break;
    }

    if (!data && !lastError) {
      return findLocalAlbum(photographerId, albumId);
    }

    if (!data) {
      const local = findLocalAlbum(photographerId, albumId);
      if (local) return local;
      if (lastError) {
        if (shouldUseLocalStore(lastError) || isGenericColumnError(lastError)) {
          return null;
        }
        throw lastError;
      }
      return null;
    }

    if (data.grid_size == null && data.grid_layout == null) {
      const gridResult = await selectAlbumRow(photographerId, albumId, ALBUM_DETAIL_GRID_FIELDS);
      if (!gridResult.error && gridResult.data) {
        data = {
          ...data,
          grid_size: gridResult.data.grid_size,
          grid_layout: gridResult.data.grid_layout,
        };
      }
    }

    return mapAlbumRow(data, photographerId);
  },



  async createAlbum({
    photographer_id,
    name,
    event_date,
    page_count = 21,
    grid_size = 'square',
    spread_grid_size = null,
    grid_layout = 'two-page',
    has_covers = true,
    blank_covers = false,
  }) {

    const trimmedName = normalizeAlbumName(name);
    if (!trimmedName) {
      throw new Error('Album name is required.');
    }
    if (await this.albumNameExists(photographer_id, trimmedName)) {
      throw new Error(`An album named "${trimmedName}" already exists. Choose a different name.`);
    }

    const payload = {

      photographer_id,

      name: trimmedName,

      event_date: event_date || null,

      slug: generateSlug(trimmedName),

      page_count: Math.max(1, Math.min(99, Math.floor(Number(page_count) || 21))),

      grid_size,

      grid_layout,

      status: 'draft',

    };



    const { data, error } = await insertAlbumRowResilient(payload);



    if (data) {
      writeGridSettingsOverride(photographer_id, data.id, {
        grid_size: payload.grid_size,
        grid_layout: payload.grid_layout,
        has_covers: has_covers === true,
        blank_covers: blank_covers === true,
        spread_grid_size: spread_grid_size || null,
      });
      smartAlbumProoferSettingsService.applyDefaultsToNewAlbum(photographer_id, data.id);
      const defaults = smartAlbumProoferSettingsService.getPhotographerDefaults(photographer_id);
      writeSettingsOverride(photographer_id, data.id, {
        comments_enabled: true,
        messages_enabled: true,
        share_link_enabled: true,
        replies_enabled: defaults.multiUserCollaboration,
      });
      removeLocalAlbum(photographer_id, data.id);
      return mapAlbumRow(data, photographer_id);
    }

    if (error && shouldUseLocalStore(error)) {

        const album = {

          ...payload,

          id: crypto.randomUUID(),

          photo_count: 0,

          cover_image_url: null,

          is_starred: false,

          category_tags: [],

          expiry_date: null,

          created_at: new Date().toISOString(),

          updated_at: new Date().toISOString(),

        };

        const existing = readLocalAlbums(photographer_id);

        writeLocalAlbums(photographer_id, [album, ...existing]);
        writeGridSettingsOverride(photographer_id, album.id, {
          grid_size: payload.grid_size,
          grid_layout: payload.grid_layout,
          has_covers: has_covers === true,
          blank_covers: blank_covers === true,
          spread_grid_size: spread_grid_size || null,
        });
        smartAlbumProoferSettingsService.applyDefaultsToNewAlbum(photographer_id, album.id);
        const defaults = smartAlbumProoferSettingsService.getPhotographerDefaults(photographer_id);
        writeSettingsOverride(photographer_id, album.id, {
          comments_enabled: true,
          messages_enabled: true,
          share_link_enabled: true,
          replies_enabled: defaults.multiUserCollaboration,
        });

        return mapAlbumRow(
            {
                ...album,
                has_covers: has_covers === true,
                blank_covers: blank_covers === true,
                spread_grid_size: spread_grid_size || null,
            },
            photographer_id
        );

    }

    throw error || new Error('Could not create album');
  },



  async getStarredAlbums(photographerId) {

    const all = await this.getAlbums(photographerId);

    return all.filter((a) => a.is_starred);

  },



  async updateAlbumPageCount(photographerId, albumId, pageCount) {
    const count = Math.max(1, Math.min(99, Math.floor(Number(pageCount) || 21)));
    writePageCountOverride(photographerId, albumId, count);

    const { data, error } = await supabase
      .from('album_proofer_albums')
      .update({ page_count: count, updated_at: new Date().toISOString() })
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select()
      .single();

    if (!error && data) {
      return mapAlbumRow(data, photographerId);
    }

    if (error && shouldUseLocalStore(error)) {
      const updated = updateLocalAlbum(photographerId, albumId, { page_count: count });
      if (updated) return updated;
    }

    const localUpdated = updateLocalAlbum(photographerId, albumId, { page_count: count });
    if (localUpdated) return localUpdated;

    const album = await this.getAlbum(photographerId, albumId);
    if (!album) throw new Error('Album not found');
    return { ...album, page_count: count };
  },

  /**
   * Persist client preview settings (publish + comments) to Supabase and local cache.
   * share_link_enabled must land in the DB — local-only pause would leave public links open.
   */
  async updateAlbumClientSettings(photographerId, albumId, patch) {
    const payload = { ...patch, updated_at: new Date().toISOString() };
    if (patch.share_link_enabled === false) {
      if (!patch.share_link_paused_at) {
        payload.share_link_paused_at = new Date().toISOString();
      }
    } else if (patch.share_link_enabled === true) {
      payload.share_link_paused_at = null;
    }

    // Non-share flags may cache locally first; share_link_enabled only after DB confirms.
    const settingsPatch = {};
    if (patch.comments_enabled !== undefined) {
      settingsPatch.comments_enabled = patch.comments_enabled;
    }
    if (patch.replies_enabled !== undefined) {
      settingsPatch.replies_enabled = patch.replies_enabled;
    }
    if (patch.messages_enabled !== undefined) {
      settingsPatch.messages_enabled = patch.messages_enabled;
    }
    if (patch.status !== undefined) {
      settingsPatch.status = patch.status;
    }
    if (Object.keys(settingsPatch).length) {
      writeSettingsOverride(photographerId, albumId, settingsPatch);
    }

    if (patch.status === 'published') {
      const album = await this.getAlbum(photographerId, albumId);
      // Always go through protected sync — never write a raw local snapshot on publish
      // (that previously wiped collection while keeping orphan collectionItemId pages).
      if (previewNeedsAssetRepair(album?.preview_data)) {
        try {
          await repairAlbumPreviewFromServer(albumId);
        } catch (err) {
          console.warn('Repair before publish failed:', err?.message || err);
        }
      }
      const syncedPreview = await this.syncAlbumPreviewData(photographerId, albumId);
      if (syncedPreview) {
        payload.cover_image_url = syncedPreview.cover_url || null;
      }
      if (!album?.published_at) {
        payload.published_at = new Date().toISOString();
      }
    }

    let { data, error } = await updateAlbumRowResilient(photographerId, albumId, payload);

    if (!error && !data) {
      await syncLocalAlbumsToSupabase(photographerId, []);
      ({ data, error } = await updateAlbumRowResilient(photographerId, albumId, payload));
    }

    // Critical: pause/resume must update the remote column the public link reads.
    // Never rely on localStorage-only — that leaves pixnxt.in /album-preview open.
    if (patch.share_link_enabled !== undefined) {
      const remoteEnabled = data?.share_link_enabled;
      if (!data || remoteEnabled !== patch.share_link_enabled) {
        const shareResult = await updateShareLinkEnabledRow(
          photographerId,
          albumId,
          patch.share_link_enabled,
          payload.share_link_paused_at
        );
        if (shareResult.error || !shareResult.data) {
          console.error(
            'smart_albums share_link_enabled update failed:',
            shareResult.error?.message || shareResult.error || error?.message
          );
          throw new Error(
            shareResult.error?.message ||
              error?.message ||
              'Could not update client access on the server. The public link was not paused.'
          );
        }
        data = shareResult.data;
        error = null;
      }

      if (!data || data.share_link_enabled !== patch.share_link_enabled) {
        throw new Error(
          'Could not update client access on the server. The public link was not paused.'
        );
      }
    }

    if (!error && data) {
      let mapped = mapAlbumRow(data, photographerId);
      if (patch.share_link_enabled !== undefined) {
        mapped = { ...mapped, share_link_enabled: patch.share_link_enabled };
        try {
          const syncedPreview = await this.syncAlbumPreviewProoferSettings(
            photographerId,
            albumId,
            mapped
          );
          if (syncedPreview) {
            mapped = { ...mapped, preview_data: syncedPreview };
          }
        } catch (syncErr) {
          console.warn('syncAlbumPreviewProoferSettings after share toggle:', syncErr);
        }
      }
      if (
        patch.status === 'published' &&
        mapped.client_changes_submitted_at &&
        !mapped.revision_ready_notified_at &&
        !mapped.client_approved_at
      ) {
        void albumProofService
          .notifyClientRevisionReady({
            albumId,
            siteOrigin: typeof window !== 'undefined' ? window.location.origin : '',
          })
          .catch((err) => {
            console.warn('Revision-ready client email:', err?.message || err);
          });
      }
      return mapped;
    }

    // Never fake a successful pause/resume from local-only state.
    if (patch.share_link_enabled !== undefined) {
      throw new Error(
        error?.message ||
          'Could not update client access on the server. The public link was not paused.'
      );
    }

    if (error && shouldUseLocalStore(error)) {
      const updated = updateLocalAlbum(photographerId, albumId, patch);
      if (updated) return updated;
    }

    const localUpdated = updateLocalAlbum(photographerId, albumId, patch);
    if (localUpdated) return localUpdated;

    const album = await this.getAlbum(photographerId, albumId);
    if (!album) throw new Error('Album not found');

    if (error) {
      console.warn('smart_albums settings update:', error.message);
    }

    return { ...album, ...patch };
  },

  async syncAlbumPreviewProoferSettings(photographerId, albumId, album = null) {
    const freshAlbum = album || (await this.getAlbum(photographerId, albumId));
    if (!freshAlbum) return null;

    const existingPreview =
      freshAlbum?.preview_data && typeof freshAlbum.preview_data === 'object'
        ? freshAlbum.preview_data
        : null;
    const patched = patchAlbumPreviewProoferAccess(albumId, freshAlbum);
    if (!patched) return null;

    const { previewData, shouldSkipWrite } = protectPreviewSnapshot(patched, existingPreview);
    if (shouldSkipWrite || !previewData) {
      // Still keep in-memory access flags, but never wipe the photo catalog on disk.
      hydrateAlbumPreviewData(albumId, existingPreview || patched);
      return existingPreview || patched;
    }

    const { data, error } = await updateAlbumRowResilient(photographerId, albumId, {
      preview_data: previewData,
    });

    if (error && shouldUseLocalStore(error)) {
      return previewData;
    }

    if (error) {
      console.warn('syncAlbumPreviewProoferSettings:', error.message);
      hydrateAlbumPreviewData(albumId, previewData);
      return previewData;
    }

    const synced = data?.preview_data ?? previewData;
    hydrateAlbumPreviewData(albumId, synced);
    return synced;
  },

  async syncAlbumPreviewData(photographerId, albumId) {
    const album = await this.getAlbum(photographerId, albumId);
    const existingPreview =
      album?.preview_data && typeof album.preview_data === 'object'
        ? album.preview_data
        : null;

    if (previewNeedsAssetRepair(existingPreview)) {
      try {
        const repair = await repairAlbumPreviewFromServer(albumId);
        if (repair?.preview_data && repair.repaired) {
          hydrateAlbumPreviewData(albumId, repair.preview_data);
        }
      } catch (err) {
        console.warn('Repair during syncAlbumPreviewData failed:', err?.message || err);
      }
    }

    const freshAlbum = await this.getAlbum(photographerId, albumId);
    const cloudPreview =
      freshAlbum?.preview_data && typeof freshAlbum.preview_data === 'object'
        ? freshAlbum.preview_data
        : existingPreview;

    const localSnapshot = buildAlbumPreviewSnapshot(albumId, {
      album: freshAlbum || album,
      coverColorPreset: getAlbumCoverColor(albumId),
      spineBounds: getAlbumSpineBoundsOverride(albumId),
    });
    if (!localSnapshot) return null;

    const { previewData, shouldSkipWrite } = protectPreviewSnapshot(localSnapshot, cloudPreview);
    if (!previewData) return null;

    if (shouldSkipWrite) {
      console.warn(
        'syncAlbumPreviewData: refusing empty collection while pages reference collectionItemIds',
        albumId
      );
      hydrateAlbumPreviewData(albumId, cloudPreview || previewData);
      return cloudPreview || previewData;
    }

    const { data, error } = await updateAlbumRowResilient(photographerId, albumId, {
      preview_data: previewData,
      cover_image_url: previewData.cover_url || null,
      storage_bytes:
        Number(previewData.storage_bytes) ||
        getAlbumCollectionStorageBytes(albumId) ||
        null,
    });

    if (error && shouldUseLocalStore(error)) {
      console.warn('preview_data column missing; apply latest migration.');
      return previewData;
    }

    if (error) {
      console.warn('syncAlbumPreviewData:', error.message);
      hydrateAlbumPreviewData(albumId, previewData);
      return previewData;
    }

    const synced = data?.preview_data ?? previewData;
    hydrateAlbumPreviewData(albumId, synced);
    return synced;
  },

  async updateAlbumDetails(photographerId, albumId, patch) {
    const payload = { updated_at: new Date().toISOString() };

    if (patch.name !== undefined) {
      const trimmedName = normalizeAlbumName(patch.name) || 'Untitled';
      if (await this.albumNameExists(photographerId, trimmedName, albumId)) {
        throw new Error(`An album named "${trimmedName}" already exists. Choose a different name.`);
      }
      payload.name = trimmedName;
    }
    if (patch.event_date !== undefined) {
      payload.event_date = patch.event_date || null;
    }
    if (patch.status !== undefined) {
      payload.status = patch.status === 'published' ? 'published' : 'draft';
      writeSettingsOverride(photographerId, albumId, { status: payload.status });
    }
    if (patch.category_tags !== undefined) {
      payload.category_tags = categoryTagsToDb(patch.category_tags);
    }

    const { data, error } = await supabase
      .from('album_proofer_albums')
      .update(payload)
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return mapAlbumRow(data, photographerId);
    }

    if (error && shouldUseLocalStore(error)) {
      const updated = updateLocalAlbum(photographerId, albumId, payload);
      if (updated) return updated;
    }

    const localUpdated = updateLocalAlbum(photographerId, albumId, payload);
    if (localUpdated) return localUpdated;

    const album = await this.getAlbum(photographerId, albumId);
    if (!album) throw new Error('Album not found');

    if (error) {
      console.warn('smart_albums update:', error.message);
    }

    return { ...album, ...payload };
  },

  async updateAlbumStar(photographerId, albumId, isStarred) {

    writeStarredOverride(photographerId, albumId, isStarred);



    const { data, error } = await supabase

      .from('album_proofer_albums')

      .update({ is_starred: isStarred, updated_at: new Date().toISOString() })

      .eq('photographer_id', photographerId)

      .eq('id', albumId)

      .select()

      .single();



    if (!error && data) {

      return mapAlbumRow(data, photographerId);

    }



    if (error && shouldUseLocalStore(error)) {

      const updated = updateLocalAlbum(photographerId, albumId, { is_starred: isStarred });

      if (updated) return updated;

    }



    const album = await this.getAlbum(photographerId, albumId);

    if (!album) throw new Error('Album not found');

    return { ...album, is_starred: isStarred };

  },



  async deleteAlbum(photographerId, albumId) {

    removeStarredOverride(photographerId, albumId);
    removeGridSettingsOverride(photographerId, albumId);

    await deleteAlbumAssets(albumId);



    const { error } = await supabase

      .from('album_proofer_albums')

      .delete()

      .eq('photographer_id', photographerId)

      .eq('id', albumId);



    if (error) {

      if (shouldUseLocalStore(error)) {

        removeLocalAlbum(photographerId, albumId);

        return;

      }

      throw error;

    }

    removeLocalAlbum(photographerId, albumId);

  },



  async duplicateAlbum(photographerId, albumId) {

    const source = await this.getAlbum(photographerId, albumId);

    if (!source) throw new Error('Album not found');

    if (source.preview_data) {
      hydrateAlbumPreviewData(albumId, source.preview_data);
    }

    const copyName = await this.buildUniqueCopyName(photographerId, source.name);

    const copy = await this.createAlbum({

      photographer_id: photographerId,

      name: copyName,

      event_date: source.event_date,

      page_count: source.page_count,

      grid_size: source.grid_size,

      grid_layout: source.grid_layout,

      has_covers: source.has_covers === true,

    });

    writePageCountOverride(photographerId, copy.id, source.page_count);

    writeGridSettingsOverride(photographerId, copy.id, {
      grid_size: source.grid_size,
      grid_layout: source.grid_layout,
      has_covers: source.has_covers === true,
      blank_covers: source.blank_covers === true,
    });

    await duplicateAlbumAssets(albumId, copy.id, photographerId);

    await this.updateAlbumClientSettings(photographerId, copy.id, {
      category_tags: source.category_tags,
      expiry_date: source.expiry_date ?? null,
      comments_enabled: source.comments_enabled,
      replies_enabled: source.replies_enabled,
      messages_enabled: source.messages_enabled,
      share_link_enabled: source.share_link_enabled,
      // Duplicates always start as drafts so the photographer can review before sharing.
      status: 'draft',
    });

    await this.syncAlbumPreviewData(photographerId, copy.id);

    if (source.is_starred) {
      await this.updateAlbumStar(photographerId, copy.id, true);
    }

    const result = await this.getAlbum(photographerId, copy.id);
    if (result?.preview_data) {
      hydrateAlbumPreviewData(copy.id, result.preview_data);
    }
    return result || copy;

  },

};

