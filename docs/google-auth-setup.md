# Google login setup (PIXNXT)

PIXNXT uses **Google OAuth → pixnxt.in callback → Supabase session** for “Continue with Google”.  
That way Google shows **your domain** (`www.pixnxt.in`) on the account chooser instead of `*.supabase.co`.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**.
2. Choose **External**, set **App name** to `PIXNXT`, support email, and save.
3. **Authorized domains** → add `pixnxt.in` (verify domain ownership in [Google Search Console](https://search.google.com/search-console) if prompted).
4. **App domain** (recommended):
   - Home page: `https://www.pixnxt.in`
   - Privacy policy / Terms: your live URLs on `pixnxt.in`
5. Under **Test users**, add your Google email while testing — or **Publish app** for any Google account.
6. Go to **Credentials** → your **OAuth client ID** → **Web application** (same client as `VITE_GOOGLE_CLIENT_ID` / Google Drive).
7. Set:
   - **Authorized JavaScript origins**
     - `http://localhost:5173`
     - `https://www.pixnxt.in`
     - `https://pixnxt.in`
   - **Authorized redirect URIs** (studio login — **pixnxt.in**, not Supabase):
     - `http://localhost:5173/auth/google/callback`
     - `https://www.pixnxt.in/auth/google/callback`
     - `https://pixnxt.in/auth/google/callback`
8. Copy **Client ID** and **Client secret**.

> You can keep `https://oibvtecxxoqhvyejovsy.supabase.co/auth/v1/callback` in redirect URIs as a fallback, but studio login no longer uses it when `VITE_GOOGLE_CLIENT_ID` is set.

## 2. Environment variables

**Local `.env`**

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Vercel** (Project → Settings → Environment Variables)

| Name | Where |
|------|--------|
| `VITE_GOOGLE_CLIENT_ID` | Production + Preview + Development |
| `GOOGLE_CLIENT_SECRET` | Production + Preview + Development (server only — no `VITE_` prefix) |

Restart `npm run dev` after changing `.env`.

## 3. Supabase Dashboard

Project: `oibvtecxxoqhvyejovsy`

1. **Authentication** → **Providers** → **Google** → Enable.
2. Paste the **same Client ID** and **Client secret** from step 1 (Supabase validates the Google ID token).
3. **Authentication** → **URL configuration**:
   - **Site URL**: `https://www.pixnxt.in` (production) or `http://localhost:5173` (local)
   - **Redirect URLs**:
     - `http://localhost:5173/auth`
     - `http://localhost:5173/auth/google/callback`
     - `https://www.pixnxt.in/auth`
     - `https://www.pixnxt.in/auth/google/callback`
     - `https://pixnxt.in/auth`
     - `https://pixnxt.in/auth/google/callback`

## 4. Test

1. `npm run dev` → open `http://localhost:5173/auth`
2. Click **Continue with Google**
3. Google should say **“to continue to localhost”** (local) or **“to continue to www.pixnxt.in”** (production)
4. After choosing an account → `/dashboard`

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Still shows `*.supabase.co` | Set `VITE_GOOGLE_CLIENT_ID` in `.env` / Vercel and redeploy. Without it, the app falls back to Supabase OAuth. |
| `redirect_uri_mismatch` | Add exact callback URL (`…/auth/google/callback`) in Google Cloud **Authorized redirect URIs**. |
| `Google OAuth is not configured on the server` | Add `GOOGLE_CLIENT_SECRET` to Vercel (and local `.env`). |
| `access_denied` / 403 | Add your email under OAuth **Test users**, or publish the app. |
| Sign-in succeeds but no Supabase session | Enable Google provider in Supabase with the **same** Client ID + secret. |
| Button stuck on “Redirecting…” | Check browser console; confirm `/api/google-auth` returns 200 locally. |

## Notes

- `VITE_GOOGLE_CLIENT_ID` powers **studio login** and **Google Drive** downloads in galleries.
- The Supabase `*.supabase.co` callback is only used if `VITE_GOOGLE_CLIENT_ID` is missing (legacy fallback).
