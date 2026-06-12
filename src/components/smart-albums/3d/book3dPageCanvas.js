import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

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

/**
 * Draw one page the same way 2D does:
 * - single photo: object-fit cover in page rect
 * - panoramic left/right: 200% width bleed (ab-pano-bleed--left/right)
 */
function drawPageSlot(ctx, img, texW, texH, panoramic, mirror = false) {
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, texW, texH);

    if (!img) return;

    const draw = () => {
        if (panoramic === 'left' || panoramic === 'right') {
            // Match .ab-pano-bleed: 200% width, object-fit cover, page clips overflow
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

function drawSpreadSlot(ctx, img, texW, texH) {
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, texW, texH);
    if (!img) return;
    const { sx, sy, sw, sh } = coverSourceRect(img.width, img.height, texW, texH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, texW, texH);
}

function cacheKey(kind, src, panoramic, aspect, mirror = false) {
    return `${kind}|${src}|${panoramic || ''}|${aspect || ''}|${mirror ? 'm' : ''}`;
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

export function getPageCanvasTexture(slot, pageAspect, { mirror = false } = {}) {
    if (!slot?.src) return null;
    const key = cacheKey('page', slot.src, slot.panoramic, pageAspect, mirror);
    const cached = textureCache.get(key);
    if (cached) return cached;

    const aspect = pageAspect || 1;
    const texH = TEX_W / aspect;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = Math.round(texH);
    const ctx = canvas.getContext('2d');
    drawPageSlot(ctx, null, TEX_W, canvas.height, slot.panoramic, mirror);

    const tex = makeCanvasTexture(canvas);
    textureCache.set(key, tex);

    loadImage(slot.src)
        .then((img) => {
            drawPageSlot(ctx, img, TEX_W, canvas.height, slot.panoramic, mirror);
            tex.needsUpdate = true;
            tex.__pixnxtLoaded = true;
        })
        .catch(() => {});

    return tex;
}

export function getSpreadCanvasTexture(src, pageAspect) {
    if (!src) return null;
    const spreadAspect = (pageAspect || 1) * 2;
    const key = cacheKey('spread', src, null, spreadAspect);
    if (textureCache.has(key)) return textureCache.get(key);

    const texH = TEX_W / spreadAspect;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = Math.round(texH);
    const ctx = canvas.getContext('2d');
    drawSpreadSlot(ctx, null, TEX_W, canvas.height);

    const tex = makeCanvasTexture(canvas);
    textureCache.set(key, tex);

    loadImage(src)
        .then((img) => {
            drawSpreadSlot(ctx, img, TEX_W, canvas.height);
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

export function useCanvasPageTexture(slot, pageAspect, { mirror = false } = {}) {
    const invalidate = useThree((state) => state.invalidate);
    const [texture, setTexture] = useState(
        () => getPageCanvasTexture(slot, pageAspect, { mirror }) || blankTex()
    );

    useEffect(() => {
        if (!slot?.src) {
            setTexture(blankTex());
            return undefined;
        }
        const key = cacheKey('page', slot.src, slot.panoramic, pageAspect, mirror);
        const tex = getPageCanvasTexture(slot, pageAspect, { mirror }) || blankTex();
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
    }, [slot?.src, slot?.panoramic, pageAspect, mirror, invalidate]);

    return texture;
}

export function useCanvasSpreadTexture(src, pageAspect) {
    const invalidate = useThree((state) => state.invalidate);
    const [texture, setTexture] = useState(
        () => getSpreadCanvasTexture(src, pageAspect) || blankTex()
    );

    useEffect(() => {
        if (!src) {
            setTexture(blankTex());
            return undefined;
        }
        const spreadAspect = (pageAspect || 1) * 2;
        const key = cacheKey('spread', src, null, spreadAspect);
        const tex = getSpreadCanvasTexture(src, pageAspect) || blankTex();
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
    }, [src, pageAspect, invalidate]);

    return texture;
}
