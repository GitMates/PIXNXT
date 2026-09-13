// Workers-migration smoke suite. Frontend must be running (`npm run dev`).
// Optional: PIXNXT_TEST_EMAIL + PIXNXT_TEST_PASSWORD enable the logged-in test.
import { test, expect } from '@playwright/test';

const API = 'https://pixnxt-api.pixnxt.workers.dev';
const TEST_SLUG = 'jobbie-mpb0gnbn'; // published delivery in prod D1

test('api health is up', async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.env).toBe('production');
});

test('public gallery data served by worker', async ({ request }) => {
  const res = await request.get(`${API}/v1/public/gallery-by-slug/${TEST_SLUG}`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(JSON.stringify(body).length).toBeGreaterThan(100);
});

test('auth page renders login form', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(page.locator('.auth-submit')).toContainText('Log in');
});

test('wrong password shows error (api path live)', async ({ page }) => {
  await page.goto('/auth');
  await page.locator('#login-email').fill('nouser@example.com');
  await page.locator('#login-password').fill('wrongpassword123');
  await page.locator('.auth-submit').click();
  await expect(page.locator('.auth-error')).toBeVisible({ timeout: 15000 });
});

test('google button reaches accounts.google.com with our callback', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('button', { name: /continue with google/i }).click();
  await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 });
  const url = page.url();
  expect(url).toContain('client_id=177957134671-8pkf44glgdqau5uqt95qeqd6fla0djlb.apps.googleusercontent.com');
  expect(url).toContain(encodeURIComponent('https://pixnxt-api.pixnxt.workers.dev/v1/auth/google/callback'));
});

test('public gallery page renders', async ({ page }) => {
  await page.goto(`/gallery/${TEST_SLUG}`);
  // gallery shell renders (player-agnostic: any gallery chrome, no crash/blank)
  await expect(page.locator('body')).not.toBeEmpty();
  await page.waitForTimeout(4000);
  const text = (await page.locator('body').innerText()).toLowerCase();
  expect(text).not.toContain('gallery not found');
  expect(text.length).toBeGreaterThan(50);
});

test('photographer login works (needs PIXNXT_TEST_EMAIL/PASSWORD)', async ({ page }) => {
  test.skip(!process.env.PIXNXT_TEST_EMAIL || !process.env.PIXNXT_TEST_PASSWORD, 'no test credentials');
  await page.goto('/auth');
  await page.locator('#login-email').fill(process.env.PIXNXT_TEST_EMAIL!);
  await page.locator('#login-password').fill(process.env.PIXNXT_TEST_PASSWORD!);
  await page.locator('.auth-submit').click();
  // lands in studio (dashboard) — no longer on /auth
  await expect(page).not.toHaveURL(/\/auth(\?|$)/, { timeout: 30000 });
});
