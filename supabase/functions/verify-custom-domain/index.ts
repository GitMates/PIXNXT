import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function verifyDomainPointsToPlatform(domain: string, cnameTarget: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const normalizedDomain = normalizeDomain(domain);
  const target = normalizeCnameTarget(cnameTarget);

  const cnames = await resolveDns(normalizedDomain, 'CNAME');
  if (cnames.some((c) => c === target || c.endsWith(`.${target}`))) {
    return { ok: true, message: 'CNAME record verified.' };
  }

  // Follow one CNAME hop (some providers chain).
  for (const cname of cnames) {
    const chained = await resolveDns(cname, 'CNAME');
    if (chained.some((c) => c === target || c.endsWith(`.${target}`))) {
      return { ok: true, message: 'CNAME record verified.' };
    }
  }

  return {
    ok: false,
    message: `We could not find a CNAME for ${normalizedDomain} pointing to ${target}. Add the DNS record, wait up to 48 hours for propagation, then try again.`,
  };
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
    const domain = normalizeDomain(body?.domain);
    if (!domain || !domain.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Enter a valid subdomain (e.g. gallery.yourdomain.com).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

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
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verification = await verifyDomainPointsToPlatform(domain, cnameTarget);

    const patch = verification.ok
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
        verified: verification.ok,
        message: verification.message,
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
