import { isIndexedSnapshotFresh, maxIndexedAtFromRows } from '../lib/photoAiCacheFreshness';
import { broadcastPersonLabelUpdate } from '../lib/galleryLiveSync';
import { refreshPeopleAvatars } from '../lib/faceAvatarMath';

async function postJson(path, body) {
  const { apiBase, getAccessToken } = await import('../lib/api/client');
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

/** D1 stores labels/faces as JSON text; normalize to arrays. */
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

async function attachAvatarUrls(people) {
  // Avatar photos first: the crop bbox belongs to that exact photo, and the
  // lookup endpoint caps at 200 ids per request.
  const idSet = new Set();
  for (const person of people) {
    if (person.avatarPhotoId) idSet.add(person.avatarPhotoId);
  }
  for (const person of people) {
    for (const id of person.photoIds || []) idSet.add(id);
  }
  const photoIds = [...idSet];
  if (!photoIds.length) return people;

  // D1 returns JSON strings — normalize below.
  const { apiFetch } = await import('../lib/api/client');
  const data = await apiFetch(`/v1/photos/by-ids?ids=${photoIds.slice(0, 200).map(encodeURIComponent).join(',')}`).catch(() => null);
  const photos = data?.photos || [];

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

    try {
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch('/v1/photo-ai/metadata');
      return { rows: (data?.rows || []).map(normalizeMetadataRow), tableMissing: false };
    } catch (error) {
      console.warn('[photoAi] library metadata load failed:', error.message || error);
      return { rows: [], tableMissing: false };
    }
  },

  async getMetadataForCollection(collectionId) {
    if (!collectionId) return { rows: [], tableMissing: false };

    try {
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch(`/v1/photo-ai/metadata?collectionId=${encodeURIComponent(collectionId)}`);
      return { rows: (data?.rows || []).map(normalizeMetadataRow), tableMissing: false, state: data?.state ?? null };
    } catch (error) {
      console.warn('[photoAi] metadata load failed:', error.message || error);
      return { rows: [], tableMissing: false, error: error.message };
    }
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
  },

  /**
   * Normalize raw photo_ai_people rows (JSON-string ids, no image URLs) into
   * the shape the UI reads: faceIds/photoIds arrays, count, avatar crop + URL.
   */
  async hydratePeople(collectionId, rawRows) {
    const people = ((rawRows || []).map(normalizePersonRow)).map((row) => ({
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
      const { apiFetch, apiBase } = await import('../lib/api/client');
      const { rows: metadataRows } = await this.getMetadataForCollection(collectionId);
      withBestAvatars = refreshPeopleAvatars(people, metadataRows);
      const ctx = await apiFetch(`/v1/guest/selfie-context?collectionId=${encodeURIComponent(collectionId)}`).catch(() => null);
      const guests = (ctx?.guests || []).map((g) => ({
        ...g,
        selfie_url: g.selfie_url || (g.selfie_storage_path ? `${apiBase()}/v1/r2/media?path=${encodeURIComponent(g.selfie_storage_path)}` : null),
      }));
      const { applyGuestSelfieAvatarsToPeople } = await import('../lib/guestPeopleAvatars');
      withBestAvatars = applyGuestSelfieAvatarsToPeople(withBestAvatars, guests, ctx?.matchRows || []);
    } catch (err) {
      console.warn('[photoAi] avatar refresh skipped:', err?.message || err);
    }
    return attachAvatarUrls(withBestAvatars);
  },

  async getPeopleFromDb(collectionId, { includeHidden = false } = {}) {
    if (!collectionId) return { people: [], tableMissing: false };

    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch('/v1/photo-ai/people', {
      method: 'POST',
      body: { collectionId, includeHidden },
    });
    const withUrls = await this.hydratePeople(collectionId, data?.people || []);
    return { people: withUrls, tableMissing: false };
  },

  async setPersonHidden(collectionId, personId, hidden) {
    if (!collectionId || !personId) {
      throw new Error('Missing delivery or person.');
    }

    const { apiFetch } = await import('../lib/api/client');
    await apiFetch(`/v1/photo-ai/people/${encodeURIComponent(personId)}`, {
      method: 'PATCH',
      body: { isHidden: Boolean(hidden) },
    });
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

    const { apiFetch } = await import('../lib/api/client');
    await apiFetch(`/v1/photo-ai/people/${encodeURIComponent(personId)}`, {
      method: 'PATCH',
      body: { label: trimmed },
    });
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
      // The backend returns raw D1 rows (JSON-string ids, no avatar URLs).
      // Hydrate them with the same pipeline as the cache path — the People
      // strip, avatar crops and face filters all read the normalized shape.
      return await this.hydratePeople(collectionId, result?.people || []);
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
