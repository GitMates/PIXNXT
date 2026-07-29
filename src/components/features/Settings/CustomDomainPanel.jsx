import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDefaultGalleryHost,
  getDnsHostLabel,
  getGalleryCnameTarget,
  isCustomDomainVerified,
  isValidCustomDomain,
  normalizeCustomDomain,
} from '../../../lib/customDomain';
import { customDomainService } from '../../../services/customDomain.service';

export function CustomDomainPanel({ profile, updateProfile }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('instructions');
  const [domainDraft, setDomainDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const cnameTarget = getGalleryCnameTarget();
  const defaultHost = getDefaultGalleryHost(profile);
  const connectedDomain = normalizeCustomDomain(profile?.custom_domain);
  const isVerified = isCustomDomainVerified(profile);
  const isPending = profile?.custom_domain_status === 'pending' && connectedDomain;

  const dnsHostLabel = useMemo(
    () => getDnsHostLabel(domainDraft || connectedDomain || 'gallery.yourdomain.com'),
    [domainDraft, connectedDomain]
  );

  const openModal = () => {
    setDomainDraft(connectedDomain || '');
    setModalStep('instructions');
    setError('');
    setInfo('');
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
      <div className="set-section">
        <h3 className="set-section-title">Domain</h3>
        <div className="set-custom-domain-field neu-inset cg-field-shell">
          <input className="set-input" type="text" readOnly value={defaultHost} />
        </div>
        <p className="set-help-text">
          Your client galleries and mobile gallery apps are always available with your default site address.
          To change your default domain, edit your username under{' '}
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
            readOnly={Boolean(connectedDomain)}
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
                Add the CNAME record in the setup guide, then verify DNS. Propagation can take up to 48 hours.
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
                  Before connecting, add a CNAME record in your domain provider&apos;s DNS settings (GoDaddy,
                  Cloudflare, Namecheap, etc.). Do not modify existing MX records.
                </p>

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
                      <tr>
                        <td>CNAME</td>
                        <td>
                          <code>{dnsHostLabel === '@' ? '@' : dnsHostLabel || 'gallery'}</code>
                        </td>
                        <td>
                          <code>{cnameTarget}</code>
                        </td>
                        <td>1 hour</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="set-help-text">
                  Paste <strong>{cnameTarget}</strong> exactly as shown. Example:{' '}
                  <code>gallery.yourdomain.com</code> → CNAME → <code>{cnameTarget}</code>
                </p>

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
                  We recommend connecting a subdomain for your collections and mobile apps.
                </p>

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
