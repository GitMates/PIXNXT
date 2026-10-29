import { describe, expect, test } from 'vitest';
import { createAdaptiveConcurrency, uploadFailureKind } from './adaptiveUploadConcurrency';

const MB = 1024 * 1024;

describe('createAdaptiveConcurrency', () => {
  test('starts at 8 parallel original slots', () => {
    const c = createAdaptiveConcurrency({ now: () => 0 });
    expect(c.limit).toBe(8);
  });

  test('does not change the limit after the first 5 s window', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t });
    c.observe(5 * MB);
    t = 5000;
    c.observe(10 * MB);
    expect(c.limit).toBe(8);
  });

  test('adds 1 slot when the next 5 s window is more than 10% faster', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t });
    c.observe(0);
    t = 5000;
    c.observe(5 * MB);
    t = 10000;
    c.observe(11 * MB);
    expect(c.limit).toBe(9);
  });

  test('drops one slot when original throughput falls, and never goes below 6', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t, start: 8 });
    c.observe(0, { originalsInFlight: true });
    t = 5000;
    c.observe(10 * MB, { originalsInFlight: true });
    t = 10000;
    c.observe(11 * MB, { originalsInFlight: true });
    expect(c.limit).toBe(7);
    t = 15000;
    c.observe(11 * MB, { originalsInFlight: true });
    expect(c.limit).toBe(6);
    t = 20000;
    c.observe(11 * MB, { originalsInFlight: true });
    expect(c.limit).toBe(6);
  });

  test('does not cut slots during a preview-only window with no originals in flight', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t, start: 8 });
    c.observe(0, { originalsInFlight: true });
    t = 5000;
    c.observe(10 * MB, { originalsInFlight: true });
    t = 10000;
    c.observe(10 * MB, { originalsInFlight: false });
    expect(c.limit).toBe(8);
  });

  test('never raises above 16', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t, start: 15 });
    c.observe(0);
    t = 5000;
    c.observe(5 * MB);
    t = 10000;
    c.observe(11 * MB);
    expect(c.limit).toBe(16);
    t = 15000;
    c.observe(20 * MB);
    expect(c.limit).toBe(16);
  });

  test('a network error or timeout drops toward the floor but not below 6', () => {
    const c = createAdaptiveConcurrency({ now: () => 0, start: 12 });
    expect(c.noteFailure('network')).toBe(6);
    expect(c.noteFailure('timeout')).toBe(6);
  });

  test('rate limits, auth failures, and cancels do not change the limit', () => {
    const c = createAdaptiveConcurrency({ now: () => 0, start: 8 });
    expect(c.noteFailure('rate-limit')).toBe(8);
    expect(c.noteFailure('auth')).toBe(8);
    expect(c.noteFailure('cancel')).toBe(8);
  });

  test('sums confirmed bytes across ticks inside the same 5 s window', () => {
    let t = 0;
    const c = createAdaptiveConcurrency({ now: () => t });
    c.observe(0);
    t = 2000;
    c.observe(4 * MB);
    t = 4000;
    c.observe(8 * MB);
    t = 5000;
    c.observe(10 * MB);
    t = 7000;
    c.observe(14 * MB);
    t = 9000;
    c.observe(18 * MB);
    t = 10000;
    c.observe(20.4 * MB);
    expect(c.limit).toBe(8);
  });
});

describe('uploadFailureKind', () => {
  test('maps cancel, rate limit, and auth away from network backoff', () => {
    expect(uploadFailureKind(new Error('Upload cancelled.'))).toBe('cancel');
    expect(uploadFailureKind({ status: 429, code: 'RATE_LIMITED' })).toBe('rate-limit');
    expect(uploadFailureKind({ status: 401, message: 'Sign in again' })).toBe('auth');
  });

  test('treats timeouts and other throws as congestion', () => {
    expect(uploadFailureKind(new Error('Upload timed out'))).toBe('timeout');
    expect(uploadFailureKind(new Error('Network error uploading to storage.'))).toBe('network');
  });
});
