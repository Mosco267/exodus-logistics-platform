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
    desc: 'Your shipment stats are shown here. Total shipments, pending invoices, deliveries and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    desc: 'Quickly track a shipment, view your invoices or check recent activity from here.',
    position: 'top',
  },
  {
  target: '[data-tour="search"]',
  title: 'Search Shipments',
  desc: 'Search for any shipment using the shipment ID or tracking number.',
  position: 'bottom',
  desktopOnly: true,
},
{
  target: '[data-tour="mobile-search"]',
  title: 'Search Shipments',
  desc: 'Search for any shipment using the shipment ID or tracking number.',
  position: 'bottom',
  mobileOnly: true,
},
  {
    target: '[data-tour="dark-toggle"]',
    title: 'Dark and Light Mode',
    desc: 'Switch between dark and light mode. It also changes automatically based on time of day.',
    position: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    desc: 'Stay updated. All your shipment alerts and platform messages appear here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Your Profile',
    desc: 'Access your profile, settings and logout from here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="create"]',
    title: 'Create a Shipment',
    desc: 'Click here to create a new shipment and track it in real time.',
    position: 'bottom',
    desktopOnly: true,
  },
  {
    target: '[data-tour="nav"]',
    title: 'Navigation',
    desc: 'Navigate between Track, Invoices, History and Settings from here.',
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
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Decide if tooltip should go above or below based on element position
function getTooltipPosition(rect: Rect, preferredPos: string): 'above' | 'below' {
  const viewH = window.innerHeight;
  const spaceBelow = viewH - (rect.top + rect.height);
  const spaceAbove = rect.top;
  
  if (preferredPos === 'top' || spaceBelow < 200) {
    return spaceAbove > 200 ? 'above' : 'below';
  }
  return 'below';
}

function TooltipCard({
  rect,
  step,
  stepIndex,
  total,
  onNext,
  onPrev,
  onSkip,
  isMobile,
}: {
  rect: Rect | null;
  step: Step;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isMobile: boolean;
}) {
  const GAP = 10;
  const W = isMobile ? Math.min(window.innerWidth - 24, 340) : 280;

  let style: React.CSSProperties = { position: 'fixed', width: W, zIndex: 9999 };

  if (rect) {
    const pos = getTooltipPosition(rect, step.position);

    if (step.position === 'right' && !isMobile) {
      style.top = Math.max(12, rect.top + rect.height / 2 - 90);
      style.left = Math.min(rect.left + rect.width + GAP, window.innerWidth - W - 12);
    } else if (pos === 'above') {
      style.bottom = window.innerHeight - rect.top + GAP;
      style.left = Math.max(12, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 12));
    } else {
      style.top = rect.top + rect.height + GAP;
      style.left = Math.max(12, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 12));
    }

    // Clamp vertically
    if (style.top !== undefined) {
      style.top = Math.max(60, Math.min(Number(style.top), window.innerHeight - 220));
    }
  } else {
    // Fallback: center of screen
    style.top = '50%';
    style.left = '50%';
    style.transform = 'translate(-50%, -50%)';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: 8 }}
      transition={{ duration: 0.22 }}
      style={style}
      onClick={e => e.stopPropagation()}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

      {/* Top gradient line */}
      <div className="h-1 w-full" style={{ background: GRADIENT }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: GRADIENT }}>
              <span className="text-white text-[10px] font-bold">{stepIndex + 1}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{step.title}</p>
          </div>
          <button onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer shrink-0 p-0.5 mt-0.5">
            <X size={13} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 pl-8">
          {step.desc}
        </p>

        {/* Progress + buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i !== stepIndex ? 'w-1.5 bg-gray-200 dark:bg-white/20' : ''}`}
                style={i === stepIndex ? { width: 16, background: GRADIENT } : {}} />
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onSkip}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer font-medium px-1">
              Skip
            </button>
            {stepIndex > 0 && (
              <button onClick={onPrev}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
                <ArrowLeft size={11} /> Back
              </button>
            )}
            <button onClick={onNext}
              className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold transition cursor-pointer"
              style={{ background: GRADIENT }}>
              {stepIndex === total - 1
                ? <><CheckCircle2 size={11} /> Done</>
                : <>Next <ArrowRight size={11} /></>}
            </button>
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

  useEffect(() => {
  if (!active || !currentStep?.target) return;

  const el = document.querySelector(currentStep.target);
  if (!el) return;

  // For header elements (search, dark toggle, notifications, profile, mobile-menu)
  // scroll to very top so header is fully visible
  const isHeaderElement = [
    '[data-tour="search"]',
    '[data-tour="mobile-search"]',
    '[data-tour="dark-toggle"]',
    '[data-tour="notifications"]',
    '[data-tour="profile"]',
    '[data-tour="mobile-menu"]',
    '[data-tour="create"]',
  ].includes(currentStep.target);

  if (isHeaderElement) {
  // Force scroll the main scrollable container to top
  const main = document.querySelector('main');
  if (main) {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Also try the overall page scroll
  document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.scrollTo({ top: 0, behavior: 'smooth' });
} else {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Wait for scroll to complete then measure
  const t = setTimeout(() => {
    const r = getElementRect(currentStep.target);
    setRect(r);
  }, 700);

  return () => clearTimeout(t);
}, [step, active, currentStep]);

  // Update on resize
  useEffect(() => {
    if (!active || !currentStep?.target) return;
    const update = () => setRect(getElementRect(currentStep.target));
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
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - 5} y={rect.top - 5}
                  width={rect.width + 10} height={rect.height + 10}
                  rx="10" fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%"
            fill="rgba(0,0,0,0.52)"
            mask="url(#tour-mask)" />
        </svg>
      </div>

      {/* Highlight ring */}
      {rect && (
        <motion.div
          key={`ring-${step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            position: 'fixed',
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10,
            borderRadius: 10,
            border: '2px solid #0e7490',
            boxShadow: '0 0 0 3px rgba(14,116,144,0.35)',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip — only show once rect is measured */}
<AnimatePresence mode="wait">
  {rect && (
    <TooltipCard
      key={`tip-${step}`}
      rect={rect}
      step={currentStep}
      stepIndex={step}
      total={filteredSteps.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={onDone}
      isMobile={isMobile}
    />
  )}
</AnimatePresence>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[9997]" onClick={onDone} />
    </>
  );
}