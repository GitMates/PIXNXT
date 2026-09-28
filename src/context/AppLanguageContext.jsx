import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeAppLanguage, appUiStrings } from '../lib/app-languages';
import { useAuth } from '../hooks/useAuth';

const AppLanguageContext = createContext(null);

const GLOBAL_KEY = 'pixnxt_app_language';
const userKey = (uid) => (uid ? `pixnxt_app_language_${uid}` : GLOBAL_KEY);
export const APP_LANGUAGE_CHANGED_EVENT = 'pixnxt-app-language-changed';

function readStored(uid) {
  try {
    return (
      localStorage.getItem(userKey(uid)) ||
      localStorage.getItem(GLOBAL_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

function browserDefault() {
  try {
    const b = (navigator.language || '').slice(0, 2).toLowerCase();
    if (b === 'hi') return 'Hindi';
    if (b === 'ta') return 'Tamil';
  } catch {
    /* ignore */
  }
  return 'English';
}

/**
 * Photographer's own studio-app language (dashboard, sidebars, account).
 * Instant: context state re-renders all consumers on change; a storage
 * event keeps other tabs in sync without reload. Client galleries are
 * unaffected — they use each delivery's own language.
 */
export const AppLanguageProvider = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [lang, setLangState] = useState(() => {
    const stored = normalizeAppLanguage(readStored(uid));
    if (stored !== 'English') return stored;
    // Only fall back to the browser when nothing was ever chosen.
    try {
      if (!localStorage.getItem(userKey(uid)) && !localStorage.getItem(GLOBAL_KEY)) {
        return browserDefault();
      }
    } catch {
      /* ignore */
    }
    return 'English';
  });

  // Switching accounts loads that account's language.
  useEffect(() => {
    setLangState((prev) => {
      const next = normalizeAppLanguage(readStored(uid)) || 'English';
      try {
        if (!localStorage.getItem(userKey(uid))) return browserDefault();
      } catch {
        /* ignore */
      }
      return next === prev ? prev : next;
    });
  }, [uid]);

  // Other tabs switch instantly too.
  useEffect(() => {
    const onStorage = (event) => {
      if (!event.key || !event.key.startsWith('pixnxt_app_language')) return;
      const next = normalizeAppLanguage(event.newValue || '');
      if (next) setLangState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setAppLanguage = useCallback(
    (next) => {
      const id = normalizeAppLanguage(next);
      setLangState(id);
      try {
        localStorage.setItem(userKey(uid), id);
        localStorage.setItem(GLOBAL_KEY, id);
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new CustomEvent(APP_LANGUAGE_CHANGED_EVENT, { detail: { lang: id } }));
      } catch {
        /* ignore */
      }
    },
    [uid],
  );

  const value = useMemo(
    () => ({ lang, setAppLanguage, t: appUiStrings(lang) }),
    [lang, setAppLanguage],
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
};

export function useAppLanguage() {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    // Outside the provider (public pages) — static English, no-op setter.
    return { lang: 'English', setAppLanguage: () => {}, t: appUiStrings('English') };
  }
  return ctx;
}
