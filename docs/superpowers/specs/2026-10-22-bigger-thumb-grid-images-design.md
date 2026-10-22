# Bigger thumb for grids (no fourth derivative)

**Date:** 2026-10-22  
**Status:** Approved for implementation  
**Approach:** Option 1 — enlarge `thumb`, keep three files (original + thumb + web)

## Problem

Raising `web` long edge from 2048 → 3840 fixed cover/lightbox clarity, but preview and client-share masonry also load `web`, so each grid tile downloads ~0.8–2.7 MB. Using 400px `thumb` in the grid was fast but too soft on dense/retina layouts.

## Decision

- **thumb** long edge: **400 → 1200** (browser upload, same pipeline)
- **web** stays **3840** for cover hero + lightbox
- **No** new `/grid/` object or DB columns
- Grids/cards use **thumb**; large surfaces use **web**
- One image request per tile (no thumb+web double fetch)

## Upload

- `thumbMaxEdge: 1200` in upload variant options / encode worker defaults
- Paths unchanged: `.../thumb/...`, `.../web/...`, `.../original/...`

## URL routing

| Surface | URL |
|---------|-----|
| Masonry (client link + preview) | `thumbnail_url` via grid helper |
| Deliveries / folder cards | Cover candidates: thumb → stored → web |
| Dashboard media grid | `getPhotoGridDisplayUrl` prefers thumb |
| Lightbox / large cover / opened photo | `web_url` (3840) |

## Fallbacks

`thumbnail_url` → `web_url` → `full_url`. Missing thumb must not blank the UI.

## Existing media

Photos uploaded before this change keep ~400px thumbs until re-upload. Accepted for this phase (no backfill job).

## Success checks

- Client gallery network: visible tiles hit `/thumb/`, not `/web/`
- New uploads: thumb ~1200 long edge, roughly ~100–300 KB typical
- Cover hero + lightbox still `/web/` and sharp
