import { getFileMime } from '../lib/fileMime';
import { R2_PUBLIC_URL } from '../lib/r2';
import { apiBase, getAccessToken } from '../lib/api/client';
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
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ path: data?.path || path, url: storageService.getPublicUrl(data?.path || path) });
        } catch {
          resolve({ path, url: storageService.getPublicUrl(path) });
        }
        return;
      }
      reject(new Error(`Upload rejected (${xhr.status}).`));
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

/** null = not probed, false = Worker proxy, true = presigned R2. */
let directUploadEnabled = null;
const DIRECT_MIN_BYTES = 5 * 1024 * 1024;
const DIRECT_PART_PARALLEL = 6;

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
      reject(new Error(`Upload rejected (${xhr.status}).`));
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

async function uploadDirect(path, file, contentType, onProgress, abortSignal) {
  const { apiFetch } = await import('../lib/api/client');
  const plan = await apiFetch('/v1/r2/direct', {
    method: 'POST',
    body: { path, contentType, size: file.size },
  });
  if (!plan?.enabled) {
    directUploadEnabled = false;
    return uploadViaWorkersApi(path, file, contentType, onProgress, abortSignal);
  }
  directUploadEnabled = true;
  if (plan.mode === 'put' && plan.url) {
    await xhrPut(plan.url, file, contentType, onProgress, abortSignal);
    return { path: plan.path || path, url: storageService.getPublicUrl(plan.path || path) };
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
      const etag = await xhrPut(
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
  await apiFetch('/v1/r2/direct/complete', {
    method: 'POST',
    body: { path, uploadId: plan.uploadId, parts: etags.filter(Boolean) },
  });
  onProgress?.(100);
  return { path: plan.path || path, url: storageService.getPublicUrl(plan.path || path) };
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
      // Originals (and other files over 5 MB) go straight to R2 when an S3
      // token is configured. Derivatives stay on the Worker proxy.
      if (directUploadEnabled !== false && body.size >= DIRECT_MIN_BYTES) {
        try {
          return await uploadDirect(path, body, contentType, onProgress, abortSignal);
        } catch (err) {
          if (abortSignal?.aborted || /cancelled/i.test(err?.message || '')) throw err;
          console.warn('Direct R2 upload failed, using Worker proxy', err);
          directUploadEnabled = false;
        }
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

  /** List object keys under a prefix (photographer album folders on R2). */
  async listByPrefix(prefix, { maxKeys = 1000 } = {}) {
    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch(`/v1/r2/list?prefix=${encodeURIComponent(String(prefix || '').replace(/^\/+/, ''))}`);
    return (data?.objects || []).slice(0, maxKeys);
  },
};
