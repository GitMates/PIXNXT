import { PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getFileMime } from '../lib/fileMime';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../lib/r2';

/**
 * Upload via presigned PUT + XHR (reliable in browser; avoids SDK fetch/CORS/checksum issues).
 */
function uploadWithPresignedPut(path, file, contentType, onProgress) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 }).then(
    (signedUrl) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
          }
        };

        xhr.onload = () => {
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
          reject(
            new Error(
              `Network error uploading to storage. Add CORS on bucket "${R2_BUCKET_NAME}" for origin ${window.location.origin} (methods: PUT, GET, HEAD).`
            )
          );
        };

        xhr.onabort = () => reject(new Error('Upload cancelled.'));

        xhr.send(file);
      })
  );
}

export const storageService = {
  async upload(path, file, onProgress) {
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
      return await uploadWithPresignedPut(path, body, contentType, onProgress);
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
    if (!R2_PUBLIC_URL) {
      console.warn('VITE_R2_PUBLIC_URL is not defined');
      return path;
    }
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    return `${baseUrl}${path}`;
  },
};
