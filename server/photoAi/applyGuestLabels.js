import { matchGuestSelfie } from '../guestDelivery/matchGuestSelfie.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const DEFAULT_LABEL = 'Not named';

function isPlaceholderLabel(label) {
  const value = String(label || '').trim();
  if (!value) return true;
  if (value === DEFAULT_LABEL) return true;
  if (/^Person \d+$/i.test(value)) return true;
  return false;
}

function overlapCount(a, b) {
  const set = new Set(b || []);
  return (a || []).filter((id) => set.has(id)).length;
}

function findBestCluster(people, faceIds, photoIds) {
  let best = null;
  let bestScore = 0;

  for (const person of people || []) {
    const faceOverlap = overlapCount(person.faceIds, faceIds);
    const photoOverlap = overlapCount(person.photoIds, photoIds);
    const score = faceOverlap * 10 + photoOverlap;
    if (score > bestScore) {
      bestScore = score;
      best = person;
    }
  }

  return bestScore > 0 ? best : null;
}

function applyGuestSelfieToCluster(cluster, guest) {
  const selfieUrl = String(guest?.selfie_url || '').trim();
  if (!cluster || !selfieUrl) return;
  cluster.guestSelfieUrl = selfieUrl;
  cluster.imageUrl = selfieUrl;
  cluster.boundingBox = null;
  cluster.avatarSource = 'guest_selfie';
  cluster.avatarPhotoId = null;
}

export function applyGuestSelfieAvatarsToPeople(people, guests, matchRows) {
  if (!people?.length) return people || [];

  const guestList = (guests || []).filter((g) => String(g?.selfie_url || '').trim());
  if (!guestList.length) return people;

  const nextPeople = people.map((p) => ({ ...p }));
  const matchesByGuest = new Map();
  for (const row of matchRows || []) {
    if (!matchesByGuest.has(row.guest_id)) matchesByGuest.set(row.guest_id, []);
    matchesByGuest.get(row.guest_id).push(row);
  }

  for (const guest of guestList) {
    const guestName = String(guest.name || '').trim();
    const rows = matchesByGuest.get(guest.id) || [];
    let cluster = null;

    if (rows.length) {
      const photoIds = rows.map((r) => r.photo_id).filter(Boolean);
      const faceIds = rows.map((r) => r.face_id).filter(Boolean);
      cluster = findBestCluster(nextPeople, faceIds, photoIds);
    }

    if (!cluster && guestName) {
      cluster = nextPeople.find((p) => String(p.label || '').trim() === guestName);
    }

    if (!cluster) continue;

    if (guestName && isPlaceholderLabel(cluster.label)) {
      cluster.label = guestName;
    }
    applyGuestSelfieToCluster(cluster, guest);
  }

  return nextPeople;
}

export async function applyGuestSelfieAvatarsForCollection(supabase, collectionId, people) {
  if (!collectionId || !people?.length) return people || [];

  try {
    const { guests } = await loadGuestDeliveryGuestsForCollection(supabase, collectionId);
    if (!guests.length) return people;
    const matchRows = await loadStoredGuestMatches(supabase, guests.map((g) => g.id));
    return applyGuestSelfieAvatarsToPeople(people, guests, matchRows);
  } catch (err) {
    console.warn('[applyGuestLabels] guest selfie avatars skipped:', err?.message || err);
    return people;
  }
}

async function loadStoredGuestMatches(supabase, guestIds) {
  if (!guestIds.length) return [];
  const { data, error } = await supabase
    .from('event_guest_matches')
    .select('guest_id, photo_id, face_id')
    .in('guest_id', guestIds);
  if (error) {
    console.warn('[applyGuestLabels] stored matches load failed:', error.message);
    return [];
  }
  return data || [];
}

export async function applyGuestLabelsFromStoredMatches(supabase, collectionId, people) {
  if (!collectionId || !people?.length) return people || [];

  const { guests } = await loadGuestDeliveryGuestsForCollection(supabase, collectionId);
  if (!guests.length) return people;

  const matchRows = await loadStoredGuestMatches(supabase, guests.map((g) => g.id));
  return applyGuestSelfieAvatarsToPeople(people, guests, matchRows);
}

export async function loadGuestDeliveryGuestsForCollection(supabase, collectionId) {
  if (!collectionId) return { events: [], guests: [] };

  const { data: events, error: eventsError } = await supabase
    .from('guest_delivery_events')
    .select('id, collection_id, match_threshold, status')
    .eq('collection_id', collectionId);

  if (eventsError) throw eventsError;
  if (!events?.length) return { events: [], guests: [] };

  const eventIds = events.map((e) => e.id);
  const { data: guests, error: guestsError } = await supabase
    .from('event_guests')
    .select(
      'id, event_id, name, email, phone, access_token, selfie_url, selfie_storage_path, delivery_status, matched_photo_count'
    )
    .in('event_id', eventIds)
    .order('registered_at', { ascending: true });

  if (guestsError) throw guestsError;

  const withSelfie = (guests || []).filter((g) => g.selfie_url || g.selfie_storage_path);
  return { events, guests: withSelfie };
}

