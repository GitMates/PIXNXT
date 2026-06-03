import {
    getEndSpreadPageIndices,
    isEndHalfSpreadLeftPage,
} from './albumSpreadUtils';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getPagePhotoOverride,
    getSpreadPhotoOverride,
} from './albumPagePhotos';

const STORAGE_KEY = 'pixnxt_album_page_photos';

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
        return true;
    } catch (e) {
        console.warn('Could not save album photos', e);
        return false;
    }
}

function spreadStorageKey(leftPage) {
    return `spread:${leftPage}`;
}

function normalizeSpreadOpts(spreadOpts, totalPages) {
    if (spreadOpts?.hasCovers != null || spreadOpts?.showCover != null) {
        return { ...spreadOpts, totalPages: spreadOpts.totalPages ?? totalPages };
    }
    return { showCover: true, hasCovers: true, totalPages };
}

/** Primary storage key used by a slot (page index string or spread:left). */
export function getSlotStorageDescriptor(albumId, slot, totalPages, spreadOpts) {
    if (!slot) return null;
    const opts = normalizeSpreadOpts(spreadOpts, totalPages);
    const spreadLeft =
        slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, opts);

    if (slot.pageNum === 0) {
        return { kind: 'page', key: '0', pageNum: 0, spreadLeft: 0 };
    }

    if (slot.whole) {
        return { kind: 'spread', key: spreadStorageKey(spreadLeft), pageNum: spreadLeft, spreadLeft };
    }

    if (totalPages != null && isEndHalfSpreadLeftPage(spreadLeft, totalPages)) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        return { kind: 'page', key: String(endLeft), pageNum: endLeft, spreadLeft: endLeft };
    }

    const photoIndex = getProofCellPhotoIndex(
        slot.pageNum,
        slot.cellId || 1,
        totalPages,
        opts
    );
    const spreadKey = spreadStorageKey(spreadLeft);

    if (albumId) {
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
        const pageSrc = getPagePhotoOverride(albumId, photoIndex);
        if (spreadSrc && !pageSrc) {
            return {
                kind: 'spread',
                key: spreadKey,
                pageNum: photoIndex,
                spreadLeft,
                panoramicCell: slot.cellId,
            };
        }
    }

    return { kind: 'page', key: String(photoIndex), pageNum: photoIndex, spreadLeft };
}

export function slotHasPhoto(albumId, slot, totalPages, spreadOpts) {
    if (!albumId || !slot) return false;
    if (slot.pageNum === 0) {
        return Boolean(getPagePhotoOverride(albumId, 0) || getSpreadPhotoOverride(albumId, 0));
    }
    const opts = normalizeSpreadOpts(spreadOpts, totalPages);
    const spreadLeft =
        slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, opts);
    if (slot.whole) {
        return Boolean(getSpreadPhotoOverride(albumId, spreadLeft));
    }
    const photoIndex = getProofCellPhotoIndex(
        slot.pageNum,
        slot.cellId || 1,
        totalPages,
        opts
    );
    return Boolean(
        getPagePhotoOverride(albumId, photoIndex) ||
            getSpreadPhotoOverride(albumId, spreadLeft)
    );
}

export function clearSlotPhoto(albumId, slot, totalPages) {
    if (!albumId || !slot) return false;
    const info = getSlotStorageDescriptor(albumId, slot, totalPages);
    if (!info) return false;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    let changed = false;

    if (info.kind === 'page' && info.key in album) {
        delete album[info.key];
        changed = true;
    }
    if (info.kind === 'spread' || getSpreadPhotoOverride(albumId, info.spreadLeft)) {
        const sk = spreadStorageKey(info.spreadLeft);
        if (sk in album) {
            delete album[sk];
            changed = true;
        }
    }

    const spreadLeft = info.spreadLeft;
    if (slot.whole && spreadLeft != null) {
        const right = spreadLeft + 1;
        if (String(spreadLeft) in album) {
            delete album[String(spreadLeft)];
            changed = true;
        }
        if (String(right) in album) {
            delete album[String(right)];
            changed = true;
        }
    }

    if (!changed) return false;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

/** Clear photos on a spread — whole, left page only, or right page only. */
export function clearSpreadPhotos(albumId, spreadLeft, totalPages, scope = 'whole') {
    if (!albumId || spreadLeft == null) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    let changed = false;

    const touch = (key) => {
        if (key in album) {
            delete album[key];
            changed = true;
        }
    };

    const sk = spreadStorageKey(spreadLeft);
    if (scope === 'whole' || scope === 'left') {
        touch(sk);
        touch(String(spreadLeft));
    }
    if (scope === 'whole' || scope === 'right') {
        const right = spreadLeft + 1;
        if (right < totalPages) touch(String(right));
    }

    if (!changed) return false;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

function readTransformPair(albumId, descA, descB) {
    const transforms = (() => {
        try {
            const raw = localStorage.getItem('pixnxt_album_page_transforms');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    })();
    const album = transforms[albumId] || {};
    const keyA = descA.kind === 'spread' ? spreadStorageKey(descA.spreadLeft) : descA.key;
    const keyB = descB.kind === 'spread' ? spreadStorageKey(descB.spreadLeft) : descB.key;
    return {
        album,
        all: transforms,
        keyA,
        keyB,
        valA: album[keyA],
        valB: album[keyB],
    };
}

function writeTransformPair(albumId, albumT, allT, keyA, keyB, valA, valB) {
    const next = { ...albumT };
    if (valA != null) next[keyA] = valA;
    else delete next[keyA];
    if (valB != null) next[keyB] = valB;
    else delete next[keyB];
    next.__revision = (next.__revision || 0) + 1;
    allT[albumId] = next;
    try {
        localStorage.setItem('pixnxt_album_page_transforms', JSON.stringify(allT));
    } catch {
        /* ignore */
    }
}

/** Swap placed photos (and pan/zoom) between two slots. */
export function swapPhotoSlots(albumId, slotA, slotB, totalPages, spreadOpts) {
    if (!albumId || !slotA || !slotB) return false;

    const descA = getSlotStorageDescriptor(albumId, slotA, totalPages, spreadOpts);
    const descB = getSlotStorageDescriptor(albumId, slotB, totalPages, spreadOpts);
    if (!descA || !descB) return false;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    const valA = album[descA.key];
    const valB = album[descB.key];

    if (valA == null && valB == null) return false;

    if (valA != null) album[descB.key] = valA;
    else delete album[descB.key];
    if (valB != null) album[descA.key] = valB;
    else delete album[descA.key];

    if (descA.kind === 'page' && descB.kind === 'spread') {
        if (descA.key in album && descA.key !== descB.key) {
            /* page-only override on A may shadow spread on B — keep page keys in sync */
        }
    }

    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    const ok = writeAll(all);

    const t = readTransformPair(albumId, descA, descB);
    writeTransformPair(albumId, t.album, t.all, t.keyA, t.keyB, t.valB, t.valA);

    return ok;
}
