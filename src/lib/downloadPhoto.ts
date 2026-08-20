import JSZip from 'jszip';
import {
  getPhotoDownloadFilename,
  getPhotoDownloadUrl,
  getPhotoDownloadUrlCandidates,
  getWebResolutionUrl,
  resolveMediaUrl,
  isVideoMedia,
} from './photoDisplayUrl';
import { getStoreOriginalDownloadUrlCandidates } from './storePhotoQuality';
import { getProxiedMediaFetchUrl } from './r2MediaProxy';
import { applyWatermarkToBlob } from './watermarkUtils';

const DEFAULT_FETCH_TIMEOUT_MS = 120_000;
/** Baseline parallel photo fetches — scaled up by {@link resolveDownloadConcurrency}. */
export const DEFAULT_DOWNLOAD_CONCURRENCY = 8;

/** Scale parallel downloads with gallery size (capped for browser stability). */
export function resolveDownloadConcurrency(photoCount: number): number {
  if (photoCount <= 1) return 1;
  if (photoCount <= 15) return 8;
  if (photoCount <= 40) return 10;
  if (photoCount <= 100) return 12;
  return 14;
}

async function runConcurrentWorkers(
  total: number,
  concurrency: number,
  worker: (index: number) => Promise<void>,
  isStale?: () => boolean
): Promise<void> {
  if (total <= 0) return;
  let nextIndex = 0;
  const poolSize = Math.min(Math.max(1, concurrency), total);

  const runOne = async () => {
    while (true) {
      if (isStale?.()) return;
      const index = nextIndex;
      nextIndex += 1;
      if (index >= total) return;
      await worker(index);
    }
  };

  await Promise.all(Array.from({ length: poolSize }, () => runOne()));
}

/**
 * Build a zip blob with STORE (no re-compression) — fastest path for JPEG/PNG galleries.
 */
export async function generateZipBlob(
  zip: JSZip,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  let lastReported = -1;
  const bytes = await zip.generateAsync(
    { type: 'uint8array', compression: 'STORE' },
    (metadata) => {
      if (!onProgress) return;
      const pct = Math.floor(metadata.percent);
      if (pct >= lastReported + 4 || pct >= 100) {
        lastReported = pct;
        onProgress(pct);
      }
    }
  );
  return new Blob([bytes], { type: 'application/zip' });
}

export interface BulkDownloadPhoto {
  full_url?: string;
  web_url?: string;
  thumbnail_url?: string;
  original_storage_path?: string;
  web_storage_path?: string;
  thumbnail_storage_path?: string;
  filename?: string;
  media_type?: string;
  id?: string;
}

const FETCH_RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const FETCH_ATTEMPTS_PER_URL = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ProgressCallback = (downloaded: number, total: number) => void;

export interface DownloadZipResult {
  fileCount: number;
  requested: number;
  failed: number;
}

/**
 * Fetch with timeout so one slow/hung R2 object cannot block the whole zip.
 */
export async function fetchArrayBufferWithTimeout(
  url: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<ArrayBuffer> {
  const fetchUrl = getProxiedMediaFetchUrl(url);
  let lastError: unknown;
  for (let attempt = 0; attempt < FETCH_ATTEMPTS_PER_URL; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(fetchUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        if (FETCH_RETRY_STATUSES.has(response.status) && attempt < FETCH_ATTEMPTS_PER_URL - 1) {
          lastError = err;
          await sleep(200 * (attempt + 1));
          continue;
        }
        throw err;
      }
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) throw new Error('Empty response');
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_ATTEMPTS_PER_URL - 1) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Download fetch failed');
}

export async function fetchBlobWithTimeout(
  url: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Blob> {
  const buffer = await fetchArrayBufferWithTimeout(url, timeoutMs);
  return new Blob([buffer], { type: 'application/octet-stream' });
}

/** Canvas fallback when fetch fails but CDN allows crossOrigin (common for R2 JPEGs). */
async function fetchImageBlobViaCanvas(url: string): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (blob: Blob | null) => {
      img.onload = null;
      img.onerror = null;
      resolve(blob);
    };
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          done(null);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => done(b && b.size ? b : null), 'image/jpeg', 0.92);
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = getProxiedMediaFetchUrl(url);
  });
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)(\?|#|$)/i.test(url) || !/\./.test(url.split('/').pop() || '');
}

export interface FetchPhotoBlobOptions {
  /** Prefer full/original CDN URL first (free gallery / social downloads). Default keeps existing candidate order. */
  preferOriginal?: boolean;
  /** Select which quality derivative to download for photographs. */
  resolution?: 'web' | 'full' | 'original';
  /** Select which quality derivative to download for films/videos. */
  videoResolution?: '1080p' | '4k' | 'none' | string;
}

