'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');

  useEffect(() => {
    const map: Record<string, string> = {
      default: '#0b3aa4',
      ocean: '#0891b2',
      sunset: '#f97316',
      arctic: '#0284c7',
      midnight: '#06b6d4',
    };
    const apply = () => {
      const c = localStorage.getItem('exodus_theme_cache');
      if (c && map[c]) setAccentSolid(map[c]);
    };
    apply();
    window.addEventListener('storage', apply);
    return () => window.removeEventListener('storage', apply);
  }, []);

  // Intercept link clicks to show spinner immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) return;
      if (href.startsWith('mailto:')) return;
      if (href.startsWith('tel:')) return;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        // External link — only show if it's same origin
        try {
          const url = new URL(href);
          if (url.origin !== window.location.origin) return;
        } catch { return; }
      }
      if (link.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      // Don't show for same-page anchor scrolls or current path
      if (href === pathname) return;

      setLoading(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  // Hide spinner once route changes
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 flex items-center gap-3 pointer-events-auto">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Loading...</span>
      </div>
    </div>
  );
}