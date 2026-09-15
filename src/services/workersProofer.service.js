/**
 * Album proofer backend (Cloudflare /v1/proofer + /v1/emails).
 * Mirrors albumProof / smartAlbums / smartAlbumComments / settings surfaces.
 */
import { apiFetch } from '../lib/api/client';

// ---------- albums ----------

export async function listAlbums() {
  const data = await apiFetch('/v1/proofer/studio/albums');
  return data?.albums || [];
}

export async function getAlbumFull(albumId) {
  const data = await apiFetch(`/v1/proofer/studio/albums/${albumId}`).catch(() => null);
  return data?.album ?? null;
}

export async function createAlbumSimple(input) {
  const data = await apiFetch('/v1/proofer/studio/albums', { method: 'POST', body: input });
  return data?.album;
}

export async function patchAlbum(albumId, patch) {
  const data = await apiFetch(`/v1/proofer/studio/albums/${albumId}`, { method: 'PATCH', body: patch });
  return data?.album;
}

export async function deleteAlbumRemote(albumId) {
  await apiFetch(`/v1/proofer/studio/albums/${albumId}`, { method: 'DELETE' });
}

export async function duplicateAlbumRemote(albumId, name) {
  const data = await apiFetch(`/v1/proofer/studio/albums/${albumId}/duplicate`, {
    method: 'POST',
    body: name ? { name } : {},
  });
  return data?.album;
}

// ---------- comments ----------

export async function listComments(albumId, spreadIndex = null) {
  const q = spreadIndex == null ? '' : `?spreadIndex=${encodeURIComponent(spreadIndex)}`;
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/comments${q}`);
  return data?.comments || [];
}

export async function saveComment(input) {
  const data = await apiFetch(`/v1/proofer/albums/${input.albumId}/comments`, { method: 'POST', body: input });
  return data?.comment;
}

export async function patchComment(albumId, commentId, patch) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/comments/${commentId}`, { method: 'PATCH', body: patch });
  return data?.comment;
}

export async function removeComment(albumId, commentId) {
  await apiFetch(`/v1/proofer/albums/${albumId}/comments/${commentId}`, { method: 'DELETE' });
}

export async function consolidateComments(albumId, { spreadIndex, authorName, keepCommentId }) {
  await apiFetch(`/v1/proofer/albums/${albumId}/comments/consolidate`, {
    method: 'POST',
    body: { spreadIndex, authorName: authorName ?? null, keepCommentId },
  });
}

export async function purgeSpreadComments(albumId, spreadIndex) {
  await apiFetch(`/v1/proofer/albums/${albumId}/comments/purge-spread`, {
    method: 'POST',
    body: { spreadIndex },
  });
}

// ---------- pins / swaps / replies ----------

export async function listPins(albumId) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/pins`);
  return data?.pins || [];
}

export async function savePin(albumId, input) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/pins`, { method: 'POST', body: input });
  return data?.pin;
}

export async function removePin(albumId, pinId) {
  await apiFetch(`/v1/proofer/albums/${albumId}/pins/${pinId}`, { method: 'DELETE' });
}

export async function listSwaps(albumId) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/swaps`);
  return data?.swaps || [];
}

export async function saveSwap(albumId, input) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/swaps`, { method: 'POST', body: input });
  return data?.swap;
}

export async function removeSwap(albumId, swapId) {
  await apiFetch(`/v1/proofer/albums/${albumId}/swaps/${swapId}`, { method: 'DELETE' });
}

export async function listReplies(albumId, parentKey = null) {
  const q = parentKey == null ? '' : `?parentKey=${encodeURIComponent(parentKey)}`;
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/replies${q}`);
  return data?.replies || [];
}

export async function saveReply(albumId, input) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/replies`, { method: 'POST', body: input });
  return data?.reply;
}

export async function removeReply(albumId, replyId) {
  await apiFetch(`/v1/proofer/albums/${albumId}/replies/${replyId}`, { method: 'DELETE' });
}

export async function feedbackBundle(albumId) {
  const data = await apiFetch(`/v1/proofer/albums/${albumId}/feedback`);
  return {
    comments: data?.comments || [],
    pins: data?.pins || [],
    swaps: data?.swaps || [],
    replies: data?.replies || [],
  };
}

// ---------- seen ----------

export async function upsertSeen(albumId, viewerRole, viewerKey, items) {
  await apiFetch(`/v1/proofer/albums/${albumId}/seen`, {
    method: 'POST',
    body: { viewerRole, viewerKey: viewerKey ?? 'default', items },
  });
  return { ok: true, error: null };
}

export async function loadSeenMap(albumId, viewerRole, viewerKey = 'default') {
  const data = await apiFetch(
    `/v1/proofer/albums/${albumId}/seen?role=${encodeURIComponent(viewerRole)}&key=${encodeURIComponent(viewerKey || 'default')}`,
  ).catch(() => null);
  const map = {};
  for (const row of data?.seen || []) {
    if (!map[row.item_kind]) map[row.item_kind] = {};
    map[row.item_kind][row.item_id] = row.seen_at;
  }
  return map;
}

// ---------- public / track ----------

export async function getAlbumPublic(key) {
  const data = await apiFetch(`/v1/proofer/public/${encodeURIComponent(key)}`, { auth: false }).catch(() => null);
  return data?.album ?? null;
}

export async function trackActivity({ albumId, action = 'activity', guestName = null, guestEmail = null } = {}) {
  if (!albumId) return null;
  try {
    return await apiFetch(`/v1/proofer/albums/${albumId}/track`, {
      method: 'POST',
      auth: false,
      body: { action, guestName, guestEmail },
    });
  } catch (err) {
    console.warn('trackAlbumProofActivity failed:', err?.message || err);
    return null;
  }
}

// ---------- notifications (via /v1/emails) ----------

async function postEmail(path, body, { auth = false } = {}) {
  const data = await apiFetch(path, { method: 'POST', auth, body });
  if (data?.error) throw new Error(data.error);
  return data;
}

export const notify = {
  approved: (p) => postEmail('/v1/emails/album-proof', { albumId: p.albumId, action: 'approve', guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }),
  changes: (p) => postEmail('/v1/emails/album-proof', { albumId: p.albumId, action: 'submit_changes', guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }),
  startedCommenting: (p) => postEmail('/v1/emails/album-proof', { albumId: p.albumId, action: 'client_started_commenting', guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }),
  instantFeedback: (p) => postEmail('/v1/emails/album-comments', { albumId: p.albumId, guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }),
  // Studio-sent: /v1/emails/smart-album-client is owner-scoped, so it needs the Bearer token.
  revisionReady: (p) => postEmail('/v1/emails/smart-album-client', { albumId: p.albumId, template: 'revision_ready', guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }, { auth: true }),
  reminder: (p) => postEmail('/v1/emails/smart-album-client', { albumId: p.albumId, template: 'reminder', guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }, { auth: true }),
  comments: (p) => postEmail('/v1/emails/album-comments', { albumId: p.albumId, guestName: p.guestName ?? null, guestEmail: p.guestEmail ?? null }),
};

// ---------- settings ----------

export async function getProoferSettings() {
  const data = await apiFetch('/v1/proofer/studio/settings');
  return data?.settings ?? null;
}

export async function putProoferSettings(settings) {
  await apiFetch('/v1/proofer/studio/settings', { method: 'PUT', body: { settings } });
  return { ok: true };
}
