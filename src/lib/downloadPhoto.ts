import JSZip from 'jszip';
import {
  getPhotoDownloadFilename,
  getPhotoDownloadUrl,
  getPhotoDownloadUrlCandidates,
} from './photoDisplayUrl';

const DEFAULT_FETCH_TIMEOUT_MS = 120_000;
export const DEFAULT_DOWNLOAD_CONCURRENCY = 6;

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
      cache: 'no-store',
      signal: controller.signal,
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

/** Try each CDN URL until one succeeds. */
export async function fetchPhotoBlob(photo: BulkDownloadPhoto): Promise<Blob | null> {
  const candidates = getPhotoDownloadUrlCandidates(photo);
  if (candidates.length === 0) {
    const primary = getPhotoDownloadUrl(photo);
    if (!primary) return null;
    try {
      return await fetchBlobWithTimeout(primary);
    } catch {
      return null;
    }
  }
  for (const url of candidates) {
    try {
      return await fetchBlobWithTimeout(url);
    } catch (err) {
      console.warn('Download fetch failed, trying next URL:', url, err);
    }
  }
  return null;
}

export interface DownloadPhotosToZipOptions {
  concurrency?: number;
  onProgress?: ProgressCallback;
  isStale?: () => boolean;
}

/**
 * Download photos into a JSZip instance (batched parallel — stable in browsers).
 */
export async function downloadPhotosToZip(
  zip: JSZip,
  photos: BulkDownloadPhoto[],
  options: DownloadPhotosToZipOptions = {}
): Promise<number> {
  const { concurrency = DEFAULT_DOWNLOAD_CONCURRENCY, onProgress, isStale } = options;

  if (!photos.length) return 0;

  const usedNames = new Set<string>();
  let completed = 0;
  const total = photos.length;

  const report = () => onProgress?.(completed, total);

  for (let i = 0; i < photos.length; i += concurrency) {
    if (isStale?.()) break;
    const chunk = photos.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (photo, chunkIndex) => {
        const index = i + chunkIndex;
        try {
          const blob = await fetchPhotoBlob(photo);
          if (blob && !isStale?.()) {
            const name = getPhotoDownloadFilename(photo, index, usedNames);
            zip.file(name, blob);
          }
        } catch (err) {
          console.warn(`Failed to download ${photo.filename || index}:`, err);
        } finally {
          completed += 1;
          report();
        }
      })
    );
  }

  return Object.keys(zip.files).filter((k) => !k.endsWith('/')).length;
}

/**
 * Download one photo/video as a real file (image or video extension), not a zip.
 */
export async function downloadSinglePhotoFile(photo: BulkDownloadPhoto): Promise<void> {
  const blob = await fetchPhotoBlob(photo);
  if (!blob) {
    throw new Error('Failed to download this file. Please try again.');
  }

  const filename = getPhotoDownloadFilename(photo, 0);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
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

  const count = await downloadPhotosToZip(folder, photos, { onProgress });
  if (count === 0) {
    throw new Error('Could not download any photos. They may still be processing — try again in a moment.');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
