import { fetchPhotoBlob } from './downloadPhoto';
import {
  getPhotoDownloadFilename,
  getPhotoDownloadUrl,
  getPhotoDownloadUrlCandidates,
  getPhotoFullDisplayUrl,
  getPhotoGridDisplayUrl,
  getPhotoVideoSrc,
  isVideoMedia,
} from './photoDisplayUrl';
import { getProxiedMediaFetchUrl, toSameOriginPathStyleMediaUrl } from './r2MediaProxy';

function sanitizeZipPart(value, fallback = 'delivery') {
  const cleaned = String(value || '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export function photosInDeliverySet(photos = [], set) {
  if (!set) return [];
  if (set.isHighlights || set.id === 'highlights') {
    return photos.filter((photo) => !photo.set_id);
  }
  return photos.filter((photo) => String(photo.set_id) === String(set.id));
}

export function deliveryDownloadRows({ photos = [], sets = [], highlightsName = 'Highlights' } = {}) {
  const rows = [
    {
      id: 'highlights',
      name: highlightsName || 'Highlights',
      isHighlights: true,
      photos: photosInDeliverySet(photos, { id: 'highlights', isHighlights: true }),
    },
  ];
  for (const set of sets) {
    if (!set || set.isHighlights || set.id === 'highlights') continue;
    rows.push({
      id: set.id,
      name: set.name || 'Set',
      isHighlights: false,
      photos: photosInDeliverySet(photos, set),
    });
  }
  return rows.map((row) => ({
    ...row,
    count: row.photos.length,
    bytes: row.photos.reduce((sum, photo) => sum + (Number(photo.size_bytes) || 0), 0),
  }));
}

export function photosForDeliveryDownload({
  mode = 'all',
  photos = [],
  sets = [],
  setId = null,
  highlightsName = 'Highlights',
} = {}) {
  if (mode !== 'set') return [...photos];
  const rows = deliveryDownloadRows({ photos, sets, highlightsName });
  const row = rows.find((item) => String(item.id) === String(setId || 'highlights'));
  return row ? row.photos : [];
}

export function zipFilenameForDelivery(collectionName, setName) {
  const delivery = sanitizeZipPart(collectionName, 'delivery');
  if (!setName) return `${delivery}.zip`;
  return `${delivery} - ${sanitizeZipPart(setName)}.zip`;
}

export function zipRootFolderForDelivery(collectionName, setName) {
  const delivery = sanitizeZipPart(collectionName, 'delivery');
  if (!setName) return delivery;
  return `${delivery}/${sanitizeZipPart(setName)}`;
}

export function zipFolderForPhoto(photo, sets = [], highlightsName = 'Highlights') {
  if (!photo?.set_id) return sanitizeZipPart(highlightsName, 'Highlights');
  const matched = sets.find((set) => String(set.id) === String(photo.set_id));
  return sanitizeZipPart(matched?.name, 'Set');
}

/** Force Content-Disposition: attachment so the browser download shelf takes over. */
export function withNativeDownloadParams(url, filename) {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://pixnxt.in');
    parsed.searchParams.set('download', '1');
    if (filename) parsed.searchParams.set('filename', filename);
    return parsed.toString();
  } catch {
    return url;
  }
}

function isLocalDevHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || String(hostname || '').endsWith('.localhost');
}

/**
 * Localhost must use the Vite `/v1` proxy. A workers.dev href is cross-origin,
 * so Chrome ignores `download` and navigates the studio to a JSON 404.
 */
export function toSameOriginMediaUrl(url) {
  if (!url) return '';
  const proxied = getProxiedMediaFetchUrl(url) || url;
  if (typeof window === 'undefined' || !window.location?.origin) return proxied;
  try {
    const parsed = new URL(proxied, window.location.origin);
    if (isLocalDevHost(window.location.hostname) && parsed.pathname.includes('/v1/r2/media')) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return proxied;
  }
}

/** Public R2 / Images hosts hang on JS fetch (CORS). Never request them directly. */
export function canFetchStudioMedia(href) {
  if (!href) return false;
  try {
    const parsed = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://pixnxt.in');
    const host = String(parsed.hostname || '').toLowerCase();
    if (
      host.endsWith('.r2.dev')
      || host.endsWith('.r2.cloudflarestorage.com')
      || host.includes('imagedelivery.net')
    ) {
      return false;
    }
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return true;
    return parsed.pathname.includes('/v1/r2/media') || parsed.pathname.includes('/api/r2-media');
  } catch {
    return false;
  }
}

