/**
 * Album-proofer R2 keys have drifted across upload conventions:
 *   - extensionless: `{ts}-{n}-{name}` (safeSegment strips `.jpg`)
 *   - mangled: `{ts}-{n}-{name}-jpg` (`.` turned into `-` without stripping)
 *   - proper: `{ts}-{n}-{name}.jpg`
 * Placements often keep a deleted intermediate key after "New version".
 */

const EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const MANGLED_EXT_RE = /-(jpe?g|png|webp|gif|heic|heif)$/i;

/** True when the basename ends with `-jpg` / `-png` instead of `.jpg` / `.png`. */
export function isMangledAlbumStoragePath(path) {
  const base = String(path || '')
    .split('?')[0]
    .split('/')
    .pop() || '';
  return MANGLED_EXT_RE.test(base);
}

/** Strip query/hash and leading slash from a path or public URL. */
export function storagePathFromUrlOrPath(value, publicBase = '') {
  if (!value || typeof value !== 'string') return null;
  let s = value.trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = u.pathname.replace(/^\//, '');
      const base = String(publicBase || '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');
      if (base && s.startsWith(base + '/')) {
        s = s.slice(base.length + 1);
      }
    }
  } catch {
    /* keep s */
  }
  s = s.replace(/^\//, '').split('?')[0].split('#')[0];
  return s || null;
}

/**
 * Candidate R2 keys to try when the stored path 404s.
 * Always keep the stored key first — many albums live as extensionless or
 * mangled `-jpg` objects; preferring `.jpg` first caused systematic 404s.
 * Fallbacks: demangled `.ext` ↔ mangled `-ext`, then extensionless stem.
 */
export function albumStoragePathCandidates(path) {
  const trimmed = storagePathFromUrlOrPath(path);
  if (!trimmed) return [];
  const out = [];
  const push = (p) => {
    if (p && !out.includes(p)) out.push(p);
  };

  push(trimmed);

  const demangled = trimmed.replace(MANGLED_EXT_RE, '.$1');
  push(demangled);

  // Reverse: a bad display URL may already be `.jpg` while R2 has `-jpg`.
  const mangledFromDot = trimmed.replace(EXT_RE, '-$1');
  if (mangledFromDot !== trimmed) push(mangledFromDot);

  const base = trimmed.split('/').pop() || '';
  const dir = trimmed.includes('/') ? trimmed.slice(0, trimmed.lastIndexOf('/') + 1) : '';
  const stem = base.replace(EXT_RE, '').replace(MANGLED_EXT_RE, '');

  if (stem) {
    push(`${dir}${stem}`);
    push(`${dir}${stem}.jpg`);
    push(`${dir}${stem}.jpeg`);
    push(`${dir}${stem}-jpg`);
    push(`${dir}${stem}-jpeg`);
  }

  return out;
}

/** Comparable stem: drop upload prefix + extension / mangled suffix. */
export function albumObjectStem(path) {
  const base =
    String(path || '')
      .split('?')[0]
      .split('/')
      .pop() || '';
  return base
    .replace(/^\d+-\d+-/, '')
    .replace(EXT_RE, '')
    .replace(MANGLED_EXT_RE, '')
    .toLowerCase();
}

/** Prefer cover-like keys, then newest `{ts}-` prefix. */
export function pickBestAlbumObjectKey(keys, hintPath = null) {
  const list = (keys || []).filter(Boolean);
  if (!list.length) return null;
  const hintStem = hintPath ? albumObjectStem(hintPath) : null;
  const scored = list.map((key) => {
    const base = key.split('/').pop() || '';
    const m = base.match(/^(\d+)-(\d+)-/);
    const ts = m ? Number(m[1]) : 0;
    const stem = albumObjectStem(key);
    const coverBoost = /cover/i.test(base) ? 1e15 : 0;
    const stemBoost = hintStem && stem && stem === hintStem ? 1e14 : 0;
    return { key, score: coverBoost + stemBoost + ts };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.key || null;
}
