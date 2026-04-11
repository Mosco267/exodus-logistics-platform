'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

type Step = {
  title: string;
  desc: string;
  target?: string;
};

const STEPS: Step[] = [
  {
    title: 'Dashboard Overview',
    desc: 'Your shipment stats are shown here — total shipments, pending invoices, deliveries and more.',
    target: '[data-tour="overview"]',
  },
  {
    title: 'Quick Actions',
    desc: 'Quickly track a shipment, view your invoices or check recent activity from here.',
    target: '[data-tour="quick-actions"]',
  },
  {
    title: 'Search Shipments',
    desc: 'Search for any shipment using the shipment ID or tracking number.',
    target: '[data-tour="search"]',
  },
  {
    title: 'Notifications',
    desc: 'Stay updated — all your shipment alerts and platform messages appear here.',
    target: '[data-tour="notifications"]',
  },
  {
    title: 'Create a Shipment',
    desc: 'Create a new shipment from here. Fill in the details and track it in real time.',
    target: '[data-tour="create"]',
  },
  {
    title: 'Navigation Menu',
    desc: 'Use the menu to navigate between Track, Invoices, History and Settings.',
    target: '[data-tour="nav"]',
  },
  {
    title: 'Your Profile',
    desc: 'Access your profile, settings and logout from here.',
    target: '[data-tour="profile"]',
  },
];

export default function OnboardingTour({
  active,
  onDone,
}: {
  active: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;
    setStep(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const target = STEPS[step]?.target;
    if (!target) { setHighlightRect(null); return; }

    const el = document.querySelector(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setHighlightRect(r);
      }, 300);
    } else {
      setHighlightRect(null);
    }
  }, [step, active]);

  const handleNext = () => {
    if (step === STEPS.length - 1) { onDone(); return; }
    setStep(s => s + 1);
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  if (!active) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9990] pointer-events-none">
        {highlightRect && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={highlightRect.left - 4}
                  y={highlightRect.top - 4}
                  width={highlightRect.width + 8}
                  height={highlightRect.height + 8}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.5)"
              mask="url(#tour-mask)"
            />
          </svg>
        )}
      </div>

      {/* Highlight ring */}
      {highlightRect && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-xl"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            border: '2px solid #0b3aa4',
            boxShadow: '0 0 0 4px rgba(11,58,164,0.3)',
          }}
        />
      )}

      {/* Tap to dismiss overlay */}
      <div className="fixed inset-0 z-[9989]" onClick={onDone} />

      {/* Bottom sheet tooltip — works on both mobile and desktop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-6 pt-2"
          onClick={e => e.stopPropagation()}>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-5 max-w-lg mx-auto">

            {/* Handle bar */}
            <div className="w-8 h-1 bg-gray-200 dark:bg-white/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#0b3aa4] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{step + 1}</span>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white">{current.title}</p>
              </div>
              <button onClick={onDone}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer shrink-0 p-1">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 pl-9">
              {current.desc}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-4 pl-9">
              {STEPS.map((_, i) => (
                <div key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-[#0b3aa4]' : 'w-1.5 bg-gray-200 dark:bg-white/20'
                  }`} />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button onClick={onDone}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer font-medium">
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button onClick={handlePrev}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/15 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <button onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b3aa4] text-white text-sm font-bold hover:bg-blue-700 transition cursor-pointer">
                  {step === STEPS.length - 1
                    ? <><CheckCircle2 size={14} /> Done</>
                    : <>Next <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}