function pushResolvedUrl(out: string[], seen: Set<string>, url: string | undefined | null) {
  if (!url) return;
  const resolved = resolveMediaUrl(String(url));
  if (!resolved || seen.has(resolved)) return;
  seen.add(resolved);
  out.push(resolved);
}

function getPhotoDownloadCandidatesByResolution(
  photo: BulkDownloadPhoto,
  resolution: 'web' | 'full' | 'original',
  videoResolution?: FetchPhotoBlobOptions['videoResolution']
) {
  if (isVideoMedia(photo)) {
    // Heuristic: `full_url` is higher quality, `web_url` is the web-optimized derivative.
    // If the delivery says 1080p, prefer `web_url`. Otherwise (4k / original), prefer `full_url`.
    const out: string[] = [];
    const seen = new Set<string>();
    const order =
      videoResolution === '1080p'
        ? [photo.web_url, photo.full_url, photo.thumbnail_url]
        : [photo.full_url, photo.web_url, photo.thumbnail_url];

    for (const candidate of order) {
      pushResolvedUrl(out, seen, candidate as any);
    }
    return out.length ? out : getPhotoDownloadUrlCandidates(photo);
  }

  if (resolution === 'original') {
    return getStoreOriginalDownloadUrlCandidates(photo);
  }

  const out: string[] = [];
  const seen = new Set<string>();

  if (resolution === 'web') {
    pushResolvedUrl(out, seen, getWebResolutionUrl(photo));
    pushResolvedUrl(out, seen, photo.web_url);
    pushResolvedUrl(out, seen, photo.thumbnail_url);
    pushResolvedUrl(out, seen, photo.web_storage_path);
    pushResolvedUrl(out, seen, photo.thumbnail_storage_path);
    return out;
  }

  // resolution === 'full'
  pushResolvedUrl(out, seen, photo.full_url);
  pushResolvedUrl(out, seen, photo.web_url);
  pushResolvedUrl(out, seen, photo.thumbnail_url);
  pushResolvedUrl(out, seen, photo.web_storage_path);
  pushResolvedUrl(out, seen, photo.thumbnail_storage_path);
  return out;
}

/** Try each CDN URL until one succeeds (fetch, then canvas for images). */
export async function fetchPhotoArrayBuffer(
  photo: BulkDownloadPhoto,
  options: FetchPhotoBlobOptions = {}
): Promise<ArrayBuffer | null> {
  const preferOriginal = Boolean(options.preferOriginal);
  const resolution: 'web' | 'full' | 'original' =
    options.resolution ?? (preferOriginal ? 'original' : 'full');
  const videoResolution = options.videoResolution;

  const candidates =
    resolution === 'original'
      ? getStoreOriginalDownloadUrlCandidates(photo)
      : getPhotoDownloadCandidatesByResolution(photo, resolution, videoResolution);
  const urls =
    candidates.length > 0
      ? candidates
      : (() => {
          const primary = getPhotoDownloadUrl(photo);
          return primary ? [primary] : [];
        })();

  for (const url of urls) {
    try {
      return await fetchArrayBufferWithTimeout(url);
    } catch (err) {
      console.warn('Download fetch failed, trying next URL:', url, err);
    }
  }

  for (const url of urls) {
    if (isVideoMedia(photo) || !isLikelyImageUrl(url)) continue;
    try {
      const viaCanvas = await fetchImageBlobViaCanvas(url);
      if (viaCanvas?.size) return viaCanvas.arrayBuffer();
    } catch {
      /* display-only fallback when proxy unavailable */
    }
  }
  return null;
}

export async function fetchPhotoBlob(
  photo: BulkDownloadPhoto,
  options: FetchPhotoBlobOptions = {}
): Promise<Blob | null> {
  const buffer = await fetchPhotoArrayBuffer(photo, options);
  if (!buffer?.byteLength) return null;
  return new Blob([buffer], { type: 'application/octet-stream' });
}

export interface DownloadPhotosToZipOptions extends FetchPhotoBlobOptions {
  concurrency?: number;
  onProgress?: ProgressCallback;
  isStale?: () => boolean;
  watermarkOptions?: any;
  getZipFolder?: (photo: BulkDownloadPhoto) => string | null | undefined;
}

export interface DownloadSinglePhotoOptions extends FetchPhotoBlobOptions {
  watermarkOptions?: any;
}

