import { describe, expect, test } from 'vitest';
import {
  uploadErrorFromXhr,
  isRateLimitedError,
  __directUploadGate,
  __existsManyWith,
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
