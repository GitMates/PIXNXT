# PIXNXT — Video Delivery handoff brief (v1)

**Surface:** Client Gallery → Delivery (`deliveries/manage`) → Videos row in each set · client gallery set view
**Interactive prototype:** https://claude.ai/artifact/PQ7bhTF64LwNFUpzaQTw6J (also in Project as `claude/quiet-video-delivery.html`, rev 2)
**Date:** 20 Oct 2026

Where this brief and the prototype disagree, **this brief wins**. The prototype shows look and flow. This brief is the build spec.

---

## The problem this solves

Indian studios still send long traditional videos (1.5–4 hrs) through Google Drive or WeTransfer, because no gallery platform includes them at no extra cost. PIXNXT delivers every film in the same gallery as the photos. Short films stream. Long films go out as a download with a 90-second preview. Studios can stream a long film if they spend stream minutes on it.

---

## Decisions locked

| # | Question | Decision |
|---|---|---|
| 1 | Where does the master live? | **Always R2.** Cloudflare Stream holds a derived copy only. Switching mode never needs a re-upload. |
| 2 | Per-file cap or pool? | **One stream-minutes pool per studio.** Replaces the old ">30 min → R2" rule and the 2-hr cap. |
| 3 | Who decides stream vs download? | **The system decides at upload. The studio can change it any time after.** Upload never asks a question. |
| 4 | Auto rule | Duration ≤ `STREAM_AUTO_MAX_SEC` **and** fits the pool → stream. Otherwise → download + preview. |
| 5 | Where the choice surfaces | On the **video tile** (chip) and in a **side drawer** opened from the tile. No modal, no blocking step. |
| 6 | Pool runs out | New films fall back to download. **A film already streaming never drops to download** because the pool ran out. |
| 7 | Preview | 90 s, default start ≈ 10% of runtime rounded to 30 s, studio can move it. |
| 8 | Client download | **Browser's native download** via signed URL with range support. No in-page downloader. See §7. |
| 9 | Guest Delivery | **Never carries video.** Photos only. |

## Open decisions — do not hardcode

| # | Question | Current placeholder | Owner |
|---|---|---|---|
| A | Auto-stream threshold | `45 min`, as a server constant | Kharthik, after checking real cinematic cuts |
| B | Pool size per plan | `120 min` | Kharthik + Stream bill numbers |
| C | Top-up pack size and price | `120 min`, price TBD | Kharthik |
| D | Do streaming films in a **hidden** set count against the pool? | Yes (matches what Stream bills) | Kharthik |

Keep A–C in config, not in code or copy. Read every UI number from the API.

---

## 1. Constants

```ts
// video-delivery.config.ts — the only place these numbers exist
export const VIDEO_DELIVERY = {
  STREAM_AUTO_MAX_SEC: 45 * 60,   // open decision A
  PREVIEW_LEN_SEC:     90,
  PREVIEW_DEFAULT_PCT: 0.10,
  PREVIEW_SNAP_SEC:    30,
  POOL_DEFAULT_MIN:    120,       // open decision B
  TOPUP_PACK_MIN:      120,       // open decision C
} as const;
```

No `45`, `90` or `120` literal anywhere else. Grep for them.

---

## 2. Data model

