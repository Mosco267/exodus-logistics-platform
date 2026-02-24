import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exodus Logistics',
  description: 'Logistics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}