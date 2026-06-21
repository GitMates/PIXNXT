export const MG_COVER_STYLES = [
  { id: 'full', label: 'Full' },
  { id: 'third', label: 'Third' },
  { id: 'none', label: 'None' },
];

export const MG_THEMES = [
  {
    id: 'echo',
    label: 'Echo',
    thumbImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
    previewImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=85',
    sampleLines: ['Welcome to', 'EPIC ADVENTURE'],
    layout: 'center',
    titleFont: "'Unbounded', 'Montserrat', sans-serif",
    dateFont: "'Montserrat', sans-serif",
    titleWeight: 700,
    titleSize: '0.55rem',
    dateSize: '0.38rem',
    titleTransform: 'uppercase',
    titleCase: 'upper',
    dateTransform: 'uppercase',
    dateFirst: true,
    showCta: true,
    showChevron: false,
    showScrollBtn: false,
    showTitleRule: true,
    letterSpacing: '0.1em',
    dateLetterSpacing: '0.14em',
  },
  {
    id: 'spring',
    label: 'Spring',
    thumbImage:
      'https://images.unsplash.com/photo-1439068793663-952325a57880?auto=format&fit=crop&w=400&q=80',
    previewImage:
      'https://images.unsplash.com/photo-1439068793663-952325a57880?auto=format&fit=crop&w=900&q=85',
    sampleLines: ['Waterfalls of', 'the Northwest'],
    layout: 'center',
    titleFont: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    dateFont: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    titleWeight: 500,
    titleSize: '0.72rem',
    dateSize: '0.42rem',
    titleTransform: 'none',
    titleCase: 'lower',
    dateTransform: 'none',
    dateFirst: false,
    showCta: false,
    showChevron: true,
    showScrollBtn: false,
    letterSpacing: '0.02em',
    dateLetterSpacing: '0.02em',
    dateStyle: 'title',
  },
  {
    id: 'lark',
    label: 'Lark',
    thumbImage:
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=400&q=80',
    previewImage:
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=900&q=85',
    sampleLines: ['Beautiful coasts', 'and beaches'],
    layout: 'bottom-left',
    titleFont: "'Montserrat', system-ui, sans-serif",
    dateFont: "'Montserrat', system-ui, sans-serif",
    titleWeight: 300,
    titleSize: '0.62rem',
    dateSize: '0.36rem',
    titleTransform: 'none',
    titleCase: 'lower',
    dateTransform: 'uppercase',
    dateFirst: false,
    showCta: false,
    showChevron: false,
    showScrollBtn: true,
    letterSpacing: '0.04em',
    dateLetterSpacing: '0.12em',
  },
  {
    id: 'sage',
    label: 'Sage',
    thumbImage:
      'https://images.unsplash.com/photo-1478131142948-caa4165fd0b9?auto=format&fit=crop&w=400&q=80',
    previewImage:
      'https://images.unsplash.com/photo-1478131142948-caa4165fd0b9?auto=format&fit=crop&w=900&q=85',
    sampleLines: ['Camping Trip'],
    layout: 'center',
    titleFont: "'Kaushan Script', cursive",
    dateFont: "'Lora', Georgia, serif",
    titleWeight: 400,
    titleSize: '0.85rem',
    dateSize: '0.38rem',
    titleTransform: 'none',
    titleCase: 'title',
    dateTransform: 'uppercase',
    dateFirst: false,
    showCta: false,
    showChevron: true,
    showScrollBtn: false,
    showIcon: true,
    letterSpacing: '0.02em',
    dateLetterSpacing: '0.08em',
  },
];

export const DEFAULT_MG_DESIGN = {
  cover_style: 'full',
  cover_focal_x: 50,
  cover_focal_y: 50,
  theme: 'echo',
  grid_style: 'vertical',
  color_theme: 'light',
};

export function getAppDesignSettings(app) {
  const stored = app?.settings?.design || {};
  return { ...DEFAULT_MG_DESIGN, ...stored };
}

export function getThemeById(themeId) {
  return MG_THEMES.find((t) => t.id === themeId) || MG_THEMES[0];
}

/** Design-panel phone preview: custom cover wins; otherwise show theme demo image. */
export function getDesignPreviewBackgroundUrl(app, photos, themeId, coverOverride) {
  const customCover = coverOverride ?? app?.cover_image_url;
  if (customCover) return customCover;

  const theme = getThemeById(themeId);
  if (theme?.previewImage) return theme.previewImage;

  const firstPhoto = photos?.[0];
  return firstPhoto?.full_url || firstPhoto?.thumbnail_url || null;
}

function ordinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';
}

export function formatThemeEventDate(dateStr, theme) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';

  const day = d.getDate();
  const year = d.getFullYear();

  if (theme?.dateStyle === 'title') {
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${month} ${day}${ordinalSuffix(day)}, ${year}`;
  }

  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const suffix = ordinalSuffix(day).toUpperCase();
  return `${month} ${day}${suffix}, ${year}`;
}

export function formatThemeTitle(name, theme) {
  const raw = String(name || '').trim() || 'Gallery';
  if (theme?.titleCase === 'upper') return raw.toUpperCase();
  if (theme?.titleCase === 'lower') return raw.toLowerCase();
  if (theme?.titleCase === 'title') {
    return raw.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return raw;
}
