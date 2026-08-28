/**
 * Shared R2 media proxy — used by /api/r2-media and /api/r2-media/[...path].
 */
export async function handleR2MediaProxy(req, res) {
  const base = process.env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (!base) {
    res.status(500).json({ error: 'VITE_R2_PUBLIC_URL is not configured' });
    return;
  }

  let subPath = '';
  if (typeof req.query?.path === 'string' && req.query.path) {
    subPath = req.query.path;
  } else if (Array.isArray(req.query?.path) && req.query.path.length) {
    subPath = req.query.path.filter(Boolean).join('/');
  }

  if (!subPath) {
    try {
      const pathname = new URL(req.url || '', 'http://localhost').pathname;
      const prefix = '/api/r2-media/';
      const idx = pathname.indexOf(prefix);
      if (idx !== -1) {
        subPath = decodeURIComponent(pathname.slice(idx + prefix.length)).replace(/^\/+/, '');
      }
    } catch {
      // ignore
    }
  }

  if (!subPath) {
    res.status(400).json({ error: 'Missing path' });
    return;
  }

  const incoming = new URL(req.url || '', 'http://localhost');
  const forward = new URLSearchParams(incoming.search);
  forward.delete('path');
  forward.delete('filename');
  const query = forward.toString() ? `?${forward.toString()}` : '';

  let decoded = subPath;
  try {
    decoded = decodeURIComponent(subPath);
  } catch {
    decoded = subPath;
  }
  const target = `${base}/${decoded.replace(/^\//, '')}${query}`;

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
    res.setHeader('Access-Control-Allow-Origin', '*');

    const isDownload =
      req.query.download === 'true' || req.query.download === '1' || req.query.dl === '1';
    if (isDownload) {
      const filename = req.query.filename || decoded.split('/').pop() || 'download.jpg';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[r2-media proxy]', target, err);
    res.status(502).json({ error: 'Failed to fetch from storage' });
  }
}
