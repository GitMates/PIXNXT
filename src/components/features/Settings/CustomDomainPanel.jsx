import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDefaultGalleryHost,
  getDnsHostLabel,
  getGalleryCnameTarget,
  isApexCustomDomain,
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

function DomainReflectPreview({ domain, platformHost }) {
  const host = normalizeCustomDomain(domain) || 'gallery.yourdomain.com';
  const origin = `https://${host}`;
  const examples = [
    { label: 'Client galleries', url: `${origin}/gallery/your-delivery` },
    { label: 'Album proofs', url: `${origin}/album-preview/your-album` },
    { label: 'Guest delivery', url: `${origin}/e/your-event` },
    { label: 'Mobile gallery', url: `${origin}/m/your-app` },
    { label: 'Print store', url: `${origin}/printstore` },
    { label: 'Studio home', url: `${origin}/` },
  ];

  return (
    <div className="set-domain-reflect">
      <p className="set-domain-reflect__title">Where it shows up in PIXNXT</p>
      <p className="set-domain-reflect__intro">
        After verification, client-facing share links, emails, and QR codes use this host instead of{' '}
        <code>{platformHost || 'yourstudio.pixnxt.in'}</code>.
      </p>
      <ul className="set-domain-reflect__list">
        {examples.map((item) => (
          <li key={item.label}>
            <span className="set-domain-reflect__label">{item.label}</span>
            <code className="set-domain-reflect__url">{item.url}</code>
          </li>
        ))}
      </ul>
      <p className="set-domain-reflect__note">
        Your studio dashboard stays on the PIXNXT app. Only public client links switch to the custom
        domain.
      </p>
    </div>
  );
}

