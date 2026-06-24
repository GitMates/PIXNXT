export const DEFAULT_APP_CTA = {
  cta_enabled: true,
  cta_label: 'Visit Website',
  cta_url: '',
};

export function getAppCtaSettings(app) {
  const stored = app?.settings || {};
  return {
    cta_enabled: stored.cta_enabled ?? DEFAULT_APP_CTA.cta_enabled,
    cta_label: stored.cta_label ?? DEFAULT_APP_CTA.cta_label,
    cta_url: stored.cta_url ?? DEFAULT_APP_CTA.cta_url,
  };
}

export function getAppCtaLink(app, fallbackLink) {
  const cta = getAppCtaSettings(app);
  if (!cta.cta_enabled) return null;

  const href = String(cta.cta_url || '').trim() || fallbackLink?.href;
  if (!href) return null;

  const label = String(cta.cta_label || '').trim() || 'Visit Website';
  return { href: href.startsWith('http') ? href : `https://${href}`, label };
}

export function formatEventDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
