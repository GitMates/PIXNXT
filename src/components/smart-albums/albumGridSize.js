import { isImageFile, isPdfFile } from '../../lib/pdfToImages';

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

const GRID_LAYOUT_LABELS = {
    'two-page': 'Two-page grid (left + right)',
    'whole-spread': 'Whole-spread photo',
};

const PRESET_MATCH_TOLERANCE = 0.06;

function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x || 1;
}

/** Map pixel dimensions to a preset or custom-{w}-{h} grid size key. */
export function gridSizeFromDimensions(width, height) {
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0 && h > 0)) return 'square';

    const aspect = w / h;
    let bestKey = 'square';
    let bestDiff = Infinity;

    for (const [key, meta] of Object.entries(GRID_SIZE_PRESETS)) {
        const diff = Math.abs(Math.log(aspect) - Math.log(meta.aspect));
        if (diff < bestDiff) {
            bestDiff = diff;
            bestKey = key;
        }
    }

    const presetAspect = GRID_SIZE_PRESETS[bestKey].aspect;
    if (Math.abs(aspect - presetAspect) / presetAspect <= PRESET_MATCH_TOLERANCE) {
        return bestKey;
    }

    const g = gcd(w, h);
    return customGridSizeKey({ w: Math.round(w / g), h: Math.round(h / g) });
}

function loadImageFileDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image'));
        };
        img.src = url;
    });
}

const MAX_PDF_PAGES_FOR_GRID = 40;

async function getPdfjs() {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }
    return pdfjs;
}

async function loadPdfAllPageDimensions(file) {
    const pdfjs = await getPdfjs();
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES_FOR_GRID);
    const dimensions = [];

    for (let i = 1; i <= pageCount; i += 1) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        dimensions.push({ width: viewport.width, height: viewport.height });
    }

    return dimensions;
}

function median(sortedNumbers) {
    if (!sortedNumbers.length) return 0;
    const mid = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 === 1) return sortedNumbers[mid];
    return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
}

/** Combine dimensions from every image and PDF page into one grid size. */
export function gridSizeFromAllDimensions(dimensions) {
    const valid = (dimensions || []).filter((d) => d?.width > 0 && d?.height > 0);
    if (!valid.length) return 'square';

    const aspects = valid.map((d) => d.width / d.height).sort((a, b) => a - b);
    const medianAspect = median(aspects);

    let bestKey = 'square';
    let bestDiff = Infinity;
    for (const [key, meta] of Object.entries(GRID_SIZE_PRESETS)) {
        const diff = Math.abs(Math.log(medianAspect) - Math.log(meta.aspect));
        if (diff < bestDiff) {
            bestDiff = diff;
            bestKey = key;
        }
    }

    const presetAspect = GRID_SIZE_PRESETS[bestKey].aspect;
    if (Math.abs(medianAspect - presetAspect) / presetAspect <= PRESET_MATCH_TOLERANCE) {
        return bestKey;
    }

    const widths = valid.map((d) => d.width).sort((a, b) => a - b);
    const heights = valid.map((d) => d.height).sort((a, b) => a - b);
    return gridSizeFromDimensions(median(widths), median(heights));
}

async function collectAllUploadDimensions(files) {
    const batches = await Promise.all(
        (files || []).map(async (file) => {
            try {
                if (isImageFile(file)) {
                    const dims = await loadImageFileDimensions(file);
                    return [dims];
                }
                if (isPdfFile(file)) {
                    return await loadPdfAllPageDimensions(file);
                }
            } catch (e) {
                console.warn('Could not read dimensions for grid size', file?.name, e);
            }
            return [];
        })
    );
    return batches.flat();
}

/**
 * Detect grid size from all uploaded images and every PDF page.
 */
export async function detectGridSizeFromFiles(files) {
    if (!files?.length) return 'square';
    const dimensions = await collectAllUploadDimensions(files);
    return gridSizeFromAllDimensions(dimensions);
}

export function formatGridLayoutLabel(gridLayout) {
    if (!gridLayout) return GRID_LAYOUT_LABELS['two-page'];
    if (GRID_LAYOUT_LABELS[gridLayout]) return GRID_LAYOUT_LABELS[gridLayout];
    if (String(gridLayout).startsWith('custom-')) {
        const slug = String(gridLayout).slice(7).replace(/-/g, ' ');
        return `Custom layout (${slug})`;
    }
    return GRID_LAYOUT_LABELS['two-page'];
}

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
