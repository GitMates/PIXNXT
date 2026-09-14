// scripts/pages-deploy.mjs
// Usage: npm run pages:deploy
// - MUST only run from the frontend root folder (C:\PCfiles\pic project\album\PIXNXT)
// - ALWAYS deploys to Cloudflare Pages project `pixnxt` on production branch `main`
import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_NAME = 'pixnxt';
const PRODUCTION_BRANCH = 'main';
const BUILD_DIR = 'dist';

function fail(msg) {
  console.error(`\n[pages:deploy] ERROR: ${msg}\n`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`\n[pages:deploy] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

// 1. Root-only guard: must run from frontend root
const cwd = process.cwd();
const pkgPath = join(cwd, 'package.json');
const viteConfig = join(cwd, 'vite.config.js');
const srcDir = join(cwd, 'src');
const indexHtml = join(cwd, 'index.html');

if (!existsSync(pkgPath) || !existsSync(viteConfig) || !existsSync(srcDir) || !existsSync(indexHtml)) {
  fail(
    `This command must only run from the frontend root folder.\n` +
    `You ran it from: ${cwd}\n` +
    `Expected files not found (package.json + vite.config.js + src/ + index.html).\n` +
    `cd into the PIXNXT frontend root first, then run: npm run pages:deploy`
  );
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch {
  fail(`Could not read package.json in ${cwd}`);
}
if (pkg?.name !== 'pixnxt') {
  fail(`Not the PIXNXT frontend root (package.json name is "${pkg?.name}", expected "pixnxt"). Aborting.`);
}
console.log(`[pages:deploy] Frontend root OK: ${cwd}`);

// 2. Enforce local git branch == main (so we only ship production from main)
try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8', shell: true }).trim();
  console.log(`[pages:deploy] Local git branch: ${branch || '(detached)'}`);
  if (branch && branch !== PRODUCTION_BRANCH && process.env.PAGES_DEPLOY_ALLOW_NON_MAIN !== '1') {
    fail(
      `You are on branch "${branch}", but production deploys must come from "${PRODUCTION_BRANCH}".\n` +
      `Switch first: git checkout ${PRODUCTION_BRANCH}\n` +
      `(Override only for testing: PAGES_DEPLOY_ALLOW_NON_MAIN=1 npm run pages:deploy)`
    );
  }
} catch {
  console.log('[pages:deploy] WARN: could not detect git branch, continuing (wrangler will still deploy to main).');
}

// 3. Build (picks up local .env VITE_* at build time)
run('npm run build');

// 4. Verify build output + SPA fallback
if (!existsSync(join(cwd, BUILD_DIR, 'index.html'))) {
  fail(`Build output missing: ${BUILD_DIR}/index.html not found after build.`);
}
// Ensure dist/_redirects exists (Vite copies public/_redirects automatically)
const distRedirects = join(cwd, BUILD_DIR, '_redirects');
if (!existsSync(distRedirects)) {
  const pubRedirects = join(cwd, 'public', '_redirects');
  if (existsSync(pubRedirects)) {
    copyFileSync(pubRedirects, distRedirects);
    console.log('[pages:deploy] Copied public/_redirects -> dist/_redirects');
  } else {
    fail('Missing SPA fallback: dist/_redirects not found. Add public/_redirects with "/* /index.html 200".');
  }
}

// 5. Deploy to Pages production (branch=main => production deployment, not preview)
run(`npx wrangler pages deploy ${BUILD_DIR} --project-name=${PROJECT_NAME} --branch=${PRODUCTION_BRANCH}`);

console.log(`\n[pages:deploy] Done -> Cloudflare Pages project "${PROJECT_NAME}" (production, branch=${PRODUCTION_BRANCH})\n`);
