import { supabase } from '../lib/supabase/client';
import { normalizeCustomDomain } from '../lib/customDomain';

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

    return invokeVerify({ action: 'verify', domain: normalized });
  },

  async disconnect() {
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
