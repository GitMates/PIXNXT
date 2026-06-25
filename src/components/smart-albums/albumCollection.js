import { storageService } from '../../services/storage.service';
import { expandUploadFilesToImages, isImageFile, isPdfFile, probeImageFile } from '../../lib/pdfToImages';
import { compressImageForUpload } from '../../lib/prepareUploadFile';
import { getAlbumUploadPixelTarget } from './albumGridSize';
import { moveFileInOrder } from '../../lib/uploadFileOrder';
import { supabase } from '../../lib/supabase/client';
import {
    getRemotePreviewData,
    hydrateAlbumPreviewData,
} from './albumPreviewData';
import { loadCollectionItemDimensions, loadImageDimensionsFromFile } from './albumGridSize';

const STORAGE_KEY = 'pixnxt_album_collections';
const ALBUM_PATH_CACHE = new Map();
const PHOTOGRAPHER_PATH_CACHE = new Map();

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeAll(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save album collection', e);
    }
}

function nextId() {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const UPLOAD_CONCURRENCY = 6;
const COMPRESS_CONCURRENCY = 3;

async function runWithConcurrency(items, concurrency, worker) {
    if (!items.length) return [];
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(items[index], index);
        }
    }

    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return results;
}

function safeSegment(value, fallback = 'photo') {
    return String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || fallback;
}

async function hashDataUrl(dataUrl) {
    try {
        if (!globalThis.crypto?.subtle || !dataUrl) return null;
        const bytes = new TextEncoder().encode(dataUrl);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        return null;
    }
}

async function hashFile(file) {
    try {
        if (!globalThis.crypto?.subtle || !file) return null;
        const buffer = await file.arrayBuffer();
        const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        return null;
    }
}

async function dataUrlToFile(dataUrl, name) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const base = safeSegment(name);
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
}

async function getAlbumPathFolder(albumId) {
    if (!albumId) return 'album';
    if (ALBUM_PATH_CACHE.has(albumId)) return ALBUM_PATH_CACHE.get(albumId);
    try {
        const { data } = await supabase
            .from('smart_albums')
            .select('id, name')
            .eq('id', albumId)
            .maybeSingle();
        const folder = `${safeSegment(data?.name, 'album')}__${albumId}`;
        ALBUM_PATH_CACHE.set(albumId, folder);
        return folder;
    } catch {
        return `album__${albumId}`;
    }
}

async function getPhotographerPathFolder(photographerId) {
    if (!photographerId) return 'photographer';
    if (PHOTOGRAPHER_PATH_CACHE.has(photographerId)) {
        return PHOTOGRAPHER_PATH_CACHE.get(photographerId);
    }
    try {
        const { data } = await supabase
            .from('photographers')
            .select('id, display_name, email')
            .eq('id', photographerId)
            .maybeSingle();
        const emailPrefix = String(data?.email || '').split('@')[0];
        const folder = safeSegment(
            data?.display_name || emailPrefix || photographerId,
            'photographer'
        );
        PHOTOGRAPHER_PATH_CACHE.set(photographerId, folder);
        return folder;
    } catch {
        return safeSegment(photographerId, 'photographer');
    }
}

async function uploadCollectionImage({
    albumId,
    photographerId,
    image,
    sortIndex,
    batchUploadTs,
    pathContext,
}) {
    const file = await dataUrlToFile(image.dataUrl, image.name || `photo-${sortIndex + 1}`);
    const resolvedPathContext =
        pathContext ||
        (await Promise.all([
            getPhotographerPathFolder(photographerId),
            getAlbumPathFolder(albumId),
        ]).then(([photographerFolder, albumFolder]) => ({
            photographerFolder,
            albumFolder,
        })));
    return uploadCollectionFile({
        file,
        sortIndex,
        batchUploadTs,
        pathContext: resolvedPathContext,
    });
}

