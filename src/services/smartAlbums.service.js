import { supabase } from '../lib/supabase/client';

const STORAGE_KEY = 'pixnxt_smart_albums_local';
const STARRED_OVR_KEY = 'pixnxt_smart_albums_starred';

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
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

function shouldUseLocalStore(error) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

function mapAlbumRow(row, photographerId) {
  const overrides = photographerId ? readStarredOverrides(photographerId) : {};
  const starredFromOverride = overrides[row.id];
  return {
    ...row,
    page_count: row.page_count ?? 21,
    photo_count: row.photo_count ?? 0,
    category_tags: row.category_tags ?? [],
    is_starred:
      starredFromOverride !== undefined ? starredFromOverride : (row.is_starred ?? false),
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

export const smartAlbumsService = {
  async getAlbums(photographerId) {
    const { data, error } = await supabase
      .from('smart_albums')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return readLocalAlbums(photographerId).map((r) => mapAlbumRow(r, photographerId));
      }
      throw error;
    }
    return (data || []).map((r) => mapAlbumRow(r, photographerId));
  },

  async getAlbum(photographerId, albumId) {
    const { data, error } = await supabase
      .from('smart_albums')
      .select('*')
      .eq('photographer_id', photographerId)
      .eq('id', albumId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const found = readLocalAlbums(photographerId).find((a) => a.id === albumId);
        return found ? mapAlbumRow(found, photographerId) : null;
      }
      throw error;
    }
    return data ? mapAlbumRow(data, photographerId) : null;
  },

  async createAlbum({ photographer_id, name, event_date }) {
    const payload = {
      photographer_id,
      name: name.trim(),
      event_date: event_date || null,
      slug: generateSlug(name),
      page_count: 21,
      status: 'draft',
    };

    const { data, error } = await supabase
      .from('smart_albums')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
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
    return mapAlbumRow(data, photographer_id);
  },

  async getStarredAlbums(photographerId) {
    const all = await this.getAlbums(photographerId);
    return all.filter((a) => a.is_starred);
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

    const { error } = await supabase
      .from('smart_albums')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('id', albumId);

    if (error) {
      if (isMissingTableError(error)) {
        removeLocalAlbum(photographerId, albumId);
        return;
      }
      throw error;
    }
  },

  async duplicateAlbum(photographerId, albumId) {
    const source = await this.getAlbum(photographerId, albumId);
    if (!source) throw new Error('Album not found');

    const copy = await this.createAlbum({
      photographer_id: photographerId,
      name: `${source.name} (Copy)`,
      event_date: source.event_date,
    });

    if (source.is_starred) {
      return this.updateAlbumStar(photographerId, copy.id, true);
    }
    return copy;
  },
};
