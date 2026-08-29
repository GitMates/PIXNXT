import { analyzeImageBytes } from '../rekognition/analyzeImage.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { invalidateClusterState } from './peopleCache.js';
import { prepareImageBytesForRekognition } from './normalizeImage.js';
import { mapWithConcurrency } from './mapWithConcurrency.js';
import {
  resolvePhotoAiSourceUrl,
  filterIndexedFaces,
  rekognitionDeliveryId,
} from './faceUtils.js';
import { resetDeliveryFaceGroup } from './rekognitionCollection.js';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const INDEX_CONCURRENCY = 8;

export { rekognitionDeliveryId } from './faceUtils.js';

/** @deprecated Prefer rekognitionDeliveryId — same value (AWS CollectionId for a delivery). */
export const rekognitionCollectionId = rekognitionDeliveryId;

export { resolvePhotoAiSourceUrl } from './faceUtils.js';

async function downloadImageBytes(url) {
  if (!url) throw new Error('Photo has no image URL to analyze.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Failed to download image (${res.status})`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error('Image is too large for AI indexing.');
    }
    return new Uint8Array(buffer);
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Timed out downloading image for AI indexing.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function indexPhotoById(photoId, { supabase, skipClusterInvalidate = false } = {}) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured for photo AI indexing.');

  const { data: photo, error: photoError } = await db
    .from('photos')
    .select('id, collection_id, photographer_id, filename, web_url, thumbnail_url, full_url, media_type')
    .eq('id', photoId)
    .maybeSingle();

  if (photoError) throw photoError;
  if (!photo) throw new Error('Photo not found.');

  const mediaType = String(photo.media_type || '').toLowerCase();
  if (mediaType === 'video' || mediaType.startsWith('video/')) {
    return { skipped: true, reason: 'video' };
  }

  const imageUrl = resolvePhotoAiSourceUrl(photo);
  const rawBytes = await downloadImageBytes(imageUrl);
  const imageBytes = await prepareImageBytesForRekognition(rawBytes);

  const analysis = await analyzeImageBytes(imageBytes, {
    deliveryFaceGroupId: rekognitionDeliveryId(photo.collection_id),
    externalImageId: String(photo.id),
    indexFaces: true,
    detectLabels: false,
  });

  const labels = (analysis.labels || []).map((l) => l.name).filter(Boolean);
  const faces = filterIndexedFaces(
    (analysis.faces || []).map((f) => ({
      faceId: f.faceId,
      confidence: f.confidence,
      boundingBox: f.boundingBox,
    }))
  );

  let persistedLabels = labels;
  if (!persistedLabels.length) {
    const { data: existingMeta } = await db
      .from('photo_ai_metadata')
      .select('labels')
      .eq('photo_id', photo.id)
      .maybeSingle();
    persistedLabels = existingMeta?.labels || [];
  }

  const row = {
    photo_id: photo.id,
    collection_id: photo.collection_id,
    photographer_id: photo.photographer_id,
    labels: persistedLabels,
    faces,
    indexed_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('photo_ai_metadata')
    .upsert(row, { onConflict: 'photo_id' })
    .select()
    .single();

  if (error) throw error;

  if (!skipClusterInvalidate) {
    await invalidateClusterState(db, photo.collection_id);
  }

  return { photo_id: photo.id, metadata: data, labels: persistedLabels, faces };
}

export async function indexCollectionPhotos(
  collectionId,
  { supabase, limit = 50, force = false, concurrency = INDEX_CONCURRENCY } = {}
) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured.');

  const { data: photos, error } = await db
    .from('photos')
    .select('id')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  let pending = photos || [];
  if (force) {
    await resetDeliveryFaceGroup(collectionId);
  } else {
    const { data: indexed } = await db
      .from('photo_ai_metadata')
      .select('photo_id')
      .eq('collection_id', collectionId);

    const indexedSet = new Set((indexed || []).map((r) => r.photo_id));
    pending = pending.filter((p) => !indexedSet.has(p.id));
  }

  const results = await mapWithConcurrency(pending, concurrency, async (photo) => {
    try {
      const result = await indexPhotoById(photo.id, {
        supabase: db,
        skipClusterInvalidate: true,
      });
      return { photoId: photo.id, ok: true, result };
    } catch (err) {
      return { photoId: photo.id, ok: false, error: err?.message || 'Failed' };
    }
  });

  if (results.some((r) => r.ok)) {
    await invalidateClusterState(db, collectionId);
  }

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    results,
  };
}
