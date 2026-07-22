import { getAuthedSupabase } from './supabaseAdmin.js';
import { indexPhotoById } from './indexPhoto.js';
import { searchFacesBySelfie } from './searchBySelfie.js';
import { clusterAndPersistPeople, filterPeopleByFaceIds, getPeopleForCollection } from './peopleCache.js';
import { syncCollectionPhotoAi } from './syncCollection.js';
import { assertPublishedCollection } from './publicAccess.js';

async function assertCollectionAccess(req, collectionId) {
  const { supabase, isAdmin, userId } = await getAuthedSupabase(req);
  if (!isAdmin) {
    const { data: collection, error } = await supabase
      .from('collections')
      .select('id, photographer_id')
      .eq('id', collectionId)
      .maybeSingle();
    if (error) throw error;
    if (!collection || collection.photographer_id !== userId) {
      throw new Error('Forbidden');
    }
  }
  return supabase;
}

export async function handleIndexPhotoRequest(req, body) {
  const photoId = body?.photoId;
  if (!photoId) throw new Error('photoId is required.');

  const { supabase, isAdmin, userId } = await getAuthedSupabase(req);

  if (!isAdmin) {
    const { data: photo, error } = await supabase
      .from('photos')
      .select('id, photographer_id')
      .eq('id', photoId)
      .maybeSingle();
    if (error) throw error;
    if (!photo || photo.photographer_id !== userId) {
      throw new Error('Forbidden');
    }
  }

  return indexPhotoById(photoId, { supabase });
}

export async function handleSyncCollectionRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const supabase = await assertCollectionAccess(req, collectionId);
  const limit = Math.min(Number(body?.limit) || 500, 500);
  return syncCollectionPhotoAi(collectionId, { supabase, limit });
}

export async function handleReclusterRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const supabase = await assertCollectionAccess(req, collectionId);
  const people = await clusterAndPersistPeople(supabase, collectionId);
  return { peopleCount: people.length };
}

export async function handleIndexCollectionRequest(req, body) {
  return handleSyncCollectionRequest(req, body);
}

export async function handleGetPeopleRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const supabase = await assertCollectionAccess(req, collectionId);
  const forceRecluster = Boolean(body?.forceRecluster);
  const includeHidden = Boolean(body?.includeHidden);

  const { people, fromCache, missingTables } = await getPeopleForCollection(supabase, collectionId, {
    forceRecluster,
    includeHidden,
  });

  return {
    people,
    fromCache,
    missingTables,
  };
}

export async function handleSearchSelfieRequest(req, body) {
  const collectionId = body?.collectionId;
  const imageBase64 = body?.imageBase64;
  if (!collectionId) throw new Error('collectionId is required.');
  if (!imageBase64) throw new Error('imageBase64 is required.');

  const supabase = await assertCollectionAccess(req, collectionId);
  const threshold = Math.min(Math.max(Number(body?.threshold) || 85, 70), 99);

  const searchResult = await searchFacesBySelfie(collectionId, imageBase64, threshold);

  if (!searchResult.matched) {
    return {
      matched: false,
      photoIds: [],
      people: [],
      matches: [],
      message: 'No matching faces found in this gallery.',
    };
  }

  const matchedPeople = await filterPeopleByFaceIds(
    supabase,
    collectionId,
    searchResult.faceIds,
    searchResult.photoIds
  );

  return {
    matched: true,
    photoIds: searchResult.photoIds,
    faceIds: searchResult.faceIds,
    matches: searchResult.matches,
    searchedFaceConfidence: searchResult.searchedFaceConfidence,
    people: matchedPeople,
    message: `Found ${searchResult.photoIds.length} matching photo${searchResult.photoIds.length === 1 ? '' : 's'}.`,
  };
}

export async function handlePublicSearchSelfieRequest(req, body) {
  const collectionId = body?.collectionId;
  const imageBase64 = body?.imageBase64;
  if (!collectionId) throw new Error('collectionId is required.');
  if (!imageBase64) throw new Error('imageBase64 is required.');

  await assertPublishedCollection(collectionId);
  const threshold = Math.min(Math.max(Number(body?.threshold) || 85, 70), 99);

  const searchResult = await searchFacesBySelfie(collectionId, imageBase64, threshold);

  if (!searchResult.matched) {
    return {
      matched: false,
      photoIds: [],
      message: 'No matching faces found in this gallery.',
    };
  }

  return {
    matched: true,
    photoIds: searchResult.photoIds,
    faceIds: searchResult.faceIds,
    matches: searchResult.matches,
    searchedFaceConfidence: searchResult.searchedFaceConfidence,
    message: `Found ${searchResult.photoIds.length} matching photo${searchResult.photoIds.length === 1 ? '' : 's'}.`,
  };
}
