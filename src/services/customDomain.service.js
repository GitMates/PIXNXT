import { normalizeCustomDomain } from '../lib/customDomain';

async function invokeWorkersVerify(body) {
  const { apiFetch } = await import('../lib/api/client');
  return apiFetch('/v1/domains/verify', { method: 'POST', body });
}

export const customDomainService = {
  async getDomainState() {
    const { apiFetch } = await import('../lib/api/client');
    return apiFetch('/v1/domains');
  },

  async verifyAndConnect(domain) {
    const normalized = normalizeCustomDomain(domain);
    if (!normalized) {
      throw new Error('Enter a valid domain or subdomain (e.g. gallery.yourdomain.com).');
    }
    const workersAuth = await import('./workersAuth.service');
    const session = await workersAuth.getSession().catch(() => null);
    if (!session) throw new Error('You must be signed in.');
    return invokeWorkersVerify({ action: 'verify', domain: normalized });
  },

  async disconnect() {
    const workersAuth = await import('./workersAuth.service');
    const session = await workersAuth.getSession().catch(() => null);
    if (!session) throw new Error('You must be signed in.');
    return invokeWorkersVerify({ action: 'disconnect', domain: 'none' });
  },

  async recheck(profile) {
    const domain = normalizeCustomDomain(profile?.custom_domain);
    if (!domain) throw new Error('No custom domain to verify.');
    return this.verifyAndConnect(domain);
  },
};
