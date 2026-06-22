import {
    blankCoverWrapAspect,
    computeSpineWidthUnits,
    coverSpreadWidthHeightFromAlbum,
    innerSpreadAspectFromAlbum,
    innerSpreadWidthHeightFromAlbum,
    parseGridSizeAspect,
    spreadGridSizeFromPageGrid,
} from './albumGridSize';
import { getAlbumSpineBoundsOverride } from './albumSpineSettings';
import { photoTransformStyle } from './albumPageTransforms';

function resolveWrapAspect(album) {
    const innerSpreadAspect = innerSpreadAspectFromAlbum(album);

    // Live cover image aspect always wins for book-wrap spine (y).
    if (album?.__wrap_aspect > 0 && album?.blank_covers !== true) {
        return album.__wrap_aspect;
    }

    // Blank covers: wrap comes from the uploaded cover image, not spread_grid_size (inner spread).
    if (album?.blank_covers === true) {
        const baseWrap = blankCoverWrapAspect(album?.grid_size);
        if (album?.__wrap_aspect > 0) {
            return Math.max(baseWrap, album.__wrap_aspect);
        }
        return baseWrap;
    }

    const spreadKey =
        album?.spread_grid_size ??
        spreadGridSizeFromPageGrid(album?.grid_size, album?.grid_layout);
    if (spreadKey) return parseGridSizeAspect(spreadKey);
    if (album?.__wrap_aspect > 0) return album.__wrap_aspect;
    return innerSpreadAspect;
}

const MIN_SPINE_FRACTION = 0.004;
const MIN_COVER_FRACTION = 0.12;

/**
 * Spine from cover wrap (y) minus inner spread (x), centered:
 * spineFraction = (wrapAspect − innerSpreadAspect) / wrapAspect
 */
function computeAutoSpineBounds(wrapAspect, innerSpreadAspect) {
    if (wrapAspect > innerSpreadAspect * 1.001) {
        const spineFraction = (wrapAspect - innerSpreadAspect) / wrapAspect;
        const spineStartFraction = (1 - spineFraction) / 2;
        const spineEndFraction = 1 - spineStartFraction;
        return {
            spineStartFraction,
            spineEndFraction,
            spineFraction,
            spineFromCoverCalc: true,
        };
    }

    const spineStartFraction = Math.max(0, (1 - innerSpreadAspect / wrapAspect) / 2);
    const spineEndFraction = 1 - spineStartFraction;
    const spineFraction = Math.max(0, spineEndFraction - spineStartFraction);
    return {
        spineStartFraction,
        spineEndFraction,
        spineFraction,
        spineFromCoverCalc: false,
    };
}

/**
 * Book-wrap layout: | back cover | spine | front cover |
 * Spine sits in the center strip of the wrap image; bounds are fractions of wrap width.
 */
export function getBookWrapSpineLayout(album) {
    const pageAspect = parseGridSizeAspect(album?.grid_size);
    const innerSpreadAspect = innerSpreadAspectFromAlbum(album);
    const wrapAspect = resolveWrapAspect(album);

    const autoBounds = computeAutoSpineBounds(wrapAspect, innerSpreadAspect);
    let { spineStartFraction, spineEndFraction, spineFraction, spineFromCoverCalc } = autoBounds;

    const override = getAlbumSpineBoundsOverride(album?.id);
    if (override && !spineFromCoverCalc) {
        spineStartFraction = override.spineStartFraction;
        spineEndFraction = override.spineEndFraction;
        spineFraction = Math.max(0, spineEndFraction - spineStartFraction);
    }

    const innerSize = innerSpreadWidthHeightFromAlbum(album);
    const coverSize = coverSpreadWidthHeightFromAlbum(album, wrapAspect);
    const spineWidthUnits = computeSpineWidthUnits(innerSize, coverSize);

    const coverFraction = spineStartFraction;

    return {
        pageAspect,
        wrapAspect,
        innerSpreadAspect,
        spineStartFraction,
        spineEndFraction,
        spineFraction,
        defaultSpineStartFraction: autoBounds.spineStartFraction,
        defaultSpineEndFraction: autoBounds.spineEndFraction,
        defaultSpineFraction: autoBounds.spineFraction,
        spineFromCoverCalc,
        spineWidthUnits,
        coverFraction,
        hasSpine: spineFraction > MIN_SPINE_FRACTION,
    };
}

