'use client';

type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Home, Info, Briefcase, Mail, MapPin, FileText, Calculator, Rocket } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import { useIntl } from 'react-intl';

export default function Header() {
  const intl = useIntl();
  const { locale, setLocale } = useContext(LocaleContext);
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Italian'] as const;
  const translate = (name: string) => intl.formatMessage({ id: `Header.${name}` });

  const codeToLang: Record<Locale, string> = {
    en: 'English', es: 'Spanish', fr: 'French',
    de: 'German', zh: 'Chinese', it: 'Italian',
  };

  const langToCode: Record<string, Locale> = {
    English: 'en', Spanish: 'es', French: 'fr',
    German: 'de', Chinese: 'zh', Italian: 'it',
  };

  const navigation = [
    { name: 'Home', href: `/${locale}`, icon: <Home className="w-4 h-4" /> },
    { name: 'About', href: `/${locale}/about`, icon: <Info className="w-4 h-4" /> },
    { name: 'Services', href: `/${locale}/services`, icon: <Briefcase className="w-4 h-4" /> },
    { name: 'Contact', href: `/${locale}/contact`, icon: <Mail className="w-4 h-4" /> },
    { name: 'Get Started', href: `/${locale}/sign-in`, icon: <Rocket className="w-4 h-4" /> },
  ] as const;

  const actions = [
    { name: 'Track', href: `/${locale}/track`, icon: <MapPin className="w-4 h-4" /> },
    { name: 'Invoice', href: `/${locale}/invoice`, icon: <FileText className="w-4 h-4" /> },
  ] as const;

  const isActive = (href: string) => {
  const pathWithoutLocale = pathname.split('/').slice(2).join('/');
  const itemPathWithoutLocale = href.split('/').slice(2).join('/');
  if (!itemPathWithoutLocale) return pathWithoutLocale === '';
  return pathWithoutLocale === itemPathWithoutLocale ||
    pathWithoutLocale.startsWith(itemPathWithoutLocale + '/');
};

  return (
    <>
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 shadow-xl"
        style={{ background: 'linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex justify-between items-center h-20 sm:h-28">

            {/* Logo — left aligned on all screens */}
            <Link href={`/${locale}`} className="flex items-center shrink-0">
              <img src="/logo.svg" alt="Exodus Logistics" className="h-11 sm:h-16 w-auto" />
            </Link>

            {/* Desktop Right Section */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">

              {/* Track & Invoice */}
              {actions.map((item) => (
  <Link key={item.name} href={item.href}
    className="flex items-center gap-1.5 text-white text-sm font-medium transition-all duration-300 hover:scale-110 hover:font-bold hover:text-base">
    <span className="transition-all duration-300">{item.icon}</span>
    <span className="transition-all duration-300">{translate(item.name)}</span>
  </Link>
))}

              {/* Language Dropdown */}
              <div className="relative">
                <button onClick={() => { setLanguageDropdownOpen(!languageDropdownOpen); setNavDropdownOpen(false); }}
  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300 cursor-pointer">
  <Globe className="w-4 h-4" />
  {codeToLang[locale]}
</button>
                <AnimatePresence>
                  {languageDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-40 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="py-2">
                        {languages.map((lang) => {
                          const code = langToCode[lang];
                          return (
                            <div key={lang}
                              onClick={() => { if (code) setLocale(code); setLanguageDropdownOpen(false); }}
                              className={`px-5 py-3 text-sm cursor-pointer font-bold transition-all duration-200 ${locale === code ? 'text-orange-500 bg-orange-50' : 'text-blue-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                              {lang}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quote Button */}
              <Link href={`/${locale}/quote`}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300">
                <Calculator className="w-4 h-4" />
                {translate('Quote')}
              </Link>

              {/* Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setNavDropdownOpen(!navDropdownOpen); setLanguageDropdownOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300 cursor-pointer">
                  <Menu className="w-4 h-4" />
                  {translate('Menu')}
                </button>
                <AnimatePresence>
                  {navDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="py-2">
                        {navigation.map((item) => (
                          <Link key={item.name} href={item.href} onClick={() => setNavDropdownOpen(false)}
                            className={`flex items-center gap-3 px-5 py-3 text-sm font-bold transition-all duration-200 ${isActive(item.href) ? 'text-orange-500 bg-orange-50' : 'text-cyan-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                            {item.icon}
                            <span>{translate(item.name)}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile: Track, Invoice icons + hamburger — all on the right */}
            <div className="md:hidden flex items-center gap-3">
  {actions.map((item) => (
    <Link key={item.name} href={item.href}
      className="inline-flex flex-col items-center gap-0.5 text-white">
      <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
      <span className="text-[9px] font-bold tracking-wide">{translate(item.name)}</span>
    </Link>
  ))}
  <button
  onClick={() => setIsMenuOpen(!isMenuOpen)}
  className="inline-flex flex-col items-center gap-0.5 text-white hover:text-orange-400 transition-colors duration-300 p-1">
  <Menu className="h-5 w-5" />
  <span className="text-[9px] font-bold tracking-wide">Menu</span>
</button>
</div>

          </div>
        </div>
      </motion.header>

      {/* ── MOBILE SIDEBAR DRAWER — outside header so it covers full screen ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="fixed top-0 right-0 h-full w-full bg-white z-50 shadow-2xl flex flex-col md:hidden"
            >
              {/* Sidebar Header */}
              <div
                className="flex items-center justify-between px-5 py-5 border-b border-gray-100"
                style={{ background: 'linear-gradient(to right, #1d4ed8, #0891b2)' }}>
                <img src="/logo.svg" alt="Exodus Logistics" className="h-10 w-auto" />
                <button
  onClick={() => setIsMenuOpen(false)}
  className="text-white hover:text-orange-400 transition-colors duration-300 p-1">
  <X className="h-6 w-6" />
</button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

                {/* Nav links */}
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href} onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive(item.href) ? 'text-orange-500 bg-orange-50' : 'text-blue-700 hover:text-orange-500 hover:bg-orange-50'}`}>
                    <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                    <span>{translate(item.name)}</span>
                  </Link>
                ))}

                {/* Track, Invoice & Quote */}
                <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
                  {actions.map((item) => (
                    <Link key={item.name} href={item.href} onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-blue-700 hover:text-orange-500 hover:bg-orange-50 transition-all">
                      <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                      <span>{translate(item.name)}</span>
                    </Link>
                  ))}

                  <Link href={`/${locale}/quote`} onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-blue-700 hover:text-orange-500 hover:bg-orange-50 transition-all">
                    <Calculator className="w-5 h-5" />
                    <span>{translate('Quote')}</span>
                  </Link>
                </div>

                {/* Language selector */}
                <div className="border-t border-gray-100 pt-4 mt-3 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">Language</p>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => {
                      const code = langToCode[lang];
                      return (
                        <button key={lang}
                          onClick={() => { if (code) setLocale(code); setIsMenuOpen(false); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${locale === code ? 'bg-orange-50 text-orange-500 border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-500'}`}>
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}