```sql
-- per video asset (videos live in sets alongside photos)
ALTER TABLE media_assets ADD COLUMN duration_sec        INTEGER;          -- from ffprobe, server-side only
ALTER TABLE media_assets ADD COLUMN delivery_mode       TEXT DEFAULT 'download'; -- 'stream' | 'download'
ALTER TABLE media_assets ADD COLUMN stream_status       TEXT DEFAULT 'none';     -- 'none' | 'preparing' | 'ready' | 'failed'
ALTER TABLE media_assets ADD COLUMN stream_uid          TEXT;             -- Cloudflare Stream video id
ALTER TABLE media_assets ADD COLUMN stream_minutes      INTEGER DEFAULT 0;-- minutes reserved: CEIL(duration_sec/60) while mode=stream
ALTER TABLE media_assets ADD COLUMN preview_start_sec   INTEGER;
ALTER TABLE media_assets ADD COLUMN preview_r2_key      TEXT;
ALTER TABLE media_assets ADD COLUMN preview_status      TEXT DEFAULT 'pending'; -- 'pending' | 'ready' | 'failed'
ALTER TABLE media_assets ADD COLUMN fallback_reason     TEXT;             -- 'long' | 'pool' | 'manual' | NULL

-- per studio
ALTER TABLE studios ADD COLUMN stream_minutes_total INTEGER DEFAULT 120;
ALTER TABLE studios ADD COLUMN stream_minutes_used  INTEGER DEFAULT 0;
```

`stream_minutes_used` must always equal `SUM(stream_minutes)` across the studio's assets. Run a nightly reconciliation that logs any drift. Never silently "fix" the drift.

**What the client sees** is derived and never stored:

```ts
const clientMode = (a) =>
  a.delivery_mode === 'stream' && a.stream_status === 'ready' ? 'player' : 'preview_download';
```

A film being prepared still shows preview + download to the client. The client never sees a player that won't play.

---

## 3. State machine

```
              upload
                │
        ffprobe duration
                │
   ┌── auto rule (§4) ──┐
   ▼                    ▼
DOWNLOAD            PREPARING ──(Stream webhook: ready)──► STREAMING
 ▲  │                   │                                    │
 │  └──"Stream this"────┘                                    │
 │      (reserve minutes)                                    │
 │                      └──(webhook: error / 30-min timeout)─► DOWNLOAD
 │                          release minutes, reason='pool'|'long', notify studio
 └──────────────"Switch to download" (confirm)────────────────┘
                 delete Stream copy, release minutes, reason='manual'
```

Deleting a video in any state releases its minutes and deletes its Stream copy, if one exists.

---

## 4. Auto-assignment at upload

Runs once per video, after ffprobe, **in upload order across all sets**:

```ts
async function assignOnUpload(asset, studio) {
  const need = Math.ceil(asset.duration_sec / 60);
  if (asset.duration_sec <= VIDEO_DELIVERY.STREAM_AUTO_MAX_SEC && await reserve(studio.id, need)) {
    return startStream(asset, need);                 // → PREPARING
  }
  return setDownload(asset, asset.duration_sec > VIDEO_DELIVERY.STREAM_AUTO_MAX_SEC ? 'long' : 'pool');
}
```

**Reserving minutes must be one atomic statement.** If two uploads or two drawer clicks land together, they must not overdraw the pool:

```sql
UPDATE studios
   SET stream_minutes_used = stream_minutes_used + :need
 WHERE id = :studio_id
   AND stream_minutes_used + :need <= stream_minutes_total
RETURNING stream_minutes_used;      -- no row returned = didn't fit
```

Releasing minutes is the mirror statement, floored at 0. Minutes are reserved when preparing **starts**, not when Stream reports ready.

---

## 5. Pipeline

### On upload (every video)
1. Master → R2 (as today).
2. `ffprobe` → `duration_sec`. Never trust a duration reported by the client.
3. Preview job:
   ```bash
   ffmpeg -ss {start} -i master.mp4 -t 90 \
     -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 23 \
     -c:a aac -b:a 128k -movflags +faststart preview.mp4
   ```
   `-ss` goes before `-i` for speed, and the output is re-encoded so the cut lands on the exact second. Store it at `preview_r2_key`. Generate a preview for **every** video, including ones that stream, so a switch back to download is instant.
4. Auto-assignment (§4).

