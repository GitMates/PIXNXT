# Admin Theme Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire Admin section to share Client Gallery / Album Proofer light+dark tokens, page-title typography, and Light/Auto/Dark appearance controls while keeping `AdminLayout`.

**Architecture:** Wrap Admin chrome in `.admin-shell`, remap `--ad-*` aliases in `adminStudio.css` to `themeTokens.css` variables, replace hardcoded hex/Tailwind grays with token-backed classes, and wire `appearanceTheme.js` into the Admin profile menu. Dark mode is `body.dark-theme` only.

**Tech Stack:** React (Vite), existing `themeTokens.css` / `appearanceTheme.js`, Vitest for a CSS token-contract test, manual UI verification by the user.

**Spec:** `docs/superpowers/specs/2026-10-16-admin-theme-alignment-design.md`

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/components/admin/adminStudio.css` | `--ad-*` → shared tokens; shell/sidebar/nav/card/pill/input/toggle utilities; `body.dark-theme` Admin overrides |
| `src/components/admin/AdminLayout.jsx` | `.admin-shell` root, tokenized sidebar/nav, appearance switcher in profile menu |
| `src/components/admin/AdminUi.jsx` | Shared headers/cards/panels/modals using token classes + `type-page-title` |
| `src/pages/admin/AdminDashboard.jsx` | Overview — mostly inherits `AdminUi`; strip leftover hex |
| `src/pages/admin/AdminUserManagement.jsx` | Page surfaces → token classes |
| `src/pages/admin/AdminQuotas.jsx` | Page surfaces → token classes |
| `src/pages/admin/AdminUsageManagement.jsx` | Page surfaces → token classes |
| `src/pages/admin/AdminCrashReport.jsx` | Page surfaces → token classes |
| `src/pages/admin/AdminLogin.jsx` | Login card/page on same tokens (no indigo) |
| `src/components/admin/adminStudio.tokens.test.js` | Contract: `--ad-*` map to shared vars; no parallel hex palette for chrome |
| `vitest.config.js` | Include the Admin token test |

Do **not** expand `appearanceDarkTheme.css` for Admin unless a shared photographer rule is truly required. Prefer `adminStudio.css` scoped under `body.dark-theme .admin-shell`.

---

### Task 1: Token contract test + retokenize `adminStudio.css`

**Files:**
- Create: `src/components/admin/adminStudio.tokens.test.js`
- Modify: `vitest.config.js`
- Modify: `src/components/admin/adminStudio.css`

- [ ] **Step 1: Write the failing token-contract test**

```js
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
```

- [ ] **Step 2: Include the test in Vitest**

In `vitest.config.js`, add to `include`:

```js
'src/components/admin/**/*.test.{js,ts}',
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/components/admin/adminStudio.tokens.test.js`

Expected: FAIL (old hex palette still present / mappings missing / no `body.dark-theme .admin-shell`)

- [ ] **Step 4: Replace `.admin-studio` token block and harden utilities**

Replace the top of `adminStudio.css` so aliases point at shared tokens. Keep the file scoped; add shell + utility classes used by later tasks.

```css
/* PIXNXT Admin studio. Tokens alias shared themeTokens.css (:root + body.dark-theme). */

.admin-shell,
.admin-studio {
  --ad-bg: var(--canvas);
  --ad-card: var(--surface);
  --ad-sunk: var(--surface-sunk);
  --ad-line: var(--border);
  --ad-ink: var(--ink);
  --ad-body: var(--ink-body);
  --ad-muted: var(--ink-muted);
  --ad-faint: var(--text-muted);
  --ad-accent: var(--accent);
  --ad-accent-hover: var(--accent-text);
  --ad-sidebar: var(--bg-sidebar);
  --ad-sidebar-text: var(--text-secondary);
  --ad-sidebar-text-active: var(--text-heading);
  --ad-ok: var(--ok-fg);
  --ad-ok-bg: color-mix(in srgb, var(--ok-fg) 14%, var(--surface));
  --ad-warn: var(--warn-fg);
  --ad-warn-bg: color-mix(in srgb, var(--warn-fg) 14%, var(--surface));
  --ad-bad: var(--stop-fg);
  --ad-bad-bg: color-mix(in srgb, var(--stop-fg) 14%, var(--surface));
  --ad-meter-track: var(--surface-sunk);
  --ad-meter-fill: var(--ink);
  color: var(--ad-body);
}

