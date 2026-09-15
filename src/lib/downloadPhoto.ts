import JSZip from 'jszip';
import {
  getPhotoDownloadFilename,
  getPhotoDownloadUrl,
  getPhotoDownloadUrlCandidates,
  getWebResolutionUrl,
  resolveMediaUrl,
  isVideoMedia,
  isRawMedia,
  getRawPreviewUrl,
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

export type SniffedMediaKind =
  | 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp' | 'avif' | 'heic'
  | 'tiff' | 'mp4' | 'webm' | 'text' | 'unknown';

/**
 * Magic-byte sniff of fetched payloads. Guards the zip against two
 * corruption modes that all surface as "file not supported" when opening:
 *  - error pages (HTML/JSON served with HTTP 200) stored as .jpg
 *  - RAW/TIFF bytes stored with a .jpg name (or JPEG bytes with a .CR2 name)
 */
export function sniffMediaKind(input: ArrayBuffer | Uint8Array): SniffedMediaKind {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 12) return 'unknown';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  // BMP — "BM" header.
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'webp';
  // ISO BMFF: ftyp box at offset 4 (HEIC/HEIF/AVIF/MP4/MOV).
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (/^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/i.test(brand)) return 'heic';
    if (/^avif$/i.test(brand)) return 'avif';
    if (/^(mp41|mp42|isom|iso2|iso3|avc1|mmp4|M4V |M4A |qt  |dash)$/.test(brand)) return 'mp4';
    return 'mp4';
  }
  // TIFF header — every camera RAW (CR2/NEF/ARW/DNG…) is TIFF-based.
  if (
    (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
    (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)
  ) return 'tiff';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  // Text after optional BOM/whitespace — HTML ("<…") or JSON ("{…"/"[…").
  let i = 0;
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) i = 3;
  while (i < b.length && (b[i] === 0x20 || b[i] === 0x09 || b[i] === 0x0a || b[i] === 0x0d)) i += 1;
  if (i < b.length && (b[i] === 0x3c || b[i] === 0x7b || b[i] === 0x5b)) return 'text';
  return 'unknown';
}

const IMAGE_KIND_TO_EXT: Record<string, string> = {
  jpeg: '.jpg',
  png: '.png',
  gif: '.gif',
  webp: '.webp',
  bmp: '.bmp',
  avif: '.avif',
  heic: '.heic',
};

function extensionOf(filename: string): string {
  const m = /\.([^./\\?#]+)(?:[?#].*)?$/.exec(filename || '');
  return m ? `.${m[1].toLowerCase()}` : '';
}

function withoutExtension(filename: string): string {
  return String(filename || '').replace(/(\.[^./\\?#]+)([?#].*)?$/, '');
}

/**
 * Ensure the zip entry name matches the actual bytes. Returns the corrected
 * filename, or null when the name already fits. TIFF/RAW bytes keep the
 * photo's original extension so they stay honest (open in Lightroom etc.
 * instead of failing as fake .jpg files).
 */
export function correctFilenameForSniffedKind(
  filename: string,
  photo: BulkDownloadPhoto,
  kind: SniffedMediaKind
): string | null {
  if (!filename) return null;
  const currentExt = extensionOf(filename);
  if (kind === 'tiff') {
    const originalExt = extensionOf(photo?.filename || '');
    const desired = originalExt || '.tif';
    if (currentExt === desired) return null;
    return `${withoutExtension(filename)}${desired}`;
  }
  const desired = IMAGE_KIND_TO_EXT[kind];
  if (!desired) return null;
  if (currentExt === desired) return null;
  // .jpeg ≡ .jpg, .heif ≡ .heic — already compatible.
  if (desired === '.jpg' && (currentExt === '.jpeg')) return null;
  if (desired === '.heic' && currentExt === '.heif') return null;
  return `${withoutExtension(filename)}${desired}`;
}

async function sniffHead(payload: Blob | ArrayBuffer): Promise<SniffedMediaKind> {
  try {
    const head = payload instanceof ArrayBuffer
      ? payload.slice(0, 16)
      : await (payload as Blob).slice(0, 16).arrayBuffer();
    return sniffMediaKind(head);
  } catch {
    return 'unknown';
  }
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

  // RAW originals (CR2/NEF/ARW/HEIC…) aren't browser-openable, and the zip
  // filename logic assumes JPEG bytes whenever a preview exists — so try the
  // displayable JPEG preview before the RAW original at every resolution.
  // Otherwise RAW bytes get saved with a .jpg name and viewers report
  // "file not supported".
  if (isRawMedia(photo)) {
    try {
      const preview = getRawPreviewUrl(photo);
      if (preview) pushResolvedUrl(out, seen, preview);
    } catch {
      /* fall through to the standard order */
    }
  }

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
      const buffer = await fetchArrayBufferWithTimeout(url);
      // A 200 response isn't always image bytes (error pages served as HTML).
      // Reject text bodies so they never end up in the zip as fake photos.
      try {
        if (buffer.byteLength > 0 && sniffMediaKind(buffer) === 'text') {
          console.warn('Download fetch returned a non-image body, trying next URL:', url);
          continue;
        }
      } catch {
        /* sniffing must never break the download path */
      }
      return buffer;
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

  // The fetched bytes decide the filename — not the other way around.
  // Without this, RAW/TIFF bytes get saved with a .jpg name (or JPEG bytes
  // with a .CR2 name) and viewers report "file not supported".
  // correctFilenameForSniffedKind() existed for exactly this but was never wired in.
  let name = getPhotoDownloadFilename(photo, index);
  try {
    const bytes =
      payload instanceof ArrayBuffer
        ? new Uint8Array(payload)
        : new Uint8Array(await (payload as Blob).slice(0, 32).arrayBuffer());
    const kind = sniffMediaKind(bytes);
    if (kind === 'text') return false;
    const corrected = correctFilenameForSniffedKind(name, photo, kind);
    if (corrected) name = corrected;
  } catch {
    /* sniffing must never break the download path */
  }
  // Claim uniqueness (same _n scheme as getPhotoDownloadFilename's usedNames path).
  let finalName = name;
  for (let n = 1; usedNames.has(finalName.toLowerCase()); n += 1) {
    const dot = name.lastIndexOf('.');
    finalName = dot > 0 ? `${name.slice(0, dot)}_${n}${name.slice(dot)}` : `${name}_${n}`;
  }
  usedNames.add(finalName.toLowerCase());
  const folder = String(getZipFolder?.(photo) || '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim();
  zip.file(folder ? `${folder}/${finalName}` : finalName, payload);
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

  let filename = getPhotoDownloadFilename(photo, 0);
  try {
    const head = await blob.slice(0, 32).arrayBuffer();
    const corrected = correctFilenameForSniffedKind(filename, photo, sniffMediaKind(head));
    if (corrected) filename = corrected;
  } catch {
    /* sniffing must never break the download path */
  }
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