### "Stream this film" (drawer)
1. `reserve()`. If it fails, return `409 POOL_EXHAUSTED` and the UI shows "Add minutes".
2. Ask Cloudflare Stream to create a copy from a short-lived signed R2 URL using **upload-from-URL** (confirm the current endpoint in Cloudflare's docs). Set `stream_status='preparing'` and store `stream_uid`.
3. Stream's ready webhook → `stream_status='ready'`. The client view flips to the player on its next load.
4. Error, or still not ready after 30 min → `release()`, mode back to download, and a notice on the tile: "Couldn't prepare the stream. Shared as download."

### "Switch to download" (drawer, after inline confirm)
Set mode to download, delete the Stream copy, `release()`, `fallback_reason='manual'`. The preview already exists, so there's nothing to generate.

### Preview start changed
Debounce for 2 s, then re-run the preview job. Keep serving the old preview until the new one is ready, then swap the key and delete the old object.

---

## 6. Studio UI (matches prototype rev 2)

**Video tile** (VIDEOS row, inside each set)
- Fixed height 168 px. Width = height × the video's own aspect ratio. **No square card around a vertical video.**
- Bottom-left: play glyph + duration (`1:52:10`). Always shown.
- Top-right chip, only when the film isn't streaming:
  - `Download + preview` (idle tone)
  - `Preparing` (warn tone, pulsing dot)
  - Streaming films get **no chip**.
- Caption under the tile shows the film title, truncated with an ellipsis.
- The whole tile is a button that opens the drawer.

**Set notice** (above the tiles, only when ≥ 1 film in this set isn't streaming)
- Copy: `{n} film(s) shared as download with a preview. Clients can still watch the preview.` with actions `Review` · `Hide`.
- `Review` opens the drawer on the first such film.
- `Hide` is stored per set per studio. It comes back if a film in that set is later switched to download.

**Drawer** (right side, 400 px, scrim behind, Esc closes, focus returns to the tile)

| Film state | Contents |
|---|---|
| Download | Preview start slider (30 s steps, shows `start – start+1:30`), "needs X min / you have Y left" table, primary **Stream this film** if it fits, otherwise **Add 120 stream minutes**, ghost **Keep as download** |
| Streaming | "Your client plays this in the gallery. It uses X stream minutes" (adds "even while this set is hidden" when the set is hidden), ghost **Switch to download with preview** → inline confirm |
| Preparing | "Your client keeps the download until it's ready." No actions |

**Sidebar**: a new meter block under Storage, `STREAM MINUTES · 66 / 120 min`, with the note `54 min left · all deliveries`. The bar uses the warn tone above 85%.

**Upload**: no question, ever. If an upload batch contains a video, show one line in the upload panel: *Long films are shared as a download with a preview. You can stream any film later.*

---

## 7. Client UI

- The gallery shows **visible sets only**. Inside a set: videos first, then photos.
- **Player** (`clientMode === 'player'`): Stream player, poster from Stream.
- **Preview + download**:
  - The preview plays from R2. A `Preview · 1:30` tag sits on the frame.
  - At the end of the preview, an overlay reads: *That's the preview. Download the full film below to watch all 1h 52m.*
  - Download box: `Full film · 1h 52m · 4.2 GB`, then the hint *Large file. Use Wi-Fi if you can.*, then the button **Download full film**.
- Never show "streaming disabled", "not available" or anything else that reads as a missing feature.

### Download — correction to the prototype
The prototype shows an in-page progress bar with pause, resume and drop recovery. **Don't build that.** A 4 GB file can't be streamed to disk reliably from a mobile web page, and Android Chrome has no save-to-file API for it. Build this instead:

- The button hits `GET /d/{asset}`, which returns a 302 to a signed R2 URL with a **48 h TTL**. A fresh URL is minted on every click.
- Response headers on the R2 object:
  - `Content-Disposition: attachment; filename="{Delivery}_{Film-title}.mp4"`, ASCII-safe, with an RFC 5987 `filename*` for non-ASCII names
  - `Accept-Ranges: bytes`
  - a stable `ETag`
  - correct `Content-Length`
- The browser's own download manager shows progress and handles resume. After the click, change the button area to: *Download started. Check your phone's Downloads. If it stops, resume it there.*
- **Test before beta:**
  - Android Chrome on throttled 4G: kill the network at about 60%, then restore it. The download must resume from the same byte offset, not from zero.
  - Repeat on iOS Safari and note what happens. Safari's handling of large downloads is weaker, so document the behaviour rather than assume it.

---

## 8. Corrections to the current screen (separate tickets, ship now)

These don't depend on the video work.

| # | Today | Fix |
|---|---|---|
| 1 | Vertical video centred in a mostly empty square card, with no duration and no status | Tile takes the video's own shape at a fixed height; duration always shown (§6) |
| 2 | "1 of 1 sets visible to your client" while two sets are listed | Count from the sets table. Investigate the root cause: probably a stale or filtered count. Add an eye toggle per set; hidden sets are struck through in the sidebar and show a `Hidden from client` pill in the set view |
| 3 | Header "22 photos · 1 film", set rows "21" / "2" (photos and films mixed) | Set rows read `{photos} · {n} film(s)` and the header is the sum of the same split. Never add photos and films into one number |
| 4 | "Upload sel…" under PEOPLE, truncated | Label **Selfie** |
| 5 | "New photo set" | **New set**, because sets hold films too |
| 6 | Nothing in the main area names the current set | Add a set heading (display face) with its counts above PEOPLE |

---

## Key acceptance criteria

- **No questions at upload.** Uploading any mix of photos and videos never shows a dialog, choice or extra step.
- **Short films stay clean.** A studio that only uploads films ≤ threshold sees zero chips, zero notices and zero drawer prompts. Confirm with the "Short films only" fixture.
- **Duration comes from ffprobe.** Changing the client-sent metadata has no effect.
- **The pool can't be overdrawn.** Fire 10 parallel "Stream this" requests that together exceed the pool. Exactly the requests that fit succeed, and `stream_minutes_used ≤ stream_minutes_total` afterwards.
- **The ledger balances.** `stream_minutes_used` equals the SUM of per-asset `stream_minutes` after every transition, including Stream failure and video deletion.
- **No silent downgrades.** Shrinking the pool below current usage never changes the mode of an already-streaming film.
- **No dead player for clients.** A client loading a gallery while a film is preparing sees preview + download, never a player that won't play.
- **Switch back is instant.** Switching to download needs no new transcode (the preview exists), and the Stream copy is deleted within 1 minute (check Stream's dashboard).
- **Preview start updates cleanly.** Moving the preview start regenerates the preview, and the client keeps the old preview until the new one is ready.
- **Preview length is exact.** It is 90 s ± 0.5 s, starts within 0.5 s of `preview_start_sec`, and has `faststart`, so it begins playing before it's fully loaded.
- **Download resumes.** On Android Chrome, after a network kill and restore, it continues from the same offset. The file opens and plays to the end.
- **Filename is right.** The downloaded file is named `{Delivery}_{Film-title}.mp4`, not the R2 key.
- **Hidden sets stay hidden.** A hidden set never appears in the client gallery and its files can't be fetched through `/d/` by a client.
- **No magic numbers.** No `45`, `90` or `120` literals exist outside `video-delivery.config.ts`.
- **No video in Guest Delivery.** No video asset is ever included in a Guest Delivery payload.

---

## Out of scope, but noted

1. **Top-up purchase flow.** "Add 120 stream minutes" needs the payment gateway and pricing (open decision C). Until then the button can open a "Contact us" sheet, or be hidden behind a flag.
2. **Delivered-minutes cost.** Stream bills for minutes delivered as well as minutes stored. The pool only meters stored minutes. Watch delivered minutes in the Stream dashboard for the first beta month, then decide whether plans need a view cap.
3. **Download analytics.** "Downloaded by client" on the tile would be valuable to studios, but the signed-URL redirect only proves a click, not a finished download. Log clicks now and label them honestly as "Download started".
