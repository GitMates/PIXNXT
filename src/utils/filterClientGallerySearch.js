/**
 * Client gallery dashboard search — folders, collections, and photo filenames.
 */
export function normalizeGallerySearchQuery(query) {
  return String(query ?? '').trim().toLowerCase();
}

function collectSearchTokens(entity) {
  const tags = entity?.category_tags ?? entity?.tags;
  const tagList = Array.isArray(tags) ? tags : tags ? [tags] : [];
  return [
    entity?.name,
    entity?.slug,
    entity?.status,
    entity?.description,
    ...tagList,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function photoFilenamesMatch(collection, normalizedQuery) {
  const filenames = collection?.photo_filenames;
  if (!Array.isArray(filenames) || !filenames.length) return false;
  return filenames.some((name) => String(name).toLowerCase().includes(normalizedQuery));
}

export function collectionMatchesGallerySearch(collection, normalizedQuery) {
  if (!normalizedQuery) return true;
  if (collectSearchTokens(collection).includes(normalizedQuery)) return true;
  return photoFilenamesMatch(collection, normalizedQuery);
}

export function folderMatchesGallerySearch(folder, normalizedQuery, allCollections = []) {
  if (!normalizedQuery) return true;
  if (collectSearchTokens(folder).includes(normalizedQuery)) return true;
  const folderId = folder?.id;
  if (!folderId) return false;
  return allCollections.some(
    (c) => c.folder_id === folderId && collectionMatchesGallerySearch(c, normalizedQuery)
  );
}

export function filterRootCollectionsForSearch(collections, normalizedQuery) {
  if (!normalizedQuery) return collections;
  return collections.filter((c) => collectionMatchesGallerySearch(c, normalizedQuery));
}

export function filterFoldersForSearch(folders, normalizedQuery, allCollections = []) {
  if (!normalizedQuery) return folders;
  return folders.filter((f) => folderMatchesGallerySearch(f, normalizedQuery, allCollections));
}
