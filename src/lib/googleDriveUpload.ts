import {
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

/** Multipart upload accepts 5 MB or less. Larger originals and videos use a resumable session. */
const DRIVE_MULTIPART_MAX_BYTES = 5 * 1024 * 1024;

function mimeForDriveFile(filename: string, blobType: string, mediaType?: string): string {
  if (blobType && blobType !== 'application/octet-stream') return blobType;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/mp4',
  };
  if (byExt[ext]) return byExt[ext];
  if (mediaType === 'video') return 'video/mp4';
  return 'image/jpeg';
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
                    new Error(googleSignInHelpMessage(response.error, response.error_description))
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

async function uploadBlobResumable(
  accessToken: string,
  blob: Blob,
  metadata: { name: string; mimeType: string; parents?: string[] },
  mimeType: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const session = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(blob.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!session.ok) {
    const text = await session.text().catch(() => '');
    throw new Error(parseGoogleApiError(text, session.status));
  }

  const location = session.headers.get('Location');
  if (!location) throw new Error('Google Drive did not start the upload session.');

  const response = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(parseGoogleApiError(text, response.status));
  }

  const data = (await response.json()) as { id: string; name: string; webViewLink?: string };
  if (!data.id) throw new Error('Google Drive did not return a file id.');
  return data;
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

  if (blob.size > DRIVE_MULTIPART_MAX_BYTES) {
    return uploadBlobResumable(accessToken, blob, metadata, safeMime);
  }

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
  /** Fired after the user completes Google sign-in and a token is available */
  onAuthComplete?: () => void;
  onUploadPhase?: (message: string) => void;
}

/** True when Google OAuth is in Testing mode or verification blocks this account. */
export function isGoogleDriveSignInRestrictedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /access_denied|access blocked|verification process|test user|developer-approved testers|403/i.test(
    msg
  );
}

function googleSignInHelpMessage(error?: string, description?: string): string {
  const code = String(error || '').toLowerCase();
  const desc = String(description || '');
  if (code === 'access_denied' || /verification process|developer-approved testers/i.test(desc)) {
    return (
      'Google Drive sign-in is limited to test accounts while the PIXNXT OAuth app is in Testing mode. ' +
      'Use “Save to this device” (Local) to download without Google, or ask the site owner to publish the OAuth app in Google Cloud Console.'
    );
  }
  if (code === 'access_denied' || /cancel/i.test(desc)) {
    return 'Google sign-in was cancelled. Choose Local to save on this device, or try Google Drive again.';
  }
  if (code === 'popup_closed_by_user') {
    return 'Sign-in popup was closed. Allow popups for this site and try again.';
  }
  return description || error || 'Google sign-in failed.';
}

interface DriveFolderUploadResult {
  uploaded: number;
  requested: number;
  failed: number;
}

function driveFetchOptions(options: GoogleDriveGalleryUploadOptions) {
  const resolution = options.resolution || 'original';
  return {
    preferOriginal: resolution === 'original',
    resolution,
    videoResolution: options.videoResolution,
    timeoutMs: options.timeoutMs,
  };
}

async function uploadPhotosToDriveFolder(
  accessToken: string,
  folderId: string,
  photos: BulkDownloadPhoto[],
  options: GoogleDriveGalleryUploadOptions = {}
): Promise<DriveFolderUploadResult> {
  const { onProgress, isStale, onUploadPhase } = options;

  if (!photos.length) return { uploaded: 0, requested: 0, failed: 0 };

  const total = photos.length;
  const usedNames = new Set<string>();
  const names = photos.map((photo, index) => getPhotoDownloadFilename(photo, index, usedNames));
  const fetchOptions = driveFetchOptions(options);
  let nextIndex = 0;
  let uploaded = 0;
  let failed = 0;
  let finished = 0;

  onUploadPhase?.(`Saving ${total} files to Google Drive…`);

  const saveOne = async () => {
    while (!isStale?.()) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= total) return;
      const photo = photos[index];
      const filename = names[index];
      onUploadPhase?.(`Saving ${filename} (${index + 1} of ${total})…`);
      try {
        let blob = await fetchPhotoBlob(photo, fetchOptions);
        if (!blob?.size) blob = await fetchPhotoBlob(photo, fetchOptions);
        if (!blob?.size) {
          failed += 1;
        } else {
          const mimeType = mimeForDriveFile(filename, blob.type, photo.media_type);
          await uploadBlobToGoogleDriveWithRetry(accessToken, blob, filename, mimeType, folderId);
          uploaded += 1;
        }
      } catch (err) {
        failed += 1;
        console.warn(`Google Drive save failed for ${filename}:`, err);
      } finally {
        finished += 1;
        onProgress?.(finished, total);
      }
    }
  };

  const workers = Math.min(DRIVE_UPLOAD_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workers }, () => saveOne()));

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
    const blob = await fetchPhotoBlob(photo, driveFetchOptions(options));
    if (!blob) throw new Error('Failed to download this file. Please try again.');
    const filename = getPhotoDownloadFilename(photo, 0);
    const mimeType = mimeForDriveFile(filename, blob.type, photo.media_type);
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
  let accessToken: string;
  try {
    accessToken = await requestGoogleDriveAccessToken({ forceConsent: false });
  } catch (firstErr) {
    const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const needsConsent =
      /consent|interaction_required|login_required|account/i.test(msg) ||
      /not granted|no token/i.test(msg);
    if (!needsConsent) throw firstErr;
    accessToken = await requestGoogleDriveAccessToken({ forceConsent: true });
  }
  options.onAuthComplete?.();
  return uploadGalleryToGoogleDrive(accessToken, photos, options);
}
