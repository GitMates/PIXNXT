import { getFileMime } from '../lib/fileMime';
import { R2_PUBLIC_URL } from '../lib/r2';
import {
  apiBase,
  ensureFreshAccessToken,
  refreshAccessToken,
} from '../lib/api/client';
import { chunkArray } from '../components/features/CollectionDashboard/Upload/uploadUtils';

/** Session/network failures that should keep multipart state for Resume. */
export function isResumableUploadError(err) {
  if (!err) return false;
  if (err.resumable === true) return true;
  if (err.status === 401 || err.status === 403) return true;
  const msg = String(err.message || '');
  return /session expired|sign in again|authentication required|unauthorized|network error uploading|upload rejected \(5\d\d\)|could not start the large-file/i.test(
    msg
  );
}

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
async function uploadViaWorkersApi(path, file, contentType, onProgress, abortSignal, options = {}) {
  const sendOnce = (token) =>
    new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Upload cancelled.'));
        return;
      }
      if (!token) {
        reject(new Error('Sign in again to upload.'));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${apiBase()}/v1/r2/upload`, true);
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
          options?.onConfirmedBytes?.(file.size);
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

  let token = await ensureFreshAccessToken();
  try {
    return await sendOnce(token);
  } catch (err) {
    if (err?.status === 401) {
      token = await refreshAccessToken();
      if (token) return sendOnce(token);
    }
    throw err;
  }
}

/** Worker request bodies stop at 100 MB on this account. Stay under that. */
const WORKER_PROXY_MAX = 80 * 1024 * 1024;
// 8 MiB parts survive the edge reset that killed 64 MB parts mid-send.
const WORKER_PART_BYTES = 8 * 1024 * 1024;
const WORKER_PART_PARALLEL = 3;
const PART_ATTEMPTS = 5;

/** Equal jitter around 1s, 2s, 4s. `attempt` is 0-based. */
export function retryDelayMs(attempt, { random = Math.random, baseMs = 1000, capMs = 4000 } = {}) {
  const base = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.5 + random()));
}

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
/** Enough parallel parts to hide high RTT (e.g. India → R2). */
export const DIRECT_PART_PARALLEL = 3;

export function resolveUploadStrategy({
  fileSize,
  workerProxyMax = WORKER_PROXY_MAX,
  resumeCheckpoint = null,
  directAvailable,
  plan,
}) {
  const tooLargeForProxy = fileSize > workerProxyMax;
  if (resumeCheckpoint?.uploadId && tooLargeForProxy) {
    return { type: 'worker-parts' };
  }
  if (directAvailable && plan?.enabled) {
    return { type: 'direct', plan };
  }
  if (tooLargeForProxy) return { type: 'worker-parts' };
  return { type: 'worker-put' };
}

/** After a signed R2 plan exists, retry R2 — do not dump the body through the Worker. */
export function allowWorkerProxyFallback(hadEnabledDirectPlan) {
  return hadEnabledDirectPlan !== true;
}

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
      await waitForRetry(retryDelayMs(attempt), abortSignal);
    }
  }
  throw lastError || new Error('Network error uploading to storage.');
}

function xhrPartOnce(path, uploadId, partNumber, blob, onProgress, abortSignal, token) {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    if (!token) {
      const err = new Error('Sign in again to upload.');
      err.status = 401;
      err.resumable = true;
      reject(err);
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

async function xhrPart(path, uploadId, partNumber, blob, onProgress, abortSignal) {
  let token = await ensureFreshAccessToken();
  try {
    return await xhrPartOnce(path, uploadId, partNumber, blob, onProgress, abortSignal, token);
  } catch (err) {
    if (err?.status === 401 && !abortSignal?.aborted) {
      token = await refreshAccessToken();
      if (token) {
        return xhrPartOnce(path, uploadId, partNumber, blob, onProgress, abortSignal, token);
      }
      err.resumable = true;
    }
    throw err;
  }
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
      await waitForRetry(retryDelayMs(attempt), abortSignal);
    }
  }
  throw lastError || new Error('Network error uploading to storage.');
}

function snapshotMultipartCheckpoint(path, uploadId, partSize, etags) {
  return {
    path,
    uploadId,
    partSize,
    etags: etags.map((entry) => (entry ? { partNumber: entry.partNumber, etag: entry.etag } : null)),
  };
}

/** Files the Worker cannot take in one request are sent as 8 MB parts. */
async function uploadViaWorkerParts(path, file, contentType, onProgress, abortSignal, options = {}) {
  const { apiFetch } = await import('../lib/api/client');
  const resume = options.resumeCheckpoint;
  const onCheckpoint = options.onCheckpoint;

  let partSize = WORKER_PART_BYTES;
  let uploadId = null;
  let etags = [];

  const canResume =
    resume
    && resume.uploadId
    && resume.path === path
    && Array.isArray(resume.etags);

  if (canResume) {
    uploadId = resume.uploadId;
    partSize = Number(resume.partSize) || WORKER_PART_BYTES;
    etags = resume.etags.map((entry) =>
      entry?.etag ? { partNumber: Number(entry.partNumber), etag: String(entry.etag) } : null
    );
  } else {
    const started = await apiFetch('/v1/r2/multipart/start', {
      method: 'POST',
      body: { path, contentType, size: file.size },
    });
    partSize = Number(started?.partSize) || WORKER_PART_BYTES;
    uploadId = started?.uploadId;
    if (!uploadId) throw new Error('Could not start the large-file upload.');
    etags = [];
  }

  const partCount = Math.ceil(file.size / partSize);
  while (etags.length < partCount) etags.push(null);
  const loaded = new Array(partCount).fill(0);
  for (let i = 0; i < partCount; i += 1) {
    if (etags[i]?.etag) {
      const start = i * partSize;
      const end = Math.min(file.size, start + partSize);
      loaded[i] = end - start;
    }
  }
  const pending = [];
  for (let i = 0; i < partCount; i += 1) {
    if (!etags[i]?.etag) pending.push(i);
  }

  let stopped = false;
  const report = () => {
    const sum = loaded.reduce((acc, n) => acc + n, 0);
    onProgress?.(Math.min(99, Math.round((sum / file.size) * 100)));
  };
  const reportConfirmed = () => {
    const confirmed = loaded.reduce((acc, n, i) => acc + (etags[i]?.etag ? n : 0), 0);
    options.onConfirmedBytes?.(confirmed);
  };
  report();
  reportConfirmed();
  onCheckpoint?.(snapshotMultipartCheckpoint(path, uploadId, partSize, etags));

  const run = async () => {
    while (!stopped && pending.length > 0) {
      const index = pending.shift();
      if (index == null) break;
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
      reportConfirmed();
      onCheckpoint?.(snapshotMultipartCheckpoint(path, uploadId, partSize, etags));
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(WORKER_PART_PARALLEL, Math.max(pending.length, 1)) }, () => run())
    );
    await apiFetch('/v1/r2/multipart/complete', {
      method: 'POST',
      body: { path, uploadId, parts: etags.filter(Boolean) },
    });
  } catch (err) {
    stopped = true;
    const checkpoint = snapshotMultipartCheckpoint(path, uploadId, partSize, etags);
    if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) {
      await apiFetch('/v1/r2/multipart/abort', {
        method: 'POST',
        body: { path, uploadId },
      }).catch(() => {});
      throw err;
    }
    if (isResumableUploadError(err) || retryablePartError(err)) {
      err.resumable = true;
      err.multipartCheckpoint = checkpoint;
      onCheckpoint?.(checkpoint);
      // Keep R2 multipart open so Resume can continue from finished parts.
      throw err;
    }
    await apiFetch('/v1/r2/multipart/abort', {
      method: 'POST',
      body: { path, uploadId },
    }).catch(() => {});
    throw err;
  }
  onProgress?.(100);
  options.onConfirmedBytes?.(file.size);
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

async function uploadFromPlan(plan, file, contentType, onProgress, abortSignal, options = {}) {
  if (plan.mode === 'put' && plan.url) {
    await xhrPutReliable(plan.url, file, contentType, onProgress, abortSignal);
    options.onConfirmedBytes?.(file.size);
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
  const reportConfirmed = () => {
    const confirmed = parts.reduce((acc, part) => {
      if (!etags[part.partNumber - 1]?.etag) return acc;
      return acc + (part.end - part.start);
    }, 0);
    options.onConfirmedBytes?.(confirmed);
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
      reportConfirmed();
    }
  };
  await Promise.all(Array.from({ length: Math.min(DIRECT_PART_PARALLEL, parts.length) }, () => run()));
  const { apiFetch } = await import('../lib/api/client');
  await apiFetch('/v1/r2/direct/complete', {
    method: 'POST',
    body: { path: plan.path, uploadId: plan.uploadId, parts: etags.filter(Boolean) },
  });
  onProgress?.(100);
  options.onConfirmedBytes?.(file.size);
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
  /**
   * @param {AbortSignal} [abortSignal]
   * @param {{ resumeCheckpoint?: object, onCheckpoint?: (cp: object) => void, onConfirmedBytes?: (n: number) => void }} [options]
   */
  async upload(path, file, onProgress, abortSignal, options = {}) {
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
      const partOptions = {
        resumeCheckpoint: options.resumeCheckpoint,
        onCheckpoint: options.onCheckpoint,
        onConfirmedBytes: options.onConfirmedBytes,
      };
      let plan = null;
      if (directGate.available()) {
        plan = await planFor(path, body, contentType);
      }
      const strategy = resolveUploadStrategy({
        fileSize: body.size,
        resumeCheckpoint: partOptions.resumeCheckpoint,
        directAvailable: directGate.available(),
        plan,
      });

      if (strategy.type === 'direct') {
        try {
          const result = await uploadFromPlan(
            strategy.plan,
            body,
            contentType,
            onProgress,
            abortSignal,
            partOptions
          );
          directGate.noteSuccess();
          return result;
        } catch (err) {
          if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) throw err;
          if (!allowWorkerProxyFallback(true)) {
            directGate.noteTransientFailure();
            throw err;
          }
        }
      }

      if (strategy.type === 'worker-parts') {
        return await uploadViaWorkerParts(
          path,
          body,
          contentType,
          onProgress,
          abortSignal,
          partOptions
        );
      }
      return await uploadViaWorkersApi(path, body, contentType, onProgress, abortSignal, partOptions);
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