.admin-studio {
  background:
    radial-gradient(1200px 320px at 20% -80px, color-mix(in srgb, var(--ad-accent) 8%, transparent), transparent 60%),
    radial-gradient(900px 280px at 90% -60px, color-mix(in srgb, var(--ad-ink) 5%, transparent), transparent 60%),
    var(--ad-bg);
}

/* Shell layout surfaces */
.admin-shell {
  background: var(--ad-bg);
  color: var(--ad-body);
}
.admin-shell__aside {
  background: var(--ad-sidebar);
  color: var(--ad-sidebar-text);
  border-right: 1px solid var(--ad-line);
}
.admin-shell__brand {
  border-bottom: 1px solid var(--ad-line);
}
.admin-shell__nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ad-sidebar-text);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.admin-shell__nav-link:hover {
  background: var(--bg-surface-hover);
  color: var(--ad-sidebar-text-active);
}
.admin-shell__nav-link.is-active {
  background: var(--bg-surface-hover);
  color: var(--ad-sidebar-text-active);
  box-shadow: inset 3px 0 0 var(--ad-accent);
}
.admin-shell__profile-menu {
  background: var(--ad-card);
  border: 1px solid var(--ad-line);
  color: var(--ad-ink);
  border-radius: 1rem;
  box-shadow: 0 12px 32px -16px color-mix(in srgb, var(--ad-ink) 35%, transparent);
}
.admin-shell__appearance {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 10px 12px 6px;
  padding: 3px;
  border-radius: 999px;
  background: var(--ad-sunk);
}
.admin-shell__appearance-btn {
  flex: 1;
  padding: 6px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  color: var(--ad-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.admin-shell__appearance-btn:hover {
  color: var(--ad-ink);
}
.admin-shell__appearance-btn.is-active {
  background: var(--ad-card);
  color: var(--ad-ink);
  font-weight: 600;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--ad-ink) 12%, transparent);
}

/* Page utilities (use instead of bg-white / text-gray-* / hex borders) */
.ad-card {
  background: var(--ad-card);
  border: 1px solid var(--ad-line);
  border-radius: 1rem;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ad-ink) 6%, transparent);
}
.ad-sunk {
  background: var(--ad-sunk);
}
.ad-ink { color: var(--ad-ink); }
.ad-body-text { color: var(--ad-body); }
.ad-muted-text { color: var(--ad-muted); }
.ad-faint-text { color: var(--ad-faint); }
.ad-btn-primary {
  background: var(--ad-ink);
  color: var(--surface);
  border-radius: 0.75rem;
  font-weight: 600;
}
.ad-btn-primary:hover {
  background: color-mix(in srgb, var(--ad-ink) 88%, black);
}
body.dark-theme .admin-shell .ad-btn-primary {
  background: var(--ad-accent);
  color: #fff;
}
body.dark-theme .admin-shell .ad-btn-primary:hover {
  background: var(--ad-accent-hover);
}
.ad-btn-secondary {
  background: var(--ad-card);
  color: var(--ad-body);
  border: 1px solid var(--ad-line);
  border-radius: 0.75rem;
  font-weight: 500;
}
.ad-btn-secondary:hover {
  background: var(--ad-sunk);
}
```

Then update existing rules that still use raw hex to use vars:

| Old | New |
|-----|-----|
| scrollbar thumb `#d8d4cc` | `color-mix(in srgb, var(--ad-muted) 45%, var(--ad-bg))` |
| `a.ad-stat:hover` border `#d8d4cc` | `var(--ad-line)` |
| `.ad-row:hover` `#faf9f6` | `var(--ad-sunk)` |
| `.ad-avatar` white ring | `var(--ad-card)` / `var(--ad-line)` |
| `.ad-pill--ok` border `#bbe7c9` | `color-mix(in srgb, var(--ad-ok) 35%, var(--ad-line))` |
| `.ad-pill--muted` bg `#f1efe9` | `var(--ad-sunk)` |
| `.ad-pill--bad` / `--warn` borders | `color-mix` from `--ad-bad` / `--ad-warn` |
| `.ad-input:focus` bg `#fff` | `var(--ad-card)`; border `var(--border-focus)` or `var(--ad-accent)` |
| `.ad-toggle` track `#d9d5cb` / on `#16a34a` | `var(--toggle-track-off)` / `var(--toggle-track-on)` |
| `.ad-toggle-thumb` `#fff` | `var(--toggle-thumb)` |
| `.ad-empty` / `.ad-error-card` | token borders + `var(--ad-bad-bg)` |

