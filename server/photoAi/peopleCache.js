import { clusterFacesForCollection } from './clusterFaces.js';
import { isIndexedSnapshotFresh } from './cacheFreshness.js';
import { applyGuestLabelsToPeople, loadGuestDeliveryGuestsForCollection, applyGuestSelfieAvatarsForCollection } from './applyGuestLabels.js';
import { resolveFaceAvatarDisplayUrl, pickBestAvatarFace } from './faceUtils.js';

const PEOPLE_TABLE = 'photo_ai_people';
const CLUSTER_STATE_TABLE = 'photo_ai_cluster_state';

function isMissingTableError(error, tableName) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || error.details || '').toLowerCase();
  const mentionsTable = message.includes(tableName.toLowerCase());
  const missing =
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache');
  return code === '42P01' || code === 'PGRST205' || (mentionsTable && missing);
}

export async function getMetadataStats(supabase, collectionId) {
  const { data, error } = await supabase
    .from('photo_ai_metadata')
    .select('photo_id, indexed_at')
    .eq('collection_id', collectionId);

  if (error) throw error;

  const rows = data || [];
  let maxIndexedAt = null;
  for (const row of rows) {
    if (!row.indexed_at) continue;
    if (!maxIndexedAt || row.indexed_at > maxIndexedAt) {
      maxIndexedAt = row.indexed_at;
    }
  }

  return {
    indexedPhotoCount: rows.length,
    maxIndexedAt,
  };
}

export async function getClusterState(supabase, collectionId) {
  const { data, error } = await supabase
    .from(CLUSTER_STATE_TABLE)
    .select('indexed_photo_count, max_indexed_at, clustered_at')
    .eq('collection_id', collectionId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, CLUSTER_STATE_TABLE)) {
      return { missingTables: true, state: null };
    }
    throw error;
  }

  return { missingTables: false, state: data };
}

export function isClusterStateFresh(state, stats) {
  return isIndexedSnapshotFresh(state, stats.indexedPhotoCount, stats.maxIndexedAt);
}

export async function invalidateClusterState(supabase, collectionId) {
  const { error } = await supabase
    .from(CLUSTER_STATE_TABLE)
    .delete()
    .eq('collection_id', collectionId);

  if (error && !isMissingTableError(error, CLUSTER_STATE_TABLE)) {
    console.warn('[peopleCache] invalidateClusterState failed:', error.message);
  }
}

async function attachPhotoUrls(supabase, people) {
  const photoIds = [...new Set(people.flatMap((p) => p.photoIds))];
  if (!photoIds.length) return people;

  const { data: photos } = await supabase
    .from('photos')
    .select('id, thumbnail_url, web_url, full_url')
    .in('id', photoIds);

  const photoUrlById = new Map(
    (photos || []).map((p) => [p.id, resolveFaceAvatarDisplayUrl(p)])
  );

  return people.map((person) => {
    if (person.guestSelfieUrl || person.avatarSource === 'guest_selfie') {
      return {
        id: person.id,
        faceIds: person.faceIds,
        photoIds: person.photoIds,
        label: person.label,
        count: person.count ?? person.photoIds.length,
        imageUrl: person.guestSelfieUrl || person.imageUrl || null,
        boundingBox: null,
        guestSelfieUrl: person.guestSelfieUrl || person.imageUrl || null,
        avatarSource: 'guest_selfie',
      };
    }

    const avatarPhotoId = person.avatarFace?.photoId || person.avatarPhotoId;
    return {
      id: person.id,
      faceIds: person.faceIds,
      photoIds: person.photoIds,
      label: person.label,
      count: person.count ?? person.photoIds.length,
      imageUrl: avatarPhotoId ? photoUrlById.get(avatarPhotoId) || null : person.imageUrl || null,
      boundingBox: person.avatarFace?.boundingBox || person.boundingBox || null,
    };
  });
}

export async function loadPeopleFromDb(supabase, collectionId, { includeHidden = false } = {}) {
  let query = supabase
    .from(PEOPLE_TABLE)
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
    if (isMissingTableError(error, PEOPLE_TABLE)) {
      return { missingTables: true, people: [] };
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
    const faceEntryById = await loadFaceEntryMap(supabase, collectionId);
    withBestAvatars = refreshPeopleAvatars(people, faceEntryById);
    withBestAvatars = await applyGuestSelfieAvatarsForCollection(supabase, collectionId, withBestAvatars);
  } catch (err) {
    console.warn('[peopleCache] avatar refresh skipped:', err?.message || err);
  }

  const withUrls = await attachPhotoUrls(supabase, withBestAvatars);
  return { missingTables: false, people: withUrls };
}

