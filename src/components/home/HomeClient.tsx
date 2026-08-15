'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  Variants,
  useReducedMotion,
  useAnimation,
  useInView,
} from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import {
  Shield,
  Clock,
  Users,
  Package,
  Plane,
  Ship,
  Truck,
  MapPin,
  Headphones,
  CheckCircle2,
  ChevronDown,
  Building2,
  Boxes,
  ClipboardCheck,
  Route,
  ScanLine,
  FileText,
  Lock,
  BadgeInfo,
  Receipt,
} from 'lucide-react';

import QuickActions from '@/components/QuickActions';
import GetAQuoteForm from '@/components/GetAQuoteForm';

/* ----------------------------- helpers ----------------------------- */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

const containerVariantsDesktop: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const containerVariantsMobile: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02, delayChildren: 0.01 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

function Section({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const ref = useRef<HTMLElement | null>(null);
  const controls = useAnimation();
  const inView = useInView(ref, { amount: isMobile ? 0.14 : 0.18 });

  useEffect(() => {
    if (reduceMotion) return;
    if (inView) controls.start('show');
    else controls.start('hidden');
  }, [inView, controls, reduceMotion]);

  const variants = isMobile ? containerVariantsMobile : containerVariantsDesktop;

  return (
    <section ref={ref} id={id} className={`py-20 md:py-24 ${className}`}>
      <motion.div
        variants={variants}
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? undefined : controls}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  );
}

function ClickCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const whileHover = !isMobile && !reduceMotion ? { y: -4 } : undefined;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={whileHover}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={[
        'rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-gray-300 transition-all',
        onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- page ----------------------------- */

export default function HomeClient() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const nav = (path: string) => router.push(`/${locale}${path}`);

  const services = useMemo(
    () => [
      { icon: Plane, title: t('Home.svcAirTitle'), short: t('Home.svcAirDesc'), href: '/services' },
      { icon: Ship, title: t('Home.svcSeaTitle'), short: t('Home.svcSeaDesc'), href: '/services' },
      { icon: Truck, title: t('Home.svcRoadTitle'), short: t('Home.svcRoadDesc'), href: '/services' },
      { icon: Package, title: t('Home.svcWarehouseTitle'), short: t('Home.svcWarehouseDesc'), href: '/services' },
    ],
    [intl.locale]
  );

  const features = useMemo(
    () => [
      { icon: Receipt, title: t('Home.featPricingTitle'), short: t('Home.featPricingDesc'), href: '/quote' },
      { icon: Clock, title: t('Home.featTrackingTitle'), short: t('Home.featTrackingDesc'), href: '/track' },
      { icon: Shield, title: t('Home.featInsuranceTitle'), short: t('Home.featInsuranceDesc'), href: '/quote' },
      { icon: Users, title: t('Home.featSupportTitle'), short: t('Home.featSupportDesc'), href: '/support' },
    ],
    [intl.locale]
  );

  const stats = useMemo(
    () => [
      { label: t('Home.statModesLabel'), value: t('Home.statModesValue'), href: '/services' },
      { label: t('Home.statQuoteLabel'), value: t('Home.statQuoteValue'), href: '/quote' },
      { label: t('Home.statLangsLabel'), value: t('Home.statLangsValue'), href: '/about' },
      { label: t('Home.statTrackingLabel'), value: t('Home.statTrackingValue'), href: '/track' },
    ],
    [intl.locale]
  );

  // Typewriter
  const words = useMemo(
    () => [t('Home.readyWord1'), t('Home.readyWord2'), t('Home.readyWord3')],
    [intl.locale]
  );
  const colors = useMemo(() => ['text-cyan-200', 'text-orange-300', 'text-white'], []);

  const [displayedText, setDisplayedText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset the typewriter when the language changes
  useEffect(() => {
    setDisplayedText('');
    setWordIndex(0);
    setIsDeleting(false);
  }, [intl.locale]);

  useEffect(() => {
    if (reduceMotion) return;

    const current = words[wordIndex] || '';
    const speed = isDeleting ? 40 : 70;

    const timer = window.setTimeout(() => {
      if (!isDeleting) {
        const next = current.substring(0, displayedText.length + 1);
        setDisplayedText(next);
        if (next === current) window.setTimeout(() => setIsDeleting(true), 1300);
      } else {
        const next = current.substring(0, displayedText.length - 1);
        setDisplayedText(next);
        if (next === '') {
          setIsDeleting(false);
          setWordIndex((p) => (p + 1) % words.length);
        }
      }
    }, speed);

    return () => window.clearTimeout(timer);
  }, [displayedText, isDeleting, wordIndex, words, reduceMotion]);

  const readyRef = useRef<HTMLDivElement | null>(null);
  const readyControls = useAnimation();
  const readyInView = useInView(readyRef, { amount: 0.25 });

  useEffect(() => {
    if (reduceMotion) return;
    if (readyInView) readyControls.start({ opacity: 1, y: 0 });
    else readyControls.start({ opacity: 0, y: 24 });
  }, [readyInView, readyControls, reduceMotion]);

  const faqs = useMemo(
    () => [
      { q: t('Home.faq1q'), a: t('Home.faq1a') },
      { q: t('Home.faq2q'), a: t('Home.faq2a') },
      { q: t('Home.faq3q'), a: t('Home.faq3a') },
      { q: t('Home.faq4q'), a: t('Home.faq4a') },
      { q: t('Home.faq5q'), a: t('Home.faq5a') },
      { q: t('Home.faq6q'), a: t('Home.faq6a') },
    ],
    [intl.locale]
  );

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  /* ----------------------------- overrides ----------------------------- */

  if (showQuoteForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowQuoteForm(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            ← {t('Home.backHome')}
          </button>
          <GetAQuoteForm />
        </div>
      </div>
    );
  }

  if (showInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowInvoice(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            ← {t('Home.backHome')}
          </button>
          <div className="text-center text-2xl font-bold text-gray-600">
            {t('Home.invoiceSoon')}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="min-h-screen bg-white pt-12 md:pt-14">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />

          {!isMobile && (
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                  <path
                    d="M 44 0 L 0 0 0 44"
                    fill="none"
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {!reduceMotion && !isMobile && (
            <>
              <motion.div
                className="absolute -top-10 left-12 w-36 h-36 bg-white/15 rounded-full blur-3xl"
                animate={{ y: [0, 14, 0], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute top-24 right-12 w-48 h-48 bg-cyan-200/15 rounded-full blur-3xl"
                animate={{ y: [0, -16, 0], opacity: [0.3, 0.55, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
            </>
          )}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm text-white/95 mb-5">
                <Headphones className="w-4 h-4" />
                {t('Home.heroBadge')}
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-md">
                {t('Home.heroTitle', {
                  accent: (chunks: any) => <span className="text-cyan-100">{chunks}</span>,
                })}
              </h1>

              <p className="mt-5 text-lg md:text-xl text-white/95 max-w-2xl leading-relaxed">
                {t('Home.heroSubtitle')}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => nav('/quote')}
                  className="bg-white text-blue-700 px-7 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                >
                  {t('Home.heroCtaQuote')}
                </motion.button>

                <motion.button
                  whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => nav('/track')}
                  className="bg-transparent text-white px-7 py-3.5 rounded-xl font-semibold border border-white/45 hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                >
                  {t('Home.heroCtaTrack')}
                </motion.button>
              </div>

              <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                {stats.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => nav(s.href)}
                    className="text-left rounded-xl bg-white/15 border border-white/20 px-3 py-3 hover:bg-white/20 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-white/90 leading-snug mt-0.5">{s.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
              className="hidden lg:block"
            >
              <div className="rounded-3xl bg-white/12 border border-white/20 backdrop-blur-md p-6 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {services.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => nav(s.href)}
                      className="text-left rounded-2xl bg-white/12 border border-white/20 p-4 hover:bg-white/18 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <s.icon className="w-6 h-6 text-cyan-100" />
                      <div className="mt-2 font-semibold">{s.title}</div>
                      <div className="text-sm text-white/85 mt-1 leading-snug line-clamp-3">
                        {s.short}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="bg-gray-50">
        <QuickActions
          onTrackClick={() => nav('/track')}
          onInvoiceClick={() => nav('/invoice')}
          onQuoteClick={() => nav('/quote')}
        />
      </div>

      {/* ================= WHY EXODUS ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.whyTitle', {
              accent: (chunks: any) => <span className="text-cyan-600">{chunks}</span>,
            })}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.whySub')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <ClickCard
              key={f.title}
              onClick={() => nav(f.href)}
              className="group relative overflow-hidden border border-gray-200/80 bg-white ring-1 ring-black/5 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_55px_-26px_rgba(0,0,0,0.45)] hover:border-cyan-200 transition-all"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-cyan-500 to-transparent opacity-90" />
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 ring-1 ring-cyan-100 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-cyan-700" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 text-lg">{f.title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed text-sm">{f.short}</p>
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= PRICING TRANSPARENCY ================= */}
      <Section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-700 mb-5">
              <Receipt className="w-4 h-4" />
              {t('Home.pricingBadge')}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {t('Home.pricingTitle')}
            </h2>

            <p className="text-gray-600 mt-4 leading-relaxed">{t('Home.pricingP1')}</p>
            <p className="text-gray-600 mt-3 leading-relaxed">{t('Home.pricingP2')}</p>

            <ul className="mt-7 space-y-3">
              {[t('Home.pricingB1'), t('Home.pricingB2'), t('Home.pricingB3')].map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{x}</span>
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={isMobile || reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => nav('/quote')}
              className="mt-8 px-6 py-3.5 rounded-xl bg-blue-700 text-white shadow hover:bg-blue-800 transition-all font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {t('Home.pricingCta')}
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-400" />
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t('Home.sampleLabel')}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {t('Home.sampleRoute')}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                    <Plane className="w-5 h-5 text-blue-700" />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-sm">
                  {[
                    { label: t('Home.sampleFreight'), value: '412.00' },
                    { label: t('Home.sampleFuel'), value: '49.44' },
                    { label: t('Home.sampleInsurance'), value: '18.75' },
                    { label: t('Home.sampleHandling'), value: '25.00' },
                    { label: t('Home.sampleCustoms'), value: '60.00' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-gray-600">
                      <span>{row.label}</span>
                      <span className="font-semibold text-gray-800">USD {row.value}</span>
                    </div>
                  ))}

                  <div className="flex justify-between text-green-600 pt-1">
                    <span>{t('Home.sampleDiscount')}</span>
                    <span className="font-semibold">− USD 30.00</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3.5 mt-1">
                    <span className="font-extrabold text-gray-900">{t('Home.sampleTotal')}</span>
                    <span className="text-lg font-extrabold text-blue-700">USD 535.19</span>
                  </div>
                </div>

                <p className="mt-5 text-[11px] text-gray-400 leading-relaxed">
                  {t('Home.sampleNote')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ================= SERVICES ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.modesTitle', {
              accent: (chunks: any) => <span className="text-blue-700">{chunks}</span>,
            })}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.modesSub')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <ClickCard
              key={s.title}
              onClick={() => nav(s.href)}
              className="group relative overflow-hidden border border-gray-200/80 bg-white ring-1 ring-black/5 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_55px_-26px_rgba(0,0,0,0.45)] hover:border-blue-200 transition-all"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-700 via-cyan-500 to-transparent opacity-90" />
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                  <s.icon className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 text-lg">{s.title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed text-sm">{s.short}</p>
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= HOW IT WORKS ================= */}
      <Section className="bg-gradient-to-b from-white to-gray-50">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.howTitle')}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.howSub')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', icon: FileText, title: t('Home.how1Title'), text: t('Home.how1Text'), href: '/quote' },
            { step: '02', icon: ClipboardCheck, title: t('Home.how2Title'), text: t('Home.how2Text'), href: '/invoice' },
            { step: '03', icon: Route, title: t('Home.how3Title'), text: t('Home.how3Text'), href: '/track' },
            { step: '04', icon: ScanLine, title: t('Home.how4Title'), text: t('Home.how4Text'), href: '/track' },
          ].map((x) => (
            <ClickCard
              key={x.step}
              onClick={() => nav(x.href)}
              className="group relative overflow-hidden border border-gray-200/80 bg-white ring-1 ring-black/5 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_55px_-26px_rgba(0,0,0,0.45)] hover:border-gray-300 transition-all"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-500 via-blue-600 to-transparent opacity-90" />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center">
                    <x.icon className="w-6 h-6 text-gray-800" />
                  </div>
                  <span className="text-2xl font-extrabold text-gray-200 tabular-nums">
                    {x.step}
                  </span>
                </div>
                <div className="mt-4 font-semibold text-gray-900 text-lg">{x.title}</div>
                <div className="mt-2 text-gray-600 leading-relaxed text-sm">{x.text}</div>
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= COVERAGE ================= */}
      <Section className="bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div variants={itemVariants}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {t('Home.coverageTitle')}
            </h2>
            <p className="text-gray-600 mt-4 leading-relaxed">{t('Home.coverageP1')}</p>
            <p className="text-gray-600 mt-3 leading-relaxed">{t('Home.coverageP2')}</p>

            <ul className="mt-7 space-y-3">
              {[t('Home.coverageB1'), t('Home.coverageB2'), t('Home.coverageB3')].map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{x}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <motion.button
                whileHover={isMobile || reduceMotion ? undefined : { scale: 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={() => nav('/track')}
                className="px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all font-semibold text-gray-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {t('Home.heroCtaTrack')}
              </motion.button>
              <motion.button
                whileHover={isMobile || reduceMotion ? undefined : { scale: 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={() => nav('/quote')}
                className="px-5 py-3 rounded-xl bg-cyan-600 text-white shadow hover:bg-cyan-700 transition-all font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                {t('Home.heroCtaQuote')}
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-3xl bg-gray-50 border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <MapPin className="w-5 h-5 text-cyan-700" />
                {t('Home.coverageMapTitle')}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: t('Home.regionNA'), value: t('Home.regionNAValue') },
                  { label: t('Home.regionEU'), value: t('Home.regionEUValue') },
                  { label: t('Home.regionAsia'), value: t('Home.regionAsiaValue') },
                  { label: t('Home.regionAfrica'), value: t('Home.regionAfricaValue') },
                  { label: t('Home.regionSA'), value: t('Home.regionSAValue') },
                  { label: t('Home.regionOceania'), value: t('Home.regionOceaniaValue') },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="text-left rounded-2xl bg-white p-4 border border-gray-100"
                  >
                    <div className="text-sm text-gray-500">{x.label}</div>
                    <div className="font-semibold text-gray-900 mt-1 text-sm">{x.value}</div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs text-gray-500 leading-relaxed">
                {t('Home.coverageNote')}
              </p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ================= TRUST AND COMPLIANCE ================= */}
      <Section className="bg-gradient-to-b from-gray-50 to-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.trustTitle', {
              accent: (chunks: any) => <span className="text-blue-700">{chunks}</span>,
            })}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.trustSub')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Lock, title: t('Home.trust1Title'), text: t('Home.trust1Text'), href: '/services' },
            { icon: Shield, title: t('Home.trust2Title'), text: t('Home.trust2Text'), href: '/quote' },
            { icon: BadgeInfo, title: t('Home.trust3Title'), text: t('Home.trust3Text'), href: '/support' },
          ].map((x) => (
            <ClickCard
              key={x.title}
              onClick={() => nav(x.href)}
              className="group relative overflow-hidden border border-gray-200/80 bg-white ring-1 ring-black/5 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_55px_-26px_rgba(0,0,0,0.45)] hover:border-blue-200 transition-all"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-700 via-cyan-500 to-transparent opacity-90" />
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                  <x.icon className="w-6 h-6 text-blue-700" />
                </div>
                <div className="mt-4 font-semibold text-gray-900 text-lg">{x.title}</div>
                <div className="mt-2 text-gray-600 leading-relaxed text-sm">{x.text}</div>
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= INDUSTRIES ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.whoTitle', {
              accent: (chunks: any) => <span className="text-orange-600">{chunks}</span>,
            })}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.whoSub')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: t('Home.who1Title'), text: t('Home.who1Text'), href: '/quote' },
            { icon: Boxes, title: t('Home.who2Title'), text: t('Home.who2Text'), href: '/services' },
            { icon: Building2, title: t('Home.who3Title'), text: t('Home.who3Text'), href: '/contact' },
          ].map((x) => (
            <ClickCard
              key={x.title}
              onClick={() => nav(x.href)}
              className="group relative overflow-hidden border border-gray-200/80 bg-white ring-1 ring-black/5 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_55px_-26px_rgba(0,0,0,0.45)] hover:border-orange-200 transition-all"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-orange-500 via-blue-600 to-transparent opacity-90" />
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-orange-50 ring-1 ring-orange-100 flex items-center justify-center">
                  <x.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="mt-4 font-semibold text-gray-900 text-lg">{x.title}</div>
                <div className="mt-2 text-gray-600 leading-relaxed text-sm">{x.text}</div>
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= READY TO SHIP ================= */}
      <section className="relative py-24 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 overflow-hidden text-white">
        {!reduceMotion && !isMobile && (
          <>
            <motion.div
              className="absolute top-0 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
              animate={{ x: [0, 35, 0], y: [0, -20, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 right-10 w-72 h-72 bg-white/12 rounded-full blur-3xl"
              animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            ref={readyRef}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={reduceMotion ? undefined : readyControls}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
              {t('Home.readyTitle')}{' '}
              <span className={`${colors[wordIndex]} inline-block min-w-[280px] text-left`}>
                {displayedText}
                <span className="border-r-2 border-white/90 ml-1 animate-pulse" />
              </span>
            </h2>

            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-5 text-white/95 leading-relaxed">
              {t('Home.readyP1')}
            </p>

            <p className="text-base md:text-lg max-w-2xl mx-auto mb-9 text-white/85 leading-relaxed">
              {t('Home.readyP2')}
            </p>

            <motion.button
              whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => nav('/quote')}
              className="bg-white text-blue-700 px-9 py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
            >
              {t('Home.readyCta')}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('Home.faqTitle')}
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('Home.faqSub')}
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <ClickCard
                key={f.q}
                className="p-5"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-gray-900">{f.q}</div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-500 shrink-0"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="mt-3 text-gray-700 leading-relaxed whitespace-pre-line text-sm"
                    >
                      {f.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </ClickCard>
            );
          })}
        </div>

        <motion.div variants={itemVariants} className="text-center mt-10">
          <p className="text-gray-600">
            {t('Home.faqMore')}{' '}
            <button
              onClick={() => nav('/support')}
              className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
            >
              {t('Home.faqMoreLink')}
            </button>
          </p>
        </motion.div>
      </Section>
    </div>
  );
}