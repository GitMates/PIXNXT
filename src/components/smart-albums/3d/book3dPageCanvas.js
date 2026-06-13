import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { normalizePhotoTransform } from '../albumPageTransforms';

const imageCache = new Map();
const textureCache = new Map();
const pending = new Map();

const TEX_W = 1024;

function proxyUrl(src) {
    if (!src) return null;
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (r2PublicUrl && src.startsWith(r2PublicUrl)) {
        return src.replace(r2PublicUrl, '/api/r2-media');
    }
    return src;
}

function loadImage(src) {
    const url = proxyUrl(src);
    const cached = imageCache.get(url);
    if (cached) return Promise.resolve(cached);

    const inflight = pending.get(url);
    if (inflight) return inflight;

    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
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

/** object-fit: cover — source rect in image pixels */
function coverSourceRect(imgW, imgH, outW, outH) {
    const imgAspect = imgW / imgH;
    const outAspect = outW / outH;
    if (imgAspect > outAspect) {
        const sh = imgH;
        const sw = sh * outAspect;
        return { sx: (imgW - sw) / 2, sy: 0, sw, sh };
    }
    const sw = imgW;
    const sh = sw / outAspect;
    return { sx: 0, sy: (imgH - sh) / 2, sw, sh };
}

/** Matches photoTransformStyle transform-origin for page / pano slots. */
function transformOriginPx(panoramic, texW, texH) {
    if (panoramic === 'left') return { ox: texW * 2, oy: texH / 2 };
    if (panoramic === 'right') return { ox: -texW, oy: texH / 2 };
    return { ox: texW / 2, oy: texH / 2 };
}

function withPhotoTransform(ctx, texW, texH, transform, panoramic, drawContent) {
    const t = normalizePhotoTransform(transform);
    const { ox, oy } = transformOriginPx(panoramic, texW, texH);
    ctx.save();
    ctx.translate(ox + (t.x / 100) * texW, oy + (t.y / 100) * texH);
    ctx.scale(t.scaleX, t.scaleY);
    ctx.translate(-ox, -oy);
    drawContent();
    ctx.restore();
}

function transformKey(transform) {
    const t = normalizePhotoTransform(transform);
    return `${t.x},${t.y},${t.scaleX},${t.scaleY}`;
}

/**
 * Draw one page the same way 2D AlbumPageGrid does:
 * - single photo: object-fit cover + page transform
 * - panoramic left/right: 200% bleed + spread transform with spine origin
 */
function drawPageSlot(ctx, img, texW, texH, panoramic, mirror, transform) {
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, texW, texH);

    if (!img) return;

    const drawContent = () => {
        if (panoramic === 'left' || panoramic === 'right') {
            const bleedW = texW * 2;
            const { sx, sy, sw, sh } = coverSourceRect(img.width, img.height, bleedW, texH);
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, texW, texH);
            ctx.clip();
            const destX = panoramic === 'right' ? -texW : 0;
            ctx.drawImage(img, sx, sy, sw, sh, destX, 0, bleedW, texH);
            ctx.restore();
            return;
        }

        const { sx, sy, sw, sh } = coverSourceRect(img.width, img.height, texW, texH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, texW, texH);
    };

    const draw = () => withPhotoTransform(ctx, texW, texH, transform, panoramic, drawContent);

    if (mirror) {
        ctx.save();
        ctx.translate(texW, 0);
        ctx.scale(-1, 1);
        draw();
        ctx.restore();
    } else {
        draw();
    }
}

function drawSpreadSlot(ctx, img, texW, texH, transform) {
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, texW, texH);
    if (!img) return;
    withPhotoTransform(ctx, texW, texH, transform, null, () => {
        const { sx, sy, sw, sh } = coverSourceRect(img.width, img.height, texW, texH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, texW, texH);
    });
}

function cacheKey(kind, src, panoramic, aspect, mirror = false, extra = '') {
    return `${kind}|${src}|${panoramic || ''}|${aspect || ''}|${mirror ? 'm' : ''}|${extra}`;
}

/** Matches BookWrapSpineImage + object-fit: cover for back | spine | front panels. */
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

function wrapCacheExtra(layout, side, transform, panelAspect) {
    const layoutKey = layout
        ? `${layout.spineStartFraction}:${layout.spineEndFraction}:${layout.spineFraction}`
        : '';
    return `${side || ''}|${layoutKey}|${transformKey(transform)}|${panelAspect || ''}`;
}

export function getWrapCanvasTexture(src, layout, side, transform, panelAspect) {
    if (!src || !layout || !side || !(panelAspect > 0)) return null;
    const key = cacheKey('wrap', src, null, panelAspect, false, wrapCacheExtra(layout, side, transform, panelAspect));
    const cached = textureCache.get(key);
    if (cached) return cached;

    const texW = side === 'spine' ? Math.max(96, Math.round(TEX_W * (layout.spineFraction || 0.07))) : TEX_W;
    const texH = Math.max(1, Math.round(texW / panelAspect));
    const canvas = document.createElement('canvas');
    canvas.width = texW;
    canvas.height = texH;
    const ctx = canvas.getContext('2d');
    drawWrapSegment(ctx, null, texW, texH, layout, side, transform);

    const tex = makeCanvasTexture(canvas);
    textureCache.set(key, tex);

    loadImage(src)
        .then((img) => {
            drawWrapSegment(ctx, img, texW, texH, layout, side, transform);
            tex.needsUpdate = true;
            tex.__pixnxtLoaded = true;
        })
        .catch(() => {});

    return tex;
}

function makeCanvasTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

