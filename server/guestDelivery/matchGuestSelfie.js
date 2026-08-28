import { searchFacesBySelfie } from '../photoAi/searchBySelfie.js';
import { getBytesFromR2 } from './r2Server.js';

async function loadGuestSelfieBase64(guest) {
  let buffer = null;

  if (guest.selfie_storage_path) {
    try {
      buffer = await getBytesFromR2(guest.selfie_storage_path);
    } catch (err) {
      console.warn('[guest-delivery] R2 selfie fetch failed:', err?.message);
    }
  }

  if (!buffer && guest.selfie_url) {
    const res = await fetch(guest.selfie_url, { headers: { Accept: 'image/*' } });
    if (!res.ok) {
      throw new Error(`Failed to load guest selfie (${res.status}).`);
    }
    buffer = Buffer.from(await res.arrayBuffer());
  }

  if (!buffer?.length) {
    throw new Error('Guest has no selfie on file.');
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Guest selfie is too large.');
  }

  return buffer.toString('base64');
}

function dedupeMatches(matches) {
  const bestByPhoto = new Map();
  for (const m of matches || []) {
    if (!m.photoId || !m.faceId) continue;
    const prev = bestByPhoto.get(m.photoId);
    if (!prev || m.similarity > prev.similarity) {
      bestByPhoto.set(m.photoId, m);
    }
  }
  return [...bestByPhoto.values()];
}

/**
 * Search event collection with stepped thresholds (same approach as client gallery tuning).
 * When collectionId is set (linked delivery), search the collection face group — same pool as People.
 */
export async function matchGuestSelfie({ eventId, collectionId = null, guest, threshold = 85 }) {
  const selfieBase64 = await loadGuestSelfieBase64(guest);
  const searchDeliveryId = collectionId || eventId;
  const baseThreshold = Math.min(Math.max(Number(threshold) || 85, 70), 99);
  const thresholds = [...new Set([baseThreshold, 85, 80, 75, 70].filter((t) => t >= 70 && t <= 99))].sort(
    (a, b) => b - a
  );

  let lastResult = null;
  let lastError = null;

  for (const tryThreshold of thresholds) {
    try {
      const searchResult = await searchFacesBySelfie(searchDeliveryId, selfieBase64, tryThreshold);
      lastResult = searchResult;
      const uniqueMatches = dedupeMatches(searchResult.matches);
      if (uniqueMatches.length > 0) {
        return {
          matched: true,
          matches: uniqueMatches,
          photoIds: [...new Set(uniqueMatches.map((m) => m.photoId))],
          searchedFaceConfidence: searchResult.searchedFaceConfidence,
          thresholdUsed: tryThreshold,
        };
      }
    } catch (err) {
      lastError = err;
      const message = err?.message || '';
      if (message.includes('No face detected') || message.includes('Invalid selfie')) {
        throw err;
      }
    }
  }

  if (lastError && !lastResult) {
    throw lastError;
  }

  return {
    matched: false,
    matches: [],
    photoIds: [],
    searchedFaceConfidence: lastResult?.searchedFaceConfidence ?? null,
    thresholdUsed: thresholds[thresholds.length - 1],
  };
}
