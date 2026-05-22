import { supabase } from '../lib/supabase/client';

const STORAGE_KEY = 'pixnxt_smart_albums_local';

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

function isMissingTableError(error) {
  const msg = error?.message || '';
  return msg.includes('smart_albums') && (msg.includes('does not exist') || msg.includes('schema cache'));
}

function mapAlbumRow(row) {
  return {
    ...row,
    page_count: row.page_count ?? 21,
    photo_count: row.photo_count ?? 0,
  };
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
        return readLocalAlbums(photographerId).map(mapAlbumRow);
      }
      throw error;
    }
    return (data || []).map(mapAlbumRow);
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
        return found ? mapAlbumRow(found) : null;
      }
      throw error;
    }
    return data ? mapAlbumRow(data) : null;
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const existing = readLocalAlbums(photographer_id);
        writeLocalAlbums(photographer_id, [album, ...existing]);
        return mapAlbumRow(album);
      }
      throw error;
    }
    return mapAlbumRow(data);
  },
};
