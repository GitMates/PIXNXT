import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './AppToast.css';

export default function AppToast({ toast, onDismiss, hostClassName = '' }) {
    const hostClass = ['app-toast-host', hostClassName].filter(Boolean).join(' ');
    return (
        <div className={hostClass} aria-live="polite" aria-atomic="true">
            <AnimatePresence>
                {toast?.message ? (
                    <motion.div
                        key={toast.id ?? toast.message}
                        className={`app-toast app-toast--${toast.variant || 'success'}`}
                        role="status"
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className="app-toast__message">{toast.message}</span>
                        <button
                            type="button"
                            className="app-toast__close"
                            aria-label="Dismiss"
                            onClick={onDismiss}
                        >
                            x
                        </button>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
