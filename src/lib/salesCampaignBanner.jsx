import React from 'react';

/** Shared helpers for Sales Automation banners (StoreDashboard ↔ public gallery). */

export const SALES_CAMPAIGNS_STORAGE_KEY = 'pixnxt_sales_campaigns';
export const SALES_CAMPAIGNS_UPDATED_EVENT = 'pixnxt_sales_campaigns_updated';

function stripDataUrlsFromValue(val) {
  if (typeof val === 'string') {
    return val.startsWith('data:') ? '' : val;
  }
  if (Array.isArray(val)) {
    return val.map(stripDataUrlsFromValue);
  }
  if (val && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, stripDataUrlsFromValue(v)])
    );
  }
  return val;
}

/** Full campaign config for localStorage — strips inlined base64 blobs. */
export function sanitizeCampaignsForStorage(campaigns) {
  if (!Array.isArray(campaigns)) return [];
  return stripDataUrlsFromValue(campaigns);
}

/** Lightweight payload for collections.store_banner_text (gallery rendering only). */
export function buildGalleryCampaignPayload(campaigns) {
  if (!Array.isArray(campaigns)) return [];
  return campaigns.map((c) => ({
    id: c.id,
    enabled: !!c.enabled,
    discount: c.discount,
    discountCode: c.discountCode,
    durationDays: c.durationDays,
    banners: stripDataUrlsFromValue(c.banners || {}),
  }));
}

/** Merge live banner fields from DB into the full StoreDashboard campaign state. */
export function mergeGalleryCampaignsFromDb(localCampaigns, dbCampaigns) {
  if (!Array.isArray(localCampaigns) || !Array.isArray(dbCampaigns) || dbCampaigns.length === 0) {
    return localCampaigns;
  }
  return localCampaigns.map((local) => {
    const remote = dbCampaigns.find((c) => c.id === local.id);
    if (!remote) return local;
    const bannerKeys = new Set([
      ...Object.keys(local.banners || {}),
      ...Object.keys(remote.banners || {}),
    ]);
    return {
      ...local,
      enabled: remote.enabled ?? local.enabled,
      discount: remote.discount ?? local.discount,
      discountCode: remote.discountCode ?? local.discountCode,
      durationDays: remote.durationDays ?? local.durationDays,
      banners: Object.fromEntries(
        [...bannerKeys].map((key) => [
          key,
          { ...(local.banners?.[key] || {}), ...(remote.banners?.[key] || {}) },
        ])
      ),
    };
  });
}

export function hasPendingBannerImageUpload(banner = {}) {
  return (
    String(banner.desktop_image || '').startsWith('data:')
    || String(banner.mobile_image || '').startsWith('data:')
  );
}

export function hasPendingEmailImageUpload(emailConfig = {}) {
  return String(emailConfig.custom_image || '').startsWith('data:');
}

export function isUsablePublicImageUrl(url) {
  const str = String(url || '').trim();
  if (!str || str.startsWith('data:')) return false;
  return /^https?:\/\//i.test(str);
}

/** Merge uploaded email hero image with active sales banner for preview + send. */
export function resolveEmailHeroPresentation(customImage, activeBanner) {
  const custom = isUsablePublicImageUrl(customImage) ? String(customImage).trim() : '';
  const bannerDesktop = String(activeBanner?.desktop_image || '').trim();
  const bannerMobile = String(activeBanner?.mobile_image || '').trim();
  const bannerOwnImage = isUsablePublicImageUrl(bannerDesktop) || isUsablePublicImageUrl(bannerMobile);

  const bannerForRender = activeBanner
    ? {
        ...activeBanner,
        desktop_image: isUsablePublicImageUrl(bannerDesktop)
          ? bannerDesktop
          : (!bannerOwnImage && custom ? custom : ''),
        mobile_image: isUsablePublicImageUrl(bannerMobile)
          ? bannerMobile
          : (isUsablePublicImageUrl(bannerDesktop)
              ? bannerDesktop
              : (!bannerOwnImage && custom ? custom : '')),
      }
    : null;

  // Prefer showing a clear email-style hero image (custom upload, else banner image).
  const heroImageUrl = custom
    || (isUsablePublicImageUrl(bannerDesktop) ? bannerDesktop : '')
    || (isUsablePublicImageUrl(bannerMobile) ? bannerMobile : '')
    || '';

  // When a sales banner is active, use the uploaded image inside that banner only (no duplicate hero).
  const standaloneCustomImage = custom && !activeBanner ? custom : '';

  return {
    standaloneCustomImage,
    bannerForRender,
    heroImageUrl,
  };
}

