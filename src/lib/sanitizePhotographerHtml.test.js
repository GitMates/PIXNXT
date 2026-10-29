/** @vitest-environment jsdom */
import { describe, expect, test } from 'vitest';
import { sanitizePhotographerHtml } from './sanitizePhotographerHtml';

describe('sanitizePhotographerHtml', () => {
  test('returns empty string for missing input', () => {
    expect(sanitizePhotographerHtml(null)).toBe('');
    expect(sanitizePhotographerHtml(undefined)).toBe('');
    expect(sanitizePhotographerHtml('')).toBe('');
  });

  test('keeps ordinary terms HTML', () => {
    const html = '<p>Please <strong>do not</strong> download without permission.</p>';
    expect(sanitizePhotographerHtml(html)).toContain('do not');
    expect(sanitizePhotographerHtml(html)).toContain('<strong>');
  });

  test('strips script tags from photographer Terms/Privacy HTML', () => {
    const dirty = '<p>Hello</p><script>alert(1)</script><p>World</p>';
    const clean = sanitizePhotographerHtml(dirty);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/alert\(1\)/);
    expect(clean).toContain('Hello');
    expect(clean).toContain('World');
  });

  test('strips event-handler attributes', () => {
    const dirty = '<p onclick="steal()">Click</p><a href="javascript:alert(1)">x</a>';
    const clean = sanitizePhotographerHtml(dirty);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
  });
});
