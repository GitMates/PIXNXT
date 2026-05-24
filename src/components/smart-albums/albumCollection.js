const STORAGE_KEY = 'pixnxt_album_collections';

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

import { expandUploadFilesToImages } from '../../lib/pdfToImages';

function nextId() {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getAlbumCollection(albumId) {
    if (!albumId) return [];
    const list = readAll()[albumId];
    return Array.isArray(list?.items) ? list.items : [];
}

export function getAlbumCollectionRevision(albumId) {
    if (!albumId) return 0;
    return readAll()[albumId]?.__revision ?? 0;
}

export async function addFilesToAlbumCollection(albumId, files) {
    if (!albumId || !files?.length) return [];

    const all = readAll();
    const bucket = { ...(all[albumId] || {}), items: [...(all[albumId]?.items || [])] };
    const expanded = await expandUploadFilesToImages(files);
    const added = [];

    for (const { name, dataUrl } of expanded) {
        const item = {
            id: nextId(),
            name: name || 'Photo',
            dataUrl,
            createdAt: Date.now(),
        };
        bucket.items.push(item);
        added.push(item);
    }

    bucket.__revision = (bucket.__revision || 0) + 1;
    all[albumId] = bucket;
    writeAll(all);
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
