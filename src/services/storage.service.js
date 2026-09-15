import { getFileMime } from '../lib/fileMime';
import { R2_PUBLIC_URL } from '../lib/r2';
import { apiBase, getAccessToken } from '../lib/api/client';
/**
 * Upload through the Workers API (flag on): same XHR progress/cancel
 * semantics, but the browser never holds storage credentials and legacy
 * `users/<folder>/…` keys are preserved server-side.
 */
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
    const params = new URLSearchParams({ path });
    xhr.open('PUT', `${apiBase()}/v1/r2/upload?${params.toString()}`, true);
    xhr.setRequestHeader('Content-Type', contentType);
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
      // Workers API signs/owns storage server-side — no client bucket env needed.
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
