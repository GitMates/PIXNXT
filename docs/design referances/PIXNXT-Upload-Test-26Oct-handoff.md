# PIXNXT — Upload test + upload panel fix (handoff)

**Tested:** 26 Oct 2026, 00:30 IST · Chrome on macOS · delivery `00900` → Portraits · 34 JPEGs, 324 MB
**Network:** Airtel mobile (AS24560). Cloudflare speed test: **6.4 Mbps up (≈0.8 MB/s)**, latency 44 ms idle, spiking to 500+ ms under load.
**Method:** browser resource timing on the R2 PUTs and the upload panel's own numbers, sampled every second for about 2 minutes mid-upload.

Single run on a weak mobile link. Treat the numbers as directional, and repeat the test on office fibre before signing off.

---

## Results

| Measure | Value | Read |
|---|---|---|
| Real throughput | **0.54 MB/s (4.3 Mbps)** | About **68%** of the 0.8 MB/s line |
| Uploads in flight at once | **avg 20, peak 30** | Far too many for a 6 Mbps link |
| Time per original file (3–12 MB) | median 33 s, max 69 s | Each file gets ~1/20th of the link |
| Throughput over time (5 s windows) | 0, 0.1, **2.5**, 0, 0.9, 0.1, **1.3**, 0, 0 MB/s | Bursts and stalls, not a steady flow |
| Progress counter going **backwards** | 9 times in 114 s, up to −1.6 MB | Retries resetting progress, or broken accounting |
| Panel speed figure | 0.01 → **7.09 MB/s** | Peak is 9× the line's capacity, so it's not real |
| Requests per photo | 2 (original + client-made thumb) | Doubles request count |

## Verdict

**The concurrency fix overshoots.** 20–30 parallel PUTs help on fast fibre, where each request is held back by latency. On a thin link they fight each other: router buffers fill, latency hits 500 ms, transfers stall and retry, and the link sits idle in between. The result is 68% use of the line plus a progress bar that moves backwards.

## Fix — uploader

1. **Make concurrency adaptive, not fixed.**
   - Start at 4 parallel uploads.
   - Every 5 s, compare throughput with the previous window. If it rose more than 10%, add 1. If it fell, or a request errored or timed out, halve.
   - Floor 2, ceiling 12.
   - This finds about 3–4 on this link and 8–12 on fibre without any configuration.
2. **Count the thumbnail inside the photo's slot.** Upload it after the original, in the same slot, so "4 at a time" means 4 photos, not 4 requests.
3. **Retries:**
   - Exponential backoff with jitter (1 s, 2 s, 4 s, max 3 tries).
   - A retry never subtracts from the overall progress. Progress counts confirmed bytes only, so the bar never moves backwards.
4. **Files over 50 MB, which includes video,** use R2 multipart with 10 MB parts, so a drop only re-sends one part.
5. **Retest:** rerun this exact test on fibre and on a phone hotspot. Targets:
   - ≥ 85% of the speed-test upload figure
   - zero backwards steps
   - no 5 s window at 0 MB/s while files are still queued

## Fix — upload panel

Today: the speed shares a row with Pause/Cancel and gets truncated ("1.4…"). The time-left estimate is the headline. "Uploading 22" counts queued files as uploading. Sizes show as "1084.0 MB".

```
Uploads                                    ⌄ Minimise
K+F → Highlights

162 of 184 photos               about 3 min left
████████████████████████████████████░░░░░
1.08 of 1.34 GB   ·   0.8 MB/s   ·   4 at a time
                                  [Pause]  [Cancel]

[ Uploading 4 ]  [ Waiting 18 ]  [ Done 162 ]
```

- **Stats get their own row**, with no buttons on it, so nothing truncates. Use body ink and tabular numbers.
- **Speed:**
  - a moving average over the last 10 s
  - computed from confirmed bytes, not raw `upload.onprogress` (the browser reports bytes as soon as they enter the socket buffer, which is where 7.09 MB/s comes from)
  - updated once a second, in MB/s, to match file sizes
- **Connection health: status dot + word (decided 26 Oct).** Shown inside the speed pill: `● Fair  0.8 MB/s`. Prototype: `claude/quiet-upload-panel.html`.

  | Level | 10 s speed | Dot / word colour | Note |
  |---|---|---|---|
  | Fast | ≥ 3 MB/s | `--ok-fg` | |
  | Good | 1 – 3 MB/s | `--ok-fg` | |
  | Fair | 0.4 – 1 MB/s | `--warn-fg`, pill `--warn-bg` | |
  | Slow | < 0.4 MB/s | `--stop-fg`, pill `--stop-bg` | dot pulses |
  | Stalled | 0 for 10 s | `--stop-fg`, pill `--stop-bg` | dot pulses |

  The levels are absolute, not relative to the user's best speed. Keep the thresholds in config. **Never show the dot without the word**, at any panel width. The dot alone fails in sunlight and for colour-blind users. Accessible name: "Connection Fair, 0.8 megabytes per second".
- **"4 at a time"** shows the adaptive concurrency's current value.
- **Headline:** "162 of 184 photos" in the display face, with the time left beside it. The time left is based on the same 10 s average.
- **Sizes:** switch to GB above 1,000 MB, with two decimals, and drop the trailing ".0".
- **Tabs:** split into Uploading / Waiting / Done. Uploading only counts files actually being sent.
- **Slow state:** if the 10 s speed drops below 30% of the previous minute's average for more than 10 s, the stat turns warn-coloured and reads "Slow connection". The photographer then knows it's their network.
- **Cancel** asks for confirmation inside the panel: "Stop 22 remaining uploads? The 162 already uploaded stay."

## Acceptance

- [ ] On a 6 Mbps link: ≥ 85% of the speed-test figure, average concurrency ≤ 6
- [ ] On fibre: ≥ 85% of the speed-test figure, concurrency rises on its own
- [ ] Overall progress never decreases, including through forced retries (throttle to offline for 5 s mid-upload)
- [ ] The displayed speed never exceeds the speed-test figure by more than 20%
- [ ] The speed is fully visible at the panel's minimum width
