import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './AppAlert.css';

/**
 * Global replacement for native window.alert() and window.confirm().
 *
 * Native browser dialogs sit at the top of the viewport and clash with the
 * app's centered modals. Mount <AppAlertHost /> once near the app root
 * (see main.jsx) and call installAppAlert() early.
 *
 * - alert(msg)          → fire-and-forget centered notice (queued)
 * - confirm(msg)        → Promise<boolean> centered Confirm / Cancel
 * - appConfirm(msg, opts) → same, with optional title / labels
 */

let pushAlert = null;
let pushConfirm = null;
let installed = false;

export function appConfirm(message, options = {}) {
  const text = message == null ? '' : String(message);
  return new Promise((resolve) => {
    if (pushConfirm) {
      pushConfirm({
        message: text,
        title: options.title || 'Confirm',
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: !!options.danger,
        resolve,
      });
      return;
    }
    try {
      resolve(!!window.__nativeConfirm?.(text));
    } catch {
      resolve(false);
    }
  });
}

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

  try {
    window.__nativeConfirm = window.confirm.bind(window);
  } catch {
    // ignore
  }
  // Returns a Promise — every call site must await it.
  window.confirm = (message) => appConfirm(message);
  window.appConfirm = appConfirm;
}

export function AppAlertHost() {
  const [alertQueue, setAlertQueue] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    pushAlert = (message) => {
      setAlertQueue((prev) => (prev.length > 4 ? prev : [...prev, message]));
    };
    pushConfirm = (entry) => {
      setConfirmState((prev) => {
        // Only one confirm at a time; reject extras as cancelled.
        if (prev) {
          entry.resolve(false);
          return prev;
        }
        return entry;
      });
    };
    return () => {
      pushAlert = null;
      pushConfirm = null;
    };
  }, []);

  const dismissAlert = useCallback(() => {
    setAlertQueue((prev) => prev.slice(1));
  }, []);

  const resolveConfirm = useCallback((ok) => {
    setConfirmState((prev) => {
      if (prev) prev.resolve(!!ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (confirmState) {
      const onKey = (e) => {
        if (e.key === 'Escape') resolveConfirm(false);
        if (e.key === 'Enter') resolveConfirm(true);
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    if (alertQueue.length === 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') dismissAlert();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmState, alertQueue.length, dismissAlert, resolveConfirm]);

  let dialog = null;

  if (confirmState) {
    dialog = (
      <div
        className="pixnxt-alert-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-label={confirmState.title}
        onClick={() => resolveConfirm(false)}
      >
        <div className="pixnxt-alert" onClick={(e) => e.stopPropagation()}>
          <div className="pixnxt-alert__head">
            <h3 className="pixnxt-alert__title">{confirmState.title}</h3>
          </div>
          <div className="pixnxt-alert__body">
            <p className="pixnxt-alert__message">{confirmState.message}</p>
          </div>
          <div className="pixnxt-alert__actions">
            <button
              type="button"
              className="pixnxt-alert__cancel"
              onClick={() => resolveConfirm(false)}
            >
              {confirmState.cancelLabel}
            </button>
            <button
              type="button"
              className={`pixnxt-alert__ok${confirmState.danger ? ' pixnxt-alert__ok--danger' : ''}`}
              onClick={() => resolveConfirm(true)}
              autoFocus
            >
              {confirmState.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    const current = alertQueue[0];
    if (current) {
      dialog = (
        <div
          className="pixnxt-alert-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-label="Notice"
          onClick={dismissAlert}
        >
          <div className="pixnxt-alert" onClick={(e) => e.stopPropagation()}>
            <div className="pixnxt-alert__head">
              <h3 className="pixnxt-alert__title">Notice</h3>
            </div>
            <div className="pixnxt-alert__body">
              <p className="pixnxt-alert__message">{current}</p>
            </div>
            <div className="pixnxt-alert__actions">
              <button type="button" className="pixnxt-alert__ok" onClick={dismissAlert} autoFocus>
                OK
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!dialog || typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}
