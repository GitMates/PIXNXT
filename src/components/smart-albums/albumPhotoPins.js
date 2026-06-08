const STORAGE_KEY = 'pixnxt_album_photo_pins';
const SEEN_KEY = 'pixnxt_album_photo_pins_seen';

export const PHOTO_PINS_CHANGED_EVENT = 'pixnxt-album-photo-pins-changed';
export const PHOTO_PINS_SEEN_CHANGED_EVENT = 'pixnxt-album-photo-pins-seen-changed';

export function makePinSlotKey(pageNum, cellId = 0) {
    return `${pageNum}:${cellId}`;
}

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
        window.dispatchEvent(new CustomEvent(PHOTO_PINS_CHANGED_EVENT, { detail: { albumId: null } }));
    } catch {
        /* ignore */
    }
}

function notify(albumId) {
    try {
        window.dispatchEvent(new CustomEvent(PHOTO_PINS_CHANGED_EVENT, { detail: { albumId } }));
    } catch {
        /* ignore */
    }
}

function readSeen() {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSeen(data) {
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function notifyPhotoPinsSeenChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(PHOTO_PINS_SEEN_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

export function isPhotoPinUnseen(albumId, pin) {
    if (!albumId || !pin?.id) return false;
    const seenAt = readSeen()[albumId]?.[pin.id];
    if (!seenAt) return true;
    const stamp = pin.updatedAt || pin.createdAt;
    if (!stamp) return false;
    return new Date(stamp).getTime() > new Date(seenAt).getTime();
}

export function countUnseenPhotoPins(albumId, pins) {
    return (pins || []).filter((pin) => isPhotoPinUnseen(albumId, pin)).length;
}

export function markPhotoPinsSeen(albumId, pins) {
    if (!albumId || !pins?.length) return;
    const all = readSeen();
    const bucket = { ...(all[albumId] || {}) };
    const now = new Date().toISOString();
    pins.forEach((pin) => {
        if (pin?.id) bucket[pin.id] = now;
    });
    all[albumId] = bucket;
    writeSeen(all);
    notifyPhotoPinsSeenChanged(albumId);
}

export function getPhotoPins(albumId) {
    if (!albumId) return [];
    return readAll()[albumId] || [];
}

export function getPinsForSlot(pins, pageNum, cellId = 0, { placementMode = 'single', spreadLeft = null } = {}) {
    if (placementMode === 'whole' && spreadLeft != null && pageNum > 0) {
        const onLeftPage = pageNum === spreadLeft && cellId === 1;
        const onRightPage = pageNum === spreadLeft + 1 && cellId === 2;
        if (!onLeftPage && !onRightPage) return [];

        return (pins || []).filter((pin) => {
            const pinPage = pin.pageNum;
            const pinCell = pin.cellId ?? 0;
            if (onLeftPage) {
                return pinPage === spreadLeft && pinCell === 1;
            }
            return pinPage === spreadLeft + 1 && pinCell === 2;
        });
    }

    const key = makePinSlotKey(pageNum, cellId);
    return (pins || []).filter((p) => makePinSlotKey(p.pageNum, p.cellId ?? 0) === key);
}

export function addPhotoPin(albumId, { pageNum, cellId = 0, xPct, yPct, message, label }) {
    if (!albumId || message == null) return null;
    const trimmed = String(message).trim();
    if (!trimmed) return null;

    const pin = {
        id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'comment',
        pageNum,
        cellId: cellId ?? 0,
        xPct: Math.min(100, Math.max(0, xPct)),
        yPct: Math.min(100, Math.max(0, yPct)),
        message: trimmed,
        label: label || null,
        createdAt: new Date().toISOString(),
    };

    const all = readAll();
    const list = [...(all[albumId] || []), pin];
    all[albumId] = list;
    writeAll(all);
    notify(albumId);
    return pin;
}

export function removePhotoPin(albumId, pinId) {
    if (!albumId || !pinId) return;
    const all = readAll();
    const list = all[albumId] || [];
    const next = list.filter((p) => p.id !== pinId);
    if (next.length === list.length) return;
    all[albumId] = next;
    writeAll(all);
    notify(albumId);
}

export function updatePhotoPin(albumId, pinId, patch = {}) {
    if (!albumId || !pinId) return null;
    const all = readAll();
    const list = all[albumId] || [];
    const idx = list.findIndex((p) => p.id === pinId);
    if (idx < 0) return null;
    const nextPin = {
        ...list[idx],
        ...patch,
        message:
            patch.message != null
                ? String(patch.message).trim()
                : list[idx].message,
        updatedAt: new Date().toISOString(),
    };
    if (!nextPin.message) return null;
    const nextList = [...list];
    nextList[idx] = nextPin;
    all[albumId] = nextList;
    writeAll(all);
    notify(albumId);
    return nextPin;
}

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}
