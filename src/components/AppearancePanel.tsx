'use client';

import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Monitor, Sun, Moon } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';

export type ThemeId = 'default' | 'ocean' | 'sunset' | 'arctic' | 'midnight';
export type ColorMode = 'system' | 'light' | 'dark';

export type Theme = {
  id: ThemeId;
  name: string;
  desc: string;
  sidebar: string;
  header: string;
  headerBorder: string;
  accent: string;
  accentHover: string;
  bg: string;
  text: string;
  subtext: string;
  activeLink: string;
  activeLinkText: string;
  darkHeader: string;
  darkHeaderBorder: string;
  darkBg: string;
  darkText: string;
  darkSubtext: string;
  preview: {
    sidebar: string;
    header: string;
    accent: string;
    bg: string;
    card: string;
  };
};

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    desc: 'Classic blue gradient — clean and professional',
    sidebar: 'linear-gradient(160deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)',
    header: '#ffffff',
    headerBorder: '#e5e7eb',
    accent: '#0b3aa4',
    accentHover: '#1d4ed8',
    bg: '#f9fafb',
    text: '#111827',
    subtext: '#6b7280',
    activeLink: '#ffffff',
    activeLinkText: '#0b3aa4',
    darkHeader: '#111827',
    darkHeaderBorder: '#1f2937',
    darkBg: '#030712',
    darkText: '#f9fafb',
    darkSubtext: '#9ca3af',
    preview: {
      sidebar: 'linear-gradient(160deg, #0b3aa4, #0e7490)',
      header: '#ffffff',
      accent: '#0b3aa4',
      bg: '#f9fafb',
      card: '#ffffff',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Deep cyan waves — calm and focused',
    sidebar: 'linear-gradient(160deg, #0e7490 0%, #0891b2 50%, #06b6d4 100%)',
    header: '#f0f9ff',
    headerBorder: '#bae6fd',
    accent: '#0891b2',
    accentHover: '#0e7490',
    bg: '#f0f9ff',
    text: '#0c4a6e',
    subtext: '#0369a1',
    activeLink: '#ffffff',
    activeLinkText: '#0891b2',
    darkHeader: '#0c2d3d',
    darkHeaderBorder: '#0e4a61',
    darkBg: '#071e2a',
    darkText: '#e0f2fe',
    darkSubtext: '#7dd3fc',
    preview: {
      sidebar: 'linear-gradient(160deg, #0e7490, #06b6d4)',
      header: '#f0f9ff',
      accent: '#0891b2',
      bg: '#f0f9ff',
      card: '#ffffff',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Warm orange glow — energetic and bold',
    sidebar: 'linear-gradient(160deg, #0b3aa4 0%, #1d4ed8 30%, #f97316 100%)',
    header: '#fff7ed',
    headerBorder: '#fed7aa',
    accent: '#f97316',
    accentHover: '#ea580c',
    bg: '#fff7ed',
    text: '#1c1917',
    subtext: '#78350f',
    activeLink: '#ffffff',
    activeLinkText: '#f97316',
    darkHeader: '#1c1108',
    darkHeaderBorder: '#431407',
    darkBg: '#0c0a09',
    darkText: '#fef3c7',
    darkSubtext: '#fb923c',
    preview: {
      sidebar: 'linear-gradient(160deg, #0b3aa4, #f97316)',
      header: '#fff7ed',
      accent: '#f97316',
      bg: '#fff7ed',
      card: '#ffffff',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    desc: 'Minimal white and cyan — light and airy',
    sidebar: 'linear-gradient(160deg, #0284c7 0%, #0891b2 50%, #bae6fd 100%)',
    header: '#ffffff',
    headerBorder: '#e0f2fe',
    accent: '#0284c7',
    accentHover: '#0369a1',
    bg: '#f8fafc',
    text: '#0f172a',
    subtext: '#64748b',
    activeLink: '#0284c7',
    activeLinkText: '#ffffff',
    darkHeader: '#0f1e2e',
    darkHeaderBorder: '#1e3a4f',
    darkBg: '#070d14',
    darkText: '#e0f2fe',
    darkSubtext: '#7dd3fc',
    preview: {
      sidebar: 'linear-gradient(160deg, #0284c7, #bae6fd)',
      header: '#ffffff',
      accent: '#0284c7',
      bg: '#f8fafc',
      card: '#ffffff',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Pure dark — always night mode',
    sidebar: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0e7490 100%)',
    header: '#0f172a',
    headerBorder: '#1e293b',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    bg: '#020617',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    activeLink: '#06b6d4',
    activeLinkText: '#0f172a',
    darkHeader: '#0f172a',
    darkHeaderBorder: '#1e293b',
    darkBg: '#020617',
    darkText: '#f1f5f9',
    darkSubtext: '#94a3b8',
    preview: {
      sidebar: 'linear-gradient(160deg, #0f172a, #0e7490)',
      header: '#0f172a',
      accent: '#06b6d4',
      bg: '#020617',
      card: '#1e293b',
    },
  },
];

function PhoneMockup({ theme }: { theme: Theme }) {
  const p = theme.preview;
  return (
    <div className="relative mx-auto" style={{ width: 80, height: 148 }}>
      <div className="absolute inset-0 rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 shadow-lg overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-b-lg z-10" />
        <div className="absolute inset-0.5 rounded-2xl overflow-hidden" style={{ background: p.bg }}>
          <div className="h-5 flex items-center px-1.5 gap-1" style={{ background: p.header, borderBottom: `1px solid #e5e7eb` }}>
            <div className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
            <div className="flex-1 h-1 rounded-full bg-gray-200 mx-1" />
            <div className="w-2 h-2 rounded-full" style={{ background: p.accent, opacity: 0.5 }} />
          </div>
          <div className="flex" style={{ height: 'calc(100% - 20px)' }}>
            <div className="w-4 flex flex-col items-center py-1.5 gap-1.5" style={{ background: p.sidebar }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-2 h-1 rounded-sm ${i === 1 ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
            <div className="flex-1 p-1 space-y-1">
              <div className="grid grid-cols-2 gap-0.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded p-0.5" style={{ background: p.card, border: '1px solid #f0f0f0' }}>
                    <div className="w-3 h-0.5 rounded mb-0.5" style={{ background: p.accent, opacity: 0.5 }} />
                    <div className="w-2 h-1 rounded bg-gray-300" />
                  </div>
                ))}
              </div>
              <div className="rounded p-0.5 space-y-0.5" style={{ background: p.card, border: '1px solid #f0f0f0' }}>
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ background: p.accent }} />
                    <div className="flex-1 h-0.5 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
];

