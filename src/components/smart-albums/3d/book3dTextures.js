import * as THREE from 'three';
import { useEffect, useState } from 'react';
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

const PANORAMIC_SIDE = { back: 'left', front: 'right', spine: 'spine' };

export function useBookTexture(slot, layout, side, { mirrorX = false } = {}) {
    const [texture, setTexture] = useState(blankTexture);
    const mirror = mirrorX || slot?.mirrorX === true;

    useEffect(() => {
        if (!slot?.src) {
            setTexture(blankTexture);
            return undefined;
        }

        let cancelled = false;
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            proxyUrl(slot.src),
            (loadedTex) => {
                if (cancelled) return;
                const tex = loadedTex.clone();
                if (layout && side) {
                    applyWrapLayout(tex, layout, side);
                } else if (slot.panoramic) {
                    applyPanoramic(tex, slot.panoramic, { mirrorX: mirror });
                } else if (side && PANORAMIC_SIDE[side]) {
                    applyPanoramic(tex, PANORAMIC_SIDE[side], { mirrorX: mirror });
                } else if (mirror) {
                    tex.wrapS = THREE.ClampToEdgeWrapping;
                    tex.wrapT = THREE.ClampToEdgeWrapping;
                    tex.repeat.set(-1, 1);
                    tex.offset.set(1, 0);
                }
                setTexture(finalizeTexture(tex));
            },
            undefined,
            () => {
                if (!cancelled) setTexture(blankTexture);
            }
        );

        return () => {
            cancelled = true;
        };
    }, [slot?.src, slot?.panoramic, slot?.mirrorX, layout, side, mirror]);

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
