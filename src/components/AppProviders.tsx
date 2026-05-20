'use client';

import { ReactNode, useContext } from 'react';
import { IntlProvider } from 'react-intl';
import { SessionProvider } from 'next-auth/react';
import { LocaleProvider, LocaleContext } from '@/context/LocaleContext';

import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import zh from '@/messages/zh.json';
import it from '@/messages/it.json';
import ar from '@/messages/ar.json';
import pt from '@/messages/pt.json';
import ru from '@/messages/ru.json';
import ja from '@/messages/ja.json';
import ko from '@/messages/ko.json';
import hi from '@/messages/hi.json';

type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it' | 'ar' | 'pt' | 'ru' | 'ja' | 'ko' | 'hi';
const messagesMap: Record<Locale, any> = { en, es, fr, de, zh, it, ar, pt, ru, ja, ko, hi };

function InnerProviders({ children }: { children: ReactNode }) {
  const { locale } = useContext(LocaleContext);
  const activeLocale = (locale as Locale) || 'en';
  const messages = messagesMap[activeLocale] || en;

  return (
    <IntlProvider
      locale={activeLocale}
      messages={messages}
      defaultLocale="en"
      onError={(err) => {
        // Suppress missing-translation noise during phased rollout.
        // Falls back to the default message (or the key) automatically.
        if (err.code === 'MISSING_TRANSLATION') return;
        console.warn(err);
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </IntlProvider>
  );
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <InnerProviders>{children}</InnerProviders>
    </LocaleProvider>
  );
}