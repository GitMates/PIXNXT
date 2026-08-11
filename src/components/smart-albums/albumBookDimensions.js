import { parseGridSizeAspect } from './albumGridSize';

export const BOOK_PAGE_HEIGHT_MIN = 300;
export const BOOK_PAGE_HEIGHT_MAX = 520;
export const BOOK_PAGE_HEIGHT_SCALE = 0.93;
export const BOOK_STAGE_MIN_PX = 80;
/** Stage must be tall enough for real page height — avoids mounting while flex layout is still 0px. */
export const BOOK_STAGE_READY_MIN_PX = 300;
/** Spread label + floating toolbar sitting under the book inside the stage. */
export const BOOK_SPREAD_CHROME_PX = 76;

function isWholeSpreadLayout(gridLayout) {
    return gridLayout === 'whole-spread' || String(gridLayout || '').startsWith('whole-spread');
}

export function computeBookDimensions(w, h, gridSize = 'square', gridLayout = 'two-page') {
    if (w < BOOK_STAGE_MIN_PX || h < BOOK_STAGE_MIN_PX) return null;
    const aspect = parseGridSizeAspect(gridSize) || 1;
    const maxPageWidth = w / 2;
    const maxPageHeight = h * BOOK_PAGE_HEIGHT_SCALE;
    const naturalHeight = Math.floor(Math.min(maxPageHeight, maxPageWidth / aspect));
    const chromeRoom = Math.max(BOOK_PAGE_HEIGHT_MIN, h - BOOK_SPREAD_CHROME_PX);

    // Two-page albums (kavi) keep the 520px cap. Whole-spread albums fill the
    // stage so a single landscape photo does not sit in a smaller frame.
    const pageHeight = isWholeSpreadLayout(gridLayout)
        ? Math.max(BOOK_PAGE_HEIGHT_MIN, Math.min(naturalHeight, chromeRoom))
        : Math.max(BOOK_PAGE_HEIGHT_MIN, Math.min(BOOK_PAGE_HEIGHT_MAX, naturalHeight));

    return {
        width: Math.round(pageHeight * aspect),
        height: pageHeight,
    };
}

export function getBookDimensions(stageEl, gridSize = 'square', gridLayout = 'two-page') {
    if (!stageEl) return null;
    const h = stageEl.clientHeight;
    if (h < BOOK_STAGE_READY_MIN_PX) return null;
    return computeBookDimensions(stageEl.clientWidth, h, gridSize, gridLayout);
}

export function getFallbackBookDimensions(rootEl, gridSize = 'square', gridLayout = 'two-page') {
    const rootW = rootEl?.clientWidth ?? 0;
    const rootH = rootEl?.clientHeight ?? 0;
    const w =
        rootW > BOOK_STAGE_MIN_PX ? rootW - 48 : Math.min(960, window.innerWidth - 280);
    const h =
        rootH > BOOK_STAGE_MIN_PX ? rootH - 48 : Math.max(360, window.innerHeight - 280);
    return computeBookDimensions(w, h, gridSize, gridLayout);
}

export const BOOK_SCENE_CAMERA_FOV = 34;
export const BOOK_SCENE_CAMERA_DISTANCE = 6;

/** Map 2D page pixel size to 3D world units so cover matches AlbumBook page height on screen. */
export function pagePxToBook3dWorld(
    pageWidthPx,
    pageHeightPx,
    canvasHeightPx,
    { fovDeg = BOOK_SCENE_CAMERA_FOV, cameraDistance = BOOK_SCENE_CAMERA_DISTANCE } = {}
) {
    if (!(pageWidthPx > 0 && pageHeightPx > 0 && canvasHeightPx > 0)) return null;
    const fovRad = (fovDeg * Math.PI) / 180;
    const visibleHeight = 2 * cameraDistance * Math.tan(fovRad / 2);
    const worldPerPx = visibleHeight / canvasHeightPx;
    return {
        width: pageWidthPx * worldPerPx,
        height: pageHeightPx * worldPerPx,
        aspect: pageWidthPx / pageHeightPx,
        cameraDistance,
    };
}
