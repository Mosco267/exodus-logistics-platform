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
import {
  Globe,
  Shield,
  Clock,
  Users,
  Package,
  Plane,
  Ship,
  Truck,
  MapPin,
  Headphones,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Building2,
  Boxes,
  BadgeCheck,
  ClipboardCheck,
  Route,
  ScanLine,
  FileText,
  Lock,
  BadgeInfo,
  Scale,
  Receipt,
  CreditCard,
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

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Back to top — bottom-LEFT so it never collides with the chat bubble
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Every internal link keeps the active language
  const nav = (path: string) => router.push(`/${locale}${path}`);

  const services = useMemo(
    () => [
      {
        icon: Plane,
        title: 'Air freight',
        short:
          'For time-critical cargo. Priority routing on international lanes, with clearance handled alongside the booking.',
        href: '/services',
      },
      {
        icon: Ship,
        title: 'Ocean freight',
        short:
          'The economical choice above roughly 500 kg. Slower than air, substantially cheaper per kilogram on volume.',
        href: '/services',
      },
      {
        icon: Truck,
        title: 'Road transport',
        short:
          'Domestic and regional movement, plus the first and last mile that connects to every air and ocean route.',
        href: '/services',
      },
      {
        icon: Package,
        title: 'Warehousing',
        short:
          'Secure storage between legs, with inventory handling for businesses shipping repeatedly on the same lanes.',
        href: '/services',
      },
    ],
    []
  );

  const features = useMemo(
    () => [
      {
        icon: Receipt,
        title: 'Priced before you commit',
        short:
          'Freight, fuel, insurance, handling, customs, and tax are itemised at quote time. No figure appears on your invoice that you have not already seen.',
        href: '/quote',
      },
      {
        icon: Clock,
        title: 'Tracking that explains itself',
        short:
          'Each milestone states what happened, where, and what comes next, so you are never left interpreting a status code on your own.',
        href: '/track',
      },
      {
        icon: Shield,
        title: 'Insurance sized to the cargo',
        short:
          'Coverage is calculated from your declared value rather than sold as a flat add-on, so you pay in proportion to what is actually at risk.',
        href: '/quote',
      },
      {
        icon: Users,
        title: 'Support you can reach',
        short:
          'Live chat and a ticket system with full shipment history attached, so you are not repeating your tracking number to every new agent.',
        href: '/support',
      },
    ],
    []
  );

  // Only claims that are verifiable from the platform itself
  const stats = useMemo(
    () => [
      { label: 'Air, ocean, and road', value: '3 modes', href: '/services' },
      { label: 'Itemised before booking', value: 'Full quote', href: '/quote' },
      { label: 'Platform languages', value: '12', href: '/about' },
      { label: 'Milestone tracking', value: 'Live', href: '/track' },
    ],
    []
  );

  // Typewriter
  const words = useMemo(
    () => ['With Confidence?', 'Without Surprises?', 'With Exodus Logistics?'],
    []
  );
  const colors = useMemo(() => ['text-cyan-200', 'text-orange-300', 'text-white'], []);

  const [displayedText, setDisplayedText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;

    const current = words[wordIndex];
    const speed = isDeleting ? 40 : 70;

    const t = window.setTimeout(() => {
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

    return () => window.clearTimeout(t);
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
      {
        q: 'How is my shipping cost calculated?',
        a:
          `Your quote is built from six components: base freight, a fuel surcharge, insurance on your declared value, a handling fee, customs clearance where the route requires it, and any applicable tax.\n\n` +
          `Each line is shown separately before you book, so you can see exactly what you are paying for rather than a single unexplained total.\n\n` +
          `Nothing is added later. The figure you approve is the figure on your invoice.`,
        href: '/quote',
      },
      {
        q: 'Why is my quote higher than the weight I entered suggests?',
        a:
          `Carriers charge on whichever is greater: the actual weight of your package, or its volumetric weight — length × width × height in centimetres, divided by 5000.\n\n` +
          `A large, light package occupies space that cannot be sold to anyone else, so it is priced on the space it takes rather than what it weighs.\n\n` +
          `When volumetric weight applies to your shipment, we say so on the quote and show both figures, so the higher price is never a surprise.`,
        href: '/quote',
      },
      {
        q: 'How do I track my shipment?',
        a:
          `Enter your tracking number on the Track page. You will see a timeline of every stage the shipment has passed through, each with a timestamp and location.\n\n` +
          `Every entry states what happened and what happens next, rather than leaving you to interpret a status label.\n\n` +
          `If a shipment is held — at customs, for example — the timeline says why and what is required to release it.`,
        href: '/track',
      },
      {
        q: 'Do you handle customs clearance?',
        a:
          `Yes, on routes that require it. Clearance is priced into your quote rather than billed as an unexpected charge later.\n\n` +
          `We tell you which documents are needed before dispatch, because incomplete paperwork is the single most common cause of delay in international shipping.\n\n` +
          `If additional documentation becomes necessary in transit, you will be contacted directly rather than left to discover it from a stalled tracking page.`,
        href: '/services',
      },
      {
        q: 'Is my shipment insured?',
        a:
          `Insurance is calculated from the declared value you enter at quote time and appears as its own line on your invoice.\n\n` +
          `Declaring an accurate value matters. Under-declaring reduces your premium but caps what can be recovered if something goes wrong.\n\n` +
          `For high-value or fragile cargo, contact support before booking and we will advise on the right level of cover.`,
        href: '/quote',
      },
      {
        q: 'How can I pay?',
        a:
          `Bank transfer, PayPal, and major cryptocurrencies including Bitcoin, USDT, and Ethereum. Available methods are shown on your invoice.\n\n` +
          `Every invoice carries a unique payment reference. Include it with your transfer so we can match your payment without delay.\n\n` +
          `After paying, upload your receipt from the payment page. We verify it and confirm by email, and your shipment status updates automatically.`,
        href: '/invoice',
      },
    ],
    []
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
            ← Back to home
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
            ← Back to home
          </button>
          <div className="text-center text-2xl font-bold text-gray-600">
            Invoice view coming soon
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
                Support in 12 languages
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-md">
                Freight and parcels,{' '}
                <span className="text-cyan-100">priced before you commit</span>
              </h1>

              <p className="mt-5 text-lg md:text-xl text-white/95 max-w-2xl leading-relaxed">
                Get a complete cost breakdown in seconds — freight, fuel, insurance,
                customs, and handling, each on its own line. Then follow your shipment
                from pickup to delivery with updates that tell you what happens next.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => nav('/quote')}
                  className="bg-white text-blue-700 px-7 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                >
                  Get a quote
                </motion.button>

                <motion.button
                  whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => nav('/track')}
                  className="bg-transparent text-white px-7 py-3.5 rounded-xl font-semibold border border-white/45 hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                >
                  Track a shipment
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
            What you get, <span className="text-cyan-600">specifically</span>
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Most logistics providers promise reliability. Here is what that means in
            practice on this platform.
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

      {/* ================= PRICING TRANSPARENCY (signature) ================= */}
      <Section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-700 mb-5">
              <Receipt className="w-4 h-4" />
              No hidden charges
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Every line of your invoice, before you book
            </h2>

            <p className="text-gray-600 mt-4 leading-relaxed">
              Hidden fees are the most common complaint in freight, and they usually
              arrive after the cargo is already moving — when refusing is no longer
              realistic.
            </p>

            <p className="text-gray-600 mt-3 leading-relaxed">
              We calculate the full breakdown at quote time and show it to you in
              full. Base freight reflects your route, weight, and mode. Fuel and
              insurance are percentages you can see. Customs appears only where the
              route requires it.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                'Volumetric weight flagged whenever it applies to your package',
                'Currency shown in your local denomination, converted at quote time',
                'The approved total is the invoiced total — nothing is added later',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={isMobile || reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => nav('/quote')}
              className="mt-8 px-6 py-3.5 rounded-xl bg-blue-700 text-white shadow hover:bg-blue-800 transition-all font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              See your breakdown
            </motion.button>
          </motion.div>

          {/* Sample breakdown — mirrors the real invoice structure */}
          <motion.div variants={itemVariants}>
            <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-400" />
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Sample quote
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      Lagos → London · 18 kg · Air
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                    <Plane className="w-5 h-5 text-blue-700" />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-sm">
                  {[
                    { label: 'Base freight (Air)', value: '412.00' },
                    { label: 'Fuel surcharge (12%)', value: '49.44' },
                    { label: 'Insurance (1.5%)', value: '18.75' },
                    { label: 'Handling fee', value: '25.00' },
                    { label: 'Customs clearance', value: '60.00' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-gray-600">
                      <span>{row.label}</span>
                      <span className="font-semibold text-gray-800">USD {row.value}</span>
                    </div>
                  ))}

                  <div className="flex justify-between text-green-600 pt-1">
                    <span>Volume discount</span>
                    <span className="font-semibold">− USD 30.00</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3.5 mt-1">
                    <span className="font-extrabold text-gray-900">Total</span>
                    <span className="text-lg font-extrabold text-blue-700">USD 535.19</span>
                  </div>
                </div>

                <p className="mt-5 text-[11px] text-gray-400 leading-relaxed">
                  Illustrative figures. Your quote is calculated from your actual route,
                  weight, dimensions, and declared value.
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
            Choosing your <span className="text-blue-700">shipping mode</span>
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Speed and cost pull against each other. Here is when each mode is the
            right call — we select it automatically from your shipment details, and
            explain why.
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
            From quote to delivery
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Four stages. You are told what is required at each one before you reach it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              icon: FileText,
              title: 'Request a quote',
              text: 'Enter route, weight, dimensions, and declared value. The full itemised cost returns in seconds.',
              href: '/quote',
            },
            {
              step: '02',
              icon: ClipboardCheck,
              title: 'Confirm and pay',
              text: 'Review the breakdown, confirm pickup details, and pay by bank transfer, PayPal, or crypto.',
              href: '/invoice',
            },
            {
              step: '03',
              icon: Route,
              title: 'Follow the timeline',
              text: 'Each milestone records what happened, where, and when — plus the next expected step.',
              href: '/track',
            },
            {
              step: '04',
              icon: ScanLine,
              title: 'Delivery confirmed',
              text: 'Confirmation is logged with the full status history retained for your records.',
              href: '/track',
            },
          ].map((x) => (
            <ClickCard
              key={x.title}
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
              Global routes, handled locally
            </h2>
            <p className="text-gray-600 mt-4 leading-relaxed">
              International shipping fails at the handoffs — between carriers, at
              borders, on the last mile. We work through vetted regional partners so
              each leg is handled by people who operate that lane routinely.
            </p>
            <p className="text-gray-600 mt-3 leading-relaxed">
              Your tracking timeline stays continuous across every handoff, so a
              change of carrier never means a gap in visibility.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                'Status updates written in plain language, not carrier codes',
                'Optional insurance and secure handling for sensitive cargo',
                'Delivery estimates given as a date range, not a single optimistic day',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{t}</span>
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
                Track a shipment
              </motion.button>
              <motion.button
                whileHover={isMobile || reduceMotion ? undefined : { scale: 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={() => nav('/quote')}
                className="px-5 py-3 rounded-xl bg-cyan-600 text-white shadow hover:bg-cyan-700 transition-all font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                Get a quote
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-3xl bg-gray-50 border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <MapPin className="w-5 h-5 text-cyan-700" />
                Where we operate
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'North America', value: 'Direct air lanes' },
                  { label: 'Europe', value: 'Established hubs' },
                  { label: 'Asia', value: 'Priority routing' },
                  { label: 'Africa', value: 'Partner network' },
                  { label: 'South America', value: 'Expanding routes' },
                  { label: 'Oceania', value: 'Scheduled ocean' },
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
                Coverage varies by cargo type and service level. Enter your route on
                the quote page to confirm availability.
              </p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ================= TRUST AND COMPLIANCE ================= */}
      <Section className="bg-gradient-to-b from-gray-50 to-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Handling, cover, and <span className="text-blue-700">paperwork</span>
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Three areas where shipments most often go wrong, and what we do about each.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: 'Secure handling',
              text: 'Cargo is scanned at each transfer point, so if something is delayed or misrouted we can identify exactly where it happened rather than guessing.',
              href: '/services',
            },
            {
              icon: Shield,
              title: 'Insurance that scales',
              text: 'Premiums are calculated from your declared value. Accurate declaration matters — it determines both your premium and your maximum recovery.',
              href: '/quote',
            },
            {
              icon: BadgeInfo,
              title: 'Documentation guidance',
              text: 'Incomplete paperwork causes more delays than any other factor. We tell you what each destination requires before dispatch, not after a shipment is held.',
              href: '/support',
            },
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
            Who ships with <span className="text-orange-600">Exodus</span>
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            The platform handles a single parcel and a recurring freight programme on
            the same rails.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: 'Individuals',
              text: 'Sending personal effects, gifts, or documents across borders. No account minimums, no contracts — quote, pay, and ship.',
              href: '/quote',
            },
            {
              icon: Boxes,
              title: 'Online sellers',
              text: 'Shipping orders to international customers. Consistent tracking your buyers can follow themselves, plus warehousing between restocks.',
              href: '/services',
            },
            {
              icon: Building2,
              title: 'Businesses',
              text: 'Moving inventory, equipment, or high-value cargo on repeat lanes. Volume pricing and insurance sized to what you are actually moving.',
              href: '/contact',
            },
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
              Ready to Ship{' '}
              <span className={`${colors[wordIndex]} inline-block min-w-[280px] text-left`}>
                {displayedText}
                <span className="border-r-2 border-white/90 ml-1 animate-pulse" />
              </span>
            </h2>

            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-5 text-white/95 leading-relaxed">
              Start with a quote. It costs nothing, takes about a minute, and shows
              you the complete cost before you commit to anything.
            </p>

            <p className="text-base md:text-lg max-w-2xl mx-auto mb-9 text-white/85 leading-relaxed">
              If the numbers do not work for you, you have lost a minute. If they do,
              your shipment is booked and tracking from the same page.
            </p>

            <motion.button
              whileHover={isMobile || reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => nav('/quote')}
              className="bg-white text-blue-700 px-9 py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
            >
              Get your quote
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Questions worth answering properly
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            The things customers actually ask before their first shipment.
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
            Still unsure about something?{' '}
            <button
              onClick={() => nav('/support')}
              className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
            >
              Ask our team
            </button>
          </p>
        </motion.div>
      </Section>

      {/* ================= BACK TO TOP (bottom-left) ================= */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 z-[60] rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all p-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}