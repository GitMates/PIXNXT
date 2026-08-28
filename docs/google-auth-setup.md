# Google login setup (PIXNXT)

PIXNXT uses **Supabase Auth** for “Continue with Google”. The button in the app is already wired — you only need to configure Google Cloud and Supabase once.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**.
2. Choose **External**, fill in app name (PIXNXT), support email, and save.
3. Under **Test users**, add your Google email while testing (or **Publish app** for any Google account).
4. Go to **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**.
5. Set:
   - **Authorized JavaScript origins**
     - `http://localhost:5173`
     - `https://www.pixnxt.in` (production)
   - **Authorized redirect URIs**
     - `https://oibvtecxxoqhvyejovsy.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client secret**.

> You can reuse the same OAuth client as `VITE_GOOGLE_CLIENT_ID` (Google Drive). Just add the Supabase callback URL above to **Authorized redirect URIs**.

## 2. Supabase Dashboard

Project: `oibvtecxxoqhvyejovsy`

1. **Authentication** → **Providers** → **Google** → Enable.
2. Paste **Client ID** and **Client secret** from step 1.
3. **Authentication** → **URL configuration**:
   - **Site URL**: `http://localhost:5173` (local) or `https://www.pixnxt.in` (production)
   - **Redirect URLs** (add both):
     - `http://localhost:5173/auth`
     - `https://www.pixnxt.in/auth`

## 3. Test locally

1. Restart the dev server: `npm run dev`
2. Open `http://localhost:5173/auth`
3. Click **Continue with Google**
4. Pick your Google account → you should land back on `/auth` and then `/dashboard`

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Button says “Redirecting…” but nothing happens | Fixed in code — pull latest; OAuth now calls `window.location.assign(data.url)`. |
| “Provider is not enabled” | Enable Google under Supabase → Authentication → Providers. |
| `redirect_uri_mismatch` | Add `https://oibvtecxxoqhvyejovsy.supabase.co/auth/v1/callback` in Google Cloud redirect URIs. |
| `access_denied` / 403 | Add your email under OAuth consent **Test users**, or publish the app. |
| Returns to `/auth` but not logged in | Add `http://localhost:5173/auth` to Supabase **Redirect URLs**. |

## Notes

- `VITE_GOOGLE_CLIENT_ID` in `.env` is for **Google Drive downloads** in the gallery, not for studio login.
- Studio login credentials live in **Supabase → Google provider** (server-side).
