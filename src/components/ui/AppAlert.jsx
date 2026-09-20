import React, { useCallback, useEffect, useState } from 'react';

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
      role="alertdialog"
      aria-modal="true"
      aria-label="Notice"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(15, 14, 12, 0.45)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#fffdf9',
          border: '1px solid #ece7db',
          borderRadius: 16,
          boxShadow: '0 24px 64px -16px rgba(15, 14, 12, 0.45)',
          overflow: 'hidden',
          animation: 'pixnxt-alert-in 0.18s ease-out',
        }}
      >
        <style>{`@keyframes pixnxt-alert-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
        <div style={{ padding: '20px 22px 8px' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1c1917', letterSpacing: '-0.01em' }}>
            Notice
          </h3>
        </div>
        <div style={{ padding: '8px 22px 4px' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#57534e', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
            {current}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 22px 20px' }}>
          <button
            type="button"
            onClick={dismiss}
            autoFocus
            style={{
              padding: '9px 28px',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
