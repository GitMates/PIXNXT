import { supabase } from '../lib/supabase/client';
import { isIndexedSnapshotFresh, maxIndexedAtFromRows } from '../lib/photoAiCacheFreshness';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : { 'Content-Type': 'application/json' };
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data.result;
}

function isMissingTableError(error, tableName) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || error.details || error.hint || '').toLowerCase();
  const mentionsMissingTable =
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache') ||
    message.includes('404');
  const mentionsTable = tableName
    ? message.includes(tableName.toLowerCase())
    : message.includes('photo_ai');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (mentionsTable && mentionsMissingTable)
  );
}

function isMissingPhotoAiTableError(error) {
  return isMissingTableError(error, 'photo_ai_metadata');
}

const SUPABASE_PAGE_SIZE = 1000;

async function fetchAllSupabaseRows(runPage) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await runPage(from, to);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

async function attachAvatarUrls(people) {
  const photoIds = [...new Set(people.flatMap((p) => p.photoIds || []))];
  if (!photoIds.length) return people;

  const { data: photos } = await supabase
    .from('photos')
    .select('id, thumbnail_url, web_url, full_url')
    .in('id', photoIds);

  const photoUrlById = new Map(
    (photos || []).map((p) => [p.id, p.thumbnail_url || p.web_url || p.full_url || null])
  );

  return people.map((person) => {
    const avatarPhotoId = person.avatarPhotoId || person.photoIds?.[0] || null;
    return {
      ...person,
      imageUrl: avatarPhotoId ? photoUrlById.get(avatarPhotoId) || person.imageUrl || null : person.imageUrl || null,
    };
  });
}

export const photoAiService = {
  async getAllMetadataForPhotographer(photographerId) {
    if (!photographerId) return { rows: [], tableMissing: false };

    try {
      const rows = await fetchAllSupabaseRows((from, to) =>
        supabase
          .from('photo_ai_metadata')
          .select('photo_id, collection_id, labels, faces, indexed_at')
          .eq('photographer_id', photographerId)
          .range(from, to)
      );
      return { rows, tableMissing: false };
    } catch (error) {
      if (isMissingPhotoAiTableError(error)) {
        return { rows: [], tableMissing: true };
      }
      console.warn('[photoAi] library metadata load failed:', error.message || error);
      return { rows: [], tableMissing: false };
    }
  },

  async getMetadataForCollection(collectionId) {
    if (!collectionId) return { rows: [], tableMissing: false };

    const { data, error } = await supabase
      .from('photo_ai_metadata')
      .select('photo_id, collection_id, labels, faces, indexed_at')
      .eq('collection_id', collectionId);

    if (error) {
      if (isMissingPhotoAiTableError(error)) {
        return { rows: [], tableMissing: true };
      }
      console.warn('[photoAi] metadata load failed:', error.message || error);
      return { rows: [], tableMissing: false, error: error.message };
    }

    return { rows: data || [], tableMissing: false };
  },

  metadataToMap(rows) {
    const map = {};
    for (const row of rows || []) {
      map[row.photo_id] = {
        labels: row.labels || [],
        faces: row.faces || [],
        indexed_at: row.indexed_at,
      };
    }
    return map;
  },

  async isPeopleCacheFresh(collectionId, metadataRows) {
    const { data: state, error } = await supabase
      .from('photo_ai_cluster_state')
      .select('indexed_photo_count, max_indexed_at')
      .eq('collection_id', collectionId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, 'photo_ai_cluster_state')) return false;
      return false;
    }
    if (!state) return false;

    const count = (metadataRows || []).length;
    const maxIndexedAt = maxIndexedAtFromRows(metadataRows);
    return isIndexedSnapshotFresh(state, count, maxIndexedAt);
  },

  async getPeopleFromDb(collectionId, { includeHidden = false } = {}) {
    if (!collectionId) return { people: [], tableMissing: false };

    let query = supabase
      .from('photo_ai_people')
      .select(
        'id, cluster_key, face_ids, photo_ids, label, sort_order, avatar_photo_id, avatar_bounding_box, is_hidden'
      )
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true });

    if (!includeHidden) {
      query = query.eq('is_hidden', false);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error, 'photo_ai_people')) {
        return { people: [], tableMissing: true };
      }
      throw error;
    }

    const people = (data || []).map((row) => ({
      id: row.cluster_key || row.id,
      faceIds: row.face_ids || [],
      photoIds: row.photo_ids || [],
      label: row.label,
      count: (row.photo_ids || []).length,
      imageUrl: null,
      boundingBox: row.avatar_bounding_box || null,
      avatarPhotoId: row.avatar_photo_id || null,
      isHidden: Boolean(row.is_hidden),
    }));

    const withUrls = await attachAvatarUrls(people);
    return { people: withUrls, tableMissing: false };
  },

  async setPersonHidden(collectionId, personId, hidden) {
    if (!collectionId || !personId) {
      throw new Error('Missing delivery or person.');
    }

    const { error } = await supabase
      .from('photo_ai_people')
      .update({
        is_hidden: Boolean(hidden),
        updated_at: new Date().toISOString(),
      })
      .eq('collection_id', collectionId)
      .eq('cluster_key', personId);

    if (error) throw error;
    return { ok: true };
  },

  indexPhoto(photoId) {
    if (!photoId) return Promise.resolve(null);
    return postJson('/api/photo-ai/index', { photoId }).catch((err) => {
      console.warn('[photoAi] indexPhoto failed:', err?.message || err);
      return null;
    });
  },

  indexCollection(collectionId, limit = 500) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/sync-collection', { collectionId, limit });
  },

  syncCollection(collectionId, limit = 500) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/sync-collection', { collectionId, limit });
  },

  reclusterCollection(collectionId) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/recluster', { collectionId });
  },

  async getPeople(
    collectionId,
    { forceRecluster = false, applyGuestLabels = false, metadataRows = null, includeHidden = false } = {}
  ) {
    if (!collectionId) return [];

    let cachedPeople = [];
    if (!forceRecluster && !applyGuestLabels) {
      try {
        const { people, tableMissing } = await this.getPeopleFromDb(collectionId, { includeHidden });
        cachedPeople = people;
        if (!tableMissing && people.length > 0) {
          const rows = metadataRows || (await this.getMetadataForCollection(collectionId)).rows;
          const fresh = await this.isPeopleCacheFresh(collectionId, rows);
          if (fresh) return people;
        }
      } catch (err) {
        console.warn('[photoAi] people cache read failed:', err?.message || err);
      }
    }

    try {
      const result = await postJson('/api/photo-ai/people', {
        collectionId,
        forceRecluster,
        includeHidden,
        applyGuestLabels,
      });
      return result?.people || cachedPeople;
    } catch (err) {
      if (cachedPeople.length > 0) {
        console.warn('[photoAi] people recluster failed; using cache:', err?.message || err);
        return cachedPeople;
      }
      throw err;
    }
  },

  searchBySelfie(collectionId, imageBase64, threshold = 85) {
    if (!collectionId || !imageBase64) return Promise.reject(new Error('Missing delivery or image'));
    return postJson('/api/photo-ai/search-selfie', { collectionId, imageBase64, threshold });
  },

  searchBySelfiePublic(collectionId, imageBase64, threshold = 85) {
    if (!collectionId || !imageBase64) return Promise.reject(new Error('Missing delivery or image'));
    return postJson('/api/photo-ai/public/search-selfie', { collectionId, imageBase64, threshold });
  },
};
