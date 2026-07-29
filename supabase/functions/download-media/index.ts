import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_R2_BASE = "https://pub-de49e8c7da824ad9af0c9289299d8467.r2.dev";

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\-() ]+/g, "_").trim();
  return cleaned.slice(0, 180) || "download.jpg";
}

function resolveR2Path(rawUrl: string, r2Base: string): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith(r2Base)) {
    return trimmed.slice(r2Base.length).replace(/^\//, "");
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("r2.dev")) {
      return parsed.pathname.replace(/^\//, "");
    }
  } catch {
    /* plain storage path */
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\//, "");
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const r2Base = (Deno.env.get("R2_PUBLIC_URL") || DEFAULT_R2_BASE).replace(/\/+$/, "");
  const sourceUrl = url.searchParams.get("url") || "";
  const pathParam = url.searchParams.get("path") || "";
  const filename = sanitizeFilename(url.searchParams.get("filename") || "download.jpg");

  let target = "";
  if (sourceUrl) {
    const r2Path = resolveR2Path(sourceUrl, r2Base);
    if (!r2Path) {
      return new Response("Invalid download URL", { status: 400, headers: corsHeaders });
    }
    target = `${r2Base}/${r2Path}`;
  } else if (pathParam) {
    const relativePath = pathParam
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        try {
          return decodeURIComponent(seg);
        } catch {
          return seg;
        }
      })
      .join("/");
    if (!relativePath) {
      return new Response("Missing path", { status: 400, headers: corsHeaders });
    }
    target = `${r2Base}/${relativePath}`;
  } else {
    return new Response("Missing path or url", { status: 400, headers: corsHeaders });
  }

  try {
    const upstream = await fetch(target, { headers: { Accept: "*/*" } });
    if (!upstream.ok) {
      return new Response("File not found", { status: upstream.status, headers: corsHeaders });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "public, max-age=300");

    return new Response(buffer, { status: 200, headers });
  } catch (err) {
    console.error("download-media error:", err);
    return new Response("Download failed", { status: 502, headers: corsHeaders });
  }
});
