import { analyzeImageBytes } from '../rekognition/analyzeImage.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { invalidateClusterState } from './peopleCache.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * Face-group id for a PIXNXT delivery (or guest-delivery event).
 * AWS Rekognition still calls this resource a “Collection” — that is their API name.
 */
export function rekognitionDeliveryId(deliveryId) {
  return `pixnxt-${String(deliveryId).replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
}

/** @deprecated Prefer rekognitionDeliveryId — same value (AWS CollectionId for a delivery). */
export const rekognitionCollectionId = rekognitionDeliveryId;

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

export async function indexPhotoById(photoId, { supabase } = {}) {
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

  const imageUrl = photo.web_url || photo.thumbnail_url || photo.full_url;
  const imageBytes = await downloadImageBytes(imageUrl);

  const analysis = await analyzeImageBytes(imageBytes, {
    deliveryFaceGroupId: rekognitionDeliveryId(photo.collection_id),
    externalImageId: String(photo.id),
    indexFaces: true,
  });

  const labels = (analysis.labels || []).map((l) => l.name).filter(Boolean);
  const faces = (analysis.faces || []).map((f) => ({
    faceId: f.faceId,
    confidence: f.confidence,
    boundingBox: f.boundingBox,
  }));

  const row = {
    photo_id: photo.id,
    collection_id: photo.collection_id,
    photographer_id: photo.photographer_id,
    labels,
    faces,
    indexed_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('photo_ai_metadata')
    .upsert(row, { onConflict: 'photo_id' })
    .select()
    .single();

  if (error) throw error;

  await invalidateClusterState(db, photo.collection_id);

  return { photo_id: photo.id, metadata: data, labels, faces };
}

export async function indexCollectionPhotos(collectionId, { supabase, limit = 50 } = {}) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured.');

  const { data: photos, error } = await db
    .from('photos')
    .select('id')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const { data: indexed } = await db
    .from('photo_ai_metadata')
    .select('photo_id')
    .eq('collection_id', collectionId);

  const indexedSet = new Set((indexed || []).map((r) => r.photo_id));
  const pending = (photos || []).filter((p) => !indexedSet.has(p.id));

  const results = [];
  for (const photo of pending) {
    try {
      const result = await indexPhotoById(photo.id, { supabase: db });
      results.push({ photoId: photo.id, ok: true, result });
    } catch (err) {
      results.push({ photoId: photo.id, ok: false, error: err?.message || 'Failed' });
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    results,
  };
}
