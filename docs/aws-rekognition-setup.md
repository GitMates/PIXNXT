# AWS Face Recognition (Rekognition) — PIXNXT

PIXNXT uses **Amazon Rekognition** for face detection, indexing, and matching. All AWS calls run **server-side** (Vercel API routes in production, Vite dev middleware locally). **Never** put AWS credentials in the browser or in `VITE_*` env vars.

This document covers setup, architecture, and how the two face products in PIXNXT work.

---

## What PIXNXT uses Rekognition for

| Product | User-facing name | When Rekognition runs |
|---------|------------------|------------------------|
| **Photo AI** | People strip + “find yourself” in client galleries | On photo upload (index) + on selfie search |
| **Guest Delivery** | QR registration → personal photo links | **At publish only** (batch index + match all guests) |

Both products share the same server modules. Each delivery or guest-delivery event gets its own Rekognition **face group** (AWS calls this a `Collection`).

---

## Architecture

```
Browser (selfie / upload)
        │
        ▼
Vercel API routes  api/rekognition/*  api/photo-ai/*  api/guest-delivery/*
        │                    (mirrored locally by server/devApiMiddleware.js)
        ▼
Node server (server/rekognition/, server/photoAi/, server/guestDelivery/)
        │
        ├──► AWS Rekognition  (IndexFaces, SearchFacesByImage, SearchFaces, …)
        │
        ├──► Supabase         (photos, guests, matches, AI metadata cache)
        │
        └──► Cloudflare R2    (guest selfie storage — S3-compatible, not AWS S3)
```

**Important:** Rekognition receives **raw image bytes** downloaded from photo URLs or R2. Photos are not stored in AWS S3 for face matching.

---

## Face groups (AWS Collections)

PIXNXT uses the term **face group**. AWS Rekognition uses **Collection**.

| Concept | AWS API name | PIXNXT ID format |
|---------|--------------|------------------|
| Face group | `CollectionId` | `pixnxt-{deliveryOrEventUuid}` |
| Indexed photo link | `ExternalImageId` | Photo UUID from Supabase |
| Indexed face | `FaceId` | Returned by Rekognition |

Helper: `rekognitionDeliveryId()` in `server/photoAi/indexPhoto.js`.

Dev/test fallback collection: `pixnxt-dev-test`.

---

## AWS setup

### 1. Create an IAM user

1. Open **AWS Console → IAM → Users → Create user**.
2. Name it `rekognition-user` (or any name — update `.env` accordingly).
3. **Do not** attach broad policies like `AmazonRekognitionFullAccess` in production unless you accept that scope.
4. Attach the project policy from:

   `docs/aws-rekognition-iam-policy.json`

   Allowed actions:

   - `DetectLabels`, `DetectFaces`
   - `IndexFaces`, `SearchFaces`, `SearchFacesByImage`
   - `CreateCollection`, `DeleteCollection`, `DescribeCollection`, `ListCollections`
   - `ListFaces`, `DeleteFaces`

5. Create an **access key** for programmatic access. Store the key ID and secret securely.

### 2. Choose a region

Set `AWS_REGION` to a Rekognition-supported region. Default in this project: **`us-east-1`**.

Use the same region for all environments (dev/staging/prod) unless you intentionally split collections by region.

### 3. Add environment variables

**Server-only** — no `VITE_` prefix:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

Also required for guest delivery and Photo AI server routes:

