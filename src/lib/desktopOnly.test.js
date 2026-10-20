import { describe, expect, it } from 'vitest';
import {
  DESKTOP_MIN_WIDTH,
  isDesktopViewport,
  isPublicClientPath,
  shouldRequireDesktop,
} from './desktopOnly.js';

describe('isPublicClientPath', () => {
  it('treats client galleries, guest delivery, and mobile install as public', () => {
    expect(isPublicClientPath('/gallery/summer-wed')).toBe(true);
    expect(isPublicClientPath('/g/summer-wed/choose')).toBe(true);
    expect(isPublicClientPath('/m/studio-app')).toBe(true);
    expect(isPublicClientPath('/e/party/register')).toBe(true);
    expect(isPublicClientPath('/album-preview/abc')).toBe(true);
    expect(isPublicClientPath('/download/token')).toBe(true);
    expect(isPublicClientPath('/p/studio')).toBe(true);
  });

  it('does not treat studio chrome as a public client path', () => {
    expect(isPublicClientPath('/')).toBe(false);
    expect(isPublicClientPath('/auth')).toBe(false);
    expect(isPublicClientPath('/dashboard')).toBe(false);
    expect(isPublicClientPath('/client-gallery')).toBe(false);
    expect(isPublicClientPath('/settings')).toBe(false);
  });
});

describe('shouldRequireDesktop', () => {
  it('requires a desktop for the beta home and studio app', () => {
    expect(shouldRequireDesktop('/')).toBe(true);
    expect(shouldRequireDesktop('/auth')).toBe(true);
    expect(shouldRequireDesktop('/dashboard')).toBe(true);
  });

  it('does not block public client routes on a phone', () => {
    expect(shouldRequireDesktop('/gallery/summer-wed')).toBe(false);
    expect(shouldRequireDesktop('/m/studio-app')).toBe(false);
    expect(shouldRequireDesktop('/e/party/g/token')).toBe(false);
  });
});

describe('isDesktopViewport', () => {
  it(`treats widths under ${DESKTOP_MIN_WIDTH}px as too small`, () => {
    expect(isDesktopViewport(375)).toBe(false);
    expect(isDesktopViewport(DESKTOP_MIN_WIDTH - 1)).toBe(false);
    expect(isDesktopViewport(DESKTOP_MIN_WIDTH)).toBe(true);
    expect(isDesktopViewport(1440)).toBe(true);
  });
});
