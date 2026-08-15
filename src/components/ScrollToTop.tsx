// src/components/ScrollToTop.tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useIntl } from 'react-intl';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [accentGradient, setAccentGradient] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const intl = useIntl();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const map: Record<string, string> = {
      default: 'linear-gradient(135deg, #0b3aa4, #0e7490)',
      ocean: 'linear-gradient(135deg, #0e7490, #06b6d4)',
      sunset: 'linear-gradient(135deg, #0b3aa4, #f97316)',
      arctic: 'linear-gradient(135deg, #0284c7, #bae6fd)',
      midnight: 'linear-gradient(135deg, #0f172a, #0e7490)',
    };
    const apply = () => {
      const c = localStorage.getItem('exodus_theme_cache');
      if (c && map[c]) setAccentGradient(map[c]);
    };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const label = intl.formatMessage({ id: 'Common.backToTop', defaultMessage: 'Back to top' });

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={label}
      title={label}
      className={`fixed bottom-6 left-6 z-40 w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
      style={{ background: accentGradient }}>
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}