/** Photo-level upload slots. AIMD finds ~3–4 on a thin link and ~8–12 on fibre. */
export const ADAPTIVE_START = 4;
export const ADAPTIVE_FLOOR = 2;
export const ADAPTIVE_CEILING = 12;
export const ADAPTIVE_WINDOW_MS = 5000;
const RISE_RATIO = 0.1;

const IGNORE_FAILURES = new Set(['rate-limit', 'auth', 'cancel']);

export function uploadFailureKind(err) {
  if (!err) return 'network';
  const msg = String(err.message || '');
  if (err instanceof Error && /Upload cancelled/i.test(err.message)) return 'cancel';
  if (err.code === 'RATE_LIMITED' || err.status === 429 || /rate exceeded|too many requests/i.test(msg)) {
    return 'rate-limit';
  }
  if (err.status === 401 || /session expired|sign in again|authentication required|unauthorized/i.test(msg)) {
    return 'auth';
  }
  if (/timeout|timed out/i.test(msg)) return 'timeout';
  return 'network';
}

function clampLimit(n, floor, ceiling) {
  return Math.min(ceiling, Math.max(floor, n));
}

export function createAdaptiveConcurrency({
  now = () => Date.now(),
  start = ADAPTIVE_START,
  floor = ADAPTIVE_FLOOR,
  ceiling = ADAPTIVE_CEILING,
  windowMs = ADAPTIVE_WINDOW_MS,
} = {}) {
  let limit = clampLimit(start, floor, ceiling);
  let windowStart = now();
  let lastConfirmed = 0;
  let windowBytes = 0;
  let prevThroughput = null;

  function halve() {
    limit = clampLimit(Math.floor(limit / 2), floor, ceiling);
    return limit;
  }

  return {
    get limit() {
      return limit;
    },
    observe(confirmedTotal) {
      const t = now();
      const gained = Math.max(0, confirmedTotal - lastConfirmed);
      lastConfirmed = Math.max(lastConfirmed, confirmedTotal);
      windowBytes += gained;
      const elapsed = t - windowStart;
      if (elapsed < windowMs) return limit;

      const throughput = windowBytes / (elapsed / 1000);
      if (prevThroughput != null) {
        if (throughput > prevThroughput * (1 + RISE_RATIO)) {
          limit = clampLimit(limit + 1, floor, ceiling);
        } else if (throughput < prevThroughput) {
          halve();
        }
      }
      prevThroughput = throughput;
      windowStart = t;
      windowBytes = 0;
      return limit;
    },
    noteFailure(kind) {
      if (IGNORE_FAILURES.has(kind)) return limit;
      return halve();
    },
    reset() {
      limit = clampLimit(start, floor, ceiling);
      windowStart = now();
      lastConfirmed = 0;
      windowBytes = 0;
      prevThroughput = null;
      return limit;
    },
  };
}
