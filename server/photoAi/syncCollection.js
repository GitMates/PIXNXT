import { indexCollectionPhotos } from './indexPhoto.js';
import {
  clusterAndPersistPeople,
  getClusterState,
  getMetadataStats,
  isClusterStateFresh,
} from './peopleCache.js';

/**
 * Index any photos missing AI metadata, then rebuild people clusters if needed.
 * Safe to call on collection load or after uploads (debounced on client).
 */
export async function syncCollectionPhotoAi(collectionId, { supabase, limit = 500 } = {}) {
  const indexResult = await indexCollectionPhotos(collectionId, { supabase, limit });
  const stats = await getMetadataStats(supabase, collectionId);

  if (!stats.indexedPhotoCount) {
    return {
      indexed: 0,
      peopleCount: 0,
      pending: indexResult.processed,
      clustered: false,
    };
  }

  const { state } = await getClusterState(supabase, collectionId);
  const needsCluster = indexResult.succeeded > 0 || !isClusterStateFresh(state, stats);

  let people = [];
  if (needsCluster) {
    people = await clusterAndPersistPeople(supabase, collectionId);
  }

  return {
    indexed: indexResult.succeeded,
    pending: indexResult.processed,
    peopleCount: people.length,
    clustered: needsCluster,
  };
}