Add dark shell polish (only what vars do not already cover):

```css
body.dark-theme .admin-shell .admin-shell__nav-link.is-active {
  background: var(--bg-surface-hover);
  color: var(--text-heading);
  box-shadow: inset 3px 0 0 var(--accent-primary);
}

body.dark-theme .admin-shell .ad-stat,
body.dark-theme .admin-shell .ad-panel,
body.dark-theme .admin-shell .ad-card {
  border-color: var(--border-card);
  box-shadow: none;
}
```

Keep the rest of the file (modal animations, mnav, etc.); only remove hex that fights theming.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/components/admin/adminStudio.tokens.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/adminStudio.css src/components/admin/adminStudio.tokens.test.js vitest.config.js
git commit -m "$(cat <<'EOF'
feat(admin): map admin studio colors to shared theme tokens

EOF
)"
```

---

### Task 2: `AdminLayout` shell + appearance switcher

**Files:**
- Modify: `src/components/admin/AdminLayout.jsx`

- [ ] **Step 1: Wire theme state (same API as `SidebarLayout`)**

Add imports and state near the top of the component:

```jsx
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../../lib/appearanceTheme';

// inside AdminLayout:
const [themeMode, setThemeModeState] = useState(() => getThemeMode());

useEffect(() => {
  const sync = () => setThemeModeState(getThemeMode());
  window.addEventListener(THEME_CHANGE_EVENT, sync);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
}, []);

const handleThemeModeChange = (mode) => {
  setThemeModeState(setThemeMode(mode));
};
```

- [ ] **Step 2: Replace root/aside/nav hardcoded colors with shell classes**

Root:

```jsx
<div className="admin-shell flex h-screen overflow-hidden">
  <aside className="admin-shell__aside w-60 flex flex-col hidden md:flex shrink-0">
    <div className="admin-shell__brand h-16 flex items-center px-5">
      {/* logo mark: use ad-card surface, not hard white */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--ad-card)] border border-[var(--ad-line)]">
        <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-5 h-5 object-contain" />
      </div>
      <div className="min-w-0 ml-3">
        <p className="font-semibold text-[13px] tracking-wide truncate text-[var(--ad-ink)]">PIXNXT</p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--ad-muted)]">Admin</p>
      </div>
    </div>

    <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `admin-shell__nav-link ${isActive ? 'is-active' : ''}`
          }
        >
          <item.icon className="w-[18px] h-[18px] shrink-0" />
          {item.name}
        </NavLink>
      ))}
    </nav>
