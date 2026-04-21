'use client';

import { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';

const LANGUAGES = [
  { code: 'en', name: 'English', countryCode: 'gb', region: 'United Kingdom' },
  { code: 'es', name: 'Spanish', countryCode: 'es', region: 'España' },
  { code: 'fr', name: 'French', countryCode: 'fr', region: 'France' },
  { code: 'de', name: 'German', countryCode: 'de', region: 'Deutschland' },
  { code: 'zh', name: 'Chinese', countryCode: 'cn', region: '中国' },
  { code: 'it', name: 'Italian', countryCode: 'it', region: 'Italia' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  accent?: string;
  accentSolid?: string;
};

export default function LanguageModal({ open, onClose, accent, accentSolid }: Props) {
  const { locale, setLocale } = useContext(LocaleContext);

  const [resolvedAccent, setResolvedAccent] = useState(accent || 'linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [resolvedSolid, setResolvedSolid] = useState(accentSolid || '#0b3aa4');

  useEffect(() => {
    if (accent) { setResolvedAccent(accent); return; }
    const map: Record<string, { gradient: string; solid: string }> = {
      default:  { gradient: 'linear-gradient(135deg, #0b3aa4, #0e7490)', solid: '#0b3aa4' },
      ocean:    { gradient: 'linear-gradient(135deg, #0e7490, #06b6d4)', solid: '#0891b2' },
      sunset:   { gradient: 'linear-gradient(135deg, #0b3aa4, #f97316)', solid: '#f97316' },
      arctic:   { gradient: 'linear-gradient(135deg, #0284c7, #bae6fd)', solid: '#0284c7' },
      midnight: { gradient: 'linear-gradient(135deg, #0f172a, #0e7490)', solid: '#06b6d4' },
    };
    const apply = () => {
      const cached = localStorage.getItem('exodus_theme_cache');
      if (cached && map[cached]) {
        setResolvedAccent(map[cached].gradient);
        setResolvedSolid(map[cached].solid);
      }
    };
    apply();
    window.addEventListener('storage', apply);
    const interval = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(interval); };
  }, [accent]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[1000] max-w-sm mx-auto"
            onClick={e => e.stopPropagation()}>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

              {/* Header — uses theme gradient */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ background: resolvedAccent }}>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Language</h2>
                  <p className="text-xs text-white/70 mt-0.5">Select your preferred language</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/20 transition cursor-pointer text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Language list */}
              <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                {LANGUAGES.map(lang => {
                  const isActive = locale === lang.code;
                  return (
                    <button key={lang.code}
                      onClick={() => {
                        setLocale(lang.code as any);
                        // Save to cookie so middleware respects user choice
                        document.cookie = `exodus_locale=${lang.code}; max-age=${60 * 60 * 24 * 365}; path=/`;
                        onClose();
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-left border-2"
                      style={{
                        borderColor: isActive ? resolvedSolid : 'transparent',
                        background: isActive ? `${resolvedSolid}15` : 'transparent',
                      }}>
                      {/* Flag image — works on desktop and mobile */}
                      <img
                        src={`https://flagcdn.com/w40/${lang.countryCode}.png`}
                        srcSet={`https://flagcdn.com/w80/${lang.countryCode}.png 2x`}
                        width="28"
                        height="21"
                        alt={lang.name}
                        className="rounded-sm object-cover shrink-0"
                        style={{ minWidth: 28 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200"
                          style={isActive ? { color: resolvedSolid } : {}}>
                          {lang.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lang.region}</p>
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: resolvedAccent }}>
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 dark:border-white/10">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">More languages coming soon</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}