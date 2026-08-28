import { getUploadMediaType } from '../../../../lib/fileMime';
import type { UploadMediaKind, UploadPanelTab, UploadQueueFile } from './uploadTypes';

export function getUploadMediaKindFromFile(file: File): UploadMediaKind {
  const kind = getUploadMediaType(file);
  if (kind === 'video' || kind === 'gif' || kind === 'raw') return kind;
  return 'image';
}

/** In-progress label on a single file row (e.g. "Video upload"). */
export function uploadActiveLabel(kind: UploadMediaKind = 'image'): string {
  switch (kind) {
    case 'video':
      return 'Video upload';
    case 'gif':
      return 'GIF upload';
    case 'raw':
      return 'RAW upload';
    default:
      return 'Image upload';
  }
}

/** Batch summary when uploads finish (e.g. "3 videos uploaded"). */
export function uploadCompleteSummary(files: UploadQueueFile[]): string {
  const done = files.filter((f) => f.status === 'completed');
  const n = done.length;
  if (n === 0) return '';

  const kinds = done.map((f) => f.mediaKind ?? 'image');
  const allVideo = kinds.every((k) => k === 'video');
  if (allVideo) {
    return `${n} ${n === 1 ? 'video' : 'videos'} uploaded`;
  }

  const allNonVideo = kinds.every((k) => k !== 'video');
  if (allNonVideo) {
    return `${n} ${n === 1 ? 'image' : 'images'} uploaded`;
  }

  return `${n} ${n === 1 ? 'item' : 'items'} uploaded`;
}

/** Minimized widget title while uploads are running. */
export function uploadInProgressTitle(files: UploadQueueFile[], inProgressCount: number): string {
  if (inProgressCount <= 0) return '';
  const active = files.filter(
    (f) => f.status === 'waiting' || f.status === 'uploading' || f.status === 'processing'
  );
  if (active.length === 1) {
    return uploadActiveLabel(active[0].mediaKind ?? 'image');
  }
  const allVideo = active.every((f) => (f.mediaKind ?? 'image') === 'video');
  if (allVideo) {
    return `Uploading ${inProgressCount} ${inProgressCount === 1 ? 'video' : 'videos'}`;
  }
  return `Uploading ${inProgressCount} ${inProgressCount === 1 ? 'item' : 'items'}`;
}

export function formatUploadMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01 && bytes > 0) return '<0.01 MB';
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export function formatUploadSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0.00 MB/s';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB/s`;
  const kb = bytesPerSec / 1024;
  if (kb >= 1) return `${kb.toFixed(1)} KB/s`;
  return `${Math.round(bytesPerSec)} B/s`;
}