async function addPhotoToZip(
  zip: JSZip,
  photo: BulkDownloadPhoto,
  index: number,
  usedNames: Set<string>,
  options: DownloadPhotosToZipOptions = {}
): Promise<boolean> {
  const { preferOriginal = false, resolution, videoResolution, watermarkOptions, getZipFolder } = options;
  let payload: Blob | ArrayBuffer | null = await fetchPhotoArrayBuffer(photo, {
    preferOriginal,
    resolution,
    videoResolution,
  });
  if (!payload) return false;

  if (watermarkOptions) {
    const blob = payload instanceof ArrayBuffer ? new Blob([payload]) : payload;
    const watermarked = await applyWatermarkToBlob(blob, watermarkOptions);
    payload = await watermarked.arrayBuffer();
  }

  const name = getPhotoDownloadFilename(photo, index, usedNames);
  const folder = String(getZipFolder?.(photo) || '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim();
  zip.file(folder ? `${folder}/${name}` : name, payload);
  return true;
}

/**
 * Download photos into a JSZip instance (batched parallel — stable in browsers).
 */
export async function downloadPhotosToZip(
  zip: JSZip,
  photos: BulkDownloadPhoto[],
  options: DownloadPhotosToZipOptions = {}
): Promise<DownloadZipResult> {
  const {
    concurrency = resolveDownloadConcurrency(photos.length),
    onProgress,
    isStale,
    resolution,
    preferOriginal = false,
    videoResolution,
    watermarkOptions,
    getZipFolder,
  } = options;

  if (!photos.length) {
    return { fileCount: 0, requested: 0, failed: 0 };
  }

  const usedNames = new Set<string>();
  let completed = 0;
  const total = photos.length;
  const failedIndices: number[] = [];
  const zipOpts = { preferOriginal, resolution, videoResolution, watermarkOptions, getZipFolder };

  const report = () => onProgress?.(completed, total);

  await runConcurrentWorkers(
    total,
    concurrency,
    async (index) => {
      const photo = photos[index];
      try {
        const ok = await addPhotoToZip(zip, photo, index, usedNames, zipOpts);
        if (!ok) failedIndices.push(index);
      } catch (err) {
        console.warn(`Failed to download ${photo.filename || photo.id || index}:`, err);
        failedIndices.push(index);
      } finally {
        completed += 1;
        report();
      }
    },
    isStale
  );

  if (!isStale?.() && failedIndices.length > 0) {
    const stillFailed: number[] = [];
    for (const index of failedIndices) {
      if (isStale?.()) break;
      const photo = photos[index];
      try {
        const ok = await addPhotoToZip(zip, photo, index, usedNames, zipOpts);
        if (!ok) stillFailed.push(index);
      } catch (err) {
        console.warn(`Retry failed for ${photo.filename || photo.id || index}:`, err);
        stillFailed.push(index);
      }
    }
    if (stillFailed.length > 0) {
      console.warn(
        `Download: ${stillFailed.length} photo(s) could not be fetched:`,
        stillFailed.map((i) => photos[i]?.filename || photos[i]?.id || i)
      );
    }
  }

  const fileCount = Object.keys(zip.files).filter((k) => !k.endsWith('/')).length;
  return {
    fileCount,
    requested: total,
    failed: Math.max(0, total - fileCount),
  };
}

/**
 * Download one photo/video as a real file (image or video extension), not a zip.
 * @param options.preferOriginal — use full/original first (free gallery download when paid digital is off)
 * @param options.watermarkOptions — optional Album Proofer watermark overlay
 */
export async function downloadSinglePhotoFile(
  photo: BulkDownloadPhoto,
  options: DownloadSinglePhotoOptions = {}
): Promise<void> {
  const { preferOriginal = false, resolution, videoResolution, watermarkOptions } = options;
  let blob = await fetchPhotoBlob(photo, { preferOriginal, resolution, videoResolution });
  if (!blob) {
    throw new Error('Failed to download this file. Please try again.');
  }

  if (watermarkOptions) {
    blob = await applyWatermarkToBlob(blob, watermarkOptions);
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
  onProgress?: ProgressCallback,
  options: FetchPhotoBlobOptions = {}
): Promise<void> {
  if (!photos || photos.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder(zipName)!;

  const result = await downloadPhotosToZip(folder, photos, {
    onProgress,
    preferOriginal: options.preferOriginal,
  });
  if (result.fileCount === 0) {
    throw new Error('Could not download any photos. They may still be processing — try again in a moment.');
  }
  if (result.failed > 0) {
    console.warn(`ZIP: ${result.fileCount}/${result.requested} photos downloaded`);
  }

  const zipBlob = await generateZipBlob(zip);
  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
