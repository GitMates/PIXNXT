import * as THREE from 'three';
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { parseGridSizeAspect } from '../albumGridSize';
import { getBookWrapSpineLayout } from '../bookWrapSpine';
import { albumHasBlankCovers, albumUsesBookWrap } from '../albumSpreadUtils';

export const HARDCOVER_GREEN = '#2d4a3e';
export const SPINE_DARK = '#1a2e28';
export const PAGE_WHITE = '#f8f8f6';

const blankTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = PAGE_WHITE;
    ctx.fillRect(0, 0, 1, 1);
    return new THREE.CanvasTexture(canvas);
})();

/** Reuse configured textures so page turns do not flash blank while reloading. */
const textureCache = new Map();
const pendingLoads = new Map();

function proxyUrl(src) {
    if (!src) return null;
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (r2PublicUrl && src.startsWith(r2PublicUrl)) {
        return src.replace(r2PublicUrl, '/api/r2-media');
    }
    return src;
}

function finalizeTexture(tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

function applyPanoramic(tex, panoramic, { mirrorX = false } = {}) {
    if (!panoramic) return;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    if (panoramic === 'spine') {
        tex.repeat.set(0.06, 1);
        tex.offset.set(0.47, 0);
        return;
    }
    const half = 0.5;
    if (mirrorX) {
        tex.repeat.set(-half, 1);
        tex.offset.set(panoramic === 'left' ? half : 0, 0);
    } else {
        tex.repeat.set(half, 1);
        tex.offset.set(panoramic === 'left' ? 0 : half, 0);
    }
}

/** Matches CSS object-fit: cover for a single page plane. */
function applyObjectFitCover(tex, pageAspect) {
    const image = tex.image;
    if (!image?.width || !image?.height || !pageAspect) return;
    const imgAspect = image.width / image.height;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    if (imgAspect > pageAspect) {
        const repeatX = pageAspect / imgAspect;
        tex.repeat.set(repeatX, 1);
        tex.offset.set((1 - repeatX) / 2, 0);
    } else {
        const repeatY = imgAspect / pageAspect;
        tex.repeat.set(1, repeatY);
        tex.offset.set(0, (1 - repeatY) / 2);
    }
}

/** Crop wrap image to back | spine | front — matches 2D cover editor. */
function applyWrapLayout(tex, layout, side) {
    if (!layout || !side) return;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const start = layout.spineStartFraction;
    const end = layout.spineEndFraction;
    const spine = layout.spineFraction;

    if (side === 'back') {
        if (start > 0) {
            tex.repeat.set(start, 1);
            tex.offset.set(0, 0);
        } else {
            applyPanoramic(tex, 'left');
        }
    } else if (side === 'front' && end < 1) {
        const frontFrac = 1 - end;
        tex.repeat.set(frontFrac, 1);
        tex.offset.set(end, 0);
    } else if (side === 'spine' && spine > 0) {
        tex.repeat.set(spine, 1);
        tex.offset.set(start, 0);
    }
}

/** Back face is rotated 180° — swap pano halves so UV matches the 2D bleed. */
function panoramicForBackFace(panoramic) {
    if (panoramic === 'left') return 'right';
    if (panoramic === 'right') return 'left';
    return panoramic;
}

function textureCacheKey(src, { panoramic, layout, side, mirrorX, pageAspect, backFace }) {
    const layoutKey = layout
        ? `${layout.spineStartFraction}:${layout.spineEndFraction}:${layout.spineFraction}`
        : '';
    return [
        src,
        panoramic || '',
        layoutKey,
        side || '',
        mirrorX ? 'mx' : '',
        backFace ? 'back' : '',
        pageAspect ? String(pageAspect) : '',
    ].join('|');
}

function configureTexture(tex, slot, layout, side, { mirrorX = false, pageAspect = null, backFace = false } = {}) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    if (layout && side) {
        applyWrapLayout(tex, layout, side);
        return tex;
    }

    let panoramic = slot?.panoramic || null;
    if (backFace && panoramic) {
        panoramic = panoramicForBackFace(panoramic);
    }

    if (panoramic) {
        applyPanoramic(tex, panoramic, { mirrorX: false });
        return tex;
    }

    if (mirrorX) {
        tex.repeat.set(-1, 1);
        tex.offset.set(1, 0);
        return tex;
    }

    if (pageAspect) {
        applyObjectFitCover(tex, pageAspect);
    }
    return tex;
}

function loadConfiguredTexture(src, config) {
    const url = proxyUrl(src);
    const key = textureCacheKey(src, {
        panoramic: config.slot?.panoramic,
        layout: config.layout,
        side: config.side,
        mirrorX: config.mirrorX,
        pageAspect: config.pageAspect,
        backFace: config.backFace,
    });
    const cached = textureCache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = pendingLoads.get(key);
    if (pending) return pending;

    const promise = new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            url,
            (loadedTex) => {
                const tex = loadedTex.clone();
                configureTexture(tex, config.slot, config.layout, config.side, {
                    mirrorX: config.mirrorX,
                    pageAspect: config.pageAspect,
                    backFace: config.backFace,
                });
                finalizeTexture(tex);
                textureCache.set(key, tex);
                pendingLoads.delete(key);
                resolve(tex);
            },
            undefined,
            (err) => {
                pendingLoads.delete(key);
                reject(err);
            }
        );
    });

    pendingLoads.set(key, promise);
    return promise;
}

export function getBook3dDimensions(album) {
    const aspect = parseGridSizeAspect(album?.grid_size || 'landscape');
    const scale = 2.5;
    const width = scale * Math.sqrt(aspect);
    const height = scale / Math.sqrt(aspect);
    return { width, height, aspect };
}

/** 3D spine thickness from wrap fractions (back | spine | front). */
export function getSpineWidth(coverWidth, album) {
    const layout = album ? getBookWrapSpineLayout(album) : null;
    if (layout?.hasSpine && layout.coverFraction > 0) {
        return Math.max(0.045, coverWidth * (layout.spineFraction / layout.coverFraction));
    }
    if (albumUsesBookWrap(album)) {
        return Math.max(0.06, coverWidth * 0.08);
    }
    return Math.max(0.04, coverWidth * 0.04);
}

export function useBookTexture(
    slot,
    layout,
    side,
    { mirrorX = false, pageAspect = null, backFace = false } = {}
) {
    const invalidate = useThree((state) => state.invalidate);
    const [texture, setTexture] = useState(blankTexture);

    useEffect(() => {
        if (!slot?.src) {
            setTexture(blankTexture);
            return undefined;
        }

        let cancelled = false;
        const config = {
            slot,
            layout,
            side,
            mirrorX,
            pageAspect,
            backFace,
            panoramic: slot.panoramic,
        };

        loadConfiguredTexture(slot.src, config)
            .then((tex) => {
                if (cancelled) return;
                setTexture(tex);
                tex.needsUpdate = true;
                invalidate();
            })
            .catch(() => {
                if (!cancelled) setTexture(blankTexture);
            });

        return () => {
            cancelled = true;
        };
    }, [slot?.src, slot?.panoramic, layout, side, mirrorX, pageAspect, backFace, invalidate]);

    return texture;
}

export function shouldUseWrapCrop(album, coverSrc, layout) {
    if (!coverSrc || !album?.has_covers) return false;
    if (!albumHasBlankCovers(album)) return true;
    return Boolean(layout?.hasSpine);
}

export function isBlankCoverAlbum(album) {
    return albumHasBlankCovers(album);
}
