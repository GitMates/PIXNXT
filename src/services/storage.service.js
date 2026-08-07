import {
  PutObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getFileMime } from '../lib/fileMime';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../lib/r2';

const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_RETRY_BASE_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableUploadError(error) {
  const message = String(error?.message || '');
  if (/Upload cancelled/i.test(message)) return false;
  const rejected = message.match(/Upload rejected \((\d+)\)/);
  if (rejected) {
    const status = Number(rejected[1]);
    // Retry rate limits / transient gateway errors only among 4xx
    return status === 408 || status === 429;
  }
  return true;
}


/**
 * Upload via presigned PUT + XHR (reliable in browser; avoids SDK fetch/CORS/checksum issues).
 * Pass an AbortSignal to cancel in-flight uploads (pause/resume).
 */
function uploadWithPresignedPutOnce(path, file, contentType, onProgress, abortSignal) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 }).then(
    (signedUrl) =>
      new Promise((resolve, reject) => {
        if (abortSignal?.aborted) {
          reject(new Error('Upload cancelled.'));
          return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);

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
            resolve({ path, url: storageService.getPublicUrl(path) });
            return;
          }
          reject(
            new Error(
              `Upload rejected (${xhr.status}). Check R2 CORS allows PUT from ${window.location.origin}.`
            )
          );
        };

        xhr.onerror = () => {
          cleanup();
          reject(
            new Error(
              `Network error uploading to storage. Add CORS on bucket "${R2_BUCKET_NAME}" for origin ${window.location.origin} (methods: PUT, GET, HEAD).`
            )
          );
        };

        xhr.onabort = () => {
          cleanup();
          reject(new Error('Upload cancelled.'));
        };

        xhr.send(file);
      })
  );
}

async function uploadWithPresignedPut(path, file, contentType, onProgress, abortSignal) {
  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    if (abortSignal?.aborted) {
      throw new Error('Upload cancelled.');
    }
    try {
      return await uploadWithPresignedPutOnce(path, file, contentType, onProgress, abortSignal);
    } catch (error) {
      lastError = error;
      if (attempt >= UPLOAD_MAX_ATTEMPTS || !isRetryableUploadError(error)) {
        throw error;
      }
      onProgress?.(0);
      await sleep(UPLOAD_RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

export const storageService = {
  /** @param {AbortSignal} [abortSignal] */
  async upload(path, file, onProgress, abortSignal) {
    try {
      if (!R2_BUCKET_NAME) {
        throw new Error('R2 bucket is not configured (VITE_R2_BUCKET_NAME).');
      }

      const contentType = getFileMime(file);
      const body =
        file.type === contentType
          ? file
          : new File([file], file.name || 'upload', {
              type: contentType,
              lastModified: file.lastModified,
            });

      onProgress?.(2);
      return await uploadWithPresignedPut(path, body, contentType, onProgress, abortSignal);
    } catch (error) {
      console.error('R2 Upload Error:', {
        message: error.message,
        name: error.name,
        path,
        bucket: R2_BUCKET_NAME,
      });

      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error(
          `Upload blocked by browser or CORS. In Cloudflare R2 → ${R2_BUCKET_NAME} → Settings → CORS, allow origin ${typeof window !== 'undefined' ? window.location.origin : 'your site'} with methods PUT, GET, HEAD.`
        );
      }

      throw error;
    }
  },

  async delete(paths) {
    try {
      if (Array.isArray(paths)) {
        if (paths.length === 0) return;

        const command = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: paths.map((path) => ({ Key: path })),
          },
        });
        await r2Client.send(command);
      } else {
        const command = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: paths,
        });
        await r2Client.send(command);
      }
    } catch (error) {
      console.error('R2 Delete Error:', error);
      throw error;
    }
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
    if (!R2_BUCKET_NAME || !path) return false;
    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: path,
        })
      );
      return true;
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') {
        return false;
      }
      console.warn('R2 exists check failed:', path, error);
      return false;
    }
  },

  /** List object keys under a prefix (photographer album folders on R2). */
  async listByPrefix(prefix, { maxKeys = 1000 } = {}) {
    if (!R2_BUCKET_NAME) {
      throw new Error('R2 bucket is not configured (VITE_R2_BUCKET_NAME).');
    }

    const normalized = String(prefix || '').replace(/^\/+/, '');
    const objects = [];
    let continuationToken;

    do {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: normalized,
        MaxKeys: Math.min(maxKeys - objects.length, 1000),
        ContinuationToken: continuationToken,
      });
      const response = await r2Client.send(command);
      (response.Contents || []).forEach((entry) => {
        if (entry.Key && !entry.Key.endsWith('/')) {
          objects.push({
            key: entry.Key,
            size: Number(entry.Size) || 0,
          });
        }
      });
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken && objects.length < maxKeys);

    return objects;
  },
};
