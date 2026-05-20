import JSZip from 'jszip';
import { getPhotoDownloadFilename, getPhotoDownloadUrl } from './photoDisplayUrl';

const DEFAULT_FETCH_TIMEOUT_MS = 120_000;

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

/**
 * Downloads a single photo from a Cloudflare R2 URL and saves it to the user's computer.
 * Uses fetch → blob → object URL so the browser triggers a real file save.
 * Falls back to a new-tab link if CORS blocks the fetch.
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

export interface BulkDownloadPhoto {
  full_url?: string;
  web_url?: string;
  thumbnail_url?: string;
  filename?: string;
  media_type?: string;
}

export type ProgressCallback = (downloaded: number, total: number) => void;

/**
 * Downloads all photos from Cloudflare R2, bundles them into a ZIP,
 * and saves the ZIP to the user's computer.
 *
 * @param photos   Array of photo objects with full_url and filename
 * @param zipName  Name of the resulting ZIP file (without .zip extension)
 * @param onProgress Optional callback(downloaded, total) for progress updates
 */
export async function downloadAllPhotosAsZip(
  photos: BulkDownloadPhoto[],
  zipName = 'photos',
  onProgress?: ProgressCallback
): Promise<void> {
  if (!photos || photos.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder(zipName)!;

  let completed = 0;
  let lastReported = 0;

  const reportProgress = () => {
    completed += 1;
    if (completed > lastReported) {
      lastReported = completed;
      onProgress?.(completed, photos.length);
    }
  };

  const BATCH_SIZE = 8;
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (photo, batchIndex) => {
        const globalIndex = i + batchIndex + 1;
        const url = getPhotoDownloadUrl(photo);
        if (!url) {
          reportProgress();
          return;
        }

        const used = new Set();
        const safeFilename = getPhotoDownloadFilename(photo, globalIndex, used);

        try {
          const blob = await fetchBlobWithTimeout(url);
          folder.file(safeFilename, blob);
        } catch (err) {
          console.warn(`Failed to fetch ${safeFilename}:`, err);
        } finally {
          reportProgress();
        }
      })
    );
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