```

- [ ] **Step 3: Profile dropdown + Light / Auto / Dark track**

Replace the white dropdown block with tokenized menu + appearance controls **above** Log out (match photographer order: account links → appearance → logout):

```jsx
{showProfileDropdown && (
  <div className="admin-shell__profile-menu absolute bottom-full left-0 mb-2 w-[260px] z-[500] py-1">
    <div className="px-4 py-3 border-b border-[var(--ad-line)]">
      <p className="text-sm font-medium ad-ink truncate">{userDisplayLabel}</p>
      <p className="text-xs ad-muted-text truncate">{user?.email}</p>
    </div>
    <button
      type="button"
      className="w-full px-4 py-3 text-sm text-left ad-body-text hover:bg-[var(--ad-sunk)] flex items-center gap-3"
      onClick={() => { navigate('/admin/users'); setShowProfileDropdown(false); }}
    >
      <Users className="w-4 h-4" />
      User Management
    </button>

    <div className="admin-shell__appearance" role="group" aria-label="Appearance">
      {[
        { id: 'light', label: 'Light' },
        { id: 'auto', label: 'Auto' },
        { id: 'dark', label: 'Dark' },
      ].map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`admin-shell__appearance-btn ${themeMode === id ? 'is-active' : ''}`}
          aria-pressed={themeMode === id}
          onClick={() => handleThemeModeChange(id)}
        >
          {label}
        </button>
      ))}
    </div>

    <div className="border-t border-[var(--ad-line)]" />
    <button
      type="button"
      className="w-full px-4 py-3 text-sm text-left ad-body-text hover:bg-[var(--ad-sunk)] flex items-center gap-3"
      onClick={async () => {
        try {
          await handleLogout();
          setShowProfileDropdown(false);
        } catch (err) {
          console.error('Logout failed', err);
        }
      }}
    >
      <LogOut className="w-4 h-4" />
      Log out
    </button>
  </div>
)}
```

Also retokenize the profile trigger (no `text-white` / `bg-white` assumptions) and the mobile header/nav to use the same shell vars / `is-active` pattern.

- [ ] **Step 4: Manual smoke (agent or user)**

Run: `npm run dev` → open `/admin/dashboard`  
Expected: sidebar/content use cream canvas in light; choosing Dark flips `body.dark-theme` and Admin surfaces darken; refresh keeps mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminLayout.jsx
git commit -m "$(cat <<'EOF'
feat(admin): tokenized shell and appearance switcher

EOF
)"
```

---

### Task 3: Retokenize `AdminUi.jsx`

**Files:**
- Modify: `src/components/admin/AdminUi.jsx`

- [ ] **Step 1: Page header → display title (sentence case)**

```jsx
export function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="type-page-title">{title}</h1>
        {subtitle ? (
          <p className="ad-muted-text mt-1 text-sm leading-relaxed max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
```

Call sites that pass `"Overview"` etc. stay as sentence case titles (do not force uppercase in CSS).

- [ ] **Step 2: Stat card / panel / meters / modal → token classes**

Replace the common class strings:

| Component | Replace |
|-----------|---------|
| `AdminSection` title | `text-xs font-semibold uppercase tracking-wider ad-muted-text` |
| `AdminStatCard` card | `ad-stat ad-card p-5 flex flex-col justify-between min-h-[120px]` |
| Icon well | `bg-[var(--ad-sunk)] text-[var(--ad-muted)]` |
| Value tones | danger → `text-[var(--ad-bad)]`, warn → `text-[var(--ad-warn)]`, ok → `text-[var(--ad-ok)]`, default → `ad-ink` |
| Meter track | `bg-[var(--ad-meter-track)]`; fill default `bg-[var(--ad-meter-fill)]`; danger/warn use `--ad-bad` / `--ad-warn` |
| `AdminBarList` | ink/muted + meter tokens |
| `AdminUsageMeter` | same |
| `AdminPanel` | `ad-panel ad-card` + header border `border-[var(--ad-line)]` |
| `AdminModal` backdrop | `bg-[color-mix(in_srgb,var(--ad-ink)_45%,transparent)]` |
| Modal card | `bg-[var(--ad-card)] border-[var(--ad-line)]` |
| Modal header/footer | `bg-[var(--ad-card)] border-[var(--ad-line)]` |
| `AdminModalActions` Cancel | `ad-btn-secondary px-4 py-2.5 text-sm` |
| Save | `ad-btn-primary px-5 py-2.5 text-sm` |

Remove all `bg-white`, `text-gray-*`, `#eae8e4`, `#1a1a1a`, `#f0eee9`, `#efece6`, `#fdfdfc` from this file.

- [ ] **Step 3: Run token test still green**

Run: `npm test -- src/components/admin/adminStudio.tokens.test.js`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminUi.jsx
git commit -m "$(cat <<'EOF'
feat(admin): align AdminUi kit with shared theme tokens

