const VALID_PALETTES = ['light', 'gold', 'rose', 'terracotta', 'sand', 'olive', 'agave', 'sea', 'dark'];
const VALID_FONTS = ['sans', 'serif', 'modern', 'timeless', 'bold', 'subtle'];
const VALID_COVER_UI = [
  'center', 'left', 'novel', 'vintage', 'frame', 'stripe', 'divider',
  'journal', 'stamp', 'outline', 'classic', 'none',
];

/** DB / preview tokens like `light_1` → `light` */
export function normalizePaletteId(raw) {
  if (!raw) return 'light';
  const base = String(raw).replace(/_1$/, '');
  return VALID_PALETTES.includes(base) ? base : 'light';
}

export function normalizeFontId(raw) {
  if (!raw) return 'sans';
  const base = String(raw).replace(/_1$/, '');
  return VALID_FONTS.includes(base) ? base : 'sans';
}

/** DB cover_style `photo` is not a layout id — map to default UI cover */
export function normalizeCoverStyleId(raw) {
  if (!raw || raw === 'photo' || raw === 'text_only' || raw === 'video_embed' || raw === 'solid_color') {
    return 'novel';
  }
  return VALID_COVER_UI.includes(raw) ? raw : 'novel';
}

/** Prefer cover_layout; fall back to legacy cover_style enum. */
export function resolveCoverLayoutId(collectionOrRaw, fallback = 'novel') {
  if (collectionOrRaw == null) return fallback;
  if (typeof collectionOrRaw === 'object') {
    if (collectionOrRaw.cover_layout) {
      return normalizeCoverStyleId(collectionOrRaw.cover_layout);
    }
    return normalizeCoverStyleId(collectionOrRaw.cover_style);
  }
  return normalizeCoverStyleId(collectionOrRaw);
}