export function hrefsForStudioFetch(url) {
  const out = [];
  const push = (href) => {
    if (!href || out.includes(href) || !canFetchStudioMedia(href)) return;
    out.push(href);
  };
  push(toSameOriginPathStyleMediaUrl(url));
  push(toSameOriginMediaUrl(url));
  push(getProxiedMediaFetchUrl(url));
  return out;
}

function sourceUrlForPhoto(photo) {
  return getPhotoDownloadUrl(photo) || getPhotoDownloadUrlCandidates(photo)[0] || '';
}

export function nativeDownloadJobs(photos = []) {
  const list = (Array.isArray(photos) ? photos : []).filter(Boolean);
  const usedNames = new Set();
  return list.map((photo, index) => {
    const filename = getPhotoDownloadFilename(photo, index, usedNames);
    const source = sourceUrlForPhoto(photo);
    const href = source ? withNativeDownloadParams(toSameOriginMediaUrl(source), filename) : '';
    return { href, filename };
  }).filter((job) => job.href);
}

function isAbortError(err) {
  return err?.name === 'AbortError';
}

async function defaultPickDirectory() {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    throw new Error('Use Chrome or Edge to save this folder.');
  }
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

async function ensureDirectoryPath(rootHandle, path) {
  let dir = rootHandle;
  for (const part of String(path || '').split('/').filter(Boolean)) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir;
}

async function writeBlobToDirectory(dirHandle, filename, blob) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

function normalizeDownloadPhoto(photo) {
  if (!photo || typeof photo !== 'object') return photo;
  return {
    ...photo,
    full_url: photo.full_url || photo.fullUrl || '',
    web_url: photo.web_url || photo.webUrl || '',
    thumbnail_url: photo.thumbnail_url || photo.thumbnailUrl || '',
    original_storage_path: photo.original_storage_path || photo.originalStoragePath || photo.storagePath || '',
    web_storage_path: photo.web_storage_path || photo.webStoragePath || '',
    filename: photo.filename || photo.name || '',
  };
}

function isUsableDownloadUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (/^blob:|^data:/i.test(url)) return false;
  if (/\.m3u8(\?|$)/i.test(url) || /manifest\/video/i.test(url)) return false;
  return true;
}

function candidateDownloadUrls(photo, options = {}) {
  const resolution = options.resolution || 'original';
  const urls = [];
  const push = (value) => {
    if (!isUsableDownloadUrl(value) || urls.includes(value)) return;
    urls.push(value);
  };
  if (isVideoMedia(photo)) {
    push(photo.full_url);
    push(photo.original_storage_path);
    push(photo.web_url);
    const videoSrc = getPhotoVideoSrc(photo);
    if (isUsableDownloadUrl(videoSrc)) push(videoSrc);
    push(photo.thumbnail_url);
  } else if (resolution === 'original') {
    push(photo.original_storage_path);
    push(photo.full_url);
    push(getPhotoFullDisplayUrl(photo));
    push(photo.web_url);
    push(photo.thumbnail_url);
  } else if (resolution === 'full') {
    push(photo.full_url);
    push(getPhotoFullDisplayUrl(photo));
    push(photo.web_url);
    push(photo.original_storage_path);
    push(photo.thumbnail_url);
  } else {
    push(getPhotoGridDisplayUrl(photo, true));
    push(photo.web_url);
    push(photo.web_storage_path);
    push(photo.full_url);
    push(photo.thumbnail_url);
    push(photo.original_storage_path);
  }
  push(getPhotoDownloadUrl(photo));
  for (const url of getPhotoDownloadUrlCandidates(photo)) push(url);
  return urls;
}

