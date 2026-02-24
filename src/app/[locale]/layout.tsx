import type { ReactNode } from 'react';
import AppProviders from '../../components/AppProviders';

export default function LocaleLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}