import { createClient } from '@supabase/supabase-js';

function getRequestOrigin(req) {
  const fromEnv = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host;
  if (host) return `${forwardedProto || 'https'}://${host}`;
  return '';
}

function buildManifest(app, photographerName, origin) {
  const slug = app.slug;
  const description = photographerName
    ? `${app.name || 'Gallery'} mobile gallery by ${photographerName}`
    : `${app.name || 'Gallery'} mobile gallery`;

  const base = `${origin}/m/${encodeURIComponent(slug)}`;
  const remoteIcon = app.icon_url || app.cover_image_url || '';
  const iconType = /\.jpe?g($|\?)/i.test(remoteIcon)
    ? 'image/jpeg'
    : /\.webp($|\?)/i.test(remoteIcon)
      ? 'image/webp'
      : 'image/png';

  return {
    id: `/m/${slug}/`,
    name: app.name || 'Gallery',
    short_name: String(app.name || 'Gallery').slice(0, 12),
    description,
    start_url: `${base}/pwa`,
    scope: `/m/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#20a398',
    icons: [
      {
        src: `${base}/icon-192.png`,
        sizes: '192x192',
        type: iconType,
        purpose: 'any',
      },
      {
        src: `${base}/icon-512.png`,
        sizes: '512x512',
        type: iconType,
        purpose: 'any',
      },
      {
        src: `${base}/icon-512.png`,
        sizes: '512x512',
        type: iconType,
        purpose: 'maskable',
      },
    ],
  };
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim();
  if (!slug) {
    res.status(400).json({ error: 'Missing slug' });
    return;
  }

  const origin = getRequestOrigin(req);
  if (!origin) {
    res.status(503).json({ error: 'Site origin is not configured' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ error: 'Database is not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: app, error } = await supabase
    .from('mobile_gallery_apps')
    .select('name, slug, icon_url, cover_image_url, photographer_id, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[mg-manifest]', error.message);
    res.status(500).json({ error: 'Failed to load gallery' });
    return;
  }

  if (!app) {
    res.status(404).json({ error: 'Gallery not found' });
    return;
  }

  const { data: photographer } = await supabase
    .from('photographers')
    .select('business_name, display_name, first_name, last_name')
    .eq('id', app.photographer_id)
    .maybeSingle();

  const photographerName =
    photographer?.business_name?.trim() ||
    [photographer?.first_name, photographer?.last_name].filter(Boolean).join(' ').trim() ||
    photographer?.display_name?.trim() ||
    null;

  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(buildManifest(app, photographerName, origin));
}
