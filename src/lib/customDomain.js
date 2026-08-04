/** CNAME target photographers point their subdomain at (Pixieset-style). */
export function getGalleryCnameTarget() {
  return (
    import.meta.env.VITE_GALLERY_CNAME_TARGET ||
    'domain.pixnxt.in'
  ).replace(/\.$/, '').toLowerCase();
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

export function isValidCustomDomain(domain) {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized || normalized.includes(' ')) return false;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return false;
  if (normalized.includes('pixnxt.in') || normalized.includes('vercel.app')) return false;
  // Require at least one dot (subdomain recommended).
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
  const parts = normalized.split('.');
  if (parts.length <= 2) return '@';
  return parts[0];
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
