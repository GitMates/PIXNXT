import { getFaceAvatarDisplayUrl, resolveMediaUrl } from './photoDisplayUrl';

/** Normalize search query for gallery photo AI search */
export function normalizePhotoSearchQuery(query) {
  return String(query ?? '').trim().toLowerCase();
}

/**
 * Rekognition / D1 labels may be plain strings (legacy Supabase indexer) or
 * objects `{ name, confidence, categories }` (Workers detectLabels). Always
 * resolve to a display/search name — never String(object) → "[object Object]".
 */
export function labelName(label) {
  if (label == null) return '';
  if (typeof label === 'string') return label.trim();
  if (typeof label === 'object') {
    const name = label.name ?? label.Name ?? label.label ?? label.Label;
    if (typeof name === 'string') return name.trim();
  }
  return '';
}

/**
 * Umbrella concepts. Only expand when the user types the key itself
 * ("food" → meal/dish/curry). Never expand a specific label like "tie"
 * out to the rest of its group — that made Library search match almost
 * every wedding photo.
 */
export const AI_SEARCH_CONCEPTS = {
  food: [
    'food', 'meal', 'dish', 'plate', 'cuisine', 'curry', 'rice', 'bread',
    'dinner', 'lunch', 'breakfast', 'brunch', 'snack', 'dessert', 'cake',
    'sweet', 'fruit', 'vegetable', 'salad', 'soup', 'noodle', 'pasta',
    'pizza', 'burger', 'sandwich', 'seafood', 'meat', 'chicken', 'beverage',
    'drink', 'coffee', 'tea', 'juice', 'buffet', 'banquet', 'catering',
    'eating', 'kitchen', 'cook', 'cooking', 'restaurant', 'momo', 'dosa',
    'biryani', 'thali',
  ],
  wedding: ['wedding', 'bride', 'groom', 'ceremony', 'reception', 'mandap', 'phera'],
  bride: ['bride', 'saree', 'sari', 'lehenga', 'veil'],
  groom: ['groom', 'sherwani', 'tuxedo'],
  baby: ['baby', 'infant', 'newborn', 'toddler'],
  family: ['family', 'group', 'gathering'],
  portrait: ['portrait'],
  nature: ['nature', 'outdoors', 'tree', 'plant', 'flower', 'garden', 'park', 'sky', 'mountain', 'beach', 'sea'],
  dance: ['dance', 'dancing'],
  decoration: ['decoration', 'decor', 'ornament'],
};

/** Tight aliases only — not whole concept groups. */
export const AI_SEARCH_SYNONYMS = {
  tie: ['necktie', 'bowtie', 'bow-tie'],
  necktie: ['tie', 'bowtie'],
  bowtie: ['tie', 'necktie', 'bow-tie'],
  saree: ['sari'],
  sari: ['saree'],
  photo: ['photograph'],
  photograph: ['photo'],
};