async function uploadCollectionFile({ file, sortIndex, batchUploadTs, pathContext }) {
    const { photographerFolder, albumFolder } = pathContext;
    const path = [
        'users',
        photographerFolder,
        'smart-album',
        albumFolder,
        `${batchUploadTs}-${sortIndex + 1}-${safeSegment(file.name)}`,
    ].join('/');
    return storageService.upload(path, file);
}

function readSortOrder(item, fallbackIndex = 0) {
    if (typeof item?.sortOrder === 'number' && Number.isFinite(item.sortOrder)) {
        return item.sortOrder;
    }
    const parsed = Number(item?.sortOrder);
    if (Number.isFinite(parsed)) return parsed;
    const fromPath = storagePathSortKey(item?.storagePath);
    if (fromPath) return fromPath[0] * 100000 + fromPath[1];
    if (typeof item?.createdAt === 'number' && Number.isFinite(item.createdAt)) {
        return item.createdAt;
    }
    return fallbackIndex;
}

function sortCollectionItems(items) {
    if (!items?.length) return [];
    return [...items]
        .map((item, index) => ({
            ...item,
            sortOrder: readSortOrder(item, index),
        }))
        .sort((a, b) => {
            const ao = a.sortOrder;
            const bo = b.sortOrder;
            if (ao !== bo) return ao - bo;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
}

function persistCollectionBucket(all, albumId, bucket) {
    const nextBucket = {
        ...bucket,
        items: sortCollectionItems(bucket.items || []),
        __revision: (bucket.__revision || 0) + 1,
    };
    all[albumId] = nextBucket;
    writeAll(all);
    return nextBucket;
}

function nextCollectionSortOrder(items) {
    let max = -1;
    for (const item of items || []) {
        if (typeof item.sortOrder === 'number') max = Math.max(max, item.sortOrder);
        else if (typeof item.createdAt === 'number') max = Math.max(max, item.createdAt);
    }
    return max + 1;
}

function storagePathSortKey(key) {
    const base = String(key || '').split('/').pop() || '';
    const match = base.match(/^(\d+)-(\d+)-/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2])];
}

async function buildCollectionWorkItems(files) {
    const batches = await Promise.all(
        (files || []).map(async (file, fileIndex) => {
            try {
                const isImage = isImageFile(file) || (await probeImageFile(file));
                if (isImage) {
                    return [{ kind: 'file', file, name: file.name || 'Photo', fileIndex }];
                }
                if (isPdfFile(file)) {
                    const pages = await expandUploadFilesToImages([file]);
                    return pages.map((page, pageIndex) => ({
                        kind: 'dataUrl',
                        name: page.name,
                        dataUrl: page.dataUrl,
                        fileIndex,
                        pageIndex,
                    }));
                }
                return [];
            } catch (e) {
                console.warn('Could not import file', file?.name, e);
                return [];
            }
        })
    );
    return batches.flat().map((item, sortIndex) => ({ ...item, sortIndex }));
}

/** Collection item used only for the optional book-wrap cover — not an inner-page photo. */
export const COVER_WRAP_ROLE = 'cover-wrap';

export function isCoverWrapCollectionItem(item) {
    return item?.role === COVER_WRAP_ROLE;
}

export function getInnerAlbumCollection(albumId) {
    return getAlbumCollection(albumId).filter((item) => !isCoverWrapCollectionItem(item));
}

/** Collection size used for page-count and inner spread placement (excludes optional cover-wrap on blank covers). */
export function getAlbumLayoutPhotoCount(albumId, album = null) {
    if (!albumId) return 0;
    if (album?.blank_covers === true) {
        return getInnerAlbumCollection(albumId).length;
    }
    return getAlbumCollection(albumId).length;
}

export function markCollectionItemAsCoverWrap(albumId, itemId) {
    if (!albumId || !itemId) return false;
    const all = readAll();
    const bucket = all[albumId];
    if (!bucket?.items?.length) return false;
    let changed = false;
    const items = bucket.items.map((item) => {
        if (item.id === itemId) {
            if (item.role === COVER_WRAP_ROLE) return item;
            changed = true;
            return { ...item, role: COVER_WRAP_ROLE };
        }
        if (isCoverWrapCollectionItem(item)) {
            changed = true;
            const { role, ...rest } = item;
            return rest;
        }
        return item;
    });
    if (!changed) return false;
    persistCollectionBucket(all, albumId, { ...bucket, items });
    return true;
}

