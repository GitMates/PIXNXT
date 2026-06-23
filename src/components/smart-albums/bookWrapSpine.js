import { getProxiedMediaFetchUrl } from '../../lib/r2MediaProxy';
import {
    blankCoverWrapAspect,
    computeSpineWidthUnits,
    coverSpreadWidthHeightFromAlbum,
    innerSpreadWidthHeightFromAlbum,
    parseGridSizeAspect,
    spreadAspectFromPageGrid,
    spreadGridSizeFromPageGrid,
} from './albumGridSize';
import { getAlbumSpineBoundsOverride } from './albumSpineSettings';
import { photoTransformStyle } from './albumPageTransforms';

function resolveWrapAspect(album) {
    const innerSpreadAspect = bookWrapInnerSpreadAspect(album);

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

/** Inner spread width ÷ height for book-wrap spine math (back + front, no spine strip). */
export function bookWrapInnerSpreadAspect(album) {
    const pageGridSize = album?.grid_size || 'square';
    if (album?.blank_covers === true) {
        const pageAspect = parseGridSizeAspect(pageGridSize);
        return pageAspect > 0 ? pageAspect * 2 : 2;
    }
    if (album?.has_covers === true) {
        return spreadAspectFromPageGrid(pageGridSize);
    }
    const spreadKey =
        album?.spread_grid_size ??
        spreadGridSizeFromPageGrid(pageGridSize, album?.grid_layout);
    if (spreadKey) return parseGridSizeAspect(spreadKey);
    return spreadAspectFromPageGrid(pageGridSize);
}

/**
 * Spine from cover wrap (y) minus inner spread (x), centered:
 * spineFraction = (wrapAspect − innerSpreadAspect) / wrapAspect
 */
function computeAutoSpineBounds(wrapAspect, innerSpreadAspect) {
    if (!(wrapAspect > 0 && innerSpreadAspect > 0)) {
        return {
            spineStartFraction: 0.5,
            spineEndFraction: 0.5,
            spineFraction: 0,
            spineFromCoverCalc: false,
        };
    }

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

    // Wrap is not wider than two covers — no spine strip from aspect math.
    return {
        spineStartFraction: 0.5,
        spineEndFraction: 0.5,
        spineFraction: 0,
        spineFromCoverCalc: false,
    };
}

/**
 * Book-wrap layout: | back cover | spine | front cover |
 * Spine sits in the center strip of the wrap image; bounds are fractions of wrap width.
 */
export function getBookWrapSpineLayout(album) {
    const pageAspect = parseGridSizeAspect(album?.grid_size);
    const innerSpreadAspect = bookWrapInnerSpreadAspect(album);
    const wrapAspect = resolveWrapAspect(album);

    const autoBounds = computeAutoSpineBounds(wrapAspect, innerSpreadAspect);
    let { spineStartFraction, spineEndFraction, spineFraction, spineFromCoverCalc } = autoBounds;

    const layoutDefaults = {
        defaultSpineStartFraction: autoBounds.spineStartFraction,
        defaultSpineEndFraction: autoBounds.spineEndFraction,
    };

    const override = getAlbumSpineBoundsOverride(album?.id);
    if (override) {
        if (spineFromCoverCalc && isInwardSpineOverride(override, layoutDefaults)) {
            spineStartFraction = override.spineStartFraction;
            spineEndFraction = override.spineEndFraction;
            spineFraction = Math.max(0, spineEndFraction - spineStartFraction);
        } else if (!spineFromCoverCalc) {
            const span = override.spineEndFraction - override.spineStartFraction;
            if (span > MIN_SPINE_FRACTION && span < 0.5) {
                spineStartFraction = override.spineStartFraction;
                spineEndFraction = override.spineEndFraction;
                spineFraction = span;
            }
        }
    }

    const innerSize = innerSpreadWidthHeightFromAlbum(album);
    const coverSize = coverSpreadWidthHeightFromAlbum(album, wrapAspect);
    const spineWidthUnits = computeSpineWidthUnits(innerSize, coverSize);

    const coverFraction = spineStartFraction;

    const coverSpineStartFraction = spineFromCoverCalc
        ? autoBounds.spineStartFraction
        : spineStartFraction;
    const coverSpineEndFraction = spineFromCoverCalc
        ? autoBounds.spineEndFraction
        : spineEndFraction;

    return {
        pageAspect,
        wrapAspect,
        innerSpreadAspect,
        spineStartFraction,
        spineEndFraction,
        spineFraction,
        coverSpineStartFraction,
        coverSpineEndFraction,
        spineDisplayStartFraction: spineStartFraction,
        spineDisplayEndFraction: spineEndFraction,
        spineZoneStartFraction: autoBounds.spineStartFraction,
        spineZoneEndFraction: autoBounds.spineEndFraction,
        defaultSpineStartFraction: autoBounds.spineStartFraction,
        defaultSpineEndFraction: autoBounds.spineEndFraction,
        defaultSpineFraction: autoBounds.spineFraction,
        spineFromCoverCalc,
        spineWidthUnits,
        coverFraction,
        hasSpine: spineFraction > MIN_SPINE_FRACTION,
    };
}

/** Image slice fractions for back | spine | front (covers stay fixed when spine panel narrows). */
export function resolveWrapSegmentBounds(layout, side) {
    if (!side) {
        return { start: 0, end: 1 };
    }

    if (!layout?.hasSpine) {
        if (side === 'back') return { start: 0, end: 0.5 };
        if (side === 'front') return { start: 0.5, end: 1 };
        if (side === 'spine' || side === 'spine-gap-before' || side === 'spine-gap-after') {
            return { start: 0.5, end: 0.5 };
        }
        return { start: 0, end: 1 };
    }

    const coverStart =
        layout.coverSpineStartFraction ??
        layout.defaultSpineStartFraction ??
        layout.spineStartFraction;
    const coverEnd =
        layout.coverSpineEndFraction ??
        layout.defaultSpineEndFraction ??
        layout.spineEndFraction;

    if (side === 'back') {
        return { start: 0, end: coverStart > 0 ? coverStart : 0.5 };
    }
    if (side === 'front') {
        return { start: coverEnd < 1 ? coverEnd : 0.5, end: 1 };
    }
    if (side === 'spine') {
        const zoneStart =
            layout.spineZoneStartFraction ??
            layout.defaultSpineStartFraction ??
            coverStart;
        const zoneEnd =
            layout.spineZoneEndFraction ??
            layout.defaultSpineEndFraction ??
            coverEnd;
        let start =
            layout.spineDisplayStartFraction ??
            layout.spineStartFraction;
        let end =
            layout.spineDisplayEndFraction ??
            layout.spineEndFraction;
        start = Math.max(zoneStart, Math.min(start, end - MIN_SPINE_FRACTION));
        end = Math.min(zoneEnd, Math.max(end, start + MIN_SPINE_FRACTION));
        return { start, end, zoneStart, zoneEnd };
    }
    if (side === 'spine-gap-before') {
        const zoneStart =
            layout.spineZoneStartFraction ??
            layout.defaultSpineStartFraction ??
            coverStart;
        const displayStart =
            layout.spineDisplayStartFraction ?? layout.spineStartFraction;
        return { start: zoneStart, end: Math.max(zoneStart, displayStart) };
    }
    if (side === 'spine-gap-after') {
        const zoneEnd =
            layout.spineZoneEndFraction ??
            layout.defaultSpineEndFraction ??
            coverEnd;
        const displayEnd = layout.spineDisplayEndFraction ?? layout.spineEndFraction;
        return { start: Math.min(zoneEnd, displayEnd), end: zoneEnd };
    }
    return { start: 0, end: 1 };
}

export function isSpineStretchWrapSide(side) {
    return side === 'spine' || side === 'spine-gap-before' || side === 'spine-gap-after';
}

/** CSS background for spine panel — selected slice of the wrap, always visible while dragging. */
export function bookWrapSpinePanelStyle(src, layout, transform) {
    if (!src || !layout?.hasSpine) return null;
    const { start, end } = resolveWrapSegmentBounds(layout, 'spine');
    const segW = end - start;
    if (!(segW > 0)) return null;

    const url = getProxiedMediaFetchUrl(src);
    const base = photoTransformStyle(transform);
    return {
        ...base,
        backgroundImage: `url(${url})`,
        backgroundSize: `${100 / segW}% 100%`,
        backgroundPosition: `${(-start / segW) * 100}% center`,
        backgroundRepeat: 'no-repeat',
    };
}

export function isInwardSpineOverride(override, layout) {
    if (!override || !layout) return false;
    const ds = layout.defaultSpineStartFraction;
    const de = layout.defaultSpineEndFraction;
    if (!(ds >= 0 && de > ds)) return false;
    const start = override.spineStartFraction;
    const end = override.spineEndFraction;
    const span = end - start;
    return (
        span >= MIN_SPINE_FRACTION &&
        start >= ds - 0.0001 &&
        end <= de + 0.0001
    );
}

export function clampSpineBounds(
    spineStartFraction,
    spineEndFraction,
    layout,
    { fixedEdge = null, inwardOnly = false } = {}
) {
    const defaultStart = layout?.defaultSpineStartFraction ?? layout?.spineStartFraction ?? 0;
    const defaultEnd = layout?.defaultSpineEndFraction ?? layout?.spineEndFraction ?? 1;

    if (inwardOnly && layout?.spineFromCoverCalc) {
        let start = spineStartFraction;
        let end = spineEndFraction;

        if (fixedEdge === 'end') {
            start = Math.max(defaultStart, Math.min(start, end - MIN_SPINE_FRACTION));
        } else if (fixedEdge === 'start') {
            end = Math.min(defaultEnd, Math.max(end, start + MIN_SPINE_FRACTION));
        } else {
            start = Math.max(defaultStart, Math.min(start, defaultEnd - MIN_SPINE_FRACTION));
            end = Math.min(defaultEnd, Math.max(end, start + MIN_SPINE_FRACTION));
        }

        if (end - start < MIN_SPINE_FRACTION) {
            const mid = (defaultStart + defaultEnd) / 2;
            start = Math.max(defaultStart, mid - MIN_SPINE_FRACTION / 2);
            end = Math.min(defaultEnd, start + MIN_SPINE_FRACTION);
        }

        return { spineStartFraction: start, spineEndFraction: end };
    }

    if (layout?.spineFromCoverCalc) {
        return {
            spineStartFraction: defaultStart,
            spineEndFraction: defaultEnd,
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

    const { start: cropStart, end: cropEnd } = resolveWrapSegmentBounds(layout, side);

    if (side === 'back' && cropStart > 0) {
        return {
            ...base,
            width: `${100 / cropStart}%`,
            maxWidth: 'none',
            objectPosition: 'left center',
        };
    }
    if (side === 'front' && cropEnd < 1) {
        const frontFrac = 1 - cropEnd;
        return {
            ...base,
            width: `${100 / frontFrac}%`,
            maxWidth: 'none',
            marginLeft: `${(-100 * cropEnd) / frontFrac}%`,
            objectPosition: 'right center',
        };
    }
    if (isSpineStretchWrapSide(side)) {
        const segW = cropEnd - cropStart;
        if (segW > 0) {
            return {
                ...base,
                width: `${100 / segW}%`,
                maxWidth: 'none',
                marginLeft: `${(-100 * cropStart) / segW}%`,
                objectPosition: 'center center',
            };
        }
    }
    return base;
}
