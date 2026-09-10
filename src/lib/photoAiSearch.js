/** Normalize search query for gallery photo AI search */
export function normalizePhotoSearchQuery(query) {
  return String(query ?? '').trim().toLowerCase();
}

/**
 * Concept groups for AI search. AWS Rekognition rarely returns the generic
 * word a user types (e.g. "food") — it returns specific labels like "Meal",
 * "Dish", "Plate", "Curry". Expand the query so common concepts match.
 * Keys and values are lowercase; keep this list in sync with what
 * Rekognition typically returns (DetectLabels, MinConfidence 70).
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
  bride: ['bride', 'wedding', 'saree', 'sari', 'lehenga', 'veil'],
  groom: ['groom', 'wedding', 'sherwani', 'suit', 'tie'],
  baby: ['baby', 'infant', 'toddler', 'child', 'kid', 'newborn'],
  family: ['family', 'group', 'people', 'person', 'crowd', 'gathering'],
  portrait: ['portrait', 'person', 'face', 'head'],
  nature: ['nature', 'outdoors', 'tree', 'plant', 'flower', 'garden', 'park', 'sky', 'mountain', 'beach', 'sea', 'water'],
  dance: ['dance', 'dancing', 'party', 'celebration', 'music'],
  decoration: ['decoration', 'decor', 'flower', 'stage', 'lighting', 'ornament'],
};

/** Reverse index: label -> concept keys containing it. Built lazily. */
let labelToConceptsCache = null;
function getLabelToConcepts() {
  if (labelToConceptsCache) return labelToConceptsCache;
  labelToConceptsCache = new Map();
  for (const [concept, terms] of Object.entries(AI_SEARCH_CONCEPTS)) {
    for (const term of terms) {
      const key = String(term).toLowerCase();
      if (!labelToConceptsCache.has(key)) labelToConceptsCache.set(key, new Set());
      labelToConceptsCache.get(key).add(concept);
    }
  }
  return labelToConceptsCache;
}

/** Singularize a token for matching ("foods" -> "food", "dishes" -> "dish"). */
export function singularizeSearchToken(token) {
  const t = String(token || '').toLowerCase();
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y';
  if (t.endsWith('es') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('s') && t.length > 3 && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

/**
 * Expand a normalized query into matchable terms.
 * - Direct concept hit ("food") -> all concept terms.
 * - Label belonging to a concept ("curry") -> sibling terms + concept key,
 *   so searching "curry" also finds "Meal"/"Food" photos and vice versa.
 */
export function expandAiSearchTerms(normalizedQuery) {
  const tokens = String(normalizedQuery || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const expanded = new Set();
  const labelToConcepts = getLabelToConcepts();

  for (const token of tokens) {
    const singular = singularizeSearchToken(token);
    expanded.add(token);
    expanded.add(singular);

    // Token is a concept key ("food") -> add every term in the group.
    const group = AI_SEARCH_CONCEPTS[token] || AI_SEARCH_CONCEPTS[singular];
    if (group) {
      for (const term of group) expanded.add(term);
    }

    // Token is a member label ("curry", "meal") -> add concept key + siblings.
    const concepts = labelToConcepts.get(token) || labelToConcepts.get(singular);
    if (concepts) {
      for (const concept of concepts) {
        expanded.add(concept);
        for (const term of AI_SEARCH_CONCEPTS[concept] || []) expanded.add(term);
      }
    }
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

/** Filter photos by filename + Rekognition labels (with concept expansion) */
export function filterPhotosByAiSearch(photos, metadataByPhotoId, query) {
  const normalized = normalizePhotoSearchQuery(query);
  if (!normalized) return photos;

  const { tokens } = expandAiSearchTerms(normalized);

  const photoMatchesToken = (photo, token) => {
    const singular = singularizeSearchToken(token);
    const variants = new Set([token, singular]);
    const labelToConcepts = getLabelToConcepts();
    const concepts = labelToConcepts.get(token) || labelToConcepts.get(singular);
    if (concepts) {
      for (const concept of concepts) {
        variants.add(concept);
        for (const term of AI_SEARCH_CONCEPTS[concept] || []) variants.add(term);
      }
    }
    const group = AI_SEARCH_CONCEPTS[token] || AI_SEARCH_CONCEPTS[singular];
    if (group) for (const term of group) variants.add(term);

    const filename = String(photo.filename || '').toLowerCase();
    const collectionName = String(photo.collection?.name || '').toLowerCase();
    const labels = (metadataByPhotoId?.[photo.id]?.labels || []).map((l) =>
      String(l).toLowerCase()
    );

    for (const variant of variants) {
      if (!variant) continue;
      if (filename.includes(variant)) return true;
      if (collectionName.includes(variant)) return true;
      if (labels.some((label) => label.includes(variant) || variant.includes(label))) return true;
    }
    return false;
  };

  // Single-token queries (the common case: "food", "person"): match if the
  // token or any of its concept synonyms hits. This unions exact + synonym
  // matches so "food" finds "Food", "Meal", "Dish" and "Curry" photos.
  if (tokens.length <= 1) {
    return (photos || []).filter((photo) => photoMatchesToken(photo, tokens[0] || normalized));
  }

  // Multi-word queries ("red saree"): every token must match somewhere (AND).
  return (photos || []).filter((photo) => tokens.every((token) => photoMatchesToken(photo, token)));
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

/** Filter photos that contain any face from a clustered person */
export function filterPhotosByPerson(photos, metadataByPhotoId, person) {
  if (!person?.faceIds?.length) return photos;
  const faceSet = new Set(person.faceIds);
  return photos.filter((photo) => {
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
      const key = String(label);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}
