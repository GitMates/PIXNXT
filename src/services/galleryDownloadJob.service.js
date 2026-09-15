import { apiBase, apiFetch } from '@/lib/api/client';

export async function createGalleryDownloadJob({
  collectionId,
  visitorEmail,
  photoIds,
  resolution = 'full',
  scope = {},
}) {
  const data = await apiFetch('/v1/downloads', {
    method: 'POST',
    auth: false,
    body: { collectionId, visitorEmail, photoIds: photoIds ?? null, resolution, scope: scope ?? null },
  });
  return { jobId: data?.jobId, token: data?.token, status: data?.status || 'pending' };
}

export async function fetchGalleryDownloadJob(token) {
  try {
    const data = await apiFetch(`/v1/downloads/${encodeURIComponent(token)}`, { auth: false });
    return data;
  } catch (err) {
    const wrapped = new Error(err?.message || 'Could not load download');
    wrapped.expired = err?.code === 'EXPIRED' || err?.status === 410 || err?.statusCode === 410;
    wrapped.status = err?.status ?? err?.statusCode ?? null;
    throw wrapped;
  }
}

export function getGalleryDownloadFileUrl(token) {
  return `${apiBase()}/v1/downloads/${encodeURIComponent(token)}/file`;
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
