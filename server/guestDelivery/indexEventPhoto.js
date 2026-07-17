import { analyzeImageBytes } from '../rekognition/analyzeImage.js';
import { rekognitionCollectionId } from '../photoAi/indexPhoto.js';
import { normalizeImageToJpegBytes } from '../photoAi/normalizeImage.js';
import { getSupabaseAdmin } from '../photoAi/supabaseAdmin.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

async function downloadImageBytes(url) {
  if (!url) throw new Error('Photo has no image URL to analyze.');
  const res = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large for AI indexing.');
  }
  return buffer;
}

export async function indexGuestDeliveryPhoto(photoId, { supabase, force = false } = {}) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured for guest delivery indexing.');

  const { data: photo, error } = await db
    .from('guest_delivery_photos')
    .select('id, event_id, full_url, thumbnail_url, ai_indexed_at')
    .eq('id', photoId)
    .maybeSingle();

  if (error) throw error;
  if (!photo) throw new Error('Photo not found.');
  if (photo.ai_indexed_at && !force) return { photoId: photo.id, skipped: true };

  const imageUrl = photo.full_url || photo.thumbnail_url;
  const rawBytes = await downloadImageBytes(imageUrl);
  const imageBytes = new Uint8Array(await normalizeImageToJpegBytes(rawBytes));
  const collectionId = rekognitionCollectionId(photo.event_id);

  const analysis = await analyzeImageBytes(imageBytes, {
    collectionId,
    externalImageId: String(photo.id),
    indexFaces: true,
  });

  const faceCount = analysis.faces?.length || 0;
  if (faceCount === 0) {
    return {
      photoId: photo.id,
      indexed: false,
      faceCount: 0,
      reason: 'no_faces_detected',
    };
  }

  const indexedAt = new Date().toISOString();
  const { error: updateError } = await db
    .from('guest_delivery_photos')
    .update({ ai_indexed_at: indexedAt })
    .eq('id', photo.id);

  if (updateError) throw updateError;

  return { photoId: photo.id, indexed: true, indexedAt, faceCount };
}

async function indexCollectionPhoto(photoId, eventId, { supabase, force = false } = {}) {
  const db = supabase || getSupabaseAdmin();
  const { data: photo, error } = await db
    .from('photos')
    .select('id, full_url, thumbnail_url')
    .eq('id', photoId)
    .maybeSingle();

  if (error) throw error;
  if (!photo) throw new Error('Photo not found.');

  const imageUrl = photo.full_url || photo.thumbnail_url;
  const rawBytes = await downloadImageBytes(imageUrl);
  const imageBytes = new Uint8Array(await normalizeImageToJpegBytes(rawBytes));
  const collId = rekognitionCollectionId(eventId);

  const analysis = await analyzeImageBytes(imageBytes, {
    collectionId: collId,
    externalImageId: String(photo.id),
    indexFaces: true,
  });

  const faceCount = analysis.faces?.length || 0;
  if (faceCount === 0) {
    return { photoId: photo.id, indexed: false, faceCount: 0, reason: 'no_faces_detected' };
  }

  return { photoId: photo.id, indexed: true, indexedAt: new Date().toISOString(), faceCount };
}

export async function indexEventPhotos(eventId, { supabase, force = false, collectionId = null } = {}) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured.');

  let photos;
  if (collectionId) {
    const { data, error } = await db
      .from('photos')
      .select('id')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    photos = data || [];
  } else {
    const { data, error } = await db
      .from('guest_delivery_photos')
      .select('id, ai_indexed_at')
      .eq('event_id', eventId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    photos = data || [];
  }

  const pending = force
    ? photos
    : collectionId
      ? photos
      : photos.filter((p) => !p.ai_indexed_at);
  const results = [];

  for (const photo of pending) {
    try {
      const result = collectionId
        ? await indexCollectionPhoto(photo.id, eventId, { supabase: db, force })
        : await indexGuestDeliveryPhoto(photo.id, { supabase: db, force });
      results.push({ photoId: photo.id, ok: true, result });
    } catch (err) {
      results.push({ photoId: photo.id, ok: false, error: err?.message || 'Failed to index photo' });
    }
  }

  const indexedWithFaces = results.filter((r) => r.ok && r.result?.indexed).length;
  const noFaces = results.filter((r) => r.ok && r.result?.reason === 'no_faces_detected').length;

  return {
    total: photos.length,
    pending: pending.length,
    indexed: indexedWithFaces,
    noFaces,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
