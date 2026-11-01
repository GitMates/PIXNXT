import type { Photo } from "@/types/collection.types";

export type DashboardPhotoSort =
  | "upload-new-old"
  | "upload-old-new"
  | "taken-new-old"
  | "taken-old-new"
  | "name-az"
  | "name-za"
  | "random"
  | "custom"
  | "starred-first"
  | "starred-first-asc"
  | "camera-az"
  | "camera-za";

export const DASHBOARD_PHOTO_SORT_OPTIONS: {
  value: DashboardPhotoSort;
  label: string;
}[] = [
  { value: "upload-new-old", label: "Uploaded: New → Old" },
  { value: "upload-old-new", label: "Uploaded: Old → New" },
  { value: "taken-new-old", label: "Date Taken: New → Old" },
  { value: "taken-old-new", label: "Date Taken: Old → New" },
  { value: "name-az", label: "Name: A-Z" },
  { value: "name-za", label: "Name: Z-A" },
  { value: "random", label: "Random" },
  { value: "custom", label: "Custom" },
];

function parseSafeDate(raw: unknown): number {
  if (!raw) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? 0 : raw.getTime();
  const str = String(raw).trim();
  if (!str) return 0;
  // Handle EXIF format: "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SSZ"
  const exifMatch = str.match(/^(\d{4}):(\d{2}):(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (exifMatch) {
    const isoStr = `${exifMatch[1]}-${exifMatch[2]}-${exifMatch[3]}T${exifMatch[4]}:${exifMatch[5]}:${exifMatch[6]}Z`;
    const t = new Date(isoStr).getTime();
    if (Number.isFinite(t)) return t;
  }
  const t = new Date(str).getTime();
  if (Number.isFinite(t)) return t;
  // Try replacing space with 'T' for SQLite "YYYY-MM-DD HH:MM:SS"
  const withT = new Date(str.replace(" ", "T") + "Z").getTime();
  if (Number.isFinite(withT)) return withT;
  return 0;
}

function takenDate(p: Photo): number {
  const raw = p.exif_taken_at || (p as { exifTakenAt?: unknown }).exifTakenAt || p.created_at || (p as { createdAt?: unknown }).createdAt;
  return parseSafeDate(raw);
}

function uploadDate(p: Photo): number {
  const raw = p.created_at || (p as { createdAt?: unknown }).createdAt;
  return parseSafeDate(raw);
}

function photoFilename(p: Photo): string {
  return String(p.filename || (p as { name?: unknown }).name || "").trim();
}

/** Fisher–Yates shuffle (mutates copy only). */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function cameraName(p: Photo): string {
  return (p.exif_camera || p.exifCamera || (p as { camera?: string }).camera || "").trim().toLowerCase();
}

function photoPosition(p: Photo): number {
  const raw = (p as { position?: unknown; sort_order?: unknown; sortOrder?: unknown }).position
    ?? (p as { sort_order?: unknown }).sort_order
    ?? (p as { sortOrder?: unknown }).sortOrder;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function starredRank(p: Photo): number {
  const val = p.is_starred as unknown;
  const alt = (p as { isStarred?: unknown }).isStarred;
  return val === true || val === 1 || val === "1" || alt === true || alt === 1 || alt === "1" ? 1 : 0;
}

export function sortDashboardPhotos(
  photos: Photo[],
  sort: DashboardPhotoSort,
): Photo[] {
  const sorted = [...photos];
  switch (sort) {
    case "upload-new-old":
      sorted.sort((a, b) => uploadDate(b) - uploadDate(a) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "upload-old-new":
      sorted.sort((a, b) => uploadDate(a) - uploadDate(b) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "taken-new-old":
      sorted.sort((a, b) => takenDate(b) - takenDate(a) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "taken-old-new":
      sorted.sort((a, b) => takenDate(a) - takenDate(b) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "name-az":
      sorted.sort((a, b) =>
        photoFilename(a).localeCompare(photoFilename(b), undefined, {
          numeric: true,
          sensitivity: "base",
        }) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "name-za":
      sorted.sort((a, b) =>
        photoFilename(b).localeCompare(photoFilename(a), undefined, {
          numeric: true,
          sensitivity: "base",
        }) || photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "random":
      shuffleInPlace(sorted);
      break;
    case "starred-first":
      sorted.sort(
        (a, b) =>
          starredRank(b) - starredRank(a) ||
          takenDate(b) - takenDate(a) ||
          photoPosition(a) - photoPosition(b) ||
          (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "starred-first-asc":
      sorted.sort(
        (a, b) =>
          starredRank(a) - starredRank(b) ||
          takenDate(a) - takenDate(b) ||
          photoPosition(a) - photoPosition(b) ||
          (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "camera-az":
      sorted.sort(
        (a, b) =>
          cameraName(a).localeCompare(cameraName(b), undefined, { sensitivity: "base" }) ||
          takenDate(b) - takenDate(a) ||
          photoPosition(a) - photoPosition(b) ||
          (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "camera-za":
      sorted.sort(
        (a, b) =>
          cameraName(b).localeCompare(cameraName(a), undefined, { sensitivity: "base" }) ||
          takenDate(b) - takenDate(a) ||
          photoPosition(a) - photoPosition(b) ||
          (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "custom":
      sorted.sort((a, b) => photoPosition(a) - photoPosition(b) || (a.id || "").localeCompare(b.id || ""));
      break;
    default:
      break;
  }
  return sorted;
}
