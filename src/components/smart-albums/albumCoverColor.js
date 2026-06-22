const STORAGE_KEY = 'pixnxt_album_cover_color';

export const COVER_COLOR_CHANGED_EVENT = 'pixnxt-album-cover-color-changed';

export const COVER_LEATHER_PRESETS = [
    {
        id: 'tan',
        label: 'Tan leather',
        base: '#b8956a',
        highlight: '#d4b896',
        shadow: '#8f7048',
        spine: '#a68358',
        text: '#6b4f32',
    },
    {
        id: 'sky',
        label: 'Sky blue',
        base: '#5eb8d4',
        highlight: '#92d4ea',
        shadow: '#3a96b0',
        spine: '#4aa8c4',
        text: '#2a7088',
    },
    {
        id: 'cream',
        label: 'Cream',
        base: '#f0ebe0',
        highlight: '#faf8f3',
        shadow: '#d4ccc0',
        spine: '#e5dfd4',
        text: '#8f8474',
    },
    {
        id: 'charcoal',
        label: 'Charcoal',
        base: '#3d3d3d',
        highlight: '#565656',
        shadow: '#252525',
        spine: '#323232',
        text: '#1a1a1a',
    },
    {
        id: 'burgundy',
        label: 'Burgundy',
        base: '#6b2d3a',
        highlight: '#8c4454',
        shadow: '#4a1c26',
        spine: '#5c2632',
        text: '#3d141c',
    },
];

const DEFAULT_PRESET_ID = 'cream';

function notifyCoverColorChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(COVER_COLOR_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
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
    } catch {
        /* ignore */
    }
}

export function resolveCoverLeatherPreset(presetId) {
    const found = COVER_LEATHER_PRESETS.find((row) => row.id === presetId);
    return found || COVER_LEATHER_PRESETS.find((row) => row.id === DEFAULT_PRESET_ID);
}

/** @returns {string} preset id */
export function getAlbumCoverColor(albumId) {
    if (!albumId) return DEFAULT_PRESET_ID;
    const row = readAll()[albumId];
    const id = row?.presetId;
    if (id && COVER_LEATHER_PRESETS.some((p) => p.id === id)) return id;
    return DEFAULT_PRESET_ID;
}

export function setAlbumCoverColor(albumId, presetId) {
    if (!albumId) return;
    const valid = COVER_LEATHER_PRESETS.some((p) => p.id === presetId);
    if (!valid) return;
    const all = readAll();
    if (all[albumId]?.presetId === presetId) return;
    all[albumId] = { presetId, updatedAt: Date.now() };
    writeAll(all);
    notifyCoverColorChanged(albumId);
}

export function getCoverLeatherCssVars(presetId, { spine = false } = {}) {
    const preset = resolveCoverLeatherPreset(presetId);
    const base = spine ? preset.spine : preset.base;
    return {
        '--ab-leather-base': base,
        '--ab-leather-highlight': preset.highlight,
        '--ab-leather-shadow': preset.shadow,
        '--ab-leather-text': preset.text,
    };
}
