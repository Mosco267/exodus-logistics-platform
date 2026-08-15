'use client';

import { useEffect, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';

/* ─────────────────────────────────────────────────────────────
   ONE WIDGET PER LANGUAGE.

   Tawk cannot switch a widget's language at runtime. In the Tawk
   dashboard create a widget for each language you want to support
   (Administration > Chat Widget > Add Widget), set its Language
   under Widget Content, then paste its chat id below.

   The chat id is the last part of the widget's Direct Link:
       PROPERTY_ID/WIDGET_ID

   Your property id stays the same across widgets. Only the widget
   id changes. Locales left pointing at DEFAULT_CHAT_ID simply get
   the English widget, so you can add languages gradually.
   ───────────────────────────────────────────────────────────── */

const PROPERTY_ID = '6a8011ef8711e91d4fb54996';
const DEFAULT_CHAT_ID = `${PROPERTY_ID}/1k024c44a`;

const CHAT_ID_BY_LOCALE: Record<string, string> = {
  en: DEFAULT_CHAT_ID,
  // Replace each placeholder with the widget id you created in Tawk:
   es: `${PROPERTY_ID}/1k028p2r4`,
   fr: `${PROPERTY_ID}/1k0285nds`,
   de: `${PROPERTY_ID}/1k028s7p9`,
   zh: `${PROPERTY_ID}/1k029bg1c`,
   it: `${PROPERTY_ID}/1k0291hoe`,
   ar: `${PROPERTY_ID}/1k029jm3d`,
   pt: `${PROPERTY_ID}/1k029dnfk`,
   ru: `${PROPERTY_ID}/1k029lel3`,
   ja: `${PROPERTY_ID}/1k029nf9d`,
   ko: `${PROPERTY_ID}/1k029pb9e`,
   hi: `${PROPERTY_ID}/1k029s0vm`,
};

/* Routes where the public widget stays hidden, because your own
   LiveChatWidget already runs there. */
const HIDDEN_ON = ['/dashboard', '/admin'];

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export default function LiveChatLoader() {
  const params = useParams();
  const pathname = usePathname() || '/';
  const locale = (params?.locale as string) || 'en';

  const chatId = CHAT_ID_BY_LOCALE[locale] || DEFAULT_CHAT_ID;

  // Strip the leading /{locale} so we can match route prefixes
  const routePath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  const shouldHide = HIDDEN_ON.some(
    p => routePath === p || routePath.startsWith(`${p}/`)
  );

  const hideRef = useRef(shouldHide);
  hideRef.current = shouldHide;

  // Which chat id the injected script is actually running
  const loadedChatId = useRef<string | null>(null);

  // Inject once, from a public route
  useEffect(() => {
    if (shouldHide) return;
    if (document.getElementById('tawk-script')) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onLoad = function () {
      try {
        if (hideRef.current) window.Tawk_API?.hideWidget?.();
      } catch {}
    };

    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = `https://embed.tawk.to/${chatId}`;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);

    loadedChatId.current = chatId;
  }, [shouldHide, chatId]);

  /* Tawk supports only one active widget per page and cannot swap
     languages at runtime, so a language change needs a fresh load.
     This only fires when the visitor actually switches language to
     one served by a different widget. */
  useEffect(() => {
    if (!loadedChatId.current) return;
    if (loadedChatId.current === chatId) return;
    window.location.reload();
  }, [chatId]);

  // Show or hide as the visitor moves between public and dashboard
  useEffect(() => {
    try {
      if (shouldHide) window.Tawk_API?.hideWidget?.();
      else window.Tawk_API?.showWidget?.();
    } catch {}
  }, [shouldHide]);

  return null;
}