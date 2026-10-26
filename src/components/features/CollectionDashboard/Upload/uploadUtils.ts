import { getUploadMediaType } from '../../../../lib/fileMime';
import type { UploadFileStatus, UploadMediaKind, UploadPanelTab, UploadQueueFile } from './uploadTypes';

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

const BYTES_PER_MB = 1024 * 1024;
const GB_THRESHOLD_MB = 1000;

function bytesToMb(bytes: number): number {
  return bytes / BYTES_PER_MB;
}

export function formatUploadMb(bytes: number): string {
  const mb = bytesToMb(bytes);
  if (mb < 0.01 && bytes > 0) return '<0.01 MB';
  if (mb >= GB_THRESHOLD_MB) return `${(mb / 1000).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function formatUploadBytePair(doneBytes: number, totalBytes: number): string {
  const totalMb = bytesToMb(totalBytes);
  const doneMb = bytesToMb(doneBytes);
  if (totalMb >= GB_THRESHOLD_MB) {
    return `${(doneMb / 1000).toFixed(2)} of ${(totalMb / 1000).toFixed(2)} GB`;
  }
  return `${doneMb.toFixed(1)} of ${totalMb.toFixed(1)} MB`;
}

export function formatUploadSpeed(bytesPerSec: number): string {
  const mb = Math.max(0, bytesToMb(bytesPerSec));
  return `${mb.toFixed(1)} MB/s`;
}

/** Human-readable ETA for the upload panel header. */
export function formatUploadTimeRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return 'less than a minute left';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `about ${mins} min left`;
  return `about ${Math.floor(mins / 60)} h ${mins % 60} min left`;
}

export function formatUploadEta(
  remainingBytes: number,
  bytesPerSec: number,
  elapsedSeconds: number
): string {
  if (elapsedSeconds < 10 || bytesPerSec <= 0) return 'Working out time left…';
  return formatUploadTimeRemaining(remainingBytes / bytesPerSec) || 'less than a minute left';
}

export const CONNECTION_HEALTH_LEVELS = [
  { h: 0, word: 'Stalled', minMBps: 0 },
  { h: 1, word: 'Slow', minMBps: 0.01 },
  { h: 2, word: 'Fair', minMBps: 0.4 },
  { h: 3, word: 'Good', minMBps: 1 },
  { h: 4, word: 'Fast', minMBps: 3 },
] as const;

export function connectionHealthForSpeed(
  bytesPerSec: number,
  { stalledForSeconds = 0 }: { stalledForSeconds?: number } = {}
): { h: number; word: string } {
  if (stalledForSeconds >= 10) return { h: 0, word: 'Stalled' };
  const mbps = Math.max(0, bytesToMb(bytesPerSec));
  let level: { h: number; word: string } = CONNECTION_HEALTH_LEVELS[1];
  for (const band of CONNECTION_HEALTH_LEVELS) {
    if (band.h === 0) continue;
    if (mbps >= band.minMBps) level = { h: band.h, word: band.word };
  }
  return level;
}

export function confirmedBytesForFile(file: UploadQueueFile): number {
  const total = uploadTotalBytes(file);
  if (file.status === 'completed') return total;
  return Math.min(total, Math.max(0, file.confirmedBytes || 0));
}

export function getTotalConfirmedBytes(files: UploadQueueFile[]): number {
  return files.reduce((sum, file) => sum + confirmedBytesForFile(file), 0);
}

export function confirmedBytesFromCheckpoint(
  checkpoint: { partSize?: number; etags?: Array<{ etag?: string } | null> } | null | undefined,
  fileSize: number
): number {
  const partSize = Number(checkpoint?.partSize) || 0;
  const etags = checkpoint?.etags;
  if (!partSize || !etags?.length || fileSize <= 0) return 0;
  let bytes = 0;
  for (let i = 0; i < etags.length; i += 1) {
    if (!etags[i]?.etag) continue;
    const start = i * partSize;
    const end = Math.min(fileSize, start + partSize);
    bytes += Math.max(0, end - start);
  }
  return bytes;
}

export type ConfirmedSpeedSample = {
  bytesPerSec: number;
  slow: boolean;
  stalled: boolean;
  ticks: number;
  stalledForSeconds: number;
};

export function createConfirmedSpeedTracker() {
  let lastConfirmed = 0;
  let hist: number[] = [];
  let avg60: number[] = [];
  let ticks = 0;
  let zeroStreak = 0;
  let slow = false;

  return {
    reset(confirmed = 0) {
      lastConfirmed = confirmed;
      hist = [];
      avg60 = [];
      ticks = 0;
      zeroStreak = 0;
      slow = false;
    },
    tick(confirmedTotal: number): ConfirmedSpeedSample {
      ticks += 1;
      const gained = Math.max(0, confirmedTotal - lastConfirmed);
      lastConfirmed = Math.max(lastConfirmed, confirmedTotal);
      hist.push(gained);
      if (hist.length > 10) hist.shift();
      const speed = hist.reduce((sum, n) => sum + n, 0) / hist.length;
      avg60.push(speed);
      if (avg60.length > 60) avg60.shift();
      const prior = avg60.length > 10 ? avg60.slice(0, -10) : avg60;
      const mean60 = prior.reduce((sum, n) => sum + n, 0) / prior.length;

      if (gained <= 0) zeroStreak += 1;
      else zeroStreak = 0;

      if (ticks >= 10 && mean60 > 0 && speed < 0.3 * mean60) slow = true;
      if (slow && speed > 0.6 * mean60) slow = false;

      return {
        bytesPerSec: speed,
        slow,
        stalled: zeroStreak >= 10,
        ticks,
        stalledForSeconds: zeroStreak,
      };
    },
  };
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
    return files.filter((f) => f.status === 'uploading' || f.status === 'processing');
  }
  if (tab === 'waiting') return files.filter((f) => f.status === 'waiting');
  if (tab === 'complete') return files.filter((f) => f.status === 'completed');
  return files.filter((f) => f.status === 'error');
}

export function uploadTabCounts(files: UploadQueueFile[]) {
  return {
    uploading: files.filter((f) => f.status === 'uploading' || f.status === 'processing').length,
    waiting: files.filter((f) => f.status === 'waiting').length,
    complete: files.filter((f) => f.status === 'completed').length,
    failed: files.filter((f) => f.status === 'error').length,
  };
}

/** Overall progress — confirmed original bytes only, so retries cannot reverse the bar. */
export function uploadOverallPercent(files: UploadQueueFile[]): number {
  const total = getTotalUploadBytes(files);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((getTotalConfirmedBytes(files) / total) * 100));
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
  const folder = /^(mp4|webm|ogg|mov|m4v|mkv|avi|wmv)$/i.test(ext) ? 'video' : 'original';
  return `${basePath}/${folder}/${stem}.${ext}`;
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

/**
 * Wraps a percent callback so React only hears about meaningful changes.
 * Emits when the rounded percent changes AND at least `minIntervalMs` has
 * elapsed since the last emit. 100 bypasses the interval so completion is
 * never delayed. XHR fires progress ~every 50 ms per request; with 10–20
 * concurrent uploads that is hundreds of setState calls per second without this.
 */
export function createProgressThrottle(
  emit: (percent: number) => void,
  { minIntervalMs = 250, now = () => Date.now() }: { minIntervalMs?: number; now?: () => number } = {}
): (percent: number) => void {
  let lastPercent = -1;
  let lastAt = -Infinity;
  return (percent: number) => {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    if (p === lastPercent) return;
    const t = now();
    if (p < 100 && t - lastAt < minIntervalMs) return;
    lastPercent = p;
    lastAt = t;
    emit(p);
  };
}

/**
 * The Uploads panel list is 260 px tall (~4 rows visible). Rendering 1000
 * rows per tick is the single largest render cost. Keep in-flight rows first
 * so the visible part of the list is always the live part.
 */
export function selectRenderedRows<T extends { status: UploadFileStatus }>(
  files: T[],
  max: number
): { rows: T[]; hidden: number } {
  if (files.length <= max) return { rows: files, hidden: 0 };
  const active: T[] = [];
  const rest: T[] = [];
  for (const f of files) {
    if (f.status === 'uploading' || f.status === 'processing') active.push(f);
    else rest.push(f);
  }
  const rows = [...active, ...rest].slice(0, max);
  return { rows, hidden: files.length - rows.length };
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
