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

type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it';
const messagesMap: Record<Locale, any> = { en, es, fr, de, zh, it };

function InnerProviders({ children }: { children: ReactNode }) {
  const { locale } = useContext(LocaleContext);
  const messages = messagesMap[(locale as Locale) || 'en'] || en;

  return (
    <IntlProvider locale={locale} messages={messages}>
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