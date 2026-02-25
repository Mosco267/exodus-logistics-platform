// src/components/home/HomeClient.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useViewportScroll,
  useTransform,
  Variants,
} from 'framer-motion';
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
  BadgeCheck,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

import QuickActions from '@/components/QuickActions';
import GetAQuoteForm from '@/components/GetAQuoteForm';

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
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
  return (
    <section id={id} className={`py-20 md:py-24 ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  );
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-gray-300 transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function HomeClient() {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Back to top button
  const { scrollY } = useViewportScroll();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const unsub = scrollY.onChange((v) => setShowTop(v > 500));
    return () => unsub();
  }, [scrollY]);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // HERO (softer + modern) — keep hero visible (no fade out)
  const heroRef = useRef<HTMLDivElement>(null);
  const heroParallaxY = useTransform(scrollY, [0, 700], [0, -60]); // subtle parallax only

  const services = useMemo(
    () => [
      {
        icon: Plane,
        title: 'Air Freight',
        desc: 'Fast international delivery with priority routing and tracking.',
      },
      {
        icon: Ship,
        title: 'Ocean Freight',
        desc: 'Cost-efficient shipping for bulk cargo with customs support.',
      },
      {
        icon: Truck,
        title: 'Road Transport',
        desc: 'Reliable last-mile delivery with optimized local dispatch.',
      },
      {
        icon: Package,
        title: 'Warehousing',
        desc: 'Secure storage, inventory handling, and fulfillment services.',
      },
    ],
    []
  );

  const featureCards = useMemo(
    () => [
      {
        icon: Globe,
        title: 'Global Network',
        desc: 'Coverage across major routes with trusted partners worldwide.',
      },
      {
        icon: Shield,
        title: 'Fully Insured',
        desc: 'Protection options designed for valuables and sensitive cargo.',
      },
      {
        icon: Clock,
        title: 'Real-time Tracking',
        desc: 'Accurate updates with clear status steps and ETA visibility.',
      },
      {
        icon: Users,
        title: 'Expert Support',
        desc: 'Dedicated help whenever you need guidance or updates.',
      },
    ],
    []
  );

  const steps = useMemo(
    () => [
      {
        num: '01',
        title: 'Request a Quote',
        desc: 'Tell us origin, destination, weight, and declared value.',
        icon: CheckCircle2,
      },
      {
        num: '02',
        title: 'We Plan the Route',
        desc: 'We select the best carrier mix for cost, speed, and safety.',
        icon: MapPin,
      },
      {
        num: '03',
        title: 'Pickup & Ship',
        desc: 'Your shipment moves with live tracking and status updates.',
        icon: Truck,
      },
      {
        num: '04',
        title: 'Delivered Safely',
        desc: 'Delivery confirmation plus support for any final questions.',
        icon: BadgeCheck,
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { label: 'Countries covered', value: '200+' },
      { label: 'On-time delivery focus', value: '99%' },
      { label: 'Support availability', value: '24/7' },
      { label: 'Shipments tracked daily', value: '10k+' },
    ],
    []
  );

  // Clean rotating highlight (fix overlap)
  const highlights = useMemo(
    () => [
      { text: 'With Confidence', color: 'text-cyan-200' },
      { text: 'With Low Cost', color: 'text-amber-200' },
      { text: 'With Exodus Logistics', color: 'text-white' },
    ],
    []
  );

  const [highlightIndex, setHighlightIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setHighlightIndex((p) => (p + 1) % highlights.length);
    }, 2500);
    return () => clearInterval(t);
  }, [highlights.length]);

  const faqs = useMemo(
    () => [
      {
        q: 'How do I track my shipment?',
        a: 'Use the Track page with your tracking number. You’ll see the latest status and next step.',
      },
      {
        q: 'Do you handle customs clearance?',
        a: 'Yes. We provide guidance and support documentation depending on the destination and cargo type.',
      },
      {
        q: 'Is insurance included?',
        a: 'We offer insurance options. You can choose coverage based on declared value and shipment type.',
      },
      {
        q: 'How do I get a quote?',
        a: 'Click “Get Quote” and fill in the shipment details. If pricing configuration is unavailable, you’ll be prompted to contact support.',
      },
    ],
    []
  );

  // Quote / invoice override pages
  if (showQuoteForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowQuoteForm(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
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
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <div className="text-center text-2xl font-bold text-gray-600">
            Invoice View Page - Coming Soon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ================= HERO (Softer + Modern) ================= */}
      <motion.section
        ref={heroRef}
        style={{ y: heroParallaxY }}
        className="relative overflow-hidden text-white"
      >
        <div className="absolute inset-0">
          {/* softer gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/70 to-cyan-700/60" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-cyan-300/10" />

          {/* subtle grid */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* floating orbs */}
          <motion.div
            className="absolute -top-8 left-10 w-28 h-28 bg-white/8 rounded-full blur-2xl"
            animate={{ y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-20 right-10 w-40 h-40 bg-cyan-200/10 rounded-full blur-3xl"
            animate={{ y: [0, -22, 0], opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm text-white/90 mb-5">
                <Headphones className="w-4 h-4" />
                24/7 Support • Global Shipping
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-md">
                Ship Smarter with <span className="text-cyan-200">Exodus Logistics</span>
              </h1>

              <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
                Reliable logistics built for businesses and individuals — transparent pricing, live tracking,
                and delivery you can trust.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => (window.location.href = '/quote')}
                  className="bg-white text-slate-900 px-7 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all"
                >
                  Get Instant Quote
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => (window.location.href = '/track')}
                  className="bg-transparent text-white px-7 py-3.5 rounded-xl font-semibold border border-white/40 hover:bg-white/10 transition-all"
                >
                  Track Shipment
                </motion.button>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-white/10 border border-white/15 px-3 py-3"
                  >
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-white/80">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center gap-2 text-white/80 text-sm">
                <ChevronDown className="w-4 h-4" />
                Scroll to explore services & solutions
              </div>
            </motion.div>

            {/* right visual */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              className="hidden lg:block"
            >
              <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-md p-6 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {services.map((s) => (
                    <div
                      key={s.title}
                      className="rounded-2xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-all"
                    >
                      <s.icon className="w-6 h-6 text-cyan-200" />
                      <div className="mt-2 font-semibold">{s.title}</div>
                      <div className="text-sm text-white/80 mt-1">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <div className="bg-gray-50">
        <QuickActions
          onTrackClick={() => (window.location.href = '/track')}
          onInvoiceClick={() => (window.location.href = '/invoice')}
          onQuoteClick={() => (window.location.href = '/quote')}
        />
      </div>

      {/* ================= TRUST / FEATURES ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Built for <span className="text-cyan-600">Reliable</span> Delivery
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Professional tools and operations designed to reduce delays, improve visibility, and protect shipments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureCards.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-cyan-700" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 text-lg">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ================= SERVICES ================= */}
      <Section className="bg-gray-50">
        <motion.div variants={itemVariants} className="flex items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Services that Scale</h2>
            <p className="text-gray-600 mt-3 max-w-2xl">
              Whether you’re shipping documents or bulk cargo, we offer flexible options for speed, cost, and security.
            </p>
          </div>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => (window.location.href = '/quote')}
            className="hidden md:inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all"
          >
            Get a Quote <CheckCircle2 className="w-5 h-5" />
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <Card key={s.title} className="p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <s.icon className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 text-lg">{s.title}</h3>
              <p className="mt-2 text-gray-600">{s.desc}</p>
              <div className="mt-4 text-sm text-blue-700 font-semibold hover:underline cursor-pointer">
                Learn more
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ================= HOW IT WORKS ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How It Works</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            A smooth process from quote to delivery — with clear tracking and support.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <Card key={s.num} className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-400">{s.num}</div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-gray-700" />
                </div>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 text-lg">{s.title}</h3>
              <p className="mt-2 text-gray-600">{s.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ================= COVERAGE / MAP CTA ================= */}
      <Section className="bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div variants={itemVariants}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Global coverage, local precision
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl">
              We optimize routes using reliable carriers and clear milestones so you always know what happens next.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Transparent status updates (no confusing tracking)',
                'Secure handling and optional insurance coverage',
                'Dedicated support for sensitive or urgent shipments',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => (window.location.href = '/track')}
                className="px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all font-semibold text-gray-900"
              >
                Track Shipment
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => (window.location.href = '/quote')}
                className="px-5 py-3 rounded-xl bg-cyan-600 text-white shadow hover:bg-cyan-700 transition-all font-semibold"
              >
                Get Quote
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 overflow-hidden">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <MapPin className="w-5 h-5 text-cyan-700" />
                Coverage Highlights
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'North America', value: 'Fast lanes' },
                  { label: 'Europe', value: 'Reliable hubs' },
                  { label: 'Asia', value: 'Priority routing' },
                  { label: 'Africa', value: 'Partner network' },
                ].map((x) => (
                  <div key={x.label} className="rounded-2xl bg-gray-50 p-4 border border-gray-100 hover:bg-white transition-all">
                    <div className="text-sm text-gray-500">{x.label}</div>
                    <div className="font-semibold text-gray-900 mt-1">{x.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ================= TESTIMONIALS ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Trusted by Customers</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            A professional logistics experience — clean communication, dependable delivery, and better visibility.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Operations Manager',
              quote:
                'Tracking is clear and the process is smooth. Our shipments arrive on time more consistently.',
            },
            {
              name: 'Small Business Owner',
              quote:
                'The quote process is fast and the support team actually responds quickly when needed.',
            },
            {
              name: 'International Seller',
              quote:
                'It feels professional. The interface is clean and customers trust the updates we share.',
            },
          ].map((t) => (
            <Card key={t.name} className="p-6">
              <div className="text-gray-600 leading-relaxed">“{t.quote}”</div>
              <div className="mt-5 font-semibold text-gray-900">{t.name}</div>
              <div className="text-sm text-gray-500">Verified feedback</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ================= READY TO SHIP (Fixed overlap + cleaner) ================= */}
      <section className="relative py-24 bg-gradient-to-tr from-slate-900 via-blue-900/70 to-cyan-700/60 overflow-hidden text-white">
        <motion.div
          className="absolute top-0 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-10 w-72 h-72 bg-white/15 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mb-10"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
              Ready to Ship{' '}
              <span className="inline-block min-w-[240px] md:min-w-[320px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={highlightIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className={`${highlights[highlightIndex].color}`}
                  >
                    {highlights[highlightIndex].text}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h2>

            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-4 text-white/90">
              Ship with solutions designed for speed, security, and clear communication — no confusion, no surprises.
            </p>

            <p className="text-base md:text-lg max-w-2xl mx-auto mb-8 text-white/85">
              From quote to delivery, we keep your shipment protected, tracked, and handled by experienced professionals.
            </p>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => (window.location.href = '/quote')}
              className="bg-white text-slate-900 px-9 py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all"
            >
              Start Your First Shipment
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Quick answers to common questions customers ask.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((f) => (
            <Card key={f.q} className="p-5">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                  {f.q}
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                    <ChevronDown className="w-5 h-5" />
                  </span>
                </summary>
                <div className="mt-3 text-gray-600 leading-relaxed">{f.a}</div>
              </details>
            </Card>
          ))}
        </div>
      </Section>

      {/* ================= FINAL CTA ================= */}
      <Section className="bg-gray-50">
        <motion.div variants={itemVariants} className="rounded-3xl bg-white border border-gray-200 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                Need help choosing the best shipping option?
              </h3>
              <p className="mt-3 text-gray-600 max-w-2xl">
                Contact support or start a quote — we’ll guide you toward the best balance of speed, cost, and safety.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => (window.location.href = '/quote')}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all"
              >
                Get Quote
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => (window.location.href = '/contact')}
                className="px-6 py-3 rounded-xl bg-white border border-gray-200 font-semibold text-gray-900 shadow-sm hover:shadow-lg transition-all"
              >
                Contact Support
              </motion.button>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ================= Back to top ================= */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[60] rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all p-3"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}