import type { Photo } from "@/types/collection.types";

export type DashboardPhotoSort =
  | "upload-new-old"
  | "upload-old-new"
  | "taken-new-old"
  | "taken-old-new"
  | "name-az"
  | "name-za"
  | "random"
  | "custom";

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

function takenDate(p: Photo): number {
  const raw = p.exif_taken_at || p.created_at;
  return new Date(raw).getTime();
}

function uploadDate(p: Photo): number {
  return new Date(p.created_at).getTime();
}

/** Fisher–Yates shuffle (mutates copy only). */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function sortDashboardPhotos(
  photos: Photo[],
  sort: DashboardPhotoSort,
): Photo[] {
  const sorted = [...photos];
  switch (sort) {
    case "upload-new-old":
      sorted.sort((a, b) => uploadDate(b) - uploadDate(a) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "upload-old-new":
      sorted.sort((a, b) => uploadDate(a) - uploadDate(b) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "taken-new-old":
      sorted.sort((a, b) => takenDate(b) - takenDate(a) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "taken-old-new":
      sorted.sort((a, b) => takenDate(a) - takenDate(b) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || ""));
      break;
    case "name-az":
      sorted.sort((a, b) =>
        (a.filename || "").localeCompare(b.filename || "", undefined, {
          sensitivity: "base",
        }) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "name-za":
      sorted.sort((a, b) =>
        (b.filename || "").localeCompare(a.filename || "", undefined, {
          sensitivity: "base",
        }) || (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || "")
      );
      break;
    case "random":
      shuffleInPlace(sorted);
      break;
    case "custom":
      sorted.sort((a, b) => (a.position || 0) - (b.position || 0) || (a.id || "").localeCompare(b.id || ""));
      break;
    default:
      break;
  }
  return sorted;
}
