import { analyzeImageBytes } from '../rekognition/analyzeImage.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { resolvePhotoAiSourceUrl, downloadImageBytesForAnalysis } from './indexPhoto.js';
import { prepareImageBytesForRekognition } from './normalizeImage.js';
import { mapWithConcurrency } from './mapWithConcurrency.js';

const REPAIR_CONCURRENCY = 4;

/**
 * Backfill Rekognition labels for metadata rows saved while label detection
 * was disabled (labels = []). Labels-only: faces, indexed_at and the people
 * clusters are left untouched, so no duplicate faces are created.
 */
export async function repairMissingLabels(collectionId, { supabase } = {}) {
  const db = supabase || getSupabaseAdmin();
  if (!db) throw new Error('Supabase is not configured.');
  if (!collectionId) throw new Error('collectionId is required.');

  const { data: metas, error: metaError } = await db
    .from('photo_ai_metadata')
    .select('photo_id, labels')
    .eq('collection_id', collectionId);

  if (metaError) throw metaError;

  const needsRepair = (metas || []).filter((r) => !((r.labels || []).length));
  if (!needsRepair.length) {
    return { total: (metas || []).length, repaired: 0, failed: 0, results: [] };
  }

  const { data: photos, error: photoError } = await db
    .from('photos')
    .select('id, web_url, thumbnail_url, full_url, media_type')
    .eq('collection_id', collectionId);

  if (photoError) throw photoError;

  const photoById = new Map((photos || []).map((p) => [p.id, p]));
  const results = await mapWithConcurrency(needsRepair, REPAIR_CONCURRENCY, async (meta) => {
    try {
      const photo = photoById.get(meta.photo_id);
      if (!photo) return { photoId: meta.photo_id, ok: false, error: 'Photo not found' };
      const mediaType = String(photo.media_type || '').toLowerCase();
      if (mediaType === 'video' || mediaType.startsWith('video/')) {
        return { photoId: meta.photo_id, ok: true, skipped: true };
      }
      const imageUrl = resolvePhotoAiSourceUrl(photo);
      const rawBytes = await downloadImageBytesForAnalysis(imageUrl);
      const imageBytes = await prepareImageBytesForRekognition(rawBytes);
      const analysis = await analyzeImageBytes(imageBytes, { indexFaces: false });
      const labels = (analysis.labels || []).map((l) => l.name).filter(Boolean);

      const { error: updateError } = await db
        .from('photo_ai_metadata')
        .update({ labels })
        .eq('photo_id', meta.photo_id);

      if (updateError) throw updateError;
      return { photoId: meta.photo_id, ok: true, labelCount: labels.length };
    } catch (err) {
      return { photoId: meta.photo_id, ok: false, error: err?.message || 'Failed' };
    }
  });

  return {
    total: needsRepair.length,
    repaired: results.filter((r) => r.ok && !r.skipped).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
