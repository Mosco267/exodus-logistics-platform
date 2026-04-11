'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

type Step = {
  target: string; // CSS selector
  title: string;
  desc: string;
  position: 'top' | 'bottom' | 'left' | 'right';
};

const STEPS: Step[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Dashboard Overview',
    desc: 'Your shipment stats are shown here — total shipments, pending invoices, deliveries and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    desc: 'Quickly track a shipment, view your invoices or check recent activity from here.',
    position: 'top',
  },
  {
    target: '[data-tour="create"]',
    title: 'Create a Shipment',
    desc: 'Click here to create a new shipment. You can fill in all the details and track it in real time.',
    position: 'bottom',
  },
  {
    target: '[data-tour="search"]',
    title: 'Search Shipments',
    desc: 'Search for any shipment using the shipment ID or tracking number.',
    position: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    desc: 'Stay updated — all your shipment alerts and platform messages appear here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Your Profile',
    desc: 'Access your profile, settings and logout from here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="nav"]',
    title: 'Navigation',
    desc: 'Use the sidebar to navigate between Track, Invoices, History and Settings.',
    position: 'right',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function TooltipBox({
  rect,
  step,
  stepIndex,
  total,
  onNext,
  onPrev,
  onSkip,
}: {
  rect: Rect;
  step: Step;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const GAP = 12;
  const W = 280;
  let top = 0;
  let left = 0;

  if (step.position === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - W / 2;
  } else if (step.position === 'top') {
    top = rect.top - GAP - 160;
    left = rect.left + rect.width / 2 - W / 2;
  } else if (step.position === 'right') {
    top = rect.top + rect.height / 2 - 80;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - 80;
    left = rect.left - W - GAP;
  }

  // Keep within viewport
  left = Math.max(12, Math.min(left, window.innerWidth - W - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - 200));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', top, left, width: W, zIndex: 9999 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0b3aa4] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{stepIndex + 1}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</p>
        </div>
        <button onClick={onSkip}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer shrink-0 p-0.5">
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{step.desc}</p>

      {/* Progress dots */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-5 bg-[#0b3aa4]' : 'w-1.5 bg-gray-200 dark:bg-white/20'}`} />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={onSkip}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer font-medium">
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <ArrowLeft size={12} /> Back
            </button>
          )}
          <button onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b3aa4] text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer">
            {stepIndex === total - 1 ? <><CheckCircle2 size={12} /> Done</> : <>Next <ArrowRight size={12} /></>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function OnboardingTour({
  active,
  onDone,
}: {
  active: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!active) return;
    const target = STEPS[step]?.target;
    if (!target) return;

    const updateRect = () => {
      const r = getRect(target);
      setRect(r);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step, active]);

  // Scroll element into view
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(STEPS[step]?.target);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step, active]);

  const handleNext = () => {
    if (step === STEPS.length - 1) { onDone(); return; }
    setStep(s => s + 1);
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  if (!active) return null;

  return (
    <>
      {/* Dark overlay with hole */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {rect && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - 6}
                  y={rect.top - 6}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#tour-mask)"
            />
          </svg>
        )}
      </div>

      {/* Highlight ring */}
      {rect && (
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 12,
            border: '2px solid #0b3aa4',
            boxShadow: '0 0 0 4px rgba(11,58,164,0.25)',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {rect && (
          <TooltipBox
            key={step}
            rect={rect}
            step={STEPS[step]}
            stepIndex={step}
            total={STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={onDone}
          />
        )}
      </AnimatePresence>

      {/* Clickable backdrop to close */}
      <div className="fixed inset-0 z-[9997]" onClick={onDone} />
    </>
  );
}