import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exodus Logistics',
  description: 'Logistics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
  </head>
  <body className="min-h-dvh overflow-x-hidden overflow-y-auto" style={{ overscrollBehaviorX: 'none', WebkitOverflowScrolling: 'touch' as any }}>
  
    {children}
  </body>
</html>
  );
}