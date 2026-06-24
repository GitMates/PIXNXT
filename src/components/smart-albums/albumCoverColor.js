import { clearCoverLeatherSurfaceCache } from './coverLeatherSurface';
import { getRemotePreviewData } from './albumPreviewData';

const STORAGE_KEY = 'pixnxt_album_cover_color';

export const COVER_COLOR_CHANGED_EVENT = 'pixnxt-album-cover-color-changed';

export const COVER_LEATHER_PRESETS = [
    {
        id: 'tan',
        label: 'Orange',
        base: '#e07b32',
        highlight: '#f0a060',
        shadow: '#b85c28',
        spine: '#c86a30',
        text: '#8a4018',
    },
    {
        id: 'sky',
        label: 'Dark blue',
        base: '#1a3d66',
        highlight: '#2a5588',
        shadow: '#0f2844',
        spine: '#183558',
        text: '#8eb8dc',
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
        label: 'Brown',
        base: '#7a4f2a',
        highlight: '#a87248',
        shadow: '#523218',
        spine: '#5c381e',
        text: '#3d2410',
    },
];

export const DEFAULT_COVER_COLOR_PRESET_ID = 'sky';

const DEFAULT_PRESET_ID = DEFAULT_COVER_COLOR_PRESET_ID;

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
    const remotePreset = getRemotePreviewData(albumId)?.cover_color_preset;
    if (remotePreset && COVER_LEATHER_PRESETS.some((p) => p.id === remotePreset)) {
        return remotePreset;
    }
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
