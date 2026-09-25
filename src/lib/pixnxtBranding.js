/**
 * Studio Identity "Show PIXNXT on your pages" → photographers.hide_branding.
 * When hide_branding is true, public client pages must not show PIXNXT marks.
 */

export function isPixnxtBrandingHidden(profileOrFlags) {
  if (!profileOrFlags || typeof profileOrFlags !== 'object') return false;
  const hide = profileOrFlags.hide_branding;
  return hide === true || hide === 1 || hide === '1' || hide === 'true';
}

/** True when PIXNXT footer / powered-by should render on a public page. */
export function shouldShowPixnxtBranding(profileOrFlags, options = {}) {
  if (isPixnxtBrandingHidden(profileOrFlags)) return false;
  if (options.showPixnxtBranding === false) return false;
  return true;
}
