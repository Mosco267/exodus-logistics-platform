'use client';

import { ReactNode, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { IntlProvider } from 'react-intl';
import { LocaleContext } from '@/context/LocaleContext';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import zh from '@/messages/zh.json';
import it from '@/messages/it.json';

const messages: Record<string, any> = {
  en,
  es,
  fr,
  de,
  zh,
  it,
};

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  const { locale } = useContext(LocaleContext);
  const pathname = usePathname();

  // ✅ Check if current route is dashboard
  const isDashboard = pathname.includes('/dashboard');

  return (
    <IntlProvider
      key={locale}
      locale={locale}
      messages={messages[locale]}
    >
      {!isDashboard && <Header />}

      {children}

      {!isDashboard && <Footer />}
    </IntlProvider>
  );
}