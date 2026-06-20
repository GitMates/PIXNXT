import { isImageFile, isPdfFile } from '../../lib/pdfToImages';
import { storageService } from '../../services/storage.service';
import { albumHasBlankCovers, isWholeSpreadLayout } from './albumSpreadUtils';
import { BOOK_PAGE_HEIGHT_MAX } from './albumBookDimensions';

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

/** Photo must be at least this wide vs a 2-page spread to count as whole-spread. */
export const WHOLE_SPREAD_FILL_RATIO = 0.92;

/** Full-upload aspect needed to span both pages (page grid × 2). */
export function spreadAspectFromPageGrid(pageGridSize = 'square') {
    const pageAspect = parseGridSizeAspect(pageGridSize);
    return pageAspect > 0 ? pageAspect * 2 : 2;
}

/** True when the image is wide enough to fill a whole inner spread. */
export function photoFillsWholeSpread(width, height, pageGridSize = 'square') {
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0 && h > 0)) return true;
    const photoAspect = w / h;
    const spreadAspect = spreadAspectFromPageGrid(pageGridSize);
    return photoAspect >= spreadAspect * WHOLE_SPREAD_FILL_RATIO;
}

export function photoFillsWholeFromItem(item, pageGridSize = 'square') {
    if (item?.width > 0 && item?.height > 0) {
        return photoFillsWholeSpread(item.width, item.height, pageGridSize);
    }
    return true;
}

/** Load pixel size from a collection item URL or stored fields. */
export function loadCollectionItemDimensions(item) {
    if (!item) return Promise.resolve(null);
    if (item.width > 0 && item.height > 0) {
        return Promise.resolve({ width: item.width, height: item.height });
    }
    const src = item.dataUrl || (item.storagePath ? storageService.getPublicUrl(item.storagePath) : null);
    if (!src) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            resolve(w > 0 && h > 0 ? { width: w, height: h } : null);
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

export async function resolvePhotoFillsWholeFlags(items, pageGridSize = 'square') {
    const flags = [];
    for (const item of items || []) {
        if (item?.width > 0 && item?.height > 0) {
            flags.push(photoFillsWholeSpread(item.width, item.height, pageGridSize));
            continue;
        }
        const dims = await loadCollectionItemDimensions(item);
        flags.push(
            dims ? photoFillsWholeSpread(dims.width, dims.height, pageGridSize) : true
        );
    }
    return flags;
}

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

/** Map aspect ratio to a preset or custom-{w}-{h} grid size key. */
export function gridSizeFromAspect(aspect) {
    const a = Number(aspect);
    if (!(a > 0)) return 'square';

    let bestKey = 'square';
    let bestDiff = Infinity;

    for (const [key, meta] of Object.entries(GRID_SIZE_PRESETS)) {
        const diff = Math.abs(Math.log(a) - Math.log(meta.aspect));
        if (diff < bestDiff) {
            bestDiff = diff;
            bestKey = key;
        }
    }

    const presetAspect = GRID_SIZE_PRESETS[bestKey].aspect;
    if (Math.abs(a - presetAspect) / presetAspect <= PRESET_MATCH_TOLERANCE) {
        return bestKey;
    }

    const w = Math.round(a * 1000);
    const h = 1000;
    const g = gcd(w, h);
    return customGridSizeKey({ w: Math.round(w / g), h: Math.round(h / g) });
}

/** Per-page aspect for one uploaded file (whole-spread uses half width per page). */
export function pageAspectFromFileDimensions(width, height, { wholeSpread = false } = {}) {
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0 && h > 0)) return 1;
    if (wholeSpread) return w / 2 / h;
    return w / h;
}

/** Map pixel dimensions to a preset or custom-{w}-{h} grid size key. */
export function gridSizeFromDimensions(width, height, { wholeSpread = false } = {}) {
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0 && h > 0)) return 'square';
    return gridSizeFromAspect(pageAspectFromFileDimensions(w, h, { wholeSpread }));
}

