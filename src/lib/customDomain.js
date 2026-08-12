/** CNAME target photographers point their subdomain at (Pixieset-style). */
export function getGalleryCnameTarget() {
  return (
    import.meta.env.VITE_GALLERY_CNAME_TARGET ||
    'domain.pixnxt.in'
  ).replace(/\.$/, '').toLowerCase();
}

/**
 * Apex A-record IPs for root-domain setups (Vercel anycast).
 * Do not use Pixieset Cloudflare IPs (104.16.x.x) — those send traffic to Pixieset.
 */
export function getGalleryApexIps() {
  const raw = String(import.meta.env.VITE_GALLERY_APEX_IPS || '216.198.79.1');
  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export function getPlatformRootDomain() {
  const fromEnv = String(import.meta.env.VITE_PLATFORM_ROOT_DOMAIN || '').trim().toLowerCase();
  if (fromEnv) return fromEnv.replace(/^\.+/, '');
  try {
    const site = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim();
    if (site) {
      const host = new URL(site).hostname.toLowerCase();
      if (host.startsWith('www.')) return host.slice(4);
      return host;
    }
  } catch {
    /* ignore */
  }
  return 'pixnxt.in';
}

export function normalizeHost(host) {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

/** Strip protocol, path, trailing slash; lowercase. */
export function normalizeCustomDomain(input) {
  let value = String(input || '').trim().toLowerCase();
  if (!value) return '';
  value = value.replace(/^https?:\/\//, '');
  value = value.split('/')[0];
  value = value.split(':')[0];
  return value.replace(/\.$/, '');
}

const MULTI_PART_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'co.in',
  'com.br',
  'co.za',
  'com.sg',
  'co.jp',
  'com.mx',
  'co.id',
]);

export function getRegistrableDomain(domain) {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized) return '';
  const parts = normalized.split('.');
  if (parts.length < 2) return normalized;
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function isValidCustomDomain(domain) {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized || normalized.includes(' ')) return false;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return false;
  if (normalized.includes('pixnxt.in') || normalized.includes('vercel.app')) return false;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(normalized)) {
    return false;
  }
  return true;
}

/** Hosts served by the main PIXNXT app (not a photographer custom domain). */
export function isPlatformHost(host) {
  const h = normalizeHost(host);
  if (!h || h === 'localhost' || h === '127.0.0.1') return true;
  if (h.endsWith('.localhost')) return true;
  if (h.endsWith('.vercel.app')) return true;

  const root = getPlatformRootDomain();
  if (h === root || h === `www.${root}`) return true;
  if (h.endsWith(`.${root}`)) return true;
  return false;
}

export function getDefaultGalleryHost(profile) {
  const slug =
    profile?.showcase_slug ||
    profile?.display_name ||
    profile?.email?.split('@')[0] ||
    'gallery';
  return `${String(slug).toLowerCase()}.${getPlatformRootDomain()}`;
}

/** Subdomain label for DNS instructions (e.g. gallery.yourdomain.com → gallery). */
export function getDnsHostLabel(domain) {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized) return 'gallery';
  const root = getRegistrableDomain(normalized);
  if (!root || normalized === root) return '@';
  return normalized.slice(0, -(root.length + 1)) || '@';
}

export function isApexCustomDomain(domain) {
  return getDnsHostLabel(domain) === '@';
}

export function customDomainLookupCandidates(host) {
  const normalized = normalizeCustomDomain(host);
  if (!normalized) return [];
  const candidates = [normalized];
  if (normalized.startsWith('www.')) candidates.push(normalized.slice(4));
  else candidates.push(`www.${normalized}`);
  return [...new Set(candidates)];
}

export function isCustomDomainVerified(profile) {
  return (
    profile?.custom_domain_status === 'verified' &&
    Boolean(normalizeCustomDomain(profile?.custom_domain))
  );
}

export function getPhotographerPublicOrigin(profile) {
  if (isCustomDomainVerified(profile)) {
    return `https://${normalizeCustomDomain(profile.custom_domain)}`;
  }
  const slugHost = getDefaultGalleryHost(profile);
  const protocol =
    typeof window !== 'undefined' && window.location?.protocol === 'http:' ? 'http' : 'https';
  return `${protocol}//${slugHost}`;
}
