'use client';

import { useEffect, useContext } from 'react';
import { LocaleContext } from '@/context/LocaleContext';

export default function HtmlLangUpdater() {
  const { locale } = useContext(LocaleContext);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}