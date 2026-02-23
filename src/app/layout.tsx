import { ReactNode } from 'react';
import './globals.css';
import { LocaleProvider } from '@/context/LocaleContext';
import RootLayoutClient from './[locale]/RootLayoutClient';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <LocaleProvider>
          <RootLayoutClient>
            {children}
          </RootLayoutClient>
        </LocaleProvider>
      </body>
    </html>
  );
}