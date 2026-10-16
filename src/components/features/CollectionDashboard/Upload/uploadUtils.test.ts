import { describe, expect, test } from 'vitest';
import {
  chunkArray,
  createProgressThrottle,
  selectRenderedRows,
} from './uploadUtils';
import type { UploadQueueFile } from './uploadTypes';

function mkFile(id: string, status: UploadQueueFile['status']): UploadQueueFile {
  return { id, file: new File([], id), name: id, size: 1, progress: 0, status };
}

describe('createProgressThrottle', () => {
  test('emits first value, suppresses same integer percent', () => {
    let now = 0;
    const out: number[] = [];
    const push = createProgressThrottle((p) => out.push(p), { minIntervalMs: 250, now: () => now });
    push(10); push(10.4); push(10);
    expect(out).toEqual([10]);
  });

  test('suppresses changes inside the interval, lets them through after', () => {
    let now = 0;
    const out: number[] = [];
    const push = createProgressThrottle((p) => out.push(p), { minIntervalMs: 250, now: () => now });
    push(10); now = 100; push(20); now = 300; push(30);
    expect(out).toEqual([10, 30]);
  });

  test('100 always emits immediately', () => {
    let now = 0;
    const out: number[] = [];
    const push = createProgressThrottle((p) => out.push(p), { minIntervalMs: 250, now: () => now });
    push(10); now = 10; push(100);
    expect(out).toEqual([10, 100]);
  });

  test('clamps to 0..100', () => {
    const out: number[] = [];
    const push = createProgressThrottle((p) => out.push(p));
    push(-5); push(140);
    expect(out).toEqual([0, 100]);
  });
});

describe('selectRenderedRows', () => {
  test('returns all rows when under the cap', () => {
    const files = [mkFile('a', 'waiting'), mkFile('b', 'uploading')];
    expect(selectRenderedRows(files, 60)).toEqual({ rows: files, hidden: 0 });
  });

  test('prefers active rows, then waiting, and reports hidden count', () => {
    const files = [
      mkFile('w1', 'waiting'), mkFile('w2', 'waiting'), mkFile('u1', 'uploading'),
      mkFile('p1', 'processing'), mkFile('w3', 'waiting'),
    ];
    const { rows, hidden } = selectRenderedRows(files, 3);
    expect(rows.map((r) => r.id)).toEqual(['u1', 'p1', 'w1']);
    expect(hidden).toBe(2);
  });
});

describe('chunkArray', () => {
  test('splits evenly and keeps remainder', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 2)).toEqual([]);
  });
});
