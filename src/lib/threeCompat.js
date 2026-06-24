/**
 * Silence known upstream Three.js deprecation warnings (R3F v9 still uses THREE.Clock).
 * ES module exports are read-only, so we cannot replace THREE.Clock directly.
 */
if (import.meta.env.DEV) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (msg.includes('THREE.Clock: This module has been deprecated')) {
            return;
        }
        originalWarn.apply(console, args);
    };
}
