import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_APEX_IPS = ['216.198.79.1', '76.76.21.21'];

function normalizeDomain(input: string): string {
  let value = String(input || '').trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.split('/')[0];
  value = value.split(':')[0];
  return value.replace(/\.$/, '');
}

function normalizeCnameTarget(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

function parseIpList(raw: string | undefined): string[] {
  return String(raw || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

async function resolveDns(name: string, type: 'CNAME' | 'A'): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const answers = Array.isArray(json?.Answer) ? json.Answer : [];
  return answers
    .filter((entry: { type?: number }) => entry?.type === (type === 'CNAME' ? 5 : 1))
    .map((entry: { data?: string }) => normalizeCnameTarget(entry?.data || ''))
    .filter(Boolean);
}

function cnameMatches(value: string, target: string): boolean {
  return value === target || value.endsWith(`.${target}`);
}

async function verifyDomainPointsToPlatform(
  domain: string,
  cnameTarget: string,
  apexIps: string[],
): Promise<{ ok: boolean; message: string }> {
  const normalizedDomain = normalizeDomain(domain);
  const target = normalizeCnameTarget(cnameTarget);

  const cnames = await resolveDns(normalizedDomain, 'CNAME');
  if (cnames.some((c) => cnameMatches(c, target))) {
    return { ok: true, message: 'CNAME record verified.' };
  }

  for (const cname of cnames) {
    const chained = await resolveDns(cname, 'CNAME');
    if (chained.some((c) => cnameMatches(c, target))) {
      return { ok: true, message: 'CNAME record verified.' };
    }
  }

  // Apex / CNAME flattening: A records should match the CNAME target (or Vercel anycast).
  const domainAs = await resolveDns(normalizedDomain, 'A');
  const targetAs = await resolveDns(target, 'A');
  const allowed = new Set([...targetAs, ...apexIps]);
  if (domainAs.some((ip) => allowed.has(ip))) {
    return { ok: true, message: 'A record verified.' };
  }

  return {
    ok: false,
    message: `We could not find a CNAME for ${normalizedDomain} pointing to ${target}. Add the DNS record, wait up to 48 hours for propagation, then try again. If you use Cloudflare, set the record to DNS only (grey cloud), not proxied.`,
  };
}

type VercelAttachResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
};

function vercelApiBase(teamId: string): string {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

async function attachDomainToVercel(domain: string): Promise<VercelAttachResult> {
  const token = Deno.env.get('VERCEL_TOKEN') || '';
  const projectId = Deno.env.get('VERCEL_PROJECT_ID') || '';
  const teamId = Deno.env.get('VERCEL_TEAM_ID') || '';
  const skip = String(Deno.env.get('GALLERY_SKIP_HOST_ATTACH') || '') === 'true';

  if (skip) {
    return { ok: true, skipped: true, message: 'Hosting attach skipped.' };
  }

  if (!token || !projectId) {
    return {
      ok: false,
      message:
        'DNS looks correct, but this domain could not be attached for SSL yet. PIXNXT hosting is not configured (missing VERCEL_TOKEN / VERCEL_PROJECT_ID).',
    };
  }

  const qs = vercelApiBase(teamId);
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${qs}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    },
  );

  if (res.ok || res.status === 409) {
    return {
      ok: true,
      message: 'Domain attached. SSL certificate will generate automatically (usually minutes, up to 24 hours).',
    };
  }

  const body = await res.text();
  console.error('Vercel domain attach failed:', res.status, body);
  return {
    ok: false,
    message:
      'DNS looks correct, but we could not attach this domain for HTTPS yet. Try again in a few minutes.',
  };
}

async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = Deno.env.get('VERCEL_TOKEN') || '';
  const projectId = Deno.env.get('VERCEL_PROJECT_ID') || '';
  const teamId = Deno.env.get('VERCEL_TEAM_ID') || '';
  if (!token || !projectId || !domain) return;

  const qs = vercelApiBase(teamId);
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}${qs}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    console.error('Vercel domain remove failed:', res.status, body);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const cnameTarget = normalizeCnameTarget(
      Deno.env.get('GALLERY_CNAME_TARGET') || 'domain.pixnxt.in'
    );
    const apexIps = [
      ...DEFAULT_APEX_IPS,
      ...parseIpList(Deno.env.get('GALLERY_APEX_IPS')),
    ];

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const action = String(body?.action || 'verify').toLowerCase();
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (action === 'disconnect') {
      const { data: current } = await supabaseAdmin
        .from('photographers')
        .select('custom_domain')
        .eq('id', user.id)
        .maybeSingle();

      const existing = normalizeDomain(current?.custom_domain || body?.domain || '');
      if (existing) {
        await removeDomainFromVercel(existing);
      }

      const { error: clearError } = await supabaseAdmin
        .from('photographers')
        .update({
          custom_domain: null,
          custom_domain_status: 'none',
          custom_domain_verified_at: null,
        })
        .eq('id', user.id);

      if (clearError) throw clearError;

      return new Response(
        JSON.stringify({
          verified: false,
          status: 'none',
          domain: null,
          message: 'Custom domain removed.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = normalizeDomain(body?.domain);
    if (!domain || !domain.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Enter a valid subdomain (e.g. gallery.yourdomain.com).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: taken, error: takenError } = await supabaseAdmin
      .from('photographers')
      .select('id')
      .ilike('custom_domain', domain)
      .neq('id', user.id)
      .maybeSingle();

    if (takenError) throw takenError;
    if (taken) {
      return new Response(
        JSON.stringify({ error: 'This domain is already connected to another account.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verification = await verifyDomainPointsToPlatform(domain, cnameTarget, apexIps);
    let hostAttach: VercelAttachResult = {
      ok: false,
      message: verification.message,
    };

    if (verification.ok) {
      hostAttach = await attachDomainToVercel(domain);
    }

    const verified = verification.ok && hostAttach.ok;
    const patch = verified
      ? {
          custom_domain: domain,
          custom_domain_status: 'verified',
          custom_domain_verified_at: new Date().toISOString(),
        }
      : {
          custom_domain: domain,
          custom_domain_status: 'pending',
          custom_domain_verified_at: null,
        };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('photographers')
      .update(patch)
      .eq('id', user.id)
      .select('custom_domain, custom_domain_status, custom_domain_verified_at')
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        verified,
        message: verified
          ? hostAttach.message
          : verification.ok
            ? hostAttach.message
            : verification.message,
        domain: updated?.custom_domain,
        status: updated?.custom_domain_status,
        verifiedAt: updated?.custom_domain_verified_at,
        cnameTarget,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-custom-domain error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Verification failed.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
