import { parseGridSizeAspect, spreadGridSizeFromPageGrid } from './albumGridSize';
import { getAlbumSpineBoundsOverride } from './albumSpineSettings';
import { photoTransformStyle } from './albumPageTransforms';

const MIN_SPINE_FRACTION = 0.004;
const MIN_COVER_FRACTION = 0.12;

/**
 * Book-wrap layout: | back cover | spine | front cover |
 * Spine sits in the center strip of the wrap image; bounds are fractions of wrap width.
 */
export function getBookWrapSpineLayout(album) {
    const pageAspect = parseGridSizeAspect(album?.grid_size);
    const innerSpreadAspect = pageAspect * 2;
    const spreadKey =
        album?.spread_grid_size ??
        spreadGridSizeFromPageGrid(album?.grid_size, album?.grid_layout);
    const wrapAspect = parseGridSizeAspect(spreadKey || album?.grid_size);

    let spineStartFraction = pageAspect / wrapAspect;
    let spineEndFraction = 1 - spineStartFraction;
    let spineFraction = Math.max(0, spineEndFraction - spineStartFraction);

    if (wrapAspect > innerSpreadAspect * 1.002) {
        spineFraction = (wrapAspect - innerSpreadAspect) / wrapAspect;
        spineStartFraction = (1 - spineFraction) / 2;
        spineEndFraction = 1 - spineStartFraction;
    } else {
        spineStartFraction = Math.max(0, spineStartFraction);
        spineEndFraction = Math.min(1, spineEndFraction);
        spineFraction = Math.max(0, spineEndFraction - spineStartFraction);
    }

    const override = getAlbumSpineBoundsOverride(album?.id);
    if (override) {
        spineStartFraction = override.spineStartFraction;
        spineEndFraction = override.spineEndFraction;
        spineFraction = Math.max(0, spineEndFraction - spineStartFraction);
    }

    const coverFraction = spineStartFraction;

    return {
        pageAspect,
        wrapAspect,
        innerSpreadAspect,
        spineStartFraction,
        spineEndFraction,
        spineFraction,
        coverFraction,
        hasSpine: spineFraction > MIN_SPINE_FRACTION,
    };
}

export function clampSpineBounds(spineStartFraction, spineEndFraction, layout) {
    const wrapAspect = layout?.wrapAspect ?? 2;
    const pageAspect = layout?.pageAspect ?? 1;
    const autoStart = (1 - (wrapAspect - pageAspect * 2) / wrapAspect) / 2;
    const minStart = Math.max(0, autoStart - 0.2);
    const maxEnd = Math.min(1, 1 - autoStart + 0.2);

    let start = Math.max(minStart, Math.min(0.5 - MIN_SPINE_FRACTION / 2, spineStartFraction));
    let end = Math.min(maxEnd, Math.max(0.5 + MIN_SPINE_FRACTION / 2, spineEndFraction));

    if (end - start < MIN_SPINE_FRACTION) {
        const mid = (start + end) / 2;
        start = mid - MIN_SPINE_FRACTION / 2;
        end = mid + MIN_SPINE_FRACTION / 2;
    }
    if (start < MIN_COVER_FRACTION) {
        start = MIN_COVER_FRACTION;
        end = Math.max(end, start + MIN_SPINE_FRACTION);
    }
    if (end > 1 - MIN_COVER_FRACTION) {
        end = 1 - MIN_COVER_FRACTION;
        start = Math.min(start, end - MIN_SPINE_FRACTION);
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
