import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  COVER_PALETTES,
  defaultCoverGradient,
  defaultCoverPaletteIndex,
} from './defaultCoverGradient.js';

test('the same id always returns the same gradient', () => {
  const first = defaultCoverGradient('x');
  for (let i = 0; i < 100; i += 1) {
    assert.equal(defaultCoverGradient('x'), first);
  }
});

test('palette 0 keeps the shipped terracotta stops and shared geometry', () => {
  assert.deepEqual(COVER_PALETTES[0], ['#5A2A1A', '#A85830', '#D4A060']);
  assert.match(
    defaultCoverGradient(''),
    /^linear-gradient\(145deg, #[0-9A-F]{6} 0%, #[0-9A-F]{6} 55%, #[0-9A-F]{6} 100%\)$/,
  );
});

test('the same id matches after a title would have changed', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(defaultCoverGradient(id), defaultCoverGradient(id));
  assert.equal(defaultCoverPaletteIndex(id), defaultCoverPaletteIndex(id));
});

test('1,000 uuids hit every palette within 5% and 15%', () => {
  const counts = Array(COVER_PALETTES.length).fill(0);
  for (let i = 0; i < 1000; i += 1) {
    counts[defaultCoverPaletteIndex(randomUUID())] += 1;
  }
  for (const count of counts) {
    assert.ok(count >= 50, `palette count ${count} is under 5%`);
    assert.ok(count <= 150, `palette count ${count} is over 15%`);
  }
  assert.equal(counts.reduce((sum, n) => sum + n, 0), 1000);
  assert.ok(counts.every((n) => n > 0));
});