export function getAlbumCollection(albumId) {
    if (!albumId) return [];
    const list = readAll()[albumId];
    const localItems = Array.isArray(list?.items) ? list.items : [];
    if (localItems.length > 0) return sortCollectionItems(localItems);

    const remote = getRemotePreviewData(albumId);
    return sortCollectionItems(Array.isArray(remote?.collection) ? remote.collection : []);
}

export function sumCollectionStorageBytes(items) {
    return (items || []).reduce((sum, item) => sum + (Number(item?.size_bytes) || 0), 0);
}

/** Bytes stored for one album — local collection, else preview snapshot. */
export function getAlbumCollectionStorageBytes(albumId) {
    if (!albumId) return 0;
    const localItems = readAll()[albumId]?.items;
    if (Array.isArray(localItems) && localItems.length > 0) {
        return sumCollectionStorageBytes(localItems);
    }
    const remote = getRemotePreviewData(albumId);
    const remoteTotal = Number(remote?.storage_bytes);
    if (Number.isFinite(remoteTotal) && remoteTotal > 0) return remoteTotal;
    return sumCollectionStorageBytes(remote?.collection);
}

export function getAlbumCollectionRevision(albumId) {
    if (!albumId) return 0;
    const localRev = readAll()[albumId]?.__revision;
    if (localRev != null) return localRev;
    const remote = getRemotePreviewData(albumId);
    if (remote?.revision != null) return remote.revision;
    return Array.isArray(remote?.collection) ? remote.collection.length : 0;
}

function stableItemIdFromPath(storagePath) {
    return `r2_${safeSegment(storagePath).slice(0, 48)}`;
}

function displayNameFromStoragePath(storagePath) {
    const base = String(storagePath || '').split('/').pop() || 'Photo';
    return base.replace(/^\d+-\d+-/, '').replace(/\.[^.]+$/, '') || 'Photo';
}

function collectionItemFromR2Key(key, index, sizeBytes = 0) {
    const sortKey = storagePathSortKey(key);
    const sortOrder = sortKey ? sortKey[0] * 100000 + sortKey[1] : index;
    return {
        id: stableItemIdFromPath(key),
        name: displayNameFromStoragePath(key),
        dataUrl: storageService.getPublicUrl(key),
        storagePath: key,
        sortOrder,
        createdAt: sortOrder,
        ...(sizeBytes > 0 ? { size_bytes: sizeBytes } : {}),
    };
}

function mergeCloudCollectionToLocal(albumId, cloudItems, revision = 0) {
    if (!albumId || !cloudItems?.length) return false;

    const all = readAll();
    const bucket = {
        ...(all[albumId] || {}),
        items: [...(all[albumId]?.items || [])],
    };
    const knownPaths = new Set(
        bucket.items.map((item) => item.storagePath).filter(Boolean)
    );
    const knownIds = new Set(bucket.items.map((item) => item.id));

    let added = 0;
    for (const item of cloudItems) {
        if (item.storagePath && knownPaths.has(item.storagePath)) continue;
        if (knownIds.has(item.id)) continue;
        bucket.items.push(item);
        if (item.storagePath) knownPaths.add(item.storagePath);
        knownIds.add(item.id);
        added += 1;
    }

    if (added === 0 && bucket.items.length === (all[albumId]?.items || []).length) {
        return false;
    }

    persistCollectionBucket(all, albumId, {
        ...bucket,
        __revision: Math.max(bucket.__revision || 0, revision || 0, Date.now()),
    });
    return true;
}

