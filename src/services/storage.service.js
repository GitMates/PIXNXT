import { getFileMime } from '../lib/fileMime';
import { R2_PUBLIC_URL } from '../lib/r2';
import { apiBase, uploadApiBase, getAccessToken } from '../lib/api/client';
import { chunkArray } from '../components/features/CollectionDashboard/Upload/uploadUtils';

/**
 * Non-2xx XHR → Error carrying what the queue needs to decide retry-vs-fail.
 * The Workers API answers `{ error: { code, message } }`; presigned R2 PUTs
 * answer XML, which falls through to the generic message.
 */
export function uploadErrorFromXhr(xhr) {
  let message = `Upload rejected (${xhr.status}).`;
  let code;
  try {
    const payload = JSON.parse(xhr.responseText || '');
    if (payload?.error?.message) message = payload.error.message;
    if (payload?.error?.code) code = payload.error.code;
  } catch {
    // not JSON — keep the generic message
  }
  const err = new Error(message);
  err.status = xhr.status;
  if (code) err.code = code;
  const retryAfter = Number(xhr.getResponseHeader?.('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = retryAfter * 1000;
  return err;
}

export function isRateLimitedError(err) {
  if (!err) return false;
  if (err.code === 'RATE_LIMITED' || err.status === 429) return true;
  return /rate exceeded|too many requests/i.test(String(err.message || ''));
}

/**
 * Upload through the Workers API (flag on): same XHR progress/cancel
 * semantics, but the browser never holds storage credentials and legacy
 * `users/<folder>/…` keys are preserved server-side.
 */
/** One OPTIONS for the whole batch: path travels in a header, not the query string. */
function uploadViaWorkersApi(path, file, contentType, onProgress, abortSignal) {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    const token = getAccessToken();
    if (!token) {
      reject(new Error('Sign in again to upload.'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${uploadApiBase()}/v1/r2/upload`, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('X-Object-Key', path);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.withCredentials = true;

    const onAbort = () => xhr.abort();
    abortSignal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => abortSignal?.removeEventListener('abort', onAbort);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ path: data?.path || path, url: storageService.getPublicUrl(data?.path || path) });
        } catch {
          resolve({ path, url: storageService.getPublicUrl(path) });
        }
        return;
      }
      reject(uploadErrorFromXhr(xhr));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error uploading to storage.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new Error('Upload cancelled.'));
    };

    xhr.send(file);
  });
}

/** Worker request bodies stop at 100 MB on this account. Stay under that. */
const WORKER_PROXY_MAX = 80 * 1024 * 1024;
// 8 MiB parts survive the edge reset that killed 64 MB parts mid-send.
const WORKER_PART_BYTES = 8 * 1024 * 1024;
const WORKER_PART_PARALLEL = 3;
const PART_ATTEMPTS = 5;

/**
 * Direct-to-R2 availability. `disabledByServer` is permanent (the Worker has
 * no S3 credentials). Anything else is transient: back off for a window and
 * come back. The old module-level boolean flipped to "proxy forever" on the
 * first hiccup, which sent every remaining file through the Worker.
 */
export function __directUploadGate({ now = () => Date.now(), backoffMs = 30_000 } = {}) {
  let disabledByServer = false;
  let pausedUntil = 0;
  return {
    available: () => !disabledByServer && now() >= pausedUntil,
    noteDisabledByServer: () => { disabledByServer = true; },
    noteTransientFailure: () => { pausedUntil = now() + backoffMs; },
    noteSuccess: () => { pausedUntil = 0; },
  };
}
const directGate = __directUploadGate();
const DIRECT_PUT_ATTEMPTS = 3;
const DIRECT_PART_PARALLEL = 6;
const presignWaiters = [];
let presignScheduled = false;

function xhrPut(url, body, contentType, onProgress, abortSignal, { wantEtag = false, sendType = true } = {}) {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    if (sendType && contentType) xhr.setRequestHeader('Content-Type', contentType);
    const onAbort = () => xhr.abort();
    abortSignal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => abortSignal?.removeEventListener('abort', onAbort);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(wantEtag ? xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '' : null);
        return;
      }
      reject(uploadErrorFromXhr(xhr));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error uploading to storage.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error('Upload cancelled.'));
    };
    xhr.send(body);
  });
}

/** Presigned PUT with the same retry policy as Worker parts. */
async function xhrPutReliable(url, body, contentType, onProgress, abortSignal, opts) {
  let lastError = null;
  for (let attempt = 0; attempt < DIRECT_PUT_ATTEMPTS; attempt += 1) {
    try {
      return await xhrPut(url, body, contentType, onProgress, abortSignal, opts);
    } catch (err) {
      if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) throw err;
      lastError = err;
      if (!retryablePartError(err) || attempt === DIRECT_PUT_ATTEMPTS - 1) throw err;
      await waitForRetry(700 * (attempt + 1), abortSignal);
    }
  }
  throw lastError || new Error('Network error uploading to storage.');
}

function xhrPart(path, uploadId, partNumber, blob, onProgress, abortSignal) {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    const token = getAccessToken();
    if (!token) {
      reject(new Error('Sign in again to upload.'));
      return;
    }
    // Large parts go straight to the API. The Vite proxy drops them with
    // ERR_CONNECTION_TIMED_OUT once a multi-GB file is in flight.
    const base = apiBase();
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${base}/v1/r2/multipart/part`, true);
    xhr.timeout = 180000;
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.setRequestHeader('X-Object-Key', path);
    xhr.setRequestHeader('X-Upload-Id', uploadId);
    xhr.setRequestHeader('X-Part-Number', String(partNumber));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.withCredentials = true;
    const onAbort = () => xhr.abort();
    abortSignal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => abortSignal?.removeEventListener('abort', onAbort);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data?.etag) {
            reject(new Error('Upload part did not return a checksum.'));
            return;
          }
          onProgress?.(100);
          resolve(data.etag);
          return;
        } catch {
          reject(new Error('Upload part response was unreadable.'));
          return;
        }
      }
      reject(uploadErrorFromXhr(xhr));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error uploading to storage.'));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('Network error uploading to storage.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error('Upload cancelled.'));
    };
    xhr.send(blob);
  });
}

