# Album Proofer — Design System

Source of truth for Album Proofer proofing chrome. CSS tokens live in `src/styles/typography.css`. Keep labels and colours exact.

---

## Palette

Switch the product theme only via these tokens. Do **not** introduce sky blue / cyan accents in Album Proofer chrome.

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#f7f6f2` | Page ground |
| `--surface` | `#ffffff` | Cards, panels |
| `--surface-sunk` | `#f0efeb` | Inputs, wells |
| `--ink` | `#1d1916` | Titles · ~17.5:1 |
| `--ink-body` | `#44403c` | Body · ~10.3:1 |
| `--ink-muted` | `#857f7b` | Secondary · ~5.2:1 |
| `--accent` | `#bf7b47` | Marks, rings |
| `--accent-text` | `#a86c3c` | Links · ~5.5:1 |
| `--ok-fg` | `#597f5d` | Approved · ~6.2:1 |
| `--warn-fg` | `#997735` | Needs you / amber states · ~5.4:1 |
| `--idle-fg` | `#8a8580` | Draft / paused · ~5.7:1 |
| `--stop-fg` | `#8d3a32` | Destructive only |
| `--proof-surround` | `#ebeae6` | Proof canvas surround (desaturated by design) |

Aliases kept for existing CSS:

- `--bg` → same as `--canvas`
- `--border` → `#e5e2dc`
- `--status-revision` / `--status-awaiting` → map to amber (`--warn-fg` family), **never red**
- `--status-approved` → `--ok-fg`
- `--status-draft` → `--idle-fg`

---

## Status vocabulary — use these exact words everywhere

| Label | Tone | Colour |
|---|---|---|
| **Draft** | `draft` | Idle grey |
| **Not opened** | `awaiting` | Amber |
| **Awaiting feedback** | `feedback` | Amber |
| **Revision requested** | `revision` | Amber (**not red**) |
| **Approved** | `approved` | Green (`--ok-fg`) |
| **Paused** | `paused` | Idle grey |

Status chips are pills: soft tinted background + coloured dot + label text.

### Revision requested is amber, not red

It is the single most common healthy state in this module — a client engaging with the proof is the product working. Colouring it red trains the photographer to feel a jolt of failure every time a client does exactly what you asked them to do.

---

## Cover leather swatches (blank covers)

Product chrome palette is separate from blank-cover leather presets. Cover leather must not include a sky-blue / turquoise swatch. Default blank cover leather: `cream` (white).
