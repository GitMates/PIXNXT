# PIXNXT Responsive Codebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PIXNXT's authenticated studio and client-facing routes usable from phone through desktop while reducing the responsibility and complexity of the largest page modules.

**Architecture:** Deliver this as incremental route and feature slices. Extract cohesive UI and behavior from oversized pages into focused components/hooks, then make each slice responsive before moving on; keep domain behavior in existing services, contexts, and utilities. Retain both Tailwind and vanilla CSS, with a clear ownership rule for each component and aligned breakpoint conventions. Keep public client routes working throughout, and remove the desktop gate only when all routes it protects have passed responsive review.

**Tech Stack:** React 19, React Router 6, Vite 7, Tailwind CSS 3.4, vanilla CSS, Vitest, Playwright.

**Spec:** Based on the agreed approach in the conversation: clean up and implement responsiveness together in small, reviewable feature slices; retain both CSS systems and use the one that best fits the existing component; prioritize maintainable separation of concerns and real device usability.

## Global Constraints

- Do not add a styling or component dependency for responsive behavior; the project already uses Tailwind CSS 3.4 and vanilla CSS.
- Keep existing route behavior, authorization, upload/delivery flows, and public client gallery behavior intact.
- Use Tailwind utilities for concise, component-local layout changes when the component already uses them; use component/page CSS for complex states, selectors, and established stylesheet-owned components.
- Avoid styling the same element through competing Tailwind and vanilla CSS declarations.
- Match Tailwind's existing default responsive widths (sm 640px, md 768px, lg 1024px, xl 1280px) when adding vanilla CSS media queries; do not introduce a parallel breakpoint scale without a demonstrated need.
- Extract by responsibility and feature boundary, not to hit an arbitrary line count.
- Do not remove `DesktopRequiredGate` from protected routes until the readiness criteria in Task 8 are met.
- Keep the existing mobile gallery and public delivery paths usable at every stage.

## Review Focus

- Narrow phone widths (320–375px): no page-level horizontal overflow; primary actions and navigation remain reachable.
- Tablet widths around 768–1024px: intermediate layouts do not inherit broken desktop-only assumptions or cramped phone layouts.
- Long content and browser zoom: dialogs, menus, forms, and toolbars remain scrollable and operable.
- Touch input: actions do not depend on hover, and controls retain usable hit areas.
- Route and session changes: responsive layout does not bypass route guards or disrupt upload, gallery, or delivery flows.

## File Structure and Responsibilities

- `src/components/` and route-owned component folders: extracted presentational and interaction components with a single responsibility.
- `src/hooks/`: reusable viewport behavior only when it cannot be expressed cleanly in CSS; prefer CSS responsive rules for layout.
- Existing `src/pages/*` entry files: route composition and page-level data orchestration, not every subview and interaction.
- Existing `src/pages/*.css` or colocated component CSS: styles for stylesheet-owned components; preserve established visual tokens and theme behavior.
- `tailwind.config.js`: retain current Tailwind version, content scan, and default breakpoint scale; only add tokens if repeated use proves necessary.
- `src/components/DesktopRequiredGate.jsx`, `src/lib/desktopOnly.js`, and related tests: gate behavior and route classification, updated only in the final release task.
- `docs/superpowers/plans/`: this roadmap; implementation-specific follow-up plans may be added per route if needed.

## Delivery Strategy

This is a program-sized change. Execute in order, shipping each route slice independently. Before starting a route, inspect its current JSX/CSS and flows; the line counts below are a prioritization signal, not a mandate to rewrite whole files. Each slice should extract and responsively adapt a feature together. Keep PRs small enough to review by route or major workflow.

### Task 1: Establish responsive conventions and a baseline

**Files:**
- Modify: `docs/` (add the agreed responsive conventions and route readiness checklist)
- Review: `tailwind.config.js`, `src/index.css`, `src/App.jsx`, existing page CSS and `src/components/DesktopRequiredGate.jsx`

