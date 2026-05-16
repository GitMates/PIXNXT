/**
 * Open an in-app route in a new tab. Uses /?redirect= so it works on static hosts
 * that do not rewrite deep links to index.html (e.g. Vercel before vercel.json deploy).
 */
export function buildSpaRedirectUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/?redirect=${encodeURIComponent(normalized)}`;
}

export function openSpaPath(path, target = '_blank') {
  const url = buildSpaRedirectUrl(path);
  if (target === '_self') {
    window.location.assign(url);
    return;
  }
  window.open(url, target, 'noopener,noreferrer');
}
