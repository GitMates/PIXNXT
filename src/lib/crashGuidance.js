/**
 * Plain-language guidance for Crash Report UI.
 * Builds: what happened · how it occurs · which page · how to fix.
 */
import { CRASH_SECTIONS, crashByNo } from './crashTaxonomy';

const SECTION_BY_NUM = Object.fromEntries(
  (CRASH_SECTIONS || []).map((s) => [s.num, s]),
);

/** Route / path hints → human page labels */
const PAGE_RULES = [
  [/\/admin\/crashes|AdminCrashReport/i, 'Admin → Crash Report'],
  [/\/admin|AdminDashboard|AdminUser/i, 'Admin console'],
  [/\/lab|LabOrder|LabDashboard|LabApp/i, 'Print lab'],
  [/printstore|PrintStore|StoreDashboard|TrackOrder/i, 'Print store / shop'],
  [/AlbumEditor|AlbumPreview|AlbumViewer|smart-albums|\/album/i, 'Smart albums / album editor'],
  [/CollectionDashboard|\/collections?\//i, 'Collection dashboard'],
  [/ClientGallery|\/gallery\/|GalleryView|GalleryFavorites/i, 'Client gallery (public)'],
  [/\/m\/|mobile-gallery|MobileGallery|workersMobile/i, 'Mobile gallery PWA'],
  [/\/e\/|guest-delivery|EventDetail|guest\.ts|workersGuest/i, 'Guest delivery'],
  [/PhotoLibrary|\/photos\/library/i, 'Photo library'],
  [/WatermarkEditor|watermarks/i, 'Watermark editor'],
  [/PresetEditor|presets/i, 'Preset editor'],
  [/Settings|AccountSettings|YourAccount/i, 'Studio settings'],
  [/Showcase|\/showcase/i, 'Showcase'],
  [/Auth|\/auth|login|signup|refresh/i, 'Sign-in / auth'],
  [/UploadQueue|upload|prepareUpload/i, 'Upload flow'],
  [/DownloadModal|downloadPhoto|\/downloads|zip/i, 'Download / ZIP'],
  [/proofer|AlbumShare|comment|pin|swap/i, 'Album proofer / share'],
  [/photo-ai|PhotoAi|Rekognition|selfie|Face /i, 'Photo AI / face search'],
  [/domains|custom.?domain/i, 'Custom domain'],
  [/crash-reporter|crashLogger|logCrash/i, 'Crash reporting pipeline'],
  [/Dashboard\.jsx|\/client-gallery|SidebarLayout/i, 'Studio dashboard'],
];

const FAMILY_FIX = {
  user: [
    'Reproduce in a private window and another browser.',
    'Check localStorage / cookies are allowed for this origin.',
    'Confirm VITE_API_URL and custom-domain CORS match the host the user is on.',
  ],
  frontend: [
    'Open DevTools → Console + Network; capture the first red error.',
    'Hard-refresh (or clear site data) to rule out a stale Pages chunk.',
    'If a route is blank, wrap or recover via ErrorBoundary and check App.jsx route coverage.',
  ],
  interact: [
    'Retry the same click/gesture once; note if a double-submit or race is involved.',
    'Disable extensions and retest (ad blockers often break storage or fetch).',
    'Check the failing request in Network for 4xx/5xx body codes.',
  ],
  api: [
    'Inspect the failing `/v1/...` response status and JSON `code` / `message`.',
    'Verify JWT (Authorization) and that the resource ID belongs to this studio.',
    'Check Workers logs / D1 for UNIQUE/FK errors (409 vs 500).',
  ],
  crash: [
    'Use the live event route + reason; map crashNo in Catalog for the intended vector.',
    'Ensure crash detection is ON and VITE_CRASH_WORKER_URL / Pages crash proxy is deployed.',
    'Redeploy frontend if taxonomy Nos look stale vs this Master Report.',
  ],
  d1: [
    'Confirm migrations 0001–0009 applied on remote D1.',
    'Reproduce the write; check for UNIQUE/FK/NOT NULL in Worker logs.',
    'Avoid relying on self-heal for missing core tables — run migrations.',
  ],
  r2: [
    'Confirm MEDIA/DOWNLOADS bindings and path ownership (FORBIDDEN_PATH).',
    'Check object size vs 80MB limit and proxy `/v1/r2/media` CORS.',
    'Verify the key exists in R2 and the gallery/photo row still points at it.',
  ],
  sec: [
    'Treat as security until proven otherwise — check IDOR, rate-limit, and Origin allowlist.',
    'Rotate secrets if anything leaked in query strings or logs.',
    'Tighten CORS / Turnstile / admin token as appropriate.',
  ],
  perf: [
    'Profile main-thread long tasks; reduce concurrency or payload size.',
    'Check Pages deploy size / chunk errors after release.',
    'Throttle uploads/zip/AI jobs on low-memory devices.',
  ],
  auth: [
    'Clear session and sign in again; confirm refresh cookie on this domain.',
    'Check ACCESS_TOKEN_TTL / clock skew and disabled-studio JWT handling.',
    'Verify OAuth / lab session storage is not blocked.',
  ],
  btn: [
    'Reproduce the exact button once with Network open.',
    'Guard the handler with try/catch and disable the button while pending.',
    'Confirm the API the button calls matches the Workers path (not a legacy service).',
  ],
  field: [
    'Validate the field value (slug, email, URL, JSON) against Worker zod rules.',
    'Reject empty/relative URLs and oversized files before upload.',
    'Guard JSON.parse on stored settings with try/catch defaults.',
  ],
  toggle: [
    'Toggle once; confirm the PATCH body and response.',
    'Ensure optimistic UI rolls back on error.',
  ],
  save: [
    'Confirm the save request succeeded (2xx) before showing “Saved”.',
    'Check custom-domain / DNS steps if the save is hostname-related.',
  ],
  send: [
    'Check EMAIL_QUEUE / Resend secrets and outbox status.',
    'Confirm recipient and that the gallery/album still exists (not deleted).',
  ],
  popup: [
    'Close other modals; retry with focus trap / Esc mid-flow in mind.',
    'Ensure unload does not abort an in-flight save.',
  ],
  hidden: [
    'Document the hidden path (shortcut / empty state) and add a visible error toast.',
    'Verify offline / PWA / cookie consent is not blocking the action.',
  ],
  notify: [
    'Check notification fetch/bulk URL length and auth.',
    'Confirm reminder/expiry cron is deployed if timing-related.',
  ],
  settings: [
    'Export current settings JSON; look for corrupt parse keys.',
    'Re-save the section and compare D1 vs localStorage.',
  ],
  profile: [
    'Re-open profile/settings after clearing cached profile keys.',
    'Confirm handle / domain / billing fields pass validation.',
  ],
  func: [
    'Open the file named in “How it occurs” and harden the catch path.',
    'Add logCrash / reportApiError with the catalog crashNo if missing.',
    'Cover with a regression test or manual checklist for that function.',
  ],
  instant: [
    'Reproduce with two tabs; watch BroadcastChannel / localStorage sync.',
    'Ensure optimistic updates roll back when the API fails.',
  ],
  share: [
    'Open the share URL in a private window; confirm slug / gate / domain.',
    'Check paused/draft status before treating as a hard crash.',
  ],
  voice: [
    'Grant mic permission and retest; check MIME support on the device.',
    'Handle permission denial without hanging the UI.',
  ],
  spread: [
    'Save album version; retry the spread/pin/swap on a fresh load.',
    'Watch for CORS on wrap/cover images and WebGL loss on 3D book.',
  ],
  admin: [
    'Confirm your user is in the `admins` table.',
    'Paginate past limit=500 if the studio is missing from the roster.',
    'Use Number(is_disabled)===1 — do not compare to boolean true.',
  ],
  queue: [
    'Inspect queue consumer logs (email / zip / photo-AI).',
    'Check for ack-without-send (return true) vs retry storms (return false).',
    'Confirm cron `*/15` and queue bindings on the Worker.',
  ],
  store: [
    'Clear shop cart localStorage and retry checkout.',
    'Validate product options JSON and coupon conflict codes (400 vs 409).',
  ],
  guest: [
    'Confirm event has photos + registered guests before publish.',
    'Check guest-index settings overwrite and face match queue chain.',
  ],
  ops: [
    'Verify env bindings, migrations, and crashNo ≤ 1000.',
    'Redeploy Pages + API + crash-reporter together after taxonomy changes.',
  ],
};

const CATEGORY_FIX = [
  [/^API|^CRUD|^HTTP/i, [
    'Match status → Catalog (401/403/404/409/429/500) instead of treating everything as No. 78.',
    'Fix the resource ID, auth, or UNIQUE constraint that the API returned.',
  ]],
  [/^Btn-/i, [
    'Disable the button while the request runs; surface the API error in a toast.',
  ]],
  [/^Field-|^Save-/i, [
    'Validate input client-side to match Worker zod; show the field that failed.',
  ]],
  [/^Svc-Upload|^Lib-Upload|^Cmp-Upload/i, [
    'Keep file under 80MB; confirm derivative + original both succeed.',
    'Retry failed queue items; do not hard-reload mid-upload.',
  ]],
  [/^Lib-Download|^Svc-Zip|^API-Download/i, [
    'Reduce gallery size / concurrency; confirm media bytes are images not HTML error pages.',
  ]],
  [/^Crash-|^Func-Crash|^Page-AdminCrash|^Ops-Crash/i, [
    'Set Pages CRASH_WORKER_URL + CRASH_ADMIN_TOKEN; keep crash detection ON.',
    'Redeploy crash-reporter if KV/query auth changed.',
  ]],
  [/^Auth|^User\/Session/i, [
    'Sign out/in; verify cookie SameSite on custom domains.',
  ]],
];

function sectionFamily(sectionNum) {
  return SECTION_BY_NUM[sectionNum]?.family || '';
}

function inferPage({ reason = '', route = '', sectionTitle = '', category = '', name = '' } = {}) {
  const hay = `${route}\n${reason}\n${category}\n${name}\n${sectionTitle}`;
  for (const [re, label] of PAGE_RULES) {
    if (re.test(hay)) return label;
  }
  if (route && route !== '/') return `App route: ${route}`;
  if (sectionTitle) return `Area: ${sectionTitle}`;
  return 'App-wide (no specific page in this event)';
}

function uniqueSteps(steps) {
  const out = [];
  const seen = new Set();
  for (const s of steps) {
    const t = String(s || '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * @param {number|object} crashOrNo — crashNo or taxonomy / enriched row
 * @param {{ route?: string, liveReason?: string }} [live]
 */
export function getCrashGuidance(crashOrNo, live = {}) {
  const base = typeof crashOrNo === 'object' && crashOrNo != null
    ? crashOrNo
    : crashByNo(crashOrNo);

  const no = Number(base.no ?? base.crashNo ?? crashOrNo);
  const ref = crashByNo(no);
  const unknown = !ref.name || ref.name === 'Unknown crash';

  const name = unknown ? (base.crashName || base.name || 'Unknown crash') : ref.name;
  const category = unknown ? (base.category || 'Unknown') : ref.category;
  const reason = (live.liveReason || base.reason || ref.reason || '').trim();
  const signal = (base.signal || ref.signal || '').trim();
  const section = ref.section ?? base.section ?? null;
  const sectionTitle = ref.sectionTitle || base.sectionTitle || SECTION_BY_NUM[section]?.title || '';
  const family = sectionFamily(section);
  const route = live.route || base.route || '';

  const page = inferPage({ reason, route, sectionTitle, category, name });

  const occurs = unknown
    ? (reason || 'No taxonomy entry for this crashNo — inspect the live reason and stack.')
    : reason;

  const fix = [];
  if (unknown) {
    fix.push('Open Catalog and confirm this crashNo exists after regenerating the Master Report.');
    fix.push('If the number is valid, check the worker payload crashName/reason and enrich mapping.');
  } else {
    const famSteps = FAMILY_FIX[family] || FAMILY_FIX.func;
    fix.push(...famSteps);
    for (const [re, steps] of CATEGORY_FIX) {
      if (re.test(category) || re.test(name)) fix.push(...steps);
    }
    if (/401|Authentication required|session expired/i.test(`${name} ${reason}`)) {
      fix.push('Have the user refresh the page or sign in again; confirm refresh cookie on this host.');
    }
    if (/404|not found/i.test(`${name} ${reason}`)) {
      fix.push('Confirm the gallery/album/photo ID still exists and the share link slug is correct.');
    }
    if (/413|too large|80MB|5 GB/i.test(`${name} ${reason}`)) {
      fix.push('Compress or split the file; Worker upload limit is 80MB (ignore “5 GB” UI copy if present).');
    }
    if (/429|rate/i.test(`${name} ${reason}`)) {
      fix.push('Wait and retry; check RATELIMIT KV and avoid bulk loops from the client.');
    }
    if (/409|UNIQUE|already exists|CONFLICT/i.test(`${name} ${reason}`)) {
      fix.push('Pick a unique slug/email/coupon; treat as conflict, not a generic failure.');
    }
    if (/OOM|memory|JSZip|pdf|WebGL/i.test(`${name} ${reason}`)) {
      fix.push('Reduce batch size; close other tabs; avoid full-res canvas/zip on low-memory devices.');
    }
  }

  if (signal) {
    fix.push(`When logging/debugging, capture: ${signal}.`);
  }

  const summary = unknown
    ? `Unmapped crash No. ${no}`
    : `${category}: ${name}`;

  return {
    no,
    summary,
    what: summary,
    howItOccurs: occurs,
    whichPage: page,
    howToFix: uniqueSteps(fix).slice(0, 6),
    category,
    name,
    section,
    sectionTitle,
    family,
    signal,
    route: route || null,
    unknown,
  };
}

export default getCrashGuidance;
