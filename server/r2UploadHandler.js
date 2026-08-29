/**
 * Same-origin R2 upload proxy — used when the browser origin is a photographer custom
 * domain (not on the bucket CORS allowlist). PUT /api/r2-upload?path=album-proofer/...
 */
import { uploadBytesToR2 } from './guestDelivery/r2Server.js';

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

    const contentType = String(req.headers['content-type'] || 'application/octet-stream');
    const result = await uploadBytesToR2(objectPath, body, contentType);

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
