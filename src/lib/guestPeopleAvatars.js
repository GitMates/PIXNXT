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

export function findBestClusterForGuest(people, faceIds, photoIds) {
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

/** Apply a guest QR registration selfie as the cluster avatar (highest priority). */
export function applyGuestSelfieToPerson(person, guest) {
  const selfieUrl = String(guest?.selfie_url || '').trim();
  if (!person || !selfieUrl) return person;

  return {
    ...person,
    guestSelfieUrl: selfieUrl,
    imageUrl: selfieUrl,
    boundingBox: null,
    avatarSource: 'guest_selfie',
    avatarPhotoId: null,
  };
}

/**
 * Prefer guest registration selfies over Rekognition-detected face crops in People.
 */
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
      cluster = findBestClusterForGuest(nextPeople, faceIds, photoIds);
    }

    if (!cluster && guestName) {
      cluster = nextPeople.find((p) => String(p.label || '').trim() === guestName);
    }

    if (!cluster) continue;

    const idx = nextPeople.findIndex((p) => p.id === cluster.id);
    if (idx < 0) continue;

    if (guestName && isPlaceholderLabel(nextPeople[idx].label)) {
      nextPeople[idx].label = guestName;
    }
    nextPeople[idx] = applyGuestSelfieToPerson(nextPeople[idx], guest);
  }

  return nextPeople;
}

export async function loadGuestSelfieAvatarContext(supabase, collectionId) {
  if (!collectionId) return { guests: [], matchRows: [] };

  const { data: events, error: eventsError } = await supabase
    .from('guest_delivery_events')
    .select('id')
    .eq('collection_id', collectionId);

  if (eventsError) throw eventsError;
  if (!events?.length) return { guests: [], matchRows: [] };

  const eventIds = events.map((e) => e.id);
  const { data: guests, error: guestsError } = await supabase
    .from('event_guests')
    .select('id, name, selfie_url')
    .in('event_id', eventIds)
    .not('selfie_url', 'is', null)
    .order('registered_at', { ascending: true });

  if (guestsError) throw guestsError;
  if (!guests?.length) return { guests: [], matchRows: [] };

  const { data: matchRows, error: matchError } = await supabase
    .from('event_guest_matches')
    .select('guest_id, photo_id, face_id')
    .in(
      'guest_id',
      guests.map((g) => g.id),
    );

  if (matchError) throw matchError;

  return { guests, matchRows: matchRows || [] };
}

export async function applyGuestSelfieAvatarsForCollection(supabase, collectionId, people) {
  if (!collectionId || !people?.length) return people || [];

  try {
    const { guests, matchRows } = await loadGuestSelfieAvatarContext(supabase, collectionId);
    return applyGuestSelfieAvatarsToPeople(people, guests, matchRows);
  } catch (err) {
    console.warn('[guestPeopleAvatars] load failed:', err?.message || err);
    return people;
  }
}

export function hasGuestSelfieAvatar(person) {
  return person?.avatarSource === 'guest_selfie' || Boolean(person?.guestSelfieUrl);
}