```env
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Guest **selfie upload** uses Cloudflare R2 (not AWS):

```env
VITE_R2_ACCOUNT_ID=...
VITE_R2_ACCESS_KEY_ID=...
VITE_R2_SECRET_ACCESS_KEY=...
VITE_R2_BUCKET_NAME=...
VITE_R2_PUBLIC_URL=https://...
```

Copy from `.env.example` and fill in values. On Vercel, set the same vars in **Project → Settings → Environment Variables**.

---

## End-to-end flows

### Guest Delivery (QR → match → personal gallery)

1. **Guest registers** at `/e/{slug}/register`
   - Submits name, contact, and a selfie (client compresses via `src/lib/selfieImageForRekognition.js`, max 5 MB).
   - `POST /api/guest-delivery/register` uploads selfie to **R2**, inserts row in `event_guests` with `delivery_status = pending`.
   - **No Rekognition call at registration.**

2. **Photographer publishes** the event
   - `POST /api/guest-delivery/publish` with photographer JWT.
   - Deletes old `event_guest_matches`.
   - **Resets** Rekognition face group for the event (`DeleteCollection` + `CreateCollection`).
   - **Indexes** every event photo (`IndexFaces`, `ExternalImageId = photo.id`).
   - For each guest: loads selfie from R2, runs `SearchFacesByImage` with **stepped thresholds** (event threshold, then 85 → 80 → 75 → 70).
   - Writes matches to `event_guest_matches`; updates guest `delivery_status` (`matched`, `no_match`, or `failed`).

3. **Guest opens personal gallery** at `/e/{slug}/g/{accessToken}`
   - `POST /api/guest-delivery/gallery` returns matched photos sorted by similarity.

4. **Optional email** — Supabase Edge Function `send-guest-delivery-email` sends the personal link (no Rekognition).

### Photo AI (client gallery people + selfie search)

1. **Upload** — after photos land in a delivery, `photoAiUploadPipeline` calls `POST /api/photo-ai/index`.
2. **Index** — `IndexFaces` into `pixnxt-{collectionId}`; labels + face boxes cached in `photo_ai_metadata`.
3. **Cluster** — debounced `POST /api/photo-ai/recluster` groups faces into people (`photo_ai_people`).
4. **Selfie search** — guest or client uploads a selfie:
   - Studio: `POST /api/photo-ai/search-selfie`
   - Public published gallery: `POST /api/photo-ai/public/search-selfie`

---

## Match thresholds

| Setting | Location | Default |
|---------|----------|---------|
| Per-event threshold | `guest_delivery_events.match_threshold` | **85** (clamped 70–99) |
| Stepped fallback | `server/guestDelivery/matchGuestSelfie.js` | Tries event value, then 85, 80, 75, 70 |
| Studio defaults UI | `photographers.face_matching_defaults` | `strict` / `balanced` (stored; wire to events as needed) |

Higher threshold = fewer false positives, more missed faces. Guest Delivery favours **not sending a stranger’s photo** over catching every angle.

---

## API endpoints

### Rekognition (dev / smoke test)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/rekognition/analyze` | Raw label + face index test |

Body: `{ imageBase64, deliveryFaceGroupId?, indexFaces? }`

Dev UI: `/dev/rekognition` (`src/pages/dev/RekognitionTest.jsx`).

### Photo AI

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/photo-ai/index` | Index one photo |
| POST | `/api/photo-ai/sync-collection` | Index missing photos in a collection |
| POST | `/api/photo-ai/recluster` | Rebuild people clusters |
| POST | `/api/photo-ai/people` | Read cached people list |
| POST | `/api/photo-ai/search-selfie` | Selfie search (authenticated) |
| POST | `/api/photo-ai/public/search-selfie` | Selfie search (published gallery) |

### Guest Delivery

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/guest-delivery/register` | Guest registration + selfie upload |
| POST | `/api/guest-delivery/publish` | Index photos + match all guests |
| POST | `/api/guest-delivery/gallery` | Personal matched gallery |
| POST | `/api/guest-delivery/send-email` | Email personal gallery link |

Request body limit: **6 MB** (selfie payloads).

---

## Database tables

### Guest Delivery

| Table | Purpose |
|-------|---------|
| `guest_delivery_events` | Event config, `slug`, `status`, `match_threshold`, `collection_id` |
| `guest_delivery_photos` | Standalone event photos (when not linked to a collection) |
| `event_guests` | Registered guests, `selfie_url`, `selfie_storage_path`, `access_token`, `delivery_status` |
| `event_guest_matches` | Publish-time matches: `guest_id`, `photo_id`, `face_id`, `similarity` |

