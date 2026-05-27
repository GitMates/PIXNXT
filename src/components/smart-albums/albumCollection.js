import { storageService } from '../../services/storage.service';
import { expandUploadFilesToImages } from '../../lib/pdfToImages';

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

function nextId() {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

async function dataUrlToFile(dataUrl, name) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const base = safeSegment(name);
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
}

async function uploadCollectionImage({ albumId, photographerId, image, index }) {
    const file = await dataUrlToFile(image.dataUrl, image.name || `photo-${index + 1}`);
    const path = [
        'smart-albums',
        photographerId || 'local',
        albumId,
        `${Date.now()}-${index + 1}-${safeSegment(file.name)}`
    ].join('/');
    return storageService.upload(path, file);
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

export async function addFilesToAlbumCollection(albumId, files, { photographerId } = {}) {
    if (!albumId || !files?.length) return [];

    const all = readAll();
    const bucket = { ...(all[albumId] || {}), items: [...(all[albumId]?.items || [])] };
    const expanded = await expandUploadFilesToImages(files);
    const added = [];
    let skippedDuplicates = 0;
    const duplicateItems = [];
    const knownHashes = new Map(
        bucket.items
            .filter((item) => item.contentHash)
            .map((item) => [item.contentHash, item])
    );
    const legacyNameKeys = new Map(
        bucket.items
            .filter((item) => !item.contentHash)
            .map((item) => safeSegment(item.name || 'photo'))
            .filter(Boolean)
            .map((key) => [key, bucket.items.find((item) => safeSegment(item.name || 'photo') === key)])
    );

    for (let i = 0; i < expanded.length; i += 1) {
        const { name, dataUrl } = expanded[i];
        const contentHash = await hashDataUrl(dataUrl);
        const nameKey = safeSegment(name || 'photo');
        const duplicateItem =
            (contentHash && knownHashes.get(contentHash)) || legacyNameKeys.get(nameKey);

        if (duplicateItem) {
            skippedDuplicates += 1;
            duplicateItems.push(duplicateItem);
            continue;
        }

        const upload = await uploadCollectionImage({
            albumId,
            photographerId,
            image: { name, dataUrl },
            index: i,
        });
        const item = {
            id: nextId(),
            name: name || 'Photo',
            dataUrl: upload.url,
            storagePath: upload.path,
            contentHash,
            createdAt: Date.now(),
        };
        bucket.items.push(item);
        added.push(item);
        if (contentHash) knownHashes.set(contentHash, item);
        else legacyNameKeys.set(nameKey, item);
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
