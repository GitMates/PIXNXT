/**
 * Helpers for the account "Where you're signed in" list.
 */

function browserName(ua) {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Browser';
}

function browserVersion(ua) {
  const patterns = [
    /Edg\/(\d+)/,
    /Chrome\/(\d+)/,
    /Firefox\/(\d+)/,
    /Version\/(\d+).*Safari/,
  ];
  for (const pattern of patterns) {
    const match = ua.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function osName(ua) {
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows 11';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown OS';
}

function deviceSummary(ua) {
  const browser = browserName(ua);
  if (/Windows/.test(ua)) return `${browser} on Windows`;
  if (/Macintosh|Mac OS X/.test(ua)) return `${browser} on Mac`;
  if (/iPhone|iPad/.test(ua)) return `${browser} on iPhone`;
  if (/Android/.test(ua)) return `${browser} on Android`;
  return browser;
}

export function sessionFingerprint(session) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const tokenTail =
    session?.access_token && session.access_token.length > 12
      ? session.access_token.slice(-12)
      : '';
  const created = session?.created_at || session?.user?.last_sign_in_at || '';
  const raw = `${ua}|${created}|${tokenTail}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `sess_${Math.abs(hash).toString(36)}`;
}

export async function resolveSessionLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return '—';
    const data = await res.json();
    return data.city || data.region || data.country_name || '—';
  } catch {
    return '—';
  }
}

/**
 * Build the rows shown for the current browser session.
 * @param {import('@supabase/supabase-js').Session | null} authSession
 * @param {string} [location]
 */
export function buildCurrentSessionRows(authSession, location = '—') {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browser = browserName(ua);
  const version = browserVersion(ua);
  const os = osName(ua);
  const device = deviceSummary(ua);
  const sessionId = sessionFingerprint(authSession);
  const detailLabel = version ? `${os}, ${browser} ${version}` : `${os}, ${browser}`;
  const now = new Date().toISOString();

  return [
    {
      id: `${sessionId}-summary`,
      sessionKey: sessionId,
      device,
      location,
      label: `${device} · ${location}`,
      meta: 'This device · active now',
      current: true,
      canSignOut: false,
      lastActive: now,
    },
    {
      id: sessionId,
      sessionKey: sessionId,
      device: detailLabel,
      location,
      label: detailLabel,
      meta: 'Current session',
      current: true,
      canSignOut: true,
      lastActive: now,
    },
  ];
}

export function mergeStoredSessions(stored, currentRows) {
  const currentKeys = new Set(
    currentRows.flatMap((row) => [row.id, row.sessionKey].filter(Boolean)),
  );
  const others = Array.isArray(stored)
    ? stored.filter(
        (row) =>
          row &&
          !row.current &&
          row.sessionKey &&
          !currentKeys.has(row.id) &&
          !currentKeys.has(row.sessionKey),
      )
    : [];
  return [...currentRows, ...others];
}

export function userHasPasswordIdentity(user, loginPasswordSet = false) {
  if (loginPasswordSet) return true;
  const identities = user?.identities;
  if (Array.isArray(identities)) {
    return identities.some((identity) => identity.provider === 'email');
  }
  return false;
}
