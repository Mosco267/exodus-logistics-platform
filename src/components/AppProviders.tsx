'use client';

import { ReactNode, useContext } from 'react';
import { IntlProvider } from 'react-intl';
import AuthSessionProvider from '@/components/SessionProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LocaleProvider, LocaleContext } from '@/context/LocaleContext';

import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import zh from '@/messages/zh.json';
import it from '@/messages/it.json';

type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it';
const messagesMap: Record<Locale, Record<string, any>> = { en, es, fr, de, zh, it };

function LocaleConsumer({ children }: { children: ReactNode }) {
  const { locale } = useContext(LocaleContext);
  const messages = messagesMap[(locale as Locale) || 'en'] || en;

  return (
    <IntlProvider locale={locale} messages={messages}>
      <AuthSessionProvider>
        <Header />
        {children}
        <Footer />
      </AuthSessionProvider>
    </IntlProvider>
  );
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <LocaleConsumer>{children}</LocaleConsumer>
    </LocaleProvider>
  );
}