- [ ] Inventory authenticated routes, public routes, shared chrome, and existing responsive styles; record route owners and critical user workflows.
- [ ] Record the existing 640/768/1024/1280px Tailwind breakpoints and define matching vanilla CSS media query usage.
- [ ] Define responsive acceptance for each route: 320px, 375px, 768px, 1024px, and 1440px; no unintended horizontal page overflow; core workflow operable by touch and keyboard.
- [ ] Identify a representative simple route and a representative data-heavy route as pilot slices; preserve the route priority in this plan unless user traffic or product priorities indicate otherwise.

**Acceptance:** the route inventory identifies every route currently protected by the gate and distinguishes public client routes already intended for mobile.

### Task 2: Remove the temporary gate from Home and make the beta landing page responsive

**Files:**
- Modify: `src/lib/desktopOnly.js`, `src/components/DesktopRequiredGate.jsx`, `src/pages/Home.css`
- Test: `src/lib/desktopOnly.test.js`, plus viewport review of the home page

- [ ] Allow only `/` to bypass the temporary viewport gate; retain the gate for unfinished authenticated studio routes and the existing public client routes.
- [ ] Adapt the beta landing page's header, rotating headline, content spacing, and footer for widths below 768px using its existing scoped vanilla CSS.
- [ ] Preserve the current visual identity, desktop layout, reduced-motion behavior, and sign-in/dashboard destinations.
- [ ] Review the page at 320px, 375px, 768px, 1024px, and 1440px, including a short-height mobile viewport.

**Acceptance:** `/` renders the responsive beta home at phone widths; `/auth` and other unfinished studio routes still show the temporary gate below 1024px.

### Task 3: Make shared authenticated chrome responsive

**Files:**
- Modify: shared header/navigation components and their owned CSS (identify from `src/App.jsx` during inventory)
- Create: focused mobile navigation component only if needed
- Test: navigation route behavior and viewport interactions

- [ ] Extract shared navigation subregions if their state and rendering currently make the shell difficult to adapt.
- [ ] Provide a mobile navigation pattern with reachable primary routes, account actions, and clear open/close behavior.
- [ ] Ensure menus and overlays fit the viewport, close appropriately, and support keyboard and touch input.
- [ ] Check the authenticated shell against every route so local page styles do not cover or conflict with navigation.

**Acceptance:** all authenticated routes can be reached and exited from a phone without relying on desktop navigation.

### Task 4: Refactor and responsively adapt `CollectionDashboard`

**Files:**
- Modify: `src/pages/CollectionDashboard.jsx` (currently ~8,580 lines)
- Create: route-owned components under `src/pages/collection-dashboard/` (or the existing established feature directory, if one is found)
- Create/modify: colocated CSS only for components that own stylesheet-based layout
- Test: focused tests for extracted behavior and responsive browser coverage for key collection workflows

- [ ] Map the page into real user workflows and identify state/data dependencies before moving code.
- [ ] Extract one cohesive area at a time (for example, page shell/header, collection settings, delivery controls, media sections, and dialogs) with narrow props and callbacks.
- [ ] Keep data fetching, authorization, persistence, and service interactions in the existing owners or explicit route-level hooks; do not duplicate effects during extraction.
- [ ] After each extraction, verify existing behavior before adapting that unit's layout for phone/tablet.
- [ ] Adapt collection navigation, toolbars, metadata panels, grids, menus, and dialogs to narrow widths and touch input; use stacked or secondary surfaces where a desktop multi-column layout cannot fit.
- [ ] Verify create/edit collection, media browsing, delivery configuration, and modal flows at all agreed viewport sizes.

**Acceptance:** the route remains functionally equivalent on desktop and its essential collection workflows fit and operate on mobile.

### Task 5: Refactor and responsively adapt `StoreDashboard`

**Files:**
- Modify: `src/pages/StoreDashboard.jsx` (currently ~5,830 lines)
- Create: route-owned components under `src/pages/store-dashboard/` (or existing feature structure)
- Test: focused tests for extracted store behavior and responsive browser coverage

- [ ] Map store setup, product/catalog, order, and configuration workflows and state ownership.
- [ ] Extract the high-cohesion sections and dialogs into focused route-owned components without moving domain rules into presentation code.
- [ ] Adapt product grids, editors, pricing/forms, tables, and action bars to narrow screens; provide mobile alternatives for wide tabular content.
- [ ] Verify store setup and core management tasks at agreed viewport sizes and confirm desktop parity.

