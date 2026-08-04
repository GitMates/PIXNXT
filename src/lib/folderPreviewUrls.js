import { toThumbDerivativeUrl } from './photoDisplayUrl';

const FOLDER_PREVIEW_SLOTS = 4;

/** Up to 4 cover URLs for the folder mosaic (folder cover + child collections). */
export function buildFolderPreviewUrls(folder, collectionCoverUrls = []) {
  const urls = [];
  const folderCover = toThumbDerivativeUrl(folder?.cover_url?.trim() || '');
  if (folderCover) urls.push(folderCover);

  for (const url of collectionCoverUrls) {
    if (urls.length >= FOLDER_PREVIEW_SLOTS) break;
    const trimmed = toThumbDerivativeUrl(url?.trim() || '');
    if (trimmed && !urls.includes(trimmed)) urls.push(trimmed);
  }

  return urls;
}

export function getFolderPreviewSlots(folder) {
  const raw = folder?.preview_urls?.length
    ? folder.preview_urls
    : buildFolderPreviewUrls(folder, []);
  const urls = raw.map((u) => toThumbDerivativeUrl(u || '')).filter(Boolean);
  return Array.from({ length: FOLDER_PREVIEW_SLOTS }, (_, i) => urls[i] || null);
}
