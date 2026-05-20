import JSZip from 'jszip';
import { getPhotoDownloadFilename, getPhotoDownloadUrl } from './photoDisplayUrl';

const DEFAULT_FETCH_TIMEOUT_MS = 90_000;
/** Keep this many fetches in flight (sliding window — faster than fixed batches). */
export const DEFAULT_DOWNLOAD_CONCURRENCY = 16;
const PROGRESS_THROTTLE_MS = 80;

/**
 * Fetch with timeout so one slow/hung R2 object cannot block the whole zip.
 */
export async function fetchBlobWithTimeout(
  url: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'default',
      signal: controller.signal,
      priority: 'high',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } finally {
    clearTimeout(timer);
  }
}

export interface BulkDownloadPhoto {
  full_url?: string;
  web_url?: string;
  thumbnail_url?: string;
  filename?: string;
  media_type?: string;
}

export type ProgressCallback = (downloaded: number, total: number) => void;

export interface DownloadPhotosToZipOptions {
  concurrency?: number;
  /** Prefer web-sized files when allowed (much faster for large galleries). */
  preferWebSize?: boolean;
  downloadResolutions?: string[];
  onProgress?: ProgressCallback;
  isStale?: () => boolean;
}

/**
 * Download photos into a JSZip instance with a sliding concurrency pool (faster than batch-and-wait).
 */
export async function downloadPhotosToZip(
  zip: JSZip,
  photos: BulkDownloadPhoto[],
  options: DownloadPhotosToZipOptions = {}
): Promise<number> {
  const {
    concurrency = DEFAULT_DOWNLOAD_CONCURRENCY,
    preferWebSize = true,
    downloadResolutions,
    onProgress,
    isStale,
  } = options;

  if (!photos.length) return 0;

  const usedNames = new Set<string>();
  let completed = 0;
  let nextIndex = 0;
  let lastProgressAt = 0;

  const reportProgress = () => {
    const now = Date.now();
    if (now - lastProgressAt < PROGRESS_THROTTLE_MS && completed < photos.length) return;
    lastProgressAt = now;
    onProgress?.(completed, photos.length);
  };

  const urlOptions = { preferWebSize, downloadResolutions };

  const processOne = async (photo: BulkDownloadPhoto, index: number) => {
    if (isStale?.()) return;
    const url = getPhotoDownloadUrl(photo, urlOptions);
    try {
      if (url) {
        const blob = await fetchBlobWithTimeout(url);
        if (!isStale?.()) {
          const name = getPhotoDownloadFilename(photo, index, usedNames);
          zip.file(name, blob);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch ${photo.filename || index}:`, err);
    } finally {
      completed += 1;
      reportProgress();
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), photos.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      if (isStale?.()) return;
      const i = nextIndex;
      nextIndex += 1;
      if (i >= photos.length) return;
      await processOne(photos[i], i);
    }
  });

  await Promise.all(workers);
  reportProgress();

  return Object.keys(zip.files).filter((k) => !k.endsWith('/')).length;
}

/**
 * Downloads a single photo from a Cloudflare R2 URL and saves it to the user's computer.
 */
export async function downloadPhotoFromR2(url: string, filename: string): Promise<void> {
  if (!url) return;

  try {
    const blob = await fetchBlobWithTimeout(url);
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.warn('Fetch download failed, falling back to link open:', err);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'photo.jpg';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Downloads all photos from Cloudflare R2, bundles them into a ZIP, and saves.
 */
export async function downloadAllPhotosAsZip(
  photos: BulkDownloadPhoto[],
  zipName = 'photos',
  onProgress?: ProgressCallback
): Promise<void> {
  if (!photos || photos.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder(zipName)!;

  await downloadPhotosToZip(folder, photos, {
    preferWebSize: true,
    onProgress,
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
    streamFiles: true,
  });
  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
