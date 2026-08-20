// src/components/OnboardingTour.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useIntl, type IntlShape } from 'react-intl';

type Step = {
  target: string;
  titleKey: string;
  descKey: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

/* Steps hold translation keys rather than prose, so the tour reads in the
   customer's own language. Several steps appear on both layouts and share
   the same copy — only the target and position differ. */
const STEPS: Step[] = [
  // ── Desktop only ──
  { target: '[data-tour="search"]', titleKey: 'Tour.searchTitle', descKey: 'Tour.searchDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="dark-toggle"]', titleKey: 'Tour.themeTitle', descKey: 'Tour.themeDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="notifications"]', titleKey: 'Tour.notificationsTitle', descKey: 'Tour.notificationsDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="profile"]', titleKey: 'Tour.profileTitle', descKey: 'Tour.profileDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="create"]', titleKey: 'Tour.createTitle', descKey: 'Tour.createDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="nav"]', titleKey: 'Tour.navTitle', descKey: 'Tour.navDesc', position: 'right', desktopOnly: true },
  { target: '[data-tour="overview"]', titleKey: 'Tour.overviewTitle', descKey: 'Tour.overviewDesc', position: 'bottom', desktopOnly: true },
  { target: '[data-tour="quick-actions"]', titleKey: 'Tour.quickActionsTitle', descKey: 'Tour.quickActionsDesc', position: 'top', desktopOnly: true },

  // ── Mobile only — top to bottom ──
  { target: '[data-tour="mobile-menu"]', titleKey: 'Tour.menuTitle', descKey: 'Tour.menuDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="dark-toggle"]', titleKey: 'Tour.themeTitle', descKey: 'Tour.themeDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="notifications"]', titleKey: 'Tour.notificationsTitle', descKey: 'Tour.notificationsDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="profile"]', titleKey: 'Tour.profileTitle', descKey: 'Tour.profileDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="mobile-search"]', titleKey: 'Tour.searchTitle', descKey: 'Tour.searchDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="overview"]', titleKey: 'Tour.overviewTitle', descKey: 'Tour.overviewDesc', position: 'bottom', mobileOnly: true },
  { target: '[data-tour="quick-actions"]', titleKey: 'Tour.quickActionsTitle', descKey: 'Tour.quickActionsDesc', position: 'bottom', mobileOnly: true },
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
  rect, step, stepIndex, total, onNext, onPrev, onSkip, isMobile, intl,
}: {
  rect: Rect | null;
  step: Step;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isMobile: boolean;
  intl: IntlShape;
}) {
  const t = (id: string) => intl.formatMessage({ id });
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

    if (style.top !== undefined) {
      style.top = Math.max(60, Math.min(Number(style.top), window.innerHeight - 220));
    }
  } else {
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

      <div className="h-1 w-full" style={{ background: GRADIENT }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: GRADIENT }}>
              <span className="text-white text-[10px] font-bold">{stepIndex + 1}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{t(step.titleKey)}</p>
          </div>
          <button onClick={onSkip} aria-label={t('Tour.close')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer shrink-0 p-0.5 mt-0.5">
            <X size={13} />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 pl-8">
          {t(step.descKey)}
        </p>

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
              {t('Tour.skip')}
            </button>
            {stepIndex > 0 && (
              <button onClick={onPrev}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
                <ArrowLeft size={11} /> {t('Tour.back')}
              </button>
            )}
            <button onClick={onNext}
              className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold transition cursor-pointer"
              style={{ background: GRADIENT }}>
              {stepIndex === total - 1
                ? <><CheckCircle2 size={11} /> {t('Tour.done')}</>
                : <>{t('Tour.next')} <ArrowRight size={11} /></>}
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
  const intl = useIntl();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredSteps = useMemo(() => STEPS.filter(s => {
    if (s.desktopOnly && isMobile) return false;
    if (s.mobileOnly && !isMobile) return false;
    return true;
  }), [isMobile]);

  const currentStep = filteredSteps[step];

  useEffect(() => {
    if (!active || !currentStep?.target) return;

    const el = document.querySelector(currentStep.target);
    if (!el) return;

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
      // Header is sticky — measure immediately, no scroll needed
      const main = document.querySelector('main');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      const r = getElementRect(currentStep.target);
      setRect(r);
    } else {
      // Page content — scroll into view, then measure
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        const r = getElementRect(currentStep.target);
        setRect(r);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, active, currentStep]);

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

      {/* Tooltip — only once the rect is measured */}
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
            intl={intl}
          />
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[9997]" onClick={onDone} />
    </>
  );
}