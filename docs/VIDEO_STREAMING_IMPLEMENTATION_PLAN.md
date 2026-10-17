# PIXNXT: Cost-Optimized 3-Tier Video Streaming Architecture
## Implementation Plan for Cursor IDE

---

### Executive Architecture Overview

To eliminate runaway Cloudflare Stream storage and playback costs while delivering a fast, responsive video experience:

1. **Tier 1 (Short Clips: $\le 180\text{s}$ and $\le 120\text{ MB}$ and `video/mp4`):**
   - **Engine:** Direct R2 HTTP 206 Partial Content Range Streaming.
   - **Cost:** **$0 Stream Storage**, **$0 Stream Egress**, **$0 R2 Egress**.
2. **Tier 2 (Highlight Films: $3\text{ to }30\text{ minutes}$):**
   - **Engine:** Cloudflare Stream Adaptive Bitrate (ABR via HLS).
   - **Cost:** Fraction of a cent per month ($\approx \$0.05/\text{month}$ per 10-minute film).
3. **Tier 3 (Feature Films: $> 30\text{ minutes}$):**
   - **Engine:** Ingest to Stream $\rightarrow$ Generate $180\text{s}$ Standalone Clip $\rightarrow$ Purge Full Master from Stream $\rightarrow$ Stream plays 3-min Preview $\rightarrow$ Full Master Downloaded from R2.
   - **Cost:** Only stores $3\text{ minutes}$ in Stream regardless of whether original is $45\text{ mins}$ or $3\text{ hours}$. Original downloaded directly from R2 ($0 egress).

---

## Phase 1: Database Schema & Migrations

### 1.1 Create Migration File: `backend/migrations/0017_video_tiering.sql`
```sql
-- Migration 0017: Video duration and preview tier tracking
ALTER TABLE photos ADD COLUMN video_duration_seconds REAL;
ALTER TABLE photos ADD COLUMN stream_is_preview INTEGER DEFAULT 0;
```

### 1.2 Update Self-Healing Schema: `backend/src/lib/adminSchema.ts`
Ensure the self-healing runner applies these columns automatically in production D1:
```typescript
// Inside ensurePhotoStreamColumns(db: D1Database):
await addColumnIfMissing(db, "photos", "stream_uid", "TEXT");
await addColumnIfMissing(db, "photos", "stream_status", "TEXT");
await addColumnIfMissing(db, "photos", "stream_playback_hls", "TEXT");
await addColumnIfMissing(db, "photos", "stream_error", "TEXT");
await addColumnIfMissing(db, "photos", "video_duration_seconds", "REAL");
await addColumnIfMissing(db, "photos", "stream_is_preview", "INTEGER DEFAULT 0");
```

### 1.3 Update Allowed Fields & Validation:
- In `backend/src/lib/validation.ts`:
  Add `videoDurationSeconds` and `streamIsPreview` to `photoCreateSchema` and `photoUpdateSchema`.
- In `backend/src/lib/fields.ts`:
  Add `"video_duration_seconds"` and `"stream_is_preview"` to `PHOTO_MUTABLE_COLS` and `PHOTO_READ_COLS`.
- In `backend/src/routes/galleries.ts`:
  Map `body.videoDurationSeconds` to `video_duration_seconds` during photo insert.

---

## Phase 2: Client-Side Video Metadata Probe

### 2.1 Create Utility: `PIXNXT/src/lib/videoProbe.js`
Must handle unsupported browser codecs (ProRes, 10-bit HEVC) gracefully without blocking the upload:

```javascript
/**
 * Lightweight HTML5 <video> probe to extract duration and dimensions.
 * Never throws — resolves fallback values if browser decoders fail (e.g. ProRes on Windows).
 *
 * @param {File|Blob} file
 * @param {number} [timeoutMs=4000]
 * @returns {Promise<{ duration: number|null, width: number|null, height: number|null, probeOk: boolean }>}
 */
export function probeVideoMetadata(file, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('video/')) {
      resolve({ duration: null, width: null, height: null, probeOk: false });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ duration: null, width: null, height: null, probeOk: false });
    }, timeoutMs);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const rawDur = video.duration;
      const duration = Number.isFinite(rawDur) && rawDur > 0 ? Math.round(rawDur * 100) / 100 : null;
      const width = video.videoWidth || null;
      const height = video.videoHeight || null;
      cleanup();
      resolve({ duration, width, height, probeOk: true });
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      // Browser decoder unsupported (e.g., ProRes or missing codec). Do NOT fail upload.
      resolve({ duration: null, width: null, height: null, probeOk: false });
    };

    video.src = objectUrl;
  });
}
```

### 2.2 Wire into Upload Flow: `PIXNXT/src/services/storage.service.js` or `UploadManager.tsx`
When a video file is processed for upload:
1. Call `await probeVideoMetadata(file)`.
2. Attach `videoDurationSeconds: probe.duration` and `width: probe.width`, `height: probe.height` to the photo creation payload.

---

## Phase 3: Backend Ingest & 3-Tier Stream Engine

### 3.1 Update `backend/src/lib/stream.ts`

Add Tier-routing and Clipping logic:

```typescript
export const TIER1_MAX_DURATION_SECONDS = 180; // 3 minutes
export const TIER1_MAX_BYTES = 120 * 1024 * 1024; // 120 MB
export const TIER3_MIN_DURATION_SECONDS = 1800; // 30 minutes
export const PREVIEW_CLIP_DURATION_SECONDS = 180; // 3 minutes preview clip

export function shouldRouteToStream(photo: {
  media_type?: unknown;
  filename?: unknown;
  size_bytes?: unknown;
  video_duration_seconds?: unknown;
}): boolean {
  if (String(photo.media_type || "") !== "video") return false;
  const duration = Number(photo.video_duration_seconds) || 0;
  const bytes = Number(photo.size_bytes) || 0;
  const filename = String(photo.filename || "").toLowerCase();
  const isMp4 = filename.endsWith(".mp4") || filename.endsWith(".m4v") || filename.endsWith(".webm");

  // Tier 1: Direct R2 progressive streaming if short, lightweight, and web-safe MP4
  if (duration > 0 && duration <= TIER1_MAX_DURATION_SECONDS && bytes <= TIER1_MAX_BYTES && isMp4) {
    return false; // Stays on direct R2 byte-range streaming!
  }

  // Tier 2 & Tier 3 (or unknown duration/codecs like .mov/ProRes): Route to Stream
  return true;
}
```

### 3.2 Implement Cloudflare Stream Clip & Purge in `backend/src/lib/stream.ts`:

```typescript
/**
 * Creates an independent standalone 3-minute clip from an existing Stream video,
 * then purges the full master from Stream to reclaim quota.
 */
export async function clipAndPurgeMaster(env: Env, photoId: string, parentUid: string): Promise<void> {
  // 1. Request standalone clip from 0 to 180s
  const clipRes = await cfStream(env, "/clip", {
    method: "POST",
    body: JSON.stringify({
      clippedFromVideoUID: parentUid,
      startTimeSeconds: 0,
      endTimeSeconds: PREVIEW_CLIP_DURATION_SECONDS,
      meta: { photoId, kind: "preview_clip" },
      requireSignedURLs: false,
    }),
  });

  const clipUid = clipRes.uid;
  const clipHls = clipRes.playback?.hls || null;
  if (!clipUid) throw new Error("Stream did not return clip uid");

  // 2. Delete the parent full video from Stream to reclaim storage minutes
  await cfStream(env, `/${encodeURIComponent(parentUid)}`, { method: "DELETE" }).catch(() => null);

  // 3. Update database record with clip UID and mark as preview
  await env.DB.prepare(
    `UPDATE photos
     SET stream_uid = ?, stream_status = 'ready', stream_playback_hls = ?,
         stream_is_preview = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`,
  ).bind(clipUid, clipHls, photoId).run();
}
```

### 3.3 Hook Ingest Routing in `backend/src/routes/galleries.ts`:
When a video is saved or updated:
```typescript
if (
  updatedPhoto
  && String(updatedPhoto.media_type || "") === "video"
  && updatedPhoto.original_storage_path
  && !updatedPhoto.stream_uid
  && shouldRouteToStream(updatedPhoto) // <-- Conditioned routing!
) {
  c.executionCtx.waitUntil(beginStreamIngest(env, {
    id: photoId,
    filename: typeof updatedPhoto.filename === "string" ? updatedPhoto.filename : null,
    original_storage_path: String(updatedPhoto.original_storage_path),
    video_duration_seconds: Number(updatedPhoto.video_duration_seconds) || null,
  }));
}
```

---

## Phase 4: Frontend Video Player & Minimal Preview Badge

### 4.1 Update `PIXNXT/src/lib/photoDisplayUrl.js`:
- For Tier 1 videos where `shouldRouteToStream` is false (`stream_uid` is null), `getPhotoVideoSrc(photo)` already correctly falls back to `photo.full_url` / R2 media URL.
- Add helper: `export function isVideoPreviewClip(photo) { return Boolean(photo?.stream_is_preview); }`

### 4.2 Update `PIXNXT/src/components/features/Gallery/GalleryVideo.jsx`:
Add a minimal, unobtrusive pill badge for preview films with a discrete direct download trigger:

```jsx
// Inside GalleryVideo render:
const isPreview = Boolean(photo?.stream_is_preview);
const durationMin = Math.round((Number(photo?.video_duration_seconds) || 0) / 60);

return (
  <div className="relative group/video w-full">
    {/* Video Element */}
    <video ... />

    {/* Minimal, discreet preview indicator */}
    {isPreview && (
      <div className="absolute bottom-14 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="text-xs px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-stone-300 font-medium tracking-wide">
          3-min preview • Full film ({durationMin > 0 ? `${durationMin}m` : 'Original'}) available for download
        </span>
      </div>
    )}
  </div>
);
```

---

## Phase 5: Verification & Testing Checklist

- [ ] **Unit Test / Probe Test:**
  - Drop a standard 10-second MP4 $\rightarrow$ verify probe extracts duration and dimensions.
  - Drop an unsupported format (or mock error) $\rightarrow$ verify probe returns `probeOk: false` without throwing.
- [ ] **Tier 1 Direct Playback:**
  - Upload a $30\text{-second}$ MP4 under $120\text{ MB}$.
  - Verify `stream_uid` remains NULL and video plays via R2 HTTP 206 Byte Range streaming.
  - Check Network Tab: Verify 206 Partial Content responses and fast scrubbing.
- [ ] **Tier 2 Highlight Stream:**
  - Upload a 5-minute video.
  - Verify Cloudflare Stream ingests, sets `stream_status = 'ready'`, and plays HLS with adaptive bitrate.
- [ ] **Tier 3 Long Video Clipping:**
  - Upload a video $> 30\text{ minutes}$ (or test with lowered threshold e.g. 5 mins for testing).
  - Verify Cloudflare Stream receives `/clip` request.
  - Verify parent UID is deleted and only the 3-minute clip remains stored.
  - Verify client gallery displays the minimal pill: *"3-min preview • Full film available for download"*.
  - Verify clicking download delivers the full master file from R2.