async function listR2CollectionItems(albumId, photographerId) {
    const [photographerFolder, albumFolder] = await Promise.all([
        getPhotographerPathFolder(photographerId),
        getAlbumPathFolder(albumId),
    ]);
    const prefix = ['users', photographerFolder, 'smart-album', albumFolder, ''].join('/');
    try {
        const objects = await storageService.listByPrefix(prefix);
        return objects
            .filter(({ key }) => /\.(jpe?g|png|webp|gif)$/i.test(key))
            .sort((a, b) => {
                const ka = storagePathSortKey(a.key);
                const kb = storagePathSortKey(b.key);
                if (ka && kb) {
                    const byBatch = ka[0] - kb[0];
                    if (byBatch !== 0) return byBatch;
                    return ka[1] - kb[1];
                }
                return a.key.localeCompare(b.key);
            })
            .map(({ key, size }, index) => collectionItemFromR2Key(key, index, size));
    } catch (error) {
        console.warn('Could not list R2 album collection:', error?.message || error);
        return [];
    }
}

/**
 * Load collection + page layout from Supabase snapshot, then R2 if needed.
 * Call when opening an album on a new device / Vercel host.
 */
export async function loadAlbumAssetsFromCloud(albumId, photographerId) {
    if (!albumId || !photographerId) {
        return { collection: [], loaded: false };
    }

    let previewData = null;

    try {
        let { data, error } = await supabase
            .from('smart_albums')
            .select('preview_data, cover_image_url')
            .eq('id', albumId)
            .eq('photographer_id', photographerId)
            .maybeSingle();

        if (error) {
            const msg = (error.message || '').toLowerCase();
            const missingPreview =
                error.status === 400 ||
                msg.includes('preview_data') ||
                msg.includes('column');
            if (missingPreview) {
                ({ data, error } = await supabase
                    .from('smart_albums')
                    .select('cover_image_url')
                    .eq('id', albumId)
                    .eq('photographer_id', photographerId)
                    .maybeSingle());
            }
        }

        if (!error && data?.preview_data) {
            previewData = data.preview_data;
        }
    } catch (error) {
        console.warn('Could not load album preview_data:', error?.message || error);
    }

    if (previewData) {
        hydrateAlbumPreviewData(albumId, previewData);
    }

    let collection = Array.isArray(previewData?.collection) ? [...previewData.collection] : [];

    if (collection.length === 0) {
        collection = await listR2CollectionItems(albumId, photographerId);
        if (collection.length > 0 && previewData) {
            hydrateAlbumPreviewData(albumId, {
                ...previewData,
                collection,
            });
        } else if (collection.length > 0) {
            hydrateAlbumPreviewData(albumId, {
                version: 1,
                collection,
                pages: previewData?.pages || {},
                revision: collection.length,
            });
        }
    }

    const merged = mergeCloudCollectionToLocal(
        albumId,
        collection,
        previewData?.revision ?? collection.length
    );

    return {
        collection: getAlbumCollection(albumId),
        loaded: Boolean(previewData || collection.length > 0),
        merged,
    };
}

