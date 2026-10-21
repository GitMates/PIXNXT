import {
  fetchPhotoBlob,
  type BulkDownloadPhoto,
} from './downloadPhoto';
import { getPhotoDownloadFilename } from './photoDisplayUrl';

const DROPBOX_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
const DROPBOX_UPLOAD_CONCURRENCY = 2;
const DROPBOX_UPLOAD_MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDropboxConfigured(): boolean {
  return Boolean(
    String(
      import.meta.env.VITE_DROPBOX_APP_KEY ||
      import.meta.env.VITE_DROPBOX_CLIENT_ID ||
      ''
    ).trim()
  );
}

export function getDropboxSetupMessage(): string {
  if (isDropboxConfigured()) return '';
  return 'Add VITE_DROPBOX_APP_KEY to your .env file (Dropbox App Console / App Key), then restart npm run dev.';
}

export function getDropboxFolderUrl(folderPath: string): string {
  const clean = String(folderPath || '').replace(/^\/+/, '');
  return `https://www.dropbox.com/home/${encodeURIComponent(clean)}`;
}

export async function authenticateWithDropbox(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Dropbox is only available in the browser.');
  }

  const appKey = String(
    import.meta.env.VITE_DROPBOX_APP_KEY ||
    import.meta.env.VITE_DROPBOX_CLIENT_ID ||
    ''
  ).trim();

  if (!appKey) {
    throw new Error(getDropboxSetupMessage());
  }

  const cachedToken = sessionStorage.getItem('pixnxt_dropbox_token');
  if (cachedToken) {
    return cachedToken;
  }

  const redirectUri = `${window.location.origin}/`;
  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(
    appKey
  )}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const width = 600;
  const height = 700;
  const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
  const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

  const popup = window.open(
    authUrl,
    'DropboxSignIn',
    `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=1`
  );

  if (!popup) {
    throw new Error('Could not open Dropbox sign-in window. Please allow popups for this site.');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearInterval(timer);
      window.removeEventListener('message', onMessage);
    };

    const finish = (token: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      sessionStorage.setItem('pixnxt_dropbox_token', token);
      resolve(token);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      reject(err);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'DROPBOX_AUTH_TOKEN' && event.data.token) {
        finish(event.data.token);
      }
    };
    window.addEventListener('message', onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        fail(new Error('Dropbox sign-in was cancelled.'));
        return;
      }
      try {
        const hash = popup.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const token = params.get('access_token');
          if (token) {
            finish(token);
            return;
          }
          const err = params.get('error_description') || params.get('error');
          if (err) {
            fail(new Error(`Dropbox sign-in failed: ${err}`));
            return;
          }
        }
      } catch {
        // Cross-origin before redirect back to same-origin
      }
    }, 500);
  });
}

