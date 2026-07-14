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

  // When a sales banner is active, use the uploaded image inside that banner only (no duplicate hero).
  const standaloneCustomImage = custom && !activeBanner ? custom : '';

  return {
    standaloneCustomImage,
    bannerForRender,
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
