import React, { useEffect, useState } from 'react';
import { getCollectionShareUrl } from '../../../lib/shareCollection';
import './GetDirectLinkModal.css';

function CopyRow({
  label,
  value,
  placeholder,
  readOnly,
  onChange,
  copied,
  onCopy,
  canCopy,
  extra,
  inputMode,
  maxLength,
}) {
  const display = value || placeholder;
  return (
    <div className="cd-direct-link-row">
      <label className="cd-direct-link-label">{label}</label>
      <div className="cd-direct-link-field">
        <input
          type="text"
          readOnly={readOnly}
          value={readOnly ? display : value}
          placeholder={placeholder}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
        />
        <button
          type="button"
          disabled={!canCopy}
          onClick={onCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {extra}
    </div>
  );
}

export function GetDirectLinkModal({
  isOpen,
  onClose,
  collectionSlug,
  photographerProfile,
  password = '',
  pin = '',
  onPasswordChange,
  onPinChange,
  onOpenAccessSettings,
  onOpenDownloadSettings,
  onOpenCustomDomain,
}) {
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!isOpen) setCopied(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const shareUrl = getCollectionShareUrl(collectionSlug, photographerProfile);
  const pinDigits = String(pin || '').replace(/\D/g, '').slice(0, 4);

  const copyText = async (key, text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => {
        setCopied((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal cd-direct-link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3 className="cd-modal-title">GET DIRECT LINK</h3>
          <button type="button" className="cd-modal-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="cd-modal-body cd-direct-link-body">
          <CopyRow
            label="DELIVERY URL"
            value={shareUrl}
            placeholder="Publish the delivery to get a link"
            readOnly
            canCopy={Boolean(shareUrl)}
            copied={copied === 'url'}
            onCopy={() => void copyText('url', shareUrl)}
            extra={onOpenCustomDomain ? (
              <button type="button" className="cd-direct-link-action" onClick={onOpenCustomDomain}>
                Need a custom domain?
              </button>
            ) : null}
          />
          <CopyRow
            label="DELIVERY PASSWORD"
            value={password}
            placeholder="No password set"
            readOnly={!onPasswordChange}
            canCopy={Boolean(password)}
            copied={copied === 'password'}
            onCopy={() => void copyText('password', password)}
            onChange={onPasswordChange ? (e) => onPasswordChange(e.target.value) : undefined}
            extra={onOpenAccessSettings ? (
              <button type="button" className="cd-direct-link-action" onClick={onOpenAccessSettings}>
                Access settings
              </button>
            ) : null}
          />
          <CopyRow
            label="DOWNLOAD PIN"
            value={onPinChange ? pinDigits : (pinDigits || '')}
            placeholder="No PIN set"
            readOnly={!onPinChange}
            canCopy={pinDigits.length === 4}
            copied={copied === 'pin'}
            onCopy={() => void copyText('pin', pinDigits)}
            inputMode="numeric"
            maxLength={4}
            onChange={onPinChange ? (e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4)) : undefined}
            extra={onOpenDownloadSettings ? (
              <button type="button" className="cd-direct-link-action" onClick={onOpenDownloadSettings}>
                Download settings
              </button>
            ) : null}
          />
        </div>
      </div>
    </div>
  );
}