export async function addFilesToAlbumCollection(
    albumId,
    files,
    {
        photographerId,
        onProgress,
        skipDuplicateCheck = false,
        coverWrap = false,
        album = null,
        compressionTarget = null,
    } = {}
) {
    if (!albumId || !files?.length) return [];

    const all = readAll();
    const bucket = { ...(all[albumId] || {}), items: [...(all[albumId]?.items || [])] };
    onProgress?.({
        phase: 'preparing',
        message: 'Preparing photos…',
        current: 0,
        total: files.length,
    });

    const [workItems, pathContext] = await Promise.all([
        buildCollectionWorkItems(files),
        Promise.all([
            getPhotographerPathFolder(photographerId),
            getAlbumPathFolder(albumId),
        ]).then(([photographerFolder, albumFolder]) => ({
            photographerFolder,
            albumFolder,
        })),
    ]);

    const added = [];
    const batchUploadTs = Date.now();
    const baseSortOrder = nextCollectionSortOrder(bucket.items);
    let skippedDuplicates = 0;
    const duplicateItems = [];
    const knownHashes = skipDuplicateCheck
        ? new Map()
        : new Map(
              bucket.items
                  .filter((item) => item.contentHash)
                  .map((item) => [item.contentHash, item])
          );
    const legacyNameKeys = skipDuplicateCheck
        ? new Map()
        : new Map(
              bucket.items
                  .filter((item) => !item.contentHash)
                  .map((item) => safeSegment(item.name || 'photo'))
                  .filter(Boolean)
                  .map((key) => [
                      key,
                      bucket.items.find((item) => safeSegment(item.name || 'photo') === key),
                  ])
          );

    const pixelTarget =
        compressionTarget ??
        (album ? getAlbumUploadPixelTarget(album, { coverWrap }) : null);

    const optimizeTotal = workItems.length;
    const prepared = await runWithConcurrency(workItems, COMPRESS_CONCURRENCY, async (item, index) => {
        if (item.kind === 'file') {
            onProgress?.({
                phase: 'optimizing',
                message: `Optimizing photo ${index + 1} of ${optimizeTotal}…`,
                current: index,
                total: optimizeTotal,
            });
            const file = await compressImageForUpload(item.file, pixelTarget || undefined);
            const contentHash = skipDuplicateCheck ? null : await hashFile(file);
            return {
                kind: 'file',
                name: item.name,
                file,
                contentHash,
                sortIndex: item.sortIndex,
            };
        }

        const contentHash = skipDuplicateCheck ? null : await hashDataUrl(item.dataUrl);
        return {
            kind: 'dataUrl',
            name: item.name,
            dataUrl: item.dataUrl,
            contentHash,
            sortIndex: item.sortIndex,
        };
    });

    const uploadQueue = [];
    for (const entry of prepared) {
        const nameKey = safeSegment(entry.name || 'photo');
        if (!skipDuplicateCheck) {
            const duplicateItem =
                (entry.contentHash && knownHashes.get(entry.contentHash)) ||
                legacyNameKeys.get(nameKey);

            if (duplicateItem) {
                skippedDuplicates += 1;
                duplicateItems.push(duplicateItem);
                continue;
            }
        }

        uploadQueue.push({ ...entry, nameKey });
    }

    const uploadTotal = uploadQueue.length;
    let uploadCompleted = 0;
    if (uploadTotal > 0) {
        onProgress?.({
            phase: 'uploading',
            message: `Uploading photo 0 of ${uploadTotal}…`,
            current: 0,
            total: uploadTotal,
        });
    }

    const uploadFailures = [];
    const uploadedItems = await runWithConcurrency(
        uploadQueue,
        UPLOAD_CONCURRENCY,
        async (entry) => {
            try {
                const sortOrder = baseSortOrder + entry.sortIndex;
                let width;
                let height;
                try {
                    if (entry.kind === 'file') {
                        const dims = await loadImageDimensionsFromFile(entry.file);
                        width = dims?.width;
                        height = dims?.height;
                    } else if (entry.dataUrl) {
                        const dims = await loadCollectionItemDimensions({ dataUrl: entry.dataUrl });
                        width = dims?.width;
                        height = dims?.height;
                    }
                } catch {
                    /* dimensions optional */
                }
                const upload =
                    entry.kind === 'file'
                        ? await uploadCollectionFile({
                              file: entry.file,
                              sortIndex: entry.sortIndex,
                              batchUploadTs,
                              pathContext,
                          })
                        : await uploadCollectionImage({
                              albumId,
                              photographerId,
                              image: { name: entry.name, dataUrl: entry.dataUrl },
                              sortIndex: entry.sortIndex,
                              batchUploadTs,
                              pathContext,
                          });
                uploadCompleted += 1;
                onProgress?.({
                    phase: 'uploading',
                    message: `Uploading photo ${uploadCompleted} of ${uploadTotal}…`,
                    current: uploadCompleted,
                    total: uploadTotal,
                });
                return {
                    id: nextId(),
                    name: entry.name || 'Photo',
                    dataUrl: upload.url,
                    storagePath: upload.path,
                    contentHash: entry.contentHash,
                    nameKey: entry.nameKey,
                    sortOrder,
                    createdAt: batchUploadTs + entry.sortIndex,
                    size_bytes:
                        entry.kind === 'file'
                            ? Number(entry.file?.size) || 0
                            : 0,
                    ...(coverWrap ? { role: COVER_WRAP_ROLE } : {}),
                    ...(width > 0 && height > 0 ? { width, height } : {}),
                };
            } catch (err) {
                console.warn('Collection upload failed:', entry.name, err);
                uploadFailures.push(entry.name || 'Photo');
                return null;
            }
        }
    );

    const sortedUploads = uploadedItems
        .filter(Boolean)
        .sort((a, b) => readSortOrder(a) - readSortOrder(b));

    for (const item of sortedUploads) {
        const { nameKey, ...stored } = item;
        bucket.items.push(stored);
        added.push(stored);
        if (stored.contentHash) knownHashes.set(stored.contentHash, stored);
        else legacyNameKeys.set(nameKey, stored);
    }

    added.skippedDuplicates = skippedDuplicates;
    added.duplicateItems = duplicateItems;
    added.uploadFailures = uploadFailures;
    added.expectedCount = workItems.length;

    if (added.length > 0 || skippedDuplicates > 0) {
        persistCollectionBucket(all, albumId, bucket);
    }

    if (uploadFailures.length > 0) {
        const err = new Error(
            `Could not upload ${uploadFailures.length} of ${workItems.length} photo${
                workItems.length === 1 ? '' : 's'
            } (${uploadFailures.join(', ')}). Check your connection and try again.`
        );
        err.uploadFailures = uploadFailures;
        throw err;
    }

    return added;
}

