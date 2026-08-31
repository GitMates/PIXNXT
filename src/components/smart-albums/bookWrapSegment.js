import { getProxiedMediaFetchUrl, loadCrossOriginImage } from '../../lib/r2MediaProxy';
import { normalizePhotoTransform } from './albumPageTransforms';
import { isSpineStretchWrapSide, resolveWrapSegmentBounds } from './bookWrapSpine';

const imageCache = new Map();
const pending = new Map();
const dataUrlCache = new Map();

/** Cap decode size so huge print wraps (e.g. 12×44) don't stall the cover editor. */
const MAX_DECODE_EDGE = 2400;

function loadImage(src) {
    return loadCrossOriginImage(src);
}

function segmentCacheKey(src, layout, side, transform, width, height) {
    const bounds = layout ? resolveWrapSegmentBounds(layout, side) : { start: 0, end: 1 };
    const layoutKey = layout
        ? `${layout.wrapAspect}:${bounds.start}:${bounds.end}:${layout.spineStartFraction}:${layout.spineEndFraction}`
        : '';
    const t = normalizePhotoTransform(transform);
    return `${src}|${side}|${layoutKey}|${t.x},${t.y},${t.scaleX},${t.scaleY}|${width}x${height}`;
}

/** Horizontal slice + object-fit cover — same logic as 3D cover preview. */
export function drawWrapSegment(ctx, img, texW, texH, layout, side, transform) {
    const emptyColor = isSpineStretchWrapSide(side) ? '#e4e7ec' : '#ffffff';
    ctx.fillStyle = emptyColor;
    ctx.fillRect(0, 0, texW, texH);
    if (!img || !layout || !side) return;

    const { start: imgFracStart, end: imgFracEnd } = resolveWrapSegmentBounds(layout, side);

    const segW = imgFracEnd - imgFracStart;
    if (segW <= 0) return;

    const sx = imgFracStart * img.width;
    const sw = segW * img.width;
    const sh = img.height;
    const panelAspect = texW / texH;
    const segAspect = sw / sh;
    const t = normalizePhotoTransform(transform);

    ctx.save();
    ctx.translate(texW / 2 + (t.x / 100) * texW, texH / 2 + (t.y / 100) * texH);
    ctx.scale(t.scaleX, t.scaleY);
    ctx.translate(-texW / 2, -texH / 2);

    if (isSpineStretchWrapSide(side)) {
        ctx.drawImage(img, sx, 0, sw, sh, 0, 0, texW, texH);
        ctx.restore();
        return;
    }

    let dw;
    let dh;
    let dx;
    let dy;
    if (segAspect > panelAspect) {
        dh = texH;
        dw = dh * segAspect;
        dx = (texW - dw) / 2;
        dy = 0;
    } else {
        dw = texW;
        dh = dw / segAspect;
        dx = 0;
        dy = (texH - dh) / 2;
    }
    ctx.drawImage(img, sx, 0, sw, sh, dx, dy, dw, dh);
    ctx.restore();
}

/**
 * Downscale huge wrap bitmaps before slicing so toDataURL stays snappy.
 * Returns the original image when already within the decode budget.
 */
function maybeDownscaleImage(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!(w > 0 && h > 0)) return img;
    const edge = Math.max(w, h);
    if (edge <= MAX_DECODE_EDGE) return img;

    const scale = MAX_DECODE_EDGE / edge;
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img;
    ctx.drawImage(img, 0, 0, outW, outH);
    return canvas;
}

export async function renderWrapSegmentDataUrl(
    src,
    layout,
    side,
    transform,
    width,
    height
) {
    if (!src || !layout || !side || !(width > 1) || !(height > 1)) return null;

    const key = segmentCacheKey(src, layout, side, transform, width, height);
    const cached = dataUrlCache.get(key);
    if (cached) return cached;

    try {
        const raw = await loadImage(src);
        const drawSrc = maybeDownscaleImage(raw);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        drawWrapSegment(ctx, drawSrc, canvas.width, canvas.height, layout, side, transform);
        // JPEG is much faster than PNG for large cover panels.
        const url = canvas.toDataURL('image/jpeg', 0.82);
        dataUrlCache.set(key, url);
        return url;
    } catch {
        return null;
    }
}

export function clearWrapSegmentCache(srcPrefix = null) {
    if (!srcPrefix) {
        dataUrlCache.clear();
        return;
    }
    for (const key of dataUrlCache.keys()) {
        if (String(key).startsWith(String(srcPrefix))) {
            dataUrlCache.delete(key);
        }
    }
}

/** Drop decoded bitmaps so a replaced cover is not served from stale cache. */
export function clearWrapImageCache(src = null) {
    if (!src) {
        imageCache.clear();
        pending.clear();
        return;
    }
    imageCache.delete(src);
    pending.delete(src);
    const proxied = getProxiedMediaFetchUrl(src);
    if (proxied && proxied !== src) {
        imageCache.delete(proxied);
        pending.delete(proxied);
    }
}
