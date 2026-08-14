import type { DashboardPhotoSort } from '@/utils/sortDashboardPhotos';

export type PhotoSortField =
  | 'capture-time'
  | 'filename'
  | 'recently-added'
  | 'starred-first'
  | 'camera';

export const PHOTO_SORT_FIELDS: { id: PhotoSortField; label: string }[] = [
  { id: 'capture-time', label: 'Capture time' },
  { id: 'filename', label: 'Filename' },
  { id: 'recently-added', label: 'Recently added' },
  { id: 'starred-first', label: 'Starred first' },
  { id: 'camera', label: 'Camera' },
];

export function sortFieldLabel(field: PhotoSortField): string {
  return PHOTO_SORT_FIELDS.find((item) => item.id === field)?.label ?? 'Capture time';
}

export function sortFieldToOption(
  field: PhotoSortField,
  reverse: boolean
): DashboardPhotoSort {
  switch (field) {
    case 'capture-time':
      return reverse ? 'taken-old-new' : 'taken-new-old';
    case 'filename':
      return reverse ? 'name-za' : 'name-az';
    case 'recently-added':
      return reverse ? 'upload-old-new' : 'upload-new-old';
    case 'starred-first':
      return reverse ? 'starred-first-asc' : 'starred-first';
    case 'camera':
      return reverse ? 'camera-za' : 'camera-az';
    default:
      return 'taken-new-old';
  }
}

export function optionToSortUi(
  option: DashboardPhotoSort
): { field: PhotoSortField; reverse: boolean } | null {
  switch (option) {
    case 'taken-new-old':
      return { field: 'capture-time', reverse: false };
    case 'taken-old-new':
      return { field: 'capture-time', reverse: true };
    case 'name-az':
      return { field: 'filename', reverse: false };
    case 'name-za':
      return { field: 'filename', reverse: true };
    case 'upload-new-old':
      return { field: 'recently-added', reverse: false };
    case 'upload-old-new':
      return { field: 'recently-added', reverse: true };
    case 'starred-first':
      return { field: 'starred-first', reverse: false };
    case 'starred-first-asc':
      return { field: 'starred-first', reverse: true };
    case 'camera-az':
      return { field: 'camera', reverse: false };
    case 'camera-za':
      return { field: 'camera', reverse: true };
    default:
      return null;
  }
}
