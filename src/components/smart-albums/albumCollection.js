import { storageService } from '../../services/storage.service';
import { expandUploadFilesToImages, isImageFile, isPdfFile } from '../../lib/pdfToImages';
import { compressImageForUpload } from '../../lib/prepareUploadFile';
import { supabase } from '../../lib/supabase/client';
import {
    getRemotePreviewData,
    hydrateAlbumPreviewData,
} from './albumPreviewData';

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

async function uploadCollectionImage({ albumId, photographerId, image, index, pathContext }) {
    const file = await dataUrlToFile(image.dataUrl, image.name || `photo-${index + 1}`);
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
        index,
        pathContext: resolvedPathContext,
    });
}

async function uploadCollectionFile({ file, index, pathContext }) {
    const { photographerFolder, albumFolder } = pathContext;
    const path = [
        'users',
        photographerFolder,
        'smart-album',
        albumFolder,
        `${Date.now()}-${index + 1}-${safeSegment(file.name)}`,
    ].join('/');
    return storageService.upload(path, file);
}

async function buildCollectionWorkItems(files) {
    const batches = await Promise.all(
        (files || []).map(async (file) => {
            try {
                if (isImageFile(file)) {
                    return [{ kind: 'file', file, name: file.name || 'Photo' }];
                }
                if (isPdfFile(file)) {
                    const pages = await expandUploadFilesToImages([file]);
                    return pages.map((page) => ({
                        kind: 'dataUrl',
                        name: page.name,
                        dataUrl: page.dataUrl,
                    }));
                }
                return [];
            } catch (e) {
                console.warn('Could not import file', file?.name, e);
                return [];
            }
        })
    );
    return batches.flat();
}

export function getAlbumCollection(albumId) {
    if (!albumId) return [];
    const list = readAll()[albumId];
    const localItems = Array.isArray(list?.items) ? list.items : [];
    if (localItems.length > 0) return localItems;

    const remote = getRemotePreviewData(albumId);
    return Array.isArray(remote?.collection) ? remote.collection : [];
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

function collectionItemFromR2Key(key, index) {
    return {
        id: stableItemIdFromPath(key),
        name: displayNameFromStoragePath(key),
        dataUrl: storageService.getPublicUrl(key),
        storagePath: key,
        createdAt: Date.now() + index,
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

    bucket.__revision = Math.max(bucket.__revision || 0, revision || 0, Date.now());
    all[albumId] = bucket;
    writeAll(all);
    return true;
}

async function listR2CollectionItems(albumId, photographerId) {
    const [photographerFolder, albumFolder] = await Promise.all([
        getPhotographerPathFolder(photographerId),
        getAlbumPathFolder(albumId),
    ]);
    const prefix = ['users', photographerFolder, 'smart-album', albumFolder, ''].join('/');
    try {
        const keys = await storageService.listByPrefix(prefix);
        return keys
            .filter((key) => /\.(jpe?g|png|webp|gif)$/i.test(key))
            .sort()
            .map((key, index) => collectionItemFromR2Key(key, index));
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
    { photographerId, onProgress, skipDuplicateCheck = false } = {}
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

    const optimizeTotal = workItems.length;
    const prepared = await runWithConcurrency(workItems, COMPRESS_CONCURRENCY, async (item, index) => {
        if (item.kind === 'file') {
            onProgress?.({
                phase: 'optimizing',
                message: `Optimizing photo ${index + 1} of ${optimizeTotal}…`,
                current: index,
                total: optimizeTotal,
            });
            const file = await compressImageForUpload(item.file);
            const contentHash = skipDuplicateCheck ? null : await hashFile(file);
            return {
                kind: 'file',
                name: item.name,
                file,
                contentHash,
                index,
            };
        }

        const contentHash = skipDuplicateCheck ? null : await hashDataUrl(item.dataUrl);
        return {
            kind: 'dataUrl',
            name: item.name,
            dataUrl: item.dataUrl,
            contentHash,
            index,
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

    const uploadedItems = await runWithConcurrency(
        uploadQueue,
        UPLOAD_CONCURRENCY,
        async (entry) => {
            const upload =
                entry.kind === 'file'
                    ? await uploadCollectionFile({
                          file: entry.file,
                          index: entry.index,
                          pathContext,
                      })
                    : await uploadCollectionImage({
                          albumId,
                          photographerId,
                          image: { name: entry.name, dataUrl: entry.dataUrl },
                          index: entry.index,
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
                createdAt: Date.now(),
            };
        }
    );

    for (const item of uploadedItems) {
        const { nameKey, ...stored } = item;
        bucket.items.push(stored);
        added.push(stored);
        if (stored.contentHash) knownHashes.set(stored.contentHash, stored);
        else legacyNameKeys.set(nameKey, stored);
    }

    added.skippedDuplicates = skippedDuplicates;
    added.duplicateItems = duplicateItems;

    if (added.length > 0 || skippedDuplicates > 0) {
        bucket.__revision = (bucket.__revision || 0) + 1;
        all[albumId] = bucket;
        writeAll(all);
    }
    return added;
}

export function getCollectionItem(albumId, itemId) {
    return getAlbumCollection(albumId).find((i) => i.id === itemId) ?? null;
}

export function removeCollectionItem(albumId, itemId) {
    const all = readAll();
    const bucket = all[albumId];
    if (!bucket?.items) return false;
    const next = bucket.items.filter((i) => i.id !== itemId);
    if (next.length === bucket.items.length) return false;
    all[albumId] = { ...bucket, items: next, __revision: (bucket.__revision || 0) + 1 };
    writeAll(all);
    return true;
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
    for (let i = 0; i < sourceItems.length; i += 1) {
        const item = sourceItems[i];
        const newId = nextId();
        idMap.set(item.id, newId);

        const copied = {
            id: newId,
            name: item.name || 'Photo',
            createdAt: Date.now() + i,
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
                    index: i,
                });
                copied.dataUrl = uploaded.url;
                copied.storagePath = uploaded.path;
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
    all[targetAlbumId] = {
        items: newItems,
        __revision: Date.now(),
    };
    writeAll(all);
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
