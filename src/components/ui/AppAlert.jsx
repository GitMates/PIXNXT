import React, { useCallback, useEffect, useState } from 'react';
import './AppAlert.css';

/**
 * Global replacement for native window.alert().
 *
 * Dozens of call sites across the studio use alert() for quick notices
 * (replace/rename/move results, validation hints, ...). The native dialog
 * looks broken next to the app's own centered modals, so this installs a
 * single override that renders every alert as the same centered card with
 * an OK button. Queued — rapid successive alerts show one after another.
 *
 * Mount <AppAlertHost /> once near the app root (see main.jsx).
 */

let pushAlert = null;
let installed = false;

export function installAppAlert() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  try {
    window.__nativeAlert = window.alert.bind(window);
  } catch {
    // ignore
  }
  window.alert = (message) => {
    const text = message == null ? '' : String(message);
    if (pushAlert) {
      pushAlert(text);
      return;
    }
    try {
      window.__nativeAlert?.(text);
    } catch {
      // last resort — never throw from an alert call
    }
  };
}

export function AppAlertHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    pushAlert = (message) => {
      setQueue((prev) => (prev.length > 4 ? prev : [...prev, message]));
    };
    return () => {
      pushAlert = null;
    };
  }, []);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    if (queue.length === 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [queue.length, dismiss]);

  const current = queue[0];
  if (!current) return null;

  return (
    <div
      className="pixnxt-alert-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Notice"
      onClick={dismiss}
    >
      <div className="pixnxt-alert" onClick={(e) => e.stopPropagation()}>
        <div className="pixnxt-alert__head">
          <h3 className="pixnxt-alert__title">Notice</h3>
        </div>
        <div className="pixnxt-alert__body">
          <p className="pixnxt-alert__message">{current}</p>
        </div>
        <div className="pixnxt-alert__actions">
          <button type="button" className="pixnxt-alert__ok" onClick={dismiss} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