/** Normalize reminder email fields and strip invalid inline images. */
export function sanitizeEmailReminderConfig(config = {}) {
  const customImage = isUsablePublicImageUrl(config.custom_image) ? config.custom_image : '';
  return {
    ...config,
    custom_image: customImage,
    message: config.message ?? '',
    subject: config.subject ?? '',
    title: config.title ?? '',
    button_text: config.button_text || 'VISIT SHOP',
  };
}

/** Resize large banner uploads so R2 PUT stays fast and reliable. */
export async function compressBannerImageFile(file, maxEdge = 2400, quality = 0.88) {
  if (!file?.type?.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not compress image'))),
        'image/jpeg',
        quality
      );
    });
    const base = (file.name || 'banner').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function persistSalesCampaignsLocally(campaigns) {
  const sanitized = sanitizeCampaignsForStorage(campaigns);
  try {
    localStorage.setItem(SALES_CAMPAIGNS_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(SALES_CAMPAIGNS_UPDATED_EVENT, { detail: sanitized }));
    return sanitized;
  } catch (err) {
    console.warn('Could not persist sales campaigns to localStorage:', err);
    return sanitized;
  }
}

export function getBannerFontFamily(font) {
  if (font === 'Playfair Display') return "'Playfair Display', serif";
  if (font === 'Georgia') return "'Georgia', serif";
  if (font === 'Montserrat') return "'Montserrat', sans-serif";
  return "'Inter', sans-serif";
}

export function formatBannerPlaceholders(text, campaign = {}) {
  if (!text) return '';
  const discountVal = campaign.discount != null && campaign.discount !== ''
    ? `${campaign.discount}%`
    : '30%';
  const code = campaign.discountCode || 'HAPPYANI';
  const days = Number(campaign.durationDays) || 14;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
  const expFormatted = expDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return String(text)
    .replace(/\{discount-value\}/g, discountVal)
    .replace(/\{discount_value\}/g, discountVal)
    .replace(/\{code\}/g, code)
    .replace(/\{exp-date\}/g, expFormatted)
    .replace(/\{exp_date\}/g, expFormatted);
}

export function resolveBannerBackgroundImage(banner, isMobile) {
  if (!banner) return 'none';
  const desktop = banner.desktop_image || '';
  const mobile = banner.mobile_image || '';
  const toCssUrl = (src) => {
    if (!src) return 'none';
    if (/^url\(/i.test(src)) return src;
    // Quote so data-URLs and query-string URLs stay valid in CSS
    const escaped = String(src).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${escaped}")`;
  };
  if (isMobile) {
    if (mobile) return toCssUrl(mobile);
    if (desktop) return toCssUrl(desktop);
    return 'none';
  }
  return desktop ? toCssUrl(desktop) : 'none';
}

export function padTimerPart(n) {
  return String(Math.max(0, n || 0)).padStart(2, '0');
}

/** Preset palettes for Sales Style tabs — apply instantly; manual swatches stay editable. */
export const BANNER_COLOR_TEMPLATES = [
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      bg_color: '#EAE5D8',
      subtitle_color: '#4A5A4B',
      cta_bg: '#3A4A38',
      cta_color: '#EAE5D8',
      title_color: '#3A4A38',
      timer_color: '#3A4A38',
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    colors: {
      bg_color: '#F5F5F3',
      subtitle_color: '#5A5A5A',
      cta_bg: '#1F1F1F',
      cta_color: '#F5F5F3',
      title_color: '#1F1F1F',
      timer_color: '#1F1F1F',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      bg_color: '#EEF2F5',
      subtitle_color: '#5B6B78',
      cta_bg: '#2C3E50',
      cta_color: '#EEF2F5',
      title_color: '#2C3E50',
      timer_color: '#2C3E50',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      bg_color: '#F6EEEA',
      subtitle_color: '#7A5F5F',
      cta_bg: '#6B3F3F',
      cta_color: '#F6EEEA',
      title_color: '#6B3F3F',
      timer_color: '#6B3F3F',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg_color: '#1A1A1A',
      subtitle_color: '#B0B0B0',
      cta_bg: '#EDE8DF',
      cta_color: '#1A1A1A',
      title_color: '#EDE8DF',
      timer_color: '#EDE8DF',
    },
  },
];

