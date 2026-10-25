import { describe, expect, it } from 'vitest';
import { GIB, MIN_STORAGE_LIMIT_BYTES, resolveStorageLimitBytes } from '../lib/storageLimits';
import { getStorageLimitBytes } from './userStorage.service';

describe('resolveStorageLimitBytes', () => {
  it('raises a stored 5 GiB cap to the 10 GiB floor', () => {
    expect(resolveStorageLimitBytes({ storage_limit_bytes: 5 * GIB })).toBe(MIN_STORAGE_LIMIT_BYTES);
  });

  it('leaves a custom cap above 10 GiB unchanged', () => {
    expect(resolveStorageLimitBytes({ storage_limit_bytes: 50 * GIB })).toBe(50 * GIB);
  });

  it('uses 10 GiB for free / missing plans with no stored cap', () => {
    expect(resolveStorageLimitBytes({ plan: 'free' })).toBe(MIN_STORAGE_LIMIT_BYTES);
    expect(resolveStorageLimitBytes({})).toBe(MIN_STORAGE_LIMIT_BYTES);
  });

  it('keeps pro / premium plan fallbacks above the floor', () => {
    expect(resolveStorageLimitBytes({ plan: 'pro' })).toBe(100 * GIB);
    expect(resolveStorageLimitBytes({ plan: 'premium' })).toBe(500 * GIB);
  });

  it('is what the sidebar meter uses', () => {
    expect(getStorageLimitBytes({ storage_limit_bytes: 5 * GIB })).toBe(MIN_STORAGE_LIMIT_BYTES);
  });
});
