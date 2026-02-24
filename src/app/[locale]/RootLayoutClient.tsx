'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppProviders from '@/components/AppProviders';

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // ✅ Hide public header/footer inside dashboard + admin
  const isDashboard = pathname?.includes('/dashboard');

  return (
    <AppProviders>
      <div className="min-h-screen flex flex-col">
        {!isDashboard && <Header />}

        {/* ✅ allow page to scroll normally */}
        <main className="flex-1">
          {children}
        </main>

        {!isDashboard && <Footer />}
      </div>
    </AppProviders>
  );
}