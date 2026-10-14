import {
  sortDashboardPhotos,
  type DashboardPhotoSort,
} from "@/utils/sortDashboardPhotos";

const DEFAULT_SORT: DashboardPhotoSort = "custom";

const VALID_SORTS = new Set<DashboardPhotoSort>([
  "upload-new-old",
  "upload-old-new",
  "taken-new-old",
  "taken-old-new",
  "name-az",
  "name-za",
  "random",
  "custom",
  "starred-first",
  "starred-first-asc",
  "camera-az",
  "camera-za",
]);

/**
 * Maps `deliveries.gallery_photo_sort`, dashboard props, or legacy strings
 * to a canonical sort key used by the public gallery and preview.
 */
export function normalizeGalleryPhotoSort(
  raw: string | null | undefined,
): DashboardPhotoSort {
  if (raw == null || String(raw).trim() === "") return DEFAULT_SORT;
  const s = String(raw).trim().toLowerCase().replace(/_/g, "-");

  if (VALID_SORTS.has(s as DashboardPhotoSort)) return s as DashboardPhotoSort;

  const aliases: Record<string, DashboardPhotoSort> = {
    "upload-desc": "upload-new-old",
    "upload-asc": "upload-old-new",
    "created-desc": "upload-new-old",
    "created-asc": "upload-old-new",
    "taken-desc": "taken-new-old",
    "taken-asc": "taken-old-new",
    "exif-desc": "taken-new-old",
    "exif-asc": "taken-old-new",
    "filename-asc": "name-az",
    "filename-desc": "name-za",
    "name-asc": "name-az",
    "name-desc": "name-za",
  };
  if (aliases[s]) return aliases[s];

  return DEFAULT_SORT;
}

/** Sort a photo list for MasonryGrid / lightbox (immutable). */
export function sortPhotosForGallery<T extends Record<string, unknown>>(
  photos: readonly T[],
  sortKey: DashboardPhotoSort,
): T[] {
  return sortDashboardPhotos(photos as any[], sortKey) as T[];
}

/**
 * Put photos in an explicit id sequence (Highlights grab order).
 * Ids missing from the list keep their relative order after the saved ones.
 */
export function orderPhotosByIds<T extends { id?: string | number | null }>(
  photos: readonly T[],
  orderedIds: readonly (string | number)[] | null | undefined,
): T[] {
  if (!orderedIds?.length) return [...photos];
  const rank = new Map(orderedIds.map((id, index) => [String(id), index]));
  return [...photos].sort((a, b) => {
    const ra = rank.has(String(a.id)) ? rank.get(String(a.id))! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(String(b.id)) ? rank.get(String(b.id))! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}
