/** Shared client-facing origin resolution for Edge Functions. */

export function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  } catch {
    return true;
  }
}

/**
 * Prefer verified custom domain, then client-provided public origin, then PUBLIC_SITE_URL.
 * Localhost from the client is kept so local email testing still works.
 */
export function resolveClientFacingOrigin(opts: {
  siteOrigin?: string | null;
  customDomain?: string | null;
  customDomainStatus?: string | null;
}): string {
  const domain = String(opts.customDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\.$/, '');

  if (opts.customDomainStatus === 'verified' && domain) {
    return `https://${domain}`;
  }

  const fromClient = String(opts.siteOrigin || '').replace(/\/$/, '');
  const fromSecret = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || '').replace(
    /\/$/,
    '',
  );

  if (fromClient && isLocalOrigin(fromClient)) return fromClient;
  if (fromClient && !/vercel\.app/i.test(fromClient)) return fromClient;
  return fromSecret || fromClient || '';
}
