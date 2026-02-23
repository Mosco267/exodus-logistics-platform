'use client';

import AuthSessionProvider from '@/components/SessionProvider';
import { ReactNode, useContext } from 'react';
import { IntlProvider } from 'react-intl';
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

interface Props {
  children: ReactNode;
}

function LocaleConsumer({ children }: Props) {
  const { locale } = useContext(LocaleContext);
  const messages = messagesMap[locale];

  return (
    <IntlProvider locale={locale} messages={messages}>
  <AuthSessionProvider>
    {children}
  </AuthSessionProvider>
</IntlProvider>
  );
}

export default function LocaleLayout({ children }: Props) {
  return (
    <LocaleProvider>
      <LocaleConsumer>{children}</LocaleConsumer>
    </LocaleProvider>
  );
}