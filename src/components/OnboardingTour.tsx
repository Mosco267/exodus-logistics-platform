'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

type Step = {
  target: string;
  title: string;
  desc: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

const STEPS: Step[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Dashboard Overview',
    desc: 'Your shipment stats — total shipments, invoices, deliveries and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    desc: 'Track a shipment, view invoices or check recent activity quickly.',
    position: 'top',
  },
  {
    target: '[data-tour="search"]',
    title: 'Search Shipments',
    desc: 'Search for any shipment using the shipment ID or tracking number.',
    position: 'bottom',
  },
  {
    target: '[data-tour="create"]',
    title: 'Create a Shipment',
    desc: 'Create a new shipment and track it in real time.',
    position: 'bottom',
    desktopOnly: true,
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    desc: 'All your shipment alerts and platform messages appear here.',
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
    desc: 'Navigate between Track, Invoices, History and Settings.',
    position: 'right',
    desktopOnly: true,
  },
  {
    target: '[data-tour="mobile-menu"]',
    title: 'Navigation Menu',
    desc: 'Tap the menu icon to open the sidebar and navigate the app.',
    position: 'bottom',
    mobileOnly: true,
  },
];

const GRADIENT = 'linear-gradient(135deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)';

type Rect = { top: number; left: number; width: number; height: number };

function getElementRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Only return rect if element is visible in viewport
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Desktop floating tooltip — unchanged from your preferred version
function DesktopTooltip({
  rect, step, stepIndex, total, onNext, onPrev, onSkip,
}: {
  rect: Rect; step: Step; stepIndex: number; total: number;
  onNext: () => void; onPrev: () => void; onSkip: () => void;
}) {
  const GAP = 12;
  const W = 280;
  let top = 0;
  let left = 0;

  if (step.position === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - W / 2;
  } else if (step.position === 'top') {
    top = rect.top - GAP - 170;
    left = rect.left + rect.width / 2 - W / 2;
  } else if (step.position === 'right') {
    top = rect.top + rect.height / 2 - 90;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - 90;
    left = rect.left - W - GAP;
  }

  left = Math.max(12, Math.min(left, window.innerWidth - W - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - 210));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', top, left, width: W, zIndex: 9999 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-4">

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: GRADIENT }}>
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

      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i !== stepIndex ? 'w-1.5 bg-gray-200 dark:bg-white/20' : ''}`}
            style={i === stepIndex ? { width: 20, background: GRADIENT } : {}} />
        ))}
      </div>

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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition cursor-pointer"
            style={{ background: GRADIENT }}>
            {stepIndex === total - 1 ? <><CheckCircle2 size={12} /> Done</> : <>Next <ArrowRight size={12} /></>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Mobile compact bottom sheet
function MobileTooltip({
  step, stepIndex, total, onNext, onPrev, onSkip,
}: {
  step: Step; stepIndex: number; total: number;
  onNext: () => void; onPrev: () => void; onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ zIndex: 9999 }}
      className="fixed bottom-0 left-0 right-0"
      onClick={e => e.stopPropagation()}>

      <div className="bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-100 dark:border-white/10 overflow-hidden">
        {/* Gradient top line */}
        <div className="h-1" style={{ background: GRADIENT }} />

        <div className="px-5 pt-3 pb-6">
          {/* Handle bar */}
          <div className="w-8 h-1 bg-gray-200 dark:bg-white/20 rounded-full mx-auto mb-3" />

          {/* Row: number + title + close */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: GRADIENT }}>
                <span className="text-white text-[10px] font-bold">{stepIndex + 1}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{step.title}</p>
            </div>
            <button onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 pl-8">
            {step.desc}
          </p>

          {/* Progress + buttons on same row */}
          <div className="flex items-center justify-between gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${i !== stepIndex ? 'w-1.5 bg-gray-200 dark:bg-white/20' : ''}`}
                  style={i === stepIndex ? { width: 16, background: GRADIENT } : {}} />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer font-medium">
                Skip
              </button>
              {stepIndex > 0 && (
                <button onClick={onPrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-600 dark:text-gray-300 transition cursor-pointer">
                  <ArrowLeft size={11} /> Back
                </button>
              )}
              <button onClick={onNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition cursor-pointer"
                style={{ background: GRADIENT }}>
                {stepIndex === total - 1
                  ? <><CheckCircle2 size={11} /> Done</>
                  : <>Next <ArrowRight size={11} /></>}
              </button>
            </div>
          </div>
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredSteps = STEPS.filter(s => {
    if (s.desktopOnly && isMobile) return false;
    if (s.mobileOnly && !isMobile) return false;
    return true;
  });

  const currentStep = filteredSteps[step];

  // Scroll element into view first, then get rect
  useEffect(() => {
    if (!active || !currentStep?.target) return;

    const el = document.querySelector(currentStep.target);
    if (!el) { setRect(null); return; }

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to finish then measure
    const timeout = setTimeout(() => {
      const r = getElementRect(currentStep.target);
      setRect(r);
    }, 400);

    return () => clearTimeout(timeout);
  }, [step, active, currentStep]);

  // Keep rect updated on resize
  useEffect(() => {
    if (!active || !currentStep?.target) return;
    const update = () => {
      const r = getElementRect(currentStep.target);
      setRect(r);
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [step, active, currentStep]);

  useEffect(() => {
    if (!active) setStep(0);
  }, [active]);

  const handleNext = () => {
    if (step === filteredSteps.length - 1) { onDone(); return; }
    setStep(s => s + 1);
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  if (!active || !currentStep) return null;

  return (
    <>
      {/* Overlay with cutout hole */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - 6} y={rect.top - 6}
                  width={rect.width + 12} height={rect.height + 12}
                  rx="10" fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-mask)" />
        </svg>
      </div>

      {/* Highlight ring */}
      {rect && (
        <motion.div
          key={`ring-${step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 10,
            border: '2px solid #0e7490',
            boxShadow: '0 0 0 4px rgba(14,116,144,0.3)',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {isMobile ? (
          <MobileTooltip
            key={`m-${step}`}
            step={currentStep}
            stepIndex={step}
            total={filteredSteps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={onDone}
          />
        ) : (
          rect && (
            <DesktopTooltip
              key={`d-${step}`}
              rect={rect}
              step={currentStep}
              stepIndex={step}
              total={filteredSteps.length}
              onNext={handleNext}
              onPrev={handlePrev}
              onSkip={onDone}
            />
          )
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[9997]" onClick={onDone} />
    </>
  );
}