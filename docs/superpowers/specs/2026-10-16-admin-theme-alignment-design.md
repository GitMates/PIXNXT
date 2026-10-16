# Admin Theme Alignment Design

**Date:** 2026-10-16  
**Status:** Approved for planning  
**Approach:** Retokenize Admin in place (keep `AdminLayout`, adopt shared theme tokens + dark mode)

## Goal

Restyle the entire Admin section so its UI matches the Client Gallery and Album Proofer product chrome: shared light/dark tokens, warm terracotta accent, display page titles, and an appearance switcher. Admin keeps its own layout and routes.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Entire Admin section (shell + all pages) |
| Theme control | Same Light / Auto / Dark switcher as photographer shell |
| Shell strategy | Keep `AdminLayout`; restyle with shared tokens |
| Implementation approach | Retokenize in place (Approach 1) |

## Out of scope

- Migrating Admin onto photographer `SidebarLayout` / `theme-mono`
- Gallery or Album Proofer feature changes
- Backend / API changes
- Visual companion / automated UI screenshots (manual verification by the user)

## Architecture

### Theme model

- Light palette: `:root` in `src/styles/themeTokens.css`
- Dark palette: `body.dark-theme` in the same file (no `data-theme`)
- Admin must not invent a parallel color system for surfaces, text, borders, or accents
- Feature CSS and Admin JSX use CSS variables only for those concerns
- Raw hex is allowed only when already required by non-themeable content (e.g. realistic media previews); Admin chrome is not such a case

### Token mapping

Under `.admin-studio` (and Admin sidebar chrome), map private `--ad-*` aliases to shared tokens, for example:

| Admin alias | Shared token |
|-------------|--------------|
| `--ad-bg` | `--canvas` / `--bg-app` |
| `--ad-card` | `--surface` / `--bg-surface` |
| `--ad-line` | `--border` / `--border-color` |
| `--ad-ink` | `--ink` / `--text-primary` |
| `--ad-muted` | `--ink-muted` / `--text-secondary` |
| `--ad-faint` | `--text-muted` |
| `--ad-accent` | `--accent` / `--accent-primary` |
| Status ok/warn/bad | Existing status tokens (`--ok-fg`, `--warn-fg`, `--stop-fg`, and matching backgrounds) where defined |

Dark values come from `body.dark-theme` in `themeTokens.css` (canvas `#121212`, sidebar `#181818`, surface `#1E1E1E`, accent `#b8682b`, text `#F1F1F1` / `#A0A0A0`, etc.), consistent with `.cursor/rules/dark_theme_guidelines.md`.

### Theme application flow

- Reuse `src/lib/appearanceTheme.js`: `getThemeMode`, `setThemeMode`, `THEME_CHANGE_EVENT`, `THEME_MODES`
- Storage key remains `themeMode` (shared with photographer app)
- Admin routes are not force-light (`/` and `/e/*` stay force-light; Admin is not in that list)
- On Admin mount / theme change, `body.dark-theme` toggles and Admin CSS responds
- Toggling appearance in Admin updates the same preference used by Client Gallery and Album Proofer

## Components

### Shell — `AdminLayout.jsx` + `adminStudio.css`

- Sidebar surfaces use sidebar/surface tokens (light cream/white system; dark `#181818`)
- Active nav item: elevated/active pill with accent-aligned treatment (not a hard-coded white pill on pure black)
- Profile footer includes appearance controls: Light / Auto / Dark (same options as `SidebarLayout` profile menu)
- Main content canvas uses `--canvas` / `--bg-app`; any decorative wash must use token-derived colors (e.g. accent at low opacity)

### Shared Admin UI — `AdminUi.jsx` + `adminStudio.css`

- Page header typography aligns with gallery/proofer page titles: display font, sentence case (not all-caps serif “OVERVIEW”)
- Stat cards / panels: surface background, token borders, soft elevation; dark surfaces and borders per guidelines
- Inputs, toggles, pills, table rows, scrollbars, hover states: token-backed for both themes
- Status pills retain semantic meaning (`ok` / `warn` / `bad`) with readable contrast on dark surfaces

### Pages (visual polish only; keep information architecture)

- `AdminDashboard.jsx` — Overview
- `AdminUserManagement.jsx`
- `AdminQuotas.jsx`
- `AdminUsageManagement.jsx` (Albums & Deliveries)
- `AdminCrashReport.jsx`
- `AdminLogin.jsx` — follow body theme via the same token mapping; do not invent a separate login palette

Replace hardcoded light-only Tailwind/hex classes (`bg-white`, `text-gray-*`, `#eae8e4`, `#f4f2ee`, etc.) with token-backed classes or CSS so dark mode flips correctly.

## Dark theme rules (Admin)

Follow `.cursor/rules/dark_theme_guidelines.md`:

- No pure black `#000000` for app chrome
- Hierarchy via surface depth (`#121212` → `#181818` → `#1E1E1E` → `#262626`)
- Warm charcoal + terracotta accent (`#b8682b`)
- WCAG AA contrast for primary/secondary text on their surfaces
- Prefer overrides that remapped variables already provide; add `body.dark-theme` rules in `adminStudio.css` (scoped to Admin selectors) only where component styles still need explicit rules
- Do not add new hex overrides in feature CSS when a token already exists; do not expand `appearanceDarkTheme.css` for Admin unless a shared photographer chrome rule is truly required

## Error handling & edge cases

- Appearance menu: invalid/missing `localStorage` falls back to existing `getThemeMode` default (`light`)
- No theme flash beyond current app behavior: rely on existing `App.jsx` pathname/theme application; Admin switcher calls `setThemeMode` immediately
- Status colors remain distinguishable on dark cards
- Closing the profile dropdown and Escape behavior stay as today

## Verification (manual)

User verifies locally:

1. Light and Dark on Dashboard, User Management, Quotas, Albums & Deliveries, Crash Report
2. Sidebar active states, cards, tables, inputs, pills, page titles
3. Appearance switcher (Light / Auto / Dark) persists after refresh
4. After toggling from Admin, Client Gallery and Album Proofer still look correct
5. Admin login remains usable in both themes (if themed)

## File touch list (expected)

| Area | Files |
|------|--------|
| Shell | `src/components/admin/AdminLayout.jsx`, `src/components/admin/adminStudio.css` |
| UI kit | `src/components/admin/AdminUi.jsx` |
| Pages | `src/pages/admin/AdminDashboard.jsx`, `AdminUserManagement.jsx`, `AdminQuotas.jsx`, `AdminUsageManagement.jsx`, `AdminCrashReport.jsx`, `AdminLogin.jsx` |
| Theme (only if Admin needs a missing shared alias) | `src/styles/themeTokens.css` — prefer reuse; avoid Admin-only palette keys |
| Dark feature overrides (if needed) | Scoped `body.dark-theme` rules in `adminStudio.css` |

## Success criteria

- Admin looks like the same product family as Client Gallery and Album Proofer in light mode
- Admin is fully usable and visually consistent in dark mode under `body.dark-theme`
- Appearance can be changed from Admin and persists app-wide
- No parallel Admin-only hex palette for chrome surfaces/text/accents
