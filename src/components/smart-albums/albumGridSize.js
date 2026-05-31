export const GRID_SIZE_PRESETS = {
    square: { label: 'Square pages (1:1)', aspect: 1 },
    portrait: { label: 'Portrait pages (4:5)', aspect: 4 / 5 },
    landscape: { label: 'Landscape pages (5:4)', aspect: 5 / 4 },
    wide: { label: 'Wide pages (16:9)', aspect: 16 / 9 },
};

export const GRID_SIZE_OPTIONS = Object.entries(GRID_SIZE_PRESETS).map(([value, meta]) => ({
    value,
    label: meta.label,
}));

/** Parse user input like "3:2", "3x2", or "3/2" into width/height parts. */
export function parseCustomAspectRatioInput(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/i);
    if (!match) return null;
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (!(w > 0 && h > 0)) return null;
    return { w, h, aspect: w / h };
}

/** Stored value for a custom ratio, e.g. custom-3-2 */
export function customGridSizeKey({ w, h }) {
    return `custom-${w}-${h}`;
}

export function parseGridSizeAspect(gridSize) {
    if (!gridSize) return GRID_SIZE_PRESETS.square.aspect;
    if (GRID_SIZE_PRESETS[gridSize]) return GRID_SIZE_PRESETS[gridSize].aspect;

    const stored = String(gridSize).match(/^custom-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (stored) {
        const w = Number(stored[1]);
        const h = Number(stored[2]);
        if (w > 0 && h > 0) return w / h;
    }

    return GRID_SIZE_PRESETS.square.aspect;
}

export function formatGridSizeLabel(gridSize) {
    if (!gridSize) return GRID_SIZE_PRESETS.square.label;
    if (GRID_SIZE_PRESETS[gridSize]) return GRID_SIZE_PRESETS[gridSize].label;

    const stored = String(gridSize).match(/^custom-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (stored) {
        return `Custom pages (${stored[1]}:${stored[2]})`;
    }

    if (String(gridSize).startsWith('custom-')) {
        const slug = String(gridSize).slice(7).replace(/-/g, ':');
        return `Custom pages (${slug})`;
    }

    return GRID_SIZE_PRESETS.square.label;
}
