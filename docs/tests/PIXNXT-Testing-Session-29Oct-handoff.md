# PIXNXT — Testing session 29 Oct 2026 (handoff)

Supersedes the "where testing stands" and "upload speed" sections of `PIXNXT-Testing-Kickoff-handoff.md`. Those were read from `main`, and production is not `main`.

## Corrections to the kickoff doc

- **Live = `cloudflare-migration` (or something built from it).** The live bundle calls `/v1/r2/direct` and the API Worker at `pixnxt-api.pixnxt.workers.dev`. Sam still needs to confirm the exact commit.
- **Tests exist on that branch:** Vitest (20 files / 165 tests, all passing), a Playwright smoke spec (`tests/e2e/workers-smoke.spec.ts`), and a `pixnxt-test` Pages project (`npm run pages:deploy:test`), which is probably staging.
- **Upload fixes A, C and D are already done there:** the original PUT starts immediately (`overlapOriginal`), a 6-worker `derivativeEncodePool` handles encoding, and default quality is `original`, so there's no re-encode. B is partly done: sharpening still defaults on, but runs in the worker. Dropped from the to-do list.
- **The API Worker source is not in this repo.** Auth, rate limits, quotas and DB security (RLS-equivalent) can't be code-reviewed until Sam shares it.

## Security watchlist: results

| # | Status | Finding |
|---|---|---|
| 1 | **CRITICAL, LIVE** | R2 access key ID and secret are in the live bundle (`/assets/index-fo8nTpqA.js`) via `src/lib/r2.js`, used by `uploadViaClientDirect` in `storage.service.js`. Rotate the key, remove `VITE_R2_*` from the deploy machine's `.env`, redeploy. |
| 2 | **HIGH** (code) | Stored XSS: photographer Terms/Privacy HTML is rendered unsanitised on public `GalleryView` and `CollectionList`. Open signup makes this exploitable. **Patch 02.** |
| 3 | HIGH (code, not deployed) | `functions/[[path]].js` `/api/crash-query` injects `ADMIN_TOKEN` for any GET with no caller auth. Live currently returns the SPA shell, so it's not reachable today. Fix before it deploys. |
| 4 | MEDIUM | Quota enforcement is client-side and fails open: missing or invalid limits mean unlimited. Legacy disabled → unlimited bug fixed in **patch 01**. Server enforcement unverified. |
| 5 | MEDIUM | `/v1/emails/order-placed` accepts unauthenticated POSTs (needs only `orderId`), so it could be used to spam emails. |
| 6 | LOW / process | `.wrangler/tmp` build output, `test-results/` and a Word lock file `~$…docx` are committed. Production deploys run from a laptop with `--commit-dirty=true`, with no CI. `.env.production` holds public values only (Razorpay `rzp_test` key, fine for beta). |
| ✓ | FIXED live | `/v1/r2/direct`, `/v1/photo-ai/*`, `/v1/admin/*` and `/v1/emails/share-*` all return 401 without auth. The API Worker doesn't grant CORS to foreign origins. (Kickoff findings 2–3 and CORS #4 are resolved on live.) |

Not tested, to avoid touching production: whether the leaked R2 key works, and rate limits.

## Patches delivered (`~/Projects/pixnxt/_claude-patches/`, git-excluded)

1. `01-quota-tests-and-disabled-limit-fix.patch` — 17 quota tests, the one-line fix, and `npm test` now runs the two orphaned node:test files.
2. `02-sanitize-photographer-html.patch` — DOMPurify sanitiser at all 4 render sites plus 11 tests.

Both verified on a fresh export of `cloudflare-migration` @ 02a85cf6: apply cleanly, 192 tests pass, build passes.

## Environment notes

- `device_bash` on the Mac works with Node 22 / npm 10. `npm ci`, `vitest`, `vite build` and `vite dev` all run.
- Always work in a scratch export (`git archive origin/<branch> | tar -x -C ~/work/...`), never `npm install` inside `~/Projects/pixnxt`. The shell is a Linux VM, so its native binaries would break the Mac's `node_modules`.
- Local remote refs were last fetched before Sam's 29 Oct push (newest `cloudflare-migration` commit seen: 28 Oct). Kharthik to `git fetch`.

## Next

1. Sam: rotate R2 key (today), confirm the live commit, share API Worker source, give `pixnxt-test` URL + 2 test accounts.
2. Devs: apply patches 01–02 and fix the crash-query proxy before it deploys.
3. Then: E2E on staging (sign up → delivery → upload → share → guest → download; face-match; proofing), crash-report root-cause grouping, review the `hybrid-video-delivery` diff.
4. Upload speed: measure on staging against the ≥120 Mbps target before changing more code.
