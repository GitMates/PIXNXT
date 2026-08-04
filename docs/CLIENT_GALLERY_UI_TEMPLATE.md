# Client Gallery UI Template

Reference guide for the **Neumorphic Cream UI** used in the Client Gallery module. Use this when building or restyling other PIXNXT modules so layouts, class names, and tokens stay consistent.

---

## Quick mental model

| Layer | Purpose | Root classes |
|-------|---------|--------------|
| **App shell** | Sidebar + global theme | `theme-mono cg-shell` |
| **Page shell** | Title, subtitle, toolbar, content area | `cg-style-2` via `ClientGalleryPageShell` |
| **Surfaces** | Raised / inset / pill neumorphism | `neu-inset`, `neu-circle`, `neu-pill`, `glass` |
| **Form fields** | Inputs, selects, textareas | `neu-inset cg-field-shell` (pill) or `neu-inset cg-field-shell-textarea` |
| **Copy** | Headings, labels, help text | `cg-page-title`, `#1A1A1A`, `#71717A` |

---

## Source files

| File | Role |
|------|------|
| [`src/styles/clientGalleryTheme.css`](../src/styles/clientGalleryTheme.css) | Client Gallery tokens, `neu-pill`, field shells, shared form helpers |
| [`src/components/portal/portal.css`](../src/components/portal/portal.css) | Base neumorphic primitives (`neu-inset`, `neu-circle`, `neu-input`) |
| [`src/components/SidebarLayout.jsx`](../src/components/SidebarLayout.jsx) | App shell — imports theme CSS, wraps pages in `theme-mono cg-shell` |
| [`src/components/features/ClientGallery/ClientGalleryPageShell.jsx`](../src/components/features/ClientGallery/ClientGalleryPageShell.jsx) | Reusable page layout, search field, sub-page tabs |
| [`src/pages/ClientGallery.css`](../src/pages/ClientGallery.css) | Tailwind `@layer` utilities (`cg-style-*`) for Deliveries-specific UI |

---

## Theme wrapper

Every Client Gallery page should render inside `SidebarLayout`, which applies the global theme:

```jsx
<SidebarLayout>
  {/* page content */}
</SidebarLayout>
```

Root wrapper classes:

```html
<div class="theme-mono cg-shell">
```

- **`theme-mono`** — enables neumorphic CSS variables and utility classes from `portal.css` + `clientGalleryTheme.css`
- **`cg-shell`** — Client Gallery–specific CSS custom properties (background, foreground, status colors)

---

## Color tokens

### CSS variables (`theme-mono.cg-shell`)

| Token | Value / role |
|-------|----------------|
| `--cg-background` | Cream page background (`oklch(0.968 0.006 85)`) |
| `--cg-foreground` | Primary text |
| `--cg-muted` | Secondary / placeholder text |
| `--cg-card` | Card / raised surface |
| `--cg-border` | Dividers, borders (`#ECEAE6` equivalent) |
| `--cg-sidebar` | Sidebar background |
| `--cg-primary` | Charcoal accent (buttons, active states) |
| `--cg-live` | `#207c50` — live status |
| `--cg-draft` | `#b45309` — draft status |
| `--cg-hidden` | `#9ca3af` — hidden status |

### Hard-coded hex (common in JSX / Tailwind)

| Name | Hex | Usage |
|------|-----|--------|
| **Charcoal** | `#1A1A1A` | Primary text, active nav, primary actions, toggle ON |
| **Muted gray** | `#71717A` | Subtitles, help text, placeholders, inactive nav |
| **Cream bg** | `#F9F9F7` | Page background (`cg-style-2`) |
| **Surface cream** | `#F4F3F0` | Hover fills, upgrade pills, secondary surfaces |
| **Border** | `#ECEAE6` | Cards, dropdowns, dividers |
| **Inset field bg** | `oklch(0.952 0.005 85)` | Search bars, inputs, selects |

### Do not use (legacy)

| Avoid | Why |
|-------|-----|
| `#8BDFDD` / teal accents | Old Pixieset-style accent — replaced by charcoal/cream |
| `.teal-link` | Removed; use `.set-action-text` or charcoal links |
| `cg-style-11` (teal button) | Legacy Deliveries CTA — use `neu-pill` instead |

> **Note:** `.text-teal` in Settings still exists but renders **charcoal** (`#1A1A1A`). Prefer explicit charcoal classes for new code.

---

## Typography

| Element | Font | Classes / pattern |
|---------|------|-------------------|
| Page title | **Playfair Display** (serif) | `cg-page-title text-3xl sm:text-4xl font-medium` |
| Body / UI | **Inter** | Default via `cg-style-2` and theme |
| Subtitle | Inter, muted | `text-sm text-[#71717A]` |
| Section label | Inter, semibold | `set-section-title`, `sc-label`, or `cg-field-label` |
| Help text | Inter, muted | `set-help-text`, `sc-help-text`, or `cg-field-help` |

---

## Neumorphic utility classes

All live under `.theme-mono` (from `portal.css` + `clientGalleryTheme.css`).

