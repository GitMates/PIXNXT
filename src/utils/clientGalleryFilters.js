/** @typedef {{ start: string, end: string }} DateRangeFilter ISO date strings YYYY-MM-DD */

/** @typedef {{
 *   status: string | null,
 *   categoryTag: string | null,
 *   eventDateRange: DateRangeFilter | null,
 *   expiryDateRange: DateRangeFilter | null,
 *   starred: boolean | null,
 * }} ClientGalleryFilters */

export const EMPTY_CLIENT_GALLERY_FILTERS = {
  status: null,
  categoryTag: null,
  eventDateRange: null,
  expiryDateRange: null,
  starred: null,
};

export const COLLECTION_STATUS_FILTER_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Hidden' },
  { value: 'draft', label: 'Draft' },
];

function toIsoDate(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseIsoDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function hasActiveClientGalleryFilters(filters) {
  if (!filters) return false;
  return (
    filters.status != null ||
    Boolean(filters.categoryTag) ||
    Boolean(filters.eventDateRange?.start) ||
    Boolean(filters.expiryDateRange?.start) ||
    filters.starred != null
  );
}

export function getCollectionCategoryTags(collection) {
  const raw = collection?.category_tags ?? collection?.tags;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function collectCategoryTagsFromCollections(collections) {
  const set = new Set();
  for (const c of collections || []) {
    for (const tag of getCollectionCategoryTags(c)) {
      set.add(tag);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function collectionDateInRange(isoDate, range) {
  if (!range?.start) return true;
  if (!isoDate) return false;
  const d = startOfDay(parseIsoDate(String(isoDate).slice(0, 10)));
  const start = startOfDay(parseIsoDate(range.start));
  const end = range.end ? endOfDay(parseIsoDate(range.end)) : endOfDay(start);
  return d >= start && d <= end;
}

export function collectionMatchesClientGalleryFilters(collection, filters) {
  if (!filters || !hasActiveClientGalleryFilters(filters)) return true;

  if (filters.status != null && collection.status !== filters.status) {
    return false;
  }

  if (filters.starred === true && !collection.is_starred) return false;
  if (filters.starred === false && collection.is_starred) return false;

  if (filters.categoryTag) {
    const tags = getCollectionCategoryTags(collection);
    if (!tags.some((t) => t.toLowerCase() === filters.categoryTag.toLowerCase())) {
      return false;
    }
  }

  if (
    filters.eventDateRange?.start &&
    !collectionDateInRange(collection.event_date, filters.eventDateRange)
  ) {
    return false;
  }

  if (
    filters.expiryDateRange?.start &&
    !collectionDateInRange(collection.auto_expiry, filters.expiryDateRange)
  ) {
    return false;
  }

  return true;
}

export function folderMatchesClientGalleryFilters(folder, filters, allCollections) {
  if (!filters || !hasActiveClientGalleryFilters(filters)) return true;

  const folderId = folder?.id;
  const children = (allCollections || []).filter((c) => c.folder_id === folderId);

  if (children.some((c) => collectionMatchesClientGalleryFilters(c, filters))) {
    return true;
  }

  /** Empty folder — only event date / category tag apply at folder level */
  const folderScoped = {
    ...filters,
    status: null,
    starred: null,
    expiryDateRange: null,
  };
  if (!hasActiveClientGalleryFilters(folderScoped)) return false;
  return collectionMatchesClientGalleryFilters(folder, folderScoped);
}

export function filterCollectionsByClientGalleryFilters(collections, filters) {
  if (!filters || !hasActiveClientGalleryFilters(filters)) return collections;
  return collections.filter((c) => collectionMatchesClientGalleryFilters(c, filters));
}

export function formatFilterDateRangeLabel(range) {
  if (!range?.start) return '';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const start = parseIsoDate(range.start);
  const startLabel = start.toLocaleDateString('en-US', opts);
  if (!range.end || range.end === range.start) return startLabel;
  const end = parseIsoDate(range.end);
  return `${startLabel} – ${end.toLocaleDateString('en-US', opts)}`;
}

export function getStatusFilterLabel(status) {
  return COLLECTION_STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label || status;
}

/** @param {'last-week'|'last-2-weeks'|'last-month'|'last-6-months'|'last-year'|'next-week'|'next-2-weeks'|'next-month'|'next-6-months'|'next-year'} preset */
export function getQuickDateRange(preset) {
  const today = startOfDay(new Date());
  const toIsoFromDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const toRange = (start, end) => ({
    start: toIsoFromDate(start),
    end: toIsoFromDate(end),
  });

  switch (preset) {
    case 'last-week':
      return toRange(addDays(-7), today);
    case 'last-2-weeks':
      return toRange(addDays(-14), today);
    case 'last-month':
      return toRange(addDays(-30), today);
    case 'last-6-months':
      return toRange(addDays(-183), today);
    case 'last-year':
      return toRange(addDays(-365), today);
    case 'next-week':
      return toRange(today, addDays(7));
    case 'next-2-weeks':
      return toRange(today, addDays(14));
    case 'next-month':
      return toRange(today, addDays(30));
    case 'next-6-months':
      return toRange(today, addDays(183));
    case 'next-year':
      return toRange(today, addDays(365));
    default:
      return null;
  }
}

export function toIsoFromParts(year, monthIndex, day) {
  return toIsoDate(year, monthIndex, day);
}

export function isDayInRange(year, monthIndex, day, range) {
  if (!range?.start) return false;
  const iso = toIsoDate(year, monthIndex, day);
  const d = startOfDay(parseIsoDate(iso));
  const start = startOfDay(parseIsoDate(range.start));
  const end = range.end ? endOfDay(parseIsoDate(range.end)) : endOfDay(start);
  return d >= start && d <= end;
}

export function isRangeEndpoint(year, monthIndex, day, range) {
  if (!range?.start) return false;
  const iso = toIsoDate(year, monthIndex, day);
  return iso === range.start || iso === range.end;
}
