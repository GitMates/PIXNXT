import {
  DEFAULT_DOWNLOAD_CONCURRENCY,
  fetchPhotoBlob,
  type BulkDownloadPhoto,
  type DownloadPhotosToZipOptions,
} from './downloadPhoto';
import { getPhotoDownloadFilename } from './photoDisplayUrl';

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
/** Avoid Drive API rate limits when uploading many files in parallel */
const DRIVE_UPLOAD_CONCURRENCY = 2;
const DRIVE_UPLOAD_MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDriveError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|500|502|503|408|rate|quota|backend|unavailable/i.test(msg);
}

async function uploadBlobToGoogleDriveWithRetry(
  accessToken: string,
  blob: Blob,
  filename: string,
  mimeType: string,
  parentFolderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < DRIVE_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadBlobToGoogleDrive(accessToken, blob, filename, mimeType, parentFolderId);
    } catch (err) {
      lastErr = err;
      if (attempt < DRIVE_UPLOAD_MAX_ATTEMPTS - 1 && isRetryableDriveError(err)) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Google Drive upload failed');
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestAccessToken: (overrides?: { prompt?: string }) => void };
        };
      };
    };
  }
}

let gsiScriptPromise: Promise<void> | null = null;

export function isGoogleDriveConfigured(): boolean {
  return Boolean(String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());
}

export function getGoogleDriveSetupMessage(): string {
  if (isGoogleDriveConfigured()) return '';
  return 'Add VITE_GOOGLE_CLIENT_ID to your .env file (Google Cloud OAuth Web client), then restart npm run dev.';
}

export function getGoogleDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function getGoogleDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Drive is only available in the browser.'));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In.')));
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In.'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

function parseGoogleApiError(text: string, status: number): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string; errors?: { message?: string }[] } };
    const msg = json.error?.message || json.error?.errors?.[0]?.message;
    if (msg) {
      if (msg.includes('Google Drive API has not been used') || msg.includes('accessNotConfigured')) {
        return 'Google Drive API is not enabled in Google Cloud Console. Enable “Google Drive API” for your project.';
      }
      if (status === 403) return `${msg} Check OAuth client authorized origins include this site URL.`;
      return msg;
    }
  } catch {
    /* ignore */
  }
  if (text && text.length < 500) {
    return `Google Drive request failed (${status}): ${text}`;
  }
  return `Google Drive request failed (${status}).`;
}

/** Drive-safe file/folder name (no path separators or control chars). */
function sanitizeDriveName(name: string): string {
  return String(name || 'file')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim() || 'file';
}

/** Google multipart upload requires multipart/related — not FormData (multipart/form-data). */
async function buildMultipartRelatedBody(
  metadata: Record<string, unknown>,
  blob: Blob,
  mimeType: string,
  boundary: string
): Promise<Blob> {
  const metaJson = JSON.stringify(metadata);
  const preamble = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaJson}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;
  const encoder = new TextEncoder();
  const fileBuffer = await blob.arrayBuffer();
  const combined = new Uint8Array(
    encoder.encode(preamble).length + fileBuffer.byteLength + encoder.encode(closing).length
  );
  let offset = 0;
  for (const part of [encoder.encode(preamble), new Uint8Array(fileBuffer), encoder.encode(closing)]) {
    combined.set(part, offset);
    offset += part.length;
  }
  return new Blob([combined], { type: `multipart/related; boundary=${boundary}` });
}

export function requestGoogleDriveAccessToken(options?: { forceConsent?: boolean }): Promise<string> {
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    return Promise.reject(
      new Error(
        'Google Drive is not set up yet. The site owner must add VITE_GOOGLE_CLIENT_ID in .env and restart the app.'
      )
    );
  }

  return loadGoogleIdentityScript().then(
    () =>
      new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        try {
          const tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: DRIVE_FILE_SCOPE,
            callback: (response) => {
              if (response.error) {
                finish(() =>
                  reject(
                    new Error(
                      response.error_description ||
                        response.error ||
                        'Google sign-in was cancelled.'
                    )
                  )
                );
                return;
              }
              if (!response.access_token) {
                finish(() => reject(new Error('Could not get Google access. Try again.')));
                return;
              }
              finish(() => resolve(response.access_token!));
            },
          });
          tokenClient.requestAccessToken({
            prompt: options?.forceConsent ? 'consent' : 'select_account',
          });
        } catch (err) {
          finish(() => reject(err instanceof Error ? err : new Error('Google sign-in failed.')));
        }
      })
  );
}