| Class | Visual | Typical use |
|-------|--------|-------------|
| **`neu-inset`** | Pressed / recessed surface | Search inputs, active sidebar item, tab track, field shells |
| **`neu-circle`** | Small raised circle | Icon buttons, hamburger, active tab pill inside tab bar |
| **`neu-pill`** | Dark charcoal gradient pill | Primary CTAs: "New Delivery", "View Site", "Go to Deliveries" |
| **`neu-glow-pill`** | Soft raised pill | Secondary elevated chips |
| **`glass`** | Elevated card panel | Integration cards, modal panels |
| **`neu-scroll`** | Minimal scrollbar | Scrollable nav / lists — thumb appears on hover |

### Primary button (`neu-pill`)

```jsx
<button
  type="button"
  className="neu-pill inline-flex h-10 items-center rounded-full px-5 text-sm font-medium"
>
  View Site
</button>
```

### Icon button (`neu-circle`)

```jsx
<button
  type="button"
  className="neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
>
  {/* icon */}
</button>
```

---

## Page layout

Use **`ClientGalleryPageShell`** for any top-level Client Gallery page (Deliveries pattern).

```jsx
import { ClientGalleryPageShell, ClientGallerySubpageTabs } from '../components/features/ClientGallery/ClientGalleryPageShell';

<ClientGalleryPageShell
  title="Settings"
  subtitle="Branding, delivery defaults, and gallery preferences."
  actions={<button className="neu-pill ...">Optional CTA</button>}
  toolbar={
    <ClientGallerySubpageTabs
      tabs={[{ id: 'branding', label: 'Branding' }, ...]}
      activeId={activeTab}
      onChange={(id) => navigate(`/settings/${id}`)}
    />
  }
  contentClassName="pt-6"
>
  {/* page body */}
</ClientGalleryPageShell>
```

| Prop | Purpose |
|------|---------|
| `title` | Serif page heading |
| `subtitle` | Muted one-liner under title |
| `actions` | Top-right CTA slot (optional) |
| `toolbar` | Row below header — tabs, filters, search (optional) |
| `contentClassName` | Extra classes on content wrapper |
| `bodyClassName` | Extra classes on `<main>` (default includes `cg-style-2`) |

### `cg-style-2`

Tailwind utility defined in `ClientGallery.css`:

- Cream background `#F9F9F7`
- Full-height scrollable main column
- Inter font stack

Applied automatically by `ClientGalleryPageShell`.

---

## Form fields

**Golden rule:** put `neu-inset` + `cg-field-shell` on the **wrapper**, not on the raw `<input>` / `<select>`.

### Pill input / select (matches Deliveries search)

```jsx
{/* Text input */}
<div className="set-input-wrap neu-inset cg-field-shell">
  <input className="set-input" type="text" />
</div>

{/* Select */}
<div className="set-select-wrap neu-inset cg-field-shell">
  <select className="set-select">...</select>
</div>

{/* Showcase-style input with action */}
<div className="sc-input-wrap neu-inset cg-field-shell">
  <input className="sc-input" />
  <button className="sc-input-action-btn">Copy</button>
</div>
```

### Textarea / rich text

```jsx
<div className="sc-textarea-wrap neu-inset cg-field-shell-textarea">
  <textarea className="sc-textarea" />
</div>

<div className="set-rte-box neu-inset cg-field-shell-textarea">
  <div className="set-rte-toolbar">...</div>
  <div className="set-rte-content" />
</div>
```

### Standalone search (no wrapper component)

```jsx
<input
  className="neu-inset h-10 w-full rounded-full border-0 pl-9 pr-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A]"
/>
```

Or use **`ClientGallerySearchField`** from `ClientGalleryPageShell.jsx`.

### Shared semantic helpers (new code)

Prefer these neutral names in `clientGalleryTheme.css` for greenfield modules:

| Class | Role |
|-------|------|
| `cg-field-group` | Label + field + help stack |
| `cg-field-label` | Field label |
| `cg-field-help` | Muted description |
| `cg-field-input-shell` | Input wrapper |
| `cg-field-input-shell--pill` | Full pill radius |
| `cg-field-textarea-shell` | Textarea wrapper |
| `cg-field-select-shell` | Select wrapper |

---

## Navigation patterns

### Sidebar active item

```jsx
className={cn(
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ...',
  active ? 'neu-inset text-[#1A1A1A]' : 'text-[#71717A]/80 hover:text-[#1A1A1A] bg-transparent',
)}
```

### Sub-page tabs (Settings, Showcase sections)

Use **`ClientGallerySubpageTabs`** — inset track with `neu-circle` on active tab.

---

## Toggles

Showcase and Settings share the same toggle markup:

```jsx
<button className={`set-toggle ${on ? 'on' : 'off'}`} onClick={...}>
  <div className="set-toggle-handle" />
</button>
<span className="set-toggle-label">{on ? 'On' : 'Off'}</span>
```

Inside `cg-style-2`:

- **ON** → `#1A1A1A` (charcoal)
- **OFF** → `#d4d4d8` (light gray)

Showcase uses `sc-toggle` / `sc-toggle-handle` — same visual rules under `cg-style-2`.