async function getPhotographerId(supabase, collectionId) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('photographer_id')
    .eq('id', collectionId)
    .maybeSingle();

  if (error) throw error;
  return data?.photographer_id || null;
}

export async function savePeopleClusters(supabase, collectionId, photographerId, people, stats) {
  const pid = photographerId || (await getPhotographerId(supabase, collectionId));
  if (!pid) throw new Error('Could not resolve photographer for people cache.');

  const { data: existingRows } = await supabase
    .from(PEOPLE_TABLE)
    .select('cluster_key, is_hidden')
    .eq('collection_id', collectionId);

  const hiddenByKey = new Map(
    (existingRows || []).map((row) => [row.cluster_key, Boolean(row.is_hidden)])
  );

  const { error: deleteError } = await supabase
    .from(PEOPLE_TABLE)
    .delete()
    .eq('collection_id', collectionId);

  if (deleteError && !isMissingTableError(deleteError, PEOPLE_TABLE)) {
    throw deleteError;
  }

  if (people.length) {
    const rows = people.map((person, index) => ({
      collection_id: collectionId,
      photographer_id: pid,
      cluster_key: person.id,
      face_ids: person.faceIds,
      photo_ids: person.photoIds,
      label: person.label || 'Not named',
      sort_order: index,
      avatar_photo_id: person.avatarFace?.photoId || null,
      avatar_bounding_box: person.avatarFace?.boundingBox || null,
      is_hidden: hiddenByKey.get(person.id) ?? false,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from(PEOPLE_TABLE).insert(rows);
    if (insertError) throw insertError;
  }

  const { error: stateError } = await supabase.from(CLUSTER_STATE_TABLE).upsert(
    {
      collection_id: collectionId,
      photographer_id: pid,
      indexed_photo_count: stats.indexedPhotoCount,
      max_indexed_at: stats.maxIndexedAt,
      clustered_at: new Date().toISOString(),
    },
    { onConflict: 'collection_id' }
  );

  if (stateError) throw stateError;
}

function buildFaceEntries(metadataRows) {
  const faceEntries = [];
  for (const row of metadataRows || []) {
    for (const face of row.faces || []) {
      if (!face?.faceId) continue;
      faceEntries.push({
        faceId: face.faceId,
        photoId: row.photo_id,
        boundingBox: face.boundingBox,
        confidence: face.confidence,
      });
    }
  }
  return faceEntries;
}

function buildFaceEntryMap(metadataRows) {
  const map = new Map();
  for (const entry of buildFaceEntries(metadataRows)) {
    map.set(entry.faceId, entry);
  }
  return map;
}

/** Re-score every face in a cluster and pick the best full-face portrait thumbnail. */
function refreshPeopleAvatars(people, faceEntryById) {
  if (!faceEntryById?.size) return people;

  return people.map((person) => {
    if (person.guestSelfieUrl || person.avatarSource === 'guest_selfie') return person;

    let best = null;
    for (const faceId of person.faceIds || []) {
      const entry = faceEntryById.get(faceId);
      if (entry) best = pickBestAvatarFace(best, entry);
    }
    if (!best) return person;

    return {
      ...person,
      avatarPhotoId: best.photoId,
      boundingBox: best.boundingBox,
      avatarFace: best,
    };
  });
}

async function loadFaceEntryMap(supabase, collectionId) {
  const { data: metadataRows, error } = await supabase
    .from('photo_ai_metadata')
    .select('photo_id, faces')
    .eq('collection_id', collectionId);

  if (error) throw error;
  return buildFaceEntryMap(metadataRows);
}

export async function clusterAndPersistPeople(supabase, collectionId, photographerId) {
  const { data: metadataRows, error: metaError } = await supabase
    .from('photo_ai_metadata')
    .select('photo_id, faces')
    .eq('collection_id', collectionId);

  if (metaError) throw metaError;

  const stats = await getMetadataStats(supabase, collectionId);
  const faceEntries = buildFaceEntries(metadataRows);

  if (!faceEntries.length) {
    // Do not wipe existing people when metadata has no face IDs yet
    // (indexing still running, or photos with no detectable faces).
    const { people: existing } = await loadPeopleFromDb(supabase, collectionId, {
      includeHidden: true,
    });
    if (existing.length > 0) {
      return existing;
    }
    return [];
  }

  const clustered = await clusterFacesForCollection(collectionId, faceEntries);
  let people = clustered.map((person, index) => ({
    ...person,
    label: person.label || 'Not named',
  }));

  people = await applyGuestLabelsToPeople(supabase, collectionId, people, { persist: false });

  await savePeopleClusters(supabase, collectionId, photographerId, people, stats);
  return attachPhotoUrls(supabase, people);
}

async function finalizePeopleWithGuestLabels(supabase, collectionId, people) {
  if (!people?.length) return people || [];
  const { guests } = await loadGuestDeliveryGuestsForCollection(supabase, collectionId);
  if (!guests.length) return people;
  const labeled = await applyGuestLabelsToPeople(supabase, collectionId, people, {
    persist: true,
    syncGuestMatches: true,
  });
  return attachPhotoUrls(supabase, labeled);
}

export async function getPeopleForCollection(
  supabase,
  collectionId,
  { forceRecluster = false, includeHidden = false } = {}
) {
  const stats = await getMetadataStats(supabase, collectionId);
  const { missingTables: stateTablesMissing, state } = await getClusterState(supabase, collectionId);
  const { missingTables: peopleTablesMissing, people: cachedPeople } = await loadPeopleFromDb(
    supabase,
    collectionId,
    { includeHidden }
  );

  const missingTables = stateTablesMissing || peopleTablesMissing;

  if (!stats.indexedPhotoCount) {
    const people = await finalizePeopleWithGuestLabels(supabase, collectionId, cachedPeople);
    return { people, fromCache: true, missingTables };
  }

  if (
    !forceRecluster &&
    !missingTables &&
    cachedPeople.length > 0 &&
    isClusterStateFresh(state, stats)
  ) {
    const people = await finalizePeopleWithGuestLabels(supabase, collectionId, cachedPeople);
    return { people, fromCache: true, missingTables: false };
  }

  if (missingTables) {
    const { data: metadataRows, error: metaError } = await supabase
      .from('photo_ai_metadata')
      .select('photo_id, faces')
      .eq('collection_id', collectionId);

    if (metaError) throw metaError;

    const faceEntries = buildFaceEntries(metadataRows);
    if (!faceEntries.length) {
      const people = await finalizePeopleWithGuestLabels(supabase, collectionId, cachedPeople);
      return { people, fromCache: true, missingTables: true };
    }

    const clustered = await clusterFacesForCollection(collectionId, faceEntries);
    const people = await finalizePeopleWithGuestLabels(
      supabase,
      collectionId,
      await attachPhotoUrls(
        supabase,
        clustered.map((person) => ({
          ...person,
          label: person.label || 'Not named',
        }))
      )
    );
    return { people, fromCache: false, missingTables: true };
  }

  try {
    const people = await finalizePeopleWithGuestLabels(
      supabase,
      collectionId,
      await clusterAndPersistPeople(supabase, collectionId)
    );
    return { people, fromCache: false, missingTables: false };
  } catch (err) {
    if (cachedPeople.length > 0) {
      console.warn('[peopleCache] recluster failed; returning cached people:', err?.message || err);
      const people = await finalizePeopleWithGuestLabels(supabase, collectionId, cachedPeople);
      return { people, fromCache: true, missingTables: false };
    }
    throw err;
  }
}

export async function filterPeopleByFaceIds(supabase, collectionId, matchedFaceIds, matchedPhotoIds) {
  const matchedFaceSet = new Set(matchedFaceIds || []);
  const { people } = await getPeopleForCollection(supabase, collectionId);

  return people
    .filter((person) => (person.faceIds || []).some((id) => matchedFaceSet.has(id)))
    .map((person) => {
      const overlappingPhotos = (person.photoIds || []).filter((id) =>
        (matchedPhotoIds || []).includes(id)
      );
      return {
        id: person.id,
        label: person.label,
        photoIds: overlappingPhotos.length ? overlappingPhotos : person.photoIds,
        count: overlappingPhotos.length || person.photoIds.length,
        faceIds: (person.faceIds || []).filter((id) => matchedFaceSet.has(id)),
      };
    })
    .sort((a, b) => b.count - a.count);
}
