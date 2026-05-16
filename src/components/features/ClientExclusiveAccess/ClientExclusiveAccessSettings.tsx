import React, { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { generateClientPassword } from '../../../lib/clientExclusiveAccess';
import './ClientExclusiveAccess.css';

export interface ClientExclusiveSetOption {
  id: string;
  name: string;
  isClientOnly: boolean;
}

export interface ClientExclusiveAccessSettingsProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  clientPrivatePassword: string;
  onClientPrivatePasswordChange: (value: string) => void;
  allowMarkPrivate: boolean;
  onAllowMarkPrivateChange: (value: boolean) => void;
  highlightsClientOnly: boolean;
  onHighlightsClientOnlyChange: (value: boolean) => void;
  sets: ClientExclusiveSetOption[];
  onSetClientOnlyChange: (setId: string, isClientOnly: boolean) => void;
}

export const ClientExclusiveAccessSettings: React.FC<ClientExclusiveAccessSettingsProps> = ({
  enabled,
  onEnabledChange,
  clientPrivatePassword,
  onClientPrivatePasswordChange,
  allowMarkPrivate,
  onAllowMarkPrivateChange,
  highlightsClientOnly,
  onHighlightsClientOnlyChange,
  sets,
  onSetClientOnlyChange,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!clientPrivatePassword) return;
    try {
      await navigator.clipboard.writeText(clientPrivatePassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="cea-settings-block">
      <div className="settings-toggle-section no-margin">
        <div className="settings-toggle-row">
          <div className="toggle-info">
            <label className="settings-label">Client Exclusive Access</label>
          </div>
          <div className="toggle-control">
            <label className="cd-toggle">
              <input type="checkbox" checked={enabled} onChange={() => onEnabledChange(!enabled)} />
              <span className="cd-toggle-slider" />
            </label>
            <span className="toggle-state-label">{enabled ? 'On' : 'Off'}</span>
          </div>
        </div>
        <p className="settings-desc small">
          Give clients exclusive access to sets and the ability to mark photos private.{' '}
          <a
            className="settings-link"
            href="https://galleries.pixieset.com/collections/114473140/settings/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </p>
      </div>

      {enabled && (
        <>
          <div className="settings-section">
            <label className="settings-label">Client Private Password</label>
            <div className="cea-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={clientPrivatePassword}
                onChange={(e) => onClientPrivatePasswordChange(e.target.value)}
                placeholder="Generate a password"
                autoComplete="off"
              />
              <div className="cea-password-actions">
                <button
                  type="button"
                  className="cea-icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" className="cea-icon-btn" onClick={handleCopy} aria-label="Copy password">
                  <Copy size={16} />
                </button>
              </div>
            </div>
            {copied && (
              <p className="settings-desc small" style={{ color: '#27a397' }}>
                Copied to clipboard
              </p>
            )}
            <button
              type="button"
              className="input-action-btn"
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
              onClick={() => onClientPrivatePasswordChange(generateClientPassword())}
            >
              Generate
            </button>
            <p className="settings-desc">
              This unique client password will be required to see all photos and mark photos private.
            </p>
          </div>

          <div className="settings-section">
            <label className="settings-label">Client-Only Photo Sets</label>
            <div className="cea-set-list">
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={highlightsClientOnly}
                  onChange={() => onHighlightsClientOnlyChange(!highlightsClientOnly)}
                />
                <span className="checkmark" />
                Highlights
              </label>
              {sets.map((set) => (
                <label key={set.id} className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={set.isClientOnly}
                    onChange={() => onSetClientOnlyChange(set.id, !set.isClientOnly)}
                  />
                  <span className="checkmark" />
                  {set.name}
                </label>
              ))}
            </div>
            <p className="settings-desc">
              Restrict specific photo sets to client-only so that visitors cannot see them.
            </p>
          </div>

          <div className="settings-toggle-section no-margin">
            <div className="settings-toggle-row">
              <div className="toggle-info">
                <label className="settings-label">Allow Clients to Mark Photos Private</label>
              </div>
              <div className="toggle-control">
                <label className="cd-toggle">
                  <input
                    type="checkbox"
                    checked={allowMarkPrivate}
                    onChange={() => onAllowMarkPrivateChange(!allowMarkPrivate)}
                  />
                  <span className="cd-toggle-slider" />
                </label>
                <span className="toggle-state-label">{allowMarkPrivate ? 'On' : 'Off'}</span>
              </div>
            </div>
            <p className="settings-desc small">
              Give clients the ability to mark photos private. Private photos are not visible to public guests
              and only clients can see them.{' '}
              <span className="settings-link">Learn more</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};