---

## Action links (inline CTAs)

For text+icon actions like "Download Plugin", "Add Preset", "Connect Google Analytics":

```jsx
<div className="set-action-text">
  <svg ... stroke="currentColor" />
  Download Plugin
</div>
```

- Color: `#1A1A1A`
- Weight: `600`
- Hover: underline
- **Do not** add `teal-link`

Inline text links inside help copy:

```jsx
<span className="text-teal">Learn more</span>  {/* renders charcoal — name is legacy */}
```

---

## Status indicators

```html
<span class="cg-status-dot cg-status-dot--live" />
<span class="cg-status-dot cg-status-dot--draft" />
<span class="cg-status-dot cg-status-dot--hidden" />
```

---

## Page-specific class prefixes

Legacy pages keep their prefixes; new shared code should prefer `cg-*`.

| Prefix | Page / area | Examples |
|--------|-------------|----------|
| **`cg-`** | Shared Client Gallery | `cg-style-2`, `cg-field-shell`, `cg-page-title` |
| **`sc-`** | Showcase | `sc-form-group`, `sc-label`, `sc-input-wrap`, `sc-toggle` |
| **`set-`** | Settings | `set-section`, `set-select-wrap`, `set-action-text`, `set-toggle` |
| **`pl-`** | Legacy primary buttons | Avoid — use `neu-pill` |

---

## Tailwind + CSS conventions

1. **Layout & spacing** — Tailwind utilities in JSX (`flex`, `gap-4`, `px-4`, etc.)
2. **Neumorphic surfaces** — CSS classes (`neu-inset`, `neu-pill`, `cg-field-shell`)
3. **Page-scoped overrides** — trailing blocks in page CSS scoped with `.cg-style-2 .your-class`
4. **Class merging** — use `cn()` from [`src/lib/utils`](../src/lib/utils)

### Import checklist for a new module page

```jsx
import SidebarLayout from '../components/SidebarLayout';
import { ClientGalleryPageShell } from '../components/features/ClientGallery/ClientGalleryPageShell';
// Theme is loaded by SidebarLayout — no extra theme import needed
import './YourModule.css'; // optional page-specific overrides scoped under .cg-style-2
```

---

## Reference pages (implemented)

| Route | Shell | Notes |
|-------|-------|-------|
| `/client-gallery` | Custom `cg-style-2` main | Deliveries grid, filter popover, search |
| `/starred/*` | `ClientGalleryPageShell` | Tabs only — no extra filter toolbar |
| `/showcase` | `ClientGalleryPageShell` | Form fields + live preview column |
| `/settings/*` | `ClientGalleryPageShell` + `ClientGallerySubpageTabs` | Branding, Preferences, Integrations |

---

## Checklist — applying template to a new module

- [ ] Wrap page in `<SidebarLayout>` (provides `theme-mono cg-shell`)
- [ ] Use `<ClientGalleryPageShell>` for title / subtitle / toolbar
- [ ] Page background is cream via `cg-style-2` (automatic with shell)
- [ ] Page title uses `cg-page-title` (serif)
- [ ] Subtitle uses `text-sm text-[#71717A]`
- [ ] Primary actions use `neu-pill`, not teal buttons
- [ ] Inputs / selects use wrapper: `neu-inset cg-field-shell`
- [ ] Textareas / RTE use: `neu-inset cg-field-shell-textarea`
- [ ] Help text is `#71717A`; links are `#1A1A1A`
- [ ] Toggles ON = charcoal, OFF = light gray
- [ ] No `#8BDFDD` or `.teal-link` anywhere
- [ ] Page-specific CSS overrides scoped under `.cg-style-2`
- [ ] Do not restyle `<select>` directly — always style the wrapper

---

## Minimal new page stub

```jsx
import SidebarLayout from '../components/SidebarLayout';
import { ClientGalleryPageShell } from '../components/features/ClientGallery/ClientGalleryPageShell';

export default function MyModulePage() {
  return (
    <SidebarLayout>
      <ClientGalleryPageShell
        title="My Module"
        subtitle="Short description in muted gray."
        actions={
          <button type="button" className="neu-pill inline-flex h-10 items-center rounded-full px-5 text-sm font-medium">
            Primary Action
          </button>
        }
      >
        <section className="flex max-w-2xl flex-col gap-6">
          <div className="cg-field-group">
            <label className="cg-field-label">Field label</label>
            <div className="set-select-wrap neu-inset cg-field-shell">
              <select className="set-select">
                <option>Option A</option>
              </select>
            </div>
            <p className="cg-field-help">Helper text in muted gray.</p>
          </div>
        </section>
      </ClientGalleryPageShell>
    </SidebarLayout>
  );
}
```

---

## Related modules

The **Portal** and **Album Proofer** modules reuse the same `theme-mono` + `neu-inset` / `neu-pill` system from `portal.css`. When aligning those modules with Client Gallery, match the tokens and class names above rather than introducing new accent colors.

---

*Last updated: Client Gallery neumorphic cream template (Deliveries, Starred, Showcase, Settings).*