export function clampSpineBounds(
    spineStartFraction,
    spineEndFraction,
    layout,
    { fixedEdge = null } = {}
) {
    if (layout?.spineFromCoverCalc) {
        return {
            spineStartFraction: layout.defaultSpineStartFraction,
            spineEndFraction: layout.defaultSpineEndFraction,
        };
    }

    const defaultSpineFraction = Math.max(
        MIN_SPINE_FRACTION,
        layout?.defaultSpineFraction ?? MIN_SPINE_FRACTION
    );
    const maxSpineFraction = defaultSpineFraction * 2;

    let start = spineStartFraction;
    let end = spineEndFraction;

    if (fixedEdge === 'end') {
        start = Math.min(start, end - MIN_SPINE_FRACTION);
        start = Math.max(start, end - maxSpineFraction);
    } else if (fixedEdge === 'start') {
        end = Math.max(end, start + MIN_SPINE_FRACTION);
        end = Math.min(end, start + maxSpineFraction);
    } else if (end - start > maxSpineFraction) {
        const center = (start + end) / 2;
        start = center - maxSpineFraction / 2;
        end = center + maxSpineFraction / 2;
    }

    if (end - start < MIN_SPINE_FRACTION) {
        const mid = (start + end) / 2;
        start = mid - MIN_SPINE_FRACTION / 2;
        end = mid + MIN_SPINE_FRACTION / 2;
    }
    if (start < MIN_COVER_FRACTION) {
        start = MIN_COVER_FRACTION;
        end = Math.max(end, start + MIN_SPINE_FRACTION);
        if (fixedEdge === 'end') {
            end = Math.min(end, start + maxSpineFraction);
        }
    }
    if (end > 1 - MIN_COVER_FRACTION) {
        end = 1 - MIN_COVER_FRACTION;
        start = Math.min(start, end - MIN_SPINE_FRACTION);
        if (fixedEdge === 'start') {
            start = Math.max(start, end - maxSpineFraction);
        }
    }

    return { spineStartFraction: start, spineEndFraction: end };
}

export function getBookWrapSpineCssVars(layout) {
    if (!layout?.hasSpine) return {};
    return {
        '--wrap-cover-fraction': String(layout.spineStartFraction),
        '--wrap-spine-fraction': String(layout.spineFraction),
        '--wrap-spine-start': String(layout.spineStartFraction),
        '--wrap-spine-end': String(layout.spineEndFraction),
    };
}

/** Pixel width of spine panel for a given page height. */
export function getBookWrapSpinePanelWidth(pageHeight, layout) {
    if (!layout?.hasSpine || !pageHeight) return 0;
    return Math.max(
        4,
        Math.round(pageHeight * layout.wrapAspect * layout.spineFraction)
    );
}

export function bookWrapCoverImageStyle(layout, side, transform, { panoramic = null } = {}) {
    const base = photoTransformStyle(transform, { panoramic });
    if (!layout?.hasSpine) {
        if (side === 'back') {
            return {
                ...base,
                width: '200%',
                maxWidth: 'none',
                objectPosition: 'left center',
            };
        }
        if (side === 'front') {
            return {
                ...base,
                width: '200%',
                maxWidth: 'none',
                marginLeft: '-100%',
                objectPosition: 'right center',
            };
        }
        return base;
    }

    const start = layout.spineStartFraction;
    const end = layout.spineEndFraction;
    const spine = layout.spineFraction;

    if (side === 'back' && start > 0) {
        return {
            ...base,
            width: `${100 / start}%`,
            maxWidth: 'none',
            objectPosition: 'left center',
        };
    }
    if (side === 'front' && end < 1) {
        const frontFrac = 1 - end;
        return {
            ...base,
            width: `${100 / frontFrac}%`,
            maxWidth: 'none',
            marginLeft: `${(-100 * end) / frontFrac}%`,
            objectPosition: 'right center',
        };
    }
    if (side === 'spine' && spine > 0) {
        return {
            ...base,
            width: `${100 / spine}%`,
            maxWidth: 'none',
            marginLeft: `${(-100 * start) / spine}%`,
            objectPosition: 'center center',
        };
    }
    return base;
}