async function fetchHrefBlob(href, onBytes) {
  const controller = new AbortController();
  const headerTimer = setTimeout(() => controller.abort(), 12_000);
  let response;
  try {
    response = await fetch(href, {
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(headerTimer);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = String(response.headers.get('content-type') || '');
  if (/json|text\/html|mpegurl|m3u8/i.test(type)) throw new Error(`Non-media ${type}`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('Empty response');
    onBytes?.(buffer.byteLength, total || buffer.byteLength);
    return new Blob([buffer], { type: type || 'application/octet-stream' });
  }
  const chunks = [];
  let received = 0;
  let stall = setTimeout(() => controller.abort(), 20_000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(stall);
      stall = setTimeout(() => controller.abort(), 20_000);
      chunks.push(value);
      received += value.byteLength;
      onBytes?.(received, total);
    }
  } finally {
    clearTimeout(stall);
  }
  if (!received) throw new Error('Empty response');
  onBytes?.(received, total || received);
  return new Blob(chunks, { type: type || 'application/octet-stream' });
}

export async function fetchDeliveryBlob(photo, onBytes, options = {}) {
  const normalized = normalizeDownloadPhoto(photo);
  const fallbackTotal = Number(normalized.size_bytes) || 0;
  const report = (received, total) => onBytes?.(received, total || fallbackTotal);
  const tried = new Set();
  const resolution = options.resolution || 'original';
  const videoResolution = options.videoResolution || 'original';

  for (const url of candidateDownloadUrls(normalized, options)) {
    for (const href of hrefsForStudioFetch(url)) {
      if (tried.has(href)) continue;
      tried.add(href);
      try {
        const blob = await fetchHrefBlob(href, report);
        if (blob?.size) return blob;
      } catch (err) {
        console.warn('Studio download fetch failed', href, err);
      }
    }
  }
  const fallback = await fetchPhotoBlob(normalized, {
    preferOriginal: resolution === 'original',
    resolution,
    videoResolution,
    timeoutMs: options.timeoutMs || 25_000,
  });
  if (fallback?.size) report(fallback.size, fallback.size);
  return fallback;
}

/**
 * Pick a parent folder during the click, create a folder named after the
 * delivery, and write each photo/video as soon as it arrives. A zip of a
 * 1GB delivery never finishes, which is why Chrome asked for a folder and
 * then nothing appeared.
 */
export async function startNativePhotoDownloads(photos = [], options = {}) {
  let list = (Array.isArray(photos) ? photos : []).filter(Boolean);
  if (options.includeVideos === false) {
    list = list.filter((p) => !isVideoMedia(p));
  }
  if (!list.length) return { started: 0, saved: 0, failed: 0, cancelled: false };

  const collectionName = options.collectionName || 'delivery';
  const setName = options.setName || null;
  const folderName = zipRootFolderForDelivery(collectionName, setName);
  const pickDirectory = options.pickDirectory || defaultPickDirectory;

  let rootHandle;
  try {
    rootHandle = await pickDirectory();
  } catch (err) {
    if (isAbortError(err)) return { started: 0, saved: 0, failed: 0, cancelled: true };
    throw err;
  }
  if (!rootHandle) return { started: 0, saved: 0, failed: 0, cancelled: true };

  options.onPicked?.(folderName, list.length);
  const dest = await ensureDirectoryPath(rootHandle, folderName);
  const usedNames = new Set();
  const names = list.map((photo, index) => getPhotoDownloadFilename(photo, index, usedNames));

  let saved = 0;
  let failed = 0;
  let lastProgress = 0;
  for (let index = 0; index < list.length; index += 1) {
    const filename = names[index];
    const emit = (patch) => {
      options.onProgress?.({
        folderName,
        total: list.length,
        index,
        filename,
        saved,
        failed,
        phase: 'fetching',
        bytesReceived: 0,
        bytesTotal: Number(list[index]?.size_bytes) || 0,
        ...patch,
      });
    };
    emit({ phase: 'fetching' });
    try {
      const blob = await fetchDeliveryBlob(
        list[index],
        (bytesReceived, bytesTotal) => {
          const now = Date.now();
          if (now - lastProgress < 80 && bytesReceived < bytesTotal) return;
          lastProgress = now;
          emit({ phase: 'fetching', bytesReceived, bytesTotal });
        },
        {
          resolution: options.resolution,
          videoResolution: options.videoResolution,
        }
      );
      if (!blob) {
        failed += 1;
        continue;
      }
      emit({ phase: 'writing', bytesReceived: blob.size, bytesTotal: blob.size });
      await writeBlobToDirectory(dest, filename, blob);
      saved += 1;
      options.onFileSaved?.(saved, list.length, filename);
    } catch (err) {
      failed += 1;
      console.warn('Studio download failed', filename, err);
    }
  }
  return {
    started: saved,
    saved,
    failed,
    cancelled: false,
    folderName,
  };
}
