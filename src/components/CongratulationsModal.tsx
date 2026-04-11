'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function CongratulationsModal({
  open,
  name,
  onClose,
  onStartTour,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onStartTour: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9990] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9991] flex items-center justify-center px-5"
            onClick={e => e.stopPropagation()}>

            <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

              {/* Top gradient banner */}
              <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)' }} />

              <div className="p-8 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)' }}>
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>

                {/* Text */}
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Welcome to Exodus!
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Congratulations, <span className="font-bold text-gray-700 dark:text-gray-200">{name}</span>. Your account is all set up and ready to use.
                </p>

                {/* Feature highlights */}
                <div className="mt-6 space-y-2.5 text-left">
                  {[
                    'Track shipments in real time',
                    'View and manage your invoices',
                    'Get instant notifications',
                  ].map(feat => (
                    <div key={feat} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-white/5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{feat}</p>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div className="mt-6 space-y-2.5">
                  <button
                    onClick={() => { onClose(); onStartTour(); }}
                    className="cursor-pointer w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[.98]"
                   style={{ background: 'linear-gradient(135deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)' }}>
                    <Sparkles className="w-4 h-4" />
                    Take a quick tour
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="cursor-pointer w-full h-11 rounded-xl font-bold text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}