type AppearancePanelProps = {
  open: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
};

export default function AppearancePanel({
  open, onClose, currentTheme, onThemeChange, colorMode, onColorModeChange,
}: AppearancePanelProps) {
  const [tab, setTab] = useState<'appearance' | 'language'>('appearance');
  const [seenThemes, setSeenThemes] = useState<ThemeId[]>([]);
  const [tooltipTheme, setTooltipTheme] = useState<ThemeId | null>(null);
  const { locale, setLocale } = useContext(LocaleContext);

  useEffect(() => {
    if (!open) return;
    const seen = JSON.parse(localStorage.getItem('exodus_seen_themes') || '["default"]');
    setSeenThemes(seen);
  }, [open]);

  const handleThemeSelect = (themeId: ThemeId) => {
    onThemeChange(themeId);
    if (!seenThemes.includes(themeId)) {
      setTooltipTheme(themeId);
      const updated = [...seenThemes, themeId];
      setSeenThemes(updated);
      localStorage.setItem('exodus_seen_themes', JSON.stringify(updated));
      setTimeout(() => setTooltipTheme(null), 2500);
    }
    // Close after short delay so user sees the selection
    setTimeout(() => onClose(), 600);
  };

  const colorModes: { id: ColorMode; label: string; icon: React.ReactNode }[] = [
    { id: 'system', label: 'System', icon: <Monitor size={16} /> },
    { id: 'light', label: 'Light', icon: <Sun size={16} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  ];

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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[1000] max-w-2xl mx-auto"
            onClick={e => e.stopPropagation()}>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Preferences</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customize your dashboard experience</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-500 dark:text-gray-400">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-white/10 px-6">
                {(['appearance', 'language'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`py-3 px-4 text-sm font-bold capitalize transition-all cursor-pointer border-b-2 -mb-px ${
                      tab === t
                        ? 'border-[#0b3aa4] text-[#0b3aa4] dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-6 max-h-[65vh] overflow-y-auto">

                {tab === 'appearance' && (
                  <div className="space-y-5">
                    {/* Color mode selector */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Color Mode</p>
                      <div className="grid grid-cols-3 gap-2">
                        {colorModes.map(({ id, label, icon }) => (
                          <button key={id} onClick={() => onColorModeChange(id)}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                              colorMode === id
                                ? 'border-[#0b3aa4] bg-blue-50 text-[#0b3aa4] dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-400'
                                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                            }`}>
                            {icon}
                            <span>{label}</span>
                            {colorMode === id && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/10 pt-5">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Theme</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {THEMES.map(theme => (
                          <div key={theme.id} className="relative">
                            <button
                              onClick={() => handleThemeSelect(theme.id)}
                              className={`w-full text-left rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
                                currentTheme === theme.id
                                  ? 'border-[#0b3aa4] dark:border-blue-400 shadow-lg ring-2 ring-[#0b3aa4]/20 dark:ring-blue-400/20'
                                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                              }`}>
                              <div className="flex items-center gap-3 p-3" style={{ background: theme.preview.bg }}>
                                <PhoneMockup theme={theme} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold" style={{ color: theme.text }}>{theme.name}</p>
                                    {currentTheme === theme.id && (
                                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                        style={{ background: theme.accent }}>
                                        <Check size={10} className="text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-relaxed" style={{ color: theme.subtext }}>{theme.desc}</p>
                                  <div className="flex items-center gap-1.5 mt-2">
                                    {[theme.accent, theme.preview.header, theme.preview.bg].map((c, i) => (
                                      <div key={i} className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: c }} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </button>

                            <AnimatePresence>
                              {tooltipTheme === theme.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap pointer-events-none">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
                                    <Sparkles size={11} />
                                    {theme.name} applied!
                                  </div>
                                  <div className="w-2 h-2 rotate-45 mx-auto -mt-1" style={{ background: '#0e7490' }} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'language' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select your preferred language</p>
                    {LANGUAGES.map(lang => (
                      <button key={lang.code}
                        onClick={() => setLocale(lang.code as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                          locale === lang.code
                            ? 'border-[#0b3aa4] bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        <span className="text-xl">{lang.flag}</span>
                        <span className={`text-sm font-semibold flex-1 ${
                          locale === lang.code ? 'text-[#0b3aa4] dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                        }`}>{lang.name}</span>
                        {locale === lang.code && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                    <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 text-center">More languages coming soon</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}