import { supabase } from '@/lib/supabase/client';

function functionsBaseUrl() {
  return `${supabase.supabaseUrl}/functions/v1`;
}

export async function createGalleryDownloadJob({
  collectionId,
  visitorEmail,
  photoIds,
  resolution = 'full',
  scope = {},
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : '',
}) {
  const response = await fetch(`${functionsBaseUrl()}/create-gallery-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabase.supabaseKey}`,
    },
    body: JSON.stringify({
      collectionId,
      visitorEmail,
      photoIds,
      resolution,
      scope,
      siteOrigin,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Could not start download');
  }
  return payload;
}

export async function fetchGalleryDownloadJob(token) {
  const response = await fetch(
    `${functionsBaseUrl()}/get-gallery-download?token=${encodeURIComponent(token)}`,
    {
      headers: {
        Authorization: `Bearer ${supabase.supabaseKey}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.error || 'Could not load download');
    err.expired = payload.expired;
    err.status = response.status;
    throw err;
  }
  return payload;
}

export function getGalleryDownloadFileUrl(token) {
  return `${functionsBaseUrl()}/get-gallery-download?token=${encodeURIComponent(token)}&download=1`;
}

export async function pollGalleryDownloadJob(token, { intervalMs = 2500, timeoutMs = 120000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await fetchGalleryDownloadJob(token);
    if (job.status === 'ready' || job.status === 'failed' || job.status === 'expired') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return fetchGalleryDownloadJob(token);
}
