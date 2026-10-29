import { describe, expect, test } from 'vitest';
import { crashQueryGateStatus, hasBearerToken } from './crashQueryGate.js';

describe('crashQueryGate', () => {
  test('rejects requests with no Authorization bearer', () => {
    expect(hasBearerToken(new Headers())).toBe(false);
    expect(hasBearerToken(new Headers({ Authorization: 'Bearer' }))).toBe(false);
    expect(crashQueryGateStatus({ hasBearer: false, adminStatus: 200 })).toBe(401);
  });

  test('accepts only a successful admin check', () => {
    expect(crashQueryGateStatus({ hasBearer: true, adminStatus: 200 })).toBe(0);
  });

  test('maps admin 401/403 and fails closed on anything else', () => {
    expect(crashQueryGateStatus({ hasBearer: true, adminStatus: 401 })).toBe(401);
    expect(crashQueryGateStatus({ hasBearer: true, adminStatus: 403 })).toBe(403);
    expect(crashQueryGateStatus({ hasBearer: true, adminStatus: 500 })).toBe(503);
    expect(crashQueryGateStatus({ hasBearer: true, adminStatus: 0 })).toBe(503);
  });
});