`delivery_status` values: `pending`, `matching`, `matched`, `sent`, `no_match`, `failed`.

### Photo AI

| Table | Purpose |
|-------|---------|
| `photo_ai_metadata` | Per-photo labels + face bounding boxes |
| `photo_ai_people` | Cached people clusters |
| `photo_ai_cluster_state` | Staleness tracking for recluster |

Migrations: `supabase/migrations/20260708120000_photo_ai_metadata.sql`, `20260710120000_photo_ai_people.sql`, `20260712100000_guest_delivery.sql`.

---

## Local development

1. Copy `.env.example` → `.env` and set AWS + Supabase + R2 vars.
2. Run `npm run dev` — Vite loads `server/devApiMiddleware.js`, which mirrors production API routes.
3. Open `/dev/rekognition` to send a test image through `analyze`.
4. For full guest delivery flow, create an event in the app, register a test guest, upload photos, then **Publish**.

If you see `Missing AWS credentials`, the server process does not have `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in its environment.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Missing AWS credentials` | Env vars not loaded on server | Set vars in `.env` locally or Vercel dashboard |
| `AccessDeniedException` | IAM policy too narrow | Attach `docs/aws-rekognition-iam-policy.json` |
| `No face detected in the selfie` | Poor lighting, profile shot, or obstruction | Ask for a clear front-facing photo |
| `Could not index photos for face matching` | Bad photo URLs or AWS error | Check photo `full_url` is reachable from server; verify AWS creds |
| Publish: `No faces were detected` | Event photos have no visible faces | Use clearer event photos |
| Matches empty but faces visible | Threshold too high | Lower `match_threshold` on the event (70–99) |
| Registration works, publish fails | Missing `SUPABASE_SERVICE_ROLE_KEY` | Set service role key for server routes |
| Selfie upload fails | R2 not configured | Set R2 env vars (separate from AWS) |

---

## Key source files

| Path | Role |
|------|------|
| `server/rekognition/analyzeImage.js` | Core Rekognition: labels + `IndexFaces` |
| `server/photoAi/indexPhoto.js` | Index delivery photos, `rekognitionDeliveryId()` |
| `server/photoAi/searchBySelfie.js` | `SearchFacesByImage` |
| `server/photoAi/clusterFaces.js` | People clustering via `SearchFaces` |
| `server/guestDelivery/publishEvent.js` | Publish pipeline |
| `server/guestDelivery/matchGuestSelfie.js` | Stepped threshold guest matching |
| `server/guestDelivery/registerGuest.js` | Guest registration (R2 selfie, no AWS) |
| `server/guestDelivery/rekognitionCollection.js` | Reset face group on publish |
| `server/devApiMiddleware.js` | Local API mirror |
| `api/photo-ai/[...path].js` | Photo AI Vercel routes |
| `api/guest-delivery/[...path].js` | Guest delivery Vercel routes |
| `src/lib/selfieImageForRekognition.js` | Client selfie resize (≤5 MB) |
| `docs/aws-rekognition-iam-policy.json` | IAM policy to attach |

---

## Security notes

- AWS keys must **only** exist on the server (Vercel env, local `.env`, CI secrets).
- Guest registration and gallery endpoints use the **Supabase service role** server-side; do not expose it to the client.
- Guest personal galleries are gated by `access_token` (unguessable link), not by AWS.
- Face data in Rekognition collections is tied to your AWS account and region — include face matching in your studio **Legal & consent** copy (`Profile → Legal & consent` in the app).

---

## Related settings in the app

**Settings → Delivering photos → Face matching** stores studio defaults in `photographers.face_matching_defaults` (jsonb).

**Settings → Delivering photos → Guest Delivery** stores defaults in `photographers.guest_delivery_defaults` (jsonb).

Per-delivery overrides live on individual deliveries and `guest_delivery_events` rows.
