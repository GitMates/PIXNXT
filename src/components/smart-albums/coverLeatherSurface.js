import { resolveCoverLeatherPreset } from './albumCoverColor';

const SURFACE_VERSION = 2;
const dataUrlCache = new Map();

function leatherPresetColors(preset, { spine = false } = {}) {
    const resolved = preset?.base ? preset : resolveCoverLeatherPreset('cream');
    return {
        base: spine ? resolved.spine : resolved.base,
        highlight: resolved.highlight,
        shadow: resolved.shadow,
        text: resolved.text,
    };
}

function leatherGrainSeed(presetId, spine) {
    let hash = spine ? 17 : 0;
    const id = String(presetId || 'cream');
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) % 2147483647;
    }
    return hash || 1;
}

function leatherNoise(seed, x, y) {
    const n = Math.sin(seed * 12.9898 + x * 78.233 + y * 37.719) * 43758.5453;
    return n - Math.floor(n);
}

function parseHexColor(hex) {
    const raw = String(hex || '').replace('#', '');
    if (raw.length !== 6) return { r: 200, g: 200, b: 200 };
    return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
    };
}

function mixRgb(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return {
        r: Math.round(a.r + (b.r - a.r) * k),
        g: Math.round(a.g + (b.g - a.g) * k),
        b: Math.round(a.b + (b.b - a.b) * k),
    };
}

function rgbToCss({ r, g, b }, alpha = 1) {
    if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Procedural pebbled leather — top-left light, fine + coarse grain. */
export function drawLeatherPanel(ctx, texW, texH, preset, { spine = false, presetId = 'cream' } = {}) {
    const colors = leatherPresetColors(preset, { spine });
    const baseRgb = parseHexColor(colors.base);

    const grad = ctx.createLinearGradient(0, 0, texW, texH);
    grad.addColorStop(0, colors.highlight);
    grad.addColorStop(0.48, colors.base);
    grad.addColorStop(1, colors.shadow);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texW, texH);

    const seed = leatherGrainSeed(presetId, spine);
    const imgData = ctx.getImageData(0, 0, texW, texH);
    const data = imgData.data;

    for (let y = 0; y < texH; y += 1) {
        const lightY = 1 - y / texH;
        for (let x = 0; x < texW; x += 1) {
            const lightX = 1 - x / texW;
            const light = (lightX * 0.55 + lightY * 0.45) * 10;
            const fine = (leatherNoise(seed, x * 2.8, y * 2.8) - 0.5) * 20;
            const coarse = (leatherNoise(seed + 41, x * 0.18, y * 0.18) - 0.5) * 26;
            const pebble = (leatherNoise(seed + 97, x * 0.42, y * 0.42) - 0.5) * 14;
            const grain = fine + coarse + pebble + light - 5;

            const i = (y * texW + x) * 4;
            data[i] = Math.max(0, Math.min(255, data[i] + grain));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const vignette = ctx.createRadialGradient(
        texW * 0.42,
        texH * 0.38,
        texW * 0.12,
        texW * 0.5,
        texH * 0.5,
        Math.max(texW, texH) * 0.78
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0.06)');
    vignette.addColorStop(1, rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.12), 0.22));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, texW, texH);
}

/** Pressed-in serif title — shadow top-left, highlight bottom-right. */
export function drawDebossedCoverTitle(ctx, text, texW, texH, preset) {
    const upper = String(text || '').trim().toUpperCase();
    if (!upper) return;

    const colors = leatherPresetColors(preset);
    const baseRgb = parseHexColor(colors.base);
    const grooveRgb = parseHexColor(colors.text || colors.shadow);
    const grooveColor = rgbToCss(mixRgb(baseRgb, grooveRgb, 0.72));

    const maxWidth = texW * 0.78;
    let fontSize = Math.min(texW * 0.13, texH * 0.11, 96);
    while (fontSize > 16) {
        ctx.font = `600 ${fontSize}px Georgia, "Times New Roman", serif`;
        if (ctx.measureText(upper).width <= maxWidth) break;
        fontSize -= 2;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = texW / 2;
    const cy = texH / 2;
    const depth = Math.max(2.5, fontSize * 0.045);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.38), 0.55);
    ctx.fillText(upper, cx - depth, cy - depth);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillText(upper, cx + depth * 0.65, cy + depth * 0.65);
    ctx.restore();

    ctx.fillStyle = grooveColor;
    ctx.fillText(upper, cx, cy);

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.5));
    ctx.lineWidth = Math.max(0.5, fontSize * 0.012);
    ctx.strokeText(upper, cx, cy);
    ctx.restore();
}

function surfaceCacheKey(coverColorId, { spine = false, title = '', aspect = 1 } = {}) {
    const trimmed = String(title || '').trim();
    return `leather-surface:v${SURFACE_VERSION}:${coverColorId}:${spine ? 'spine' : 'panel'}:${trimmed}:${aspect}`;
}

export function getLeatherPanelDataUrl(
    coverColorId = 'cream',
    { spine = false, title = '', aspect = 1, width = 1024, height = null } = {}
) {
    const texH = height || Math.max(320, Math.round(width / (aspect > 0 ? aspect : 1)));
    const key = `${surfaceCacheKey(coverColorId, { spine, title, aspect })}:${width}x${texH}`;
    const cached = dataUrlCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = texH;
    const ctx = canvas.getContext('2d');
    const preset = resolveCoverLeatherPreset(coverColorId);
    drawLeatherPanel(ctx, width, texH, preset, { spine, presetId: coverColorId });
    const trimmed = String(title || '').trim();
    if (trimmed) {
        drawDebossedCoverTitle(ctx, trimmed, width, texH, preset);
    }

    const url = canvas.toDataURL('image/png');
    dataUrlCache.set(key, url);
    return url;
}

/** Flat 2D leather background — same grain as the 3D cover preview. */
export function getCoverLeatherSurfaceStyle(
    coverColorId = 'cream',
    { spine = false, title = '', aspect = 1 } = {}
) {
    const preset = resolveCoverLeatherPreset(coverColorId);
    const url = getLeatherPanelDataUrl(coverColorId, { spine, title, aspect });
    return {
        backgroundColor: spine ? preset.spine : preset.base,
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };
}

export function clearCoverLeatherSurfaceCache() {
    dataUrlCache.clear();
}