let sharedBlank = null;
function blankTex() {
    if (sharedBlank) return sharedBlank;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, 1, 1);
    sharedBlank = makeCanvasTexture(canvas);
    return sharedBlank;
}

export function getPageCanvasTexture(slot, pageAspect, { mirror = false, transform = null } = {}) {
    if (!slot?.src) return null;
    const key = cacheKey(
        'page',
        slot.src,
        slot.panoramic,
        pageAspect,
        mirror,
        transformKey(transform)
    );
    const cached = textureCache.get(key);
    if (cached) return cached;

    const aspect = pageAspect || 1;
    const texH = TEX_W / aspect;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = Math.round(texH);
    const ctx = canvas.getContext('2d');
    drawPageSlot(ctx, null, TEX_W, canvas.height, slot.panoramic, mirror, transform);

    const tex = makeCanvasTexture(canvas);
    textureCache.set(key, tex);

    loadImage(slot.src)
        .then((img) => {
            drawPageSlot(ctx, img, TEX_W, canvas.height, slot.panoramic, mirror, transform);
            tex.needsUpdate = true;
            tex.__pixnxtLoaded = true;
        })
        .catch(() => {});

    return tex;
}

export function getSpreadCanvasTexture(src, pageAspect, transform) {
    if (!src) return null;
    const spreadAspect = (pageAspect || 1) * 2;
    const key = cacheKey('spread', src, null, spreadAspect, false, transformKey(transform));
    if (textureCache.has(key)) return textureCache.get(key);

    const texH = TEX_W / spreadAspect;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = Math.round(texH);
    const ctx = canvas.getContext('2d');
    drawSpreadSlot(ctx, null, TEX_W, canvas.height, transform);

    const tex = makeCanvasTexture(canvas);
    textureCache.set(key, tex);

    loadImage(src)
        .then((img) => {
            drawSpreadSlot(ctx, img, TEX_W, canvas.height, transform);
            tex.needsUpdate = true;
            tex.__pixnxtLoaded = true;
        })
        .catch(() => {});

    return tex;
}

function notifyTextureReady(tex, invalidate) {
    if (!tex) return;
    tex.needsUpdate = true;
    invalidate();
}

export function useCanvasPageTexture(slot, pageAspect, { mirror = false, transform = null } = {}) {
    const invalidate = useThree((state) => state.invalidate);
    const transformSig = transformKey(transform);
    const [texture, setTexture] = useState(
        () => getPageCanvasTexture(slot, pageAspect, { mirror, transform }) || blankTex()
    );

    useEffect(() => {
        if (!slot?.src) {
            setTexture(blankTex());
            return undefined;
        }
        const key = cacheKey('page', slot.src, slot.panoramic, pageAspect, mirror, transformSig);
        const tex = getPageCanvasTexture(slot, pageAspect, { mirror, transform }) || blankTex();
        setTexture(tex);
        if (tex.__pixnxtLoaded) {
            notifyTextureReady(tex, invalidate);
            return undefined;
        }
        let cancelled = false;
        loadImage(slot.src)
            .then(() => {
                if (cancelled) return;
                const updated = textureCache.get(key);
                if (updated) setTexture(updated);
                notifyTextureReady(updated, invalidate);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [slot?.src, slot?.panoramic, pageAspect, mirror, transformSig, invalidate]);

    return texture;
}

export function useCanvasWrapTexture(src, layout, side, transform, panelAspect) {
    const invalidate = useThree((state) => state.invalidate);
    const transformSig = transformKey(transform);
    const [texture, setTexture] = useState(
        () => getWrapCanvasTexture(src, layout, side, transform, panelAspect) || blankTex()
    );

    useEffect(() => {
        if (!src || !layout || !side || !(panelAspect > 0)) {
            setTexture(blankTex());
            return undefined;
        }
        const key = cacheKey(
            'wrap',
            src,
            null,
            panelAspect,
            false,
            wrapCacheExtra(layout, side, transform, panelAspect)
        );
        const tex = getWrapCanvasTexture(src, layout, side, transform, panelAspect) || blankTex();
        setTexture(tex);
        if (tex.__pixnxtLoaded) {
            notifyTextureReady(tex, invalidate);
            return undefined;
        }
        let cancelled = false;
        loadImage(src)
            .then(() => {
                if (cancelled) return;
                const updated = textureCache.get(key);
                if (updated) setTexture(updated);
                notifyTextureReady(updated, invalidate);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [src, layout, side, transformSig, panelAspect, invalidate]);

    return texture;
}

export function useCanvasSpreadTexture(src, pageAspect, transform) {
    const invalidate = useThree((state) => state.invalidate);
    const transformSig = transformKey(transform);
    const [texture, setTexture] = useState(
        () => getSpreadCanvasTexture(src, pageAspect, transform) || blankTex()
    );

    useEffect(() => {
        if (!src) {
            setTexture(blankTex());
            return undefined;
        }
        const spreadAspect = (pageAspect || 1) * 2;
        const key = cacheKey('spread', src, null, spreadAspect, false, transformSig);
        const tex = getSpreadCanvasTexture(src, pageAspect, transform) || blankTex();
        setTexture(tex);
        if (tex.__pixnxtLoaded) {
            notifyTextureReady(tex, invalidate);
            return undefined;
        }
        let cancelled = false;
        loadImage(src)
            .then(() => {
                if (cancelled) return;
                const updated = textureCache.get(key);
                if (updated) setTexture(updated);
                notifyTextureReady(updated, invalidate);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [src, pageAspect, transformSig, invalidate]);

    return texture;
}