function placementCollectionItems(collectionItems, blankCovers) {
    return blankCovers
        ? collectionItems.filter((item) => !isCoverWrapCollectionItem(item))
        : collectionItems;
}

function placementItemCollectionIndex(placementItem, collectionItems) {
    return collectionItems.findIndex((item) => item.id === placementItem.id);
}

/**
 * Collection indices that must stay fixed (front cover, 2nd spread, pre-end, end cover).
 * Middle inner spreads can be drag-reordered among themselves.
 */
export function getLockedCollectionIndices(collectionItems, album = null) {
    const locked = new Set();
    if (!collectionItems?.length || album?.has_covers !== true) return locked;

    const blankCovers = album?.blank_covers === true;
    if (blankCovers) {
        collectionItems.forEach((item, index) => {
            if (isCoverWrapCollectionItem(item)) locked.add(index);
        });
    }

    const placementItems = placementCollectionItems(collectionItems, blankCovers);
    if (!placementItems.length) return locked;

    const toCollectionIndex = (placementIndex) =>
        placementItemCollectionIndex(placementItems[placementIndex], collectionItems);

    locked.add(toCollectionIndex(0));

    if (!blankCovers && placementItems.length > 1) {
        locked.add(toCollectionIndex(1));
    }

    if (placementItems.length > 1) {
        locked.add(toCollectionIndex(placementItems.length - 1));
    }

    return locked;
}

export function getDraggableCollectionIndices(collectionItems, album = null) {
    const locked = getLockedCollectionIndices(collectionItems, album);
    return collectionItems.map((_, index) => index).filter((index) => !locked.has(index));
}

export function isDraggableCollectionIndex(index, collectionItems, album = null) {
    return !getLockedCollectionIndices(collectionItems, album).has(index);
}

function reorderDraggableCollectionItems(sorted, fromIndex, toIndex, album) {
    const draggable = getDraggableCollectionIndices(sorted, album);
    const fromPos = draggable.indexOf(fromIndex);
    const toPos = draggable.indexOf(toIndex);
    if (fromPos < 0 || toPos < 0 || fromPos === toPos) return sorted;

    const draggableItems = draggable.map((index) => sorted[index]);
    const moved = moveFileInOrder(draggableItems, fromPos, toPos);
    const reordered = sorted.slice();
    draggable.forEach((collectionIndex, i) => {
        reordered[collectionIndex] = moved[i];
    });
    return reordered;
}

