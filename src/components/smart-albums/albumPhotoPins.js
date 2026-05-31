const STORAGE_KEY = 'pixnxt_album_photo_pins';

export const PHOTO_PINS_CHANGED_EVENT = 'pixnxt-album-photo-pins-changed';

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

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}
