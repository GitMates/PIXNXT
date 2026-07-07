import React from 'react';
import { isAndroidChrome } from '../../lib/mobileGalleryInstall';
import { shouldShowSafariInstallFlow } from '../../lib/mobileGalleryPwa';

function InstallCallout({ isIos, isAndroid, onInstall, canInstall, installing }) {
  if (canInstall && onInstall) {
    return (
      <div className="mg-install-overlay-panel">
        <button
          type="button"
          className="mg-install-native-btn"
          onClick={onInstall}
          disabled={installing}
        >
          {installing ? 'Installing…' : 'Install app'}
        </button>
        <p className="mg-install-callout-hint">Adds a full-screen gallery app to your home screen.</p>
      </div>
    );
  }

  if (isIos) {
    return (
      <div className="mg-install-overlay-panel">
        <p className="mg-install-callout-text">
          Tap <span className="mg-install-share-icon" aria-hidden>⎙</span> Share, then{' '}
          <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
        </p>
      </div>
    );
  }

  if (isAndroid) {
    return (
      <div className="mg-install-overlay-panel">
        <p className="mg-install-callout-text">
          Tap <span className="mg-install-menu-dots" aria-hidden><span /><span /><span /></span> menu, then{' '}
          <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
        </p>
        <p className="mg-install-callout-hint">If you only see &ldquo;Shortcut&rdquo;, wait a moment and try again.</p>
      </div>
    );
  }

  return (
    <div className="mg-install-overlay-panel">
      <p className="mg-install-callout-text">
        Use your browser menu and choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
      </p>
    </div>
  );
}

export default function MobileGalleryInstallOverlay({
  appName,
  onDismiss,
  onInstall,
  canInstall = false,
  installing = false,
}) {
  const isIos = shouldShowSafariInstallFlow();
  const isAndroid = isAndroidChrome();

  return (
    <div className="mg-install-overlay" role="dialog" aria-label="Install gallery app">
      <div className="mg-install-overlay-backdrop" onClick={onDismiss} role="presentation" />
      <div className="mg-install-overlay-card">
        <p className="mg-install-overlay-eyebrow">Install app</p>
        <h2 className="mg-install-overlay-title">{appName}</h2>
        <p className="mg-install-overlay-subtitle">
          Add this gallery to your home screen for a full-screen app experience.
        </p>
        <InstallCallout
          isIos={isIos}
          isAndroid={isAndroid}
          onInstall={onInstall}
          canInstall={canInstall}
          installing={installing}
        />
        <button type="button" className="mg-install-overlay-dismiss" onClick={onDismiss}>
          Continue in browser
        </button>
      </div>
    </div>
  );
}