**Acceptance:** core store owner workflows complete on mobile without hiding required actions or losing desktop behavior.

### Task 6: Adapt remaining authenticated routes in priority order

**Files:**
- Modify as inventoried: `src/pages/AuthPage.jsx`, `src/pages/Dashboard.jsx`, `src/pages/ClientGallery.jsx`, `src/pages/AccountSettings.jsx`, `src/pages/Settings.jsx`, `src/pages/Showcase.jsx`, `src/pages/smart-albums/AlbumEditor.jsx`, `CreateAlbum.jsx`, `AlbumsList.jsx`, and remaining gated routes
- Create: route-owned components only where a coherent responsibility is currently embedded in a large page
- Test: route-level responsive and workflow coverage

- [ ] Rank routes by product importance and complexity after inventory; implement one complete route slice at a time.
- [ ] For each route, extract only sections whose separation makes responsiveness, reuse, or state ownership clearer.
- [ ] Adapt dense tables, editors, forms, action bars, and side panels with explicit mobile presentation decisions (stack, scroll region, collapsible section, or alternate navigation).
- [ ] Check shared tokens/themes and both light/dark appearances where the route supports them.
- [ ] Verify route-specific workflows and navigation across the agreed viewport sizes.

**Acceptance:** every authenticated route protected by the desktop gate has a recorded responsive pass and no known blocking mobile workflow.

### Task 7: Review and preserve public client routes

**Files:**
- Review/modify only as needed: `src/pages/public/GalleryView.jsx` (~4,590 lines), `src/pages/ClientGallery.css`, mobile gallery components/styles, guest delivery components/styles
- Test: public gallery and delivery route coverage at phone/tablet/desktop widths

- [ ] Inventory public gallery, mobile gallery, album preview, download, and guest delivery layouts independently of the studio shell.
- [ ] Extract any oversized view sections only when it improves a specific layout or responsibility boundary.
- [ ] Preserve the public-route bypass behavior in `src/lib/desktopOnly.js` while the studio gate remains.
- [ ] Verify gallery browsing, photo selection/download, guest registration/delivery, and install flows on phones.

**Acceptance:** public client flows remain mobile-ready and are not regressed by studio shell changes.

### Task 8: Remove the temporary desktop gate and complete cross-route verification

**Files:**
- Modify: `src/App.jsx`, `src/components/DesktopRequiredGate.jsx`, `src/lib/desktopOnly.js`, `src/lib/desktopOnly.test.js`, and obsolete gate styles if no longer referenced
- Test: route guard tests, responsive route smoke suite, production build

- [ ] Confirm every formerly gated route passed its route checklist, including unauthenticated/authorized states and critical workflows.
- [ ] Remove the desktop notice and viewport-based route block; retain route authentication and authorization guards.
- [ ] Update `desktopOnly` unit tests or remove the module/tests if no remaining product behavior depends on it.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`; run the responsive browser suite at representative viewport widths.
- [ ] Manually review 320px and 375px phone widths, 768px and 1024px tablet boundaries, and 1440px desktop for horizontal overflow, overlays, and clipped controls.

**Acceptance:** no protected route renders the temporary desktop-only notice, all route/auth guards remain in effect, and responsive smoke checks pass.

## Verification Commands

- `npm run lint`
- `npm test`
- `npm run build`
- Run the repository's Playwright suite if present; otherwise add focused route/viewport coverage as part of each task before relying on manual review alone.

## Self-Review

- Spec coverage: styling strategy, separation of concerns, incremental extraction, responsive routes, gate removal, and regression preservation are each covered by Tasks 1–8.
- Task scan: each task produces a route or cross-cutting shell that can be reviewed independently; exact component boundaries are determined after inspecting each route's current responsibilities.
- Type/interface consistency: no new shared API is prescribed; extracted components should use explicit props and preserve existing service/context interfaces.
- Verification: each route slice gets focused behavior and viewport checks; final task runs lint, unit tests, build, responsive route smoke coverage, and manual boundary review.
- Scope: the work spans independent routes, so the roadmap is staged by route and allows separate route-specific follow-up plans if an individual extraction grows beyond one reviewable slice.
