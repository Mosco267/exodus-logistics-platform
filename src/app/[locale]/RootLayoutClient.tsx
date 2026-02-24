'use client';

import { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppProviders from '@/components/AppProviders';

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <Header />
      <main>{children}</main>
      <Footer />
    </AppProviders>
  );
}