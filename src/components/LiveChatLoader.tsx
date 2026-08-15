// src/components/LiveChatLoader.tsx
'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export default function LiveChatLoader() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    if (document.getElementById('tawk-script')) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onLoad = function () {
      window.Tawk_API.setAttributes({ language: locale }, () => {});
    };

    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = 'https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);
  }, []);

  // Re-sync when the user switches language mid-session
  useEffect(() => {
    if (window.Tawk_API?.setAttributes) {
      window.Tawk_API.setAttributes({ language: locale }, () => {});
    }
  }, [locale]);

  return null;
}