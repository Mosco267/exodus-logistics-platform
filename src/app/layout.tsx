import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exodus Logistics',
  description: 'Logistics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh overflow-x-hidden overflow-y-auto">
        {children}
      </body>
    </html>
  );
}