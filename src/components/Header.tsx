'use client';

type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'it';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Home, Info, Briefcase, Mail, MapPin, FileText, Calculator, LogIn } from 'lucide-react';
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
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    it: 'Italian',
  };

  const langToCode: Record<string, Locale> = {
    English: 'en',
    Spanish: 'es',
    French: 'fr',
    German: 'de',
    Chinese: 'zh',
    Italian: 'it',
  };

  const navigation = [
    { name: 'Home', href: `/${locale}`, icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'About', href: `/${locale}/about`, icon: <Info className="w-4 h-4 mr-2" /> },
    { name: 'Services', href: `/${locale}/services`, icon: <Briefcase className="w-4 h-4 mr-2" /> },
    { name: 'Contact', href: `/${locale}/contact`, icon: <Mail className="w-4 h-4 mr-2" /> },
    { name: 'Sign-in', href: `/${locale}/sign-in`, icon: <LogIn className="w-4 h-4 mr-2" /> },
  ] as const;

  const actions = [
    { name: 'Track', href: `/${locale}/track`, icon: <MapPin className="w-4 h-4 mr-2" /> },
    { name: 'Invoice', href: `/${locale}/invoice`, icon: <FileText className="w-4 h-4 mr-2" /> },
  ] as const;

  return (
    <motion.header
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-[linear-gradient(to_right,white_0%,#1d4ed8_55%,#06b6d4_100%,#fb923c_100%)] shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-center h-28">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center">
            <img src="/logo.svg" alt="Exodus Logistics" className="h-16 w-auto" />
          </Link>

          {/* Right Section */}
          <div className="hidden md:flex items-center space-x-6">

            {/* Track & Invoice */}
            {actions.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center text-white text-sm font-medium transition-all duration-300"
              >
                {item.icon}
                <span className="transition-all duration-300 group-hover:text-base group-hover:font-semibold group-hover:scale-105">
                  {translate(item.name)}
                </span>
              </Link>
            ))}

            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {codeToLang[locale]}
              </button>

              <AnimatePresence>
                {languageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-40 bg-white rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="py-2">
                      {languages.map((lang) => {
                        const code = langToCode[lang];
                        const isSelected = locale === code;
                        return (
                          <div
                            key={lang}
                            onClick={() => {
                              if (code) setLocale(code);
                              setLanguageDropdownOpen(false);
                            }}
                            className={`px-5 py-3 text-sm cursor-pointer font-bold transition-all duration-200
                              ${isSelected
                                ? 'text-orange-500 bg-orange-50 shadow-lg'
                                : 'text-blue-600 hover:text-orange-500 hover:bg-orange-50 hover:font-bold hover:shadow-2xl'}`}
                          >
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
            <Link
              href={`/${locale}/quote`}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300"
            >
              <Calculator className="w-4 h-4 text-white" />
              {translate('Quote')}
            </Link>

            {/* Menu Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 hover:shadow-[0_8px_15px_rgba(0,0,0,0.7)] hover:font-bold transition-all duration-300 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                {translate('Menu')}
              </button>

              <AnimatePresence>
                {navDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="py-2">
                      {navigation.map((item) => {
                        const pathWithoutLocale = pathname.split('/').slice(2).join('/'); 
const itemPathWithoutLocale = item.href.split('/').slice(2).join('/');
const isSelected = pathWithoutLocale === itemPathWithoutLocale;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setNavDropdownOpen(false)}
                            className={`flex items-center px-5 py-3 text-sm font-bold transition-all duration-200
                              ${isSelected
                                ? 'text-orange-500 bg-orange-50'
                                : 'text-cyan-600 hover:text-orange-500 hover:bg-orange-50'}`}
                          >
                            {item.icon}
                            <span className="ml-2">{translate(item.name)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-orange-400 transition-colors duration-300"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