/** Singularize a token for matching ("foods" -> "food", "dishes" -> "dish"). */
export function singularizeSearchToken(token) {
  const t = String(token || '').toLowerCase();
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y';
  if (t.endsWith('es') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('s') && t.length > 3 && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

function addSynonyms(set, token) {
  const synonyms = AI_SEARCH_SYNONYMS[token];
  if (!synonyms) return;
  for (const term of synonyms) set.add(term);
}

/** Terms that should match a single query token (token + aliases + umbrella). */
export function termsForSearchToken(token) {
  const t = String(token || '').toLowerCase();
  if (!t) return [];
  const singular = singularizeSearchToken(t);
  const terms = new Set([t, singular]);
  addSynonyms(terms, t);
  addSynonyms(terms, singular);
  const group = AI_SEARCH_CONCEPTS[t] || AI_SEARCH_CONCEPTS[singular];
  if (group) {
    for (const term of group) terms.add(term);
  }
  return Array.from(terms);
}

/**
 * Whole-word match. "tie" hits "tie", "bow tie", "necktie" — not "parties",
 * "suit", or "wedding".
 */
export function textMatchesSearchTerm(haystack, term) {
  const text = String(haystack || '').toLowerCase();
  const t = String(term || '').toLowerCase();
  if (!text || !t) return false;
  if (text === t) return true;

  const parts = text.split(/[^a-z0-9]+/).filter(Boolean);
  for (const part of parts) {
    if (part === t) return true;
    const extra = part.length - t.length;
    if (extra >= 3 && extra <= 8 && part.endsWith(t)) return true;
  }
  return false;
}

/**
 * Expand a normalized query into matchable terms.
 * Umbrella keys ("food") expand to the group. Specific labels ("tie", "curry")
 * only add tight synonyms.
 */
export function expandAiSearchTerms(normalizedQuery) {
  const tokens = String(normalizedQuery || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const expanded = new Set();

  for (const token of tokens) {
    for (const term of termsForSearchToken(token)) expanded.add(term);
  }

  return { tokens, expanded: Array.from(expanded) };
}

/** Filter photos by taken/upload date range (YYYY-MM-DD). */
export function filterPhotosByDateRange(photos, range) {
  if (!range?.start) return photos;

  return (photos || []).filter((photo) => {
    const dateValue = photo.exif_taken_at || photo.created_at;
    if (!dateValue) return false;

    const iso = String(dateValue).slice(0, 10);
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;

    const start = new Date(range.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(range.end || range.start);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
  });
}

function photoMatchesTerms(photo, metadataByPhotoId, terms) {
  const filename = String(photo.filename || '').toLowerCase();
  const collectionName = String(photo.collection?.name || '').toLowerCase();
  const labels = (metadataByPhotoId?.[photo.id]?.labels || [])
    .map((l) => labelName(l).toLowerCase())
    .filter(Boolean);

  for (const term of terms) {
    if (!term) continue;
    if (textMatchesSearchTerm(filename, term)) return true;
    if (textMatchesSearchTerm(collectionName, term)) return true;
    if (labels.some((label) => textMatchesSearchTerm(label, term))) return true;
  }
  return false;
}

/** Filter photos by filename + Rekognition labels (with concept expansion) */
export function filterPhotosByAiSearch(photos, metadataByPhotoId, query) {
  const normalized = normalizePhotoSearchQuery(query);
  if (!normalized) return photos;

  const { tokens, expanded } = expandAiSearchTerms(normalized);
  const list = photos || [];

  // Single-token queries ("food", "tie"): match the token or its tight aliases.
  // "food" still expands to meal/dish/curry. "tie" does not expand to wedding.
  if (tokens.length <= 1) {
    return list.filter((photo) => photoMatchesTerms(photo, metadataByPhotoId, expanded));
  }

  // Multi-word queries ("red saree"): every token must match somewhere (AND).
  return list.filter((photo) =>
    tokens.every((token) =>
      photoMatchesTerms(photo, metadataByPhotoId, termsForSearchToken(token))
    )
  );
}

/** Filter photos that contain a specific Rekognition face id */
export function filterPhotosByFaceId(photos, metadataByPhotoId, faceId) {
  if (!faceId) return photos;
  return photos.filter((photo) => {
    const faces = metadataByPhotoId?.[photo.id]?.faces || [];
    return faces.some((f) => f.faceId === faceId);
  });
}

/** Filter photos to a specific set of ids (e.g. selfie match results) */
export function filterPhotosByIds(photos, photoIds) {
  if (!photoIds?.length) return photos;
  const idSet = new Set(photoIds);
  return photos.filter((photo) => idSet.has(photo.id));
}

/**
 * Restrict clustered people to those appearing in the given photos (e.g. active photoset).
 * Updates photoIds and count to only include photos in scope.
 */
export function filterPeopleForPhotos(people, photos) {
  if (!people?.length || !photos?.length) return [];

  const photoIdSet = new Set(
    photos.map((photo) => photo?.id).filter(Boolean).map(String)
  );

  return people
    .map((person) => {
      const scopedPhotoIds = (person.photoIds || []).filter((id) => photoIdSet.has(String(id)));
      if (!scopedPhotoIds.length) return null;
      return {
        ...person,
        photoIds: scopedPhotoIds,
        count: scopedPhotoIds.length,
      };
    })
    .filter(Boolean);
}

/**
 * Rebind people avatars onto displayable URLs from an already-loaded photo list
 * (public gallery / share). Fixes grey circles when by-ids picked RAW/HEIC or a
 * private/missing avatar photo, and when bbox no longer matches the image.
 */
export function rebindPeopleAvatarsFromPhotos(people, photos) {
  if (!people?.length) return people || [];
  if (!photos?.length) return people;

  const byId = new Map();
  for (const photo of photos) {
    if (photo?.id != null) byId.set(String(photo.id), photo);
  }

  return people.map((person) => {
    if (person.guestSelfieUrl || person.avatarSource === 'guest_selfie') {
      return person;
    }

    const tryPhoto = (photo, keepBbox) => {
      const url = getFaceAvatarDisplayUrl(photo);
      if (!url) return null;
      return {
        ...person,
        avatarPhotoId: photo.id,
        imageUrl: url,
        boundingBox: keepBbox ? person.boundingBox || null : null,
      };
    };

    const preferred = person.avatarPhotoId
      ? byId.get(String(person.avatarPhotoId))
      : null;
    if (preferred) {
      const rebound = tryPhoto(preferred, true);
      if (rebound) return rebound;
    }

    for (const id of person.photoIds || []) {
      const photo = byId.get(String(id));
      if (!photo) continue;
      const keepBbox = String(id) === String(person.avatarPhotoId);
      const rebound = tryPhoto(photo, keepBbox);
      if (rebound) return rebound;
    }

    // Absolute imageUrl already present — keep; otherwise leave for empty avatar.
    if (person.imageUrl) {
      const resolved = resolveMediaUrl(person.imageUrl);
      if (resolved) return { ...person, imageUrl: resolved };
    }
    return person;
  });
}

/** Filter photos that contain any face from a clustered person */
export function filterPhotosByPerson(photos, metadataByPhotoId, person) {
  const faceSet = new Set(person?.faceIds || []);
  const photoSet = new Set(person?.photoIds || []);
  // Entries with neither identity signal (e.g. a registered guest whose face
  // match is still pending) must render no photos — not the whole delivery.
  if (!faceSet.size && !photoSet.size) return [];
  return photos.filter((photo) => {
    if (photoSet.has(photo.id)) return true;
    if (!faceSet.size) return false;
    const faces = metadataByPhotoId?.[photo.id]?.faces || [];
    return faces.some((f) => faceSet.has(f.faceId));
  });
}

/** True when a person has no custom name yet. */
export function isPlaceholderPersonLabel(label) {
  const value = String(label || '').trim();
  return !value || value === 'Not named' || /^Person \d+$/i.test(value);
}

export function displayPersonLabel(label, fallback = 'Not named') {
  return isPlaceholderPersonLabel(label) ? fallback : String(label || fallback);
}

/** @deprecated Use clustered people from API instead */
export function buildPeopleFromMetadata(metadataRows, photos) {
  const photoById = new Map((photos || []).map((p) => [p.id, p]));
  const peopleMap = new Map();

  for (const row of metadataRows || []) {
    for (const face of row.faces || []) {
      if (!face?.faceId) continue;
      if (!peopleMap.has(face.faceId)) {
        peopleMap.set(face.faceId, {
          faceId: face.faceId,
          photoIds: [],
          coverUrl: null,
        });
      }
      const person = peopleMap.get(face.faceId);
      if (!person.photoIds.includes(row.photo_id)) {
        person.photoIds.push(row.photo_id);
      }
      if (!person.coverUrl) {
        const photo = photoById.get(row.photo_id);
        person.coverUrl = photo?.thumbnail_url || photo?.web_url || photo?.full_url || null;
      }
    }
  }

  return Array.from(peopleMap.values())
    .sort((a, b) => b.photoIds.length - a.photoIds.length)
    .map((person) => ({
      ...person,
      label: 'Not named',
      count: person.photoIds.length,
    }));
}

/** People whose clustered faces appear on this photograph. */
export function peopleInPhoto(photoId, people, metadataByPhotoId) {
  const faces = metadataByPhotoId?.[photoId]?.faces || [];
  const faceIds = new Set(faces.map((f) => f.faceId).filter(Boolean));
  if (!faceIds.size) return [];
  return (people || []).filter((person) =>
    (person.faceIds || []).some((id) => faceIds.has(id))
  );
}

/** Collect unique label suggestions for search chips */
export function collectLabelSuggestions(metadataRows, limit = 12) {
  const counts = new Map();
  for (const row of metadataRows || []) {
    for (const label of row.labels || []) {
      const key = labelName(label);
      if (!key) continue;
      // Count case-insensitively but keep the first-seen casing for the chip.
      const fold = key.toLowerCase();
      const prev = counts.get(fold);
      if (prev) prev.count += 1;
      else counts.set(fold, { label: key, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.label);
}
