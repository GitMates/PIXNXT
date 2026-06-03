import { supabase } from '../lib/supabase/client';
import { categoryTagsToDb } from '../lib/categoryTags';
import { deleteAlbumCollectionAssets } from '../components/smart-albums/albumCollection';
import { clearAllAlbumPagePhotos } from '../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms } from '../components/smart-albums/albumPageTransforms';
import { buildAlbumPreviewSnapshot, getAlbumIdsWithLocalAssets, hydrateAlbumPreviewData } from '../components/smart-albums/albumPreviewData';
import { duplicateAlbumAssets } from '../components/smart-albums/albumDuplicate';



const STORAGE_KEY = 'pixnxt_smart_albums_local';

const STARRED_OVR_KEY = 'pixnxt_smart_albums_starred';

const SETTINGS_OVR_KEY = 'pixnxt_smart_album_settings_ovr';

const PAGECOUNT_OVR_KEY = 'pixnxt_smart_album_pagecount_ovr';

const GRID_SETTINGS_OVR_KEY = 'pixnxt_smart_album_grid_settings_ovr';



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

  return msg.includes('smart_albums') && (msg.includes('does not exist') || msg.includes('schema cache'));

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
    msg.includes('preview_data') ||
    msg.includes('grid_size') ||
    msg.includes('grid_layout') ||

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
    .from('smart_albums')
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
  'expiry_date',
  'category_tags',
  'is_starred',
  'grid_layout',
  'grid_size',
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
  'is_starred',
  'category_tags',
  'expiry_date',
  'created_at',
  'updated_at',
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
    status:
      settingsOvr.status === 'published' || local.status === 'published'
        ? 'published'
        : 'draft',
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

  return row;
}

async function insertAlbumRowResilient(row) {
  let payload = { ...row, updated_at: new Date().toISOString() };
  const droppable = OPTIONAL_ALBUM_INSERT_COLUMNS.filter((col) => col in payload);

  while (true) {
    const { data, error } = await supabase
      .from('smart_albums')
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
        .from('smart_albums')
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
  const droppable = OPTIONAL_ALBUM_INSERT_COLUMNS.filter((col) => col in payload);
  let attempts = 0;
  const maxAttempts = droppable.length + 2;

  while (attempts < maxAttempts) {
    attempts += 1;
    const { data, error } = await supabase
      .from('smart_albums')
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

    comments_enabled: withSettings.comments_enabled !== false,

    replies_enabled: withSettings.replies_enabled !== false,

    messages_enabled: withSettings.messages_enabled !== false,

    photo_count: withSettings.photo_count ?? 0,

    category_tags: withSettings.category_tags ?? [],

    is_starred:

      starredFromOverride !== undefined ? starredFromOverride : (withSettings.is_starred ?? false),

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
    const previewData = buildAlbumPreviewSnapshot(albumId);
    if (!previewData) continue;
    const hasAssets =
      previewData.cover_url ||
      (previewData.collection?.length ?? 0) > 0 ||
      Object.keys(previewData.pages || {}).length > 0;
    if (!hasAssets) continue;

    const { error } = await updateAlbumRowResilient(photographerId, albumId, {
      preview_data: previewData,
      cover_image_url: previewData.cover_url || null,
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
    if (Object.keys(payload).length <= 1) continue;

    const { error } = await updateAlbumRowResilient(photographerId, row.id, payload);

    if (error) {
      console.warn('Could not sync album settings to Supabase:', row.id, error.message);
    }
  }
}



async function deleteAlbumAssets(albumId) {

  await deleteAlbumCollectionAssets(albumId);

  clearAllAlbumPagePhotos(albumId);

  clearAlbumTransforms(albumId);

}



function findLocalAlbum(photographerId, albumId) {

  const found = readLocalAlbums(photographerId).find((a) => a.id === albumId);

  return found ? mapAlbumRow(found, photographerId) : null;

}



function mergeAlbumRows(remoteRows, photographerId) {

  const remote = (remoteRows || []).map((r) => mapAlbumRow(r, photographerId));

  const remoteIds = new Set(remote.map((a) => a.id));

  const localOnly = readLocalAlbums(photographerId)

    .filter((a) => !remoteIds.has(a.id))

    .map((r) => mapAlbumRow(r, photographerId));

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

      .from('smart_albums')

      .select(ALBUM_LIST_FIELDS)

      .eq('photographer_id', photographerId)

      .order('created_at', { ascending: false });



    if (error) {

      if (shouldUseLocalStore(error) || isGenericColumnError(error)) {
        const fallback = await supabase
          .from('smart_albums')
          .select('id, photographer_id, name, event_date, slug, page_count, cover_image_url, status, created_at, updated_at')
          .eq('photographer_id', photographerId)
          .order('created_at', { ascending: false });

        if (!fallback.error && fallback.data) {
          const synced = await syncLocalAlbumsToSupabase(photographerId, fallback.data);
          void syncLocalAlbumAssetsToSupabase(photographerId).catch((e) => {
            console.warn('Background album asset sync failed:', e?.message || e);
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

    return mergeAlbumRows(synced, photographerId);

  },



  async getAlbum(photographerId, albumId) {
    const fieldSets = [
      ALBUM_DETAIL_GRID_FIELDS,
      ALBUM_DETAIL_FIELDS_MINIMAL,
      ALBUM_LIST_FIELDS,
      `${ALBUM_LIST_FIELDS},preview_data`,
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
    grid_layout = 'two-page',
    has_covers = true,
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
        });

        return mapAlbumRow({ ...album, has_covers: has_covers === true }, photographer_id);

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
      .from('smart_albums')
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
   */
  async updateAlbumClientSettings(photographerId, albumId, patch) {
    const payload = { ...patch, updated_at: new Date().toISOString() };
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
      const previewData = buildAlbumPreviewSnapshot(albumId);
      if (previewData) {
        payload.preview_data = previewData;
        payload.cover_image_url = previewData.cover_url || null;
      }
    }

    let { data, error } = await supabase
      .from('smart_albums')
      .update(payload)
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .select('*')
      .maybeSingle();

    if (!error && !data) {
      await syncLocalAlbumsToSupabase(photographerId, []);
      ({ data, error } = await supabase
        .from('smart_albums')
        .update(payload)
        .eq('photographer_id', photographerId)
        .eq('id', albumId)
        .select('*')
        .maybeSingle());
    }

    if (!error && data) {
      return mapAlbumRow(data, photographerId);
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

  async syncAlbumPreviewData(photographerId, albumId) {
    const previewData = buildAlbumPreviewSnapshot(albumId);
    if (!previewData) return null;

    const { data, error } = await updateAlbumRowResilient(photographerId, albumId, {
      preview_data: previewData,
      cover_image_url: previewData.cover_url || null,
    });

    if (error && shouldUseLocalStore(error)) {
      console.warn('preview_data column missing; apply latest migration.');
      return previewData;
    }

    if (error) {
      console.warn('syncAlbumPreviewData:', error.message);
      return previewData;
    }

    return data?.preview_data ?? previewData;
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
      .from('smart_albums')
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

      .from('smart_albums')

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

      .from('smart_albums')

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
    });

    await duplicateAlbumAssets(albumId, copy.id, photographerId);

    await this.updateAlbumClientSettings(photographerId, copy.id, {
      category_tags: source.category_tags,
      expiry_date: source.expiry_date ?? null,
      comments_enabled: source.comments_enabled,
      replies_enabled: source.replies_enabled,
      messages_enabled: source.messages_enabled,
      status: source.status === 'published' ? 'published' : 'draft',
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

