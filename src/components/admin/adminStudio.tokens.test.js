import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(dir, 'adminStudio.css'), 'utf8');

describe('adminStudio token mapping', () => {
  it('maps chrome aliases to shared theme tokens', () => {
    expect(css).toMatch(/--ad-bg:\s*var\(--canvas\)/);
    expect(css).toMatch(/--ad-card:\s*var\(--surface\)/);
    expect(css).toMatch(/--ad-line:\s*var\(--border\)/);
    expect(css).toMatch(/--ad-ink:\s*var\(--ink\)/);
    expect(css).toMatch(/--ad-muted:\s*var\(--ink-muted\)/);
    expect(css).toMatch(/--ad-accent:\s*var\(--accent\)/);
    expect(css).toMatch(/--ad-ok:\s*var\(--ok-fg\)/);
    expect(css).toMatch(/--ad-bad:\s*var\(--stop-fg\)/);
    expect(css).toMatch(/--ad-warn:\s*var\(--warn-fg\)/);
  });

  it('does not hardcode the old light-only admin palette on --ad-bg/--ad-card/--ad-accent', () => {
    expect(css).not.toMatch(/--ad-bg:\s*#f4f2ee/i);
    expect(css).not.toMatch(/--ad-card:\s*#ffffff/i);
    expect(css).not.toMatch(/--ad-accent:\s*#c46a3a/i);
  });

  it('scopes dark rules under body.dark-theme and admin-shell/admin-studio', () => {
    expect(css).toMatch(/body\.dark-theme\s+\.admin-shell/);
  });
});