async function createDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const response = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: sanitizeDriveName(folderName),
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(parseGoogleApiError(text, response.status));
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error('Could not create folder in Google Drive.');
  return data.id;
}

export async function uploadBlobToGoogleDrive(
  accessToken: string,
  blob: Blob,
  filename: string,
  mimeType: string,
  parentFolderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const safeName = sanitizeDriveName(filename);
  const safeMime = mimeType || blob.type || 'application/octet-stream';
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: safeName,
    mimeType: safeMime,
  };
  if (parentFolderId) metadata.parents = [parentFolderId];

  const boundary = `pixnxt_${Date.now().toString(36)}`;
  const body = await buildMultipartRelatedBody(metadata, blob, safeMime, boundary);

  const response = await fetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(parseGoogleApiError(text, response.status));
  }

  const data = (await response.json()) as { id: string; name: string; webViewLink?: string };
  if (!data.id) throw new Error('Google Drive did not return a file id.');
  return data;
}

export interface GoogleDriveGalleryUploadOptions extends DownloadPhotosToZipOptions {
  collectionName?: string;
  onAuthStart?: () => void;
  onUploadPhase?: (message: string) => void;
}

interface DriveFolderUploadResult {
  uploaded: number;
  requested: number;
  failed: number;
}

async function uploadPhotosToDriveFolder(
  accessToken: string,
  folderId: string,
  photos: BulkDownloadPhoto[],
  options: GoogleDriveGalleryUploadOptions = {}
): Promise<DriveFolderUploadResult> {
  const { concurrency = DEFAULT_DOWNLOAD_CONCURRENCY, onProgress, isStale, onUploadPhase } =
    options;

  if (!photos.length) return { uploaded: 0, requested: 0, failed: 0 };

  const total = photos.length;
  const usedNames = new Set<string>();
  const blobs = new Map<number, Blob>();
  let fetchDone = 0;
  let uploadDone = 0;
  const fetchFailed: number[] = [];

  const reportFetchProgress = () => {
    const done = Math.min(total, Math.round((fetchDone / total) * total * 0.85));
    onProgress?.(done, total);
  };
  const reportUploadProgress = (readyCount: number) => {
    const done = Math.min(
      total,
      Math.round(0.85 * total + (uploadDone / Math.max(1, readyCount)) * 0.15 * total)
    );
    onProgress?.(done, total);
  };

  onUploadPhase?.(`Downloading ${total} photos from storage…`);

  for (let i = 0; i < photos.length; i += concurrency) {
    if (isStale?.()) break;
    const chunk = photos.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (photo, chunkIndex) => {
        const index = i + chunkIndex;
        try {
          const blob = await fetchPhotoBlob(photo);
          if (blob?.size) blobs.set(index, blob);
          else fetchFailed.push(index);
        } catch (err) {
          console.warn(`Fetch failed for ${photo.filename || photo.id || index}:`, err);
          fetchFailed.push(index);
        } finally {
          fetchDone += 1;
          reportFetchProgress();
        }
      })
    );
  }

  if (!isStale?.() && fetchFailed.length > 0) {
    for (const index of fetchFailed) {
      if (isStale?.()) break;
      if (blobs.has(index)) continue;
      const photo = photos[index];
      try {
        const blob = await fetchPhotoBlob(photo);
        if (blob?.size) {
          blobs.set(index, blob);
          const failIdx = fetchFailed.indexOf(index);
          if (failIdx >= 0) fetchFailed.splice(failIdx, 1);
        }
      } catch (err) {
        console.warn(`Fetch retry failed for ${photo.filename || photo.id || index}:`, err);
      }
    }
  }

  const readyIndices = [...blobs.keys()].sort((a, b) => a - b);
  if (readyIndices.length === 0) {
    return { uploaded: 0, requested: total, failed: total };
  }

  const uploadFailed: number[] = [];

  onUploadPhase?.(`Uploading ${readyIndices.length} files to Google Drive…`);

  for (let i = 0; i < readyIndices.length; i += DRIVE_UPLOAD_CONCURRENCY) {
    if (isStale?.()) break;
    const chunk = readyIndices.slice(i, i + DRIVE_UPLOAD_CONCURRENCY);
    await Promise.all(
      chunk.map(async (index) => {
        const photo = photos[index];
        const blob = blobs.get(index);
        if (!blob) {
          uploadFailed.push(index);
          return;
        }
        const filename = getPhotoDownloadFilename(photo, index, usedNames);
        const mimeType = blob.type || (photo.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
        try {
          onUploadPhase?.(`Uploading ${filename} (${uploadDone + 1} of ${readyIndices.length})…`);
          await uploadBlobToGoogleDriveWithRetry(
            accessToken,
            blob,
            filename,
            mimeType,
            folderId
          );
        } catch (err) {
          console.warn(`Google Drive upload failed for ${photo.filename || photo.id || index}:`, err);
          uploadFailed.push(index);
        } finally {
          uploadDone += 1;
          reportUploadProgress(readyIndices.length);
        }
      })
    );
  }

  if (!isStale?.() && uploadFailed.length > 0) {
    for (const index of uploadFailed) {
      if (isStale?.()) break;
      const photo = photos[index];
      const blob = blobs.get(index);
      if (!blob) continue;
      const filename = getPhotoDownloadFilename(photo, index, usedNames);
      const mimeType = blob.type || (photo.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
      try {
        await uploadBlobToGoogleDriveWithRetry(accessToken, blob, filename, mimeType, folderId);
        const failIdx = uploadFailed.indexOf(index);
        if (failIdx >= 0) uploadFailed.splice(failIdx, 1);
      } catch (err) {
        console.warn(`Google Drive retry failed for ${photo.filename || photo.id || index}:`, err);
      }
    }
  }

  const uploaded = readyIndices.length - uploadFailed.length;
  const failed = total - uploaded;
  onProgress?.(total, total);
  return { uploaded, requested: total, failed };
}

export interface GoogleDriveGalleryUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderId?: string;
  folderUrl?: string;
  photoCount: number;
  isZip: boolean;
}

