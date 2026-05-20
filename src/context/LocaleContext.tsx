'use client';

import { createContext, useState, ReactNode, useEffect } from 'react';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it' | 'ar' | 'pt' | 'ru' | 'ja' | 'ko' | 'hi';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'fr', 'de', 'zh', 'it', 'ar', 'pt', 'ru', 'ja', 'ko', 'hi'];

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
});

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale | null>(null);

  // Load saved language BEFORE rendering
  useEffect(() => {
    let resolved: Locale = 'en';

    // 1) Try URL locale first (e.g. /fr/dashboard)
    try {
      const m = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      if (m && (SUPPORTED_LOCALES as string[]).includes(m[1])) {
        resolved = m[1] as Locale;
      }
    } catch {}

    // 2) Fall back to localStorage
    if (resolved === 'en') {
      try {
        const saved = localStorage.getItem('selectedLanguage') as Locale | null;
        if (saved && (SUPPORTED_LOCALES as string[]).includes(saved)) {
          resolved = saved;
        }
      } catch {}
    }

    // 3) Fall back to cookie (set by middleware)
    if (resolved === 'en') {
      try {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)exodus_locale=([^;]+)/);
        const cookieLocale = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        if (cookieLocale && (SUPPORTED_LOCALES as string[]).includes(cookieLocale)) {
          resolved = cookieLocale as Locale;
        }
      } catch {}
    }

    setLocale(resolved);
  }, []);

  // Save locale when it changes
  useEffect(() => {
    if (locale) {
      localStorage.setItem('selectedLanguage', locale);
    }
  }, [locale]);

  // 🚫 Wait until locale is loaded before rendering app
  if (!locale) return null;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};