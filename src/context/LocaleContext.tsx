'use client';

import { createContext, useState, ReactNode, useEffect } from 'react';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it';

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
    const saved = localStorage.getItem('selectedLanguage') as Locale | null;

    if (
      saved &&
      ['en', 'es', 'fr', 'de', 'zh', 'it'].includes(saved)
    ) {
      setLocale(saved);
    } else {
      setLocale('en');
    }
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