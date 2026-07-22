/**
 * Proxies R2 public bucket reads through same origin so gallery ZIP / Drive uploads
 * are not blocked by CORS. Requires VITE_R2_PUBLIC_URL on Vercel.
 */
export default async function handler(req, res) {
  const base = process.env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (!base) {
    res.status(500).json({ error: 'VITE_R2_PUBLIC_URL is not configured' });
    return;
  }

  const pathParam = req.query.path;
  const subPath = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam || '');
  if (!subPath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  const query = new URL(req.url || '', 'http://localhost').search;
  const target = `${base}/${decodeURIComponent(subPath)}${query}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: '*/*' },
    });

    if (!upstream.ok) {
      res.status(upstream.status).send(upstream.statusText || 'Upstream error');
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[r2-media proxy]', target, err);
    res.status(502).json({ error: 'Failed to fetch from storage' });
  }
}
