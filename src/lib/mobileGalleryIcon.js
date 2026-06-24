/** Same-origin touch icon URL — iOS reliably uses this for Add to Home Screen. */
export function getAppleTouchIconUrl(slug) {
  if (!slug) return '';
  return `/m/${encodeURIComponent(slug)}/apple-touch-icon.png`;
}

export const APPLE_TOUCH_ICON_SIZES = [
  '57x57',
  '60x60',
  '72x72',
  '76x76',
  '114x114',
  '120x120',
  '144x144',
  '152x152',
  '167x167',
  '180x180',
  '192x192',
  '256x256',
  '512x512',
];