export const EMAIL_COLOR_TEMPLATES = [
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      bg_color: '#EAE5D8',
      text_color: '#3A4A38',
      btn_color: '#3A4A38',
      btn_text_color: '#FFFFFF',
      // Dark strip on light body for contrast
      offer_bg_color: '#3A4A38',
      offer_title_color: '#F5F0E6',
      offer_subtitle_color: '#C5D0C0',
      logo_type: 'Dark Logo, for light background',
      icons_type: 'Dark Icons, for light background',
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    colors: {
      bg_color: '#F5F5F3',
      text_color: '#1F1F1F',
      btn_color: '#1F1F1F',
      btn_text_color: '#FFFFFF',
      offer_bg_color: '#1F1F1F',
      offer_title_color: '#FFFFFF',
      offer_subtitle_color: '#B8B8B8',
      logo_type: 'Dark Logo, for light background',
      icons_type: 'Dark Icons, for light background',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      bg_color: '#EEF2F5',
      text_color: '#2C3E50',
      btn_color: '#2C3E50',
      btn_text_color: '#FFFFFF',
      offer_bg_color: '#2C3E50',
      offer_title_color: '#EEF2F5',
      offer_subtitle_color: '#A8B8C8',
      logo_type: 'Dark Logo, for light background',
      icons_type: 'Dark Icons, for light background',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      bg_color: '#F6EEEA',
      text_color: '#6B3F3F',
      btn_color: '#6B3F3F',
      btn_text_color: '#FFFFFF',
      offer_bg_color: '#6B3F3F',
      offer_title_color: '#F6EEEA',
      offer_subtitle_color: '#E0C4C4',
      logo_type: 'Dark Logo, for light background',
      icons_type: 'Dark Icons, for light background',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg_color: '#1A1A1A',
      text_color: '#EDE8DF',
      btn_color: '#EDE8DF',
      btn_text_color: '#1A1A1A',
      // Light strip on dark body for contrast
      offer_bg_color: '#EDE8DF',
      offer_title_color: '#1A1A1A',
      offer_subtitle_color: '#5A5348',
      logo_type: 'Light Logo, for dark background',
      icons_type: 'Light Icons, for dark background',
    },
  },
];

