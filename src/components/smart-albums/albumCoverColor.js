import { clearCoverLeatherSurfaceCache } from './coverLeatherSurface';

const STORAGE_KEY = 'pixnxt_album_cover_color';

export const COVER_COLOR_CHANGED_EVENT = 'pixnxt-album-cover-color-changed';

export const COVER_LEATHER_PRESETS = [
    {
        id: 'tan',
        label: 'Tan leather',
        base: '#c49a6c',
        highlight: '#ddb98e',
        shadow: '#9a7048',
        spine: '#b08858',
        text: '#6b4a2c',
    },
    {
        id: 'sky',
        label: 'Sky blue',
        base: '#42b4d4',
        highlight: '#7fd4ec',
        shadow: '#2a8fad',
        spine: '#38a4c4',
        text: '#1d6a82',
    },
    {
        id: 'cream',
        label: 'White',
        base: '#f8f8f8',
        highlight: '#ffffff',
        shadow: '#d6d6d6',
        spine: '#ececec',
        text: '#6e6e6e',
    },
    {
        id: 'charcoal',
        label: 'Charcoal',
        base: '#3a3a3a',
        highlight: '#525252',
        shadow: '#222222',
        spine: '#2e2e2e',
        text: '#141414',
    },
    {
        id: 'burgundy',
        label: 'Burgundy',
        base: '#6e2e3c',
        highlight: '#8e4454',
        shadow: '#4a1a24',
        spine: '#5e2630',
        text: '#3a1218',
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
    clearCoverLeatherSurfaceCache();
    notifyCoverColorChanged(albumId);
}

export function getCoverLeatherCssVars(presetId) {
    const preset = resolveCoverLeatherPreset(presetId);
    return {
        '--ab-leather-base': preset.base,
        '--ab-leather-highlight': preset.highlight,
        '--ab-leather-shadow': preset.shadow,
        '--ab-leather-text': preset.text,
    };
}
