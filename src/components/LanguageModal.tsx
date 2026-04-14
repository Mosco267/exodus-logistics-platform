'use client';

import { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', region: 'United Kingdom' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', region: 'España' },
  { code: 'fr', name: 'French', flag: '🇫🇷', region: 'France' },
  { code: 'de', name: 'German', flag: '🇩🇪', region: 'Deutschland' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', region: '中国' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', region: 'Italia' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LanguageModal({ open, onClose }: Props) {
  const { locale, setLocale } = useContext(LocaleContext);

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

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Language</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select your preferred language</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-500 dark:text-gray-400">
                  <X size={16} />
                </button>
              </div>

              {/* Language list */}
              <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                {LANGUAGES.map(lang => {
                  const isActive = locale === lang.code;
                  return (
                    <button key={lang.code}
                      onClick={() => { setLocale(lang.code as any); onClose(); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-[#0b3aa4] dark:border-blue-400'
                          : 'border-2 border-transparent hover:bg-blue-50/80 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'
                      }`}>
                      <span className="text-2xl shrink-0">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isActive ? 'text-[#0b3aa4] dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {lang.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lang.region}</p>
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
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