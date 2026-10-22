import assert from 'node:assert/strict';
import test from 'node:test';
import { THUMB_DISPLAY_EDGE, WEB_DISPLAY_EDGE, webMaxEdgeForQuality } from './uploadDefaults.js';

test('the gallery screen copy is 3840px on the long side for every saved quality', () => {
  assert.equal(WEB_DISPLAY_EDGE, 3840);
  for (const quality of ['standard', 'high', 'maximum', undefined, 'unknown']) {
    assert.equal(webMaxEdgeForQuality(quality), 3840);
  }
});

test('grid/card thumbs use a 1200px long edge', () => {
  assert.equal(THUMB_DISPLAY_EDGE, 1200);
});
