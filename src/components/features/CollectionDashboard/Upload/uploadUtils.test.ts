import { describe, expect, test } from 'vitest';
import {
  chunkArray,
  confirmedBytesFromCheckpoint,
  confirmedBytesForFile,
  connectionHealthForSpeed,
  createConfirmedSpeedTracker,
  createProgressThrottle,
  filterFilesByTab,
  formatUploadBytePair,
  formatUploadEta,
  formatUploadMb,
  formatUploadSpeed,
  getTotalConfirmedBytes,
  selectRenderedRows,
  uploadOverallPercent,
  uploadTabCounts,
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

const MB = 1024 * 1024;

describe('formatUploadMb', () => {
  test('uses one decimal MB below 1000 MB and never shows 1084.0 MB', () => {
    expect(formatUploadMb(12.9 * MB)).toBe('12.9 MB');
    expect(formatUploadMb(1084 * MB)).toBe('1.08 GB');
  });

  test('uses two decimal GB at and above 1000 MB', () => {
    expect(formatUploadMb(1000 * MB)).toBe('1.00 GB');
    expect(formatUploadMb(1338.2 * MB)).toBe('1.34 GB');
  });
});

describe('formatUploadBytePair', () => {
  test('keeps both sides in GB when the total is 1000 MB or more', () => {
    expect(formatUploadBytePair(1084 * MB, 1338.2 * MB)).toBe('1.08 of 1.34 GB');
  });

  test('keeps both sides in MB when the total is under 1000 MB', () => {
    expect(formatUploadBytePair(2.5 * MB, 8 * MB)).toBe('2.5 of 8.0 MB');
  });
});

describe('formatUploadSpeed', () => {
  test('shows one decimal MB/s', () => {
    expect(formatUploadSpeed(0.8 * MB)).toBe('0.8 MB/s');
    expect(formatUploadSpeed(1.4 * MB)).toBe('1.4 MB/s');
  });
});

describe('formatUploadEta', () => {
  test('hides the estimate for the first 10 seconds', () => {
    expect(formatUploadEta(100 * MB, 0.8 * MB, 9)).toBe('Working out time left…');
  });

  test('rounds under a minute, minutes, then hours and minutes', () => {
    expect(formatUploadEta(20 * MB, 1 * MB, 10)).toBe('less than a minute left');
    expect(formatUploadEta(180 * MB, 1 * MB, 10)).toBe('about 3 min left');
    expect(formatUploadEta(90 * 60 * MB, 1 * MB, 10)).toBe('about 1 h 30 min left');
  });
});

describe('connectionHealthForSpeed', () => {
  test('uses absolute MB/s bands and a word at every level', () => {
    expect(connectionHealthForSpeed(0, { stalledForSeconds: 10 }).word).toBe('Stalled');
    expect(connectionHealthForSpeed(0.18 * MB).word).toBe('Slow');
    expect(connectionHealthForSpeed(0.8 * MB).word).toBe('Fair');
    expect(connectionHealthForSpeed(1.6 * MB).word).toBe('Good');
    expect(connectionHealthForSpeed(4.2 * MB).word).toBe('Fast');
  });

  test('does not call near-zero speed Stalled until 10 quiet seconds', () => {
    expect(connectionHealthForSpeed(0, { stalledForSeconds: 3 }).word).toBe('Slow');
  });
});

describe('confirmed bytes', () => {
  test('completed files count as their full size even without confirmedBytes', () => {
    const file = { ...mkFile('a', 'completed'), size: 10 * MB, confirmedBytes: 0 };
    expect(confirmedBytesForFile(file)).toBe(10 * MB);
  });

  test('in-flight files only count confirmedBytes, not xhr progress', () => {
    const file = { ...mkFile('a', 'uploading'), size: 10 * MB, progress: 90, confirmedBytes: 2 * MB };
    expect(confirmedBytesForFile(file)).toBe(2 * MB);
  });

  test('overall percent uses confirmed bytes so a retry cannot move the bar backwards', () => {
    const files = [
      { ...mkFile('a', 'completed'), size: 10 * MB, progress: 100, confirmedBytes: 10 * MB },
      { ...mkFile('b', 'uploading'), size: 10 * MB, progress: 5, confirmedBytes: 4 * MB },
    ];
    expect(uploadOverallPercent(files)).toBe(70);
    const retried = files.map((f) => (f.id === 'b' ? { ...f, progress: 0 } : f));
    expect(uploadOverallPercent(retried)).toBe(70);
  });

  test('sums confirmed bytes across the batch', () => {
    const files = [
      { ...mkFile('a', 'completed'), size: 8 * MB, confirmedBytes: 8 * MB },
      { ...mkFile('b', 'uploading'), size: 8 * MB, progress: 50, confirmedBytes: 2 * MB },
    ];
    expect(getTotalConfirmedBytes(files)).toBe(10 * MB);
  });

  test('counts finished multipart parts from a checkpoint', () => {
    const partSize = 8 * MB;
    const checkpoint = {
      partSize,
      etags: [
        { partNumber: 1, etag: 'a' },
        null,
        { partNumber: 3, etag: 'c' },
      ],
    };
    expect(confirmedBytesFromCheckpoint(checkpoint, 20 * MB)).toBe(12 * MB);
  });
});

describe('createConfirmedSpeedTracker', () => {
  test('speed is the average of confirmed deltas over the last 10 seconds', () => {
    const tracker = createConfirmedSpeedTracker();
    let confirmed = 0;
    let sample = { bytesPerSec: 0 };
    for (let i = 0; i < 10; i += 1) {
      confirmed += 0.8 * MB;
      sample = tracker.tick(confirmed);
    }
    expect(sample.bytesPerSec).toBeCloseTo(0.8 * MB, 0);
  });

  test('never treats a drop in the confirmed total as negative speed', () => {
    const tracker = createConfirmedSpeedTracker();
    tracker.tick(8 * MB);
    const sample = tracker.tick(3 * MB);
    expect(sample.bytesPerSec).toBeGreaterThanOrEqual(0);
  });

  test('flags a slow line after 10 seconds below 30% of the prior 60 s average', () => {
    const tracker = createConfirmedSpeedTracker();
    let confirmed = 0;
    for (let i = 0; i < 20; i += 1) {
      confirmed += 1 * MB;
      tracker.tick(confirmed);
    }
    expect(tracker.tick(confirmed).slow).toBe(false);
    let sample = { slow: false };
    for (let i = 0; i < 10; i += 1) {
      confirmed += 0.1 * MB;
      sample = tracker.tick(confirmed);
    }
    expect(sample.slow).toBe(true);
  });
});

describe('upload tabs', () => {
  test('splits in-flight files from waiting files', () => {
    const files = [
      mkFile('u', 'uploading'),
      mkFile('p', 'processing'),
      mkFile('w', 'waiting'),
      mkFile('d', 'completed'),
      mkFile('e', 'error'),
    ];
    expect(uploadTabCounts(files)).toEqual({
      uploading: 2,
      waiting: 1,
      complete: 1,
      failed: 1,
    });
    expect(filterFilesByTab(files, 'uploading').map((f) => f.id)).toEqual(['u', 'p']);
    expect(filterFilesByTab(files, 'waiting').map((f) => f.id)).toEqual(['w']);
  });
});
