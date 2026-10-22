# Masonry lazy load + session cache (client gallery + preview)

**Date:** 2026-10-22  
**Status:** Approved for implementation  
**Priority:** Client gallery / live share + delivery preview (`MasonryGrid`) first

## Goal

Stop downloading every grid thumb on cold load. Only fetch images near the viewport; reuse session decode cache and existing HTTP `Cache-Control`.

## Behavior

- `SmoothMediaImage` with `deferUntilVisible` on masonry tiles
- First 18 tiles: eager (`deferUntilVisible=false`, `loading="eager"`)
- Remaining: defer until within ~800px of viewport (existing IntersectionObserver), then `loading="lazy"`
- No `<img src>` until in view — placeholder preserves layout
- Session `imageLoadCache` unchanged (skip shimmer on revisit)
- No masonry virtualization / SW / IndexedDB in this pass

## Files

- `MasonryGrid.jsx` — wire defer/eager per index
- Spec only; prefer existing `SmoothMediaImage` + `imageLoadCache`

## Success

Cold load: Network shows near-viewport `/thumb/` only; scroll loads more; scroll-back no flash for cached URLs.
