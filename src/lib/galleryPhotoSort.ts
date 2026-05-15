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
  "custom"
]);

/**
 * Maps `collections.gallery_photo_sort`, dashboard props, or legacy strings
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
