import { describe, expect, test } from 'vitest';
import { createOriginalSlotLedger } from './originalUploadSlots';

describe('createOriginalSlotLedger', () => {
  test('acquire holds a slot until the original PUT finishes', () => {
    const slots = createOriginalSlotLedger();
    slots.acquire('a');
    slots.acquire('b');
    expect(slots.held).toBe(2);
    expect(slots.release('a')).toBe(true);
    expect(slots.held).toBe(1);
  });

  test('releasing an original does not wait for web/thumb — the next file can start', () => {
    const slots = createOriginalSlotLedger();
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) slots.acquire(id);
    expect(slots.held).toBe(8);
    slots.release('a');
    slots.acquire('i');
    expect(slots.held).toBe(8);
    expect(slots.has('a')).toBe(false);
    expect(slots.has('i')).toBe(true);
  });

  test('double-release of the same job is a no-op', () => {
    const slots = createOriginalSlotLedger();
    slots.acquire('a');
    expect(slots.release('a')).toBe(true);
    expect(slots.release('a')).toBe(false);
    expect(slots.held).toBe(0);
  });
});
