/** Studio modules shown in this release. The others stay in the codebase. */
export const VISIBLE_MODULE_IDS = ['client-gallery', 'album-proofer', 'print-lab'];

const HIDDEN_STUDIO_PREFIXES = ['/portal', '/guest-delivery', '/mobile-gallery'];

export function isVisibleModule(id) {
  return VISIBLE_MODULE_IDS.includes(id);
}

export function isHiddenStudioPath(pathname = '') {
  const path = String(pathname).split('?')[0].replace(/\/+$/, '') || '/';
  return HIDDEN_STUDIO_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
