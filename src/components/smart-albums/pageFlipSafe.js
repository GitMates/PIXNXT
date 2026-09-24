import {
    flipbookIndexToStoragePage,
    getFlipbookPageCount,
    getTotalSpreads,
    pageToSpreadIndex,
} from './albumSpreadUtils';

/**
 * page-flip's HTMLUI moves React page nodes into `.stf__block`. Unmounting without
 * moving them back makes React throw "Node cannot be found in the current page"
 * and freezes the leaf (white canvas + photo strip). Call before remount/unmount.
 */
export function releasePageFlipDom(api) {
    if (!api || typeof api.clear !== 'function') return;
    try {
        api.clear();
    } catch {
        /* already torn down */
    }
}

/** Force idle page leaves to top:0 after page-flip writes inline styles. */
export function forceFlipItemTops(api) {
    try {
        const dist = api?.getUI?.()?.getDistElement?.();
        if (!dist) return;
        const items = dist.querySelectorAll('.stf__item');
        for (let i = 0; i < items.length; i += 1) {
            const el = items[i];
            // Idle pages only — flipping leaves must keep page-flip transforms.
            if (!el.classList.contains('--simple')) continue;
            if (el.style.top !== '0px' || el.style.getPropertyPriority('top') !== 'important') {
                el.style.setProperty('top', '0px', 'important');
            }
        }
    } catch {
        /* ignore */
    }
}

/**
 * page-flip HTMLRender.calculateBoundsRect centers the spread vertically:
 *   top = getBlockHeight()/2 - setting.height/2
 * On reload the flex stage is often taller than setting.height, so top >> 0 →
 * white canvas with the photo shoved to the bottom.
 *
 * Also hooks the rAF render loop: page-flip rewrites inline `top` every frame,
 * so we re-assert top:0 after each paint for idle (--simple) leaves.
 */
export function patchPageFlipFixedTop(api) {
    if (!api) return;
    const render = typeof api.getRender === 'function' ? api.getRender() : null;
    if (!render || typeof render.calculateBoundsRect !== 'function') {
        forceFlipItemTops(api);
        return;
    }

    if (!render.__pixnxtFixedTop) {
        const original = render.calculateBoundsRect.bind(render);
        render.calculateBoundsRect = function patchedCalculateBoundsRect() {
            const orientation = original();
            const setting = this.setting || {};
            if (setting.size === 'fixed' && this.boundsRect && setting.width > 0 && setting.height > 0) {
                const blockW =
                    typeof this.getBlockWidth === 'function'
                        ? this.getBlockWidth()
                        : setting.width * 2;
                this.boundsRect.top = 0;
                this.boundsRect.height = setting.height;
                this.boundsRect.pageWidth = setting.width;
                this.boundsRect.width = setting.width * 2;
                this.boundsRect.left = blockW / 2 - setting.width;
            }
            return orientation;
        };

        if (typeof render.render === 'function') {
            const originalRender = render.render.bind(render);
            render.render = function patchedRender(time) {
                originalRender(time);
                forceFlipItemTops(api);
            };
        }

        render.__pixnxtFixedTop = true;
    }

    try {
        api.update?.();
    } catch {
        /* ignore */
    }
    forceFlipItemTops(api);
}

/**
 * page-flip showNext() can increment past the last leaf and crash in showSpread().
 * Next is limited by spread (last spread); prev by flip leaf (cover uses multiple leaves).
 * Also installs the fixed-size top=0 layout patch (reload white-canvas fix).
 */
export function installSafePageFlip(api, { totalPages, spreadOpts }) {
    if (!api) return api;

    patchPageFlipFixedTop(api);

    if (api.__pixnxtSafeFlip) return api;

    const spreadCtx = { ...spreadOpts, totalPages };
    const maxSpreadIndex = Math.max(0, getTotalSpreads(totalPages, spreadOpts) - 1);
    const maxFlipIndex = Math.max(0, getFlipbookPageCount(totalPages, spreadOpts) - 1);

    const currentFlipIndex = () =>
        Math.max(0, Math.min(maxFlipIndex, Math.floor(Number(api.getCurrentPageIndex()) || 0)));

    const spreadIndex = () => {
        const storagePage = flipbookIndexToStoragePage(
            api.getCurrentPageIndex(),
            totalPages,
            spreadOpts
        );
        return pageToSpreadIndex(storagePage, spreadCtx);
    };

    const wrap = (method, blockWhen) => {
        if (typeof api[method] !== 'function') return;
        const original = api[method].bind(api);
        api[method] = (...args) => {
            if (blockWhen()) return undefined;
            return original(...args);
        };
    };

    wrap('turnToNextPage', () => spreadIndex() >= maxSpreadIndex);
    wrap('flipNext', () => spreadIndex() >= maxSpreadIndex);
    wrap('turnToPrevPage', () => currentFlipIndex() <= 0);
    wrap('flipPrev', () => currentFlipIndex() <= 0);

    api.__pixnxtSafeFlip = true;
    return api;
}
