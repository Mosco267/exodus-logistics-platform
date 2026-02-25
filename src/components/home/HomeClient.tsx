'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, Variants, useReducedMotion } from 'framer-motion';
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
  X,
} from 'lucide-react';

import QuickActions from '@/components/QuickActions';
import GetAQuoteForm from '@/components/GetAQuoteForm';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
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
  return (
    <section id={id} className={`py-20 md:py-24 ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.18 }}
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
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
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
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  );
}

function Modal({
  open,
  title,
  body,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                <div>
                  <div className="text-lg font-bold text-gray-900">{title}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Details and guidance to help you understand exactly how this works.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="p-5 text-gray-700 leading-relaxed whitespace-pre-line">
                {body}
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function HomeClient() {
  const reduceMotion = useReducedMotion();

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Back to top
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');

  const openModal = (title: string, body: string) => {
    setModalTitle(title);
    setModalBody(body);
    setModalOpen(true);
  };

  // Services + long writeups
  const services = useMemo(
    () => [
      {
        icon: Plane,
        title: 'Air Freight',
        short: 'Fast international delivery with priority routing and tracking.',
        long:
          `Air freight is ideal when speed matters.\n\n` +
          `What you get:\n` +
          `• Priority routing on time sensitive lanes\n` +
          `• Clear tracking steps with updates you can understand\n` +
          `• Support for documentation and export requirements\n\n` +
          `Best for:\n` +
          `Urgent parcels, medical supplies, electronics, documents, and high value items.\n\n` +
          `How we keep it professional:\n` +
          `We reduce delays by planning the best route and validating details before dispatch, then we keep you informed from pickup to delivery.`,
      },
      {
        icon: Ship,
        title: 'Ocean Freight',
        short: 'Cost efficient shipping for bulk cargo with customs support.',
        long:
          `Ocean freight is best when you want lower cost for larger shipments.\n\n` +
          `What you get:\n` +
          `• Full container and less than container options\n` +
          `• Guidance on customs documentation and compliance\n` +
          `• Milestone updates so you always know the next step\n\n` +
          `Best for:\n` +
          `Bulk goods, commercial cargo, and planned shipments with flexible timelines.\n\n` +
          `How we keep it professional:\n` +
          `We focus on predictable schedules, correct paperwork, and clear communication so your cargo moves smoothly.`,
      },
      {
        icon: Truck,
        title: 'Road Transport',
        short: 'Reliable last mile delivery with optimized local dispatch.',
        long:
          `Road transport connects your shipment from hubs to final delivery.\n\n` +
          `What you get:\n` +
          `• Local dispatch and last mile coordination\n` +
          `• Fast response on address validation and delivery windows\n` +
          `• Delivery confirmation and support if anything changes\n\n` +
          `Best for:\n` +
          `City deliveries, regional distribution, and time window deliveries.\n\n` +
          `How we keep it professional:\n` +
          `We confirm addresses early and provide status updates that reduce missed deliveries.`,
      },
      {
        icon: Package,
        title: 'Warehousing',
        short: 'Secure storage, inventory handling, and fulfillment services.',
        long:
          `Warehousing helps you store, organize, and fulfill orders efficiently.\n\n` +
          `What you get:\n` +
          `• Secure storage and controlled handling\n` +
          `• Inventory processing and order preparation\n` +
          `• Fulfillment support that scales with your business\n\n` +
          `Best for:\n` +
          `Online businesses, seasonal demand, and bulk receiving.\n\n` +
          `How we keep it professional:\n` +
          `We prioritize accuracy, security, and consistent processes so your inventory stays reliable.`,
      },
    ],
    []
  );

  const features = useMemo(
    () => [
      {
        icon: Globe,
        title: 'Global Network',
        short: 'Coverage across major routes with trusted partners worldwide.',
        long:
          `Our network is built to move shipments across major lanes reliably.\n\n` +
          `We combine proven carrier options with route planning so your shipment avoids unnecessary delays.\n\n` +
          `You also get clearer status updates, better visibility, and support when you need changes or guidance.`,
      },
      {
        icon: Shield,
        title: 'Fully Insured',
        short: 'Protection options designed for valuables and sensitive cargo.',
        long:
          `Insurance gives confidence when shipping valuable items.\n\n` +
          `We support coverage options based on declared value and shipment type.\n\n` +
          `If you have special cargo requirements, we help you select the best protection approach.`,
      },
      {
        icon: Clock,
        title: 'Real time Tracking',
        short: 'Accurate updates with clear status steps and ETA visibility.',
        long:
          `Tracking should feel professional, not confusing.\n\n` +
          `We structure updates as clear milestones so customers understand what happens next.\n\n` +
          `If a step changes, you can see the reason and the next action immediately.`,
      },
      {
        icon: Users,
        title: 'Expert Support',
        short: 'Dedicated help whenever you need guidance or updates.',
        long:
          `Support matters most when something changes.\n\n` +
          `We provide help with routing questions, tracking issues, documentation, and delivery coordination.\n\n` +
          `You get fast replies and solutions, not generic responses.`,
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { label: 'Countries covered', value: '200+' },
      { label: 'Delivery focus', value: 'Reliable' },
      { label: 'Support', value: '24/7' },
      { label: 'Tracking updates', value: 'Live' },
    ],
    []
  );

  // Ready to Ship - bring back “older” typewriter vibe
  const words = useMemo(
    () => ['With Confidence?', 'With Low Cost?', 'With Exodus Logistics?'],
    []
  );
  const colors = useMemo(
    () => ['text-cyan-200', 'text-amber-200', 'text-white'],
    []
  );

  const [displayedText, setDisplayedText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;

    const current = words[wordIndex];
    const speed = isDeleting ? 40 : 70;

    const t = setTimeout(() => {
      if (!isDeleting) {
        const next = current.substring(0, displayedText.length + 1);
        setDisplayedText(next);
        if (next === current) setTimeout(() => setIsDeleting(true), 1300);
      } else {
        const next = current.substring(0, displayedText.length - 1);
        setDisplayedText(next);
        if (next === '') {
          setIsDeleting(false);
          setWordIndex((p) => (p + 1) % words.length);
        }
      }
    }, speed);

    return () => clearTimeout(t);
  }, [displayedText, isDeleting, wordIndex, words, reduceMotion]);

  // FAQ accordion (long answers)
  const faqs = useMemo(
    () => [
      {
        q: 'How do I track my shipment?',
        a:
          `Go to the Track page and enter your tracking number.\n\n` +
          `You will see a clear timeline of updates that explains the current status and what comes next.\n\n` +
          `If a delivery step changes, the page shows the reason and the recommended next action so you are never guessing.`,
      },
      {
        q: 'Do you handle customs clearance?',
        a:
          `Yes, we support customs guidance depending on the destination and cargo type.\n\n` +
          `We help you prepare the right information, reduce mistakes, and avoid unnecessary delays.\n\n` +
          `If your shipment needs extra documentation, you will be informed early so the process remains smooth.`,
      },
      {
        q: 'Is insurance included?',
        a:
          `We provide insurance options based on declared value and shipment type.\n\n` +
          `For high value cargo, insurance is strongly recommended because it adds confidence and protection.\n\n` +
          `If you are unsure, our team can recommend the right coverage level for your shipment.`,
      },
      {
        q: 'How do I get a quote?',
        a:
          `Click Get Quote and fill in origin, destination, weight, and declared value.\n\n` +
          `Your quote is generated using the configured pricing rules.\n\n` +
          `If pricing is not available at the moment, the platform will clearly tell you and recommend contacting support for assistance.`,
      },
    ],
    []
  );

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Quote / invoice overrides
  if (showQuoteForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowQuoteForm(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
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
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            ← Back to Home
          </button>
          <div className="text-center text-2xl font-bold text-gray-600">
            Invoice View Page Coming Soon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Modal */}
      <Modal open={modalOpen} title={modalTitle} body={modalBody} onClose={() => setModalOpen(false)} />

      {/* ================= HERO (matches header colors) ================= */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          {/* Match header: blue -> cyan, with a soft light on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />

          {/* subtle grid */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* lighter orbs but no heavy scroll parallax = no shaking */}
          {!reduceMotion && (
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm text-white/95 mb-5">
                <Headphones className="w-4 h-4" />
                24/7 Support, Global Shipping
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-md">
                Ship Smarter with{' '}
                <span className="text-cyan-100">Exodus Logistics</span>
              </h1>

              <p className="mt-4 text-lg md:text-xl text-white/95 max-w-2xl leading-relaxed">
                Reliable logistics built for businesses and individuals, transparent pricing, live tracking,
                and delivery you can trust.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => (window.location.href = '/quote')}
                  className="bg-white text-blue-700 px-7 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                  Get Instant Quote
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => (window.location.href = '/track')}
                  className="bg-transparent text-white px-7 py-3.5 rounded-xl font-semibold border border-white/45 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Track Shipment
                </motion.button>
              </div>

              {/* Stats tiles - clickable “bars” */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                {stats.map((s) => (
                  <button
                    key={s.label}
                    onClick={() =>
                      openModal(
                        s.label,
                        `This metric highlights how Exodus Logistics stays reliable and professional.\n\n` +
                          `We focus on predictable delivery processes, clear communication, and strong partner coordination.\n\n` +
                          `If you want a tailored recommendation for your shipment type, use Get Quote or contact support.`
                      )
                    }
                    className="text-left rounded-xl bg-white/15 border border-white/20 px-3 py-3 hover:bg-white/20 transition cursor-pointer"
                  >
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-white/90">{s.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* right services cards - clickable */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
              className="hidden lg:block"
            >
              <div className="rounded-3xl bg-white/12 border border-white/20 backdrop-blur-md p-6 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {services.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => openModal(s.title, s.long)}
                      className="text-left rounded-2xl bg-white/12 border border-white/20 p-4 hover:bg-white/18 transition-all cursor-pointer"
                    >
                      <s.icon className="w-6 h-6 text-cyan-100" />
                      <div className="mt-2 font-semibold">{s.title}</div>
                      <div className="text-sm text-white/90 mt-1">{s.short}</div>
                      <div className="mt-3 text-xs text-white/90 underline underline-offset-2">
                        Click to read more
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
          onTrackClick={() => (window.location.href = '/track')}
          onInvoiceClick={() => (window.location.href = '/invoice')}
          onQuoteClick={() => (window.location.href = '/quote')}
        />
      </div>

      {/* ================= FEATURES (clickable) ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Built for <span className="text-cyan-600">Reliable</span> Delivery
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Professional operations designed to reduce delays, improve visibility, and protect shipments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <ClickCard
              key={f.title}
              onClick={() => openModal(f.title, f.long)}
              className="p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-cyan-700" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 text-lg">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.short}</p>
              <div className="mt-4 text-sm text-blue-700 font-semibold">
                Click to read more
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= SERVICES SECTION (clickable) ================= */}
      <Section className="bg-gray-50">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Services that Scale</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Flexible options for speed, cost, and security, for individuals and businesses.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <ClickCard key={s.title} onClick={() => openModal(s.title, s.long)} className="p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <s.icon className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 text-lg">{s.title}</h3>
              <p className="mt-2 text-gray-600">{s.short}</p>
              <div className="mt-4 text-sm text-blue-700 font-semibold">
                Click to read more
              </div>
            </ClickCard>
          ))}
        </div>
      </Section>

      {/* ================= COVERAGE ================= */}
      <Section className="bg-white">
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
                'Transparent status updates with clear next steps',
                'Secure handling and optional insurance coverage',
                'Support for urgent shipments and sensitive cargo',
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
                className="px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all font-semibold text-gray-900 cursor-pointer"
              >
                Track Shipment
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => (window.location.href = '/quote')}
                className="px-5 py-3 rounded-xl bg-cyan-600 text-white shadow hover:bg-cyan-700 transition-all font-semibold cursor-pointer"
              >
                Get Quote
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-3xl bg-gray-50 border border-gray-200 shadow-sm p-6">
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
                  <button
                    key={x.label}
                    onClick={() =>
                      openModal(
                        x.label,
                        `Coverage focus: ${x.value}\n\n` +
                          `We coordinate routes through trusted partners and provide milestone updates that keep shipments predictable.\n\n` +
                          `If you have a specific destination, use Get Quote for the best route recommendation.`
                      )
                    }
                    className="text-left rounded-2xl bg-white p-4 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-sm text-gray-500">{x.label}</div>
                    <div className="font-semibold text-gray-900 mt-1">{x.value}</div>
                    <div className="text-xs text-blue-700 mt-2 font-semibold">
                      Click to read more
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ================= READY TO SHIP (old feel, typewriter) ================= */}
      <section className="relative py-24 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 overflow-hidden text-white">
        {!reduceMotion && (
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
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.22 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
              Ready to Ship{' '}
              <span className={`${colors[wordIndex]} inline-block min-w-[260px]`}>
                {displayedText}
                <span className="border-r-2 border-white/90 ml-1 animate-pulse" />
              </span>
            </h2>

            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-4 text-white/95">
              Ship with solutions designed for speed, security, and clear communication.
            </p>
            <p className="text-base md:text-lg max-w-2xl mx-auto mb-8 text-white/90">
              From quote to delivery, we keep your shipment protected, tracked, and handled professionally.
            </p>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => (window.location.href = '/quote')}
              className="bg-white text-blue-700 px-9 py-4 rounded-full font-semibold shadow-lg hover:shadow-2xl transition-all cursor-pointer"
            >
              Start Your First Shipment
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================= FAQ (longer, clickable, no dash) ================= */}
      <Section className="bg-white">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Clear answers, written professionally, so customers understand the process.
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
                    className="text-gray-500"
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
                      className="mt-3 text-gray-700 leading-relaxed whitespace-pre-line"
                    >
                      {f.a}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 text-sm text-blue-700 font-semibold">
                  Click to {isOpen ? 'close' : 'read more'}
                </div>
              </ClickCard>
            );
          })}
        </div>
      </Section>

      {/* Back to top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[60] rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all p-3 cursor-pointer"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}