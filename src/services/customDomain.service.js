import { supabase } from '../lib/supabase/client';
import { USE_WORKERS_AUTH, apiBase, getAccessToken } from '../lib/api/client';
import { normalizeCustomDomain } from '../lib/customDomain';

async function invokeWorkersVerify(body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}/v1/domains/verify`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'Domain verification failed.');
  if (data?.error) throw new Error(data.error);
  return data;
}

async function invokeVerify(body) {
  const { data, error } = await supabase.functions.invoke('verify-custom-domain', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Domain verification failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export const customDomainService = {
  async verifyAndConnect(domain) {
    const normalized = normalizeCustomDomain(domain);
    if (!normalized) {
      throw new Error('Enter a valid domain or subdomain (e.g. gallery.yourdomain.com).');
    }
    if (USE_WORKERS_AUTH) return invokeWorkersVerify({ action: 'verify', domain: normalized });

    return invokeVerify({ action: 'verify', domain: normalized });
  },

  async disconnect() {
    if (USE_WORKERS_AUTH) return invokeWorkersVerify({ action: 'disconnect', domain: 'none' });
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) throw new Error('You must be signed in.');
    return invokeVerify({ action: 'disconnect' });
  },

  async recheck(profile) {
    const domain = normalizeCustomDomain(profile?.custom_domain);
    if (!domain) throw new Error('No custom domain to verify.');
    return this.verifyAndConnect(domain);
  },
};