/** Reorder collection thumbnails (updates sortOrder for grid + auto-place). */
export function reorderCollectionItems(albumId, fromIndex, toIndex, { album = null } = {}) {
    if (!albumId) return false;
    const all = readAll();
    const bucket = all[albumId];
    if (!bucket?.items?.length) return false;

    const sorted = sortCollectionItems(bucket.items);
    const reordered =
        album?.has_covers === true
            ? reorderDraggableCollectionItems(sorted, fromIndex, toIndex, album)
            : moveFileInOrder(sorted, fromIndex, toIndex);
    if (reordered === sorted) return false;

    persistCollectionBucket(all, albumId, {
        ...bucket,
        items: reordered.map((item, index) => ({
            ...item,
            sortOrder: index,
        })),
    });
    return true;
}

/** Apply an explicit collection order (updates sortOrder). */
export function applyCollectionSortOrder(albumId, orderedItemIds) {
    if (!albumId || !orderedItemIds?.length) return false;
    const all = readAll();
    const bucket = all[albumId];
    if (!bucket?.items?.length) return false;

    const byId = new Map(bucket.items.map((item) => [item.id, item]));
    const reordered = [];
    for (const id of orderedItemIds) {
        const item = byId.get(id);
        if (item) reordered.push(item);
    }
    for (const item of sortCollectionItems(bucket.items)) {
        if (!reordered.some((row) => row.id === item.id)) {
            reordered.push(item);
        }
    }

    const sorted = sortCollectionItems(bucket.items);
    const unchanged =
        reordered.length === sorted.length &&
        reordered.every((item, index) => item.id === sorted[index]?.id);
    if (unchanged) return false;

    persistCollectionBucket(all, albumId, {
        ...bucket,
        items: reordered.map((item, index) => ({
            ...item,
            sortOrder: index,
        })),
    });
    return true;
}

export function getCollectionItem(albumId, itemId) {
    return getAlbumCollection(albumId).find((i) => i.id === itemId) ?? null;
}

/** Best URL for thumbnails and placement previews (prefers R2 public URL over stale dataUrl). */
export function getCollectionItemDisplayUrl(item, { cacheBust = null } = {}) {
    if (!item) return null;
    let url = null;
    if (item.storagePath) {
        url = storageService.getPublicUrl(item.storagePath);
    } else {
        url = item.dataUrl ?? null;
    }
    if (!url || cacheBust == null) return url;
    const token = encodeURIComponent(String(cacheBust));
    return url.includes('?') ? `${url}&v=${token}` : `${url}?v=${token}`;
}

export function removeCollectionItem(albumId, itemId) {
    const all = readAll();
    const bucket = all[albumId];
    if (!bucket?.items) return false;
    const next = bucket.items.filter((i) => i.id !== itemId);
    if (next.length === bucket.items.length) return false;
    persistCollectionBucket(all, albumId, { ...bucket, items: next });
    return true;
}