/** Sign in with Google, then upload gallery files into the user's Drive. */
export async function uploadGalleryToGoogleDrive(
  accessToken: string,
  photos: BulkDownloadPhoto[],
  options: GoogleDriveGalleryUploadOptions = {}
): Promise<GoogleDriveGalleryUploadResult> {
  const collectionName = (options.collectionName || 'gallery').replace(/[/\\:*?"<>|]/g, '_');
  const total = photos.length;
  if (total === 0) throw new Error('No photos found in this selection.');

  const folderName = `${collectionName} - PIXNXT`;
  options.onUploadPhase?.('Creating folder in Google Drive…');
  const folderId = await createDriveFolder(accessToken, folderName);
  const folderUrl = getGoogleDriveFolderUrl(folderId);

  if (total === 1) {
    const photo = photos[0];
    options.onUploadPhase?.('Uploading to Google Drive…');
    const blob = await fetchPhotoBlob(photo);
    if (!blob) throw new Error('Failed to download this file. Please try again.');
    const filename = getPhotoDownloadFilename(photo, 0);
    const mimeType = blob.type || (photo.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
    const uploaded = await uploadBlobToGoogleDrive(
      accessToken,
      blob,
      filename,
      mimeType,
      folderId
    );
    const webViewLink = uploaded.webViewLink || getGoogleDriveFileUrl(uploaded.id);
    return {
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink,
      folderId,
      folderUrl,
      photoCount: 1,
      isZip: false,
    };
  }

  options.onUploadPhase?.(`Uploading ${total} photos to Google Drive…`);
  const uploadResult = await uploadPhotosToDriveFolder(accessToken, folderId, photos, options);

  if (uploadResult.uploaded === 0) {
    throw new Error(
      'Could not upload any photos. They may still be processing — try again in a moment.'
    );
  }
  if (uploadResult.failed > 0) {
    throw new Error(
      `Only ${uploadResult.uploaded} of ${uploadResult.requested} photos could be uploaded. Some files may still be processing or blocked by storage. Try again or download locally.`
    );
  }

  return {
    fileId: folderId,
    fileName: folderName,
    webViewLink: folderUrl,
    folderId,
    folderUrl,
    photoCount: uploadResult.uploaded,
    isZip: false,
  };
}

/** Full flow: Google account picker → upload → return links to open Drive. */
export async function saveGalleryToGoogleDrive(
  photos: BulkDownloadPhoto[],
  options: GoogleDriveGalleryUploadOptions = {}
): Promise<GoogleDriveGalleryUploadResult> {
  options.onAuthStart?.();
  const accessToken = await requestGoogleDriveAccessToken({ forceConsent: true });
  return uploadGalleryToGoogleDrive(accessToken, photos, options);
}
