import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDefaultGalleryHost,
  getDnsHostLabel,
  getGalleryApexIps,
  getGalleryCnameTarget,
  isApexCustomDomain,
  isCustomDomainVerified,
  isValidCustomDomain,
  normalizeCustomDomain,
} from '../../../lib/customDomain';
import { customDomainService } from '../../../services/customDomain.service';

function DnsTable({ rows }) {
  return (
    <div className="set-dns-table-wrap">
      <table className="set-dns-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Host</th>
            <th>Points to</th>
            <th>TTL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.type}-${row.host}-${row.value}`}>
              <td>{row.type}</td>
              <td>
                <code>{row.host}</code>
              </td>
              <td>
                <code>{row.value}</code>
              </td>
              <td>{row.ttl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomDomainPanel({ profile, updateProfile, compact = false }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('instructions');
  const [domainDraft, setDomainDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showRootHelp, setShowRootHelp] = useState(false);
  const [showTrouble, setShowTrouble] = useState(false);

  const cnameTarget = getGalleryCnameTarget();
  const apexIps = getGalleryApexIps();
  const defaultHost = getDefaultGalleryHost(profile);
  const connectedDomain = normalizeCustomDomain(profile?.custom_domain);
  const isVerified = isCustomDomainVerified(profile);
  const isPending = profile?.custom_domain_status === 'pending' && connectedDomain;
  const isUpgraded = profile?.plan !== 'free';

  const previewDomain = normalizeCustomDomain(domainDraft || connectedDomain || 'gallery.yourdomain.com');
  const dnsHostLabel = useMemo(() => getDnsHostLabel(previewDomain), [previewDomain]);
  const usingApex = isApexCustomDomain(previewDomain);

  const subdomainRows = [
    {
      type: 'CNAME',
      host: dnsHostLabel === '@' ? 'gallery' : dnsHostLabel,
      value: cnameTarget,
      ttl: '1 hour',
    },
  ];

  const rootRows = [
    { type: 'CNAME', host: 'www', value: cnameTarget, ttl: '1 hour' },
    ...apexIps.map((ip) => ({ type: 'A', host: '@', value: ip, ttl: '1 hour' })),
  ];

  const instructionRows = usingApex ? rootRows : subdomainRows;

  const openModal = () => {
    if (!isUpgraded) return;
    setDomainDraft(connectedDomain || '');
    setModalStep('instructions');
    setError('');
    setInfo('');
    setShowRootHelp(false);
    setShowTrouble(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
  };

  const handleVerify = async () => {
    const normalized = normalizeCustomDomain(domainDraft);
    if (!isValidCustomDomain(normalized)) {
      setError('Enter a valid subdomain (e.g. gallery.yourdomain.com).');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const result = await customDomainService.verifyAndConnect(normalized);
      await updateProfile({
        custom_domain: result.domain || normalized,
        custom_domain_status: result.status || (result.verified ? 'verified' : 'pending'),
        custom_domain_verified_at: result.verifiedAt || null,
      });

      if (result.verified) {
        setInfo('Domain connected successfully. SSL may take up to 24 hours to activate.');
        setModalOpen(false);
      } else {
        setError(result.message || 'DNS record not found yet. Try again after propagation.');
      }
    } catch (err) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRecheck = async () => {
    try {
      setBusy(true);
      setError('');
      const result = await customDomainService.recheck(profile);
      await updateProfile({
        custom_domain: result.domain || connectedDomain,
        custom_domain_status: result.status || (result.verified ? 'verified' : 'pending'),
        custom_domain_verified_at: result.verifiedAt || null,
      });
      if (result.verified) {
        setInfo('Domain verified successfully.');
      } else {
        setError(result.message || 'DNS not ready yet.');
      }
    } catch (err) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove custom domain ${connectedDomain}?`)) return;
    try {
      setBusy(true);
      await customDomainService.disconnect();
      await updateProfile({
        custom_domain: null,
        custom_domain_status: 'none',
        custom_domain_verified_at: null,
      });
      setInfo('Custom domain removed.');
    } catch (err) {
      setError(err?.message || 'Failed to remove domain.');
    } finally {
      setBusy(false);
    }
  };

  const fieldValue = connectedDomain || '';
  const fieldPlaceholder = 'www.yourdomain.com';

  return (
    <>
      {compact ? (
        <>
          <div className="si-domain-field">
            <input
              className="si-domain-input"
              type="text"
              readOnly
              placeholder={fieldPlaceholder}
              value={fieldValue}
              onClick={!connectedDomain && isUpgraded ? openModal : undefined}
            />
          </div>

          {!isUpgraded && (
            <p className="set-help-text">
              An upgraded plan is required to connect a custom domain.{' '}
              <Link to="/account/billing" className="set-link-teal">
                Upgrade
              </Link>
            </p>
          )}

          {connectedDomain ? (
            <div className="si-domain-status">
              <span
                className={`si-domain-dot ${isVerified ? 'si-domain-dot--ok' : 'si-domain-dot--pending'}`}
                aria-hidden
              />
              <span className="type-status">
                {isVerified ? 'Verified · SSL provisioning' : 'Pending DNS verification'}
              </span>
              <div className="si-domain-status-actions">
                {isPending ? (
                  <button type="button" className="si-domain-link" disabled={busy} onClick={handleRecheck}>
                    {busy ? 'Checking…' : 'Verify'}
                  </button>
                ) : null}
                <button type="button" className="si-domain-link" disabled={busy} onClick={openModal}>
                  Change
                </button>
                <button
                  type="button"
                  className="si-domain-link si-domain-link--danger"
                  disabled={busy}
                  onClick={handleRemove}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            isUpgraded && (
              <button type="button" className="si-domain-add" onClick={openModal}>
                + Add custom domain
              </button>
            )
          )}

          {info && <p className="set-domain-info">{info}</p>}
          {error && !modalOpen && <p className="set-domain-error">{error}</p>}
        </>
      ) : (
        <>
          <div className="set-section">
            <h3 className="set-section-title">Domain</h3>
            <div className="set-custom-domain-field neu-inset cg-field-shell">
              <input className="set-input" type="text" readOnly value={defaultHost} />
            </div>
            <p className="set-help-text">
              Every delivery you create is reachable at these addresses. Change the first part by editing your
              studio handle in{' '}
              <Link to="/account/profile" className="set-link-teal">
                Account
              </Link>
              .
            </p>
          </div>

          <div className="set-section set-section--custom-domain">
            <div className="set-section-header">
              <h3 className="set-section-title">Custom Domain</h3>
            </div>

            <div className="set-custom-domain-field neu-inset cg-field-shell">
              <input
                className="set-input"
                type="text"
                readOnly
                placeholder={fieldPlaceholder}
                value={fieldValue}
                onClick={!connectedDomain && isUpgraded ? openModal : undefined}
              />
            </div>

            {!connectedDomain && (
              <>
                <p className="set-help-text">
                  Use your own subdomain for client galleries (e.g. gallery.yourdomain.com). We recommend a
                  subdomain so your main website is not affected.
                </p>
                {isUpgraded ? (
                  <button type="button" className="set-add-domain-btn" onClick={openModal}>
                    + Add custom domain
                  </button>
                ) : (
                  <Link to="/account/billing" className="set-upgrade-pill">
                    Upgrade to enable
                  </Link>
                )}
              </>
            )}

            {connectedDomain && (
              <div className="set-domain-connected">
                <div className="set-domain-connected-row">
                  <span
                    className={`set-domain-badge ${
                      isVerified ? 'set-domain-badge--verified' : 'set-domain-badge--pending'
                    }`}
                  >
                    {isVerified ? 'Connected' : 'Pending DNS'}
                  </span>
                </div>
                {isVerified ? (
                  <p className="set-help-text">
                    Your galleries are available at{' '}
                    <a
                      href={`https://${connectedDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="set-link-teal"
                    >
                      https://{connectedDomain}
                    </a>
                    . SSL certificates may take up to 24 hours after connecting.
                  </p>
                ) : (
                  <p className="set-help-text">
                    Add the CNAME record in the setup guide, then verify DNS. Propagation can take up to 48
                    hours.
                  </p>
                )}
                <div className="set-domain-actions">
                  {isPending && (
                    <button type="button" className="set-btn-secondary" disabled={busy} onClick={handleRecheck}>
                      {busy ? 'Checking…' : 'Verify DNS'}
                    </button>
                  )}
                  <button type="button" className="set-btn-ghost" disabled={busy} onClick={openModal}>
                    Change domain
                  </button>
                  <button type="button" className="set-btn-danger" disabled={busy} onClick={handleRemove}>
                    Remove
                  </button>
                </div>
              </div>
            )}

            {info && <p className="set-domain-info">{info}</p>}
            {error && !modalOpen && <p className="set-domain-error">{error}</p>}
          </div>
        </>
      )}

      {modalOpen && (
        <div className="set-modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="set-modal set-modal--domain"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="custom-domain-title"
          >
            <div className="set-modal-header">
              <h2 id="custom-domain-title">Add custom domain</h2>
              <button type="button" className="set-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            {modalStep === 'instructions' ? (
              <div className="set-modal-body">
                <p className="set-help-text">
                  Before connecting, add a DNS record in your domain provider&apos;s dashboard (GoDaddy,
                  Cloudflare, Namecheap, etc.). This does not transfer your domain and will not affect your
                  root website if you use a subdomain. Do not modify existing MX records.
                </p>

                <DnsTable rows={instructionRows} />

                <p className="set-help-text">
                  Paste <strong>{cnameTarget}</strong> exactly as shown. Do not replace it with your username
                  or your personal domain. Example:{' '}
                  <code>gallery.yourdomain.com</code> → CNAME → <code>{cnameTarget}</code>
                </p>
                <p className="set-help-text">
                  If you use Cloudflare, set the record to <strong>DNS only</strong> (grey cloud), not
                  proxied.
                </p>

                <button
                  type="button"
                  className="set-domain-disclosure"
                  onClick={() => setShowRootHelp((open) => !open)}
                >
                  {showRootHelp ? 'Hide' : 'I want to use my root domain instead of a subdomain'}
                </button>
                {showRootHelp && (
                  <div className="set-domain-disclosure-body">
                    <p className="set-help-text">
                      For a root domain (e.g. yourdomain.com), add a www CNAME and an A record for @. If you
                      cannot enter @, leave the host blank or enter your domain name.
                    </p>
                    <DnsTable rows={rootRows} />
                  </div>
                )}

                <button
                  type="button"
                  className="set-domain-disclosure"
                  onClick={() => setShowTrouble((open) => !open)}
                >
                  {showTrouble ? 'Hide troubleshooting' : 'Troubleshooting'}
                </button>
                {showTrouble && (
                  <div className="set-domain-disclosure-body">
                    <p className="set-help-text">
                      <strong>I can&apos;t update DNS records.</strong> Delete any domain forwarding /
                      redirects first. Parked domains must be activated with your provider.
                    </p>
                    <p className="set-help-text">
                      <strong>I updated DNS, but it&apos;s not working.</strong> Changes can take up to 48
                      hours. Create the record at the provider that actually hosts DNS (this may differ from
                      where you bought the domain).
                    </p>
                    <p className="set-help-text">
                      <strong>Galleries show &quot;Not Secure&quot;.</strong> SSL can take up to 24 hours
                      after a successful connection. Delete any CAA records if the certificate never appears.
                    </p>
                  </div>
                )}

                <div className="set-modal-footer">
                  <button type="button" className="set-btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="set-btn-primary" onClick={() => setModalStep('connect')}>
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="set-modal-body">
                <label className="set-mini-label" htmlFor="custom-domain-input">
                  Domain or subdomain name
                </label>
                <div className="set-custom-domain-field neu-inset cg-field-shell">
                  <input
                    id="custom-domain-input"
                    className="set-input"
                    type="text"
                    placeholder="e.g. gallery.yourdomain.com"
                    value={domainDraft}
                    onChange={(e) => setDomainDraft(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <p className="set-help-text">
                  Enter the hostname you created in DNS, then verify. We recommend a subdomain so your main
                  website is not affected.
                </p>

                {domainDraft && (
                  <>
                    <DnsTable rows={instructionRows} />
                    {usingApex && (
                      <p className="set-help-text">
                        Root domain detected. Make sure the A record for @ and the www CNAME are both in
                        place.
                      </p>
                    )}
                  </>
                )}

                {error && <p className="set-domain-error">{error}</p>}

                <div className="set-modal-footer">
                  <button
                    type="button"
                    className="set-btn-ghost"
                    disabled={busy}
                    onClick={() => setModalStep('instructions')}
                  >
                    Back
                  </button>
                  <button type="button" className="set-btn-primary" disabled={busy} onClick={handleVerify}>
                    {busy ? 'Verifying…' : 'Verify & save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
