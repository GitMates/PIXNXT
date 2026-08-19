/** Remember where the user entered Account settings from (for “Back to …”). */

export const ACCOUNT_BACK_KEY = 'pixnxt-account-back';

const ROUTE_LABELS = [
  { test: (p) => p === '/dashboard' || p.startsWith('/dashboard/'), path: '/dashboard', label: 'Dashboard' },
  { test: (p) => p.startsWith('/client-gallery'), path: '/client-gallery', label: 'Client Gallery' },
  { test: (p) => p.startsWith('/album-proofer') || p.startsWith('/smart-albums'), path: '/album-proofer', label: 'Album Proofer' },
  { test: (p) => p.startsWith('/guest-delivery'), path: '/guest-delivery', label: 'Guest Deliveries' },
  { test: (p) => p.startsWith('/mobile-gallery'), path: '/mobile-gallery', label: 'Mobile Gallery' },
  { test: (p) => p.startsWith('/portal'), path: '/portal', label: 'Portal' },
  { test: (p) => p.startsWith('/store') || p.startsWith('/print'), path: '/store', label: 'Print Lab' },
  { test: (p) => p.startsWith('/settings'), path: '/settings', label: 'Settings' },
];

export function resolveAccountBack(pathname) {
  const raw = String(pathname || '');
  const path = raw.split('?')[0] || '';
  const search = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
  if (!path || path.startsWith('/account')) {
    return { path: '/dashboard', label: 'Dashboard' };
  }
  if (path.startsWith('/deliveries/manage') || path.startsWith('/collections/manage')) {
    return { path: `${path}${search}`, label: 'Delivery' };
  }
  for (const row of ROUTE_LABELS) {
    if (row.test(path)) return { path: row.path, label: row.label };
  }
  return { path: path || '/dashboard', label: 'Dashboard' };
}

export function readAccountBack() {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_BACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.path && parsed?.label && !String(parsed.path).startsWith('/account')) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAccountBack(target) {
  if (!target?.path || String(target.path).startsWith('/account')) return;
  try {
    sessionStorage.setItem(
      ACCOUNT_BACK_KEY,
      JSON.stringify({ path: target.path, label: target.label || resolveAccountBack(target.path).label }),
    );
  } catch {
    /* ignore */
  }
}

/** Navigate into Account settings while remembering the current page for Back. */
export function navigateToAccount(navigate, accountPath, fromPathname, labelOverride) {
  const resolved = resolveAccountBack(fromPathname);
  const from = labelOverride ? { ...resolved, label: labelOverride } : resolved;
  writeAccountBack(from);
  navigate(accountPath, { state: { from } });
}