EOF
)"
```

---

### Task 4: Dashboard leftover cleanup

**Files:**
- Modify: `src/pages/admin/AdminDashboard.jsx`

- [ ] **Step 1: Grep and replace remaining hardcoded colors**

Run: `rg -n "bg-white|text-gray-|#\[|#eae8e4|#f4f2ee|#1a1a1a|#f0eee9" src/pages/admin/AdminDashboard.jsx`

For each hit, prefer:

- Card/panel → `ad-card` / existing `AdminPanel` / `AdminStatCard`
- Text → `ad-ink` / `ad-muted-text` / `ad-faint-text`
- Borders → `border-[var(--ad-line)]`
- Primary buttons → `ad-btn-primary`
- Secondary → `ad-btn-secondary`
- Pills → existing `ad-pill ad-pill--ok|warn|bad|muted`

Ensure page title is passed as sentence case (e.g. `Overview` not `OVERVIEW` — header CSS no longer uppercases).

- [ ] **Step 2: Spot-check Overview light + dark**

Expected: section labels, stat cards, meters, “needs attention” pills readable in both themes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminDashboard.jsx
git commit -m "$(cat <<'EOF'
fix(admin): remove light-only colors from dashboard

EOF
)"
```

---

### Task 5: User Management page sweep

**Files:**
- Modify: `src/pages/admin/AdminUserManagement.jsx`

- [ ] **Step 1: Apply the same replacement table as Task 4**

Priority patterns in this file:

```text
bg-white … border-[#eae8e4]  →  ad-card (or border-[var(--ad-line)] bg-[var(--ad-card)])
bg-[#f8f7f4] / bg-gray-50     →  ad-sunk / bg-[var(--ad-sunk)]
text-gray-900                 →  ad-ink
text-gray-500 / text-gray-400 →  ad-muted-text / ad-faint-text
bg-[#1a1a1a] text-white       →  ad-btn-primary
focus:border-[#1a1a1a]        →  focus:border-[var(--ad-accent)]
hover:bg-gray-50              →  hover:bg-[var(--ad-sunk)]
```

Keep behavior (filters, modals, row actions) unchanged.

- [ ] **Step 2: Verify search bar, table, modal open in light + dark**

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminUserManagement.jsx
git commit -m "$(cat <<'EOF'
fix(admin): theme User Management with shared tokens

EOF
)"
```

---

### Task 6: Quotas page sweep

**Files:**
- Modify: `src/pages/admin/AdminQuotas.jsx`

- [ ] **Step 1: Same replacement table + status chips**

Additional mappings:

| Pattern | Replacement |
|---------|-------------|
| `bg-emerald-100 text-emerald-700` | `bg-[var(--ad-ok-bg)] text-[var(--ad-ok)]` |
| `bg-amber-100 text-amber-700` | `bg-[var(--ad-warn-bg)] text-[var(--ad-warn)]` |
| `bg-red-50` / `text-red-600` | `bg-[var(--ad-bad-bg)]` / `text-[var(--ad-bad)]` |
| `bg-gray-100 text-gray-500` | `bg-[var(--ad-sunk)] ad-muted-text` |
| `ring-[#1a1a1a]` | `ring-[var(--ad-ink)]` or `ring-[var(--ad-accent)]` |
| Table header `bg-[#f9f8f5]` | `bg-[var(--ad-sunk)]` |
| Inline toggles using green `#16a34a` | prefer `ad-toggle` from CSS / `--toggle-track-on` |

- [ ] **Step 2: Verify filters, table meters, edit modal toggles in both themes**

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminQuotas.jsx
git commit -m "$(cat <<'EOF'
fix(admin): theme Quotas & Limits with shared tokens

EOF
)"
```

---

### Task 7: Albums & Deliveries (usage) page sweep

**Files:**
- Modify: `src/pages/admin/AdminUsageManagement.jsx`

- [ ] **Step 1: Apply Task 4/5 replacement table**

Run: `rg -n "bg-white|text-gray-|#eae8e4|#1a1a1a|#f8f7f4|bg-gray-" src/pages/admin/AdminUsageManagement.jsx` and clear hits.

- [ ] **Step 2: Verify list/table/cards light + dark**

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminUsageManagement.jsx
git commit -m "$(cat <<'EOF'
fix(admin): theme Albums & Deliveries usage page

EOF
)"
```

---

### Task 8: Crash Report page sweep

**Files:**
- Modify: `src/pages/admin/AdminCrashReport.jsx`

- [ ] **Step 1: Apply replacement table; keep danger semantics on crash severity via `--ad-bad` / `--ad-warn`, not indigo/sky**

