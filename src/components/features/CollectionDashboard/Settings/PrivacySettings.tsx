import React from 'react';
import { ClientExclusiveAccessSettings } from '../../ClientExclusiveAccess';
import type { ClientExclusiveSetOption } from '../../ClientExclusiveAccess';

export interface PrivacySettingsProps {
  collectionPassword: string;
  setCollectionPassword: (val: string) => void;
  showOnHomepage: boolean;
  setShowOnHomepage: (val: boolean) => void;
  clientExclusiveAccess: boolean;
  setClientExclusiveAccess: (val: boolean) => void;
  clientPrivatePassword: string;
  setClientPrivatePassword: (val: string) => void;
  allowClientsMarkPrivate: boolean;
  setAllowClientsMarkPrivate: (val: boolean) => void;
  clientOnlyHighlights: boolean;
  setClientOnlyHighlights: (val: boolean) => void;
  clientOnlySets: ClientExclusiveSetOption[];
  onSetClientOnlyChange: (setId: string, isClientOnly: boolean) => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  collectionPassword,
  setCollectionPassword,
  showOnHomepage,
  setShowOnHomepage,
  clientExclusiveAccess,
  setClientExclusiveAccess,
  clientPrivatePassword,
  setClientPrivatePassword,
  allowClientsMarkPrivate,
  setAllowClientsMarkPrivate,
  clientOnlyHighlights,
  setClientOnlyHighlights,
  clientOnlySets,
  onSetClientOnlyChange,
}) => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header">
        <h2 className="cd-settings-main-title">Privacy</h2>
      </div>

      <div className="cd-settings-form">
        <div className="settings-section">
          <label className="settings-label">Collection Password</label>
          <div className="settings-input-wrapper with-action">
            <input
              type="text"
              className="settings-input"
              placeholder="Add a password"
              value={collectionPassword}
              onChange={(e) => setCollectionPassword(e.target.value)}
            />
            <button
              className="input-action-btn"
              type="button"
              onClick={() => setCollectionPassword(Math.random().toString(36).slice(-8))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              Generate
            </button>
          </div>
          <p className="settings-desc">Require visitors to enter this password in order to see the collection.</p>
        </div>

        <div className="settings-toggle-section">
          <div className="settings-toggle-row">
            <div className="toggle-info">
              <label className="settings-label">Show on Homepage</label>
            </div>
            <div className="toggle-control">
              <label className="cd-toggle">
                <input type="checkbox" checked={showOnHomepage} onChange={() => setShowOnHomepage(!showOnHomepage)} />
                <span className="cd-toggle-slider"></span>
              </label>
              <span className="toggle-state-label">{showOnHomepage ? 'On' : 'Off'}</span>
            </div>
          </div>
          <p className="settings-desc small">Show this collection on your <span className="settings-link">Homepage</span>. Manage Homepage in <span className="settings-link">Homepage settings</span>.</p>
        </div>

        <ClientExclusiveAccessSettings
          enabled={clientExclusiveAccess}
          onEnabledChange={setClientExclusiveAccess}
          clientPrivatePassword={clientPrivatePassword}
          onClientPrivatePasswordChange={setClientPrivatePassword}
          allowMarkPrivate={allowClientsMarkPrivate}
          onAllowMarkPrivateChange={setAllowClientsMarkPrivate}
          highlightsClientOnly={clientOnlyHighlights}
          onHighlightsClientOnlyChange={setClientOnlyHighlights}
          sets={clientOnlySets}
          onSetClientOnlyChange={onSetClientOnlyChange}
        />
      </div>
    </div>
  );
};