/** Replace a collection item's file in place (same id/sort order; does not grow the collection). */
export async function replaceCollectionItemFile(
    albumId,
    itemId,
    file,
    { photographerId, compressionTarget = null, retainPreviousStorage = false } = {}
) {
    if (!albumId || !itemId || !file || isPdfFile(file)) return null;
    const isImage = isImageFile(file) || (await probeImageFile(file));
    if (!isImage) return null;
    const item = getCollectionItem(albumId, itemId);
    if (!item) return null;

    const pathContext = await Promise.all([
        getPhotographerPathFolder(photographerId),
        getAlbumPathFolder(albumId),
    ]).then(([photographerFolder, albumFolder]) => ({ photographerFolder, albumFolder }));

    const prepared = await compressImageForUpload(file, compressionTarget || undefined);
    let width;
    let height;
    try {
        const dims = await loadImageDimensionsFromFile(prepared);
        width = dims?.width;
        height = dims?.height;
    } catch {
        /* dimensions optional */
    }

    const sortIndex = readSortOrder(item, 0);
    const uploaded = await uploadCollectionFile({
        file: prepared,
        sortIndex,
        batchUploadTs: Date.now(),
        pathContext,
    });

    const oldPath = item.storagePath;
    const all = readAll();
    const bucket = { ...(all[albumId] || {}) };
    bucket.items = (bucket.items || []).map((entry) => {
        if (entry.id !== itemId) return entry;
        const next = {
            ...entry,
            name: file.name || entry.name || 'Photo',
            dataUrl: uploaded.url,
            storagePath: uploaded.path,
            contentHash: undefined,
            size_bytes: Number(prepared?.size) || 0,
        };
        if (width > 0 && height > 0) {
            next.width = width;
            next.height = height;
        }
        return next;
    });
    persistCollectionBucket(all, albumId, bucket);

    if (oldPath && oldPath !== uploaded.path && !retainPreviousStorage) {
        try {
            await storageService.delete(oldPath);
        } catch (err) {
            console.warn('Could not delete replaced collection file from R2:', err);
        }
    }

    return getCollectionItem(albumId, itemId);
}

/** Remove one collection item and delete its R2 object when present. */
export async function deleteCollectionItemAsset(albumId, itemId, { retainStorage = false } = {}) {
    const item = getCollectionItem(albumId, itemId);
    if (!item) return false;

    if (item.storagePath && !retainStorage) {
        await storageService.delete(item.storagePath);
    }

    return removeCollectionItem(albumId, itemId);
}

/**
 * Deep-copy collection items into another album (re-uploads R2 objects under the target album path).
 * @returns {Map<string, string>} old collection item id → new id
 */
export async function duplicateAlbumCollection(sourceAlbumId, targetAlbumId, photographerId) {
    const idMap = new Map();
    if (!sourceAlbumId || !targetAlbumId || sourceAlbumId === targetAlbumId) {
        return idMap;
    }

    await loadAlbumAssetsFromCloud(sourceAlbumId, photographerId);
    const sourceItems = getAlbumCollection(sourceAlbumId);
    if (!sourceItems.length) return idMap;

    const newItems = [];
    const batchUploadTs = Date.now();
    for (let i = 0; i < sourceItems.length; i += 1) {
        const item = sourceItems[i];
        const newId = nextId();
        idMap.set(item.id, newId);

        const copied = {
            id: newId,
            name: item.name || 'Photo',
            sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now() + i,
        };
        if (item.contentHash) copied.contentHash = item.contentHash;

        const dataUrl =
            item.dataUrl ||
            (item.storagePath ? storageService.getPublicUrl(item.storagePath) : null);

        if (dataUrl && photographerId) {
            try {
                const uploaded = await uploadCollectionImage({
                    albumId: targetAlbumId,
                    photographerId,
                    image: { dataUrl, name: item.name },
                    sortIndex: i,
                    batchUploadTs,
                });
                copied.dataUrl = uploaded.url;
                copied.storagePath = uploaded.path;
                copied.size_bytes = Number(item.size_bytes) || 0;
            } catch (error) {
                console.warn(
                    'Could not re-upload collection item for duplicate:',
                    error?.message || error
                );
                copied.dataUrl = dataUrl;
            }
        } else if (dataUrl) {
            copied.dataUrl = dataUrl;
        }

        newItems.push(copied);
    }

    const all = readAll();
    persistCollectionBucket(all, targetAlbumId, {
        items: newItems,
        __revision: Date.now(),
    });
    return idMap;
}

export async function deleteAlbumCollectionAssets(albumId) {
    if (!albumId) return 0;

    const all = readAll();
    const bucket = all[albumId];
    const paths = Array.from(
        new Set((bucket?.items || []).map((item) => item.storagePath).filter(Boolean))
    );

    if (paths.length > 0) {
        await storageService.delete(paths);
    }

    if (bucket) {
        delete all[albumId];
        writeAll(all);
    }

    return paths.length;
}
