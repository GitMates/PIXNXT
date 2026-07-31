/** Photographer app chrome appearance (Auto / Light / Dark). */

export const THEME_MODE_KEY = 'themeMode';
export const THEME_CHANGE_EVENT = 'theme-change';

export const THEME_MODES = Object.freeze(['auto', 'light', 'dark']);

export function getThemeMode() {
    try {
        const raw = localStorage.getItem(THEME_MODE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
    } catch {
        /* ignore */
    }
    return 'light';
}

export function setThemeMode(mode) {
    const next = THEME_MODES.includes(mode) ? mode : 'light';
    try {
        localStorage.setItem(THEME_MODE_KEY, next);
    } catch {
        /* ignore */
    }
    applyAppearanceTheme(next);
    try {
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode: next } }));
    } catch {
        /* ignore */
    }
    return next;
}

export function systemPrefersDark() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve whether dark chrome should be active for a stored preference. */
export function resolveIsDarkTheme(mode = getThemeMode()) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemPrefersDark();
}

/**
 * Apply or remove `body.dark-theme`.
 * Marketing (`/`) and event pages (`/e/*`) stay light.
 */
export function applyAppearanceTheme(mode = getThemeMode(), pathname = window.location?.pathname || '/') {
    if (typeof document === 'undefined') return false;
    const forceLight = pathname === '/' || pathname.startsWith('/e/');
    const isDark = !forceLight && resolveIsDarkTheme(mode);
    document.body.classList.toggle('dark-theme', isDark);
    return isDark;
}