async function persistGuestMatchResult(supabase, eventId, guest, matchResult) {
  const db = getSupabaseAdmin() || supabase;
  const now = new Date().toISOString();
  const matchedCount = matchResult.photoIds?.length || 0;
  const deliveryStatus = matchedCount > 0 ? 'matched' : 'no_match';

  const { error: deleteError } = await db.from('event_guest_matches').delete().eq('guest_id', guest.id);
  if (deleteError) throw deleteError;

  if (matchResult.matches?.length) {
    const rows = matchResult.matches.map((m) => ({
      event_id: eventId,
      guest_id: guest.id,
      photo_id: m.photoId,
      face_id: m.faceId,
      similarity: m.similarity,
    }));
    const { error: insertError } = await db
      .from('event_guest_matches')
      .upsert(rows, { onConflict: 'guest_id,photo_id' });
    if (insertError) throw insertError;
  }

  const { error: guestError } = await db
    .from('event_guests')
    .update({
      delivery_status: deliveryStatus,
      matched_photo_count: matchedCount,
      updated_at: now,
    })
    .eq('id', guest.id);

  if (guestError) throw guestError;
}

function applyGuestNameToCluster(nextPeople, guest, matchResult, claimedClusterIds) {
  if (!matchResult?.matched) return;

  const guestName = String(guest?.name || '').trim();
  if (!guestName) return;

  const cluster = findBestCluster(
    nextPeople,
    matchResult.matches?.map((m) => m.faceId),
    matchResult.photoIds
  );

  if (!cluster) return;

  if (claimedClusterIds.has(cluster.id) && !isPlaceholderLabel(cluster.label)) {
    return;
  }

  cluster.label = guestName;
  applyGuestSelfieToCluster(cluster, guest);
  claimedClusterIds.add(cluster.id);
}

/**
 * Match registered guests to face clusters and apply guest names to People labels.
 */
export async function applyGuestLabelsToPeople(
  supabase,
  collectionId,
  people,
  { persist = true, syncGuestMatches = true } = {}
) {
  if (!collectionId || !people?.length) return people || [];

  const { events, guests } = await loadGuestDeliveryGuestsForCollection(supabase, collectionId);
  if (!guests.length) return people;

  const eventById = new Map(events.map((e) => [e.id, e]));
  let nextPeople = await applyGuestLabelsFromStoredMatches(supabase, collectionId, people);
  const claimedClusterIds = new Set(
    nextPeople.filter((p) => !isPlaceholderLabel(p.label)).map((p) => p.id)
  );

  for (const guest of guests) {
    const event = eventById.get(guest.event_id);
    if (!event) continue;

    const guestName = String(guest.name || '').trim();
    if (!guestName) continue;

    const alreadyNamed = nextPeople.some((p) => p.label === guestName);
    if (alreadyNamed && Number(guest.matched_photo_count) > 0) continue;

    const threshold = Math.min(Math.max(Number(event.match_threshold) || 85, 70), 99);

    try {
      const matchResult = await matchGuestSelfie({
        eventId: guest.event_id,
        collectionId,
        guest,
        threshold,
      });

      applyGuestNameToCluster(nextPeople, guest, matchResult, claimedClusterIds);

      if (syncGuestMatches) {
        try {
          await persistGuestMatchResult(supabase, guest.event_id, guest, matchResult);
        } catch (persistErr) {
          console.warn(
            '[applyGuestLabels] guest match persist failed:',
            guest.id,
            persistErr?.message || persistErr
          );
        }
      }
    } catch (err) {
      console.warn('[applyGuestLabels] guest match failed:', guest.id, err?.message || err);
    }
  }

  if (!persist) return nextPeople;

  const labelDb = getSupabaseAdmin() || supabase;
  const now = new Date().toISOString();
  for (const person of nextPeople) {
    if (isPlaceholderLabel(person.label)) continue;
    const { error } = await labelDb
      .from('photo_ai_people')
      .update({ label: person.label, updated_at: now })
      .eq('collection_id', collectionId)
      .eq('cluster_key', person.id);
    if (error) {
      console.warn('[applyGuestLabels] label persist failed:', person.id, error.message);
    }
  }

  return nextPeople;
}

/**
 * Match a single guest against collection photos, persist matches, and refresh People labels.
 */
export async function matchGuestToCollectionPhotos(supabase, collectionId, eventId, guest, options = {}) {
  if (!collectionId || !eventId || !guest?.id) {
    throw new Error('collectionId, eventId, and guest are required.');
  }

  const threshold = Math.min(Math.max(Number(options.threshold) || 85, 70), 99);
  const matchResult = await matchGuestSelfie({
    eventId,
    collectionId,
    guest,
    threshold,
  });

  await persistGuestMatchResult(supabase, eventId, guest, matchResult);

  const matchedCount = matchResult.photoIds?.length || 0;

  const { data: updatedGuest, error: guestError } = await supabase
    .from('event_guests')
    .select('id, event_id, name, matched_photo_count, delivery_status')
    .eq('id', guest.id)
    .single();

  if (guestError) throw guestError;

  let people = [];
  if (matchedCount > 0) {
    const { data: cachedRows, error: cachedError } = await supabase
      .from('photo_ai_people')
      .select('cluster_key, face_ids, photo_ids, label')
      .eq('collection_id', collectionId);

    if (!cachedError && cachedRows?.length) {
      const mapped = cachedRows.map((row) => ({
        id: row.cluster_key,
        faceIds: row.face_ids || [],
        photoIds: row.photo_ids || [],
        label: row.label,
      }));
      people = await applyGuestLabelsToPeople(supabase, collectionId, mapped, {
        persist: true,
        syncGuestMatches: false,
      });
    }
  }

  return {
    guest: updatedGuest,
    matched: matchedCount > 0,
    matchedPhotoCount: matchedCount,
    matchResult,
    people,
  };
}
