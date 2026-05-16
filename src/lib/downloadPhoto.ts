import JSZip from 'jszip';

/**
 * Downloads a single photo from a Cloudflare R2 URL and saves it to the user's computer.
 * Uses fetch → blob → object URL so the browser triggers a real file save.
 * Falls back to a new-tab link if CORS blocks the fetch.
 */
export async function downloadPhotoFromR2(url: string, filename: string): Promise<void> {
  if (!url) return;

  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.warn('Fetch download failed, falling back to link open:', err);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'photo.jpg';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export interface BulkDownloadPhoto {
  full_url: string;
  filename?: string;
}

export type ProgressCallback = (downloaded: number, total: number) => void;

/**
 * Downloads all photos from Cloudflare R2, bundles them into a ZIP,
 * and saves the ZIP to the user's computer.
 *
 * @param photos   Array of photo objects with full_url and filename
 * @param zipName  Name of the resulting ZIP file (without .zip extension)
 * @param onProgress Optional callback(downloaded, total) for progress updates
 */
export async function downloadAllPhotosAsZip(
  photos: BulkDownloadPhoto[],
  zipName = 'photos',
  onProgress?: ProgressCallback
): Promise<void> {
  if (!photos || photos.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder(zipName)!;

  let downloaded = 0;

  // Fetch all photos concurrently (batched to avoid overwhelming the browser)
  const BATCH_SIZE = 5;
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (photo, batchIndex) => {
        const globalIndex = i + batchIndex + 1;
        const url = photo.full_url;
        if (!url) return;

        // Derive a safe filename
        const rawName = photo.filename || url.split('/').pop() || `photo_${globalIndex}.jpg`;
        // Ensure unique names if duplicates exist
        const safeFilename = rawName.replace(/[/\\:*?"<>|]/g, '_');

        try {
          const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          folder.file(safeFilename, blob);
        } catch (err) {
          console.warn(`Failed to fetch ${rawName}:`, err);
        }

        downloaded++;
        onProgress?.(downloaded, photos.length);
      })
    );
  }

  // Generate and trigger ZIP download
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