function hexEqual(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

export function getActiveColorTemplateId(kind, values = {}) {
  if (values.color_template) {
    const list = kind === 'email' ? EMAIL_COLOR_TEMPLATES : BANNER_COLOR_TEMPLATES;
    if (list.some((tpl) => tpl.id === values.color_template)) {
      return values.color_template;
    }
  }
  const list = kind === 'email' ? EMAIL_COLOR_TEMPLATES : BANNER_COLOR_TEMPLATES;
  const match = list.find((tpl) => {
    if (kind === 'email') {
      return (
        hexEqual(values.bg_color, tpl.colors.bg_color)
        && hexEqual(values.text_color, tpl.colors.text_color)
        && hexEqual(values.btn_color, tpl.colors.btn_color)
        && hexEqual(values.btn_text_color, tpl.colors.btn_text_color)
      );
    }
    return (
      hexEqual(values.bg_color, tpl.colors.bg_color)
      && hexEqual(values.subtitle_color, tpl.colors.subtitle_color)
      && hexEqual(values.cta_bg, tpl.colors.cta_bg)
      && hexEqual(values.timer_color, tpl.colors.timer_color)
    );
  });
  return match?.id || null;
}

/** Compact 5 square template tiles for Style tabs (manual color pickers stay below). */
export function ColorTemplatePicker({ kind = 'banner', values = {}, onApply }) {
  const templates = kind === 'email' ? EMAIL_COLOR_TEMPLATES : BANNER_COLOR_TEMPLATES;
  const activeId = getActiveColorTemplateId(kind, values);

  const previewSwatches = (tpl) => {
    if (kind === 'email') {
      // body / strip / strip text / button — shows strip contrast vs body
      return [
        tpl.colors.bg_color,
        tpl.colors.offer_bg_color || tpl.colors.btn_color,
        tpl.colors.offer_title_color || tpl.colors.btn_text_color,
        tpl.colors.btn_color,
      ];
    }
    return [tpl.colors.bg_color, tpl.colors.subtitle_color, tpl.colors.cta_bg, tpl.colors.cta_color || tpl.colors.timer_color];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#a0a0a0', letterSpacing: '0.1em', marginBottom: '4px' }}>
          COLOR TEMPLATES
        </label>
        <p style={{ margin: 0, fontSize: '11px', color: '#999', lineHeight: 1.4 }}>
          Pick a ready palette — strip colors contrast with the email background.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
        {templates.map((tpl) => {
          const selected = activeId === tpl.id;
          const swatches = previewSwatches(tpl);
          return (
            <div key={tpl.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <button
                type="button"
                title={tpl.name}
                aria-pressed={selected}
                onClick={() => onApply?.({ ...tpl.colors, color_template: tpl.id })}
                style={{
                  width: '100%',
                  maxWidth: '52px',
                  height: '52px',
                  padding: 0,
                  margin: 0,
                  border: selected ? '2px solid #111' : '1px solid #c8c8c8',
                  borderRadius: '0px',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  clipPath: 'inset(0)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 0,
                    borderRadius: '0px',
                  }}
                >
                  {swatches.map((c, i) => (
                    <div key={`${tpl.id}-${i}`} style={{ backgroundColor: c, borderRadius: '0px', minHeight: 0 }} />
                  ))}
                </div>
              </button>
              <span style={{ fontSize: '9px', fontWeight: 600, color: selected ? '#111' : '#666', letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.2 }}>
                {tpl.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Apply email Style template → body + offer-strip colors (strip contrasts with body bg). */
export function applyEmailStyleTemplateColors(templateColors = {}) {
  const templateId = templateColors.color_template;
  const emailTpl = EMAIL_COLOR_TEMPLATES.find((t) => t.id === templateId);
  const bannerTpl = BANNER_COLOR_TEMPLATES.find((t) => t.id === templateId);
  const fromEmail = emailTpl?.colors || {};
  const fromBanner = bannerTpl?.colors || {};

  return {
    ...templateColors,
    color_template: templateId || null,
    bg_color: fromEmail.bg_color || templateColors.bg_color,
    text_color: fromEmail.text_color || templateColors.text_color,
    btn_color: fromEmail.btn_color || templateColors.btn_color,
    btn_text_color: fromEmail.btn_text_color || templateColors.btn_text_color,
    logo_type: fromEmail.logo_type || templateColors.logo_type,
    icons_type: fromEmail.icons_type || templateColors.icons_type,
    offer_bg_color: fromEmail.offer_bg_color || fromBanner.cta_bg || templateColors.offer_bg_color,
    offer_title_color: fromEmail.offer_title_color || fromBanner.cta_color || templateColors.offer_title_color,
    offer_subtitle_color: fromEmail.offer_subtitle_color || fromBanner.subtitle_color || templateColors.offer_subtitle_color,
    offer_cta_bg: fromEmail.offer_cta_bg || fromBanner.cta_bg || templateColors.offer_cta_bg,
    offer_cta_color: fromEmail.offer_cta_color || fromBanner.cta_color || templateColors.offer_cta_color,
  };
}

/** Resolve colors for the email offer strip from Style only (never sales-banner leftovers). */
export function resolveEmailOfferStripColors(emailConfig = {}, _activeBanner = null) {
  const emailTpl = EMAIL_COLOR_TEMPLATES.find((t) => t.id === emailConfig.color_template);
  const bannerTpl = BANNER_COLOR_TEMPLATES.find((t) => t.id === emailConfig.color_template);

  // Explicit Style swatches win; then selected template; then safe defaults (no banner.bg_color).
  return {
    bg: emailConfig.offer_bg_color
      || emailTpl?.colors.offer_bg_color
      || bannerTpl?.colors.cta_bg
      || '#3A4A38',
    title: emailConfig.offer_title_color
      || emailTpl?.colors.offer_title_color
      || bannerTpl?.colors.cta_color
      || '#F5F0E6',
    subtitle: emailConfig.offer_subtitle_color
      || emailTpl?.colors.offer_subtitle_color
      || bannerTpl?.colors.subtitle_color
      || '#C5D0C0',
    ctaBg: emailConfig.offer_cta_bg || emailTpl?.colors.btn_color || bannerTpl?.colors.cta_bg || '#3A4A38',
    ctaColor: emailConfig.offer_cta_color || emailTpl?.colors.btn_text_color || bannerTpl?.colors.cta_color || '#F5F0E6',
  };
}

/** Ensure email Style always has strip colors (so preview never shows last-sent banner tan). */
export function ensureEmailOfferStripColors(config = {}) {
  const resolved = resolveEmailOfferStripColors(config, null);
  return {
    ...config,
    offer_bg_color: config.offer_bg_color || resolved.bg,
    offer_title_color: config.offer_title_color || resolved.title,
    offer_subtitle_color: config.offer_subtitle_color || resolved.subtitle,
  };
}

/** Live preview block: hero image + colored offer strip (matches sent email layout). */
export function EmailOfferStripPreview({
  heroImageUrl = '',
  activeBanner = null,
  emailConfig = {},
  formatPlaceholders = (text) => text || '',
}) {
  const colors = resolveEmailOfferStripColors(emailConfig, activeBanner);
  const stripTitle = formatPlaceholders(activeBanner?.title || 'One Year Anniversary');
  const stripSubtitle = formatPlaceholders(activeBanner?.subtitle || '20% off all prints');

  if (!heroImageUrl && !stripTitle && !stripSubtitle) return null;

  return (
    <div style={{ width: '100%', marginBottom: '32px', border: '1px solid #dcdcdc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {heroImageUrl ? (
        <img
          src={heroImageUrl}
          alt=""
          style={{ display: 'block', width: '100%', maxHeight: '240px', objectFit: 'cover' }}
        />
      ) : null}
      <div
        style={{
          backgroundColor: colors.bg,
          padding: '20px 16px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.title,
            fontFamily: "'Georgia', 'Playfair Display', serif",
            lineHeight: 1.3,
            marginBottom: stripSubtitle ? '6px' : 0,
          }}
        >
          {stripTitle}
        </div>
        {stripSubtitle ? (
          <div
            style={{
              fontSize: '11px',
              color: colors.subtitle,
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.4,
            }}
          >
            {stripSubtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Decorative bouquet used in Large Banner / Store Rotator previews */
export function BannerBouquetSvg({ size = 56, style }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, flexShrink: 0, ...style }} aria-hidden="true">
      <path d="M42 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 66 L50 44" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 66 L50 46" stroke="#5d6050" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 58 Q48 60 52 58" fill="none" stroke="#8c8d82" strokeWidth="1.5" />
      <path d="M45 59 L40 70" stroke="#8c8d82" strokeWidth="1.2" />
      <path d="M51 59 L56 70" stroke="#8c8d82" strokeWidth="1.2" />
      <path d="M35 44 Q42 42 43 36 Q38 39 35 44" fill="#7a806c" />
      <path d="M61 44 Q54 42 53 36 Q58 39 61 44" fill="#7a806c" />
      <circle cx="48" cy="32" r="6" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
      <circle cx="48" cy="32" r="2" fill="#e5ded3" />
      <circle cx="40" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
      <circle cx="40" cy="39" r="1.5" fill="#e5ded3" />
      <circle cx="56" cy="39" r="5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
      <circle cx="56" cy="39" r="1.5" fill="#e5ded3" />
      <circle cx="48" cy="42" r="4.5" fill="#ffffff" stroke="#dcdcdc" strokeWidth="0.75" />
      <circle cx="48" cy="42" r="1.2" fill="#e5ded3" />
      <circle cx="28" cy="35" r="1.5" fill="#ffffff" />
      <circle cx="58" cy="24" r="1.5" fill="#ffffff" />
    </svg>
  );
}
