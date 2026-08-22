// src/app/[locale]/help/page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  LifeBuoy, Search, ChevronDown, MapPin, FileText, Calculator,
  MessageCircle, Mail, Package, CreditCard, ShieldCheck, UserCog,
  Truck, X, Inbox,
} from 'lucide-react';
import { useCompany } from '@/lib/useCompany';
import { useCookieConsent } from '@/lib/useCookieConsent';

/* Questions live here as translation keys rather than prose, so the
   whole help centre reads in the visitor's own language. Each entry
   needs a matching Help.q{id}Q and Help.q{id}A pair. */
type Category = {
  id: string;
  icon: typeof Package;
  questions: string[];
};

const CATEGORIES: Category[] = [
  {
    id: 'tracking',
    icon: MapPin,
    questions: ['track1', 'track2', 'track3', 'track4', 'track5'],
  },
  {
    id: 'quotes',
    icon: Calculator,
    questions: ['quote1', 'quote2', 'quote3', 'quote4', 'quote5'],
  },
  {
    id: 'shipping',
    icon: Package,
    questions: ['ship1', 'ship2', 'ship3', 'ship4', 'ship5', 'ship6'],
  },
  {
    id: 'invoices',
    icon: CreditCard,
    questions: ['inv1', 'inv2', 'inv3', 'inv4', 'inv5'],
  },
  {
    id: 'customs',
    icon: ShieldCheck,
    questions: ['cust1', 'cust2', 'cust3', 'cust4'],
  },
  {
    id: 'problems',
    icon: Truck,
    questions: ['prob1', 'prob2', 'prob3', 'prob4'],
  },
  {
    id: 'account',
    icon: UserCog,
    questions: ['acct1', 'acct2', 'acct3', 'acct4', 'acct5'],
  },
];

export default function HelpCentrePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();
  const { consent } = useCookieConsent();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  /* Search runs over the rendered text rather than the keys, so it
     works in whatever language the visitor is reading. */
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    const hits: { catId: string; qid: string }[] = [];
    for (const cat of CATEGORIES) {
      for (const qid of cat.questions) {
        const question = t(`Help.q_${qid}_Q`).toLowerCase();
        const answer = t(`Help.q_${qid}_A`).toLowerCase();
        if (question.includes(q) || answer.includes(q)) {
          hits.push({ catId: cat.id, qid });
        }
      }
    }
    return hits;
  }, [search, intl.locale]);

  const openChat = () => {
    try {
      const api = (window as any).Tawk_API;
      if (api?.maximize) { api.maximize(); return; }
    } catch {}
    if (company.email) window.location.href = `mailto:${company.email}`;
  };

  const QuestionRow = ({ qid }: { qid: string }) => {
    const isOpen = open === qid;
    return (
      <div className="border-b border-gray-100 last:border-0">
        <button
          onClick={() => setOpen(isOpen ? null : qid)}
          className="cursor-pointer w-full flex items-start justify-between gap-3 py-4 text-left group"
        >
          <span className={`text-sm font-semibold leading-relaxed transition ${isOpen ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'}`}>
            {t(`Help.q_${qid}_Q`)}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="pb-4 pr-8 text-sm text-gray-600 leading-relaxed">
                {t(`Help.q_${qid}_A`, {
                  track: (chunks: any) => (
                    <Link href={`/${locale}/track`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  quote: (chunks: any) => (
                    <Link href={`/${locale}/quote`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  invoice: (chunks: any) => (
                    <Link href={`/${locale}/invoice`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  contact: (chunks: any) => (
                    <Link href={`/${locale}/contact`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  signin: (chunks: any) => (
                    <Link href={`/${locale}/sign-in`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  services: (chunks: any) => (
                    <Link href={`/${locale}/services`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                  b: (chunks: any) => <strong className="font-semibold text-gray-800">{chunks}</strong>,
                  email: () => (
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all">{company.email}</a>
                  ),
                })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero with search ──────────────────────────── */}
      <section
        className="text-white pt-14 pb-12 sm:pt-20 sm:pb-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center mx-auto mb-5">
              <LifeBuoy className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              {t('Help.title')}
            </h1>
            <p className="text-base sm:text-lg text-blue-50/90 max-w-xl mx-auto leading-relaxed">
              {t('Help.subtitle')}
            </p>

            <div className="mt-7 max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setOpen(null); }}
                placeholder={t('Help.searchPlaceholder')}
                style={{ fontSize: '16px' }}
                className="w-full h-13 py-4 pl-12 pr-11 rounded-2xl bg-white text-gray-900 placeholder:text-gray-400 shadow-xl focus:outline-none focus:ring-4 focus:ring-white/25"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setOpen(null); }}
                  aria-label={t('Help.clearSearch')}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Quick actions ─────────────────────────────── */}
      {!search && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: `/${locale}/track`, icon: MapPin, key: 'track' },
              { href: `/${locale}/invoice`, icon: FileText, key: 'invoice' },
              { href: `/${locale}/quote`, icon: Calculator, key: 'quote' },
              { href: `/${locale}/contact`, icon: Mail, key: 'contact' },
            ].map(({ href, icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              >
                <Link href={href}
                  className="cursor-pointer h-full flex flex-col items-center text-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                    {t(`Help.action_${key}`)}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Content ───────────────────────────────────── */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Search results */}
          {results !== null ? (
            <>
              <p className="text-sm text-gray-500 mb-5">
                {results.length === 0
                  ? t('Help.noResults', { query: search.trim() })
                  : t('Help.resultCount', { count: results.length })}
              </p>

              {results.length === 0 ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{t('Help.noResultsTitle')}</p>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                    {t('Help.noResultsBody')}
                  </p>
                  <Link href={`/${locale}/contact`}
                    className="cursor-pointer mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold transition hover:shadow-lg hover:shadow-blue-500/25"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                    <Mail className="w-4 h-4" /> {t('Help.askTeam')}
                  </Link>
                </div>
              ) : (
                <div className="rounded-3xl border border-gray-200 bg-white px-5 sm:px-6 shadow-sm">
                  {results.map(({ qid }) => <QuestionRow key={qid} qid={qid} />)}
                </div>
              )}
            </>
          ) : (
            /* Categories */
            <div className="space-y-8">
              {CATEGORIES.map(({ id, icon: Icon, questions }, index) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.2) }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                      {t(`Help.cat_${id}`)}
                    </h2>
                  </div>
                  <div className="rounded-3xl border border-gray-200 bg-white px-5 sm:px-6 shadow-sm">
                    {questions.map(qid => <QuestionRow key={qid} qid={qid} />)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Still stuck ───────────────────────────────── */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              {t('Help.stillStuckTitle')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              {t('Help.stillStuckBody')}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link href={`/${locale}/contact`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold transition hover:shadow-lg hover:shadow-blue-500/25"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                <Mail className="w-4 h-4" /> {t('Help.askTeam')}
              </Link>

              {/* Chat only offered when the widget is actually loaded,
                  which requires cookie consent. Offering a button that
                  cannot open anything would be worse than omitting it. */}
              {consent === 'accepted' && (
                <button onClick={openChat}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition">
                  <MessageCircle className="w-4 h-4" /> {t('Help.startChat')}
                </button>
              )}
            </div>

            {company.email && (
              <p className="mt-5 text-xs text-gray-400">
                {t('Help.orEmail', {
                  email: () => (
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all">
                      {company.email}
                    </a>
                  ),
                })}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}