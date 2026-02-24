import { ReactNode } from 'react';
import RootLayoutClient from './RootLayoutClient';

export default function LocaleLayout({ children }: { children: ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}