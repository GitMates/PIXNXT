/** Studio URL to open a folder (logged-in photographer). */
export function getFolderStudioUrl(folderId) {
  if (typeof window === 'undefined' || !folderId) return '';
  return `${window.location.origin}/folders/${folderId}`;
}
