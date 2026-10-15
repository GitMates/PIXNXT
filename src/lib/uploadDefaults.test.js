import assert from 'node:assert/strict';
import test from 'node:test';
import { WEB_DISPLAY_EDGE, webMaxEdgeForQuality } from './uploadDefaults.js';

test('the gallery screen copy is 3840px on the long side for every saved quality', () => {
  assert.equal(WEB_DISPLAY_EDGE, 3840);
  for (const quality of ['standard', 'high', 'maximum', undefined, 'unknown']) {
    assert.equal(webMaxEdgeForQuality(quality), 3840);
  }
});
