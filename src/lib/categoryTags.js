/** Normalize category_tags from DB (array) or legacy comma-separated string. */
export function normalizeCategoryTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => normalizeCategoryTag(String(t)))
      .filter(Boolean);
  }
  return normalizeCategoryTagsFromString(String(raw));
}

export function normalizeCategoryTag(value) {
  const tag = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!tag) return '';
  return tag.length > 48 ? tag.slice(0, 48) : tag;
}

export function normalizeCategoryTagsFromString(text) {
  const seen = new Set();
  const out = [];
  for (const part of String(text ?? '').split(/[,;]+/)) {
    const tag = normalizeCategoryTag(part);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Read tags saved on the collection row only (no auto-import from other fields). */
export function categoryTagsFromCollection(collection) {
  return normalizeCategoryTags(collection?.category_tags);
}

export function categoryTagsToDb(tags) {
  return normalizeCategoryTags(tags);
}
