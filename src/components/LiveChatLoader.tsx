'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

const TAWK_SRC = 'https://embed.tawk.to/6a8011ef8711e91d4fb54996/1k024c44a';

/* Tawk expects a short language code. Map your locales to the
   ones Tawk supports, falling back to English. */
const TAWK_LANG: Record<string, string> = {
  en: 'en', es: 'es', fr: 'fr', de: 'de',
  zh: 'zh', it: 'it', ar: 'ar', pt: 'pt-br',
  ru: 'ru', ja: 'ja', ko: 'ko', hi: 'hi',
};

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export default function LiveChatLoader() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const lang = TAWK_LANG[locale] || 'en';

  // Keep the latest language available to the onLoad callback
  const langRef = useRef(lang);
  langRef.current = lang;

  // Inject the script once per page load
  useEffect(() => {
    if (document.getElementById('tawk-script')) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onLoad = function () {
      try {
        window.Tawk_API?.setAttributes?.({ language: langRef.current }, () => {});
      } catch {}
    };

    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = TAWK_SRC;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);
  }, []);

  // Re-sync if the visitor switches language mid session
  useEffect(() => {
    try {
      window.Tawk_API?.setAttributes?.({ language: lang }, () => {});
    } catch {}
  }, [lang]);

  return null;
}