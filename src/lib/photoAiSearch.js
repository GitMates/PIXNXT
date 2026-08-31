/** Normalize search query for gallery photo AI search */
export function normalizePhotoSearchQuery(query) {
  return String(query ?? '').trim().toLowerCase();
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

/** Filter photos by filename + Rekognition labels */
export function filterPhotosByAiSearch(photos, metadataByPhotoId, query) {
  const normalized = normalizePhotoSearchQuery(query);
  if (!normalized) return photos;

  return photos.filter((photo) => {
    const filename = String(photo.filename || '').toLowerCase();
    if (filename.includes(normalized)) return true;

    const collectionName = String(photo.collection?.name || '').toLowerCase();
    if (collectionName.includes(normalized)) return true;

    const meta = metadataByPhotoId?.[photo.id];
    const labels = meta?.labels || [];
    return labels.some((label) => String(label).toLowerCase().includes(normalized));
  });
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
