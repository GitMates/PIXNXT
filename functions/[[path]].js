/**
 * Pages Function: restores the Vercel-era rewrites on Cloudflare Pages.
 * Crawler/OG pages, cover images, PWA manifest+icons, and the crash-report
 * fallback live in the Workers API (/v1/public/...) — this proxies them under
 * their public paths. Everything else falls through to the SPA/assets.
 */

import { crashQueryGateStatus, hasBearerToken, jsonError } from "./crashQueryGate.js";

const DEFAULT_API = "https://pixnxt-api.pixnxt.workers.dev";

/** Same list as the Worker's public.ts — only crawlers get OG HTML. */
const CRAWLER_RE = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|pinterest|googlebot|bingbot/i;

function apiOrigin(env) {
  const raw = String(env.API_ORIGIN || env.VITE_API_URL || DEFAULT_API).trim();
  return raw.replace(/\/+$/, "");
}

function forward(origin, path, request) {
  const url = new URL(request.url);
  const target = `${origin.replace(/\/+$/, "")}${path}${url.search}`;
  const init = {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  return fetch(target, init);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const api = apiOrigin(env);

  if (path === "/api/crash-report") {
    const crash = String(env.CRASH_WORKER_URL || env.VITE_CRASH_WORKER_URL || "").trim().replace(/\/+$/, "");
    if (!crash) return new Response(null, { status: 204 });
    return forward(crash, "/report", request);
  }

  // Admin Crash Report live tab — inject ADMIN_TOKEN server-side (never ship in Vite bundle).
  // Caller must already be an authenticated PIXNXT admin; otherwise this would
  // hand crash dumps to anyone who can hit the Pages Function.
  if (path === "/api/crash-query" && request.method === "GET") {
    const crash = String(env.CRASH_WORKER_URL || env.VITE_CRASH_WORKER_URL || "").trim().replace(/\/+$/, "");
    if (!crash) {
      return jsonError(503, "CRASH_WORKER_URL not configured");
    }
    const bearer = hasBearerToken(request.headers);
    let adminStatus = 0;
    if (bearer) {
      try {
        const check = await fetch(`${api}/v1/admin/who-emails`, {
          method: "GET",
          headers: {
            Authorization: request.headers.get("Authorization") || "",
            Accept: "application/json",
          },
        });
        adminStatus = check.status;
      } catch {
        adminStatus = 503;
      }
    }
    const gate = crashQueryGateStatus({ hasBearer: bearer, adminStatus });
    if (gate !== 0) {
      const message = gate === 401 ? "Authentication required" : gate === 403 ? "Admin access required" : "Crash query unavailable";
      return jsonError(gate, message);
    }
    const target = new URL(`${crash}/query`);
    url.searchParams.forEach((v, k) => {
      if (k !== "token") target.searchParams.set(k, v);
    });
    const token = String(env.CRASH_ADMIN_TOKEN || env.ADMIN_TOKEN || "").trim();
    if (token) target.searchParams.set("token", token);
    return fetch(target.toString(), { method: "GET", headers: { Accept: "application/json" } });
  }

  let m;
  if ((m = path.match(/^\/gallery\/([^/]+)\/cover\.jpg$/))) {
    return forward(api, `/v1/public/gallery/${m[1]}/cover.jpg`, request);
  }
  if ((m = path.match(/^\/gallery\/([^/]+)\/og-[^/]+\.jpg$/))) {
    return forward(api, `/v1/public/gallery/${m[1]}/cover.jpg`, request);
  }
  if ((m = path.match(/^\/album-preview\/([^/]+)\/cover\.jpg$/))) {
    return forward(api, `/v1/public/album/${m[1]}/cover.jpg`, request);
  }
  if ((m = path.match(/^\/album-preview\/([^/]+)\/og-[^/]+\.jpg$/))) {
    return forward(api, `/v1/public/album/${m[1]}/cover.jpg`, request);
  }
  if ((m = path.match(/^\/m\/([^/]+)\/manifest\.json$/))) {
    return forward(api, `/v1/public/m/${m[1]}/manifest.json`, request);
  }
  if ((m = path.match(/^\/m\/([^/]+)\/(?:icon-192|icon-512|apple-touch-icon)\.png$/))) {
    return forward(api, `/v1/public/m/${m[1]}/icon`, request);
  }

  // Share pages without ?app are crawler/OG entry points. Browsers must fall
  // through to the SPA — proxying them would hit the API's browser redirect and
  // bounce the visitor to the API's PUBLIC_SITE_URL (i.e. production).
  const ua = request.headers.get("user-agent") || "";
  if (CRAWLER_RE.test(ua) && !url.searchParams.has("app")) {
    if ((m = path.match(/^\/gallery\/([^/]+)\/?$/))) {
      return forward(api, `/v1/public/gallery/${m[1]}/og`, request);
    }
    if ((m = path.match(/^\/album-preview\/([^/]+)\/?$/))) {
      return forward(api, `/v1/public/album/${m[1]}/og`, request);
    }
  }

  return next();
}
