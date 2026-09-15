/**
 * Same-origin R2 upload proxy — used when the browser origin is a photographer custom
 * domain (not on the bucket CORS allowlist). PUT /api/r2-upload?path=album-proofer/...
 * Proxies to the Cloudflare Workers backend (PUT /v1/r2/upload?path=..., authed).
 */

function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

function mediaBaseUrl() {
  const publicUrl = String(
    process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || ''
  ).replace(/\/+$/, '');
  if (publicUrl) return publicUrl;
  const base = apiBase();
  return base ? `${base}/v1/r2/media` : '';
}

function readRequestBody(req, maxBytes = 80 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Upload too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function normalizeUploadPath(raw) {
  let decoded = String(raw || '').trim();
  if (!decoded) return '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep raw */
  }
  decoded = decoded.replace(/^\/+/, '');
  if (!decoded || decoded.includes('..')) return '';
  return decoded;
}

export async function handleR2Upload(req, res) {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (method !== 'PUT' && method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const incoming = new URL(req.url || '', 'http://localhost');
  const objectPath = normalizeUploadPath(incoming.searchParams.get('path'));
  if (!objectPath) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing or invalid path' }));
    return;
  }

  try {
    const body = await readRequestBody(req);
    if (!body.length) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Empty upload body' }));
      return;
    }

    const base = apiBase();
    if (!base) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'VITE_API_URL is not configured' }));
      return;
    }

    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    if (!authHeader) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const contentType = String(req.headers['content-type'] || 'application/octet-stream');
    const upstream = await fetch(`${base}/v1/r2/upload?path=${encodeURIComponent(objectPath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, Authorization: authHeader },
      body,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: payload?.error?.message || 'Upload failed' }));
      return;
    }

    const key = payload?.path || objectPath;
    const publicBase = mediaBaseUrl();
    const result = { path: key, url: publicBase ? `${publicBase}/${key}` : key };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[r2-upload]', objectPath, err);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err?.message || 'Upload failed' }));
  }
}