/** Human-readable ETA for the upload panel header. */
export function formatUploadTimeRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sec left`;
  if (seconds < 3600) {
    const mins = Math.ceil(seconds / 60);
    return `about ${mins} min left`;
  }
  const hrs = Math.ceil(seconds / 3600);
  return hrs === 1 ? 'about 1 hr left' : `about ${hrs} hrs left`;
}

export function uploadTotalBytes(file: UploadQueueFile): number {
  return file.uploadSize ?? file.size;
}

export function uploadBytesDone(file: UploadQueueFile): number {
  const total = uploadTotalBytes(file);
  if (file.status === 'completed') return total;
  return Math.round((total * file.progress) / 100);
}

export function getTotalUploadBytes(files: UploadQueueFile[]): number {
  return files.reduce((sum, f) => sum + uploadTotalBytes(f), 0);
}

export function getTotalBytesDone(files: UploadQueueFile[]): number {
  return files.reduce((sum, f) => sum + uploadBytesDone(f), 0);
}

export function filterFilesByTab(files: UploadQueueFile[], tab: UploadPanelTab): UploadQueueFile[] {
  if (tab === 'uploading') {
    return files.filter((f) => f.status === 'waiting' || f.status === 'uploading' || f.status === 'processing');
  }
  if (tab === 'complete') return files.filter((f) => f.status === 'completed');
  return files.filter((f) => f.status === 'error');
}

export function uploadTabCounts(files: UploadQueueFile[]) {
  return {
    uploading: files.filter((f) => f.status === 'waiting' || f.status === 'uploading' || f.status === 'processing').length,
    complete: files.filter((f) => f.status === 'completed').length,
    failed: files.filter((f) => f.status === 'error').length,
  };
}

/** Overall progress — average of per-file progress (reflects web/thumb phase too). */
export function uploadOverallPercent(files: UploadQueueFile[]): number {
  if (files.length === 0) return 0;
  const sum = files.reduce((acc, f) => {
    if (f.status === 'completed') return acc + 100;
    if (f.status === 'error') return acc;
    return acc + Math.max(0, Math.min(100, f.progress || 0));
  }, 0);
  return Math.min(100, Math.round(sum / files.length));
}

export type IncompleteUploadPhoto = {
  id: string;
  filename: string;
  collection_id?: string;
  set_id?: string | null;
  full_url?: string | null;
  original_storage_path?: string | null;
  web_storage_path?: string | null;
  thumbnail_storage_path?: string | null;
  web_url?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
};

function pathFromPublicUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const pathname = new URL(url).pathname.replace(/^\/+/, '');
    return decodeURIComponent(pathname);
  } catch {
    return '';
  }
}

/** Derive the expected R2 original key from a photo row (web/thumb stem or stored path). */
export function resolveOriginalStoragePath(
  photo: {
    filename?: string | null;
    original_storage_path?: string | null;
    web_storage_path?: string | null;
    thumbnail_storage_path?: string | null;
    web_url?: string | null;
    thumbnail_url?: string | null;
  },
  fileExt?: string | null
): string | null {
  if (photo.original_storage_path) return photo.original_storage_path;

  const derivativePath =
    photo.web_storage_path ||
    photo.thumbnail_storage_path ||
    pathFromPublicUrl(photo.web_url) ||
    pathFromPublicUrl(photo.thumbnail_url) ||
    '';

  if (!derivativePath) return null;

  const match = derivativePath.match(/^(.*)\/(web|thumb)\/([^/]+)$/);
  if (!match) return null;

  const basePath = match[1];
  const stem = match[3].replace(/\.[^.]+$/, '');
  const ext =
    (fileExt || photo.filename?.split('.').pop() || 'jpg').toLowerCase();
  return `${basePath}/original/${stem}.${ext}`;
}

/** Photo row is in DB with web/thumb but original never finished (or full_url points at a derivative). */
export function isIncompleteUploadPhoto(photo: {
  filename?: string | null;
  full_url?: string | null;
  original_storage_path?: string | null;
  web_url?: string | null;
  thumbnail_url?: string | null;
}): boolean {
  if (!photo?.filename) return false;
  if (!photo.full_url && !photo.original_storage_path) return true;

  const fullUrl = String(photo.full_url || '');
  if (fullUrl.includes('/web/') || fullUrl.includes('/thumb/')) return true;
  if (photo.web_url && fullUrl === photo.web_url) return true;
  if (photo.thumbnail_url && fullUrl === photo.thumbnail_url) return true;

  return false;
}

/**
 * Partition selected files:
 * - `accepted` — brand new uploads
 * - `resumable` — same filename as an incomplete photo (web/thumb done, original missing)
 * - `skipped` — fully uploaded already (or already queued)
 */
export function partitionDuplicateUploadFiles(
  files: File[],
  existingCompleteNamesLower: Iterable<string>,
  queuedNamesLower: Iterable<string>,
  incompleteByNameLower: Map<string, IncompleteUploadPhoto> = new Map()
): {
  accepted: File[];
  resumable: { file: File; photo: IncompleteUploadPhoto }[];
  skipped: string[];
} {
  const complete = new Set<string>();
  for (const name of existingCompleteNamesLower) complete.add(name);

  const queued = new Set<string>();
  for (const name of queuedNamesLower) queued.add(name);

  const accepted: File[] = [];
  const resumable: { file: File; photo: IncompleteUploadPhoto }[] = [];
  const skipped: string[] = [];
  const batchSeen = new Set<string>();

  for (const file of files) {
    const key = file.name.toLowerCase();

    if (batchSeen.has(key) || queued.has(key)) {
      skipped.push(file.name);
      continue;
    }

    const incomplete = incompleteByNameLower.get(key);
    if (incomplete) {
      batchSeen.add(key);
      resumable.push({ file, photo: incomplete });
      continue;
    }

    if (complete.has(key)) {
      skipped.push(file.name);
      continue;
    }

    batchSeen.add(key);
    accepted.push(file);
  }

  return { accepted, resumable, skipped };
}

/** Smallest files first — faster previews and less memory pressure before large RAWs. */
export function sortFilesBySizeAsc(files: File[]): File[] {
  return [...files].sort((a, b) => a.size - b.size);
}

export function sortUploadQueueBySizeAsc<T extends { file: File }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.file.size - b.file.size);
}
