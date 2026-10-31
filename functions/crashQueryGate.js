/** True when the request carries a non-empty Bearer token. */
export function hasBearerToken(headers) {
  const raw = String(headers?.get?.("Authorization") || headers?.authorization || "").trim();
  const m = /^Bearer\s+(\S+)/i.exec(raw);
  return Boolean(m && m[1]);
}

/**
 * Map the admin API check onto an HTTP status for /api/crash-query.
 * 0 means "inject the crash-worker token and continue".
 * Any non-200 admin result fails closed so ADMIN_TOKEN is never attached.
 */
export function crashQueryGateStatus({ hasBearer, adminStatus }) {
  if (!hasBearer) return 401;
  if (adminStatus === 200) return 0;
  if (adminStatus === 401) return 401;
  if (adminStatus === 403) return 403;
  return 503;
}

export function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