export function CustomDomainPanel({ profile, compact = false }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('instructions');
  const [domainDraft, setDomainDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showTrouble, setShowTrouble] = useState(false);
  // Domain state changed by this panel (connect/recheck/remove) layered over
  // the profile prop. Domain columns are server-managed via /v1/domains/verify,
  // so the panel never PATCHes them through the generic profile endpoint.
  const [domainState, setDomainState] = useState(null);

  const cnameTarget = getGalleryCnameTarget();
  const defaultHost = getDefaultGalleryHost(profile);
  const connectedDomain = normalizeCustomDomain(
    domainState ? domainState.custom_domain : profile?.custom_domain,
  );
  const effectiveStatus = domainState ? domainState.custom_domain_status : profile?.custom_domain_status;
  const isVerified = effectiveStatus === 'verified' && Boolean(connectedDomain);
  const isPending = effectiveStatus === 'pending' && Boolean(connectedDomain);

  const previewDomain = normalizeCustomDomain(domainDraft || connectedDomain || 'gallery.yourdomain.com');
  const dnsHostLabel = useMemo(() => getDnsHostLabel(previewDomain), [previewDomain]);

  const instructionRows = [
    {
      type: 'CNAME',
      host: dnsHostLabel === '@' ? 'gallery' : dnsHostLabel,
      value: cnameTarget,
      ttl: '1 hour',
    },
  ];

  const openModal = () => {
    setDomainDraft(connectedDomain || '');
    setModalStep('instructions');
    setError('');
    setInfo('');
    setShowTrouble(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
  };

  const applyResult = (result, fallbackDomain) => {
    const domain = normalizeCustomDomain(result?.domain || fallbackDomain);
    setDomainState({
      custom_domain: domain || null,
      custom_domain_status: result?.status || (result?.verified ? 'verified' : 'pending'),
      custom_domain_verified_at: result?.verifiedAt || null,
    });
    if (result?.status === 'verified') {
      setInfo(result?.message || 'Domain connected. SSL provisioning is automatic.');
      return true;
    }
    setError(result?.message || 'DNS record not found yet. Try again after propagation.');
    return false;
  };

  const handleVerify = async () => {
    const normalized = normalizeCustomDomain(domainDraft);
    if (!isValidCustomDomain(normalized)) {
      setError('Enter a valid subdomain (e.g. gallery.yourdomain.com).');
      return;
    }
    if (isApexCustomDomain(normalized)) {
      setError('Root domains are not supported. Use a subdomain such as gallery.yourdomain.com.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const result = await customDomainService.verifyAndConnect(normalized);
      if (applyResult(result, normalized)) setModalOpen(false);
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
      const result = await customDomainService.recheck(connectedDomain);
      applyResult(result, connectedDomain);
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
      setDomainState({
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
  const fieldPlaceholder = 'gallery.yourdomain.com';

  return (
    <>
      {compact ? (
        <>
          <div className="si-domain-field">
            <input
              className={`si-domain-input${!connectedDomain ? ' si-domain-input--action' : ''}`}
              type="text"
              readOnly
              placeholder={fieldPlaceholder}
              value={fieldValue}
              onClick={!connectedDomain ? openModal : undefined}
            />
          </div>

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
            <button type="button" className="si-domain-add" onClick={openModal}>
              + Add custom domain
            </button>
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
                onClick={!connectedDomain ? openModal : undefined}
              />
            </div>

            {!connectedDomain && (
              <>
                <p className="set-help-text">
                  Use your own subdomain for client galleries (e.g. gallery.yourdomain.com). We recommend a
                  subdomain so your main website is not affected.
                </p>
                <button type="button" className="set-add-domain-btn" onClick={openModal}>
                  + Add custom domain
                </button>
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
              <>
                <div className="set-modal-body">
                  <p className="set-help-text set-help-text--strong">Before you start</p>
                  <ul className="set-domain-checklist">
                    <li>
                      You need a domain you own with access to DNS settings (GoDaddy, Cloudflare,
                      Namecheap, etc.).
                    </li>
                    <li>
                      Your domain stays with your provider — you are connecting a subdomain to PIXNXT, not
                      transferring the domain.
                    </li>
                    <li>
                      Use a subdomain (e.g. <code>gallery.yourdomain.com</code>). Root domains such as{' '}
                      <code>yourdomain.com</code> are not supported.
                    </li>
                  </ul>

                  <p className="set-help-text">
                    <strong>Step 1 — Add DNS.</strong> In your domain provider&apos;s DNS settings, add the
                    record below. Do not modify existing MX records (they control email).
                  </p>

                  <DnsTable rows={instructionRows} />

                  <p className="set-help-text">
                    Paste <strong>{cnameTarget}</strong> exactly as shown — do not replace it with your
                    username or studio handle. Example:{' '}
                    <code>gallery.yourdomain.com</code> → CNAME → <code>{cnameTarget}</code>
                  </p>
                  <p className="set-help-text">
                    <strong>Step 2 — Connect here.</strong> Click Next, enter your subdomain, then Verify
                    &amp; save. SSL will generate automatically (usually minutes, up to 24 hours).
                  </p>
                  <p className="set-help-text">
                    If you use Cloudflare for this domain, set the record to <strong>DNS only</strong>{' '}
                    (grey cloud), not proxied.
                  </p>

                  <DomainReflectPreview domain={previewDomain} platformHost={defaultHost} />

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
                        <strong>I want my root domain (yourdomain.com).</strong> Root domains are not
                        supported. Connect a subdomain such as <code>gallery.yourdomain.com</code> or{' '}
                        <code>www.yourdomain.com</code> instead.
                      </p>
                      <p className="set-help-text">
                        <strong>I can&apos;t update DNS records.</strong> Delete any domain forwarding /
                        redirects first. Parked domains must be activated with your provider.
                      </p>
                      <p className="set-help-text">
                        <strong>I updated DNS, but it&apos;s not working.</strong> Changes can take up to 48
                        hours. Create the record at the provider that actually hosts DNS (this may differ
                        from where you bought the domain).
                      </p>
                      <p className="set-help-text">
                        <strong>Galleries show &quot;Not Secure&quot;.</strong> SSL can take up to 24 hours
                        after a successful connection. Delete any CAA records if the certificate never
                        appears.
                      </p>
                    </div>
                  )}
                </div>

                <div className="set-modal-footer">
                  <button type="button" className="set-btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="set-btn-primary" onClick={() => setModalStep('connect')}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
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
                    Enter the hostname you created in DNS, then verify. Root domains are not supported —
                    use a subdomain such as gallery.yourdomain.com.
                  </p>

                  {domainDraft && (
                    <>
                      <DnsTable rows={instructionRows} />
                      {isApexCustomDomain(normalizeCustomDomain(domainDraft)) && (
                        <p className="set-domain-error">
                          Root domains are not supported. Use a subdomain such as gallery.yourdomain.com.
                        </p>
                      )}
                      <DomainReflectPreview domain={previewDomain} platformHost={defaultHost} />
                    </>
                  )}

                  {error && <p className="set-domain-error">{error}</p>}
                </div>

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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
