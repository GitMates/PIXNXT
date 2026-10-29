import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  uploadErrorFromXhr,
  isRateLimitedError,
  __directUploadGate,
  __existsManyWith,
  DIRECT_PART_PARALLEL,
  resolveUploadStrategy,
  allowWorkerProxyFallback,
  retryDelayMs,
} from './storage.service';

function fakeXhr({ status, body, retryAfter }) {
  return {
    status,
    responseText: body ?? '',
    getResponseHeader: (name) => (name.toLowerCase() === 'retry-after' ? retryAfter ?? null : null),
  };
}

describe('uploadErrorFromXhr', () => {
  test('parses Workers API error code and message', () => {
    const err = uploadErrorFromXhr(fakeXhr({ status: 429, body: JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Upload rate exceeded' } }), retryAfter: '120' }));
    expect(err.message).toBe('Upload rate exceeded');
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryAfterMs).toBe(120000);
  });

  test('falls back to generic message when body is not JSON', () => {
    const err = uploadErrorFromXhr(fakeXhr({ status: 502, body: '<html>' }));
    expect(err.message).toBe('Upload rejected (502).');
    expect(err.status).toBe(502);
    expect(err.code).toBeUndefined();
    expect(err.retryAfterMs).toBeUndefined();
  });
});

describe('isRateLimitedError', () => {
  test('matches by code, by status, or by message', () => {
    expect(isRateLimitedError({ code: 'RATE_LIMITED' })).toBe(true);
    expect(isRateLimitedError({ status: 429 })).toBe(true);
    expect(isRateLimitedError(new Error('Upload rate exceeded'))).toBe(true);
    expect(isRateLimitedError(new Error('Network error'))).toBe(false);
    expect(isRateLimitedError(null)).toBe(false);
  });
});

describe('resolveUploadStrategy', () => {
  test('uses a Worker-signed direct plan when the server offers one', () => {
    expect(
      resolveUploadStrategy({
        fileSize: 400_000,
        directAvailable: true,
        plan: { enabled: true, mode: 'put', url: 'https://r2.example/obj' },
        clientDirectAvailable: false,
      })
    ).toEqual({
      type: 'direct',
      plan: { enabled: true, mode: 'put', url: 'https://r2.example/obj' },
    });
  });

  test('never uses browser R2 credentials even if they are present', () => {
    expect(
      resolveUploadStrategy({
        fileSize: 400_000,
        directAvailable: true,
        plan: null,
        clientDirectAvailable: true,
      })
    ).toEqual({ type: 'worker-put' });
  });

  test('does not choose the Worker single-PUT proxy when a direct path exists', () => {
    const chosen = resolveUploadStrategy({
      fileSize: 400_000,
      directAvailable: true,
      plan: { enabled: true, mode: 'put', url: 'https://r2.example/obj' },
      clientDirectAvailable: true,
    });
    expect(chosen.type).not.toBe('worker-put');
    expect(chosen.type).not.toBe('worker-parts');
  });
});

describe('allowWorkerProxyFallback', () => {
  test('never falls back after a direct plan was issued', () => {
    expect(allowWorkerProxyFallback(true)).toBe(false);
  });

  test('allows proxy only when no direct plan existed', () => {
    expect(allowWorkerProxyFallback(false)).toBe(true);
  });
});

describe('retryDelayMs', () => {
  test('uses 1s, 2s, 4s bases with jitter from half to 1.5x', () => {
    expect(retryDelayMs(0, { random: () => 0 })).toBe(500);
    expect(retryDelayMs(0, { random: () => 1 })).toBe(1500);
    expect(retryDelayMs(1, { random: () => 0.5 })).toBe(2000);
    expect(retryDelayMs(2, { random: () => 0.5 })).toBe(4000);
  });

  test('caps the base at 4s so later video part attempts do not wait longer', () => {
    expect(retryDelayMs(4, { random: () => 0.5 })).toBe(4000);
  });
});

describe('direct part parallelism', () => {
  test('keeps part PUTs small so photo-level slots can own the link', () => {
    expect(DIRECT_PART_PARALLEL).toBe(3);
  });
});

describe('R2 CORS policy', () => {
  test('allows browser PUT/POST so direct uploads are not blocked', () => {
    const policyPath = join(dirname(fileURLToPath(import.meta.url)), '../../r2-cors-policy.example.json');
    const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
    const rule = policy.rules[0];
    expect(rule.allowed.methods).toEqual(expect.arrayContaining(['PUT', 'POST', 'GET', 'HEAD']));
    expect(rule.exposeHeaders).toEqual(expect.arrayContaining(['ETag']));
    expect(rule.allowed.origins).toEqual(expect.arrayContaining(['http://localhost:5173']));
  });
});

describe('direct upload gate', () => {
  test('transient failure pauses direct for the backoff window, then re-enables', () => {
    let now = 1_000_000;
    const gate = __directUploadGate({ now: () => now, backoffMs: 30_000 });
    expect(gate.available()).toBe(true);
    gate.noteTransientFailure();
    expect(gate.available()).toBe(false);
    now += 29_999;
    expect(gate.available()).toBe(false);
    now += 2;
    expect(gate.available()).toBe(true);
  });

  test('server says not configured → permanently off', () => {
    let now = 0;
    const gate = __directUploadGate({ now: () => now, backoffMs: 30_000 });
    gate.noteDisabledByServer();
    now += 10_000_000;
    expect(gate.available()).toBe(false);
  });
});

describe('existsMany', () => {
  test('chunks into 200s, limits concurrency, merges results, failure → missing', async () => {
    const calls = [];
    let inFlight = 0; let maxInFlight = 0;
    const fakeFetch = async (_path, { body }) => {
      inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
      calls.push(body.paths.length);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      if (body.paths[0] === 'p400') throw new Error('boom');
      return { exists: Object.fromEntries(body.paths.map((p) => [p, p !== 'p1'])) };
    };
    const paths = Array.from({ length: 450 }, (_, i) => `p${i}`);
    const result = await __existsManyWith(fakeFetch, paths, { chunkSize: 200, concurrency: 2 });
    expect(calls).toEqual([200, 200, 50]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(result.get('p0')).toBe(true);
    expect(result.get('p1')).toBe(false);
    expect(result.get('p400')).toBe(false); // failed chunk → treated as missing
    expect(result.size).toBe(450);
  });
});
