# PIXNXT — Beta holding page (locked 20 Oct 2026)

Source: `claude/pixnxt-beta-landing.html` (self-contained, deploy as `index.html` at pixnxt.in root).
Temporary page for the free beta with photographer friends. The full landing page gets built before public launch.

## What's locked
- Single screen, no scroll (scrolls only on screens under 600px tall).
- Background: **Grain** (`data-bg="grain"`). The alternative is `data-bg="glow"`; nothing else ships.
- Headline: "Every frame," plus a rotating line: beautifully delivered / proofed in one place / found by every guest / printed to last.
- Copy is event-agnostic and global. There is no wedding, India or city mention.
- Loader line: a beam sweeps left to right. The И mark sits at 70% of the line (centred on phones) and flashes when the beam reaches it. The line never deflects, so it doesn't read as a heart monitor.
- Interactions:
  - Hovering or tapping the И fires the flash.
  - Hovering "Beta sign in" runs the beam once around the pill border.
- Logo: wordmark and И are inline SVGs traced from the brand PNGs. Swap in the original SVG paths if available.
- Favicon: terracotta square with a white И.

## Deploy — upload to site root
- `index.html`
- `og-image.png` (1200×630; WhatsApp/LinkedIn share card)
- `apple-touch-icon.png` (180px)
- `favicon-32.png`

## Before go-live
1. Confirm the sign-in URL. It is currently `https://app.pixnxt.in` (a guess).
2. Replace the invite link `mailto:hello@pixnxt.in` with a real mailbox or a `wa.me/` link.
3. After deploy, paste pixnxt.in into a WhatsApp chat or the Facebook Sharing Debugger to confirm the preview card. WhatsApp caches previews, so test before sharing widely.

## Rejected during design (don't revisit for beta)
- Darkroom
- Contact sheet
- Light leak
- Terracotta background
- Full studio illustration
- Doodle wall (read as a WhatsApp copy)
- Corner strobe
- Sunrise burst
- Cursor spotlight, tilt or parallax, custom cursor
