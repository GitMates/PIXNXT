import { createClient } from '@supabase/supabase-js';

function resolveIconUrl(app) {
  return app?.icon_url || app?.cover_image_url || null;
}

function getRequestOrigin(req) {
  const fromEnv = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host;
  if (host) return `${forwardedProto || 'https'}://${host}`;
  return '';
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim();
  if (!slug) {
    res.status(400).json({ error: 'Missing slug' });
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
    .select('icon_url, cover_image_url, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[mg-icon]', error.message);
    res.status(500).json({ error: 'Failed to load gallery icon' });
    return;
  }

  if (!app) {
    res.status(404).json({ error: 'Gallery not found' });
    return;
  }

  const iconUrl = resolveIconUrl(app);
  if (!iconUrl) {
    const origin = getRequestOrigin(req);
    if (origin) {
      res.redirect(302, `${origin}/logo.png`);
      return;
    }
    res.status(404).json({ error: 'Gallery has no icon' });
    return;
  }

  try {
    const upstream = await fetch(iconUrl, { headers: { Accept: 'image/*' } });
    if (!upstream.ok) {
      res.status(upstream.status).send(upstream.statusText || 'Icon not found');
      return;
    }

    const upstreamType = upstream.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', upstreamType.includes('image/') ? upstreamType : 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[mg-icon] proxy failed', iconUrl, err);
    res.status(502).json({ error: 'Failed to load icon' });
  }
}