- [ ] **Step 2: Verify report list + detail panels light + dark**

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminCrashReport.jsx
git commit -m "$(cat <<'EOF'
fix(admin): theme Crash Report with shared tokens

EOF
)"
```

---

### Task 9: Admin login page

**Files:**
- Modify: `src/pages/admin/AdminLogin.jsx`
- Possibly extend: `src/components/admin/adminStudio.css` with `.admin-login` block

- [ ] **Step 1: Import studio CSS and wrap page**

```jsx
import '../../components/admin/adminStudio.css';

// root:
<div className="admin-shell admin-login min-h-screen flex flex-col items-center justify-center px-4">
  <div className="ad-card w-full max-w-[440px] p-10">
    <div className="mb-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-[var(--ad-sunk)]">
        <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="w-10 h-10 object-contain" />
      </div>
      <h1 className="type-page-title text-[clamp(1.75rem,3vw,1.9rem)]">Admin portal</h1>
      <p className="mt-3 text-[17px] ad-muted-text leading-relaxed max-w-[280px] mx-auto">
        Log in to manage the platform and user accounts.
      </p>
    </div>
    {/* form fields: borders var(--ad-line), focus ring var(--ad-accent); button ad-btn-primary w-full */}
  </div>
</div>
```

Remove indigo (`bg-indigo-600`, `focus:ring-indigo-500`, `bg-indigo-50`) entirely.

Add minimal CSS if needed:

```css
.admin-login {
  background: var(--ad-bg);
}
.admin-login input,
.admin-login .ad-login-input {
  background: var(--ad-card);
  border: 1px solid var(--ad-line);
  color: var(--ad-ink);
  border-radius: 0.5rem;
}
.admin-login input:focus {
  outline: none;
  border-color: var(--ad-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ad-accent) 25%, transparent);
}
```

- [ ] **Step 2: Confirm login still authenticates; page readable in light + dark**

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminLogin.jsx src/components/admin/adminStudio.css
git commit -m "$(cat <<'EOF'
feat(admin): theme Admin login with shared tokens

EOF
)"
```

---

### Task 10: Final verification + residual hex sweep

**Files:**
- All Admin paths above

- [ ] **Step 1: Residual grep (must be clean for chrome colors)**

Run:

```bash
rg -n "bg-white|text-gray-9|#eae8e4|#f4f2ee|#c46a3a|bg-indigo|#141414|#1a1a1a" src/components/admin src/pages/admin
```

Expected: no chrome/surface/text hits left (logo paths and intentional `color: #fff` on accent primary buttons in dark are OK if documented). Fix any leftovers.

- [ ] **Step 2: Run unit tests**

Run: `npm test -- src/components/admin/adminStudio.tokens.test.js`  
Expected: PASS

- [ ] **Step 3: Manual checklist (user)**

1. Light + Dark: Dashboard, Users, Quotas, Albums & Deliveries, Crash Report  
2. Sidebar active state + appearance Light/Auto/Dark persists after refresh  
3. Toggle from Admin → Client Gallery / Album Proofer still correct  
4. Admin login usable in both themes  

- [ ] **Step 4: Final commit only if Step 1 produced fixes**

```bash
git add src/components/admin src/pages/admin
git commit -m "$(cat <<'EOF'
chore(admin): clear residual light-only chrome colors

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Entire Admin section | Tasks 2–9 |
| Shared tokens / no parallel palette | Task 1 |
| Dark via `body.dark-theme` + guidelines | Tasks 1–2 |
| Appearance Light/Auto/Dark in Admin | Task 2 |
| Keep `AdminLayout` | Task 2 |
| Display page titles (not all-caps serif) | Task 3 |
| AdminUi cards/panels/modals | Task 3 |
| All Admin pages + login | Tasks 4–9 |
| Dark overrides in `adminStudio.css` not `appearanceDarkTheme.css` | Task 1 |
| Manual verification | Task 10 |

## Placeholder / consistency review

- No TBD steps; replacement tables are explicit for large pages.
- Theme API names match `appearanceTheme.js`: `getThemeMode`, `setThemeMode`, `THEME_CHANGE_EVENT`.
- CSS class names introduced in Task 1 (`admin-shell__*`, `ad-card`, `ad-btn-*`) are the ones Tasks 2–9 consume.
