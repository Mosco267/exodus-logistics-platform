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
  <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      var saved = localStorage.getItem('exodus_dark_mode');
      var savedSource = localStorage.getItem('exodus_dark_mode_source');
      var isDark;
      if (savedSource === 'manual' && saved !== null) {
        isDark = saved === 'true';
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        localStorage.removeItem('exodus_dark_mode');
        localStorage.removeItem('exodus_dark_mode_source');
      }
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch(e) {}
  })();
`}} />
    {children}
  </body>
</html>
  );
}