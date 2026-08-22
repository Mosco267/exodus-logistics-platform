// src/components/CookieBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { Cookie, X } from 'lucide-react';
import { useCookieConsent } from '@/lib/useCookieConsent';

export default function CookieBanner() {
  const params = useParams();
    const locale = (params?.locale as string) || 'en';
  const pathname = usePathname() || '/';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const { consent, loaded, accept, reject } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  /* A brief delay so the banner does not fight the page for attention
     during first paint. It still appears well before anyone could
     interact with the chat widget, which stays gated until consent. */
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

   /* The policy page carries its own accept and reject controls, so the
     banner would only duplicate them. Consent still stays unresolved
     until a choice is made, and the banner returns elsewhere. */
  const onPolicyPage = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') === '/cookies';

  const show = loaded && mounted && consent === null && !onPolicyPage;

   if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-live="polite"
          aria-label={t('Cookies.bannerLabel')}
          className="fixed bottom-0 left-0 right-0 z-[9995] p-3 sm:p-4 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #0891b2 100%)' }} />

            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5 text-blue-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{t('Cookies.title')}</p>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                    {t('Cookies.body', {
                      link: (chunks: any) => (
                        <Link href={`/${locale}/cookies`}
                          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-semibold">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>

                  {/* Both choices carry equal weight. A prominent accept
                      beside a buried reject is the pattern regulators
                      have taken issue with. */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={accept}
                      className="cursor-pointer flex-1 sm:flex-none sm:min-w-[150px] py-3 px-5 rounded-xl text-white text-sm font-bold transition hover:shadow-lg hover:shadow-blue-500/25"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}
                    >
                      {t('Cookies.accept')}
                    </button>
                    <button
                      onClick={reject}
                      className="cursor-pointer flex-1 sm:flex-none sm:min-w-[150px] py-3 px-5 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
                    >
                      {t('Cookies.reject')}
                    </button>
                    <Link
                      href={`/${locale}/cookies`}
                      className="cursor-pointer flex-1 sm:flex-none inline-flex items-center justify-center py-3 px-5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
                    >
                      {t('Cookies.learnMore')}
                    </Link>
                  </div>
                </div>

                {/* Dismiss is deliberately absent as a third option.
                    Closing without choosing would leave consent unresolved
                    and the banner would simply return on the next page. */}
              </div>
            </div>
          </div>
        </motion.div>
            )}
    </AnimatePresence>,
    document.body
  );
}