# Print Store Cart Beta Intercept

**Date:** 2026-10-21  
**Status:** Approved — implementing  
**Approach:** Intercept add-to-cart only (Approach 1); no cart write; manual flag removal

## Goal

Let closed-circle photographers explore Print Store products during soft launch. Adding to cart shows a polite beta popup and does **not** keep the item. Ordering copy points to **21 November**. No store-wide beta banners.

## Decisions

| Decision | Choice |
|----------|--------|
| Who sees it | Anyone who taps Add to cart |
| Frequency | Every add |
| After dismiss | Item is not added (never written to cart) |
| Scope of UI | Popup only — not elsewhere in Print Store |
| Expiry | Manual — `PRINTSTORE_CART_BETA_INTERCEPT` flag; no auto-disable on 21 Nov |

## Copy

- **Title:** Print Store is in beta  
- **Body:** Thanks for exploring. Ordering isn’t open yet — this feature will be ready on **21 November**. You’re welcome to keep browsing products in the meantime.  
- **Button:** Got it  

## Architecture

- Flag: `PRINTSTORE_CART_BETA_INTERCEPT` in `src/printstore/printstoreCartBeta.js`
- Modal: `PrintStoreCartBetaModal` (reusable from printstore + gallery)
- Hook points:
  - `handleAddToCart` in `PrintStoreApp.jsx` (safety net + customizer path)
  - Customizers skip “Added to cart” when intercepting
  - Gallery digital / package Add to Cart in `GalleryView.jsx` (before localStorage write)

## Out of scope

- Auto-disable after 21 November
- Blocking browse / product pages
- Photographer lab or pricing UIs
- Checkout changes beyond “add never happens”
