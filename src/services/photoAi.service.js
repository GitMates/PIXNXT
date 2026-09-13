import { supabase } from '../lib/supabase/client';
import { USE_WORKERS_AUTH } from '../lib/api/client';
import { isIndexedSnapshotFresh, maxIndexedAtFromRows } from '../lib/photoAiCacheFreshness';
import { broadcastPersonLabelUpdate } from '../lib/galleryLiveSync';
import { refreshPeopleAvatars } from '../lib/faceAvatarMath';
import { applyGuestSelfieAvatarsForCollection } from '../lib/guestPeopleAvatars';

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
  const { USE_WORKERS_AUTH, apiBase, getAccessToken } = await import('../lib/api/client');
  if (USE_WORKERS_AUTH) {
    const url = `${apiBase()}/v1${path.replace(/^\/api\/photo-ai/, '/photo-ai')}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Request failed (${res.status})`);
    }
    return data;
  }
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

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** D1 stores labels/faces as JSON text; Supabase returned arrays. */
function normalizeMetadataRow(row) {
  if (!row) return row;
  return { ...row, labels: parseJsonArray(row.labels), faces: parseJsonArray(row.faces) };
}

function normalizePersonRow(row) {
  if (!row) return row;
  let bbox = row.avatar_bounding_box ?? null;
  if (typeof bbox === 'string' && bbox.trim().startsWith('{')) {
    try {
      bbox = JSON.parse(bbox);
    } catch {
      bbox = null;
    }
  }
  return {
    ...row,
    face_ids: parseJsonArray(row.face_ids),
    photo_ids: parseJsonArray(row.photo_ids),
    avatar_bounding_box: bbox,
  };
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

  // D1 returns JSON strings where Supabase returned arrays — normalize below.
  let photos = [];
  if (USE_WORKERS_AUTH) {
    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch(`/v1/photos/by-ids?ids=${photoIds.slice(0, 200).map(encodeURIComponent).join(',')}`).catch(() => null);
    photos = data?.photos || [];
  } else {
    const { data } = await supabase
      .from('photos')
      .select('id, thumbnail_url, web_url, full_url')
      .in('id', photoIds);
    photos = data || [];
  }

  const photoUrlById = new Map(
    (photos || []).map((p) => [p.id, p.web_url || p.full_url || p.thumbnail_url || null])
  );

  return people.map((person) => {
    if (person.guestSelfieUrl || person.avatarSource === 'guest_selfie') {
      return {
        ...person,
        imageUrl: person.guestSelfieUrl || person.imageUrl || null,
        boundingBox: null,
      };
    }

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

    if (USE_WORKERS_AUTH) {
      try {
        const { apiFetch } = await import('../lib/api/client');
        const data = await apiFetch('/v1/photo-ai/metadata');
        return { rows: (data?.rows || []).map(normalizeMetadataRow), tableMissing: false };
      } catch (error) {
        console.warn('[photoAi] library metadata load failed:', error.message || error);
        return { rows: [], tableMissing: false };
      }
    }
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

    if (USE_WORKERS_AUTH) {
      try {
        const { apiFetch } = await import('../lib/api/client');
        const data = await apiFetch(`/v1/photo-ai/metadata?collectionId=${encodeURIComponent(collectionId)}`);
        return { rows: (data?.rows || []).map(normalizeMetadataRow), tableMissing: false, state: data?.state ?? null };
      } catch (error) {
        console.warn('[photoAi] metadata load failed:', error.message || error);
        return { rows: [], tableMissing: false, error: error.message };
      }
    }
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
    if (USE_WORKERS_AUTH) {
      try {
        const { apiFetch } = await import('../lib/api/client');
        const data = await apiFetch(`/v1/photo-ai/metadata?collectionId=${encodeURIComponent(collectionId)}`);
        const state = data?.state;
        if (!state) return false;
        const count = (metadataRows || []).length;
        const maxIndexedAt = maxIndexedAtFromRows(metadataRows);
        return isIndexedSnapshotFresh(state, count, maxIndexedAt);
      } catch {
        return false;
      }
    }
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

    if (USE_WORKERS_AUTH) {
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch('/v1/photo-ai/people', {
        method: 'POST',
        body: { collectionId, includeHidden },
      });
      const people = ((data?.people || []).map(normalizePersonRow)).map((row) => ({
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
      let withBestAvatars = people;
      try {
        const { rows: metadataRows } = await this.getMetadataForCollection(collectionId);
        withBestAvatars = refreshPeopleAvatars(people, metadataRows);
        const ctx = await apiFetch(`/v1/guest/selfie-context?collectionId=${encodeURIComponent(collectionId)}`).catch(() => null);
        const { apiBase } = await import('../lib/api/client');
        const guests = (ctx?.guests || []).map((g) => ({
          ...g,
          selfie_url: g.selfie_url || (g.selfie_storage_path ? `${apiBase()}/v1/r2/media?path=${encodeURIComponent(g.selfie_storage_path)}` : null),
        }));
        const { applyGuestSelfieAvatarsToPeople } = await import('../lib/guestPeopleAvatars');
        withBestAvatars = applyGuestSelfieAvatarsToPeople(withBestAvatars, guests, ctx?.matchRows || []);
      } catch (err) {
        console.warn('[photoAi] avatar refresh skipped:', err?.message || err);
      }
      const withUrls = await attachAvatarUrls(withBestAvatars);
      return { people: withUrls, tableMissing: false };
    }
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

    let withBestAvatars = people;
    try {
      const { rows: metadataRows } = await this.getMetadataForCollection(collectionId);
      withBestAvatars = refreshPeopleAvatars(people, metadataRows);
      withBestAvatars = await applyGuestSelfieAvatarsForCollection(supabase, collectionId, withBestAvatars);
    } catch (err) {
      console.warn('[photoAi] avatar refresh skipped:', err?.message || err);
    }

    const withUrls = await attachAvatarUrls(withBestAvatars);
    return { people: withUrls, tableMissing: false };
  },

  async setPersonHidden(collectionId, personId, hidden) {
    if (!collectionId || !personId) {
      throw new Error('Missing delivery or person.');
    }

    if (USE_WORKERS_AUTH) {
      const { apiFetch } = await import('../lib/api/client');
      await apiFetch(`/v1/photo-ai/people/${encodeURIComponent(personId)}`, {
        method: 'PATCH',
        body: { isHidden: Boolean(hidden) },
      });
      return { ok: true };
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

  async setPersonLabel(collectionId, personId, label) {
    if (!collectionId || !personId) {
      throw new Error('Missing delivery or person.');
    }

    const trimmed = String(label || '').trim();
    if (!trimmed) {
      throw new Error('Name is required.');
    }

    if (USE_WORKERS_AUTH) {
      const { apiFetch } = await import('../lib/api/client');
      await apiFetch(`/v1/photo-ai/people/${encodeURIComponent(personId)}`, {
        method: 'PATCH',
        body: { label: trimmed },
      });
      broadcastPersonLabelUpdate({ collectionId, personId, label: trimmed });
      return { ok: true };
    }
    const { error } = await supabase
      .from('photo_ai_people')
      .update({
        label: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq('collection_id', collectionId)
      .eq('cluster_key', personId);

    if (error) throw error;
    broadcastPersonLabelUpdate({ collectionId, personId, label: trimmed });
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

  syncCollection(collectionId, limit = 500, { forceReindex = false } = {}) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/sync-collection', { collectionId, limit, forceReindex });
  },

  reclusterCollection(collectionId) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/recluster', { collectionId });
  },

  repairLabels(collectionId) {
    if (!collectionId) return Promise.resolve(null);
    return postJson('/api/photo-ai/repair-labels', { collectionId });
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
