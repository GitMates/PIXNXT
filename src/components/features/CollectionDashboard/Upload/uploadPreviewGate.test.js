import { describe, expect, test } from 'vitest';
import { createPreviewGate } from './uploadPreviewGate';

describe('createPreviewGate', () => {
  test('lets two preview PUTs run and parks the rest until one finishes', async () => {
    const gate = createPreviewGate(2);
    const started = [];
    const finish = [];

    const job = async (id) => {
      await gate.acquire();
      started.push(id);
      await new Promise((resolve) => finish.push(resolve));
      gate.release();
    };

    const a = job('a');
    const b = job('b');
    const c = job('c');
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['a', 'b']);

    finish.shift()();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['a', 'b', 'c']);

    finish.shift()();
    finish.shift()();
    await Promise.all([a, b, c]);
  });

  test('abort while waiting does not take a slot', async () => {
    const gate = createPreviewGate(1);
    await gate.acquire();
    const controller = new AbortController();
    const waiting = gate.acquire(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toThrow(/cancelled/i);
    gate.release();
    await gate.acquire();
    expect(gate.active).toBe(1);
    gate.release();
  });
});