export async function uploadBlobToDropbox(
  accessToken: string,
  blob: Blob,
  dropboxPath: string
): Promise<{ id: string; name: string; path_display: string }> {
  const normalizedPath = dropboxPath.startsWith('/') ? dropboxPath : `/${dropboxPath}`;

  const res = await fetch(DROPBOX_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: normalizedPath,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: blob,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Dropbox upload failed (${res.status}): ${errorText || res.statusText}`);
  }

  return (await res.json()) as { id: string; name: string; path_display: string };
}

async function uploadBlobToDropboxWithRetry(
  accessToken: string,
  blob: Blob,
  dropboxPath: string
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < DROPBOX_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadBlobToDropbox(accessToken, blob, dropboxPath);
    } catch (err) {
      lastErr = err;
      if (attempt < DROPBOX_UPLOAD_MAX_ATTEMPTS - 1) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Dropbox upload failed');
}

export interface DropboxGalleryUploadOptions {
  collectionName?: string;
  resolution?: 'web' | 'full' | 'original';
  videoResolution?: string;
  concurrency?: number;
  onAuthStart?: () => void;
  onAuthComplete?: () => void;
  onUploadPhase?: (phase: string) => void;
  onProgress?: (done: number, total: number) => void;
  isStale?: () => boolean;
}

export interface DropboxGalleryUploadResult {
  folderName: string;
  folderUrl: string;
  photoCount: number;
  uploaded: number;
  failed: number;
  isZip: boolean;
}

export async function saveGalleryToDropbox(
  photos: BulkDownloadPhoto[],
  options: DropboxGalleryUploadOptions = {}
): Promise<DropboxGalleryUploadResult> {
  const collectionName = (options.collectionName || 'delivery')
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim();
  const total = photos.length;
  if (total === 0) throw new Error('No photos found in this selection.');

  options.onAuthStart?.();
  const accessToken = await authenticateWithDropbox();
  options.onAuthComplete?.();

  if (options.isStale?.()) {
    return {
      folderName: collectionName,
      folderUrl: getDropboxFolderUrl(collectionName),
      photoCount: 0,
      uploaded: 0,
      failed: 0,
      isZip: false,
    };
  }

  const concurrency = Math.max(1, options.concurrency || 4);
  const blobs = new Map<number, Blob>();
  const fetchFailed: number[] = [];
  let fetchDone = 0;

  options.onUploadPhase?.(`Downloading ${total} files from storage…`);

  for (let i = 0; i < photos.length; i += concurrency) {
    if (options.isStale?.()) break;
    const chunk = photos.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (photo, chunkIndex) => {
        const index = i + chunkIndex;
        try {
          const blob = await fetchPhotoBlob(photo, {
            preferOriginal: options.resolution === 'original',
            resolution: options.resolution || 'original',
            videoResolution: options.videoResolution,
          });
          if (blob?.size) blobs.set(index, blob);
          else fetchFailed.push(index);
        } catch (err) {
          console.warn(`Fetch failed for ${photo.filename || photo.id || index}:`, err);
          fetchFailed.push(index);
        } finally {
          fetchDone += 1;
          const pct = Math.floor((fetchDone / total) * 50);
          options.onProgress?.(pct, 100);
        }
      })
    );
  }

  const readyIndices = [...blobs.keys()].sort((a, b) => a - b);
  if (readyIndices.length === 0) {
    return {
      folderName: collectionName,
      folderUrl: getDropboxFolderUrl(collectionName),
      photoCount: 0,
      uploaded: 0,
      failed: total,
      isZip: false,
    };
  }

  const usedNames = new Set<string>();
  const uploadFailed: number[] = [];
  let uploadDone = 0;

  options.onUploadPhase?.(`Uploading ${readyIndices.length} files to Dropbox…`);

  for (let i = 0; i < readyIndices.length; i += DROPBOX_UPLOAD_CONCURRENCY) {
    if (options.isStale?.()) break;
    const chunk = readyIndices.slice(i, i + DROPBOX_UPLOAD_CONCURRENCY);
    await Promise.all(
      chunk.map(async (index) => {
        const photo = photos[index];
        const blob = blobs.get(index);
        if (!blob) {
          uploadFailed.push(index);
          return;
        }
        const filename = getPhotoDownloadFilename(photo, index, usedNames);
        const dropboxFilePath = `/${collectionName}/${filename}`;

        try {
          options.onUploadPhase?.(`Uploading ${filename} (${uploadDone + 1} of ${readyIndices.length})…`);
          await uploadBlobToDropboxWithRetry(accessToken, blob, dropboxFilePath);
        } catch (err) {
          console.warn(`Dropbox upload failed for ${photo.filename || photo.id || index}:`, err);
          uploadFailed.push(index);
        } finally {
          uploadDone += 1;
          const uploadPct = 50 + Math.floor((uploadDone / readyIndices.length) * 50);
          options.onProgress?.(uploadPct, 100);
        }
      })
    );
  }

  const uploaded = readyIndices.length - uploadFailed.length;
  const failed = total - uploaded;

  return {
    folderName: collectionName,
    folderUrl: getDropboxFolderUrl(collectionName),
    photoCount: uploaded,
    uploaded,
    failed,
    isZip: false,
  };
}
