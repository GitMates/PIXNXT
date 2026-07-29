import { supabase } from '../lib/supabase/client';
import { normalizeCustomDomain } from '../lib/customDomain';

export const customDomainService = {
  async verifyAndConnect(domain) {
    const normalized = normalizeCustomDomain(domain);
    if (!normalized) {
      throw new Error('Enter a valid domain or subdomain (e.g. gallery.yourdomain.com).');
    }

    const { data, error } = await supabase.functions.invoke('verify-custom-domain', {
      body: { domain: normalized },
    });

    if (error) {
      throw new Error(error.message || 'Domain verification failed.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  async disconnect() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('You must be signed in.');

    const { error } = await supabase
      .from('photographers')
      .update({
        custom_domain: null,
        custom_domain_status: 'none',
        custom_domain_verified_at: null,
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  async recheck(profile) {
    const domain = normalizeCustomDomain(profile?.custom_domain);
    if (!domain) throw new Error('No custom domain to verify.');
    return this.verifyAndConnect(domain);
  },
};
