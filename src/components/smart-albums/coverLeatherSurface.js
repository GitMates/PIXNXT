import { resolveCoverLeatherPreset } from './albumCoverColor';

const SURFACE_VERSION = 9;
const dataUrlCache = new Map();

function leatherPresetColors(preset) {
    const resolved = preset?.base ? preset : resolveCoverLeatherPreset('cream');
    return {
        base: resolved.base,
        highlight: resolved.highlight,
        shadow: resolved.shadow,
        text: resolved.text,
    };
}

function leatherGrainSeed(presetId) {
    let hash = 0;
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

function drawPanelEdgeBevel(ctx, texW, texH, shadowRgb) {
    const edge = Math.max(2, Math.round(Math.min(texW, texH) * 0.007));
    const edgeColor = rgbToCss(mixRgb(shadowRgb, { r: 0, g: 0, b: 0 }, 0.45), 0.14);
    const highlightColor = 'rgba(255,255,255,0.1)';

    const left = ctx.createLinearGradient(0, 0, edge * 5, 0);
    left.addColorStop(0, edgeColor);
    left.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, texW, texH);

    const top = ctx.createLinearGradient(0, 0, 0, edge * 5);
    top.addColorStop(0, edgeColor);
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, texW, texH);

    const right = ctx.createLinearGradient(texW, 0, texW - edge * 5, 0);
    right.addColorStop(0, edgeColor);
    right.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = right;
    ctx.fillRect(0, 0, texW, texH);

    const bottom = ctx.createLinearGradient(0, texH, 0, texH - edge * 5);
    bottom.addColorStop(0, edgeColor);
    bottom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, texW, texH);

    const innerHighlight = ctx.createLinearGradient(0, edge, 0, edge * 6);
    innerHighlight.addColorStop(0, highlightColor);
    innerHighlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = innerHighlight;
    ctx.fillRect(edge, edge, texW - edge * 2, edge * 5);
}

/** Realistic pebbled leather — studio light, weave, pores, satin sheen. */
export function drawLeatherPanel(ctx, texW, texH, preset, { presetId = 'cream', spine = false } = {}) {
    const colors = leatherPresetColors(preset);
    const baseRgb = parseHexColor(colors.base);
    const shadowRgb = parseHexColor(colors.shadow);

    const bg = ctx.createLinearGradient(texW * 0.12, 0, texW * 0.88, texH);
    bg.addColorStop(0, colors.highlight);
    bg.addColorStop(0.32, colors.base);
    bg.addColorStop(0.68, colors.base);
    bg.addColorStop(1, colors.shadow);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, texW, texH);

    const spot = ctx.createRadialGradient(
        texW * 0.36,
        texH * 0.2,
        0,
        texW * 0.42,
        texH * 0.32,
        Math.max(texW, texH) * 0.72
    );
    spot.addColorStop(0, 'rgba(255,255,255,0.16)');
    spot.addColorStop(0.4, 'rgba(255,255,255,0.05)');
    spot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, texW, texH);

    const seed = leatherGrainSeed(presetId);
    const imgData = ctx.getImageData(0, 0, texW, texH);
    const data = imgData.data;

    for (let y = 0; y < texH; y += 1) {
        const lightY = 1 - y / texH;
        for (let x = 0; x < texW; x += 1) {
            const lightX = 1 - x / texW;
            const lighting = lightX * 0.54 + lightY * 0.46;

            const weaveX = Math.sin(x * 0.92 + seed * 0.4) * Math.cos(y * 0.14 + seed * 0.2);
            const weaveY = Math.sin(y * 0.92 + seed * 1.6) * Math.cos(x * 0.14 + seed * 0.35);
            const weave = (weaveX + weaveY) * 4.2;

            const micro = (leatherNoise(seed, x * 4.6, y * 4.6) - 0.5) * 16;
            const pebble = (leatherNoise(seed + 17, x * 0.52, y * 0.52) - 0.5) * 20;
            const pebble2 = (leatherNoise(seed + 53, x * 0.24 + y * 0.06, y * 0.24) - 0.5) * 14;
            const poreField = leatherNoise(seed + 131, x * 1.1, y * 1.1);
            const pore = poreField > 0.935 ? -10 : poreField > 0.885 ? -5 : 0;
            const spineGrain = spine
                ? (leatherNoise(seed + 200, x * 0.07, y * 2.6) - 0.5) * 12
                : 0;

            const grain = weave + micro + pebble + pebble2 + pore + spineGrain + lighting * 13 - 6.5;

            const i = (y * texW + x) * 4;
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            r = Math.max(0, Math.min(255, r + grain));
            g = Math.max(0, Math.min(255, g + grain * 0.97));
            b = Math.max(0, Math.min(255, b + grain * 0.93));

            if (grain > 5) {
                r = Math.min(255, r + 3);
                g = Math.min(255, g + 2);
            } else if (grain < -5) {
                r = Math.max(0, r - 2);
                b = Math.max(0, b - 2);
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const sheen = ctx.createLinearGradient(0, 0, texW, texH * 0.65);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0.07)');
    sheen.addColorStop(0.55, 'rgba(255,255,255,0.045)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, texW, texH);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
        texW * 0.48,
        texH * 0.44,
        texW * 0.06,
        texW * 0.5,
        texH * 0.5,
        Math.max(texW, texH) * 0.84
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0.05)');
    vignette.addColorStop(0.5, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, rgbToCss(mixRgb(baseRgb, shadowRgb, 0.38), 0.32));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, texW, texH);

    drawPanelEdgeBevel(ctx, texW, texH, shadowRgb);
}

/** Pressed-in serif title — debossed stamp with inner shadow and highlight. */
export function drawDebossedCoverTitle(ctx, text, texW, texH, preset) {
    const upper = String(text || '').trim().toUpperCase();
    if (!upper) return;

    const colors = leatherPresetColors(preset);
    const baseRgb = parseHexColor(colors.base);
    const grooveRgb = parseHexColor(colors.text || colors.shadow);
    const grooveColor = rgbToCss(mixRgb(baseRgb, grooveRgb, 0.68));

    const maxWidth = texW * 0.64;
    let fontSize = Math.min(texW * 0.05, texH * 0.042, 36);
    while (fontSize > 10) {
        ctx.font = `500 ${fontSize}px Georgia, "Times New Roman", serif`;
        if (ctx.measureText(upper).width <= maxWidth) break;
        fontSize -= 2;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = texW / 2;
    const cy = texH / 2;
    const depth = Math.max(2, fontSize * 0.042);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.48), 0.62);
    ctx.fillText(upper, cx - depth * 1.1, cy - depth * 1.1);
    ctx.fillStyle = rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.28), 0.35);
    ctx.fillText(upper, cx - depth * 0.45, cy - depth * 0.45);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(upper, cx + depth * 0.75, cy + depth * 0.75);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(upper, cx + depth * 0.3, cy + depth * 0.3);
    ctx.restore();

    ctx.fillStyle = grooveColor;
    ctx.fillText(upper, cx, cy);

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = rgbToCss(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.55));
    ctx.lineWidth = Math.max(0.5, fontSize * 0.011);
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
    drawLeatherPanel(ctx, width, texH, preset, { presetId: coverColorId, spine });
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
        backgroundColor: preset.base,
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };
}

export function clearCoverLeatherSurfaceCache() {
    dataUrlCache.clear();
}