function retryablePartError(err) {
  if (isRateLimitedError(err)) return false; // the queue handles rate limits — don't hammer
  const msg = String(err?.message || '');
  return /Network error uploading/i.test(msg) || /Upload rejected \(5\d\d\)/.test(msg) || err?.status >= 500;
}

function waitForRetry(ms, abortSignal) {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    const timer = setTimeout(() => {
      abortSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Upload cancelled.'));
    };
    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** One part, retried when the edge resets the socket mid-send. */
async function xhrPartReliable(path, uploadId, partNumber, blob, onProgress, abortSignal) {
  let lastError = null;
  for (let attempt = 0; attempt < PART_ATTEMPTS; attempt += 1) {
    try {
      return await xhrPart(path, uploadId, partNumber, blob, onProgress, abortSignal);
    } catch (err) {
      if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) throw err;
      lastError = err;
      if (!retryablePartError(err) || attempt === PART_ATTEMPTS - 1) throw err;
      await waitForRetry(700 * (attempt + 1), abortSignal);
    }
  }
  throw lastError || new Error('Network error uploading to storage.');
}

/** Files the Worker cannot take in one request are sent as 8 MB parts. */
async function uploadViaWorkerParts(path, file, contentType, onProgress, abortSignal) {
  const { apiFetch } = await import('../lib/api/client');
  const started = await apiFetch('/v1/r2/multipart/start', {
    method: 'POST',
    body: { path, contentType, size: file.size },
  });
  const partSize = Number(started?.partSize) || WORKER_PART_BYTES;
  const uploadId = started?.uploadId;
  if (!uploadId) throw new Error('Could not start the large-file upload.');
  const partCount = Math.ceil(file.size / partSize);
  const loaded = new Array(partCount).fill(0);
  const etags = new Array(partCount);
  let cursor = 0;
  let stopped = false;
  const report = () => {
    const sum = loaded.reduce((acc, n) => acc + n, 0);
    onProgress?.(Math.min(99, Math.round((sum / file.size) * 100)));
  };
  const run = async () => {
    while (!stopped && cursor < partCount) {
      const index = cursor;
      cursor += 1;
      const start = index * partSize;
      const end = Math.min(file.size, start + partSize);
      const blob = file.slice(start, end);
      const etag = await xhrPartReliable(
        path,
        uploadId,
        index + 1,
        blob,
        (percent) => {
          loaded[index] = (percent / 100) * (end - start);
          report();
        },
        abortSignal
      );
      etags[index] = { partNumber: index + 1, etag };
      loaded[index] = end - start;
      report();
    }
  };
  try {
    await Promise.all(
      Array.from({ length: Math.min(WORKER_PART_PARALLEL, partCount) }, () => run())
    );
    await apiFetch('/v1/r2/multipart/complete', {
      method: 'POST',
      body: { path, uploadId, parts: etags.filter(Boolean) },
    });
  } catch (err) {
    stopped = true;
    if (!abortSignal?.aborted) {
      await apiFetch('/v1/r2/multipart/abort', {
        method: 'POST',
        body: { path, uploadId },
      }).catch(() => {});
    }
    throw err;
  }
  onProgress?.(100);
  return { path, url: storageService.getPublicUrl(path), size: file.size };
}

function schedulePresignFlush() {
  if (presignScheduled) return;
  presignScheduled = true;
  // A short window so the concurrent originals (and a wave of thumbs) share
  // one sign request instead of one POST per file.
  setTimeout(() => {
    presignScheduled = false;
    void flushPresigns();
  }, 30);
}

/** One Worker call signs every file that started in the same turn. */
function planFor(path, file, contentType) {
  if (!directGate.available()) return Promise.resolve(null);
  return new Promise((resolve) => {
    presignWaiters.push({ path, file, contentType, resolve });
    schedulePresignFlush();
  });
}

async function flushPresigns() {
  const batch = presignWaiters.splice(0, 24);
  if (!batch.length) return;
  if (presignWaiters.length) schedulePresignFlush();
  try {
    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch('/v1/r2/direct', {
      method: 'POST',
      body: {
        items: batch.map((item) => ({
          path: item.path,
          contentType: item.contentType,
          size: item.file.size,
        })),
      },
    });
    if (!data?.enabled) {
      directGate.noteDisabledByServer();
      batch.forEach((item) => item.resolve(null));
      return;
    }
    const plans = data.items || [];
    batch.forEach((item, index) => item.resolve(plans[index] || null));
  } catch {
    directGate.noteTransientFailure();
    batch.forEach((item) => item.resolve(null));
  }
}

async function uploadFromPlan(plan, file, contentType, onProgress, abortSignal) {
  if (plan.mode === 'put' && plan.url) {
    await xhrPutReliable(plan.url, file, contentType, onProgress, abortSignal);
    return { path: plan.path, url: storageService.getPublicUrl(plan.path) };
  }
  const parts = plan.parts || [];
  if (!parts.length || !plan.uploadId) throw new Error('Direct upload plan was empty.');
  const loaded = new Array(parts.length).fill(0);
  const etags = new Array(parts.length);
  const queue = parts.slice();
  const report = () => {
    const sum = loaded.reduce((acc, n) => acc + n, 0);
    onProgress?.(Math.min(99, Math.round((sum / file.size) * 100)));
  };
  const run = async () => {
    while (queue.length) {
      const part = queue.shift();
      if (!part) break;
      const blob = file.slice(part.start, part.end);
      const size = part.end - part.start;
      const etag = await xhrPutReliable(
        part.url,
        blob,
        contentType,
        (percent) => {
          loaded[part.partNumber - 1] = (percent / 100) * size;
          report();
        },
        abortSignal,
        { wantEtag: true, sendType: false }
      );
      if (!etag) throw new Error('Missing part ETag. R2 bucket CORS must expose ETag.');
      etags[part.partNumber - 1] = { partNumber: part.partNumber, etag };
    }
  };
  await Promise.all(Array.from({ length: Math.min(DIRECT_PART_PARALLEL, parts.length) }, () => run()));
  const { apiFetch } = await import('../lib/api/client');
  await apiFetch('/v1/r2/direct/complete', {
    method: 'POST',
    body: { path: plan.path, uploadId: plan.uploadId, parts: etags.filter(Boolean) },
  });
  onProgress?.(100);
  return { path: plan.path, url: storageService.getPublicUrl(plan.path) };
}

/**
 * Bulk HEAD via one Worker call per chunk. A failed chunk reports every path
 * as missing — same conservative default as the single `exists()`, which
 * re-uploads an original rather than risk a photo with no master file.
 */
export async function __existsManyWith(fetchJson, paths, { chunkSize = 200, concurrency = 2 } = {}) {
  const result = new Map();
  const chunks = chunkArray([...new Set(paths.filter(Boolean))], chunkSize);
  const queue = chunks.slice();
  const run = async () => {
    while (queue.length) {
      const chunk = queue.shift();
      if (!chunk) break;
      try {
        const data = await fetchJson('/v1/r2/stat-many', { method: 'POST', body: { paths: chunk } });
        for (const p of chunk) result.set(p, data?.exists?.[p] === true);
      } catch {
        for (const p of chunk) result.set(p, false);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, run));
  return result;
}

export const storageService = {
  /** @param {AbortSignal} [abortSignal] */
  async upload(path, file, onProgress, abortSignal) {
    try {
      const contentType = getFileMime(file);
      const body =
        file.type === contentType
          ? file
          : new File([file], file.name || 'upload', {
              type: contentType,
              lastModified: file.lastModified,
            });

      onProgress?.(2);
      // Originals and derivatives share one presign batch, then PUT straight
      // to R2 (multipart, 6 parts at a time). The Worker proxy is only for
      // files the edge can accept. A multi-GB video must not fall back to it:
      // the connection is reset and the browser reports a network error.
      const tooLargeForProxy = body.size > WORKER_PROXY_MAX;
      if (directGate.available()) {
        const plan = await planFor(path, body, contentType);
        if (plan?.enabled) {
          try {
            const result = await uploadFromPlan(plan, body, contentType, onProgress, abortSignal);
            directGate.noteSuccess();
            return result;
          } catch (err) {
            if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) throw err;
            // This file falls back to the proxy; the next presign batch tries direct again after the backoff.
            directGate.noteTransientFailure();
            console.warn('Direct R2 upload failed after retries, using Worker proxy for this file', err);
          }
        }
      }
      if (tooLargeForProxy) {
        return await uploadViaWorkerParts(path, body, contentType, onProgress, abortSignal);
      }
      return await uploadViaWorkersApi(path, body, contentType, onProgress, abortSignal);
    } catch (error) {
      console.error('R2 Upload Error:', {
        message: error.message,
        name: error.name,
        path,
      });

      throw error;
    }
  },

  async delete(paths) {
    const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
    if (list.length === 0) return;
    const { apiFetch } = await import('../lib/api/client');
    await apiFetch('/v1/r2/objects', { method: 'DELETE', body: { paths: list.slice(0, 100) } });
  },

  getPublicUrl(path) {
    if (path == null || path === '') return path;
    const trimmed = String(path).trim();
    if (!trimmed) return trimmed;
    // Already absolute / inlined — never double-prefix (causes R2 400/404).
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
    if (!R2_PUBLIC_URL) {
      console.warn('VITE_R2_PUBLIC_URL is not defined');
      return trimmed;
    }
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    const key = trimmed.replace(/^\//, '');
    if (key.startsWith(baseUrl)) return key;
    return `${baseUrl}${key}`;
  },

  /** Returns true when an object exists at `path` in R2. */
  async exists(path) {
    if (!path) return false;
    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch(`/v1/r2/stat?path=${encodeURIComponent(path)}`).catch(() => null);
    return data?.exists === true;
  },

  /** @returns {Promise<Map<string, boolean>>} path → exists */
  async existsMany(paths) {
    const { apiFetch } = await import('../lib/api/client');
    return __existsManyWith(apiFetch, paths);
  },

  /** List object keys under a prefix (photographer album folders on R2). */
  async listByPrefix(prefix, { maxKeys = 1000 } = {}) {
    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch(`/v1/r2/list?prefix=${encodeURIComponent(String(prefix || '').replace(/^\/+/, ''))}`);
    return (data?.objects || []).slice(0, maxKeys);
  },
};
