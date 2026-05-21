import JSZip from 'jszip';
import {
  downloadPhotosToZip,
  fetchPhotoBlob,
  type BulkDownloadPhoto,
  type DownloadPhotosToZipOptions,
} from './downloadPhoto';
import { getPhotoDownloadFilename } from './photoDisplayUrl';

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';

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

export function requestGoogleDriveAccessToken(): Promise<string> {
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    return Promise.reject(
      new Error(
        'Google Drive is not configured for this site. Download locally or contact the photographer.'
      )
    );
  }

  return loadGoogleIdentityScript().then(
    () =>
      new Promise((resolve, reject) => {
        try {
          const tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: DRIVE_FILE_SCOPE,
            callback: (response) => {
              if (response.error) {
                reject(
                  new Error(
                    response.error_description ||
                      response.error ||
                      'Google sign-in was cancelled.'
                  )
                );
                return;
              }
              if (!response.access_token) {
                reject(new Error('Could not get Google access. Try again.'));
                return;
              }
              resolve(response.access_token);
            },
          });
          tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Google sign-in failed.'));
        }
      })
  );
}

export async function uploadBlobToGoogleDrive(
  accessToken: string,
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = { name: filename, mimeType };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      text ? `Google Drive upload failed (${response.status}).` : `Google Drive upload failed (${response.status}).`
    );
  }

  const data = (await response.json()) as { id: string; name: string; webViewLink?: string };
  if (!data.id) throw new Error('Google Drive did not return a file id.');
  return data;
}

export interface GoogleDriveGalleryUploadOptions extends DownloadPhotosToZipOptions {
  collectionName?: string;
  onZipProgress?: (percent: number) => void;
}

export interface GoogleDriveGalleryUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  photoCount: number;
  isZip: boolean;
}

/** Build zip (or single file) and upload to the signed-in user's Google Drive. */
export async function uploadGalleryToGoogleDrive(
  accessToken: string,
  photos: BulkDownloadPhoto[],
  options: GoogleDriveGalleryUploadOptions = {}
): Promise<GoogleDriveGalleryUploadResult> {
  const collectionName = (options.collectionName || 'gallery').replace(/[/\\:*?"<>|]/g, '_');
  const total = photos.length;
  if (total === 0) throw new Error('No photos found in this selection.');

  if (total === 1) {
    const photo = photos[0];
    const blob = await fetchPhotoBlob(photo);
    if (!blob) throw new Error('Failed to download this file. Please try again.');
    const filename = getPhotoDownloadFilename(photo, 0);
    const mimeType = blob.type || (photo.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
    const uploaded = await uploadBlobToGoogleDrive(accessToken, blob, filename, mimeType);
    const webViewLink =
      uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
    return {
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink,
      photoCount: 1,
      isZip: false,
    };
  }

  const zip = new JSZip();
  const fileCount = await downloadPhotosToZip(zip, photos, options);
  if (fileCount === 0) {
    throw new Error(
      'Could not download any photos. They may still be processing — try again in a moment.'
    );
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (metadata) => options.onZipProgress?.(metadata.percent)
  );

  const zipFilename = `${collectionName}.zip`;
  const uploaded = await uploadBlobToGoogleDrive(accessToken, zipBlob, zipFilename, 'application/zip');
  const webViewLink =
    uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    webViewLink,
    photoCount: fileCount,
    isZip: true,
  };
}
