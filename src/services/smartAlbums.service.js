import { supabase } from '../lib/supabase/client';
import { deleteAlbumCollectionAssets } from '../components/smart-albums/albumCollection';
import { clearAllAlbumPagePhotos } from '../components/smart-albums/albumPagePhotos';
import { clearAlbumTransforms } from '../components/smart-albums/albumPageTransforms';



const STORAGE_KEY = 'pixnxt_smart_albums_local';

const STARRED_OVR_KEY = 'pixnxt_smart_albums_starred';

const SETTINGS_OVR_KEY = 'pixnxt_smart_album_settings_ovr';

const PAGECOUNT_OVR_KEY = 'pixnxt_smart_album_pagecount_ovr';



function generateSlug(name) {

  const base = String(name || 'album')

    .toLowerCase()

    .trim()

    .replace(/[^\w ]+/g, '')

    .replace(/ +/g, '-');

  return `${base || 'album'}-${Date.now().toString(36)}`;

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

    (msg.includes('column') && msg.includes('does not exist'))

  );

}



function shouldUseLocalStore(error) {

  return isMissingTableError(error) || isMissingColumnError(error);

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

function mapAlbumRow(row, photographerId) {

  const overrides = photographerId ? readStarredOverrides(photographerId) : {};

  const starredFromOverride = overrides[row.id];

  const withSettings = applySettingsOverrides(row, photographerId);
  const pageCountOverrides = photographerId ? readPageCountOverrides(photographerId) : {};
  const pageCountFromOverride = pageCountOverrides[row.id];

  return {

    ...withSettings,

    page_count: pageCountFromOverride ?? withSettings.page_count ?? 21,

    grid_size: withSettings.grid_size ?? 'square',

    grid_layout: withSettings.grid_layout ?? 'two-page',

    comments_enabled: withSettings.comments_enabled !== false,

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
    const row = {
      id: local.id,
      photographer_id: photographerId,
      name: (local.name || 'Untitled').trim(),
      event_date: local.event_date || null,
      slug: local.slug || generateSlug(local.name),
      page_count: local.page_count ?? 21,
      grid_size: local.grid_size ?? 'square',
      grid_layout: local.grid_layout ?? 'two-page',
      status: local.status === 'published' ? 'published' : 'draft',
      cover_image_url: local.cover_image_url || null,
      is_starred: Boolean(local.is_starred),
      category_tags: Array.isArray(local.category_tags) ? local.category_tags : [],
      expiry_date: local.expiry_date || null,
    };

    const { data, error } = await supabase.from('smart_albums').insert(row).select().single();

    if (!error && data) {
      remote.push(data);
      remoteIds.add(data.id);
      removeLocalAlbum(photographerId, local.id);
      continue;
    }

    const dup =
      error?.code === '23505' ||
      String(error?.message || '')
        .toLowerCase()
        .includes('duplicate');
    if (dup) {
      const { data: existing } = await supabase
        .from('smart_albums')
        .select('*')
        .eq('id', local.id)
        .maybeSingle();
      if (existing) {
        remote.push(existing);
        remoteIds.add(existing.id);
      }
      removeLocalAlbum(photographerId, local.id);
      continue;
    }

    console.warn('Could not sync local album to Supabase:', local.name, error?.message);
  }

  return remote.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
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

  async getAlbums(photographerId) {

    const { data, error } = await supabase

      .from('smart_albums')

      .select('*')

      .eq('photographer_id', photographerId)

      .order('created_at', { ascending: false });



    if (error) {

      if (shouldUseLocalStore(error)) {

        return readLocalAlbums(photographerId).map((r) => mapAlbumRow(r, photographerId));

      }

      throw error;

    }

    const synced = await syncLocalAlbumsToSupabase(photographerId, data || []);

    return mergeAlbumRows(synced, photographerId);

  },



  async getAlbum(photographerId, albumId) {

    const { data, error } = await supabase

      .from('smart_albums')

      .select('*')

      .eq('photographer_id', photographerId)

      .eq('id', albumId)

      .maybeSingle();



    if (error) {

      if (shouldUseLocalStore(error)) {

        return findLocalAlbum(photographerId, albumId);

      }

      throw error;

    }

    return data ? mapAlbumRow(data, photographerId) : findLocalAlbum(photographerId, albumId);

  },



  async createAlbum({
    photographer_id,
    name,
    event_date,
    page_count = 21,
    grid_size = 'square',
    grid_layout = 'two-page',
  }) {

    const payload = {

      photographer_id,

      name: name.trim(),

      event_date: event_date || null,

      slug: generateSlug(name),

      page_count: Math.max(1, Math.min(99, Math.floor(Number(page_count) || 21))),

      grid_size,

      grid_layout,

      status: 'draft',

    };



    const { data, error } = await supabase

      .from('smart_albums')

      .insert(payload)

      .select()

      .single();



    if (error) {

      if (shouldUseLocalStore(error)) {

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

        return mapAlbumRow(album, photographer_id);

      }

      throw error;

    }

    removeLocalAlbum(photographer_id, data.id);

    return mapAlbumRow(data, photographer_id);

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
    if (patch.status !== undefined) {
      settingsPatch.status = patch.status;
    }
    if (Object.keys(settingsPatch).length) {
      writeSettingsOverride(photographerId, albumId, settingsPatch);
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



    const copy = await this.createAlbum({

      photographer_id: photographerId,

      name: `${source.name} (Copy)`,

      event_date: source.event_date,

      page_count: source.page_count,

      grid_size: source.grid_size,

      grid_layout: source.grid_layout,

    });



    if (source.is_starred) {

      return this.updateAlbumStar(photographerId, copy.id, true);

    }

    return copy;

  },

};

