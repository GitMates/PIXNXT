/**
 * Dev-middleware handler: proxy to the Cloudflare backend.
 * Canonical: POST /v1/proofer/studio/albums/repair-preview
 * (backend/src/routes/proofer.ts — ports the legacy repair logic).
 */

function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

export async function handleRepairAlbumPreviewRequest(req, body = {}) {
  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const res = await fetch(`${base}/v1/proofer/studio/albums/repair-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || payload?.error || `Repair failed (${res.status})`;
    const err = new Error(typeof message === 'string' ? message : 'Repair failed');
    err.status = res.status;
    throw err;
  }
  return payload;
}
