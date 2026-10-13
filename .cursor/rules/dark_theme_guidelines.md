# Dark Theme Design System & Rules

This document specifies the dark theme design system derived from the application's UI guidelines. All AI agents, developers, and designers working on this repository must adhere strictly to these rules to maintain visual consistency across all modules and sub-pages.

---

## 1. Core Principles

1. **Hierarchy via Contrast & Surface Depth**: Avoid pure black (`#000000`). Use subtle dark gray gradients and elevated surfaces (`#1A1A1A` to `#222222`) to create spatial depth.
2. **Warm Dark Aesthetics**: Maintain warm charcoal undertones with muted terracotta/orange accents rather than stark high-contrast cold blues or neons.
3. **Preserve Content Cards**: Embedded visual artifacts (such as standees, cards, or preview canvases) should maintain their original light/cream base where appropriate to reflect realistic print or display previews, while the surrounding container adheres to dark mode.
4. **Accessible Contrast**: Ensure body text and secondary metadata pass WCAG AA standards against their respective background containers.

---

## 2. Color Palette Matrix

### Base Surfaces
- **App Background (Canvas)**: `#121212` (Dark Charcoal / Soft Black)
- **Sidebar Surface**: `#181818`
- **Card / Surface (Default Elevation)**: `#1E1E1E`
- **Surface Hover / Active**: `#262626`
- **Modal / Floating Panel**: `#2A2A2A`

### Accents & Indicators
- **Primary Accent / Active State**: `#b8682b` (Studio terracotta)
- **Primary Hover**: `#9a5622`
- **Active Pill / Badge Background**: `#2A1C12` (Low opacity terracotta fill)
- **Secondary Accent**: `#D4A373` (Warm Amber/Gold)
- **Focus Rings & Borders**: `#3A2E2B` / `#b8682b` (for active/focus state)

### Text & Icons
- **Primary Text**: `#F1F1F1` (Off-white, 90% opacity)
- **Secondary Text**: `#A0A0A0` (Muted gray, 65% opacity)
- **Disabled / Tertiary Text**: `#6E6E6E` (40% opacity)
- **Icon Default**: `#B0B0B0`
- **Icon Active**: `#b8682b`

### Borders & Dividers
- **Subtle Borders**: `#292929`
- **Card Borders**: `#333333`
- **Active / Selected Card Border**: `#b8682b`

---

## 3. Component Styling Rules

### 3.1 Sidebar & Navigation
* **Container**: Background `#181818`, Right Border `1px solid #292929`.
* **Nav Items**:
  * Default: Text `#A0A0A0`, Icon `#A0A0A0`.
  * Active Item: Background `#262626` or transparent with `#b8682b` active indicator pill/text. Text `#FFFFFF`.
* **Dropdowns / Workspace Switchers**: Surface `#1E1E1E`, Border `1px solid #333333`, Hover `#282828`.

### 3.2 Top Bar & Search
* **Search Input**:
  * Background: `#1E1E1E`
  * Text: `#F1F1F1`
  * Placeholder: `#6E6E6E`
  * Border: `1px solid #2E2E2E`
  * Focus State: Border `#b8682b`, outline none.

### 3.3 Cards & Containers
* **Standard Cards**:
  * Background: `#1E1E1E`
  * Border Radius: `12px` or `8px` (consistent with radius scale)
  * Border: `1px solid #2C2C2C`
* **Selected / Active Cards**:
  * Border: `2px solid #b8682b`
  * Subtle outer glow or inset border where applicable.
* **Alert / Info Banner (e.g., Legal/Notice Banner)**:
  * Background: `#241D1B` (Muted dark amber/terracotta tone)
  * Border: `1px solid #4A332C`
  * Text: `#E6C2B8`

### 3.4 Buttons & Controls
* **Primary Button**:
  * Background: `#b8682b`
  * Text: `#FFFFFF`
  * Hover: `#9a5622`
* **Secondary / Pill Buttons (e.g., Language / Filter Pills)**:
  * Default: Background `#262626`, Text `#A0A0A0`, Border `1px solid #333333`
  * Active/Selected: Background `#2A1C12`, Text `#b8682b`, Border `1px solid #b8682b`
* **Radio Options & Custom Selection Cards**:
  * Container: `#1E1E1E`
  * Checked Option: Background `#251F1E`, Border `1px solid #b8682b`, Radio Dot `#b8682b`
* **Toggle Switches**:
  * Track Off: `#333333`
  * Track On: `#b8682b`
  * Knob: `#FFFFFF`

---

## 4. Typography & Contrast Guidelines

1. **Headers (`h1`, `h2`, `h3`)**:
   * Font color: `#FFFFFF`
   * Weight: Medium / Semi-bold (500–600)
2. **Body Text**:
   * Font color: `#D1D1D1`
   * Line height: `1.5`
3. **Subtext / Descriptions**:
   * Font color: `#8C8C8C`
   * Size: `12px` - `13px`

---

## 5. Theme Implementation Rules for Agents

* **One palette file**: Change colors in `src/styles/themeTokens.css` only. That file sets the variables on `:root` (light) and `body.dark-theme` (dark). The app does not use `data-theme`. A change there reaches every rule that uses the variables.
* **No new hex overrides**: Feature CSS and `appearanceDarkTheme.css` must use `var(--bg-app)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--accent-primary)`, and the other tokens. A raw hex in a component stylesheet will ignore the palette file.
  ```css
  body.dark-theme {
    --bg-app: #121212;
    --bg-sidebar: #181818;
    --bg-surface: #1E1E1E;
    --bg-surface-hover: #262626;

    --border-color: #292929;
    --border-active: #b8682b;

    --text-primary: #F1F1F1;
    --text-secondary: #A0A0A0;
    --text-muted: #6E6E6E;

    --accent-primary: #b8682b;
    --accent-primary-hover: #9a5622;
    --accent-subtle: #2A1C12;
  }
  ```
* **Dynamic Media Preview**: When rendering design templates or previews (e.g., A5 Standees, Cards), do not invert the content inside realistic print mocks unless explicitly part of the dark theme design preview (e.g., the "Modern" dark template design card).