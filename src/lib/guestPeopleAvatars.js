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
  const attachedGuestIds = new Set();
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

    attachedGuestIds.add(guest.id);
    const idx = nextPeople.findIndex((p) => p.id === cluster.id);
    if (idx < 0) continue;

    if (guestName && isPlaceholderLabel(nextPeople[idx].label)) {
      nextPeople[idx].label = guestName;
    }
    nextPeople[idx] = applyGuestSelfieToPerson(nextPeople[idx], guest);
  }

  // Guests whose selfie never matched a face cluster (matching failed or has
  // not run yet) still need to appear in Faces with their name — otherwise a
  // registered guest is invisible in the People strip.
  for (const guest of guestList) {
    if (attachedGuestIds.has(guest.id)) continue;
    const selfieUrl = String(guest?.selfie_url || '').trim();
    if (!selfieUrl) continue;
    const guestName = String(guest.name || '').trim() || 'Guest';
    const rows = matchesByGuest.get(guest.id) || [];
    const photoIds = [...new Set(rows.map((r) => r.photo_id).filter(Boolean))];
    const faceIds = [...new Set(rows.map((r) => r.face_id).filter(Boolean))];
    nextPeople.push({
      id: `guest-${guest.id}`,
      faceIds,
      photoIds,
      label: guestName,
      count: photoIds.length,
      imageUrl: selfieUrl,
      guestSelfieUrl: selfieUrl,
      boundingBox: null,
      avatarPhotoId: null,
      avatarSource: 'guest_selfie',
      isHidden: false,
      isGuestEntry: true,
    });
  }

  return nextPeople;
}

export async function loadGuestSelfieAvatarContext(_db, collectionId) {
  void _db;
  if (!collectionId) return { guests: [], matchRows: [] };

  const { apiFetch, apiBase } = await import('./api/client');
  const ctx = await apiFetch(`/v1/guest/selfie-context?collectionId=${encodeURIComponent(collectionId)}`).catch(() => null);
  const guests = (ctx?.guests || []).map((g) => ({
    ...g,
    selfie_url: g.selfie_url || (g.selfie_storage_path ? `${apiBase()}/v1/r2/media?path=${encodeURIComponent(g.selfie_storage_path)}` : null),
  }));
  return { guests, matchRows: ctx?.matchRows || [] };
}

export async function applyGuestSelfieAvatarsForCollection(_db, collectionId, people) {
  void _db;
  if (!collectionId || !people?.length) return people || [];

  try {
    const { guests, matchRows } = await loadGuestSelfieAvatarContext(null, collectionId);
    return applyGuestSelfieAvatarsToPeople(people, guests, matchRows);
  } catch (err) {
    console.warn('[guestPeopleAvatars] load failed:', err?.message || err);
    return people;
  }
}

export function hasGuestSelfieAvatar(person) {
  return person?.avatarSource === 'guest_selfie' || Boolean(person?.guestSelfieUrl);
}