export function loadImageDimensionsFromFile(file) {
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
export function gridSizeFromAllDimensions(dimensions, { wholeSpread = false } = {}) {
    const valid = (dimensions || []).filter((d) => d?.width > 0 && d?.height > 0);
    if (!valid.length) return 'square';

    const aspects = valid
        .map((d) => pageAspectFromFileDimensions(d.width, d.height, { wholeSpread }))
        .sort((a, b) => a - b);
    return gridSizeFromAspect(median(aspects));
}

/** One entry per uploaded photo slot (each image + every PDF page), in pick order. */
async function collectExpandedPhotoDimensions(files) {
    const dimensions = [];
    for (const file of files || []) {
        try {
            if (isImageFile(file)) {
                const dims = await loadImageDimensionsFromFile(file);
                if (dims?.width > 0 && dims?.height > 0) dimensions.push(dims);
            } else if (isPdfFile(file)) {
                const pages = await loadPdfAllPageDimensions(file);
                for (const d of pages) {
                    if (d?.width > 0 && d?.height > 0) dimensions.push(d);
                }
            }
        } catch (e) {
            console.warn('Could not read dimensions for grid size', file?.name, e);
        }
    }
    return dimensions;
}

/**
 * Photos used for inner-page grid detection (0-based indices into expanded uploads).
 * Book wrap: 3rd through second-to-last (exclude 1, 2, and last).
 * Blank covers: 2nd through second-to-last (exclude 1 and last).
 */
export function selectInnerGridDimensions(
    allDims,
    { bookWrap = false, blankCovers = false } = {}
) {
    const n = allDims.length;
    if (n === 0) return [];

    if (bookWrap) {
        if (n >= 4) return allDims.slice(2, -1);
        if (n === 3) return allDims.slice(2);
        if (n === 2) return allDims.slice(1);
        return [];
    }

    if (blankCovers) {
        if (n >= 3) return allDims.slice(1, -1);
        if (n === 2) return allDims.slice(1);
        return allDims;
    }

    return allDims;
}

/**
 * Detect grid sizes from uploads.
 * Book wrap: photo 1 = spread grid; inner page grid from photos 3…second-to-last.
 * Blank covers: inner page grid from photos 2…second-to-last.
 * Two-page grid uses full per-page aspect; whole-spread uses half-width per page.
 */
export async function detectGridSizesFromFiles(
    files,
    { gridLayout, hasCovers = false, blankCovers = false } = {}
) {
    if (!files?.length) {
        return { pageGridSize: 'square', spreadGridSize: null };
    }
    const wholeSpread = isWholeSpreadLayout(gridLayout);
    const allDims = await collectExpandedPhotoDimensions(files);
    const bookWrap = hasCovers && !blankCovers;

    if (bookWrap && allDims.length >= 1) {
        const wrapDims = allDims[0];
        const innerDims = selectInnerGridDimensions(allDims, { bookWrap: true });

        const spreadGridSize = wrapDims
            ? gridSizeFromDimensions(wrapDims.width, wrapDims.height, { wholeSpread: false })
            : gridSizeFromAllDimensions(allDims, { wholeSpread: false });

        let pageGridSize = 'square';
        if (innerDims.length) {
            pageGridSize = gridSizeFromAllDimensions(innerDims, { wholeSpread });
        } else if (wrapDims) {
            pageGridSize = gridSizeFromDimensions(wrapDims.width, wrapDims.height, {
                wholeSpread,
            });
        } else {
            pageGridSize = gridSizeFromAllDimensions(allDims, { wholeSpread });
        }

        return { pageGridSize, spreadGridSize };
    }

    if (blankCovers && allDims.length >= 1) {
        const innerDims = selectInnerGridDimensions(allDims, { blankCovers: true });
        const pageGridSize = innerDims.length
            ? gridSizeFromAllDimensions(innerDims, { wholeSpread })
            : gridSizeFromAllDimensions(allDims, { wholeSpread });
        const spreadGridSize = wholeSpread
            ? gridSizeFromAllDimensions(allDims, { wholeSpread: false })
            : null;
        return { pageGridSize, spreadGridSize };
    }

    const pageGridSize = gridSizeFromAllDimensions(allDims, { wholeSpread });
    const spreadGridSize = wholeSpread
        ? gridSizeFromAllDimensions(allDims, { wholeSpread: false })
        : null;
    return { pageGridSize, spreadGridSize };
}

/** Load aspect ratio from an image URL (book wrap in editor). */
export function loadImageAspectFromUrl(src) {
    return new Promise((resolve) => {
        if (!src) {
            resolve(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            resolve(w > 0 && h > 0 ? w / h : null);
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/** spread_grid_size from album record, or measure book-wrap image when missing. */
export async function resolveAlbumSpreadGridSize(album, wrapSrc) {
    if (album?.spread_grid_size) return album.spread_grid_size;
    if (!album?.has_covers) return null;
    const derived = spreadGridSizeFromPageGrid(album?.grid_size, album?.grid_layout);
    if (derived) return derived;
    if (!wrapSrc) return null;
    const aspect = await loadImageAspectFromUrl(wrapSrc);
    return aspect > 0 ? gridSizeFromAspect(aspect) : null;
}

/** @deprecated Use detectGridSizesFromFiles */
export async function detectGridSizeFromFiles(files, { gridLayout } = {}) {
    const { pageGridSize } = await detectGridSizesFromFiles(files, { gridLayout });
    return pageGridSize;
}

function shortGridSizeLabel(gridSize) {
    return formatGridSizeLabel(gridSize).replace(/ pages /g, ' ');
}

export function formatGridSizeLabelForLayout(pageGridSize, gridLayout, { spreadGridSize } = {}) {
    const pageLabel = shortGridSizeLabel(pageGridSize);
    if (!isWholeSpreadLayout(gridLayout)) {
        const wrapLabel = spreadGridSize ? shortGridSizeLabel(spreadGridSize) : null;
        if (wrapLabel) {
            return `${pageLabel} pages · two-page spreads · book wrap ${wrapLabel}`;
        }
        return `${pageLabel} · two-page spreads (left + right)`;
    }
    const spreadLabel = spreadGridSize ? shortGridSizeLabel(spreadGridSize) : null;
    if (spreadLabel) {
        return `${pageLabel} per page · spread ${spreadLabel} (full upload width)`;
    }
    return `${pageLabel} per page · spread fits your upload width`;
}

/** Default spine strip as a fraction of blank-cover wrap width (before a photo is chosen). */
export const BLANK_COVER_SPINE_FRACTION = 0.07;

/** Wrap aspect for blank covers: inner spread plus a center spine strip. */
export function blankCoverWrapAspect(pageGridSize = 'square') {
    const pageAspect = parseGridSizeAspect(pageGridSize);
    const innerSpreadAspect = pageAspect * 2;
    return innerSpreadAspect / (1 - BLANK_COVER_SPINE_FRACTION);
}

export function blankCoverSpreadGridSize(pageGridSize = 'square') {
    return gridSizeFromAspect(blankCoverWrapAspect(pageGridSize));
}

/** Derive full-upload spread ratio from stored per-page grid (whole-spread albums). */
export function spreadGridSizeFromPageGrid(pageGridSize, gridLayout) {
    if (!isWholeSpreadLayout(gridLayout) || !pageGridSize) return null;
    const pageAspect = parseGridSizeAspect(pageGridSize);
    if (!(pageAspect > 0)) return null;
    return gridSizeFromAspect(pageAspect * 2);
}

/** Grid size line for album settings (matches create-page detection). */
export function formatAlbumGridSizeDisplay(album) {
    if (!album?.grid_size) return formatGridSizeLabel('square');
    const spreadGridSize =
        album.spread_grid_size ?? spreadGridSizeFromPageGrid(album.grid_size, album.grid_layout);
    return formatGridSizeLabelForLayout(album.grid_size, album.grid_layout, { spreadGridSize });
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
