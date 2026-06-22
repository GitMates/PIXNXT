import { getProxiedMediaFetchUrl } from '../../lib/r2MediaProxy';
import { normalizePhotoTransform } from './albumPageTransforms';

const imageCache = new Map();
const pending = new Map();
const dataUrlCache = new Map();

function loadImage(src) {
    const url = getProxiedMediaFetchUrl(src);
    const cached = imageCache.get(url);
    if (cached) return Promise.resolve(cached);

    const inflight = pending.get(url);
    if (inflight) return inflight;

    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        if (!url.startsWith('blob:') && !url.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
            imageCache.set(url, img);
            pending.delete(url);
            resolve(img);
        };
        img.onerror = reject;
        img.src = url;
    });
    pending.set(url, promise);
    return promise;
}

function segmentCacheKey(src, layout, side, transform, width, height) {
    const layoutKey = layout
        ? `${layout.wrapAspect}:${layout.spineStartFraction}:${layout.spineEndFraction}`
        : '';
    const t = normalizePhotoTransform(transform);
    return `${src}|${side}|${layoutKey}|${t.x},${t.y},${t.scaleX},${t.scaleY}|${width}x${height}`;
}

/** Horizontal slice + object-fit cover — same logic as 3D cover preview. */
export function drawWrapSegment(ctx, img, texW, texH, layout, side, transform) {
    const emptyColor = side === 'spine' ? '#e4e7ec' : '#ffffff';
    ctx.fillStyle = emptyColor;
    ctx.fillRect(0, 0, texW, texH);
    if (!img || !layout || !side) return;

    const start = layout.spineStartFraction;
    const end = layout.spineEndFraction;
    let imgFracStart = 0;
    let imgFracEnd = 1;
    if (side === 'back') {
        imgFracStart = 0;
        imgFracEnd = start;
    } else if (side === 'spine') {
        imgFracStart = start;
        imgFracEnd = end;
    } else if (side === 'front') {
        imgFracStart = end;
        imgFracEnd = 1;
    }

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
        const img = await loadImage(src);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        drawWrapSegment(ctx, img, canvas.width, canvas.height, layout, side, transform);
        const url = canvas.toDataURL('image/png');
        dataUrlCache.set(key, url);
        return url;
    } catch {
        return null;
    }
}

export function clearWrapSegmentCache() {
    dataUrlCache.clear();
}
